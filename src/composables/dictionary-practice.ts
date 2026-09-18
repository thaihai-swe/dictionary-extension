import { signal } from '../ui/signal';
import type { Signal } from '../ui/signal';
import { PracticeResult } from '../types';

export const practiceResultRef = signal<PracticeResult | null>(null);
export const isPracticingRef = signal<boolean>(false);

const MAX_PRACTICE_RESULTS = 20;
const practiceResults = new Map<string, PracticeResult>();
let activeRecognition: RecognitionLike | null = null;

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous?: boolean;
  onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

function practiceKey(text: string, language = 'en-US'): string {
  return `${String(text || '').trim().toLowerCase()}|${language.toLowerCase()}`;
}

function normalizeSpeechText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MAX_LEVENSHTEIN_CHARS = 120;

function levenshteinDistance(a: string, b: string): number {
  const left = String(a || '').slice(0, MAX_LEVENSHTEIN_CHARS);
  const right = String(b || '').slice(0, MAX_LEVENSHTEIN_CHARS);
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  let prev = new Array<number>(right.length + 1);
  let curr = new Array<number>(right.length + 1);
  for (let j = 0; j <= right.length; j += 1) prev[j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left.charCodeAt(i - 1) === right.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[right.length];
}

function scorePractice(target: string, spoken: string): PracticeResult {
  const normTarget = normalizeSpeechText(target);
  const normSpoken = normalizeSpeechText(spoken);
  if (!normTarget || !normSpoken) {
    return { score: 0, grade: 'retry', gradeLabel: 'Try again', spoken: '', details: [] };
  }

  const targetWords = normTarget.split(/\s+/).filter(Boolean);
  const spokenWords = normSpoken.split(/\s+/).filter(Boolean);
  const remaining = [...spokenWords];
  const details = targetWords.map((word) => {
    const idx = remaining.indexOf(word);
    if (idx >= 0) {
      remaining.splice(idx, 1);
      return { word, matched: true };
    }
    const closeMatch = spokenWords.some(
      (sw) => levenshteinDistance(word, sw) <= Math.max(1, Math.floor(word.length * 0.3)),
    );
    return { word, matched: false, closeMatch };
  });

  const matchedCount = details.filter((d) => d.matched).length;
  const wordScore = targetWords.length > 0
    ? Math.round((matchedCount / targetWords.length) * 100)
    : 0;
  const distance = levenshteinDistance(normTarget, normSpoken);
  const maxLength = Math.max(normTarget.length, normSpoken.length, 1);
  const charScore = Math.max(0, Math.round((1 - distance / maxLength) * 100));
  const score = Math.max(wordScore, charScore);
  const grade = score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'almost' : 'retry';
  const gradeLabel = grade === 'excellent' ? 'Excellent' : grade === 'good' ? 'Good' : grade === 'almost' ? 'Almost there' : 'Try again';
  return { score, grade, gradeLabel, spoken: normSpoken, details };
}

function recognitionErrorMessage(errorType: string): string | null {
  if (errorType === 'not-allowed' || errorType === 'service-not-allowed') return 'Microphone permission denied.';
  if (errorType === 'no-speech') return 'No speech detected. Try again.';
  if (errorType === 'audio-capture') return 'No microphone found.';
  if (errorType === 'network') return 'Speech recognition network error.';
  if (errorType === 'aborted') return null;
  return 'Speech recognition failed.';
}

export function supportsSpeechPractice(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

export function readPracticeResult(text: string, language = 'en-US'): PracticeResult | null {
  return practiceResults.get(practiceKey(text, language)) || null;
}

export function stopSpeechPractice(playingKeyRef: Signal<string | null>): void {
  if (activeRecognition) {
    try { activeRecognition.abort?.() ?? activeRecognition.stop(); } catch { /* ignore */ }
    activeRecognition = null;
  }
  isPracticingRef.value = false;
  if (playingKeyRef.value === 'practice') playingKeyRef.value = null;
}

export function startSpeechPracticeSession(
  text: string,
  language: string,
  playingKeyRef: Signal<string | null>,
): void {
  if (typeof window === 'undefined') {
    practiceResultRef.value = { score: 0, grade: 'retry', gradeLabel: 'Practice needs Chrome speech recognition.' };
    return;
  }
  type SpeechRecognitionConstructor = new () => RecognitionLike;
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    practiceResultRef.value = { score: 0, grade: 'retry', gradeLabel: 'Practice needs Chrome speech recognition.' };
    return;
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = language;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;
  isPracticingRef.value = true;
  playingKeyRef.value = 'practice';
  recognition.onresult = (event) => {
    const spoken = event.results?.[0]?.[0]?.transcript || '';
    const scored = scorePractice(text, spoken);
    practiceResultRef.value = scored;
    practiceResults.set(practiceKey(text, language), scored);
    while (practiceResults.size > MAX_PRACTICE_RESULTS) {
      const oldestKey = practiceResults.keys().next().value;
      if (oldestKey === undefined) break;
      practiceResults.delete(oldestKey);
    }
    isPracticingRef.value = false;
    playingKeyRef.value = null;
    activeRecognition = null;
  };
  recognition.onerror = (event) => {
    const message = recognitionErrorMessage(String(event?.error || ''));
    isPracticingRef.value = false;
    playingKeyRef.value = null;
    activeRecognition = null;
    if (message) practiceResultRef.value = { score: 0, grade: 'retry', gradeLabel: message };
  };
  recognition.onend = () => {
    isPracticingRef.value = false;
    if (playingKeyRef.value === 'practice') playingKeyRef.value = null;
    activeRecognition = null;
  };
  activeRecognition = recognition;
  try {
    recognition.start();
  } catch {
    isPracticingRef.value = false;
    playingKeyRef.value = null;
    activeRecognition = null;
    practiceResultRef.value = { score: 0, grade: 'retry', gradeLabel: 'Unable to start speech recognition.' };
  }
}
