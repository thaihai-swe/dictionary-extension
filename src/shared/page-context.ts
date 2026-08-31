export const MAX_CONTEXT_CHARS = 800;
const MAX_CANDIDATE_TEXT_LENGTH = 12000;
const MAX_FALLBACK_TEXT_LENGTH = 50000;
const MAX_SCAN_ELEMENTS = 120;
const MAX_ANCESTOR_HOPS = 12;
const LEAF_CONTENT_SELECTOR = 'p, li, blockquote, td, th, figcaption, dd, dt, h1, h2, h3, h4, h5, h6, pre';
const SEMANTIC_CONTAINER_SELECTOR = "main, article, section, [role='main'], [role='article'], .content, #content";
const BLOCK_SELECTOR = "p, li, td, th, blockquote, figcaption, dd, dt, h1, h2, h3, h4, h5, h6, pre, article, section, main, [role='article'], div";

export type ContextConfidence = 'exact' | 'suggested' | 'none';

export interface PageContextResult {
  context: string;
  source: 'selection' | 'page' | '';
  confidence: ContextConfidence;
}

export function normalizeContext(value: string): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= MAX_CONTEXT_CHARS) return normalized;
  return `${normalized.slice(0, MAX_CONTEXT_CHARS).trim()}…`;
}

export function normalizeSentenceText(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function isDistinctContext(query: string, context?: string): boolean {
  const selected = normalizeSentenceText(query);
  const surrounding = normalizeSentenceText(String(context || ''));
  if (!surrounding) return false;
  if (selected && surrounding.toLowerCase() === selected.toLowerCase()) return false;
  return surrounding.length > selected.length;
}

function escapeRegExp(value: string): string {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildWordBoundaryPattern(value: string): RegExp | null {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const escaped = escapeRegExp(normalized).replace(/ /g, '\\s+');
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'iu');
}

function isDecimalDot(text: string, index: number): boolean {
  return text[index] === '.' && /\d/.test(text[index - 1] || '') && /\d/.test(text[index + 1] || '');
}

const TITLE_ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'inc', 'ltd', 'vol', 'fig',
]);

function isLikelyAbbreviationDot(text: string, index: number): boolean {
  if (text[index] !== '.') return false;
  let start = index;
  while (start > 0 && /[A-Za-z]/.test(text[start - 1])) start -= 1;
  const token = text.slice(start, index);
  if (!token) return false;
  if (token.length === 1) return true;
  return TITLE_ABBREVIATIONS.has(token.toLowerCase());
}

