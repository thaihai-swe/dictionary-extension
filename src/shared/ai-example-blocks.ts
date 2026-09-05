export type ExampleRenderItem =
  | { kind: 'example'; english: string; translation?: string }
  | {
      kind: 'pattern_rule';
      title?: string;
      description: string;
      example?: { english: string; translation?: string };
    }
  | { kind: 'quote'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'paragraph'; text: string };

const VIETNAMESE_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const NON_LATIN_SCRIPT = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/;
const ENGLISH_HINT = /\b(the|a|an|to|of|in|on|for|and|is|are|was|were|this|that|with|from|will|can|should|would|not|it|you|we|they|i)\b/i;

const LANG_BADGES: Record<string, string> = {
  vietnamese: 'VI',
  english: 'EN',
  chinese: 'ZH',
  mandarin: 'ZH',
  japanese: 'JA',
  korean: 'KO',
  french: 'FR',
  german: 'DE',
  spanish: 'ES',
  portuguese: 'PT',
  italian: 'IT',
  russian: 'RU',
  thai: 'TH',
  arabic: 'AR',
  hindi: 'HI',
  indonesian: 'ID',
  dutch: 'NL',
  polish: 'PL',
  turkish: 'TR',
};

export function languageBadge(lang?: string): string {
  const key = String(lang || '').trim().toLowerCase();
  if (!key) return 'TR';
  if (LANG_BADGES[key]) return LANG_BADGES[key];
  const ascii = key.replace(/[^a-z]/g, '');
  return (ascii.slice(0, 2) || 'TR').toUpperCase();
}

export function isExampleSectionTitle(title?: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return t.includes('example') || t.includes('minimal pair');
}

export function isPatternRulesSectionTitle(title?: string): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  return (
    t.includes('pattern rule') ||
    t.includes('pattern rules') ||
    (t.includes('pattern') && t.includes('rule')) ||
    t.includes('grammar & pattern')
  );
}

export function parsePatternRuleLine(line: string): { title?: string; description: string } {
  let clean = String(line || '').trim();
  // Strip leading list markers: "1. ", "1) ", "- ", "• ", "* "
  clean = clean.replace(/^([•*-]|\d+[\.)])\s*/, '').trim();

  // Pattern A: **Title**: Description or **Title** — Description or **Title** - Description
  const boldMatch = clean.match(/^\*\*(.+?)\*\*[:\s—–-]*(.*)$/);
  if (boldMatch) {
    const title = boldMatch[1].trim();
    const description = boldMatch[2].trim();
    return {
      title: title || undefined,
      description: description || clean,
    };
  }

  // Pattern B: Title: Description (where title is not excessively long, e.g. < 60 chars)
  const colonIdx = clean.indexOf(':');
  if (colonIdx > 1 && colonIdx < 60) {
    const candidateTitle = clean.slice(0, colonIdx).trim().replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
    const candidateDesc = clean.slice(colonIdx + 1).trim();
    if (candidateDesc.length > 0) {
      return {
        title: candidateTitle,
        description: candidateDesc,
      };
    }
  }

  // Pattern C: Title — Description
  const dashMatch = clean.match(/^([A-Za-z0-9\s+/()_-]{3,50})\s+[—–]\s+(.+)$/);
  if (dashMatch) {
    return {
      title: dashMatch[1].trim(),
      description: dashMatch[2].trim(),
    };
  }

  return {
    description: clean,
  };
}

export function groupPatternRules(
  lines: string[],
  options: { targetLang?: string } = {},
): ExampleRenderItem[] {
  const items: ExampleRenderItem[] = [];
  const targetLang = options.targetLang;

  let index = 0;
  while (index < lines.length) {
    const raw = lines[index];
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    // If it's a quote line without a preceding rule, render as quote or example
    if (isQuoteLine(trimmed)) {
      const quoteItems = groupMarkdownLines([raw], { exampleSection: true, targetLang });
      items.push(...quoteItems);
      index += 1;
      continue;
    }

    // Otherwise, it's a rule definition
    const { title, description } = parsePatternRuleLine(trimmed);
    let ruleExample: { english: string; translation?: string } | undefined;

    // Check if subsequent lines have inline example blockquotes ('> ...')
    const quoteLines: string[] = [];
    let nextIdx = index + 1;
    while (nextIdx < lines.length) {
      const nextRaw = lines[nextIdx];
      const nextTrimmed = String(nextRaw || '').trim();
      if (!nextTrimmed) {
        nextIdx += 1;
        continue;
      }
      if (isQuoteLine(nextTrimmed)) {
        quoteLines.push(nextTrimmed);
        nextIdx += 1;
      } else {
        break;
      }
    }

    if (quoteLines.length > 0) {
      const exItems = groupMarkdownLines(quoteLines, { exampleSection: true, targetLang });
      const firstEx = exItems.find((it) => it.kind === 'example');
      if (firstEx && firstEx.kind === 'example') {
        ruleExample = {
          english: firstEx.english,
          translation: firstEx.translation,
        };
      }
      index = nextIdx;
    } else {
      index += 1;
    }

    items.push({
      kind: 'pattern_rule',
      title,
      description,
      example: ruleExample,
    });
  }

  return items;
}

