import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  playPronunciation,
  startSpeechPractice,
  useDictionaryAudio,
  useDictionaryPractice,
  useDictionaryQuery,
  useDictionaryResult,
} from '../composables/composable.dictionary';
import { AttributedItem, Phonetic } from '../types';
import { cleanPhoneticString } from '../shared/enrichment';
import SenseMatrixCard from './card.sense-matrix';
import MarkdownRenderer from './component.markdown-renderer';
import {
  CollocationsCard,
  LearnerMistakesCard,
  UsageNotesCard,
  WordFamilyCard,
  WordFormationCard,
} from './async-views';
import { cx } from '../ui/cx';
import { IconMic, IconQuote, IconSparkles, IconSpeaker } from './icons';
import RelatedWords from './component.related-words';

interface WordLookupResultProps {
  onSelectWord?: (word: string) => void;
}

function normalizeExample(text?: string): string {
  return String(text || '')
    .toLowerCase()
    .replace(/["“”'‘’.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTerm(term?: string): string {
  return String(term || '')
    .toLowerCase()
    .trim();
}

export const WordLookupResult: React.FC<WordLookupResultProps> = ({ onSelectWord }) => {
  const { result } = useDictionaryResult();
  const query = useDictionaryQuery();
  const { playingKey } = useDictionaryAudio();
  const { practiceResult, isPracticing, supportsSpeechPractice } = useDictionaryPractice();
  const [extrasReady, setExtrasReady] = useState(false);

  useEffect(() => {
    setExtrasReady(false);
    const frame = requestAnimationFrame(() => setExtrasReady(true));
    return () => cancelAnimationFrame(frame);
  }, [result?.word, query]);

  const displayHeadword = useMemo(() => {
    const entry = result;
    return String(entry?.originalText || query || entry?.word || '').trim();
  }, [result, query]);

  const pronunciations = useMemo<Phonetic[]>(() => {
    if (result?.pronunciations?.length) return result.pronunciations;
    return result?.phonetics || [];
  }, [result]);

  function matchesLang(item: Phonetic, lang: 'en-GB' | 'en-US'): boolean {
    const language = String(item.language || '').toLowerCase();
    if (language === lang.toLowerCase()) return true;
    if (lang === 'en-GB') return item.region === 'uk';
    if (lang === 'en-US') return item.region === 'us';
    return false;
  }

  function phoneticText(item?: Phonetic): string {
    const word = String(result?.word || '').trim().toLowerCase();
    const candidates = [item?.phonetic, item?.text, result?.phonetic];
    for (const raw of candidates) {
      const value = cleanPhoneticString(raw);
      if (!value) continue;
      const stripped = value.replace(/^\/+|\/+$/g, '').toLowerCase();
      if (stripped && stripped !== word) return value;
      if (value.startsWith('/') && value.endsWith('/') && value.length > 2) return value;
    }
    return '';
  }

  function audioUrlOf(item?: Phonetic): string {
    return String(item?.audioUrl || item?.audio || '').trim();
  }

  function hasAccentData(item?: Phonetic): boolean {
    return Boolean(phoneticText(item) || audioUrlOf(item));
  }

  const sharedIpa = useMemo(() => {
    const fromItems = pronunciations.map((item) => phoneticText(item)).find(Boolean);
    if (fromItems) return fromItems;
    const top = cleanPhoneticString(result?.phonetic);
    const word = String(result?.word || '').trim().toLowerCase();
    if (top && top.toLowerCase() !== word) return top;
    return '';
  }, [pronunciations, result]);

  function withSharedIpa(item: Phonetic, lang: 'en-GB' | 'en-US'): Phonetic {
    if (phoneticText(item) || !sharedIpa) {
      return { ...item, language: item.language || lang, region: item.region || (lang === 'en-GB' ? 'uk' : 'us') };
    }
    return {
      ...item,
      phonetic: sharedIpa,
      text: sharedIpa,
      language: item.language || lang,
      region: item.region || (lang === 'en-GB' ? 'uk' : 'us'),
    };
  }

  function pronunciationFor(lang: 'en-GB' | 'en-US'): Phonetic | undefined {
    const matches = pronunciations.filter((item) => matchesLang(item, lang));
    const withIpaAndAudio = matches.find((item) => phoneticText(item) && audioUrlOf(item));
    const withIpa = matches.find((item) => phoneticText(item));
    const withAudio = matches.find((item) => audioUrlOf(item));
    return withIpaAndAudio || withIpa || withAudio || matches[0];
  }

  const fallbackPronunciation = (lang: 'en-GB' | 'en-US'): Phonetic | undefined => {
    const generic = pronunciations.find((item) => phoneticText(item) || audioUrlOf(item) || item?.fallbackOnly);
    if (generic && (phoneticText(generic) || sharedIpa)) {
      return {
        ...generic,
        phonetic: phoneticText(generic) || sharedIpa,
        text: phoneticText(generic) || sharedIpa,
        language: lang,
        region: lang === 'en-GB' ? 'uk' : 'us',
        audio: undefined,
        audioUrl: undefined,
        fallbackOnly: true,
      };
    }
    if (sharedIpa) {
      return {
        text: sharedIpa,
        phonetic: sharedIpa,
        language: lang,
        region: lang === 'en-GB' ? 'uk' : 'us',
        fallbackOnly: true,
      };
    }
    if (displayHeadword) {
      return {
        text: displayHeadword,
        language: lang,
        region: lang === 'en-GB' ? 'uk' : 'us',
        fallbackOnly: true,
      };
    }
    return undefined;
  };

  const ukPronunciation = useMemo(() => {
    const item = pronunciationFor('en-GB');
    if (item && hasAccentData(item)) return withSharedIpa(item, 'en-GB');
    return fallbackPronunciation('en-GB');
  }, [pronunciations, displayHeadword, sharedIpa]);

  const usPronunciation = useMemo(() => {
    const item = pronunciationFor('en-US');
    if (item && hasAccentData(item)) return withSharedIpa(item, 'en-US');
    return fallbackPronunciation('en-US');
  }, [pronunciations, displayHeadword, sharedIpa]);

  const genericPronunciation = useMemo(() => {
    if (ukPronunciation || usPronunciation) return undefined;
    const found = pronunciations.find((item) => hasAccentData(item) || item?.fallbackOnly);
    if (found) return found;
    if (result?.word) {
      return { text: result.word, language: 'en-US', fallbackOnly: true };
    }
    return undefined;
  }, [ukPronunciation, usPronunciation, pronunciations, result]);

  const usageWarnings = result?.lexicalProfile?.usageWarnings || [];
  const formationText = useMemo(() => {
    const formation = result?.lexicalProfile?.wordFormation;
    if (!formation) return '';
    if (typeof formation === 'string') return formation;
    return formation.explanation || '';
  }, [result]);

  const formationPrefixes = useMemo(() => {
    const formation = result?.lexicalProfile?.wordFormation;
    return typeof formation === 'object' ? formation?.prefixes || [] : [];
  }, [result]);

  const formationSuffixes = useMemo(() => {
    const formation = result?.lexicalProfile?.wordFormation;
    return typeof formation === 'object' ? formation?.suffixes || [] : [];
  }, [result]);

  function handleSearch(wordToSearch: string) {
    onSelectWord?.(wordToSearch);
  }

  const { filteredExamples, filteredSynonyms, filteredAntonyms } = useMemo(() => {
    if (!result) {
      return { filteredExamples: [], filteredSynonyms: [], filteredAntonyms: [] };
    }

    const seenExamples = new Set<string>();
    const seenSynonyms = new Set<string>();
    const seenAntonyms = new Set<string>();

    for (const meaning of result.meanings || []) {
      for (const s of meaning.synonyms || []) {
        const norm = normalizeTerm(s);
        if (norm) seenSynonyms.add(norm);
      }
      for (const a of meaning.antonyms || []) {
        const norm = normalizeTerm(a);
        if (norm) seenAntonyms.add(norm);
      }
      for (const def of meaning.definitions || []) {
        if (def.example) {
          const normEx = normalizeExample(def.example);
          if (normEx) seenExamples.add(normEx);
        }
        for (const s of def.synonyms || []) {
          const norm = normalizeTerm(s);
          if (norm) seenSynonyms.add(norm);
        }
        for (const a of def.antonyms || []) {
          const norm = normalizeTerm(a);
          if (norm) seenAntonyms.add(norm);
        }
      }
    }

    const filteredExamples: AttributedItem[] = [];
    for (const ex of result.examples || []) {
      const norm = normalizeExample(ex.text);
      if (norm && !seenExamples.has(norm)) {
        seenExamples.add(norm);
        filteredExamples.push(ex);
      }
    }

    const filteredSynonyms: AttributedItem[] = [];
    for (const syn of result.synonyms || []) {
      const norm = normalizeTerm(syn.text);
      if (norm && !seenSynonyms.has(norm)) {
        seenSynonyms.add(norm);
        filteredSynonyms.push(syn);
      }
    }

    const filteredAntonyms: AttributedItem[] = [];
    for (const ant of result.antonyms || []) {
      const norm = normalizeTerm(ant.text);
      if (norm && !seenAntonyms.has(norm)) {
        seenAntonyms.add(norm);
        filteredAntonyms.push(ant);
      }
    }

    return { filteredExamples, filteredSynonyms, filteredAntonyms };
  }, [result]);

  if (!result) return null;

  return (
    <div className="space-y-4">
      {/* Headword Plate: Clean title, phonetics, audio triggers */}
      <div className="pb-3 border-b border-border space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-[28px] font-semibold text-content font-heading tracking-tight leading-tight dark:text-[#f8f4ea]">
              {displayHeadword}
            </h2>

            {/* Dedicated IPA transcription plus Listen (US)/(UK) */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {phoneticText(usPronunciation) || phoneticText(ukPronunciation) || phoneticText(genericPronunciation) ? (
                <span className="text-[12px] font-mono font-semibold text-teal-700 dark:text-teal-400">
                  {phoneticText(usPronunciation) || phoneticText(ukPronunciation) || phoneticText(genericPronunciation)}
                </span>
              ) : null}

              {usPronunciation ? (
                <button
                  type="button"
                  onClick={() =>
                    playPronunciation({
                      text: displayHeadword,
                      audioUrl: audioUrlOf(usPronunciation),
                      language: 'en-US',
                      key: 'en-US',
                    })
                  }
                  className={cx(
                    'h-[26px] px-2 rounded-md border text-[11.5px] font-medium transition-all flex items-center gap-1 cursor-pointer',
                    playingKey === 'en-US'
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
                      : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                  )}
                  aria-pressed={playingKey === 'en-US'}
                  title="Listen (US)"
                >
                  <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>Listen (US)</span>
                </button>
              ) : null}

              {ukPronunciation ? (
                <button
                  type="button"
                  onClick={() =>
                    playPronunciation({
                      text: displayHeadword,
                      audioUrl: audioUrlOf(ukPronunciation),
                      language: 'en-GB',
                      key: 'en-GB',
                    })
                  }
                  className={cx(
                    'h-[26px] px-2 rounded-md border text-[11.5px] font-medium transition-all flex items-center gap-1 cursor-pointer',
                    playingKey === 'en-GB'
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
                      : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                  )}
                  aria-pressed={playingKey === 'en-GB'}
                  title="Listen (UK)"
                >
                  <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>Listen (UK)</span>
                </button>
              ) : null}

              {genericPronunciation ? (
                <button
                  type="button"
                  onClick={() =>
                    playPronunciation({
                      text: displayHeadword,
                      audioUrl: audioUrlOf(genericPronunciation),
                      language: genericPronunciation.language || 'en-US',
                      key: 'generic',
                    })
                  }
                  className={cx(
                    'h-[26px] px-2 rounded-md border text-[11.5px] font-medium transition-all flex items-center gap-1 cursor-pointer',
                    playingKey === 'generic'
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
                      : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                  )}
                  aria-pressed={playingKey === 'generic'}
                  title="Listen pronunciation"
                >
                  <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>Listen</span>
                </button>
              ) : null}

              {supportsSpeechPractice ? (
                <button
                  type="button"
                  onClick={() => startSpeechPractice(displayHeadword, 'en-US')}
                  className={cx(
                    'h-[26px] px-2 rounded-md border text-[11.5px] font-medium transition-all flex items-center gap-1 cursor-pointer',
                    isPracticing
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse'
                      : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                  )}
                  aria-pressed={isPracticing}
                  title="Speech practice evaluator"
                >
                  <IconMic className="w-3 h-3" />
                  <span>{isPracticing ? 'Listening…' : 'Practice'}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {result.translation?.translatedText ? (
        <section className="p-3 rounded-lg border border-border bg-surface flex items-baseline justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10.5px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Translation
            </span>
            <p className="text-[14.5px] text-content font-medium leading-relaxed">
              {result.translation.translatedText}
            </p>
          </div>
          <span className="text-[10px] text-content-muted flex-shrink-0 font-mono">
            {result.translation.sourceBadges?.map((b) => b.label).join(' · ') || 'Google'}
          </span>
        </section>
      ) : null}

      {/* Speech Practice Result Badge */}
      {practiceResult ? (
        <div
          className={cx(
            'rounded-lg border px-3 py-2 text-[12.5px] space-y-1',
            practiceResult.grade === 'excellent'
              ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300'
              : practiceResult.grade === 'good'
                ? 'border-teal-500/30 bg-teal-500/8 text-teal-700 dark:text-teal-300'
                : practiceResult.grade === 'almost'
                  ? 'border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300'
                  : 'border-rose-500/30 bg-rose-500/8 text-rose-700 dark:text-rose-300',
          )}
        >
          <div className="font-semibold">
            {practiceResult.score}% · {practiceResult.gradeLabel}
            {practiceResult.spoken ? <span> · heard “{practiceResult.spoken}”</span> : null}
          </div>
          {practiceResult.details && practiceResult.details.length > 1 ? (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {practiceResult.details.map((detail, index) => (
                <span
                  key={`${detail.word}-${index}`}
                  className={cx(
                    'px-1.5 py-0.2 rounded text-[11px] font-mono font-medium border',
                    detail.matched
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : detail.closeMatch
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300',
                  )}
                >
                  {detail.word}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {result.meanings?.length ? (
        <section className="p-3.5 rounded-lg border border-border bg-surface space-y-3">
          <SenseMatrixCard meanings={result.meanings} onSelectWord={handleSearch} />
        </section>
      ) : null}

      {filteredExamples.length ? (
        <section className="p-3.5 rounded-lg border border-border bg-surface space-y-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
            <IconQuote className="w-3.5 h-3.5 text-teal-600 dark:text-gold-200" />
            <span>Examples</span>
          </div>
          <ul className="space-y-2">
            {filteredExamples.map((example, index) => {
              const listenKey = `example-${index}`;
              const isPlaying = playingKey === listenKey;
              return (
                <li
                  key={`${example.text}-${index}`}
                  className="flex items-start justify-between gap-3 text-[13.5px] leading-relaxed text-content-secondary"
                >
                  <span className="flex-1 min-w-0">“{example.text}”</span>
                  <button
                    type="button"
                    onClick={() =>
                      playPronunciation({
                        text: example.text,
                        language: 'en-US',
                        key: listenKey,
                      })
                    }
                    className={cx(
                      'h-6 px-2 rounded-full border text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0',
                      isPlaying
                        ? 'bg-teal-500/20 text-teal-700 dark:text-gold-100 border-teal-500/40'
                        : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                    )}
                    aria-pressed={isPlaying}
                    title="Listen to example"
                  >
                    <IconSpeaker className="w-2.5 h-2.5" />
                    <span>{isPlaying ? 'Playing…' : 'Listen'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* 5. Additional Synonyms & Antonyms */}
      {filteredSynonyms.length || filteredAntonyms.length ? (
        <section className="p-3 rounded-lg border border-border bg-surface/60 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
            <IconSparkles className="w-3.5 h-3.5 text-teal-600 dark:text-gold-200" />
            <span>Related</span>
          </div>
          {filteredSynonyms.length ? (
            <RelatedWords
              label="Synonyms"
              tone="synonym"
              words={filteredSynonyms.map((s) => s.text)}
              onSelectWord={handleSearch}
            />
          ) : null}
          {filteredAntonyms.length ? (
            <RelatedWords
              label="Antonyms"
              tone="antonym"
              words={filteredAntonyms.map((a) => a.text)}
              onSelectWord={handleSearch}
            />
          ) : null}
        </section>
      ) : null}

      {/* 6. Phrase Fallback Explanation */}
      {result.phraseExplanation?.length ? (
        <section className="p-3 rounded-lg border border-border bg-surface space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-teal-700 dark:text-teal-300">
            Phrase Explanation
          </p>
          {result.phraseExplanation.map((section, index) => (
            <div key={index} className="space-y-1.5">
              {section.title && index > 0 ? (
                <div className="font-semibold text-[12.5px] text-content">{section.title}</div>
              ) : null}
              {section.markdown || section.text ? (
                <MarkdownRenderer content={section.text || ''} />
              ) : null}
              {section.items?.length ? (
                <ul className="space-y-0.5 text-[13.5px] text-content list-disc pl-4">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {/* 7. Structured Lexical Profile Cards (Lazy loaded) */}
      {extrasReady ? (
        <Suspense fallback={null}>
          <WordFamilyCard
            word={displayHeadword}
            family={result.lexicalProfile?.wordFamily}
            onSelectWord={handleSearch}
          />

          <CollocationsCard
            word={displayHeadword}
            collocations={result.lexicalProfile?.collocations}
            onSelectWord={handleSearch}
          />

          <UsageNotesCard
            warnings={usageWarnings}
            pairs={result.lexicalProfile?.confusablePairs}
          />

          <WordFormationCard
            formation={formationText}
            prefixes={formationPrefixes}
            suffixes={formationSuffixes}
          />

          <LearnerMistakesCard mistakes={result.lexicalProfile?.learnerMistakes} />
        </Suspense>
      ) : null}
    </div>
  );
};

export default WordLookupResult;
