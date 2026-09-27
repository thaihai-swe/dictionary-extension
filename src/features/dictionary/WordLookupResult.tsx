import ExampleSentence from '@/components/component.example-sentence';
import MarkdownRenderer from '@/components/component.markdown-renderer';
import RelatedWords from '@/components/component.related-words';
import AudioButton from '@/components/component.audio-button';
import CopyButton from '@/components/component.copy-button';
import ContextSentence from '@/components/component.context-sentence';
import LexicalProfileSection from '@/components/component.lexical-profile';
import { IconGlobe, IconMic } from '@/components/icons';
import {
  playPronunciation,
  startSpeechPractice,
  useDictionaryAudio,
  useDictionaryPractice,
  useDictionaryQuery,
  useDictionaryResult,
} from '@/composables/composable.dictionary';
import { useSetting } from '@/composables/composable.storage';
import { Phonetic } from '@/types';
import { cx } from '@/ui/cx';
import React, { useMemo } from 'react';
import LexicalDisclosure from './LexicalDisclosure';
import SenseMatrixCard from './SenseMatrixCard';
import SourcesDisclosure from './SourcesDisclosure';
import { collectSecondaryResultSections } from './result-sections';

interface WordLookupResultProps {
  onSelectWord?: (word: string) => void;
  contextSentence?: string;
}

export const WordLookupResult: React.FC<WordLookupResultProps> = ({ onSelectWord, contextSentence }) => {
  const { result, isEnriching } = useDictionaryResult();
  const query = useDictionaryQuery();
  const { playingKey } = useDictionaryAudio();
  const { practiceResult, isPracticing, supportsSpeechPractice } = useDictionaryPractice();
  const targetLang = useSetting('translateTargetLanguage');
  const enableLexicalProfile = useSetting('enableLexicalProfile');

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
    if (item.region === 'uk' || item.language?.toLowerCase().includes('gb')) return '🇬🇧 UK';
    if (item.region === 'us' || item.language?.toLowerCase().includes('us')) return '🇺🇸 US';
    return item.region?.toUpperCase() || 'Audio';
  }

  const standardMeanings = useMemo(
    () => result?.meanings?.filter((m) => (m.partOfSpeech || '').toLowerCase() !== 'slang') || [],
    [result?.meanings],
  );

  const slangMeanings = useMemo(
    () => result?.meanings?.filter((m) => (m.partOfSpeech || '').toLowerCase() === 'slang') || [],
    [result?.meanings],
  );

  const slangCount = useMemo(
    () => slangMeanings.reduce((acc, m) => acc + (m.definitions?.length || 0), 0),
    [slangMeanings],
  );

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

    void navigator.clipboard.writeText(md.trim());
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
    <div className="dictionary-result space-y-2">
      {/* Context Sentence Card (matches AI tab format, without edit controls) */}
      {showContextBanner ? (
        <ContextSentence
          sentence={pageContext}
          targetWord={displayHeadword}
          query={query}
        />
      ) : null}

      {/* Headword Hero Section with Translation */}
      <div className="word-hero rounded-xl border border-border/70 bg-surface shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-content font-heading tracking-tight leading-snug min-w-0 break-words">
                {displayHeadword}
              </h2>
              {isEnriching ? (
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-accent bg-accent-subtle px-1.5 py-0.5 rounded-full border border-accent/25"
                  aria-live="polite"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                  Enriching Lexical Data…
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <CopyButton
                onCopy={copyAsMarkdown}
                label="Copy MD"
                copiedLabel="Copied"
                toastMessage="Copied definition to clipboard"
                title="Copy definition as Markdown flashcard"
                className="h-6.5 text-[11.5px]"
              />
            </div>
          </div>

          {/* Phonetics & Voice Audio Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/50">
            {phoneticsList.map((item, index) => {
              const listenKey = `phonetic-${index}-${item.region || item.language || 'audio'}`;
              const ipa = phoneticText(item);
              const lang = item.language || (item.region === 'uk' ? 'en-GB' : 'en-US');

              return (
                <AudioButton
                  key={listenKey}
                  variant="chip"
                  text={displayHeadword}
                  audioUrl={item.audio}
                  language={lang}
                  audioKey={listenKey}
                  badge={phoneticLabel(item)}
                  ipa={ipa}
                  label="Audio"
                  title={`Listen pronunciation (${phoneticLabel(item)})`}
                />
              );
            })}

            {/* Speech Practice Voice Button */}
            {supportsSpeechPractice ? (
              <button
                type="button"
                onClick={() => startSpeechPractice(displayHeadword, 'en-US')}
                className={cx(
                  'h-6.5 px-2 rounded-md border text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95',
                  isPracticing
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse font-bold'
                    : 'bg-muted/40 hover:bg-elevated text-content-secondary hover:text-content border-border/80 hover:border-amber-500/40',
                )}
                aria-pressed={isPracticing}
                title="Practice speaking and get a speech similarity score"
              >
                <IconMic className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>{isPracticing ? 'Listening…' : 'Practice Pronunciation'}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Integrated Translation Row */}
        {result.translation?.translatedText ? (
          <div className="px-3.5 py-2 border-t border-accent/20 bg-accent/[0.03] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <IconGlobe className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-[10px] font-bold text-accent uppercase font-mono tracking-wider">Translation:</span>
              <span className="text-[13.5px] sm:text-[14px] text-content font-semibold truncate">
                {result.translation.translatedText}
              </span>
            </div>
            <span className="text-[10px] text-content-muted flex-shrink-0 font-mono px-1.5 py-0.5 rounded bg-surface border border-border/60 shadow-2xs">
              {result.translation.sourceBadges?.map((badge) => badge.label).join(' · ') || 'Google'}
            </span>
          </div>
        ) : null}
      </div>

      {/* Speech Practice Evaluation Feedback Banner */}
      {practiceResult ? (
        <div
          className={cx(
            'rounded-2xl border p-3.5 text-[13.5px] space-y-2 shadow-xs',
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
                    'px-2 py-0.5 rounded-lg text-[12px] font-mono font-medium border shadow-2xs',
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
      {standardMeanings.length ? (
        <SenseMatrixCard meanings={standardMeanings} />
      ) : null}

      {/* Phrase Explanation Fallback */}
      {result.phraseExplanation?.length ? (
        <section className="p-4 rounded-2xl border border-border/80 bg-surface shadow-xs space-y-2.5">
          <p className="text-[12px] font-bold uppercase tracking-wider font-mono text-accent">
            Phrase Explanation
          </p>
          {result.phraseExplanation.map((section, index) => (
            <div key={index} className="space-y-1.5">
              {section.title && index > 0 ? (
                <div className="font-bold text-[14px] text-content">{section.title}</div>
              ) : null}
              {section.markdown || section.text ? (
                <MarkdownRenderer content={section.text || ''} />
              ) : null}
              {section.items?.length ? (
                <ul className="space-y-1 text-reading-compact text-content list-disc pl-4">
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
                targetLang={targetLang}
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

      {slangMeanings.length ? (
        <LexicalDisclosure
          label="Slang"
          count={slangCount}
          defaultOpen={!standardMeanings.length}
        >
          <SenseMatrixCard meanings={slangMeanings} />
        </LexicalDisclosure>
      ) : null}

      {enableLexicalProfile !== false && result.lexicalProfile ? (
        <LexicalProfileSection
          profile={result.lexicalProfile}
          query={displayHeadword}
          collapsible
          onSelectWord={handleSearch}
        />
      ) : null}

      <SourcesDisclosure sources={result.sources || []} />
    </div>
  );
};

export default React.memo(WordLookupResult);
