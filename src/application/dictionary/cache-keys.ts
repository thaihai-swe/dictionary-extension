import type { AppSettings } from '../../types';
import { hashCacheKey } from '../../shared/lookup-cache';

export function combinedResultCacheKey(word: string, settings: AppSettings): string {
  return hashCacheKey(`${word.toLowerCase().trim()}|${settings.dictionaryProvider || 'wiktionary'}|${String(settings.translateTargetLanguage || '').toLowerCase()}|${Boolean(settings.enableTranslate)}|${Boolean(settings.enableDictionary)}|${Boolean(settings.enablePhraseFallback)}|${settings.enableLexicalProfile !== false}`);
}

export function enrichmentCacheKey(
  word: string,
  settings: AppSettings,
  primaryId: string,
  lemma: string,
): string {
  return `enrich_${primaryId}_${lemma || word}_${settings.translateTargetLanguage || ''}`.toLowerCase();
}
