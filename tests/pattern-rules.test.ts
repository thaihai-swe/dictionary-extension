import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownSections } from '../src/shared/ai-example-blocks.ts';

test('parseMarkdownSections pairs Pattern Rules with following Short Examples', () => {
  const content = `### Syntactic Breakdown
Preposition heading an adjunct phrase.

### Pattern Rules
Prepositional placement: A prepositional phrase headed by "beside" functions as an adjunct or complement within a clause.

Complement structure: The preposition "beside" is followed immediately by a noun phrase.

### Short Examples
> "She sat beside her friend during the lecture."
> Cô ấy ngồi bên cạnh người bạn của mình trong suốt buổi giảng.

> "The keys are on the table beside the door."
> Chìa khóa ở trên bàn bên cạnh cánh cửa.`;

  const blocks = parseMarkdownSections(content, 'Vietnamese');

  // Should have Syntactic Breakdown and Pattern Rules, while Short Examples is consumed
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].title, 'Syntactic Breakdown');
  assert.equal(blocks[1].title, 'Pattern Rules');

  const ruleItems = blocks[1].items.filter((it) => it.kind === 'pattern_rule');
  assert.equal(ruleItems.length, 2);

  // First rule has its title and paired example 1
  assert.equal(ruleItems[0].kind === 'pattern_rule' && ruleItems[0].title, 'Prepositional placement');
  assert.equal(
    ruleItems[0].kind === 'pattern_rule' && ruleItems[0].example?.english,
    'She sat beside her friend during the lecture.',
  );
  assert.equal(
    ruleItems[0].kind === 'pattern_rule' && ruleItems[0].example?.translation,
    'Cô ấy ngồi bên cạnh người bạn của mình trong suốt buổi giảng.',
  );

  // Second rule has its title and paired example 2
  assert.equal(ruleItems[1].kind === 'pattern_rule' && ruleItems[1].title, 'Complement structure');
  assert.equal(
    ruleItems[1].kind === 'pattern_rule' && ruleItems[1].example?.english,
    'The keys are on the table beside the door.',
  );
  assert.equal(
    ruleItems[1].kind === 'pattern_rule' && ruleItems[1].example?.translation,
    'Chìa khóa ở trên bàn bên cạnh cánh cửa.',
  );
});

test('parseMarkdownSections handles inline examples directly under Pattern Rules', () => {
  const content = `### Pattern Rules
- **set/establish + boundaries**: Transitive verb taking plural noun object.
> "Parents should set healthy boundaries with children."
> "Cha mẹ nên thiết lập ranh giới lành mạnh với con cái."

- **boundaries + between A and B**: Prepositional complement structure.
> "The law blurs boundaries between safety and privacy."
> "Luật pháp làm mờ đi ranh giới giữa an toàn và riêng tư."`;

  const blocks = parseMarkdownSections(content, 'Vietnamese');
  assert.equal(blocks.length, 1);
  const ruleItems = blocks[0].items.filter((it) => it.kind === 'pattern_rule');
  assert.equal(ruleItems.length, 2);

  assert.equal(ruleItems[0].kind === 'pattern_rule' && ruleItems[0].title, 'set/establish + boundaries');
  assert.equal(
    ruleItems[0].kind === 'pattern_rule' && ruleItems[0].example?.english,
    'Parents should set healthy boundaries with children.',
  );

  assert.equal(ruleItems[1].kind === 'pattern_rule' && ruleItems[1].title, 'boundaries + between A and B');
  assert.equal(
    ruleItems[1].kind === 'pattern_rule' && ruleItems[1].example?.english,
    'The law blurs boundaries between safety and privacy.',
  );
});
