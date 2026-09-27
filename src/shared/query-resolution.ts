/**
 * Pure query and context string resolution and normalization utilities.
 * Follows Command-Query Separation (CQS): pure deterministic queries with no side effects.
 */

export function cleanSentenceText(text?: string): string {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function resolveQuery(query?: string, context?: string): string {
  const selected = String(query || '').trim();
  if (selected) return selected;
  return cleanSentenceText(context);
}

export function resolveContext(query?: string, context?: string): string {
  const selected = String(query || '').trim();
  const surrounding = cleanSentenceText(context);
  if (!surrounding) return '';
  if (selected && surrounding.toLowerCase() === selected.toLowerCase()) return '';
  return surrounding;
}
