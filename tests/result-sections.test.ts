import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSecondaryResultSections } from '../src/features/dictionary/result-sections.ts';

test('definition examples are excluded from the general examples section', () => {
  const sections = collectSecondaryResultSections({
    meanings: [{
      definitions: [
        { definition: 'first', example: 'First example.' },
        { definition: 'second', example: 'Second example!' },
      ],
    }],
    examples: [
      { text: ' first   EXAMPLE ' },
      { text: 'Second example' },
      { text: 'A unique provider example.', translation: 'Una traduccion.' },
    ],
  });

  assert.deepEqual(sections.examples, [
    { text: 'A unique provider example.', translation: 'Una traduccion.' },
  ]);
});

test('matching English text is excluded regardless of translation', () => {
  const sections = collectSecondaryResultSections({
    meanings: [{ definitions: [{ example: 'Shared example.', exampleTranslation: 'Definition translation.' }] }],
    examples: [{ text: 'Shared example.', translation: 'Provider translation.' }],
  });

  assert.deepEqual(sections.examples, []);
});

test('secondary term collection is unchanged', () => {
  const sections = collectSecondaryResultSections({
    meanings: [{
      definitions: [{ synonyms: ['similar'], antonyms: ['different'] }],
    }],
    synonyms: [{ text: 'related' }],
    antonyms: [{ text: 'opposite' }],
  });

  assert.deepEqual(sections.synonyms.map(({ text }) => text), ['similar', 'related']);
  assert.deepEqual(sections.antonyms.map(({ text }) => text), ['different', 'opposite']);
});
