import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneDictionaryEntry } from '../src/shared/enrichment.ts';
import { buildWordBoundaryPattern } from '../src/shared/page-context.ts';
import type { DictionaryEntry } from '../src/types/index.ts';

test('buildWordBoundaryPattern caches regexes and matches boundaries', () => {
  const p1 = buildWordBoundaryPattern('hello');
  const p2 = buildWordBoundaryPattern('hello');
  assert.equal(p1, p2, 'Regex instance should be reused from cache');
  assert.ok(p1?.test('say hello world'));
  assert.ok(!p1?.test('say otolithic world'));

  const unicodeP = buildWordBoundaryPattern('cà phê');
  assert.ok(unicodeP?.test('uống cà phê buổi sáng'));
  assert.ok(!unicodeP?.test('uốngcà phêbuổi sáng'));
});

test('cloneDictionaryEntry clones arrays while preserving data correctly', () => {
  const entry: DictionaryEntry = {
    word: 'ephemeral',
    meanings: [{
      partOfSpeech: 'adjective',
      definitions: [{ definition: 'Short-lived' }],
      synonyms: ['transient'],
    }],
    phonetics: [{ text: '/ɪˈfem.ər.əl/' }],
  };

  const cloned = cloneDictionaryEntry(entry);
  assert.notEqual(cloned, entry);
  assert.notEqual(cloned.meanings, entry.meanings);
  assert.notEqual(cloned.meanings[0].definitions, entry.meanings[0].definitions);
  assert.equal(cloned.word, 'ephemeral');
  assert.equal(cloned.meanings[0].definitions[0].definition, 'Short-lived');
});
