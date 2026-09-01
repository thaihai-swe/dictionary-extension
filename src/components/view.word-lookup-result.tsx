import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  playPronunciation,
  startSpeechPractice,
  useDictionaryAudio,
  useDictionaryPractice,
  useDictionaryQuery,
  useDictionaryResult,
} from '../composables/composable.dictionary';
import { Phonetic } from '../types';
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

interface WordLookupResultProps {
  onSelectWord?: (word: string) => void;
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

  function accentLabel(item: Phonetic | undefined, accent: 'UK' | 'US' | ''): string {
    const action = audioUrlOf(item) ? 'Listen' : 'Speak';
    return accent ? `🔊 ${action} (${accent})` : `🔊 ${action}`;
  }

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
      }, 2000);
    });
  }

  if (!result) return null;

  return (
    <div className="space-y-4">
      <div className="pb-3.5 border-b border-dark-border/60 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight font-heading">
              {displayHeadword}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {ukPronunciation ? (
              <div className="flex items-center gap-1">
                {phoneticText(ukPronunciation) ? (
                  <span className="text-[11px] font-mono font-bold text-teal-400">
                    {phoneticText(ukPronunciation)} (UK)
                  </span>
                ) : null}
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
                    'px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 font-mono',
                    playingKey === 'en-GB'
                      ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                      : 'bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 border-dark-border',
                  )}
                  aria-pressed={playingKey === 'en-GB'}
                  title={accentLabel(ukPronunciation, 'UK')}
                >
                  <span>{accentLabel(ukPronunciation, 'UK')}</span>
                </button>
              </div>
            ) : null}

            {usPronunciation ? (
              <div className="flex items-center gap-1">
                {phoneticText(usPronunciation) ? (
                  <span className="text-[11px] font-mono font-bold text-teal-400">
                    {phoneticText(usPronunciation)} (US)
                  </span>
                ) : null}
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
                    'px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 font-mono',
                    playingKey === 'en-US'
                      ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                      : 'bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 border-dark-border',
                  )}
                  aria-pressed={playingKey === 'en-US'}
                  title={accentLabel(usPronunciation, 'US')}
                >
                  <span>{accentLabel(usPronunciation, 'US')}</span>
                </button>
              </div>
            ) : null}

            {genericPronunciation ? (
              <div className="flex items-center gap-1">
                {phoneticText(genericPronunciation) ? (
                  <span className="text-[11px] font-mono font-bold text-teal-400">
                    {phoneticText(genericPronunciation)}
                  </span>
                ) : null}
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
                    'px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 font-mono',
                    playingKey === 'generic'
                      ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                      : 'bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 border-dark-border',
                  )}
                  aria-pressed={playingKey === 'generic'}
                  title={accentLabel(genericPronunciation, '')}
                >
                  <span>{accentLabel(genericPronunciation, '')}</span>
                </button>
              </div>
            ) : null}

            {supportsSpeechPractice ? (
              <button
                type="button"
                onClick={() => startSpeechPractice(displayHeadword, 'en-US')}
                className={cx(
                  'px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95',
                  isPracticing
                    ? 'bg-amber-500/25 text-amber-200 border-amber-500/50'
                    : 'bg-dark-muted hover:bg-amber-500/20 hover:text-amber-300 text-slate-200 border-dark-border',
                )}
                aria-pressed={isPracticing}
                title="Practice pronunciation"
              >
                <span>{isPracticing ? 'Listening…' : '🎙️ Practice'}</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">
                Practice needs Chrome speech recognition.
              </span>
            )}

            <button
              type="button"
              onClick={copyWordDefinition}
              title="Copy definition"
              className="p-1.5 rounded-lg bg-dark-muted hover:bg-dark-border text-slate-300 hover:text-white border border-dark-border text-xs transition-colors cursor-pointer active:scale-95"
            >
              {copiedNotice ? '✓' : '📋'}
            </button>
          </div>
        </div>
      </div>

      {result.translation?.translatedText ? (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-teal-300 uppercase tracking-wider">
              <span>🌐</span>
              <span>Translation</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              {result.translation.sourceBadges?.map((badge) => badge.label).join(' + ') ||
                'Google Translate'}
            </span>
          </div>
          <p className="text-sm text-slate-100 leading-relaxed font-medium">
            {result.translation.translatedText}
          </p>
        </div>
      ) : null}

      {practiceResult ? (
        <div
          className={cx(
            'rounded-xl border px-3 py-2 text-xs font-semibold space-y-1.5',
            practiceResult.grade === 'excellent'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : practiceResult.grade === 'good'
                ? 'border-teal-500/40 bg-teal-500/10 text-teal-300'
                : practiceResult.grade === 'almost'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300',
          )}
        >
          <div>
            {practiceResult.score}% · {practiceResult.gradeLabel}
            {practiceResult.spoken ? <span> · heard “{practiceResult.spoken}”</span> : null}
          </div>
          {practiceResult.details && practiceResult.details.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {practiceResult.details.map((detail, index) => (
                <span
                  key={`${detail.word}-${index}`}
                  className={cx(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                    detail.matched
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : detail.closeMatch
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30',
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
        <SenseMatrixCard meanings={result.meanings} onSelectWord={handleSearch} />
      ) : null}

      {result.examples?.length ? (
        <div className="space-y-2">
          <div className="text-[11px] font-extrabold text-teal-400 uppercase tracking-wider">
            💬 Examples
          </div>
          {result.examples.map((example, index) => {
            const listenKey = `example-${index}`;
            const isPlaying = playingKey === listenKey;
            return (
              <blockquote
                key={`${example.text}-${index}`}
                className="pl-3.5 py-2 pr-3 border-l-2 border-teal-500/70 bg-teal-500/5 rounded-r-lg text-slate-200 italic text-sm flex items-center justify-between gap-3"
              >
                <span>
                  "{example.text}"
                  {example.source ? (
                    <span className="not-italic text-[10px] text-slate-400 ml-2">
                      {example.source}
                    </span>
                  ) : null}
                </span>
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
                    'px-2.5 py-1 rounded border text-[10px] not-italic font-semibold cursor-pointer',
                    isPlaying
                      ? 'bg-teal-500/25 text-teal-200 border-teal-500/50'
                      : 'bg-dark-muted hover:bg-dark-border text-slate-200 border-dark-border',
                  )}
                  aria-pressed={isPlaying}
                >
                  🔊 Listen
                </button>
              </blockquote>
            );
          })}
        </div>
      ) : null}

      {result.synonyms?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">
            Synonyms:
          </span>
          {result.synonyms.map((item) => (
            <button
              key={item.text}
              type="button"
              onClick={() => handleSearch(item.text)}
              className="px-3 py-1 rounded-full bg-dark-muted hover:bg-teal-500/20 hover:text-teal-300 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              {item.text}
            </button>
          ))}
        </div>
      ) : null}

      {result.antonyms?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-rose-400/80 font-bold uppercase tracking-wider mr-1">
            Antonyms:
          </span>
          {result.antonyms.map((item) => (
            <button
              key={item.text}
              type="button"
              onClick={() => handleSearch(item.text)}
              className="px-3 py-1 rounded-full bg-dark-muted hover:bg-rose-500/20 hover:text-rose-400 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              {item.text}
            </button>
          ))}
        </div>
      ) : null}

      {result.phraseExplanation?.length ? (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-wider">
              💡 Phrase explanation
            </div>
            {result.phraseExplanation[0]?.source ? (
              <span className="px-2 py-0.5 rounded-full bg-dark-muted border border-dark-border text-[10px] text-slate-300 font-semibold">
                {result.phraseExplanation[0].source}
              </span>
            ) : null}
          </div>
          {result.phraseExplanation.map((section, index) => (
            <div key={index} className="space-y-2">
              {section.title && index > 0 ? (
                <div className="font-bold text-xs text-indigo-200">{section.title}</div>
              ) : null}
              {section.markdown || section.text ? (
                <MarkdownRenderer content={section.text || ''} />
              ) : null}
              {section.items?.length ? (
                <ul className="space-y-1 text-sm text-slate-100 list-disc pl-4">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

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
