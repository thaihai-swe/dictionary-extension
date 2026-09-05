import { providerRegistry } from './registry';
import { fetchDatamuse } from './provider.datamuse';
import { fetchFreeDictionary } from './provider.free-dictionary';
import { fetchGoogleTranslate, lookupGoogleTranslation } from './provider.google-translate';
import { fetchLibreTranslate, lookupLibreTranslation } from './provider.libre-translate';
import { lookupMyMemoryTranslation } from './provider.mymemory';
import { fetchRhymeBrain } from './provider.rhymebrain';
import { fetchUrbanDictionary } from './provider.urban-dictionary';
import { fetchWikipediaSummary } from './provider.wikipedia';
import { fetchWiktionary } from './provider.wiktionary';
import { fetchAiAnalysis } from './provider.gemini-ai';

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
  lookup: (word, opts) => fetchDatamuse(word, opts.targetLang, opts.signal),
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
  id: 'wikipedia',
  name: 'Wikipedia',
  lookup: (word, opts) => fetchWikipediaSummary(word, opts.targetLang, opts.signal),
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

providerRegistry.registerDictionary({
  id: 'gemini_ai',
  name: 'AI Explanation',
  lookup: async (word, opts) => {
    const aiRes = await fetchAiAnalysis(
      'default',
      word,
      opts.targetLang,
      opts.settings?.aiApiKey,
      opts.settings?.aiModel,
      opts.signal,
      undefined,
      opts.settings,
    );
    return {
      word,
      meanings: [{ partOfSpeech: 'AI Explanation', definitions: [{ definition: aiRes.summary || aiRes.translation || word }] }],
      providerId: 'gemini_ai',
    };
  },
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