function extendSentenceEnd(text: string, index: number): number {
  let end = index + 1;
  while (end < text.length && /[.!?。！？]/.test(text[end])) end += 1;
  while (end < text.length && /["'”’»)]/.test(text[end])) end += 1;
  return end;
}

function isSentenceBoundaryAt(text: string, index: number): boolean {
  const character = text[index];
  if (!character || !/[.!?。！？]/.test(character)) return false;
  if (/[。！？]/.test(character)) return true;
  if (isDecimalDot(text, index) || isLikelyAbbreviationDot(text, index)) return false;

  let next = extendSentenceEnd(text, index);
  if (next >= text.length) return true;
  if (!/\s/.test(text[next])) return false;
  while (next < text.length && /\s/.test(text[next])) next += 1;
  return next >= text.length || /["'“‘(\[]/.test(text[next]) || /[\p{Lu}\p{N}]/u.test(text[next]);
}

function splitIntoSentences(value: string): string[] {
  const text = normalizeSentenceText(value);
  if (!text) return [];
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (!isSentenceBoundaryAt(text, index)) continue;
    const end = extendSentenceEnd(text, index);
    const sentence = text.slice(start, end).trim();
    if (sentence) sentences.push(sentence);
    start = end;
    index = end - 1;
  }
  const tail = text.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

function containsNeedle(value: string, needle: string): boolean {
  const haystack = normalizeSentenceText(value);
  const query = normalizeSentenceText(needle);
  if (!haystack || !query) return false;
  const pattern = buildWordBoundaryPattern(query);
  if (pattern?.test(haystack)) return true;
  return haystack.toLowerCase().includes(query.toLowerCase());
}

export function extractSentenceAtOffset(value: string, offset: number): string {
  const rawText = String(value || '');
  if (!rawText.trim()) return '';
  const safeOffset = Math.max(0, Math.min(Number(offset) || 0, rawText.length));
  let start = 0;
  let end = rawText.length;

  for (let index = safeOffset - 1; index >= 0; index -= 1) {
    if (isSentenceBoundaryAt(rawText, index)) {
      start = extendSentenceEnd(rawText, index);
      break;
    }
  }

  for (let index = safeOffset; index < rawText.length; index += 1) {
    if (!isSentenceBoundaryAt(rawText, index)) continue;
    end = extendSentenceEnd(rawText, index);
    break;
  }

  return normalizeSentenceText(rawText.slice(start, end));
}

export function findSentenceContaining(value: string, needle: string): string {
  if (!containsNeedle(value, needle)) return '';
  const match = splitIntoSentences(value).find((sentence) => containsNeedle(sentence, needle));
  if (match) return match;
  const text = normalizeSentenceText(value);
  return containsNeedle(text, needle) ? text : '';
}

export interface RankedSentenceCandidate {
  sentence: string;
  visible: boolean;
  inMainContent: boolean;
  viewportDistance: number;
  documentOrder: number;
}

export function rankSentenceCandidates(candidates: RankedSentenceCandidate[] = []): RankedSentenceCandidate[] {
  return [...candidates].sort((left, right) => {
    const visibilityDifference = Number(right.visible) - Number(left.visible);
    if (visibilityDifference !== 0) return visibilityDifference;
    const contentDifference = Number(right.inMainContent) - Number(left.inMainContent);
    if (contentDifference !== 0) return contentDifference;
    const distanceDifference = Number(left.viewportDistance || 0) - Number(right.viewportDistance || 0);
    if (distanceDifference !== 0) return distanceDifference;
    return Number(left.documentOrder || 0) - Number(right.documentOrder || 0);
  });
}

function sanitizeText(value: string, maxLength = MAX_CANDIDATE_TEXT_LENGTH): string {
  return String(value || '').slice(0, maxLength)
    .replace(/[\u00ad\u200b\u200c\u200d]/g, '')
    .replace(/([A-Za-zÀ-ɏ]+)-\s*\r?\n\s*([A-Za-zÀ-ɏ]+)/g, '$1$2')
    .replace(/\s+/g, ' ');
}

function sanitizeBlockText(element: ParentNode | null, maxLength = MAX_CANDIDATE_TEXT_LENGTH, needle = ''): string {
  if (!element) return '';
  const raw = String((element as HTMLElement).textContent || '');
  const query = normalizeSentenceText(needle);
  if (query && raw.length > maxLength) {
    const index = raw.toLowerCase().indexOf(query.toLowerCase());
    if (index >= 0) {
      const start = Math.max(0, index - Math.floor(maxLength / 2));
      return sanitizeText(raw.slice(start, start + maxLength), maxLength);
    }
  }
  return sanitizeText(raw, maxLength);
}

function getRawSelectionOffsetInBlock(block: Node, range: Range): number {
  try {
    const preRange = range.cloneRange();
    preRange.selectNodeContents(block);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  } catch {
    return -1;
  }
}

function windowedBlockText(block: Node, range: Range, radius = 2000): { text: string; offset: number } | null {
  const rawOffset = getRawSelectionOffsetInBlock(block, range);
  if (rawOffset < 0) return null;
  const raw = String((block as HTMLElement).textContent || '');
  if (!raw) return null;
  const start = Math.max(0, rawOffset - radius);
  const end = Math.min(raw.length, rawOffset + radius);
  const prefix = sanitizeText(raw.slice(start, rawOffset), radius);
  const windowText = sanitizeText(raw.slice(start, end), radius * 2);
  return { text: windowText, offset: Math.min(prefix.length, windowText.length) };
}

function isElementVisible(element: Element): boolean {
  const html = element as HTMLElement;
  if (!html.getBoundingClientRect) return false;
  const rect = html.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = typeof window !== 'undefined' ? window.getComputedStyle(html) : null;
  if (style && (style.visibility === 'hidden' || style.display === 'none')) return false;
  return true;
}

function viewportDistance(element: Element): number {
  const rect = (element as HTMLElement).getBoundingClientRect?.();
  if (!rect) return Number.MAX_SAFE_INTEGER;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const dx = rect.right < 0 ? -rect.right : rect.left > vw ? rect.left - vw : 0;
  const dy = rect.bottom < 0 ? -rect.bottom : rect.top > vh ? rect.top - vh : 0;
  return Math.hypot(dx, dy);
}

function asElement(node: Node | null): HTMLElement | null {
  if (!node) return null;
  if (node.nodeType === Node.ELEMENT_NODE) return node as HTMLElement;
  return node.parentElement;
}

function hasSentenceTerminator(value: string): boolean {
  return /[.!?。！？]["'”’»)]*$/.test(normalizeSentenceText(value));
}

function isCompleteBlockSentence(sentence: string, block: HTMLElement): boolean {
  if (hasSentenceTerminator(sentence)) return true;
  if (typeof block.matches === 'function' && block.matches(LEAF_CONTENT_SELECTOR)) {
    return normalizeSentenceText(sanitizeBlockText(block)) === normalizeSentenceText(sentence);
  }
  return false;
}

function sentenceFromBlock(block: Node, range: Range, needle: string): string {
  const windowed = windowedBlockText(block, range);
  const normalizedBlockText = normalizeSentenceText(windowed?.text || sanitizeBlockText(block as ParentNode));
  if (!normalizedBlockText) return '';

  if (windowed && windowed.offset >= 0) {
    const exact = extractSentenceAtOffset(windowed.text, windowed.offset);
    if (isDistinctContext(needle, exact) && containsNeedle(exact, needle)) {
      return normalizeContext(exact);
    }
  }

  const blockSentence = findSentenceContaining(normalizedBlockText, needle);
  if (isDistinctContext(needle, blockSentence)) return normalizeContext(blockSentence);
  if (isDistinctContext(needle, normalizedBlockText) && containsNeedle(normalizedBlockText, needle)) {
    return normalizeContext(normalizedBlockText);
  }
  return '';
}

function extractExactSentenceFromRange(range: Range, needle: string): string {
  const container = asElement(range.commonAncestorContainer);
  if (!container || typeof container.closest !== 'function') return '';

  let current: HTMLElement | null = container.closest(LEAF_CONTENT_SELECTOR)
    || container.closest(BLOCK_SELECTOR)
    || container;
  let hops = 0;
  let best = '';
  while (current && hops < MAX_ANCESTOR_HOPS) {
    const sentence = sentenceFromBlock(current, range, needle);
    if (sentence) {
      if (isCompleteBlockSentence(sentence, current)) return sentence;
      if (sentence.length > best.length) best = sentence;
    }
    if (current === document.body || current === document.documentElement) break;
    current = current.parentElement;
    hops += 1;
  }
  return best;
}

function findBestPageSentenceCandidate(needle: string): PageContextResult {
  if (typeof document === 'undefined') return { context: '', source: '', confidence: 'none' };
  const pattern = buildWordBoundaryPattern(needle);
  if (!pattern) return { context: '', source: '', confidence: 'none' };

  const candidates: RankedSentenceCandidate[] = [];
  const seen = new Set<string>();
  const containers = Array.from(document.querySelectorAll(SEMANTIC_CONTAINER_SELECTOR));
  const leaves = Array.from(document.querySelectorAll(LEAF_CONTENT_SELECTOR)).slice(0, MAX_SCAN_ELEMENTS);
  const nodes = [...containers, ...leaves];

  nodes.forEach((element, documentOrder) => {
    const text = sanitizeBlockText(element, MAX_CANDIDATE_TEXT_LENGTH, needle);
    const sentence = findSentenceContaining(text, needle);
    if (!isDistinctContext(needle, sentence) || seen.has(sentence)) return;
    seen.add(sentence);
    candidates.push({
      sentence,
      visible: isElementVisible(element),
      inMainContent: Boolean((element as HTMLElement).closest?.(SEMANTIC_CONTAINER_SELECTOR)),
      viewportDistance: viewportDistance(element),
      documentOrder,
    });
  });

  const ranked = rankSentenceCandidates(candidates);
  const best = ranked[0];
  if (best?.sentence) {
    return {
      context: normalizeContext(best.sentence),
      source: 'page',
      confidence: 'suggested',
    };
  }

  if (typeof document.body === 'undefined') return { context: '', source: '', confidence: 'none' };
  const pageText = normalizeSentenceText(
    String(document.body.innerText || document.body.textContent || '').slice(0, MAX_FALLBACK_TEXT_LENGTH),
  );
  const fallbackSentence = findSentenceContaining(pageText, needle);
  if (!isDistinctContext(needle, fallbackSentence)) return { context: '', source: '', confidence: 'none' };
  return {
    context: normalizeContext(fallbackSentence),
    source: 'page',
    confidence: 'suggested',
  };
}

function rangeFromSelection(selection: Selection | null, preferred?: Range | null, needle = ''): Range | null {
  const normalizedNeedle = normalizeSentenceText(needle);
  const liveRange = (() => {
    if (!selection || selection.rangeCount <= 0) return null;
    try {
      return selection.getRangeAt(0);
    } catch {
      return null;
    }
  })();
  const liveText = normalizeSentenceText(liveRange?.toString() || selection?.toString() || '');
  if (liveRange && (!normalizedNeedle || liveText === normalizedNeedle || !liveText)) {
    return liveRange;
  }
  if (preferred) return preferred;
  return liveRange;
}

export function extractSelectionContext(
  selectedText: string,
  disabled = false,
  range?: Range | null,
): PageContextResult {
  const needle = String(selectedText || '').trim();
  if (!needle || disabled) return { context: '', source: '', confidence: 'none' };
  try {
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    const activeRange = rangeFromSelection(selection, range, needle);
    if (!activeRange) return { context: '', source: '', confidence: 'none' };
    const selected = normalizeSentenceText(activeRange.toString() || selection?.toString() || '');
    const normalizedNeedle = normalizeSentenceText(needle);
    if (selected && selected !== normalizedNeedle) {
      return { context: '', source: '', confidence: 'none' };
    }
    const exactSentence = extractExactSentenceFromRange(activeRange, needle);
    if (exactSentence) {
      return { context: exactSentence, source: 'selection', confidence: 'exact' };
    }
    return { context: '', source: '', confidence: 'none' };
  } catch {
    return { context: '', source: '', confidence: 'none' };
  }
}

export function extractSurroundingContext(
  selectedText: string,
  disabled = false,
  range?: Range | null,
): PageContextResult {
  const needle = String(selectedText || '').trim();
  if (!needle || disabled) return { context: '', source: '', confidence: 'none' };
  const exact = extractSelectionContext(needle, disabled, range);
  if (exact.context) return exact;
  try {
    return findBestPageSentenceCandidate(needle);
  } catch {
    return { context: '', source: '', confidence: 'none' };
  }
}
