import {
  CollocationsCard,
  LearnerMistakesCard,
  UsageNotesCard,
  WordFamilyCard,
  WordFormationCard,
} from '@/components/async-views';
import ExampleSentence from '@/components/component.example-sentence';
import MarkdownRenderer from '@/components/component.markdown-renderer';
import RelatedWords from '@/components/component.related-words';
import { IconCheck, IconCopy, IconMic, IconSpeaker } from '@/components/icons';
import {
  playPronunciation,
  startSpeechPractice,
  useDictionaryAudio,
  useDictionaryPractice,
  useDictionaryQuery,
  useDictionaryResult,
} from '@/composables/composable.dictionary';
import { useStorage } from '@/composables/composable.storage';
import { showToast } from '@/composables/composable.toast';
import { Phonetic } from '@/types';
import { cx } from '@/ui/cx';
import React, { Suspense, useMemo } from 'react';
import SenseMatrixCard from './SenseMatrixCard';
import { collectSecondaryResultSections } from './result-sections';
import LexicalDisclosure from './LexicalDisclosure';
import SourcesDisclosure from './SourcesDisclosure';

interface WordLookupResultProps {
  onSelectWord?: (word: string) => void;
  contextSentence?: string;
}

export const WordLookupResult: React.FC<WordLookupResultProps> = ({ onSelectWord, contextSentence }) => {
  const { result, isEnriching } = useDictionaryResult();
  const query = useDictionaryQuery();
  const { playingKey } = useDictionaryAudio();
  const { practiceResult, isPracticing, supportsSpeechPractice } = useDictionaryPractice();
  const { settings } = useStorage();
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
      md += `*Translation:* ${result.translation.translatedText || result.translation}\n`;
    }

    void navigator.clipboard.writeText(md.trim()).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 1800);
      showToast('Copied definition to clipboard');
    });
  }

  const { examples: filteredExamples, synonyms: filteredSynonyms, antonyms: filteredAntonyms } = useMemo(
    () => collectSecondaryResultSections(result),
    [result],
  );

  if (!result) return null;

  const pageContext = String(contextSentence || '').replace(/\s+/g, ' ').trim();
  const showContextBanner = Boolean(
    pageContext && pageContext.toLowerCase() !== displayHeadword.toLowerCase(),
  );
  return (
    <div className="space-y-3.5">
      {/* Headword Hero Section */}
      <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-sm shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-content font-heading tracking-tight leading-tight min-w-0 break-words">
              {displayHeadword}
            </h2>
            {isEnriching ? (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono uppercase tracking-wider text-accent bg-accent-subtle px-2 py-0.5 rounded-full border border-accent/25"
                aria-live="polite"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                Enriching Lexical Data…
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={copyAsMarkdown}
              title="Copy definition as Markdown flashcard"
              aria-label="Copy definition as Markdown flashcard"
              className={cx(
                'h-8 px-2.5 rounded-xl border text-[12.5px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 select-none',
                hasCopied
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'bg-muted/60 hover:bg-elevated border-border/80 text-content-secondary hover:text-content',
              )}
            >
              {hasCopied ? (
                <>
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <IconCopy className="w-3.5 h-3.5 text-content-muted" />
                  <span className="hidden sm:inline">Copy MD</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Phonetics & Voice Audio Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
          {phoneticsList.map((item, index) => {
            const listenKey = `phonetic-${index}-${item.region || item.language || 'audio'}`;
            const ipa = phoneticText(item);
            const lang = item.language || (item.region === 'uk' ? 'en-GB' : 'en-US');
            const isPlaying = playingKey === listenKey;

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
                  'h-8 pl-2 pr-3 py-1 rounded-xl border font-medium transition-all flex items-center gap-2 cursor-pointer shadow-2xs group active:scale-95',
                  isPlaying
                    ? 'bg-accent text-accent-foreground border-accent font-bold audio-playing-indicator'
                    : 'bg-muted/40 hover:bg-accent-subtle hover:border-accent/40 text-content-secondary hover:text-content border-border/80',
                )}
                aria-pressed={isPlaying}
                title={`Listen pronunciation (${phoneticLabel(item)})`}
              >
                <span className={cx(
                  'text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md font-mono transition-colors',
                  isPlaying
                    ? 'bg-paper/20 text-accent-foreground'
                    : 'bg-surface text-content-muted border border-border/60 group-hover:text-accent',
                )}>
                  {phoneticLabel(item)}
                </span>
                {isPlaying ? (
                  <span className="soundwave-bars text-accent-foreground">
                    <span className="soundwave-bar" />
                    <span className="soundwave-bar" />
                    <span className="soundwave-bar" />
                  </span>
                ) : (
                  <IconSpeaker className="w-3.5 h-3.5 text-accent shrink-0 group-hover:scale-110 transition-transform" />
                )}
                <span className={cx(
                  'font-mono text-[13.5px] leading-none tracking-wide font-medium',
                  isPlaying ? 'text-accent-foreground' : 'text-content',
                )}>
                  {ipa ? `/${ipa.replace(/^\/+|\/+$/g, '')}/` : 'Audio'}
                </span>
              </button>
            );
          })}

          {/* Speech Practice Voice Button */}
          {supportsSpeechPractice ? (
            <button
              type="button"
              onClick={() => startSpeechPractice(displayHeadword, 'en-US')}
              className={cx(
                'h-8 px-3 rounded-xl border text-[11.5px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95',
                isPracticing
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse font-bold'
                  : 'bg-muted/40 hover:bg-elevated text-content-secondary hover:text-content border-border/80 hover:border-amber-500/40',
              )}
              aria-pressed={isPracticing}
              title="Practice speaking and get a speech similarity score"
            >
              <IconMic className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{isPracticing ? 'Listening…' : 'Practice Pronunciation'}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Page Selection Context Banner */}
      {showContextBanner ? (
        <section className="p-3.5 rounded-2xl border border-border/80 bg-surface/80 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-content-muted">
            Selection Context
          </span>
          <p className="font-serif text-[14.5px] text-content leading-6">
            {pageContext}
          </p>
        </section>
      ) : null}

      {/* Bilingual Translation Banner */}
      {result.translation?.translatedText ? (
        <section className="p-3.5 rounded-2xl border border-border/80 bg-gradient-to-r from-accent-subtle/50 to-transparent flex items-baseline justify-between gap-3 shadow-xs">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono">
              Translation
            </span>
            <p className="font-serif text-[16px] text-content font-semibold leading-6 break-words">
              {result.translation.translatedText}
            </p>
          </div>
          <span className="text-[10px] text-content-muted flex-shrink-0 font-mono px-2 py-0.5 rounded-md bg-surface border border-border/60 shadow-2xs">
            {result.translation.sourceBadges?.map((b) => b.label).join(' · ') || 'Google'}
          </span>
        </section>
      ) : null}

      {/* Speech Practice Evaluation Feedback Banner */}
      {practiceResult ? (
        <div
          className={cx(
            'rounded-2xl border p-3.5 text-[12.5px] space-y-2 shadow-xs',
            practiceResult.grade === 'excellent'
              ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200'
              : practiceResult.grade === 'good'
                ? 'border-accent/30 bg-accent-subtle text-accent'
                : practiceResult.grade === 'almost'
                  ? 'border-amber-500/30 bg-amber-500/8 text-amber-800 dark:text-amber-200'
                  : 'border-rose-500/30 bg-rose-500/8 text-rose-800 dark:text-rose-200',
          )}
        >
          <div className="flex items-center justify-between font-bold text-sm">
            <span>Score: {practiceResult.score}% · {practiceResult.gradeLabel}</span>
            {practiceResult.spoken ? (
              <span className="text-xs font-normal opacity-85 font-mono">
                Heard: “{practiceResult.spoken}”
              </span>
            ) : null}
          </div>
          {practiceResult.details && practiceResult.details.length > 1 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {practiceResult.details.map((detail, index) => (
                <span
                  key={`${detail.word}-${index}`}
                  className={cx(
                    'px-2 py-0.5 rounded-lg text-[11px] font-mono font-medium border shadow-2xs',
                    detail.matched
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold'
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

      {/* Main Definitions (Sense Matrix Card) */}
      {result.meanings?.length ? (
        <SenseMatrixCard meanings={result.meanings} />
      ) : null}

      {/* Phrase Explanation Fallback */}
      {result.phraseExplanation?.length ? (
        <section className="p-4 rounded-2xl border border-border/80 bg-surface shadow-xs space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono text-accent">
            Phrase Explanation
          </p>
          {result.phraseExplanation.map((section, index) => (
            <div key={index} className="space-y-1.5">
              {section.title && index > 0 ? (
                <div className="font-bold text-[13px] text-content">{section.title}</div>
              ) : null}
              {section.markdown || section.text ? (
                <MarkdownRenderer content={section.text || ''} />
              ) : null}
              {section.items?.length ? (
                <ul className="space-y-1 text-[13.5px] text-content list-disc pl-4">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {/* Independent secondary disclosures */}
      {filteredExamples.length ? (
        <LexicalDisclosure label="Examples" count={filteredExamples.length}>
          {filteredExamples.map((example, index) => {
            const listenKey = `example-${index}`;
            return (
              <ExampleSentence
                key={`${example.text}-${index}`}
                english={example.text}
                translation={example.translation}
                targetLang={settings.translateTargetLanguage}
                isPlaying={playingKey === listenKey}
                onListen={() =>
                  playPronunciation({
                    text: example.text,
                    language: 'en-US',
                    key: listenKey,
                  })
                }
              />
            );
          })}
        </LexicalDisclosure>
      ) : null}

      {filteredSynonyms.length ? (
        <LexicalDisclosure label="Synonyms" count={filteredSynonyms.length}>
          <RelatedWords
            label="Synonyms"
            tone="synonym"
            words={filteredSynonyms.map((s) => s.text)}
            onSelectWord={handleSearch}
          />
        </LexicalDisclosure>
      ) : null}

      {filteredAntonyms.length ? (
        <LexicalDisclosure label="Antonyms" count={filteredAntonyms.length}>
          <RelatedWords
            label="Antonyms"
            tone="antonym"
            words={filteredAntonyms.map((a) => a.text)}
            onSelectWord={handleSearch}
          />
        </LexicalDisclosure>
      ) : null}

      {settings.enableLexicalProfile !== false && result.lexicalProfile?.wordFamily ? (
        <LexicalDisclosure label="Word family">
          <Suspense fallback={null}>
            <WordFamilyCard
              word={displayHeadword}
              family={result.lexicalProfile.wordFamily}
              onSelectWord={handleSearch}
            />
          </Suspense>
        </LexicalDisclosure>
      ) : null}

      {settings.enableLexicalProfile !== false && result.lexicalProfile?.collocations ? (
        <LexicalDisclosure label="Collocations">
          <Suspense fallback={null}>
            <CollocationsCard
              word={displayHeadword}
              collocations={result.lexicalProfile.collocations}
              onSelectWord={handleSearch}
            />
          </Suspense>
        </LexicalDisclosure>
      ) : null}

      {settings.enableLexicalProfile !== false && (formationText || formationPrefixes.length || formationSuffixes.length) ? (
        <LexicalDisclosure label="Word formation">
          <Suspense fallback={null}>
            <WordFormationCard
              formation={formationText}
              prefixes={formationPrefixes}
              suffixes={formationSuffixes}
            />
          </Suspense>
        </LexicalDisclosure>
      ) : null}

      {settings.enableLexicalProfile !== false && (result.lexicalProfile?.usageNotes || usageWarnings.length || result.lexicalProfile?.confusablePairs) ? (
        <LexicalDisclosure label="Usage and nuance">
          <Suspense fallback={null}>
            <UsageNotesCard
              notes={result.lexicalProfile?.usageNotes}
              warnings={usageWarnings}
              pairs={result.lexicalProfile?.confusablePairs}
            />
          </Suspense>
        </LexicalDisclosure>
      ) : null}

      {settings.enableLexicalProfile !== false && result.lexicalProfile?.learnerMistakes?.length ? (
        <LexicalDisclosure label="Learner mistakes" count={result.lexicalProfile.learnerMistakes.length}>
          <Suspense fallback={null}>
            <LearnerMistakesCard mistakes={result.lexicalProfile.learnerMistakes} />
          </Suspense>
        </LexicalDisclosure>
      ) : null}

      <SourcesDisclosure sources={result.sources || []} />
    </div>
  );
};

export default WordLookupResult;
