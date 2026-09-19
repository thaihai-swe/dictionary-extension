import type {
  DictionaryProviderCatalog,
  TranslationProviderCatalog,
} from '../../domain/dictionary/contracts';

let dictionaryCatalog: DictionaryProviderCatalog | null = null;
let translationCatalog: TranslationProviderCatalog | null = null;

export function configureDictionaryProviderPorts(ports: {
  dictionary: DictionaryProviderCatalog;
  translation: TranslationProviderCatalog;
}): void {
  dictionaryCatalog = ports.dictionary;
  translationCatalog = ports.translation;
}

export function getDictionaryProviderCatalog(): DictionaryProviderCatalog {
  if (!dictionaryCatalog) throw new Error('Dictionary provider catalog is not configured.');
  return dictionaryCatalog;
}

export function getTranslationProviderCatalog(): TranslationProviderCatalog {
  if (!translationCatalog) throw new Error('Translation provider catalog is not configured.');
  return translationCatalog;
}
