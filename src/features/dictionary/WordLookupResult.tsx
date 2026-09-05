import React, { Suspense, useMemo } from 'react';
import {
  playPronunciation,
  startSpeechPractice,
  useDictionaryAudio,
  useDictionaryPractice,
  useDictionaryQuery,
  useDictionaryResult,
} from '@/composables/composable.dictionary';
import { AttributedItem, Phonetic } from '@/types';
import SenseMatrixCard from './SenseMatrixCard';
import MarkdownRenderer from '@/components/component.markdown-renderer';
import {
  CollocationsCard,
  LearnerMistakesCard,
  UsageNotesCard,
  WordFamilyCard,
  WordFormationCard,
} from '@/components/async-views';
import { cx } from '@/ui/cx';
import { IconCheck, IconChevronDown, IconCopy, IconMic, IconQuote, IconSparkles, IconSpeaker } from '@/components/icons';
import RelatedWords from '@/components/component.related-words';
import { showToast } from '@/composables/composable.toast';

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
  const { result, isEnriching } = useDictionaryResult();
  const query = useDictionaryQuery();
  const { playingKey } = useDictionaryAudio();
  const { practiceResult, isPracticing, supportsSpeechPractice } = useDictionaryPractice();
  const [hasCopied, setHasCopied] = React.useState(false);

  const displayHeadword = useMemo(() => {
    const entry = result;
    return String(entry?.originalText || query || entry?.word || '').trim();
  }, [result, query]);

  const phoneticsList = useMemo<Phonetic[]>(() => {
    const list = result?.phonetics || [];
    const seen = new Set<string>();
    return list.filter((item) => {
      const text = String(item.text || '').trim();
      const audio = String(item.audio || '').trim();
      const key = `${text}|${audio}|${item.region || ''}|${item.language || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(text || audio);
    });
  }, [result]);

  function phoneticText(item?: Phonetic): string {
    const word = String(result?.word || '').trim().toLowerCase();
    const text = String(item?.text || '').trim();
    if (text && text.toLowerCase() !== word) return text;
    return '';
  }

  function phoneticLabel(item: Phonetic): string {
    if (item.label) return item.label;
    if (item.region === 'uk' || item.language?.toLowerCase().includes('gb')) return 'UK';
    if (item.region === 'us' || item.language?.toLowerCase().includes('us')) return 'US';
    return item.region?.toUpperCase() || 'Audio';
  }

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

  function copyAsMarkdown() {
    if (!result) return;
    const ipa = phoneticsList[0] ? phoneticText(phoneticsList[0]) : '';
    const ipaStr = ipa ? ` \`/${ipa.replace(/^\/+|\/+$/g, '')}/\`` : '';

    let md = `### ${displayHeadword}${ipaStr}\n\n`;

    if (result.meanings && result.meanings.length > 0) {
      result.meanings.slice(0, 3).forEach((meaning) => {
        const pos = meaning.partOfSpeech ? `*(${meaning.partOfSpeech})* ` : '';
        const firstDef = meaning.definitions?.[0];
        if (firstDef?.definition) {
          md += `> ${pos}${firstDef.definition}\n`;
          if (firstDef.example) {
            md += `- *Example:* "${firstDef.example}"\n`;
          }
          md += `\n`;
        }
      });
    }

    if (result.translation) {
      md += `*Translation:* ${result.translation}\n`;
    }

    void navigator.clipboard.writeText(md.trim()).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 1800);
      showToast('Copied definition to clipboard');
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
      {/* Headword Plate: Clean title, phonetics, audio triggers */}
      <div className="pb-3 border-b border-border space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-2xl sm:text-[28px] font-semibold text-content font-heading tracking-tight leading-tight min-w-0">
                {displayHeadword}
              </h2>
              <div className="flex items-center gap-1.5 shrink-0 mt-1">
                <button
                  type="button"
                  onClick={copyAsMarkdown}
                  title="Copy as Markdown flashcard"
                  aria-label="Copy as Markdown flashcard"
                  className={cx(
                    'h-[22px] px-2 rounded-md border text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 select-none',
                    hasCopied
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-muted hover:bg-elevated border-border text-content-secondary hover:text-content',
                  )}
                >
                  {hasCopied ? (
                    <>
                      <IconCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <IconCopy className="w-3 h-3 text-content-muted" />
                      <span className="hidden sm:inline">Copy MD</span>
                    </>
                  )}
                </button>
                <span
                  className={cx(
                    'h-[18px] px-1.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 whitespace-nowrap',
                    isEnriching
                      ? 'bg-accent-subtle text-accent border border-accent/25'
                      : 'invisible border border-transparent',
                  )}
                  aria-live="polite"
                  aria-atomic="true"
                  aria-hidden={!isEnriching}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                  Enriching
                </span>
              </div>
            </div>

            {/* Phonetic & Accent Audio Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {phoneticsList.map((item, index) => {
                const listenKey = `phonetic-${index}-${item.region || item.language || 'audio'}`;
                const ipa = phoneticText(item);
                const lang = item.language || (item.region === 'uk' ? 'en-GB' : 'en-US');
                return (
                  <button
                    key={listenKey}
                    type="button"
                    onClick={() =>
                      playPronunciation({
                        text: displayHeadword,
                        audioUrl: item.audio,
                        language: lang,
                        key: listenKey,
                      })
                    }
                    className={cx(
                      'h-[26px] pl-1.5 pr-2.5 rounded-md border text-[11.5px] font-medium transition-all flex items-center gap-1.5 cursor-pointer font-mono shadow-2xs',
                      playingKey === listenKey
                        ? 'bg-accent-subtle text-accent border-accent/40 audio-playing-indicator'
                        : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                    )}
                    aria-pressed={playingKey === listenKey}
                    title={`Listen (${phoneticLabel(item)})`}
                  >
                    <span className="text-[9.5px] font-bold uppercase px-1 py-0.2 rounded bg-muted text-content-muted font-sans border border-border/60">
                      {phoneticLabel(item)}
                    </span>
                    <IconSpeaker className="w-3 h-3 text-accent" />
                    <span>{ipa ? `/${ipa.replace(/^\/+|\/+$/g, '')}/` : 'Audio'}</span>
                  </button>
                );
              })}

              {supportsSpeechPractice ? (
                <button
                  type="button"
                  onClick={() => startSpeechPractice(displayHeadword, 'en-US')}
                  className={cx(
                    'h-[26px] px-2.5 rounded-md border text-[11.5px] font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs',
                    isPracticing
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse'
                      : 'bg-surface hover:bg-elevated text-content-secondary hover:text-content border-border',
                  )}
                  aria-pressed={isPracticing}
                  title="Speech practice evaluator"
                >
                  <IconMic className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>{isPracticing ? 'Listening…' : 'Practice'}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {result.translation?.translatedText ? (
        <section className="p-3 rounded-lg border border-accent/25 bg-accent-subtle flex items-baseline justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-[11px] font-bold text-accent uppercase tracking-wider font-mono">
              Translation
            </span>
            <p className="text-[14.5px] text-content font-medium leading-relaxed">
              {result.translation.translatedText}
            </p>
          </div>
          <span className="text-[10px] text-content-muted flex-shrink-0 font-mono px-1.5 py-0.5 rounded bg-surface/70 border border-border/50">
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
                ? 'border-accent/30 bg-accent-subtle text-accent'
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
        <section className="p-3.5 rounded-lg border border-border bg-surface space-y-3 shadow-card">
          <SenseMatrixCard meanings={result.meanings} onSelectWord={handleSearch} />
        </section>
      ) : null}

      {filteredExamples.length ? (
        <section className="p-3.5 rounded-lg border border-border bg-surface space-y-2.5 shadow-card">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
            <IconQuote className="w-3.5 h-3.5 text-accent" />
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
                        ? 'bg-accent-subtle text-accent border-accent/40 audio-playing-indicator'
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
        <section className="p-3.5 rounded-lg border border-border bg-surface space-y-2 shadow-card">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-content-muted uppercase tracking-wider">
            <IconSparkles className="w-3.5 h-3.5 text-accent" />
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
        <section className="p-3.5 rounded-lg border border-border bg-surface space-y-2 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono text-accent">
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

      {result.lexicalProfile?.wordFamily
      || result.lexicalProfile?.collocations
      || result.lexicalProfile?.usageNotes
      || usageWarnings.length
      || result.lexicalProfile?.confusablePairs
      || formationText
      || formationPrefixes.length
      || formationSuffixes.length
      || result.lexicalProfile?.learnerMistakes ? (
        <details className="lexical-accordion rounded-lg border border-border bg-surface shadow-card">
          <summary className="px-3.5 py-2.5 text-[11px] font-bold text-content-muted uppercase tracking-wider flex items-center justify-between gap-2">
            <span>More lexical detail</span>
            <IconChevronDown className="w-3.5 h-3.5" />
          </summary>
          <div className="px-3.5 pb-3.5 space-y-3 border-t border-border pt-3">
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
                notes={result.lexicalProfile?.usageNotes}
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
          </div>
        </details>
      ) : null}
    </div>
  );
};

export default WordLookupResult;
