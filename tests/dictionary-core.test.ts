import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundError, isFatalDictionaryError, errorWithStatus } from '../src/providers/errors.ts';
import { getRetryDelay, isRequestCancelled, shouldProxyThroughServiceWorker, shouldRetryFetch } from '../src/providers/provider.http.ts';
import { applyTemplate, appendInputContract, canonicalAiIntent, PRELOAD_ALL_INTENTS, PRELOAD_FOLLOW_UPS } from '../src/shared/ai-prompts.ts';
import {
  groupMarkdownLines,
  isExampleSectionTitle,
  languageBadge,
  looksLikeEnglish,
  looksLikeTranslation,
} from '../src/shared/ai-example-blocks.ts';
import {
  getDictionaryLookupAttempts,
  getEnglishLemma,
  getEnglishLemmaCandidates,
  getPrimaryDictionaryLookupAttempts,
} from '../src/shared/query-utils.ts';
import { mergeDictionaryEntries, mergeMeanings } from '../src/shared/enrichment.ts';
import {
  extractSentenceAtOffset,
  findSentenceContaining,
  normalizeContext,
  rankSentenceCandidates,
} from '../src/shared/page-context.ts';
import { buildMwAudioUrl, collectMwExamples, stripHtml } from '../src/providers/parser-helpers.ts';
import { aiAbortScope, createRequestId, dictionaryAbortScope } from '../src/shared/messages.ts';
import { SECRET_KEYS, SETTINGS_SCHEMA_VERSION, stripSecretRecord } from '../src/shared/settings-export.ts';

function classifyQuery(text: string): 'empty' | 'word' | 'phrase' | 'sentence' {
  const str = String(text || '').trim();
  if (!str) return 'empty';
  const hasPunctuation = /[.!?]/.test(str);
  const words = str.split(/\s+/).filter(Boolean);
  if (words.length === 1) return 'word';
  if (hasPunctuation || words.length >= 7) return 'sentence';
  return 'phrase';
}

