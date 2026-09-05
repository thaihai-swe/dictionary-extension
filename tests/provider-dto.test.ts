import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toDictionaryEntry,
  mergeDictionaryEntries,
  mergeMeanings,
  mergePhonetics,
} from '../src/shared/enrichment.ts';
import type { Meaning, Phonetic, ProviderLookupDto } from '../src/types/index.ts';

test('toDictionaryEntry maps sparse ProviderLookupDto to full DictionaryEntry', () => {
  const dto: ProviderLookupDto = {
    word: 'ephemeral',
    providerId: 'wiktionary',
    meanings: [{
      partOfSpeech: 'adjective',
      definitions: [{ definition: 'Lasting for a short time.' }],
    }],
  };
  const entry = toDictionaryEntry(dto);
  assert.equal(entry.word, 'ephemeral');
  assert.equal(entry.meanings.length, 1);
  assert.equal(entry.meanings[0].partOfSpeech, 'adjective');
  assert.equal(entry.meanings[0].definitions[0].definition, 'Lasting for a short time.');
});

test('mergeMeanings groups canonical POS and deduplicates equivalent definitions', () => {
  const base: Meaning[] = [{
    partOfSpeech: 'adj',
    definitions: [{ definition: 'Lasting for a very brief time; transitory.' }],
    synonyms: ['fleeting'],
  }];
  const incoming: Meaning[] = [{
    partOfSpeech: 'adjective',
    definitions: [{ definition: 'Lasting for a very brief time; transitory.' }],
    synonyms: ['transient', 'fleeting'],
  }];
  const merged = mergeMeanings(base, incoming);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].partOfSpeech, 'adjective');
  assert.equal(merged[0].definitions.length, 1);
  assert.deepEqual(merged[0].synonyms, ['fleeting', 'transient']);
});

test('mergeMeanings backfills example on existing definition when base has none', () => {
  const base: Meaning[] = [{
    partOfSpeech: 'noun',
    definitions: [{ definition: 'A sudden burst of light or flame.' }],
  }];
  const incoming: Meaning[] = [{
    partOfSpeech: 'noun',
    definitions: [{
      definition: 'A sudden burst of light or flame.',
      example: 'A flare illuminated the night sky.',
    }],
  }];
  const merged = mergeMeanings(base, incoming);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].definitions.length, 1);
  assert.equal(merged[0].definitions[0].example, 'A flare illuminated the night sky.');
});

test('mergePhonetics preserves distinct IPAs and collates matching regions/audio', () => {
  const base: Phonetic[] = [
    { text: '/səkˈsɛs.fəl/', audio: 'https://example.com/audio-us.mp3', region: 'us' },
  ];
  const incoming: Phonetic[] = [
    { text: '/səkˈsesfəl/', region: 'uk' },
    { text: '/səkˈsɛs.fəl/', language: 'en-US' },
  ];
  const merged = mergePhonetics(base, incoming);
  assert.equal(merged.length, 2);
  const usItem = merged.find((p) => p.text === '/səkˈsɛs.fəl/');
  assert.ok(usItem);
  assert.equal(usItem?.audio, 'https://example.com/audio-us.mp3');
  const ukItem = merged.find((p) => p.text === '/səkˈsesfəl/');
  assert.ok(ukItem);
  assert.equal(ukItem?.region, 'uk');
});

test('mergeDictionaryEntries keeps Wikipedia encyclopedia as a distinct POS', () => {
  const wiktionary: ProviderLookupDto = {
    word: 'goat',
    providerId: 'wiktionary',
    meanings: [{
      partOfSpeech: 'noun',
      definitions: [{ definition: 'A mammal of the genus Capra.' }],
    }],
  };
  const wikipedia: ProviderLookupDto = {
    word: 'goat',
    providerId: 'wikipedia',
    meanings: [{
      partOfSpeech: 'encyclopedia',
      definitions: [{ definition: 'Domesticated ruminant mammal.' }],
    }],
  };

  const combined = mergeDictionaryEntries(wiktionary, wikipedia);

  assert.equal(combined.meanings.length, 2);
  const posList = combined.meanings.map((m) => m.partOfSpeech);
  assert.ok(posList.includes('noun'));
  assert.ok(posList.includes('encyclopedia'));
});

test('mergeDictionaryEntries enforces max limits on meanings, definitions, and phonetics', () => {
  const manyMeanings: Meaning[] = Array.from({ length: 10 }, (_, i) => ({
    partOfSpeech: `pos_${i}`,
    definitions: Array.from({ length: 12 }, (_, j) => ({ definition: `def_${i}_${j}` })),
  }));
  const base: ProviderLookupDto = {
    word: 'test',
    providerId: 'base',
    meanings: manyMeanings,
  };
  const entry = toDictionaryEntry(base);
  const merged = mergeDictionaryEntries(entry, entry);
  assert.ok(merged.meanings.length <= 6);
  for (const m of merged.meanings) {
    assert.ok(m.definitions.length <= 8);
  }
});
