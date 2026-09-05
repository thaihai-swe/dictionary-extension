import type {
  AiComparisonRow,
  AiMinimalPair,
  AiPhraseItem,
  PhraseExplanationSection,
  RephraseStyleItem,
  SentenceStructureItem,
} from '../types';
import { extractJsonObject } from './text-utils.ts';

function inferPhraseSectionKind(title: string): string {
  const normalized = String(title || '').trim().toLowerCase();
  if (!normalized) return 'phrase';
  if (normalized.includes('usage') || normalized.includes('register')) return 'usage';
  if (normalized.includes('example')) return 'examples';
  if (normalized.includes('related')) return 'phrase';
  if (normalized.includes('meaning')) return 'definitions';
  return 'phrase';
}

export function splitPhraseExplanation(markdown: string, source = 'AI · Phrase explanation'): PhraseExplanationSection[] {
  const text = String(markdown || '').trim();
  if (!text) return [];

  const blocks: PhraseExplanationSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = () => {
    const body = currentLines.join('\n').trim();
    if (!currentTitle && !body) return;
    blocks.push({
      title: currentTitle || (blocks.length === 0 ? 'Phrase explanation' : ''),
      kind: inferPhraseSectionKind(currentTitle),
      text: body,
      markdown: true,
      source: blocks.length === 0 ? source : undefined,
    });
    currentTitle = '';
    currentLines = [];
  };

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      flush();
      currentTitle = trimmed.replace(/^#+\s*/, '');
      continue;
    }
    currentLines.push(line);
  }
  flush();

  if (blocks.length === 1 && !String(blocks[0].title || '').trim()) {
    blocks[0].title = 'Phrase explanation';
  }
  return blocks.filter((section) => Boolean(section.text?.trim() || section.title?.trim()));
}

function compactField(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sentenceIncludes(sentence: string, fragment: string): boolean {
  const haystack = sentence.toLowerCase();
  const needle = fragment.toLowerCase().trim();
  return Boolean(needle) && haystack.includes(needle);
}

export function normalizeSentenceBreakdown(
  data: unknown,
  options: { text?: string; context?: string; sentence?: string } = {},
): { translation?: string; structure: SentenceStructureItem[]; phrases: AiPhraseItem[] } | null {
  if (!data || typeof data !== 'object') return null;
  const source = data as Record<string, unknown>;
  const sentence = compactField(options.sentence || options.context || options.text || source.sentence);
  const parts = Array.isArray(source.parts) ? source.parts : [];
  const structure: SentenceStructureItem[] = parts
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const text = compactField(row.text);
      const role = compactField(row.role || row.label);
      if (!text || !role) return null;
      const explanation = compactField(row.explanation || row.description);
      return explanation ? { text, role, explanation } : { text, role };
    })
    .filter((item): item is SentenceStructureItem => Boolean(item));

  const phrases: AiPhraseItem[] = [];
  for (const item of Array.isArray(source.phrases) ? source.phrases : []) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const text = compactField(row.text);
    if (!text || (sentence && !sentenceIncludes(sentence, text))) continue;
    phrases.push({
      text,
      type: compactField(row.type),
      meaning: compactField(row.meaning),
      role: compactField(row.role),
      example: compactField(row.example),
    });
  }

  if (!structure.length && !phrases.length && !compactField(source.translation)) return null;
  return {
    translation: compactField(source.translation) || undefined,
    structure,
    phrases,
  };
}

function normalizeMinimalPair(item: unknown): AiMinimalPair | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  const sentenceA = compactField(row.sentenceA || row.left || row.a);
  const sentenceB = compactField(row.sentenceB || row.right || row.b);
  if (!sentenceA || !sentenceB) return null;
  const explanation = compactField(row.explanation || row.note);
  return explanation ? { sentenceA, sentenceB, explanation } : { sentenceA, sentenceB };
}

function parseMinimalPairsFromMarkdown(content: string): AiMinimalPair[] {
  const section = String(content || '').match(
    /###\s*(?:Minimal Pairs(?:\s*&\s*Examples)?|Minimal Pair[s]?)[^\n]*\n+([\s\S]*?)(?=\n###|\s*$)/i,
  );
  if (!section?.[1]) return [];

  const quotes = [...section[1].matchAll(/^>\s*(.+)$/gm)].map((match) => compactField(match[1]));
  const pairs: AiMinimalPair[] = [];
  for (let i = 0; i + 1 < quotes.length; i += 2) {
    const sentenceA = quotes[i];
    const sentenceB = quotes[i + 1];
    if (!sentenceA || !sentenceB) continue;
    pairs.push({ sentenceA, sentenceB });
  }
  return pairs;
}

