import rawPrompt from './English Refine.md?raw';

export function getEnglishRefinePrompt(): string {
  return String(rawPrompt || '').trim();
}
