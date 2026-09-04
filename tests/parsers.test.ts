import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyQuery,
  normalizeDictionaryTerm,
  normalizeSentenceBreakdown,
  normalizeComparisonData,
  normalizeRephraseStyles,
} from '../src/shared/query-utils.ts';
import { lexicalExtrasForIntent } from '../src/shared/ai-prompts.ts';

test('classifyQuery detects single word vs phrase vs sentence', () => {
  assert.equal(classifyQuery('dictionary'), 'word');
  assert.equal(classifyQuery('take care of'), 'phrase');
  assert.equal(classifyQuery('The algorithm adapts dynamically to high traffic.'), 'sentence');
});

test('normalizeDictionaryTerm trims non-alphanumeric boundaries', () => {
  assert.equal(normalizeDictionaryTerm('  Running  '), 'Running');
  assert.equal(normalizeDictionaryTerm('"test"'), 'test');
});

test('normalizeSentenceBreakdown preserves explanation subtitles', () => {
  const input = {
    sentence: 'The algorithm adapts dynamically to high traffic.',
    translation: 'Thuật toán thích ứng linh hoạt với lưu lượng truy cập cao.',
    parts: [
      { text: 'The algorithm', role: 'subject', explanation: 'Subject noun phrase' },
      { text: 'adapts', role: 'verb phrase', explanation: 'Present-simple main verb' },
      { text: 'dynamically', role: 'modifier', explanation: 'Adverb describing manner' },
    ],
    phrases: [
      { text: 'high traffic', type: 'collocation', meaning: 'large volume of users' },
    ],
  };

  const result = normalizeSentenceBreakdown(input);
  assert.ok(result);
  assert.equal(result?.structure.length, 3);
  assert.equal(result?.structure[0].text, 'The algorithm');
  assert.equal(result?.structure[0].role, 'subject');
  assert.equal(result?.structure[0].explanation, 'Subject noun phrase');
  assert.equal(result?.structure[1].explanation, 'Present-simple main verb');
  assert.equal(result?.phrases.length, 1);
});

test('normalizeComparisonData parses distinction, table rows, and minimal pairs from JSON', () => {
  const jsonInput = JSON.stringify({
    coreDistinction: 'Affect is usually a verb; effect is usually a noun.',
    table: [
      { dimension: 'Part of speech', a: 'Verb', b: 'Noun' },
      { dimension: 'Meaning', a: 'To influence', b: 'A result' },
    ],
    minimalPairs: [
      {
        sentenceA: 'The policy will affect housing costs.',
        sentenceB: 'The long-term effect is still unclear.',
        explanation: 'Affect is the verb; effect is the resulting noun.',
      },
    ],
  });

  const result = normalizeComparisonData(jsonInput);
  assert.ok(result);
  assert.equal(result?.coreDistinction, 'Affect is usually a verb; effect is usually a noun.');
  assert.equal(result?.rows.length, 2);
  assert.equal(result?.rows[0].dimension, 'Part of speech');
  assert.equal(result?.rows[0].left, 'Verb');
  assert.equal(result?.rows[0].right, 'Noun');
  assert.equal(result?.minimalPairs?.length, 1);
  assert.equal(result?.minimalPairs?.[0].sentenceA, 'The policy will affect housing costs.');
  assert.equal(result?.minimalPairs?.[0].explanation, 'Affect is the verb; effect is the resulting noun.');
});

test('normalizeComparisonData parses minimal pairs from Markdown blockquotes', () => {
  const markdown = `
### Core Distinction
Affect is typically a verb, while effect is almost always a noun.

### Minimal Pairs & Examples
> The policy will affect housing costs.
> The long-term effect is still unclear.
Notice that affect is the action while effect is the outcome.
`;

  const result = normalizeComparisonData(markdown);
  assert.ok(result);
  assert.equal(result?.coreDistinction, 'Affect is typically a verb, while effect is almost always a noun.');
  assert.equal(result?.minimalPairs?.length, 1);
  assert.equal(result?.minimalPairs?.[0].sentenceA, 'The policy will affect housing costs.');
  assert.equal(result?.minimalPairs?.[0].sentenceB, 'The long-term effect is still unclear.');
});

test('normalizeRephraseStyles parses three rewrite styles from Markdown headings', () => {
  const markdown = `
### Simplified Version
> The team stayed strong under pressure, so they finished on time.
Shorter words, same meaning.

### Academic & Formal
> The team’s capacity to recover under pressure enabled timely delivery.
More abstract nouns for reports.

### Native & Idiomatic
> They bounced back under pressure and still shipped on time.
Natural spoken English.
`;

  const styles = normalizeRephraseStyles(markdown);
  assert.equal(styles.length, 3);
  assert.equal(styles[0].style, 'simplified');
  assert.equal(styles[0].text, 'The team stayed strong under pressure, so they finished on time.');
  assert.equal(styles[1].style, 'formal');
  assert.equal(styles[1].label, 'Academic & Formal');
  assert.equal(styles[2].style, 'idiomatic');
  assert.match(styles[2].text, /bounced back/);
});

test('demo presets cover word, idiom, sentence, and compare without duplicate queries', async () => {
  const { DEMO_PRESETS } = await import('../src/shared/presets.ts');
  const tags = DEMO_PRESETS.map((preset) => preset.tag);
  const queries = DEMO_PRESETS.map((preset) => preset.query);
  assert.deepEqual(tags, ['Word', 'Idiom', 'Sentence', 'Compare']);
  assert.equal(new Set(queries).size, queries.length);
});

test('each AI intent requests a unique lexical extra set', () => {
  assert.deepEqual(lexicalExtrasForIntent('default'), ['wordFamily']);
  assert.deepEqual(lexicalExtrasForIntent('grammar'), ['learnerMistakes']);
  assert.deepEqual(lexicalExtrasForIntent('collocations'), ['collocations']);
  assert.deepEqual(lexicalExtrasForIntent('explain_in_context'), []);
  assert.deepEqual(lexicalExtrasForIntent('sentence_breakdown'), []);
  assert.deepEqual(lexicalExtrasForIntent('confusables'), []);
  assert.deepEqual(lexicalExtrasForIntent('rephrase'), []);

  const extras = [
    ...lexicalExtrasForIntent('default'),
    ...lexicalExtrasForIntent('grammar'),
    ...lexicalExtrasForIntent('collocations'),
  ];
  assert.equal(new Set(extras).size, extras.length);
});
