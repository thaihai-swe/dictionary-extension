import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderRegistry } from '../src/providers/registry.ts';
import { combinedResultCacheKey } from '../src/providers/cache.ts';
import type { AppSettings, IDictionaryProvider } from '../src/types/index.ts';

test('ProviderRegistry registers and retrieves dictionary providers', async () => {
  const registry = new ProviderRegistry();
  const customProvider: IDictionaryProvider = {
    id: 'custom_mock',
    name: 'Custom Mock',
    lookup: async (word: string) => ({
      word,
      providerId: 'custom_mock',
      meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'Mock definition' }] }],
    }),
  };

  registry.registerDictionary(customProvider);
  assert.equal(registry.hasDictionary('custom_mock'), true);
  const retrieved = registry.getDictionary('custom_mock');
  assert.equal(retrieved?.name, 'Custom Mock');
  const dto = await retrieved!.lookup('ephemeral', { targetLang: 'vi' });
  assert.equal(dto.meanings?.[0].definitions[0].definition, 'Mock definition');
});

test('combinedResultCacheKey builds predictable compound keys', () => {
  const dummySettings = {
    dictionaryProvider: 'wiktionary',
    translateTargetLanguage: 'vi',
    enableTranslate: true,
    enableDictionary: true,
    enablePhraseFallback: true,
    enableLexicalProfile: true,
  } as AppSettings;

  const key = combinedResultCacheKey('Hello ', dummySettings);
  assert.equal(key, 'hello|wiktionary|vi|true|true|true|true');
});
