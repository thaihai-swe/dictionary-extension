export const DICTIONARY_PROVIDER_IDS = [
  'wiktionary',
  'free_dictionary',
  'datamuse',
  'rhymebrain',
  'urban_dictionary',
  'wiktionary_bilingual',
] as const;

export const DICTIONARY_FALLBACK_ORDER: string[] = [...DICTIONARY_PROVIDER_IDS];

export function getSecondaryDictionaryProviderIds(primaryProviderId: string): string[] {
  return DICTIONARY_FALLBACK_ORDER.filter((providerId) => providerId !== primaryProviderId);
}

export function isConfiguredDictionaryProvider(providerId: string): boolean {
  return DICTIONARY_FALLBACK_ORDER.includes(providerId);
}
