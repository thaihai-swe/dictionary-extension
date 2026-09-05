export function normalizeDictionaryTerm(text: string): string {
  const trimmed = String(text || '').trim();
  return trimmed.replace(/^[^a-zA-Z]+|[^a-zA-Z' -]+$/g, '') || trimmed;
}
