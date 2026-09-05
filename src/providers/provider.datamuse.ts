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
    const res = await safeFetch(url, { signal, timeoutMs: DICTIONARY_FETCH_TIMEOUT_MS });
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    return list.map((item: { word?: string }) => String(item.word || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchDatamuse(
  word: string,
  _targetLang = 'vi',
  signal?: AbortSignal,
): Promise<ProviderLookupDto> {
  const clean = normalizeDictionaryTerm(word);
  if (!clean) {
    throw new NotFoundError(`No definition found for '${word}'`);
  }

  // Query definitions and lexical metadata
  const defUrl = `${DATAMUSE_BASE}?sp=${encodeURIComponent(clean)}&md=d,p&max=3`;
  const res = await safeFetch(defUrl, { signal });
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

  const [synonymsList, antonymsList, jjbList, trgList] = await Promise.all([
    fetchDatamuseList(`${DATAMUSE_BASE}?rel_syn=${encodeURIComponent(clean)}&max=10`, signal),
    fetchDatamuseList(`${DATAMUSE_BASE}?rel_ant=${encodeURIComponent(clean)}&max=8`, signal),
    fetchDatamuseList(`${DATAMUSE_BASE}?rel_jjb=${encodeURIComponent(clean)}&max=8`, signal),
    fetchDatamuseList(`${DATAMUSE_BASE}?rel_trg=${encodeURIComponent(clean)}&max=8`, signal),
  ]);

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
