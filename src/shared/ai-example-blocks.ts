export type ExampleRenderItem =
  | { kind: 'example'; english: string; translation?: string }
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
