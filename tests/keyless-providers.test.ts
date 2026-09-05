import test from 'node:test';
import assert from 'node:assert/strict';
import { extractEtymologyFromWikitext } from '../src/providers/provider.wiktionary-etymology.ts';
import { wiktionaryLangHost } from '../src/providers/provider.wiktionary-bilingual.ts';
import { examplesFromTatoebaPayload, tatoebaLangCode } from '../src/providers/provider.tatoeba.ts';

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
