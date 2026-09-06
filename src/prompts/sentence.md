Analyze the supplied sentence for an English language learner.
Selected query: {{str}}
Sentence to analyze:
"""
{{sentence}}
"""
Target language: {{targetLang}}

Language policy:
{{languagePolicy}}

Return only one valid JSON object. Do not wrap it in Markdown or add commentary.
Use this exact shape:
{
  "sentence": "the sentence being analyzed",
  "translation": "translation into the target language",
  "parts": [{"text": "exact text", "role": "subject|verb phrase|object|modifier|clause|other", "explanation": "short English explanation"}],
  "phrases": [{"text": "exact phrase from the sentence", "type": "phrasal_verb|idiom|collocation|fixed_expression", "meaning": "learner-friendly English meaning", "role": "grammatical function", "example": "short example"}]
}

Rules:
- Analyze only the supplied sentence; never invent surrounding text.
- Write grammatical role explanations and phrase meanings in English. Provide the full-sentence translation in {{targetLang}}.
- Identify the selected query when it appears in the sentence.
- Include only phrases that appear exactly or nearly exactly in the supplied sentence.
- Return an empty phrases array when no phrasal verb, idiom, collocation, or fixed expression is present.
- Do not return learner mistakes, usage notes, or extra commentary; Grammar owns those.
- Keep each explanation concise and suitable for a language learner.
