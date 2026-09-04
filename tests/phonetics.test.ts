import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanPhoneticString,
  hasPhoneticText,
  isValidPhoneticText,
  mergePhonetics,
  readPhoneticsCache,
  writePhoneticsCache,
} from '../src/shared/enrichment.ts';
import type { Phonetic } from '../src/types/index.ts';

describe('Enrichment and Phonetics Cache', () => {
  it('rejects wiki-link artifacts as IPA', () => {
    assert.equal(isValidPhoneticText('/wiki/'), false);
    assert.equal(cleanPhoneticString('/wiki/'), '');
    assert.equal(isValidPhoneticText('/tɛst/'), true);
    assert.equal(cleanPhoneticString('/tɛst/'), '/tɛst/');
  });

  it('detects when an entry has usable phonetic text', () => {
    assert.equal(hasPhoneticText(null), false);
    assert.equal(hasPhoneticText({ word: 'test', meanings: [] }), false);
    assert.equal(
      hasPhoneticText({
        word: 'test',
        phonetic: '/tɛst/',
        meanings: [],
      }),
      true,
    );
    assert.equal(
      hasPhoneticText({
        word: 'test',
        phonetics: [{ text: '/tɛst/' }],
        meanings: [],
      }),
      true,
    );
  });

  it('merges phonetic items deduplicating by language or normalized text', () => {
    const existing: Phonetic[] = [
      { text: '/tɛst/', phonetic: '/tɛst/', language: 'en-US' },
    ];
    const incoming: Phonetic[] = [
      { text: '/tɛst/', phonetic: '/tɛst/', audioUrl: 'https://example.com/us.mp3', language: 'en-US' },
      { text: '/tɛst/', phonetic: '/tɛst/', audioUrl: 'https://example.com/uk.mp3', language: 'en-GB' },
    ];
    const merged = mergePhonetics(existing, incoming);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].audioUrl, 'https://example.com/us.mp3');
    assert.equal(merged[1].language, 'en-GB');
  });

  it('backfills IPA onto audio-only phonetic slots', () => {
    const existing: Phonetic[] = [
      { text: '/ɨˈvaljʊeɪt/', phonetic: '/ɨˈvaljʊeɪt/' },
      { audioUrl: 'https://example.com/evaluate-us.mp3', region: 'us', language: 'en-US' },
    ];
    const merged = mergePhonetics(existing, []);
    const us = merged.find((item) => item.language === 'en-US' || item.region === 'us');
    assert.ok(us);
    assert.equal(us?.phonetic, '/ɨˈvaljʊeɪt/');
    assert.equal(us?.audioUrl, 'https://example.com/evaluate-us.mp3');
  });

  it('caches and retrieves phonetics in memory', () => {
    const phonetics: Phonetic[] = [
      { text: '/həˈloʊ/', language: 'en-US' },
      { text: '/həˈləʊ/', language: 'en-GB' },
    ];
    writePhoneticsCache('Hello', phonetics);
    const cached = readPhoneticsCache('hello');
    assert.ok(cached);
    assert.equal(cached?.length, 2);
    assert.equal(cached?.[0].text, '/həˈloʊ/');
  });
});
