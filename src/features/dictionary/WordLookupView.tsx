import PresetChips from '@/components/component.preset-chips';
import SearchBar from '@/components/component.search-bar';
import { abortActiveDictRequest, searchWord, stopAllAudio, useDictionaryQuery, useDictionaryResult } from '@/composables/composable.dictionary';
import { useSetting } from '@/composables/composable.storage';
import type { DemoPreset } from '@/shared/presets';
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';

const WordLookupResult = lazy(() => import('./WordLookupResult'));

interface WordLookupViewProps {
  initialQuery?: string;
  initialContext?: string;
  lookupRequestId?: string;
  autoFocus?: boolean;
  provider?: string;
  targetLang?: string;
}

export const WordLookupView: React.FC<WordLookupViewProps> = ({
  initialQuery,
  initialContext,
  lookupRequestId,
  autoFocus,
  provider,
  targetLang,
}) => {
  const { result, isLoading, error } = useDictionaryResult();
  const query = useDictionaryQuery();
  const configuredProvider = useSetting('dictionaryProvider');
  const configuredTargetLang = useSetting('translateTargetLanguage');
  const [searchInput, setSearchInput] = useState('');
  const searchInputElement = useRef<HTMLInputElement | null>(null);

  function getActiveProvider(): string {
    return provider || configuredProvider || 'wiktionary';
  }

  function getActiveLang(): string {
    return targetLang || configuredTargetLang || 'Vietnamese';
  }

  function runLookup(wordToSearch: string, attachedRequestId?: string) {
    const cleanTarget = wordToSearch.trim();
    if (!cleanTarget) return;
    setSearchInput(cleanTarget);
    searchWord(cleanTarget, getActiveProvider(), getActiveLang(), initialContext, attachedRequestId);
  }

  function handleSearch(wordToSearch?: string) {
    runLookup(wordToSearch || searchInput);
  }

  function handlePresetSelect(preset: DemoPreset) {
    runLookup(preset.query);
  }

  function clearSearch() {
    setSearchInput('');
    searchInputElement.current?.focus();
  }

  useEffect(() => {
    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') stopAllAudio();
    }
    window.addEventListener('keydown', handleEsc);
    if (autoFocus && searchInputElement.current) {
      searchInputElement.current.focus();
      if (searchInput) searchInputElement.current.select();
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const target = (initialQuery || searchInput || query || '').trim();
    if (target) runLookup(target, lookupRequestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, lookupRequestId, provider, targetLang, configuredProvider, configuredTargetLang]);

  useEffect(() => () => {
    abortActiveDictRequest();
  }, []);

  return (
    <div className="font-sans">
      <div className="workbench-search px-3.5 py-2 sticky top-0 z-20">
        <SearchBar
          id="dictionary-search"
          inputRef={searchInputElement}
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => handleSearch()}
          onClear={clearSearch}
          placeholder="Type a word, phrase, or sentence…"
          ariaLabel="Look up a word, phrase, or sentence"
          actionLabel="Look up"
          loadingLabel="Looking up…"
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Area */}
      <div className="workbench-results w-full px-3.5 pt-0 pb-2 space-y-2">
        {error ? (
          <div role="alert" className="p-4 rounded-2xl bg-rose-500/8 border border-rose-500/25 text-[15px] text-rose-700 dark:text-rose-400 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
              <span>Lookup failed</span>
            </div>
            <p className="text-[14.5px] text-content-secondary leading-relaxed pl-4">
              {error}
            </p>
            <div className="pl-4 pt-1">
              <button
                type="button"
                onClick={() => handleSearch()}
                className="btn-accent h-7 px-3 text-[13px] font-bold cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : result ? (
          <div aria-busy={isLoading || undefined}>
            <Suspense fallback={
            <div className="p-4 space-y-3.5 rounded-2xl border border-border bg-surface shadow-card" aria-busy="true">
                <div className="h-8 skeleton-shimmer rounded-lg w-2/5" />
                <div className="h-5 skeleton-shimmer rounded-md w-3/5" />
                <div className="h-20 skeleton-shimmer rounded-xl" />
              </div>
            }>
              <WordLookupResult onSelectWord={handleSearch} contextSentence={initialContext} />
            </Suspense>
          </div>
        ) : isLoading ? (
          /* Realistic Loading Skeleton */
          <div className="p-5 space-y-4 rounded-2xl border border-border bg-surface shadow-card" aria-busy="true" aria-live="polite">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="h-8 skeleton-shimmer rounded-lg w-2/5"></div>
              <div className="h-6 skeleton-shimmer rounded-full w-24"></div>
            </div>
            <div className="flex gap-2.5">
              <div className="h-8 skeleton-shimmer rounded-lg w-24"></div>
              <div className="h-8 skeleton-shimmer rounded-lg w-28"></div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 skeleton-shimmer rounded w-5/6"></div>
              <div className="h-4 skeleton-shimmer rounded w-4/6"></div>
              <div className="h-4 skeleton-shimmer rounded w-3/6"></div>
            </div>
            <div className="h-24 skeleton-shimmer rounded-xl mt-2"></div>
          </div>
        ) : !searchInput.trim() && !query.trim() ? (
          <PresetChips onSelect={handlePresetSelect} />
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(WordLookupView);
