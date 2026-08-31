export function stripMwMarkup(value: string): string {
  return String(value || '')
    .replace(/\{sx\|([^}|]+)\|?[^}]*\}/g, '$1')
    .replace(/\{a_link\|([^}|]+)\|?[^}]*\}/g, '$1')
    .replace(/\{d_link\|([^}|]+)\|?[^}]*\}/g, '$1')
    .replace(/\{dx_def\}|\{dx_ety\}|\{\/?dx\}/g, '')
    .replace(/\{bc\}/g, '')
    .replace(/\{ldquo\}/g, '“')
    .replace(/\{rdquo\}/g, '”')
    .replace(/\{[^}]+\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeMwPhonetic(mw: string): string {
  return String(mw || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

export function buildMwAudioUrl(audioFilename: string): string {
  const name = String(audioFilename || '').trim();
  if (!name) return '';
  let subdirectory = name.charAt(0);
  if (name.startsWith('bix')) subdirectory = 'bix';
  else if (name.startsWith('gg')) subdirectory = 'gg';
  else if (/^[^a-zA-Z]/.test(name)) subdirectory = 'number';
  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdirectory}/${name}.mp3`;
}

export function collectMwExamples(entry: unknown, limit = 6): string[] {
  const examples: string[] = [];
  const walk = (node: unknown) => {
    if (examples.length >= limit || node == null) return;
    if (Array.isArray(node)) {
      if (node[0] === 'vis' && Array.isArray(node[1])) {
        for (const item of node[1] as Array<{ t?: string }>) {
          const text = stripMwMarkup(item?.t || '');
          if (text && examples.length < limit) examples.push(text);
        }
        return;
      }
      for (const child of node) walk(child);
      return;
    }
    if (typeof node === 'object') {
      for (const value of Object.values(node as Record<string, unknown>)) walk(value);
    }
  };
  walk((entry as { def?: unknown })?.def);
  return examples;
}

export function stripHtml(html: string): string {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