function isPhraseLike(text: string): boolean {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  if (normalized.split(' ').length > 1) return true;
  return /[-']/.test(normalized) && normalized.length > 2;
}

describe('isPhraseLike', () => {
  it('treats multi-word queries as phrases', () => {
    assert.equal(isPhraseLike('look up'), true);
    assert.equal(classifyQuery('look up'), 'phrase');
  });

  it('treats hyphen and apostrophe tokens as phrase-like', () => {
    assert.equal(isPhraseLike("don't"), true);
    assert.equal(isPhraseLike('well-known'), true);
    assert.equal(classifyQuery("don't"), 'word');
  });

  it('does not treat short plain words as phrases', () => {
    assert.equal(isPhraseLike('run'), false);
  });
});

describe('lemma and related forms', () => {
  it('maps irregular verbs and inflections', () => {
    assert.deepEqual(getEnglishLemmaCandidates('went'), ['go']);
    assert.deepEqual(getEnglishLemmaCandidates('children'), ['child']);
    assert.ok(getEnglishLemmaCandidates('running').includes('run'));
    assert.ok(getEnglishLemmaCandidates('taking').includes('take'));
    assert.deepEqual(getEnglishLemmaCandidates('better'), ['good']);
    assert.equal(getEnglishLemma('worked'), 'work');
    assert.equal(getEnglishLemma('works'), 'work');
  });

  it('tries primary lemma before any secondary provider', () => {
    const attempts = getDictionaryLookupAttempts('running', 'free_dictionary');
    const firstSecondaryIndex = attempts.findIndex((attempt) => attempt.providerId !== 'free_dictionary');
    const primaryRootIndex = attempts.findIndex((attempt) => (
      attempt.providerId === 'free_dictionary' && attempt.kind === 'root'
    ));

    assert.ok(primaryRootIndex >= 0);
    assert.ok(firstSecondaryIndex > primaryRootIndex);
    assert.deepEqual(attempts[0], {
      providerId: 'free_dictionary',
      query: 'run',
      kind: 'root',
    });
    assert.equal(attempts[primaryRootIndex].query, 'run');
  });

  it('looks up the lemma for languages before the inflected form', () => {
    const attempts = getDictionaryLookupAttempts('languages', 'free_dictionary');
    assert.deepEqual(attempts[0], {
      providerId: 'free_dictionary',
      query: 'language',
      kind: 'root',
    });
    assert.equal(getEnglishLemma('languages'), 'language');
  });

  it('looks up placeholder for placeholders, including trailing punctuation', () => {
    assert.equal(getEnglishLemma('placeholders'), 'placeholder');
    assert.equal(getEnglishLemma('placeholders,'), 'placeholder');
    assert.ok(getEnglishLemmaCandidates('placeholders').includes('placeholder'));

    const attempts = getDictionaryLookupAttempts('placeholders', 'free_dictionary');
    assert.deepEqual(attempts[0], {
      providerId: 'free_dictionary',
      query: 'placeholder',
      kind: 'root',
    });
    assert.equal(attempts.find((attempt) => attempt.kind === 'exact')?.query, 'placeholders');
  });

  it('keeps Phase 1 lookups on the primary provider only', () => {
    const attempts = getPrimaryDictionaryLookupAttempts('running', 'free_dictionary');
    assert.ok(attempts.length >= 1);
    assert.ok(attempts.every((attempt) => attempt.providerId === 'free_dictionary'));
    assert.equal(attempts.some((attempt) => attempt.providerId === 'wiktionary'), false);
  });

  it('caps Phase 1 at two primary-provider attempts', () => {
    const attempts = getPrimaryDictionaryLookupAttempts('running', 'free_dictionary');
    assert.ok(attempts.length <= 2);
    assert.deepEqual(attempts[0], {
      providerId: 'free_dictionary',
      query: 'run',
      kind: 'root',
    });
  });
});

describe('dictionary provider merge', () => {
  it('combines noun sections from multiple providers and skips duplicate definitions', () => {
    const merged = mergeMeanings(
      [{
        partOfSpeech: 'Noun',
        source: 'Free Dictionary API',
        definitions: [{ definition: 'a system of communication' }],
      }],
      [{
        partOfSpeech: 'n.',
        source: 'Wiktionary',
        definitions: [
          { definition: 'A system of communication.' },
          { definition: 'The vocabulary of a particular field' },
        ],
      }],
    );

    assert.equal(merged.length, 1);
    assert.equal(merged[0].partOfSpeech, 'noun');
    assert.equal(merged[0].source, 'Free Dictionary API + Wiktionary');
    assert.equal(merged[0].definitions.length, 2);
    assert.equal(merged[0].definitions[1].definition, 'The vocabulary of a particular field');
  });

  it('does not keep translation as a second meaning section', () => {
    const merged = mergeDictionaryEntries(
      {
        word: 'language',
        meanings: [{
          partOfSpeech: 'noun',
          source: 'Free Dictionary API',
          definitions: [{ definition: 'a system of communication' }],
        }],
        translation: {
          translatedText: 'ngôn ngữ',
          sourceBadges: [{ label: 'Google Translate', kind: 'translation' }],
        },
      },
      {
        word: 'language',
        meanings: [{
          partOfSpeech: 'phrase / translation',
          source: 'Google Translate',
          definitions: [{ definition: 'ngôn ngữ' }],
        }],
        translation: {
          translatedText: 'ngôn ngữ',
          sourceBadges: [{ label: 'Google Translate', kind: 'translation' }],
        },
      },
    );

    assert.equal(merged.meanings.length, 1);
    assert.equal(merged.meanings[0].partOfSpeech, 'noun');
    assert.equal(merged.translation?.translatedText, 'ngôn ngữ');
  });
});

describe('dictionary errors', () => {
  it('treats NotFoundError as recoverable', () => {
    assert.equal(isFatalDictionaryError(new NotFoundError('missing')), false);
  });

  it('treats 401/403 and missing-key messages as fatal', () => {
    assert.equal(isFatalDictionaryError(errorWithStatus('unauthorized', 401)), true);
    assert.equal(isFatalDictionaryError(errorWithStatus('API key is required')), true);
    assert.equal(isFatalDictionaryError(errorWithStatus('timeout', 500)), false);
    assert.equal(isFatalDictionaryError(errorWithStatus('Lookup timed out after 6000ms.', 408)), false);
  });
});

describe('dictionary fetch transport', () => {
  it('does not proxy through the service worker outside a webpage content script', () => {
    assert.equal(shouldProxyThroughServiceWorker(), false);
  });
});

describe('AI prompt helpers', () => {
  it('interpolates template variables', () => {
    const result = applyTemplate('Explain {{str}} into {{targetLang}}', {
      str: 'run',
      text: 'run',
      sentence: 'I can run',
      context: 'I can run',
      word_count: 1,
      targetLang: 'Vietnamese',
    });
    assert.equal(result, 'Explain run into Vietnamese');
  });

  it('appends the XML input contract', () => {
    const prompt = appendInputContract('Analyze this.', {
      str: 'run',
      text: 'run',
      sentence: 'I can run',
      context: 'I can run',
      word_count: 1,
      targetLang: 'Vietnamese',
    });
    assert.match(prompt, /<target>\nrun\n<\/target>/);
    assert.match(prompt, /<target-language>\nVietnamese\n<\/target-language>/);
  });

  it('canonicalizes main-branch intent aliases', () => {
    assert.equal(canonicalAiIntent('phrase_explorer'), 'collocations');
    assert.equal(canonicalAiIntent('compare_confusables'), 'confusables');
  });

  it('preloads every user-facing intent when AI preload is enabled', () => {
    assert.deepEqual(PRELOAD_ALL_INTENTS, [
      'default',
      'explain_in_context',
      'grammar',
      'collocations',
      'sentence_breakdown',
      'confusables',
      'rephrase',
    ]);
    assert.equal(PRELOAD_FOLLOW_UPS.includes('default'), false);
  });
});

describe('AI example sentence grouping', () => {
  it('pairs an English blockquote with the following translation', () => {
    const items = groupMarkdownLines([
      '> "The committee will evaluate all proposals next week."',
      '> Hội đồng sẽ đánh giá tất cả các đề xuất vào tuần tới.',
    ], { exampleSection: true, targetLang: 'Vietnamese' });

    assert.deepEqual(items, [{
      kind: 'example',
      english: 'The committee will evaluate all proposals next week.',
      translation: 'Hội đồng sẽ đánh giá tất cả các đề xuất vào tuần tới.',
    }]);
  });

  it('splits an inline English sentence and parenthetical translation', () => {
    const items = groupMarkdownLines([
      '> "Please evaluate this report." (Hãy đánh giá báo cáo này.)',
    ], { exampleSection: true, targetLang: 'Vietnamese' });

    assert.equal(items[0]?.kind, 'example');
    if (items[0]?.kind !== 'example') return;
    assert.equal(items[0].english, 'Please evaluate this report.');
    assert.equal(items[0].translation, 'Hãy đánh giá báo cáo này.');
  });

  it('does not treat rephrase notes as translations', () => {
    assert.equal(isExampleSectionTitle('Simplified Version'), false);
    assert.equal(isExampleSectionTitle('Example Sentences'), true);
    assert.equal(languageBadge('Vietnamese'), 'VI');
    assert.equal(looksLikeEnglish('The committee will evaluate all proposals.'), true);
    assert.equal(looksLikeTranslation('Hội đồng sẽ đánh giá tất cả các đề xuất.'), true);
  });
});

describe('page context ranking', () => {
  it('extracts the sentence at the selection offset', () => {
    const text = 'First sentence. The placeholders were unused. Last sentence.';
    assert.equal(extractSentenceAtOffset(text, 20), 'The placeholders were unused.');
  });

  it('does not treat decimals, hostnames, or abbreviations as sentence boundaries', () => {
    const decimal = 'The price is $3.50 at example.com today.';
    assert.equal(extractSentenceAtOffset(decimal, 12), decimal);
    assert.equal(findSentenceContaining(decimal, 'today'), decimal);
    const abbreviation = 'Dr. Smith evaluated the placeholders today.';
    assert.equal(extractSentenceAtOffset(abbreviation, 18), abbreviation);
    assert.equal(findSentenceContaining(abbreviation, 'placeholders'), abbreviation);
  });

  it('keeps the whole sentence when punctuation is followed by a quote', () => {
    const text = 'She said, "The placeholders were unused." Next sentence.';
    assert.equal(extractSentenceAtOffset(text, 20), 'She said, "The placeholders were unused."');
  });

  it('finds a word-boundary sentence match', () => {
    const text = 'A placeholder is useful. The placeholders were unused.';
    assert.equal(findSentenceContaining(text, 'placeholders'), 'The placeholders were unused.');
  });

  it('falls back to the full block when there is no sentence terminator', () => {
    const text = 'The placeholders were unused';
    assert.equal(findSentenceContaining(text, 'placeholders'), text);
    assert.equal(extractSentenceAtOffset(text, 4), text);
  });

  it('ranks visible in-content sentences first', () => {
    const ranked = rankSentenceCandidates([
      { sentence: 'far', visible: false, inMainContent: true, viewportDistance: 800, documentOrder: 0 },
      { sentence: 'near', visible: true, inMainContent: true, viewportDistance: 10, documentOrder: 2 },
      { sentence: 'sidebar', visible: true, inMainContent: false, viewportDistance: 0, documentOrder: 1 },
    ]);
    assert.equal(ranked[0]?.sentence, 'near');
    assert.equal(normalizeContext('a'.repeat(900)).endsWith('…'), true);
  });
});

describe('fetch retries and parser helpers', () => {
  it('retries 429/5xx and network errors, but not abort or 401', () => {
    const retryStatuses = [429, 500, 502, 503, 504];
    assert.equal(shouldRetryFetch(null, { status: 429 } as Response, retryStatuses), true);
    assert.equal(shouldRetryFetch(null, { status: 401 } as Response, retryStatuses), false);
    assert.equal(shouldRetryFetch(new DOMException('aborted', 'AbortError'), null, retryStatuses), false);
    assert.equal(shouldRetryFetch(new Error('Failed to fetch'), null, retryStatuses), true);
    assert.equal(isRequestCancelled(new DOMException('aborted', 'AbortError')), true);
    assert.equal(getRetryDelay({ headers: { get: () => '2' } } as unknown as Response, 0), 2000);
  });

  it('builds Merriam-Webster audio URLs and collects vis examples', () => {
    assert.equal(
      buildMwAudioUrl('placeholder'),
      'https://media.merriam-webster.com/audio/prons/en/us/mp3/p/placeholder.mp3',
    );
    assert.equal(
      buildMwAudioUrl('bixword'),
      'https://media.merriam-webster.com/audio/prons/en/us/mp3/bix/bixword.mp3',
    );
    const examples = collectMwExamples({
      def: [['vis', [{ t: '{bc}The {a_link|placeholders} were unused.' }]]],
    });
    assert.equal(examples[0], 'The placeholders were unused.');
    assert.equal(stripHtml('<i>unused</i> &amp; empty'), 'unused & empty');
  });
});

describe('runtime messages', () => {
  it('builds abort scopes and request ids', () => {
    assert.equal(dictionaryAbortScope(), 'dictionary');
    assert.equal(aiAbortScope('grammar'), 'ai:grammar');
    assert.match(createRequestId('dict'), /^dict_/);
  });
});

describe('settings export', () => {
  it('strips secrets from public settings records', () => {
    const publicSettings = stripSecretRecord({
      aiApiKey: 'secret-ai',
      dictionaryApiKey: 'secret-mw',
      theme: 'light',
    });
    assert.equal('aiApiKey' in publicSettings, false);
    assert.equal(SECRET_KEYS.has('wordnikApiKey'), true);
    assert.equal(publicSettings.theme, 'light');
    assert.equal(SETTINGS_SCHEMA_VERSION, 11);
  });
});