export function normalizeComparisonData(
  content: string,
  options: { text?: string } = {},
): {
  coreDistinction?: string;
  rows: AiComparisonRow[];
  leftTerm?: string;
  rightTerm?: string;
  minimalPairs?: AiMinimalPair[];
} | null {
  const json = extractJsonObject(content);
  if (json && typeof json === 'object') {
    const source = json as Record<string, unknown>;
    const rows = Array.isArray(source.table || source.rows)
      ? ((source.table || source.rows) as unknown[])
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const row = item as Record<string, unknown>;
          const dimension = compactField(row.dimension || row.feature || row.label);
          const left = compactField(row.left || row.a || row.termA);
          const right = compactField(row.right || row.b || row.termB);
          if (!dimension || (!left && !right)) return null;
          return { dimension, left, right };
        })
        .filter((item): item is AiComparisonRow => Boolean(item))
      : [];
    const coreDistinction = compactField(source.coreDistinction || source.distinction);
    const pairSource = Array.isArray(source.minimalPairs)
      ? source.minimalPairs
      : Array.isArray(source.pairs)
        ? source.pairs
        : [];
    const minimalPairs = pairSource
      .map(normalizeMinimalPair)
      .filter((item): item is AiMinimalPair => Boolean(item));
    if (rows.length || coreDistinction || minimalPairs.length) {
      return {
        coreDistinction: coreDistinction || undefined,
        rows,
        leftTerm: compactField(source.leftTerm || source.termA) || undefined,
        rightTerm: compactField(source.rightTerm || source.termB) || undefined,
        minimalPairs: minimalPairs.length ? minimalPairs : undefined,
      };
    }
  }

  const text = String(content || '');
  const distinctionMatch = text.match(/###\s*(?:Core Distinction|Distinction|Rule of Thumb)[^\n]*\n+([\s\S]*?)(?=\n###|\s*$)/i);
  const coreDistinction = compactField(distinctionMatch?.[1] || '');
  const minimalPairs = parseMinimalPairsFromMarkdown(text);
  if (!coreDistinction && !minimalPairs.length && !options.text) return null;
  if (!coreDistinction && !minimalPairs.length) return null;
  return {
    coreDistinction: coreDistinction || undefined,
    rows: [],
    minimalPairs: minimalPairs.length ? minimalPairs : undefined,
  };
}

const REPHRASE_STYLE_MAP: Array<{ style: RephraseStyleItem['style']; label: string; heading: RegExp }> = [
  { style: 'simplified', label: 'Simplified', heading: /simplified/i },
  { style: 'formal', label: 'Academic & Formal', heading: /academic|formal/i },
  { style: 'idiomatic', label: 'Native Idiom', heading: /native|idiom/i },
];

function stripQuoteMarks(value: string): string {
  return compactField(value).replace(/^["'“”]+|["'“”]+$/g, '');
}

function parseRephraseSection(section: string): { text: string; note?: string } | null {
  const quotes = [...String(section || '').matchAll(/^>\s*(.+)$/gm)].map((match) => stripQuoteMarks(match[1]));
  const text = quotes[0] || '';
  if (!text) return null;
  const note = compactField(
    String(section || '')
      .replace(/^>\s*.+$/gm, '')
      .replace(/^#+\s*.+$/gm, ''),
  );
  return note ? { text, note } : { text };
}

export function normalizeRephraseStyles(content: string): RephraseStyleItem[] {
  const json = extractJsonObject(content);
  if (json && typeof json === 'object') {
    const source = json as Record<string, unknown>;
    const styles = Array.isArray(source.styles) ? source.styles : Array.isArray(source.rephraseStyles) ? source.rephraseStyles : [];
    const parsed = styles
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const text = stripQuoteMarks(String(row.text || row.sentence || row.rewrite || ''));
        if (!text) return null;
        const rawStyle = compactField(row.style || row.label || row.id).toLowerCase();
        const mapped = REPHRASE_STYLE_MAP.find((entry) => entry.heading.test(rawStyle)) || REPHRASE_STYLE_MAP[0];
        const note = compactField(row.note || row.explanation);
        return note
          ? { style: mapped.style, label: compactField(row.label) || mapped.label, text, note }
          : { style: mapped.style, label: compactField(row.label) || mapped.label, text };
      })
      .filter((item): item is RephraseStyleItem => Boolean(item));
    if (parsed.length) return parsed;
  }

  const text = String(content || '');
  const blocks = text.split(/(?=^###\s+)/m);
  const styles: RephraseStyleItem[] = [];
  const used = new Set<string>();
  for (const block of blocks) {
    const heading = compactField(block.match(/^###\s+(.+)$/m)?.[1] || '');
    if (!heading) continue;
    const mapped = REPHRASE_STYLE_MAP.find((entry) => entry.heading.test(heading));
    if (!mapped || used.has(mapped.style)) continue;
    const parsed = parseRephraseSection(block);
    if (!parsed) continue;
    used.add(mapped.style);
    styles.push({ style: mapped.style, label: mapped.label, ...parsed });
  }
  return styles;
}
