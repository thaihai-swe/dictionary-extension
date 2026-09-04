import React, { useEffect, useRef, useState } from 'react';
import { searchWord, stopAllAudio, useDictionaryQuery, useDictionaryResult } from '../composables/composable.dictionary';
import { useStorage } from '../composables/composable.storage';
import { IconClose } from './icons';
import WordLookupResult from './view.word-lookup-result';

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
  const { settings } = useStorage();
  const [searchInput, setSearchInput] = useState('');
  const searchInputElement = useRef<HTMLInputElement | null>(null);

  function getActiveProvider(): string {
    return provider || settings.dictionaryProvider || 'free_dictionary';
  }

  function getActiveLang(): string {
    return targetLang || settings.translateTargetLanguage || 'Vietnamese';
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
  }, [initialQuery, lookupRequestId, provider, targetLang, settings.dictionaryProvider, settings.translateTargetLanguage]);

  return (
    <div className="font-sans">
      {/* Search Bar matching demo .popup-search-bar */}
      <div className="flex gap-2 p-3 bg-muted/30 border-b border-border">
        <div className="relative flex-1 flex items-center">
          <input
            ref={searchInputElement}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            type="text"
            placeholder="Look up a word or sentence…"
            className="w-full h-[38px] bg-surface border border-border rounded-md px-3 pr-8 text-[13.5px] text-content placeholder:text-content-muted outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 transition-all font-sans"
          />

          {searchInput ? (
            <button
              type="button"
              onClick={clearSearch}
              title="Clear search text"
              className="absolute right-2 text-content-muted hover:text-content p-1 cursor-pointer flex items-center justify-center"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={!searchInput || isLoading}
          className="h-[38px] px-4 rounded-md bg-teal-700 hover:bg-teal-600 dark:bg-gold-400 dark:hover:bg-gold-300 dark:text-neutral-950 active:scale-95 text-white text-[13px] font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          Lookup
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        {isLoading ? (
          <div className="p-4 space-y-3 rounded-xl border border-border bg-surface animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-7 bg-muted rounded w-1/3"></div>
              <div className="h-5 bg-muted rounded-full w-16"></div>
            </div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg bg-rose-500/8 border border-rose-500/25 text-[13px] text-rose-700 dark:text-rose-400 flex items-start gap-2">
            <span className="mt-0.5 text-rose-500" aria-hidden="true">●</span>
            <span>{error}</span>
          </div>
        ) : result ? (
          <WordLookupResult onSelectWord={handleSearch} />
        ) : null}
      </div>
    </div>
  );
};

export default WordLookupView;
