import defaultPrompt from './default.md?raw';
import contextPrompt from './context.md?raw';
import grammarPrompt from './grammar.md?raw';
import comparePrompt from './compare.md?raw';
import rephrasePrompt from './rephrase.md?raw';
import sentencePrompt from './sentence.md?raw';
import phraseExplorerPrompt from './phrase-explorer.md?raw';
import phraseFallbackPrompt from './phrase-fallback.md?raw';
import englishRefinePrompt from './English Refine.md?raw';

import languagePolicyPartial from './shared/language-policy.md?raw';
import bilingualExampleShapePartial from './shared/bilingual-example-shape.md?raw';
import markdownL3Partial from './shared/markdown-l3.md?raw';
import lexicalProfileHeadingBanPartial from './shared/lexical-profile-heading-ban.md?raw';

export const PROMPT_LANGUAGE_POLICY = String(languagePolicyPartial || '').trim();
export const BILINGUAL_EXAMPLE_SHAPE = String(bilingualExampleShapePartial || '').trim();
export const MARKDOWN_L3 = String(markdownL3Partial || '').trim();
export const LEXICAL_PROFILE_HEADING_BAN = String(lexicalProfileHeadingBanPartial || '').trim();

export const SHARED_PROMPT_PARTIALS: Record<string, string> = {
  languagePolicy: PROMPT_LANGUAGE_POLICY,
  bilingualExampleShape: BILINGUAL_EXAMPLE_SHAPE,
  markdownL3: MARKDOWN_L3,
  lexicalProfileHeadingBan: LEXICAL_PROFILE_HEADING_BAN,
};

export const DEFAULT_AI_PROMPT_TEMPLATE = String(defaultPrompt || '').trim();
export const DEFAULT_AI_CONTEXT_PROMPT_TEMPLATE = String(contextPrompt || '').trim();
export const DEFAULT_AI_GRAMMAR_PROMPT_TEMPLATE = String(grammarPrompt || '').trim();
export const DEFAULT_AI_COMPARE_PROMPT_TEMPLATE = String(comparePrompt || '').trim();
export const DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE = String(rephrasePrompt || '').trim();
export const DEFAULT_AI_SENTENCE_PROMPT_TEMPLATE = String(sentencePrompt || '').trim();
export const DEFAULT_AI_PHRASE_EXPLORER_PROMPT_TEMPLATE = String(phraseExplorerPrompt || '').trim();
export const DEFAULT_AI_PHRASE_FALLBACK_PROMPT_TEMPLATE = String(phraseFallbackPrompt || '').trim();
export const DEFAULT_AI_REWRITE_PROMPT_TEMPLATE = String(englishRefinePrompt || '').trim();

export const DEFAULT_AI_PROMPTS = {
  aiPromptTemplate: DEFAULT_AI_PROMPT_TEMPLATE,
  aiDefaultPromptTemplate: DEFAULT_AI_PROMPT_TEMPLATE,
  aiContextPromptTemplate: DEFAULT_AI_CONTEXT_PROMPT_TEMPLATE,
  aiGrammarPromptTemplate: DEFAULT_AI_GRAMMAR_PROMPT_TEMPLATE,
  aiSentencePromptTemplate: DEFAULT_AI_SENTENCE_PROMPT_TEMPLATE,
  aiPhraseExplorerPromptTemplate: DEFAULT_AI_PHRASE_EXPLORER_PROMPT_TEMPLATE,
  aiComparePromptTemplate: DEFAULT_AI_COMPARE_PROMPT_TEMPLATE,
  aiRephrasePromptTemplate: DEFAULT_AI_REPHRASE_PROMPT_TEMPLATE,
  aiRewritePromptTemplate: DEFAULT_AI_REWRITE_PROMPT_TEMPLATE,
};
