import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTemplate, canonicalAiIntent, countWords } from '../src/shared/ai-prompts.ts';
import { parseRewriteMarkdown } from '../src/features/rewriter/rewrite-markdown.ts';

const promptPath = join(dirname(fileURLToPath(import.meta.url)), '../src/prompts/English Refine.md');
const refinePrompt = readFileSync(promptPath, 'utf8');

test('canonicalAiIntent keeps rewrite distinct from rephrase', () => {
  assert.equal(canonicalAiIntent('rewrite'), 'rewrite');
  assert.equal(canonicalAiIntent('rephrase'), 'rephrase');
});

test('English Refine.md is the rewriter prompt with runtime slots', () => {
  assert.match(refinePrompt, /## Extension runtime/);
  assert.match(refinePrompt, /\{\{sentence\}\}/);
  assert.match(refinePrompt, /\{\{context\}\}/);
  assert.match(refinePrompt, /\{\{targetLang\}\}/);
  assert.match(refinePrompt, /\{\{word_count\}\}/);
  assert.match(refinePrompt, /Never ask questions/);
  assert.match(refinePrompt, /Style:/);
});

test('rewriter template fills the draft into sentence, not the style hint', () => {
  const filled = applyTemplate(refinePrompt, {
    str: 'Please send the report tomorrow.',
    text: 'Please send the report tomorrow.',
    sentence: 'Please send the report tomorrow.',
    context: 'Style: Polished & Formal (Refined, professional tone)',
    word_count: countWords('Please send the report tomorrow.'),
    targetLang: 'Vietnamese',
  });
  assert.match(filled, /Please send the report tomorrow\./);
  assert.match(filled, /Style: Polished & Formal/);
  assert.doesNotMatch(
    filled.slice(filled.indexOf('Source text to refine:'), filled.indexOf('Optional surrounding context')),
    /Style: Polished/,
  );
});

test('parseRewriteMarkdown parses headings, tables, and extracts polished text', () => {
  const sample = `### 📊 Diagnostic - Issues Identified FIRST
#### 🔴 Correctness Issues
1. [Missing hyphenation]: "keyless providers"
   - Example from text: "keyless providers"

### 🖋️ Revised Text (Professional Use)
> Phase 1 delivers the primary definition and translation in under a second, while Phase 2 enriches senses, examples, and etymology from keyless providers without blocking the initial render.

### 📊 Before/After Comparison Table
| Aspect | Original | Revised | Why Changed |
| :--- | :--- | :--- | :--- |
| Sentence 1 | Phase 1 delivers... | Phase 1 delivers... | Better flow |`;

  const parsed = parseRewriteMarkdown(sample);
  assert.ok(parsed.polished);
  assert.match(parsed.polished, /Phase 1 delivers the primary definition/);

  const diagnostic = parsed.sections.find((s) => /diagnostic/i.test(s.title));
  assert.ok(diagnostic);
  assert.equal(diagnostic.title, '📊 Diagnostic - Issues Identified FIRST');
  const h4 = diagnostic.blocks.find((b) => b.type === 'heading' && b.level === 4);
  assert.ok(h4);

  const comparison = parsed.sections.find((s) => /before\/after/i.test(s.title));
  assert.ok(comparison);
  const table = comparison.blocks.find((b) => b.type === 'table');
  assert.ok(table && table.type === 'table');
  assert.equal(table.headers.length, 4);
  assert.equal(table.rows.length, 1);
});

test('parseRewriteMarkdown strips leftover PHASE numbering from headings', () => {
  const sample = `### 📊 PHASE 1: Diagnostic - Issues Identified FIRST
### 🖋️ PHASE 3: Revised Text (Professional Use)
> Polished sentence here.
### 📊 PHASE 3b: Before/After Comparison Table
| Aspect | Original | Revised |
| :--- | :--- | :--- |
| Tone | stiff | natural |`;

  const parsed = parseRewriteMarkdown(sample);
  assert.equal(parsed.polished, 'Polished sentence here.');
  assert.equal(parsed.sections[0]?.title, '📊 Diagnostic - Issues Identified FIRST');
  assert.equal(parsed.sections[1]?.title, '📊 Before/After Comparison Table');
  assert.equal(parsed.sections.some((s) => /PHASE|3b/i.test(s.title)), false);
});