export interface MarkdownSectionBlock {
  title?: string;
  exampleSection: boolean;
  patternRulesSection: boolean;
  items: ExampleRenderItem[];
}

export function attachExamplesToPatternRules(blocks: MarkdownSectionBlock[]): MarkdownSectionBlock[] {
  const pool: Array<{ english: string; translation?: string }> = [];
  for (const block of blocks) {
    if (!block.exampleSection) continue;
    for (const item of block.items) {
      if (item.kind === 'example') {
        pool.push({ english: item.english, translation: item.translation });
      }
    }
  }

  let consumeCount = 0;
  const withRules = blocks.map((block) => {
    if (!block.patternRulesSection) return block;
    const items = block.items.map((item) => {
      if (item.kind !== 'pattern_rule' || item.example || consumeCount >= pool.length) return item;
      const example = pool[consumeCount];
      consumeCount += 1;
      return { ...item, example };
    });
    return { ...block, items };
  });

  if (consumeCount === 0) return withRules;

  let skipped = 0;
  const result: MarkdownSectionBlock[] = [];
  for (const block of withRules) {
    if (!block.exampleSection) {
      result.push(block);
      continue;
    }
    const items: ExampleRenderItem[] = [];
    for (const item of block.items) {
      if (item.kind === 'example' && skipped < consumeCount) {
        skipped += 1;
        continue;
      }
      items.push(item);
    }
    if (items.length) result.push({ ...block, items });
  }
  return result;
}

export function parseMarkdownSections(content: string, targetLang?: string): MarkdownSectionBlock[] {
  if (!content) return [];
  const rawLines = content.trim().split('\n');
  const blocks: Array<{ title?: string; lines: string[] }> = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  for (const line of rawLines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('### ') || trimmedLine.startsWith('## ')) {
      if (currentLines.length > 0 || currentTitle) {
        blocks.push({ title: currentTitle, lines: currentLines });
      }
      currentTitle = trimmedLine.replace(/^#+\s*/, '');
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0 || currentTitle) {
    blocks.push({ title: currentTitle, lines: currentLines });
  }

  const initial = blocks.map((block) => {
    const exampleSection = isExampleSectionTitle(block.title);
    const patternRulesSection = isPatternRulesSectionTitle(block.title);
    return {
      title: block.title,
      exampleSection,
      patternRulesSection,
      items: patternRulesSection
        ? groupPatternRules(block.lines, { targetLang })
        : groupMarkdownLines(block.lines, { exampleSection, targetLang }),
    };
  });

  return attachExamplesToPatternRules(initial);
}

export function unwrapExampleText(text: string): string {
  let value = String(text || '').trim().replace(/^>\s*/, '');
  const pairs: Array<[string, string]> = [
    ['"', '"'],
    ['“', '”'],
    ['‘', '’'],
    ["'", "'"],
  ];
  for (const [open, close] of pairs) {
    if (value.startsWith(open) && value.endsWith(close) && value.length > 1) {
      value = value.slice(open.length, value.length - close.length).trim();
      break;
    }
  }
  if (
    (value.startsWith('(') && value.endsWith(')'))
    || (value.startsWith('（') && value.endsWith('）'))
  ) {
    const inner = value.slice(1, -1).trim();
    if (inner && !inner.includes('(') && !inner.includes(')')) value = inner;
  }
  return value;
}

export function looksLikeEnglish(text: string): boolean {
  const value = unwrapExampleText(text);
  if (!value) return false;
  if (looksLikeTranslation(value)) return false;
  const letters = value.match(/\p{L}/gu) || [];
  if (!letters.length) return false;
  const basicLatin = letters.filter((ch) => /[A-Za-z]/.test(ch)).length;
  return basicLatin / letters.length >= 0.85 && (ENGLISH_HINT.test(value) || letters.length <= 12);
}

export function looksLikeTranslation(text: string, targetLang?: string): boolean {
  const raw = String(text || '').trim().replace(/^>\s*/, '');
  if (!raw) return false;
  if (VIETNAMESE_CHARS.test(raw) || NON_LATIN_SCRIPT.test(raw)) return true;
  if (/^[（(][^）)]{1,24}[）)]/.test(raw)) return true;
  if (/^(translation|gloss|nghĩa)\s*[:：]/i.test(raw)) return true;
  const lang = String(targetLang || '').trim();
  if (lang && new RegExp(`^\\(?\\s*${escapeRegExp(lang)}\\s*\\)?\\s*[:：—-]`, 'i').test(raw)) return true;
  return false;
}

