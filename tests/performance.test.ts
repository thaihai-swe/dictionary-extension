import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDictionaryEntryPatch, createDictionaryEntryPatch } from '../src/shared/lookup-updates.ts';
import { mergeDictionaryEntries } from '../src/shared/enrichment.ts';
import { runBounded } from '../src/application/runtime/run-bounded.ts';

test('dictionary patches preserve unchanged fields and revisions', () => {
  const previous = {
    word: 'sample',
    meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'old' }] }],
    sources: [{ providerId: 'one', label: 'One', status: 'contributed' as const }],
    revision: 1,
  };
  const next = {
    ...previous,
    meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'new' }] }],
    revision: 2,
  };
  const patch = createDictionaryEntryPatch(previous, next);
  const applied = applyDictionaryEntryPatch(previous, {
    kind: 'patch',
    requestId: 'test',
    source: 'dictionary',
    baseRevision: 1,
    revision: 2,
    patch,
  });

  assert.deepEqual(applied, next);
  assert.equal(applied?.sources, previous.sources);
  assert.equal(applyDictionaryEntryPatch(previous, {
    kind: 'patch',
    requestId: 'test',
    source: 'dictionary',
    baseRevision: 0,
    revision: 2,
    patch,
  }), null);
});

test('merged definitions retain examples for every definition', () => {
  const merged = mergeDictionaryEntries(
    {
      word: 'sample',
      meanings: [{
        partOfSpeech: 'noun',
        definitions: [{ definition: 'first', example: 'First example.' }],
      }],
    },
    {
      word: 'sample',
      meanings: [{
        partOfSpeech: 'noun',
        definitions: [{ definition: 'second', example: 'Second example.' }],
      }],
    },
  );

  assert.deepEqual(
    merged.meanings[0].definitions.map((definition) => definition.example),
    ['First example.', 'Second example.'],
  );
});

test('bounded relation scheduling limits concurrent work', async () => {
  let active = 0;
  let maxActive = 0;
  const completed: number[] = [];
  await runBounded([1, 2, 3, 4], async (item) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 8));
    active -= 1;
    completed.push(item);
  }, { concurrency: 2 });
  assert.equal(maxActive, 2);
  assert.deepEqual(completed.sort(), [1, 2, 3, 4]);
});
