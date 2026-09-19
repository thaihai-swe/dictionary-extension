import { providerRegistry } from './registry';
import { configureDictionaryProviderPorts } from '../../application/dictionary/provider-ports';
import { configureDictionaryRuntimePorts } from '../../application/dictionary/runtime-ports';
import { dictionaryProviderCatalog } from './catalog';
import { dictionaryCacheRepository } from '../storage/cache-repository';
import { fetchAiAnalysis } from './ai';
import {
  fetchDatamuse,
  fetchFreeDictionary,
  fetchGoogleTranslate,
  fetchLibreTranslate,
  fetchRhymeBrain,
  fetchUrbanDictionary,
  fetchWiktionary,
  fetchWiktionaryBilingual,
} from './dictionary';
import {
  lookupGoogleTranslation,
  lookupLibreTranslation,
  lookupMyMemoryTranslation,
} from './translation';

providerRegistry.registerDictionary({
  id: 'wiktionary',
  name: 'Wiktionary',
  lookup: (word, opts) => fetchWiktionary(word, opts.targetLang, opts.signal),
});

providerRegistry.registerDictionary({
  id: 'free_dictionary',
  name: 'Free Dictionary API',
  lookup: (word, opts) => fetchFreeDictionary(word, opts.targetLang, opts.signal),
});

providerRegistry.registerDictionary({
  id: 'datamuse',
  name: 'Datamuse',
  lookup: (word, opts) => fetchDatamuse(word, opts.targetLang, opts.signal, opts.onPartial),
});

providerRegistry.registerDictionary({
  id: 'rhymebrain',
  name: 'RhymeBrain',
  lookup: (word, opts) => fetchRhymeBrain(word, opts.targetLang, opts.signal),
});

providerRegistry.registerDictionary({
  id: 'urban_dictionary',
  name: 'Urban Dictionary',
  lookup: (word, opts) => fetchUrbanDictionary(word, opts.targetLang, opts.signal),
});

providerRegistry.registerDictionary({
  id: 'wiktionary_bilingual',
  name: 'Wiktionary Bilingual',
  lookup: (word, opts) => fetchWiktionaryBilingual(word, opts.targetLang, opts.signal),
});

providerRegistry.registerDictionary({
  id: 'google_translate',
  name: 'Google Translate',
  lookup: (word, opts) => fetchGoogleTranslate(word, opts.targetLang, opts.signal),
});

providerRegistry.registerDictionary({
  id: 'libre_translate',
  name: 'LibreTranslate',
  lookup: (word, opts) => fetchLibreTranslate(word, opts.targetLang, opts.signal),
});

providerRegistry.registerTranslation({
  id: 'google',
  name: 'Google Translate',
  lookup: (text, opts) => lookupGoogleTranslation(text, opts.targetLang, opts.signal),
});

providerRegistry.registerTranslation({
  id: 'libretranslate',
  name: 'LibreTranslate',
  lookup: (text, opts) => lookupLibreTranslation(text, opts.targetLang, opts.signal, opts.baseUrl, opts.apiKey),
});

providerRegistry.registerTranslation({
  id: 'mymemory',
  name: 'MyMemory',
  lookup: (text, opts) => lookupMyMemoryTranslation(text, opts.targetLang, opts.signal),
});

configureDictionaryProviderPorts({
  dictionary: dictionaryProviderCatalog,
  translation: providerRegistry,
});

configureDictionaryRuntimePorts({
  cache: dictionaryCacheRepository,
  analyzeWithAi: fetchAiAnalysis,
});
