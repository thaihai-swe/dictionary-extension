import type { DictionaryProviderCatalog } from '../../domain/dictionary/contracts';
import { providerRegistry } from './registry';

/** Infrastructure adapter exposing the provider registry to application services. */
export const dictionaryProviderCatalog: DictionaryProviderCatalog = {
  getDictionary: (id) => providerRegistry.getDictionary(id),
  listDictionaryIds: () => providerRegistry.listDictionaryIds(),
  getLabel: (id) => providerRegistry.getDictionary(id)?.name || id.replace(/_/g, ' '),
};