export function stripTranslationPrefix(text: string, targetLang?: string): string {
  let value = unwrapExampleText(text);
  value = value.replace(/^(translation|gloss|nghĩa)\s*[:：]\s*/i, '');
  const lang = String(targetLang || '').trim();
  if (lang) {
    value = value.replace(new RegExp(`^\\(?\\s*${escapeRegExp(lang)}\\s*\\)?\\s*[:：—-]\\s*`, 'i'), '');
  }
  value = value.replace(/^[（(][A-Za-z][^）)]{0,24}[）)]\s*/, '');
  return value.trim();
}

export function groupMarkdownLines(
  lines: string[],
  options: { exampleSection?: boolean; targetLang?: string } = {},
): ExampleRenderItem[] {
  const items: ExampleRenderItem[] = [];
  const exampleSection = Boolean(options.exampleSection);
  const targetLang = options.targetLang;

  let index = 0;
  while (index < lines.length) {
    const raw = lines[index];
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isQuoteLine(trimmed)) {
      const quoted = unwrapExampleText(trimmed);
      if (!quoted) {
        index += 1;
        continue;
      }

      const inline = splitInlineBilingual(quoted, targetLang);
      if (inline.translation) {
        items.push({ kind: 'example', english: inline.english, translation: inline.translation });
        index += 1;
        continue;
      }

      const english = inline.english;
      const nextIndex = nextNonEmptyIndex(lines, index + 1);
      if (nextIndex >= 0) {
        const nextRaw = String(lines[nextIndex] || '').trim();
        const nextText = unwrapExampleText(nextRaw.replace(/^([•*-]\s+)/, ''));
        if (shouldPairTranslation(english, nextRaw, nextText, exampleSection, targetLang)) {
          items.push({
            kind: 'example',
            english,
            translation: stripTranslationPrefix(nextText, targetLang) || undefined,
          });
          index = nextIndex + 1;
          continue;
        }
      }
      items.push(exampleSection || looksLikeEnglish(english)
        ? { kind: 'example', english }
        : { kind: 'quote', text: english });
      index += 1;
      continue;
    }

    if (isBulletLine(trimmed)) {
      items.push({ kind: 'bullet', text: trimmed.replace(/^([•*-]\s*)/, '') });
      index += 1;
      continue;
    }

    items.push({ kind: 'paragraph', text: raw });
    index += 1;
  }

  return items;
}

export function splitInlineBilingual(text: string, targetLang?: string): { english: string; translation?: string } {
  const value = unwrapExampleText(text);
  const paren = value.match(/^(.+?)\s+[（(]([^）)]+)[）)]\s*$/);
  if (paren && looksLikeEnglish(paren[1]) && looksLikeTranslation(paren[2], targetLang)) {
    return {
      english: unwrapExampleText(paren[1]),
      translation: stripTranslationPrefix(paren[2], targetLang) || undefined,
    };
  }
  const dash = value.match(/^(.+?)\s+[—–]\s+(.+)$/);
  if (dash && looksLikeEnglish(dash[1]) && looksLikeTranslation(dash[2], targetLang)) {
    return {
      english: unwrapExampleText(dash[1]),
      translation: stripTranslationPrefix(dash[2], targetLang) || undefined,
    };
  }
  return { english: value };
}

function shouldPairTranslation(
  english: string,
  nextRaw: string,
  nextText: string,
  exampleSection: boolean,
  targetLang?: string,
): boolean {
  if (!english || !nextText) return false;
  if (looksLikeEnglish(nextText) && !looksLikeTranslation(nextText, targetLang)) return false;
  if (looksLikeTranslation(nextRaw, targetLang) || looksLikeTranslation(nextText, targetLang)) return true;
  if (!exampleSection) return false;
  if (isQuoteLine(nextRaw) || isBulletLine(nextRaw) || /^[（(]/.test(nextRaw)) return true;
  if (!looksLikeEnglish(nextText) && nextText.length <= 180) return true;
  return false;
}

function isQuoteLine(line: string): boolean {
  return line.startsWith('>');
}

function isBulletLine(line: string): boolean {
  return line.startsWith('•') || line.startsWith('* ') || line.startsWith('- ');
}

function nextNonEmptyIndex(lines: string[], start: number): number {
  for (let i = start; i < lines.length; i += 1) {
    if (String(lines[i] || '').trim()) return i;
  }
  return -1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
