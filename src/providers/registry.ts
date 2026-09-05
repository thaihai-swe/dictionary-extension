import type { IDictionaryProvider, ITranslationProvider } from '../types';

export class ProviderRegistry {
  private dictionaryMap = new Map<string, IDictionaryProvider>();
  private translationMap = new Map<string, ITranslationProvider>();

  registerDictionary(provider: IDictionaryProvider) {
    this.dictionaryMap.set(provider.id, provider);
  }

  registerTranslation(provider: ITranslationProvider) {
    this.translationMap.set(provider.id, provider);
  }

  getDictionary(id: string): IDictionaryProvider | undefined {
    return this.dictionaryMap.get(id);
  }

  getTranslation(id: string): ITranslationProvider | undefined {
    return this.translationMap.get(id);
  }

  hasDictionary(id: string): boolean {
    return this.dictionaryMap.has(id);
  }

  hasTranslation(id: string): boolean {
    return this.translationMap.has(id);
  }

  listDictionaryIds(): string[] {
    return Array.from(this.dictionaryMap.keys());
  }

  listTranslationIds(): string[] {
    return Array.from(this.translationMap.keys());
  }
}

export const providerRegistry = new ProviderRegistry();
