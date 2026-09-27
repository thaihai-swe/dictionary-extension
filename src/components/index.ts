// Canonical public export barrel for shared presentation primitives
export { default as SearchBar, SearchBar as SearchBarComponent } from './component.search-bar';
export type { SearchBarProps } from './component.search-bar';

export { default as ContextSentence, ContextSentence as ContextSentenceComponent, highlightText } from './component.context-sentence';
export type { ContextSentenceProps } from './component.context-sentence';

export { default as CopyButton, CopyButton as CopyButtonComponent } from './component.copy-button';
export type { CopyButtonProps } from './component.copy-button';

export { default as AudioButton, AudioButton as AudioButtonComponent } from './component.audio-button';
export type { AudioButtonProps } from './component.audio-button';

export { default as ResultSkeleton, ResultSkeleton as ResultSkeletonComponent } from './component.result-skeleton';
export type { ResultSkeletonProps } from './component.result-skeleton';

export { default as ErrorBanner, ErrorBanner as ErrorBannerComponent } from './component.error-banner';
export type { ErrorBannerProps } from './component.error-banner';

export { default as SectionHeader, SectionHeader as SectionHeaderComponent } from './component.section-header';
export type { SectionHeaderProps } from './component.section-header';

export { default as PresetChips, PresetChips as PresetChipsComponent } from './component.preset-chips';
export { default as ExampleSentence, ExampleSentence as ExampleSentenceComponent } from './component.example-sentence';
export { default as LexicalProfileSection, LexicalProfileSection as LexicalProfileSectionComponent } from './component.lexical-profile';
export { default as AppHeader, AppHeader as AppHeaderComponent } from './component.app-header';
export { default as TabNavigation, TabNavigation as TabNavigationComponent } from './component.tab-navigation';
export { default as LookupPreferences, default as LookupPreferencesComponent } from './component.lookup-preferences';
export { default as TokenizedContext, TokenizedContext as TokenizedContextComponent } from './component.tokenized-context';
export { default as MarkdownRenderer } from './component.markdown-renderer';
export { default as WorkbenchContent } from './component.workbench-content';

export * from './icons';
export * from './async-views';
