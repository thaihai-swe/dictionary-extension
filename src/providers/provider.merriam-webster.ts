import { safeFetch } from './provider.http';
import { DictionaryEntry, Phonetic } from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, errorWithStatus, throwForHttpStatus } from './errors';
import { buildMwAudioUrl, collectMwExamples, normalizeMwPhonetic } from './parser-helpers';

const MAX_DEFINITIONS = 4;
const MAX_EXAMPLES = 6;

export async function fetchMerriamWebster(word: string, _targetLang = 'vi', signal?: AbortSignal, apiKey = ''): Promise<DictionaryEntry> {
  const clean = normalizeDictionaryTerm(word);
  const key = String(apiKey || '').trim();
  if (!key) {
    throw errorWithStatus('Merriam-Webster API key is not configured.', 401);
  }
  const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(clean)}?key=${encodeURIComponent(key)}`;

  try {
    const res = await safeFetch(url, { signal });
    if (!res.ok) {
      throwForHttpStatus(res.status, `Merriam-Webster: No definition found for '${clean}'`, `Merriam-Webster lookup failed (HTTP ${res.status}).`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new NotFoundError(`Merriam-Webster: No definition found for '${clean}'`);
    }
    if (typeof data[0] === 'string') {
      const suggestions = data.slice(0, 5).join(', ');
      throw new NotFoundError(`No exact match for "${clean}". Did you mean: ${suggestions}?`);
    }

    const entries = data.filter((entry) => entry && typeof entry === 'object').slice(0, 3);
    const meanings: DictionaryEntry['meanings'] = [];
    const examples: NonNullable<DictionaryEntry['examples']> = [];
    let audioUrl = '';
    let phonetic = '';
    let headword = clean;

    for (const entry of entries) {
      const pos = String(entry.fl || '').trim() || 'noun';
      if (entry.hwi?.hw) headword = String(entry.hwi.hw).replace(/\*/g, '');
      const shortDefs = Array.isArray(entry.shortdef)
        ? entry.shortdef.map((item: unknown) => String(item || '').trim()).filter(Boolean).slice(0, MAX_DEFINITIONS)
        : [];
      if (shortDefs.length) {
        meanings.push({
          partOfSpeech: pos,
          source: 'Merriam-Webster',
          definitions: shortDefs.map((definition: string) => ({ definition, source: 'Merriam-Webster' })),
        });
      }
      for (const text of collectMwExamples(entry)) {
        if (examples.length < MAX_EXAMPLES && !examples.some((item) => item.text === text)) {
          examples.push({ text, source: 'Merriam-Webster' });
        }
      }
      const prs = Array.isArray(entry.hwi?.prs) ? entry.hwi.prs : Array.isArray(entry.prs) ? entry.prs : [];
      for (const item of prs) {
        if (!phonetic && item?.mw) phonetic = normalizeMwPhonetic(item.mw);
        if (!audioUrl && item?.sound?.audio) audioUrl = buildMwAudioUrl(item.sound.audio);
        if (phonetic && audioUrl) break;
      }
    }

    if (!meanings.length) {
      throw new NotFoundError(`Merriam-Webster: No definition found for '${clean}'`);
    }

    const pronunciations: Phonetic[] = [{
      text: phonetic,
      phonetic,
      audio: audioUrl,
      audioUrl,
      language: 'en-US',
      region: 'us',
      label: audioUrl ? 'Listen (US)' : 'Speak',
      fallbackOnly: !audioUrl,
    }];

    return {
      word: headword || clean,
      phonetics: pronunciations,
      pronunciations,
      phonetic,
      meanings,
      examples,
      providerId: 'merriam_webster',
      sourceBadges: [{ label: 'Merriam-Webster', kind: 'dictionary', providerId: 'merriam_webster' }],
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    if (e instanceof NotFoundError) throw e;
    if ((e as { status?: number })?.status === 401 || (e as { status?: number })?.status === 403) throw e;
    throw errorWithStatus(`Merriam-Webster lookup failed for '${clean}'`, (e as { status?: number })?.status);
  }
}
