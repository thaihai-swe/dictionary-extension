import { DICTIONARY_FETCH_TIMEOUT_MS, safeFetch } from './provider.http';
import {
  AttributedItem,
  Collocations,
  ProviderLookupDto,
  LexicalProfile,
  Meaning,
} from '../types';
import { normalizeDictionaryTerm } from '../shared/query-utils';
import { NotFoundError, throwForHttpStatus } from './errors';
import { runBounded } from './provider-scheduler';

const DATAMUSE_BASE = 'https://api.datamuse.com/words';
const MAX_DEFINITIONS_PER_POS = 4;
const MAX_POS_GROUPS = 4;

interface DatamuseWordEntry {
  word: string;
  score?: number;
  tags?: string[];
  defs?: string[];
}

function posCodeToName(code: string): string {
  switch (code.toLowerCase()) {
    case 'n': return 'noun';
    case 'v': return 'verb';
    case 'adj': return 'adjective';
    case 'adv': return 'adverb';
    case 'u': return 'general';
    default: return code;
  }
}

async function fetchDatamuseList(url: string, signal?: AbortSignal): Promise<string[]> {
  try {
    const res = await safeFetch(url, {
      signal,
      timeoutMs: DICTIONARY_FETCH_TIMEOUT_MS,
      retries: 0,
      requestClass: 'datamuse-relation',
    });
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    return list.map((item: { word?: string }) => String(item.word || '').trim()).filter(Boolean);
  } catch (error) {
    if (signal?.aborted) throw error;
    return [];
  }
}

interface DatamuseRelation {
  kind: 'synonyms' | 'antonyms' | 'adjectives' | 'patterns';
  url: string;
}

export async function fetchDatamuse(
  word: string,
  _targetLang = 'vi',
  signal?: AbortSignal,
  onPartial?: (result: ProviderLookupDto) => void,
): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word);
  if (!clean) {
    throw new NotFoundError(`No definition found for '${word}'`);
  }

  // Query definitions and lexical metadata
  const defUrl = `${DATAMUSE_BASE}?sp=${encodeURIComponent(clean)}&md=d,p&max=3`;
  const res = await safeFetch(defUrl, {
    signal,
    timeoutMs: DICTIONARY_FETCH_TIMEOUT_MS,
    retries: 0,
    requestClass: 'dictionary',
  });
  if (!res.ok) {
    throwForHttpStatus(res.status, `Datamuse: No entry found for '${clean}'`, `Datamuse lookup failed (HTTP ${res.status}).`);
  }

  const data: DatamuseWordEntry[] = await res.json();
  const exact = Array.isArray(data)
    ? data.find((item) => item.word.toLowerCase() === clean.toLowerCase()) || data[0]
    : null;

  if (!exact) {
    throw new NotFoundError(`Datamuse: No entry found for '${clean}'`);
  }

  const meaningsByPos = new Map<string, string[]>();
  if (Array.isArray(exact.defs)) {
    for (const defLine of exact.defs) {
      const tabIdx = defLine.indexOf('\t');
      const posCode = tabIdx > 0 ? defLine.slice(0, tabIdx).trim() : 'general';
      const defText = (tabIdx > 0 ? defLine.slice(tabIdx + 1) : defLine).trim();
      const posName = posCodeToName(posCode);

      if (defText) {
        if (!meaningsByPos.has(posName)) meaningsByPos.set(posName, []);
        const list = meaningsByPos.get(posName)!;
        if (list.length < MAX_DEFINITIONS_PER_POS) list.push(defText);
      }
    }
  }

  const meanings: Meaning[] = [];
  let groupCount = 0;
  for (const [pos, defs] of meaningsByPos) {
    if (groupCount >= MAX_POS_GROUPS) break;
    meanings.push({
      partOfSpeech: pos,
      definitions: defs.map((definition) => ({ definition })),
    });
    groupCount += 1;
  }

  const core: ProviderLookupDto = {
    word: exact.word || clean,
    phonetics: [],
    meanings,
    providerId: 'datamuse',
  };
  onPartial?.(core);

  const relationValues: Record<DatamuseRelation['kind'], string[]> = {
    synonyms: [],
    antonyms: [],
    adjectives: [],
    patterns: [],
  };
  const relations: DatamuseRelation[] = [
    { kind: 'synonyms', url: `${DATAMUSE_BASE}?rel_syn=${encodeURIComponent(clean)}&max=10` },
    { kind: 'antonyms', url: `${DATAMUSE_BASE}?rel_ant=${encodeURIComponent(clean)}&max=8` },
    { kind: 'adjectives', url: `${DATAMUSE_BASE}?rel_jjb=${encodeURIComponent(clean)}&max=8` },
    { kind: 'patterns', url: `${DATAMUSE_BASE}?rel_trg=${encodeURIComponent(clean)}&max=8` },
  ];
  await runBounded(
    relations,
    (relation) => fetchDatamuseList(relation.url, signal),
    {
      concurrency: 2,
      signal,
      onSettled: (relation, settled) => {
        if (settled.status !== 'fulfilled') return;
        relationValues[relation.kind] = settled.value;
        const partial: ProviderLookupDto = {
          word: exact.word || clean,
          providerId: 'datamuse',
        };
        if (relation.kind === 'synonyms') {
          partial.synonyms = settled.value.map((text) => ({ text }));
        } else if (relation.kind === 'antonyms') {
          partial.antonyms = settled.value.map((text) => ({ text }));
        } else {
          partial.lexicalProfile = {
            collocations: {
              ...(relation.kind === 'adjectives' ? { adjectives: settled.value } : {}),
              ...(relation.kind === 'patterns' ? { patterns: settled.value } : {}),
            },
          };
        }
        if (settled.value.length) onPartial?.(partial);
      },
    },
  );
  if (signal?.aborted) throw new DOMException('The user aborted a request.', 'AbortError');

  const synonymsList = relationValues.synonyms;
  const antonymsList = relationValues.antonyms;
  const jjbList = relationValues.adjectives;
  const trgList = relationValues.patterns;

  const synonyms: AttributedItem[] = synonymsList.map((text) => ({ text }));
  const antonyms: AttributedItem[] = antonymsList.map((text) => ({ text }));

  const collocations: Collocations = {};
  if (jjbList.length) collocations.adjectives = jjbList;
  if (trgList.length) collocations.patterns = trgList;

  const lexicalProfile: LexicalProfile = {
    collocations: Object.keys(collocations).length ? collocations : undefined,
  };

  return {
    word: exact.word || clean,
    phonetics: [],
    meanings,
    synonyms,
    antonyms,
    lexicalProfile: lexicalProfile.collocations ? lexicalProfile : undefined,
    providerId: 'datamuse',
  };
}
