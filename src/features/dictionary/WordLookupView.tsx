import PresetChips from '@/components/component.preset-chips';
import SearchBar from '@/components/component.search-bar';
import ResultSkeleton from '@/components/component.result-skeleton';
import ErrorBanner from '@/components/component.error-banner';
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
          <ErrorBanner
            title="Lookup failed"
            message={error}
            onRetry={() => handleSearch()}
          />
        ) : result ? (
          <div aria-busy={isLoading || undefined}>
            <Suspense fallback={<ResultSkeleton variant="compact" />}>
              <WordLookupResult onSelectWord={handleSearch} contextSentence={initialContext} />
            </Suspense>
          </div>
        ) : isLoading ? (
          <ResultSkeleton variant="dictionary" />
        ) : !searchInput.trim() && !query.trim() ? (
          <PresetChips onSelect={handlePresetSelect} />
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(WordLookupView);
