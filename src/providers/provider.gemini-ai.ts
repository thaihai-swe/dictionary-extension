import { AiIntentId, AiResult } from '../types';
import { fetchGoogleTranslate } from './provider.google-translate';
import { safeFetch } from './provider.http';

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-1.5-flash',
];

// ── Built-in Prompt Templates (Synced with main branch) ──────────────────────
const PROMPT_TEMPLATES: Record<AiIntentId, (str: string, targetLang: string, context: string) => string> = {
  explain_in_context: (str, targetLang, context) => `
Explain the selected text in its surrounding context for an English language learner.
Selected text: "${str}"
Target language for translations: ${targetLang}
Surrounding context:
"""
${context || str}
"""

Use level-3 Markdown headings (###), bullets, and short paragraphs. Do not use HTML or code fences.
### Meaning in Context
Explain what "${str}" means specifically in this surrounding sentence, including its contextual translation into ${targetLang}.

### Direct Substitutions
Provide 2-3 natural synonyms or phrases that could directly replace "${str}" in this specific sentence without altering grammatical structure, each with a brief ${targetLang} gloss.

### Nuance & Connotation
Explain in 1-2 sentences what tone, emphasis, or subtle nuance is lost if replaced by a plain synonym.

### Natural Paraphrases
Provide 2 natural ways to rephrase the entire context sentence with brief glosses in ${targetLang}.
`.trim(),

  grammar: (str, targetLang, context) => `
Analyze the grammatical structure, syntactic slots, register, and tone of the selected text for a language learner.
Selected text: "${str}"
Target language: ${targetLang}
Optional context:
"""
${context || str}
"""

Use clear markdown subheadings at level 3 (###) for each distinct section:
### Syntactic Breakdown
Identify part of speech, grammatical slot / syntactic role in the sentence (e.g. subject complement, transitive verb head, modifier), and clause relations.

### Formality & Tone
Explain nuance, formality, and register in 1-2 sentences.

### Pattern Rules
List 1-2 governing syntactic rules or clause patterns for this structure.

### Short Examples
Provide 2 short example sentences illustrating this pattern, with brief translations into ${targetLang}.
`.trim(),

  collocations: (str, targetLang, context) => `
Explore the phrase, idiom, phrasal verb, collocation, or expression "${str}" for a language learner.
Target language: ${targetLang}
Optional context:
"""
${context || str}
"""

Use level-3 Markdown headings (###) and bullet lists:
### Core Meaning
Give the natural meaning first, then explain any literal meaning or word partnerships.

### Grammar & Patterns
Show the grammatical pattern, separability for phrasal verbs, and required preposition combinations (e.g. depend + on, fond + of).

### Natural Collocations
List 3-5 frequent word partnerships (verb+noun, adjective+noun, noun+noun) with brief translations into ${targetLang}.

### Natural Examples
Give 2-3 realistic example sentences in context with brief translations into ${targetLang}.
`.trim(),

  sentence_breakdown: (str, targetLang, context) => `
Deconstruct and break down the sentence syntax and clause structure for a language learner.
Sentence: "${str}"
Target language: ${targetLang}

Use level-3 Markdown headings (###):
### Clause & Structure Breakdown
Break down the main subject, predicate verb phrase, object, and dependent clauses.

### Grammatical Roles
Explain how clauses link together (coordination, subordination, relative clauses).

### Translation & Context
Provide a smooth, natural translation into ${targetLang}.
`.trim(),

  confusables: (str, targetLang, context) => `
Compare and contrast the confusable terms or query "${str}" for a language learner.
Target language: ${targetLang}
Optional context:
"""
${context || str}
"""

Use level-3 Markdown headings (###):
### Core Distinction
Give a 2-sentence rule of thumb explaining the fundamental difference in meaning, register, or grammatical class.

### Comparison Matrix
Compare the terms across 2 key dimensions (Function/Meaning, Typical Usage/Register).

### Minimal Pairs & Examples
Provide 2 minimal-pair sentence comparisons demonstrating when to choose one over the other, with brief ${targetLang} translations.
`.trim(),

  rephrase: (str, targetLang, context) => `
Rephrase the supplied text or sentence for an English language learner across three distinct stylistic targets.
Original text: "${str}"
Target language for explanations: ${targetLang}

Use level-3 Markdown headings (###) and blockquotes:
### Simplified Version
> Rewritten sentence using Oxford 3000 / A2-B1 high-frequency vocabulary.
Brief note explaining why this is easier to read.

### Academic & Formal
> Rewritten sentence suitable for formal essays, academic publications, or business correspondence.
Brief note explaining the elevated register and syntactic choices.

### Native & Idiomatic
> Rewritten sentence as a native speaker would naturally say in informal context.
`.trim(),
};

