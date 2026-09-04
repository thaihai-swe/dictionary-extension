import React, { useEffect, useRef, useState } from 'react';
import { searchWord, stopAllAudio, useDictionaryQuery, useDictionaryResult } from '../composables/composable.dictionary';
import { useStorage } from '../composables/composable.storage';
import { IconClose, IconSearch } from './icons';
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
    <div className="px-4 py-3 space-y-3.5 font-sans">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-content-muted pointer-events-none">
          <IconSearch className="w-3.5 h-3.5" />
        </span>
        <input
          ref={searchInputElement}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          type="text"
          placeholder="Look up a word or sentence…"
          className="w-full h-[38px] bg-surface border border-border rounded-lg pl-9 pr-24 text-[13px] text-content placeholder:text-content-muted outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 transition-all font-sans"
        />

        {searchInput ? (
          <button
            type="button"
            onClick={clearSearch}
            title="Clear search text"
            className="absolute right-[4.75rem] text-content-muted hover:text-content p-1 cursor-pointer flex items-center justify-center"
          >
            <IconClose className="w-3.5 h-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => handleSearch()}
          disabled={!searchInput || isLoading}
          className="absolute right-1.5 h-7 px-3 rounded-md bg-teal-700 hover:bg-teal-600 dark:bg-gold-400 dark:hover:bg-gold-300 dark:text-neutral-950 active:scale-95 text-white text-[12px] font-semibold transition-all disabled:opacity-50 cursor-pointer"
        >
          Lookup
        </button>
      </div>

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
  );
};

export default WordLookupView;
