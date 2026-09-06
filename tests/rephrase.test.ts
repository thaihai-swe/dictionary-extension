import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRephraseStyles } from '../src/shared/ai-parser.ts';
import { DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE } from '../src/shared/ai-prompts.ts';

test('normalizeRephraseStyles uses the first blockquote per heading', () => {
  const content = `### Simplified Version
> I will send the report tomorrow.
This is easier to read.

### Academic & Formal
> I shall submit the report tomorrow and would be grateful if you could review it before Friday.
Elevated register.

### Native & Idiomatic
> I'll send the report tomorrow — give it a look before Friday?
Conversational.`;

  const styles = normalizeRephraseStyles(content);
  assert.equal(styles.length, 3);
  assert.equal(styles[0].style, 'simplified');
  assert.equal(styles[0].text, 'I will send the report tomorrow.');
  assert.equal(styles[1].style, 'formal');
  assert.match(styles[1].text, /shall submit/);
  assert.equal(styles[2].style, 'idiomatic');
});

test('rephrase prompt stays the three-style learner rewrite', () => {
  assert.match(DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE, /across three distinct stylistic targets/);
  assert.match(DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE, /\{\{sentence\}\}/);
  assert.match(DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE, /### Simplified Version/);
  assert.match(DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE, /### Academic & Formal/);
  assert.match(DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE, /### Native & Idiomatic/);
  assert.doesNotMatch(DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE, /email draft, or short paragraph/);
});
