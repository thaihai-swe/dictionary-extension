import React, { useEffect, useRef, useState } from 'react';
import { searchWord, stopAllAudio, useDictionaryQuery, useDictionaryResult } from '../composables/composable.dictionary';
import { useStorage } from '../composables/composable.storage';
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
    <div className="p-4 space-y-4 font-sans">
      <div className="space-y-2">
        <div className="relative flex items-center">
          <span className="absolute left-3 text-slate-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            ref={searchInputElement}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            type="text"
            placeholder="Lookup word or sentence..."
            className="w-full bg-dark-muted border border-dark-border rounded-xl pl-9 pr-28 py-2.5 text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-teal-500 transition-all shadow-sm font-sans"
          />

          {searchInput ? (
            <button
              type="button"
              onClick={clearSearch}
              title="Clear search text"
              className="absolute right-20 text-slate-400 hover:text-slate-200 p-1 cursor-pointer flex items-center justify-center"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={!searchInput || isLoading}
            className="absolute right-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            Lookup
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3 rounded-xl border border-dark-border bg-dark-surface animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-dark-border rounded w-1/3"></div>
            <div className="h-5 bg-dark-border rounded-full w-16"></div>
          </div>
          <div className="h-4 bg-dark-border rounded w-2/3"></div>
          <div className="h-3 bg-dark-border rounded w-1/2"></div>
          <div className="h-16 bg-dark-border rounded-xl"></div>
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <span>{error}</span>
        </div>
      ) : result ? (
        <WordLookupResult onSelectWord={handleSearch} />
      ) : null}
    </div>
  );
};

export default WordLookupView;
