export type RewriteBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: RewriteListItem[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface RewriteListItem {
  text: string;
  children?: RewriteListItem[];
}

export interface RewriteSection {
  id: string;
  title: string;
  blocks: RewriteBlock[];
}

export interface ParsedRewrite {
  polished?: string;
  sections: RewriteSection[];
}

interface LineSection {
  title: string;
  lines: string[];
}

export function parseRewriteMarkdown(content: string): ParsedRewrite {
  const text = unwrapFence(String(content || '').replace(/\r\n/g, '\n')).trim();
  if (!text) return { sections: [] };

  const sections = splitSections(text.split('\n'))
    .map((section, index) => {
      const title = cleanHeading(section.title);
      return {
        id: slug(title || `section-${index + 1}`),
        title,
        blocks: parseBlocks(section.lines),
      };
    })
    .filter((section) => section.title || section.blocks.length);

  return extractPolished(sections);
}

export function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatInlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-content font-semibold">$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em class="italic">$2</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[12px]">$1</code>');
}

export function sectionStartsOpen(section: RewriteSection): boolean {
  return isRevisedTextTitle(section.title) || isAlternativeTitle(section.title);
}

function unwrapFence(text: string): string {
  const match = text.trim().match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return match ? match[1] : text;
}

function splitSections(lines: string[]): LineSection[] {
  const sections: LineSection[] = [];
  let title = '';
  let buffer: string[] = [];

  const flush = () => {
    if (title || buffer.some((line) => line.trim())) {
      sections.push({ title, lines: buffer });
    }
    buffer = [];
  };

  for (const line of lines) {
    const heading = matchHeading(line);
    if (heading && heading.level <= 3) {
      flush();
      title = heading.text;
      continue;
    }
    buffer.push(line);
  }
  flush();
  return sections;
}

function parseBlocks(lines: string[]): RewriteBlock[] {
  const blocks: RewriteBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index];
    const trimmed = raw.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    const heading = matchHeading(trimmed);
    if (heading) {
      blocks.push({ type: 'heading', level: heading.level, text: heading.text });
      index += 1;
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const table = readTable(lines, index);
      if (table.headers.length) {
        blocks.push(table.block);
        index = table.nextIndex;
        continue;
      }
    }

    if (isQuoteLine(trimmed)) {
      const quotes: string[] = [];
      while (index < lines.length && isQuoteLine(lines[index].trim())) {
        quotes.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      const filled = quotes.filter((line) => line.trim());
      if (filled.length) blocks.push({ type: 'quote', lines: filled });
      continue;
    }

    if (isListLine(raw)) {
      const list = readList(lines, index);
      blocks.push(list.block);
      index = list.nextIndex;
      continue;
    }

    const paragraph: string[] = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index];
      const nextTrim = next.trim();
      if (!nextTrim) break;
      if (matchHeading(nextTrim) || isListLine(next) || isQuoteLine(nextTrim) || nextTrim.startsWith('|') || /^(-{3,}|\*{3,}|_{3,})$/.test(nextTrim)) {
        break;
      }
      paragraph.push(nextTrim);
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

function readTable(lines: string[], start: number): { block: Extract<RewriteBlock, { type: 'table' }>; headers: string[]; nextIndex: number } {
  const rows: string[][] = [];
  let index = start;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) break;
    rows.push(splitTableRow(trimmed));
    index += 1;
  }
  const header = rows[0] || [];
  const hasSep = rows[1] && rows[1].every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
  const body = hasSep ? rows.slice(2) : rows.slice(1);
  return {
    headers: header,
    nextIndex: index,
    block: { type: 'table', headers: header, rows: body },
  };
}

function splitTableRow(line: string): string[] {
  return line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function readList(lines: string[], start: number): { block: Extract<RewriteBlock, { type: 'list' }>; nextIndex: number } {
  const items: { indent: number; ordered: boolean; text: string }[] = [];
  let index = start;
  while (index < lines.length) {
    const raw = lines[index];
    if (!raw.trim()) {
      const peek = nextNonEmpty(lines, index + 1);
      if (peek >= 0 && isListLine(lines[peek])) {
        index += 1;
        continue;
      }
      break;
    }
    const parsed = parseListLine(raw);
    if (!parsed) break;
    items.push(parsed);
    index += 1;
  }
  return {
    nextIndex: index,
    block: {
      type: 'list',
      ordered: items[0]?.ordered ?? false,
      items: nestListItems(items),
    },
  };
}

function nestListItems(items: { indent: number; ordered: boolean; text: string }[]): RewriteListItem[] {
  const root: RewriteListItem[] = [];
  const stack: { indent: number; item: RewriteListItem }[] = [];
  for (const item of items) {
    const node: RewriteListItem = { text: item.text };
    while (stack.length && item.indent <= stack[stack.length - 1].indent) stack.pop();
    if (!stack.length) {
      root.push(node);
    } else {
      const parent = stack[stack.length - 1].item;
      parent.children = parent.children || [];
      parent.children.push(node);
    }
    stack.push({ indent: item.indent, item: node });
  }
  return root;
}

function parseListLine(line: string): { indent: number; ordered: boolean; text: string } | null {
  const match = line.match(/^(\s*)(?:([-*•])|(\d+[.)]))\s+(.*)$/);
  if (!match) return null;
  const indent = match[1].replace(/\t/g, '  ').length;
  return {
    indent,
    ordered: Boolean(match[3]),
    text: match[4].trim(),
  };
}

function isListLine(line: string): boolean {
  return parseListLine(line) != null;
}

function isQuoteLine(line: string): boolean {
  return line.startsWith('>');
}

function matchHeading(line: string): { level: number; text: string } | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return null;
  return { level: match[1].length, text: match[2].trim() };
}

function extractPolished(sections: RewriteSection[]): ParsedRewrite {
  const index = sections.findIndex((section) => isRevisedTextTitle(section.title));
  if (index < 0) return { sections };
  const section = sections[index];
  const parts: string[] = [];
  const leftover: RewriteBlock[] = [];
  for (const block of section.blocks) {
    if (block.type === 'paragraph') parts.push(block.text);
    else if (block.type === 'quote') parts.push(block.lines.join('\n'));
    else leftover.push(block);
  }
  const polished = parts.join('\n\n').trim();
  const next = [...sections];
  if (leftover.length) next[index] = { ...section, blocks: leftover };
  else next.splice(index, 1);
  return { polished: polished || undefined, sections: next };
}

function isRevisedTextTitle(title: string): boolean {
  return /revised text/i.test(title);
}

function isAlternativeTitle(title: string): boolean {
  return /alternative rewrite/i.test(title);
}

function cleanHeading(title: string): string {
  return String(title || '')
    .replace(/\bPHASE\s*\d+[a-z]?\s*[:.\-–—]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

function nextNonEmpty(lines: string[], start: number): number {
  for (let i = start; i < lines.length; i += 1) {
    if (lines[i].trim()) return i;
  }
  return -1;
}
