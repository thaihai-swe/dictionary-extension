import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeRephraseStyles } from '../src/shared/ai-parser.ts';
import { applyTemplate } from '../src/shared/ai-prompts.ts';

const promptDir = join(dirname(fileURLToPath(import.meta.url)), '../src/prompts');
const rephrasePrompt = readFileSync(join(promptDir, 'rephrase.md'), 'utf8');
const sharedPartials = {
  languagePolicy: readFileSync(join(promptDir, 'shared/language-policy.md'), 'utf8').trim(),
  bilingualExampleShape: readFileSync(join(promptDir, 'shared/bilingual-example-shape.md'), 'utf8').trim(),
  markdownL3: readFileSync(join(promptDir, 'shared/markdown-l3.md'), 'utf8').trim(),
  lexicalProfileHeadingBan: readFileSync(join(promptDir, 'shared/lexical-profile-heading-ban.md'), 'utf8').trim(),
};

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
  assert.match(rephrasePrompt, /across three distinct stylistic targets/);
  assert.match(rephrasePrompt, /\{\{sentence\}\}/);
  assert.match(rephrasePrompt, /\{\{languagePolicy\}\}/);
  assert.match(rephrasePrompt, /### Simplified Version/);
  assert.match(rephrasePrompt, /### Academic & Formal/);
  assert.match(rephrasePrompt, /### Native & Idiomatic/);
  assert.doesNotMatch(rephrasePrompt, /email draft, or short paragraph/);
});

test('applyTemplate expands shared prompt partials then runtime slots', () => {
  const filled = applyTemplate(
    'Policy:\n{{languagePolicy}}\nShape:\n{{bilingualExampleShape}}\nLang: {{targetLang}}',
    {
      str: 'x',
      text: 'x',
      sentence: 'x',
      context: '',
      word_count: 1,
      targetLang: 'Vietnamese',
    },
    sharedPartials,
  );
  assert.match(filled, /Write instructional explanations/);
  assert.match(filled, /> English sentence/);
  assert.match(filled, /> Vietnamese translation/);
  assert.match(filled, /Lang: Vietnamese/);
  assert.doesNotMatch(filled, /\{\{languagePolicy\}\}/);
  assert.doesNotMatch(filled, /\{\{bilingualExampleShape\}\}/);
  assert.doesNotMatch(filled, /\{\{targetLang\}\}/);
});
