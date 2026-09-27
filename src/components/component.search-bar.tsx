import React from 'react';
import { IconClose, IconSearch, IconSpinner } from './icons';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  ariaLabel?: string;
  actionLabel?: string;
  loadingLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onClear?: () => void;
  id?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type a word or sentence…',
  ariaLabel = 'Search',
  actionLabel = 'Search',
  loadingLabel = 'Searching…',
  isLoading = false,
  disabled = false,
  inputRef,
  onClear,
  id,
}) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !isLoading && !disabled) {
          onSubmit();
        }
      }}
      className="relative flex items-center w-full"
    >
      <span className="absolute left-3 text-content-muted pointer-events-none flex items-center justify-center">
        <IconSearch className="w-4 h-4" />
      </span>

      <input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="text"
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="ui-control w-full h-9.5 pl-9 pr-24 text-[13.5px] placeholder:text-content-muted font-sans rounded-lg shadow-2xs"
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            if (onClear) {
              onClear();
            } else {
              onChange('');
            }
          }}
          title="Clear search text"
          aria-label="Clear search text"
          className="absolute right-20 text-content-muted hover:text-content p-1 cursor-pointer flex items-center justify-center rounded-md hover:bg-muted transition-colors"
        >
          <IconClose className="w-3.5 h-3.5" />
        </button>
      ) : null}

      <button
        type="submit"
        disabled={!value.trim() || isLoading || disabled}
        className="ui-button-primary absolute right-1 h-7.5 px-3 rounded-md text-[12px] font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed select-none"
      >
        {isLoading ? <IconSpinner className="w-3 h-3 animate-spin" /> : null}
        <span>{isLoading ? loadingLabel : actionLabel}</span>
      </button>
    </form>
  );
};

export default SearchBar;
