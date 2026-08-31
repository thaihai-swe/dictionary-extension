import { safeFetch } from './provider.http';
import { DictionaryEntry, Phonetic } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, errorWithStatus, throwForHttpStatus } from './errors';

const MAX_DEFINITIONS_PER_POS = 4;
const MAX_POS_GROUPS = 4;
const MAX_EXAMPLES = 6;
const MAX_RELATED = 8;
const WORDNIK_BASE = 'https://api.wordnik.com/v4';

async function fetchWordnikJson(url: string, signal?: AbortSignal, allowEmpty = false): Promise<unknown> {
  const res = await safeFetch(url, { signal });
  if (res.status === 404 && allowEmpty) return [];
  if (!res.ok) {
    throwForHttpStatus(res.status, 'Wordnik: No entry found', `Wordnik lookup failed (HTTP ${res.status}).`);
  }
  return res.json();
}

export async function fetchWordnik(word: string, _targetLang = 'vi', signal?: AbortSignal, apiKey = ''): Promise<DictionaryEntry> {
  const clean = normalizeDictionaryTerm(word);
  const key = String(apiKey || '').trim();
  if (!key) {
    throw errorWithStatus('Wordnik API key is not configured.', 401);
  }

  const encoded = encodeURIComponent(clean);
  const keyParam = `api_key=${encodeURIComponent(key)}`;

  try {
    const [definitionsResult, examplesResult, pronunciationsResult, audioResult, relatedResult] = await Promise.all([
      fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/definitions?limit=12&includeRelated=false&useCanonical=true&includeTags=false&${keyParam}`, signal),
      fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/examples?limit=5&useCanonical=true&${keyParam}`, signal, true),
      fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/pronunciations?limit=5&useCanonical=true&${keyParam}`, signal, true),
      fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/audio?limit=2&useCanonical=true&${keyParam}`, signal, true),
      fetchWordnikJson(`${WORDNIK_BASE}/word.json/${encoded}/relatedWords?relationshipTypes=synonym,antonym&limitPerRelationshipType=${MAX_RELATED}&useCanonical=true&${keyParam}`, signal, true),
    ]);

    const definitions = Array.isArray(definitionsResult) ? definitionsResult : [];
    if (!definitions.length) {
      throw new NotFoundError(`Wordnik: No entry found for '${clean}'`);
    }

    const meaningsMap: Record<string, Array<{ definition: string; source: string }>> = {};
    for (const item of definitions as Array<{ partOfSpeech?: string; text?: string }>) {
      const pos = String(item.partOfSpeech || 'general').trim() || 'general';
      const text = String(item.text || '').replace(/<[^>]*>/g, '').trim();
      if (!text) continue;
      if (!meaningsMap[pos]) meaningsMap[pos] = [];
      if (meaningsMap[pos].length < MAX_DEFINITIONS_PER_POS) {
        meaningsMap[pos].push({ definition: text, source: 'Wordnik' });
      }
    }

    const meanings = Object.entries(meaningsMap)
      .slice(0, MAX_POS_GROUPS)
      .map(([partOfSpeech, defs]) => ({ partOfSpeech, definitions: defs, source: 'Wordnik' }));

    const examplePayload = (examplesResult as { examples?: unknown })?.examples || examplesResult;
    const examples: NonNullable<DictionaryEntry['examples']> = [];
    if (Array.isArray(examplePayload)) {
      for (const item of examplePayload) {
        const exampleText = String((item as { text?: string })?.text || item || '').replace(/<[^>]*>/g, '').trim();
        if (exampleText && examples.length < MAX_EXAMPLES) examples.push({ text: exampleText, source: 'Wordnik' });
      }
    }

    const synonyms: NonNullable<DictionaryEntry['synonyms']> = [];
    const antonyms: NonNullable<DictionaryEntry['antonyms']> = [];
    if (Array.isArray(relatedResult)) {
      for (const group of relatedResult as Array<{ relationshipType?: string; words?: string[] }>) {
        const type = String(group?.relationshipType || '').toLowerCase();
        const target = type === 'antonym' ? antonyms : type === 'synonym' ? synonyms : null;
        if (!target) continue;
        for (const related of group.words || []) {
          const value = String(related || '').trim();
          if (value && target.length < MAX_RELATED && !target.some((item) => item.text === value)) {
            target.push({ text: value, source: 'Wordnik' });
          }
        }
      }
    }

    let phonetic = '';
    if (Array.isArray(pronunciationsResult)) {
      for (const item of pronunciationsResult as Array<{ raw?: string }>) {
        const value = String(item?.raw || '').trim();
        if (value) {
          phonetic = value;
          break;
        }
      }
    }
    let audioUrl = '';
    if (Array.isArray(audioResult)) {
      for (const item of audioResult as Array<{ fileUrl?: string }>) {
        const value = String(item?.fileUrl || '').trim();
        if (value) {
          audioUrl = value;
          break;
        }
      }
    }
    const pronunciations: Phonetic[] = phonetic || audioUrl
      ? [{
          text: phonetic,
          phonetic,
          audio: audioUrl,
          audioUrl,
          language: 'en-US',
          label: audioUrl ? 'Listen' : 'Speak',
          fallbackOnly: !audioUrl,
        }]
      : [];

    return {
      word: clean,
      phonetic,
      phonetics: pronunciations,
      pronunciations,
      meanings,
      examples,
      synonyms,
      antonyms,
      providerId: 'wordnik',
      sourceBadges: [{ label: 'Wordnik', kind: 'dictionary', providerId: 'wordnik' }],
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    if (e instanceof NotFoundError) throw e;
    if ((e as { status?: number })?.status === 401 || (e as { status?: number })?.status === 403) throw e;
    throw errorWithStatus(`Wordnik lookup failed for '${clean}'`, (e as { status?: number })?.status);
  }
}