function extractTargetTerm(str: string): string {
  const clean = str.trim();
  if (clean.length <= 30 && clean.split(/\s+/).length <= 4) {
    return clean;
  }
  const quoteMatch = clean.match(/["']([^"']+)["']/);
  if (quoteMatch) return quoteMatch[1];

  const phrases = clean.split(/[,:;—–]/).map(s => s.trim()).filter(Boolean);
  if (phrases.length > 1 && phrases[1].length < 35) {
    return phrases[1];
  }

  const words = clean.split(/\s+/);
  return words.slice(0, 3).join(' ');
}

export function abortGeminiApiRequest() {
  // Signal abortion
}

async function callGeminiApi(prompt: string, apiKey: string, preferredModel?: string, signal?: AbortSignal): Promise<string> {
  let lastErr = 'Gemini API call failed';

  const models = preferredModel
    ? [preferredModel, ...GEMINI_MODELS.filter(m => m !== preferredModel)]
    : GEMINI_MODELS;

  for (const model of models) {
    if (signal?.aborted) {
      throw new DOMException('The user aborted a request.', 'AbortError');
    }
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await safeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }),
        signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        lastErr = errData.error?.message || `HTTP ${res.status}`;
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n');
      if (text) return text.trim();
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      lastErr = e.message;
    }
  }

  throw new Error(lastErr);
}

