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
  const [copiedNotice, setCopiedNotice] = useState(false);

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

  function pronunciationFor(lang: 'en-GB' | 'en-US'): Phonetic | undefined {
    return (
      pronunciations.find((item) => String(item.language || '').toLowerCase() === lang.toLowerCase()) ||
      pronunciations.find((item) => (lang === 'en-GB' ? item.region === 'uk' : item.region === 'us'))
    );
  }

  function phoneticText(item?: Phonetic): string {
    const word = String(result?.word || '').trim().toLowerCase();
    const phonetic = String(item?.phonetic || '').trim();
    if (phonetic && phonetic.toLowerCase() !== word) return phonetic;
    const text = String(item?.text || '').trim();
    if (text && text.toLowerCase() !== word) return text;
    return '';
  }

  function audioUrlOf(item?: Phonetic): string {
    return String(item?.audioUrl || item?.audio || '').trim();
  }

  function hasAccentData(item?: Phonetic): boolean {
    return Boolean(phoneticText(item) || audioUrlOf(item));
  }

  const ukPronunciation = useMemo(() => {
    const item = pronunciationFor('en-GB');
    return hasAccentData(item) ? item : undefined;
  }, [pronunciations]);

  const usPronunciation = useMemo(() => {
    const item = pronunciationFor('en-US');
    return hasAccentData(item) ? item : undefined;
  }, [pronunciations]);

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

  function copyWordDefinition() {
    if (!result) return;
    const def = result.meanings?.[0]?.definitions?.[0]?.definition || '';
    const text = `${result.word} (${result.phonetic || ''}): ${def}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedNotice(true);
      setTimeout(() => {
        setCopiedNotice(false);
      }, 1800);
    });
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
      {/* Headword Plate: Serif title, phonetics, audio triggers */}
      <div className="pb-3 border-b border-border space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-[28px] font-semibold text-content font-heading tracking-tight leading-tight dark:text-[#f8f4ea]">
              {displayHeadword}
            </h2>

            {/* Phonetic & Accent Audio Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
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
                    'h-[26px] px-2 rounded-md border text-[11.5px] font-medium transition-all flex items-center gap-1 cursor-pointer font-mono',
                    playingKey === 'en-US'
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
                      : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                  )}
                  aria-pressed={playingKey === 'en-US'}
                  title="Listen (US)"
                >
                  <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>US {phoneticText(usPronunciation) ? `${phoneticText(usPronunciation)}` : ''}</span>
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
                    'h-[26px] px-2 rounded-md border text-[11.5px] font-medium transition-all flex items-center gap-1 cursor-pointer font-mono',
                    playingKey === 'en-GB'
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
                      : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                  )}
                  aria-pressed={playingKey === 'en-GB'}
                  title="Listen (UK)"
                >
                  <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>UK {phoneticText(ukPronunciation) ? `${phoneticText(ukPronunciation)}` : ''}</span>
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
                    'h-[26px] px-2 rounded-md border text-[11.5px] font-medium transition-all flex items-center gap-1 cursor-pointer font-mono',
                    playingKey === 'generic'
                      ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40'
                      : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                  )}
                  aria-pressed={playingKey === 'generic'}
                  title="Listen pronunciation"
                >
                  <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>{phoneticText(genericPronunciation) || 'Audio'}</span>
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

          <button
            type="button"
            onClick={copyWordDefinition}
            title="Copy definition"
            className="h-7 px-2 rounded-md bg-surface hover:bg-elevated text-content-secondary hover:text-content border border-border text-[11.5px] font-medium transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
          >
            <span>{copiedNotice ? '✓ Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Translation: Clean, inline text plate */}
      {result.translation?.translatedText ? (
        <div className="p-3 rounded-lg border border-border bg-surface flex items-baseline justify-between gap-3">
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
        </div>
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

      {/* Definitions & Senses */}
      {result.meanings?.length ? (
        <SenseMatrixCard meanings={result.meanings} onSelectWord={handleSearch} />
      ) : null}

      {/* Additional Examples */}
      {filteredExamples.length ? (
        <section className="space-y-2 pt-3 mt-1 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
              <IconQuote className="w-3.5 h-3.5 text-teal-600 dark:text-gold-200" />
              <span>Examples</span>
            </div>
            <span className="text-[10px] font-mono text-content-muted bg-muted/70 px-1.5 py-0.5 rounded">
              {filteredExamples.length}
            </span>
          </div>
          {filteredExamples.map((example, index) => {
            const listenKey = `example-${index}`;
            const isPlaying = playingKey === listenKey;
            return (
              <blockquote
                key={`${example.text}-${index}`}
                className="pl-3 py-2 pr-2 border-l-2 border-teal-500/50 dark:border-gold-300/40 bg-muted/30 rounded-r-md text-content-secondary italic text-[13.5px] leading-relaxed flex items-center justify-between gap-2"
              >
                <span className="not-italic text-content">“{example.text}”</span>
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
                    'h-[24px] px-2 rounded border text-[11px] flex-shrink-0 flex items-center gap-1 cursor-pointer transition-colors',
                    isPlaying
                      ? 'bg-teal-500/20 text-teal-700 dark:text-gold-100 border-teal-500/40 dark:border-gold-300/40'
                      : 'bg-surface text-content-secondary hover:text-content border-border',
                  )}
                  aria-pressed={isPlaying}
                  title="Listen to example"
                >
                  <IconSpeaker className="w-3 h-3 text-teal-600 dark:text-gold-200" />
                  <span>Listen</span>
                </button>
              </blockquote>
            );
          })}
        </section>
      ) : null}

      {/* Additional Synonyms & Antonyms */}
      {filteredSynonyms.length || filteredAntonyms.length ? (
        <section className="rounded-lg border border-border bg-surface/60 p-3 space-y-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
            <IconSparkles className="w-3.5 h-3.5 text-teal-600 dark:text-gold-200" />
            <span>Related vocabulary</span>
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

      {/* Phrase Fallback Explanation */}
      {result.phraseExplanation?.length ? (
        <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
          <div className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
            Phrase Explanation
          </div>
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
        </div>
      ) : null}

      {/* Lexical Profile Cards */}
      {extrasReady ? (
        <Suspense fallback={null}>
          <WordFamilyCard
            word={displayHeadword}
            family={result.lexicalProfile?.wordFamily}
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

          <CollocationsCard
            word={displayHeadword}
            collocations={result.lexicalProfile?.collocations}
            onSelectWord={handleSearch}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default WordLookupResult;
