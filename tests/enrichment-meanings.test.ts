import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMeanings } from '../src/shared/enrichment.ts';
import type { Meaning } from '../src/types/index.ts';

describe('mergeMeanings definition examples', () => {
  it('keeps an example already attached to a definition', () => {
    const existing: Meaning[] = [{
      partOfSpeech: 'noun',
      source: 'Wiktionary',
      definitions: [{
        definition: 'the ability to recover quickly',
        example: 'The team showed resilience after the outage.',
        source: 'Wiktionary',
      }],
    }];

    const merged = mergeMeanings(existing, []);
    assert.equal(merged[0].definitions[0].example, 'The team showed resilience after the outage.');
  });

  it('backfills a missing example when a later provider returns the same definition', () => {
    const existing: Meaning[] = [{
      partOfSpeech: 'noun',
      source: 'Wiktionary',
      definitions: [{
        definition: 'the ability to recover quickly',
        source: 'Wiktionary',
      }],
    }];
    const incoming: Meaning[] = [{
      partOfSpeech: 'noun',
      source: 'Free Dictionary API',
      definitions: [{
        definition: 'The ability to recover quickly.',
        example: 'The team showed resilience after the outage.',
        source: 'Free Dictionary API',
      }],
    }];

    const merged = mergeMeanings(existing, incoming);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].definitions.length, 1);
    assert.equal(merged[0].definitions[0].example, 'The team showed resilience after the outage.');
  });

  it('does not overwrite an existing definition example', () => {
    const existing: Meaning[] = [{
      partOfSpeech: 'verb',
      definitions: [{
        definition: 'to recover quickly',
        example: 'She bounced back after the setback.',
      }],
    }];
    const incoming: Meaning[] = [{
      partOfSpeech: 'verb',
      definitions: [{
        definition: 'to recover quickly',
        example: 'A different example sentence.',
      }],
    }];

    const merged = mergeMeanings(existing, incoming);
    assert.equal(merged[0].definitions[0].example, 'She bounced back after the setback.');
  });
});