export async function fetchAiAnalysis(
  intentId: AiIntentId,
  text: string,
  targetLang = 'vi',
  userApiKey?: string,
  userModelName?: string,
  signal?: AbortSignal,
): Promise<AiResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Context text cannot be empty');

  const term = extractTargetTerm(trimmed);

  // Fetch real Google Translation as baseline
  let translation = trimmed;
  try {
    const gtResult = await fetchGoogleTranslate(trimmed, targetLang, signal);
    translation = gtResult.meanings?.[0]?.definitions?.[0]?.definition || trimmed;
  } catch (e) {
    // Ignore translation fallback failure
  }

  if (signal?.aborted) {
    throw new DOMException('The user aborted a request.', 'AbortError');
  }

  // Resolve API key & preferred model from param, localStorage, or chrome.storage
  let apiKey = userApiKey?.trim() || (typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') : null);
  let modelName = userModelName?.trim();

  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      if (!apiKey) {
        const resKey = await new Promise<any>((r) => chrome.storage.local.get('aiApiKey', r));
        if (resKey?.aiApiKey) apiKey = resKey.aiApiKey;
      }
      if (!modelName) {
        const resModel = await new Promise<any>((r) => chrome.storage.sync.get('aiModel', (s) => chrome.storage.local.get('aiModel', (l) => r({ ...s, ...l }))));
        if (resModel?.aiModel) modelName = resModel.aiModel;
      }
    } catch (e) {
      // Ignore read error
    }
  }

  if (apiKey) {
    try {
      const promptBuilder = PROMPT_TEMPLATES[intentId] || PROMPT_TEMPLATES.explain_in_context;
      const prompt = promptBuilder(term, targetLang, trimmed);
      const aiResponse = await callGeminiApi(prompt, apiKey, modelName || undefined, signal);

      if (intentId === 'sentence_breakdown') {
        const words = trimmed.split(/\s+/);
        const third = Math.ceil(words.length / 3);
        return {
          type: 'sentence_breakdown',
          query: trimmed,
          summary: aiResponse,
          structure: [
            { text: words.slice(0, third).join(' ') || 'Subject Clause', role: 'Subject Clause' },
            { text: words.slice(third, third * 2).join(' ') || 'Predicate Verb', role: 'Predicate Verb' },
            { text: words.slice(third * 2).join(' ') || 'Object Complement', role: 'Object Complement' },
          ],
          translation,
        };
      }

      return {
        type: intentId,
        query: term,
        summary: aiResponse,
        translation,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      console.warn('Gemini API call failed, falling back to rich offline analysis template:', err);
    }
  }

  // ── Offline Dynamic Multi-Section Fallback Templates ──────
  const isLong = trimmed.split(/\s+/).length > 4;

  if (intentId === 'sentence_breakdown') {
    const words = trimmed.split(/\s+/);
    const third = Math.ceil(words.length / 3);
    const seg1 = words.slice(0, third).join(' ') || 'Chủ ngữ / Cụm đầu';
    const seg2 = words.slice(third, third * 2).join(' ') || 'Động詞 / Cụm vị ngữ';
    const seg3 = words.slice(third * 2).join(' ') || 'Bổ ngữ / Tân ngữ';

    return {
      type: 'sentence_breakdown',
      query: trimmed,
      summary: `### Phân Tích Cú Pháp Câu\n• **Chủ ngữ / Mở đầu**: ${seg1}\n• **Vị ngữ / Hành động**: ${seg2}\n• **Bổ ngữ / Tân ngữ**: ${seg3}\n\n### Bản Dịch Ngữ Cảnh\n${translation}`,
      structure: [
        { text: seg1, role: 'Subject / Opening' },
        { text: seg2, role: 'Verb / Action' },
        { text: seg3, role: 'Object / Complement' },
      ],
      translation,
    };
  }

  if (intentId === 'explain_in_context') {
    return {
      type: intentId,
      query: term,
      summary: `### Ý Nghĩa Trong Ngữ Cảnh\nTrong câu này, cụm từ **"${term}"** mang nghĩa chính là: **${translation}**.\n\n### Ngữ Cảnh Gốc\n> "${trimmed}"\n\n### Ghi Chú Ngữ Pháp\nCụm từ được sử dụng như một thành phần nghĩa quan trọng trong câu.\n\n*(💡 Nhập Gemini API Key trong Cài đặt để nhận phân tích sâu real-time từ AI)*`,
      translation,
    };
  }

  if (intentId === 'grammar') {
    return {
      type: intentId,
      query: term,
      summary: `### Phân Tích Ngữ Pháp\n• **Cụm từ được chọn**: "${term}"\n• **Cấu trúc**: ${isLong ? 'Mệnh đề / Câu phức hợp' : 'Cụm danh từ / Động từ chính'}\n• **Bản dịch**: ${translation}\n\n### Ngữ Cảnh Xuất Hiện\n> "${trimmed}"\n\n*(💡 Nhập Gemini API Key trong Cài đặt để nhận phân tích ngữ pháp chi tiết từ AI)*`,
      translation,
    };
  }

  if (intentId === 'collocations') {
    return {
      type: intentId,
      query: term,
      summary: `### Cụm Từ & Collocations\n• **Cụm từ tra cứu**: "${term}"\n• **Bản dịch**: ${translation}\n\n### Sử Dụng Trong Câu\n> "${trimmed}"\n\n*(💡 Nhập Gemini API Key trong Cài đặt để khám phá danh sách Collocations phong phú từ AI)*`,
      translation,
    };
  }

  if (intentId === 'confusables') {
    return {
      type: intentId,
      query: term,
      summary: `### So Sánh Từ Cùng Loại\n• **Từ đang xét**: "${term}"\n• **Ý nghĩa cơ bản**: ${translation}\n\n### Xuất Hiện Trong Ngữ Cảnh\n> "${trimmed}"\n\n*(💡 Nhập Gemini API Key trong Cài đặt để nhận ma trận phân biệt từ dễ nhầm lẫn từ AI)*`,
      translation,
    };
  }

  if (intentId === 'rephrase') {
    return {
      type: intentId,
      query: term,
      summary: `### Văn Phong Gốc\n> "${trimmed}"\n\n### Dịch Tự Nhiên (${targetLang})\n${translation}\n\n*(💡 Nhập Gemini API Key trong Cài đặt để AI viết lại câu theo 3 văn phong: Đơn giản, Viện hàn & Bản ngữ)*`,
      translation,
    };
  }

  return {
    type: intentId,
    query: term,
    summary: `### Phân Tích AI\nNội dung cho "${term}": ${translation}`,
    translation,
  };
}
