import test from 'node:test';
import assert from 'node:assert/strict';
import { extractEtymologyFromWikitext } from '../src/providers/provider.wiktionary-etymology.ts';
import { wiktionaryLangHost } from '../src/providers/provider.wiktionary-bilingual.ts';
import { examplesFromTatoebaPayload, tatoebaLangCode } from '../src/providers/provider.tatoeba.ts';
import { filterUrbanItems, stripUrbanMarkup } from '../src/providers/provider.urban-dictionary.ts';

test('extractEtymologyFromWikitext pulls the English etymology section', () => {
  const wikitext = `{{also|helló}}
==English==
===Etymology===
{{etydate|1826}}. From {{m|en|holla}}, {{m|en|hollo}} (attested 1588). This variant of {{m|en|hallo}} is often credited to {{w|Thomas Edison}}.

===Pronunciation===
* {{IPA|en|/həˈləʊ/}}
==French==
===Etymology===
Borrowed from English.
`;
  const etymology = extractEtymologyFromWikitext(wikitext);
  assert.match(etymology, /1826/);
  assert.match(etymology, /holla/);
  assert.match(etymology, /Thomas Edison/);
  assert.doesNotMatch(etymology, /Borrowed from English/);
  assert.doesNotMatch(etymology, /həˈləʊ/);
});

test('wiktionaryLangHost maps target languages and skips English', () => {
  assert.equal(wiktionaryLangHost('Vietnamese'), 'vi');
  assert.equal(wiktionaryLangHost('zh-CN'), 'zh');
  assert.equal(wiktionaryLangHost('English'), null);
  assert.equal(wiktionaryLangHost('en'), null);
});

test('tatoebaLangCode maps ISO-639-1 names to Tatoeba ISO-639-3', () => {
  assert.equal(tatoebaLangCode('Vietnamese'), 'vie');
  assert.equal(tatoebaLangCode('French'), 'fra');
  assert.equal(tatoebaLangCode('zh-TW'), 'cmn');
  assert.equal(tatoebaLangCode('English'), 'eng');
});

test('examplesFromTatoebaPayload prefers target-language translations', () => {
  const examples = examplesFromTatoebaPayload({
    results: [
      {
        text: 'Hello?',
        translations: [[{ lang: 'vie', text: 'Xin chào?' }, { lang: 'fra', text: 'Bonjour ?' }]],
      },
      {
        text: 'Hello?',
        translations: [[{ lang: 'vie', text: 'Xin chào?' }]],
      },
      {
        text: 'Stay persistent.',
        translations: [{ lang: 'vie', text: 'Hãy kiên trì.' }],
      },
    ],
  }, 'vie');
  assert.deepEqual(examples.map((item) => item.text), [
    'Hello? — Xin chào?',
    'Stay persistent. — Hãy kiên trì.',
  ]);
});

test('filterUrbanItems strictly filters by votes, ratio, and exact term', () => {
  const items = [
    {
      word: 'rizz',
      definition: '[Charisma], especially in attracting romantic interest.',
      example: 'He has insane rizz.',
      thumbs_up: 1200,
      thumbs_down: 100,
    },
    {
      word: 'rizz',
      definition: 'A troll low score definition.',
      example: 'Bad definition.',
      thumbs_up: 50, // Fails min thumbs_up (100)
      thumbs_down: 10,
    },
    {
      word: 'rizz',
      definition: 'Controversial definition with low ratio.',
      example: '',
      thumbs_up: 300,
      thumbs_down: 250, // Fails min ratio (70%) and net score
    },
    {
      word: 'rizz god', // Fails exact match
      definition: 'Someone with maximum rizz.',
      example: '',
      thumbs_up: 2000,
      thumbs_down: 50,
    },
  ];

  const filtered = filterUrbanItems(items, 'rizz');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].definition, 'Charisma, especially in attracting romantic interest.');
  assert.equal(filtered[0].thumbsUp, 1200);
});

test('stripUrbanMarkup removes square brackets and excess newlines', () => {
  assert.equal(stripUrbanMarkup('This is [lit] and [fire]!'), 'This is lit and fire!');
});

