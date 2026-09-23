import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { abortActiveDictRequest, searchWord, stopAllAudio, useDictionaryQuery, useDictionaryResult } from '@/composables/composable.dictionary';
import { useSetting } from '@/composables/composable.storage';
import { IconClose, IconSearch, IconSpinner } from '@/components/icons';
import PresetChips from '@/components/component.preset-chips';
import type { DemoPreset } from '@/shared/presets';

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
      <div className="workbench-search px-4 py-4 sticky top-0 z-20">
        <label htmlFor="dictionary-search" className="workbench-search-label">LOOK SOMETHING UP</label>
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0 flex items-center group">
            <IconSearch className="w-4 h-4 text-content-muted absolute left-3.5 pointer-events-none group-focus-within:text-accent transition-colors" />
            <input
              id="dictionary-search"
              ref={searchInputElement}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              type="text"
              placeholder="Type a word, phrase, or sentence…"
              aria-label="Look up a word, phrase, or sentence"
              className="ui-control workbench-search-input w-full h-11 pl-10 pr-20 text-[15px] placeholder:text-content-muted"
            />

            {searchInput ? (
              <button
                type="button"
                onClick={clearSearch}
                title="Clear search text"
                aria-label="Clear search text"
                className="absolute right-3 text-content-muted hover:text-content p-1 cursor-pointer flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex absolute right-3 px-1.5 py-0.5 rounded-md text-[11.5px] font-mono text-content-muted/70 border border-border/70 bg-surface select-none pointer-events-none shadow-2xs">
                ↵ Enter
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={!searchInput.trim() || isLoading}
            className="ui-button-primary h-11 px-3 sm:px-4 text-[13px] font-bold cursor-pointer flex items-center gap-1.5 shrink-0 disabled:pointer-events-none"
          >
            {isLoading ? (
              <IconSpinner className="w-4 h-4" />
            ) : (
              <span>Lookup</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="workbench-results p-4 space-y-4">
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
              <div className="p-4 space-y-3.5 rounded-2xl border border-border/80 bg-surface shadow-xs" aria-busy="true">
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
          <div className="p-5 space-y-4 rounded-2xl border border-border/80 bg-surface shadow-xs" aria-busy="true" aria-live="polite">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
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
