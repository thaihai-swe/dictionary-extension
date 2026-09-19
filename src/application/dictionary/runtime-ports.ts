import type { AiIntentId, AiResult, AppSettings, DictionaryEntry } from '../../types';

export interface DictionaryCachePort {
  readCombined(key: string): Promise<DictionaryEntry | undefined>;
  writeCombined(key: string, result: DictionaryEntry): void;
  readEnrichment(key: string): Promise<DictionaryEntry[] | null>;
  writeEnrichment(key: string, results: DictionaryEntry[]): Promise<void>;
  clear(): void;
}

export type AiAnalysisPort = (
  intentId: AiIntentId,
  text: string,
  targetLang?: string,
  userApiKey?: string,
  userModelName?: string,
  signal?: AbortSignal,
  context?: string,
  settings?: AppSettings,
) => Promise<AiResult>;

let dictionaryCache: DictionaryCachePort | null = null;
let analyzeWithAi: AiAnalysisPort | null = null;

export function configureDictionaryRuntimePorts(ports: {
  cache: DictionaryCachePort;
  analyzeWithAi: AiAnalysisPort;
}): void {
  dictionaryCache = ports.cache;
  analyzeWithAi = ports.analyzeWithAi;
}

export function getDictionaryCache(): DictionaryCachePort {
  if (!dictionaryCache) throw new Error('Dictionary cache is not configured.');
  return dictionaryCache;
}

export function getAiAnalysis(): AiAnalysisPort {
  if (!analyzeWithAi) throw new Error('AI analysis provider is not configured.');
  return analyzeWithAi;
}
