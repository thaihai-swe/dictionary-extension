export interface ResultSectionItem {
  text: string;
  translation?: string;
}

interface ResultDefinitionLike {
  example?: string;
  exampleTranslation?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface ResultMeaningLike {
  definitions?: ResultDefinitionLike[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface ResultEntryLike {
  meanings?: ResultMeaningLike[];
  examples?: ResultSectionItem[];
  synonyms?: ResultSectionItem[];
  antonyms?: ResultSectionItem[];
}

export interface SecondaryResultSections {
  examples: ResultSectionItem[];
  synonyms: ResultSectionItem[];
  antonyms: ResultSectionItem[];
}

function normalizeExample(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/["“”'‘’.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTerm(value?: string): string {
  return String(value || '').toLowerCase().trim();
}

export function collectSecondaryResultSections(result?: ResultEntryLike | null): SecondaryResultSections {
  const examples: ResultSectionItem[] = [];
  const synonyms: ResultSectionItem[] = [];
  const antonyms: ResultSectionItem[] = [];
  const seenExamples = new Set<string>();
  const seenSynonyms = new Set<string>();
  const seenAntonyms = new Set<string>();

  const addExample = (item?: ResultSectionItem) => {
    const normalized = normalizeExample(item?.text);
    if (!normalized || seenExamples.has(normalized)) return;
    seenExamples.add(normalized);
    examples.push({ text: String(item?.text || ''), translation: item?.translation });
  };
  const addTerm = (list: ResultSectionItem[], seen: Set<string>, value?: string) => {
    const normalized = normalizeTerm(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    list.push({ text: String(value || '') });
  };

  for (const [meaningIndex, meaning] of (result?.meanings || []).entries()) {
    for (const [definitionIndex, definition] of (meaning.definitions || []).entries()) {
      // The first definition's attached example stays beside the primary sense.
      if (definition.example) {
        const primaryExample = { text: definition.example, translation: definition.exampleTranslation };
        if (meaningIndex === 0 && definitionIndex === 0) {
          seenExamples.add(normalizeExample(definition.example));
        } else {
          addExample(primaryExample);
        }
      }
      for (const value of definition.synonyms || []) addTerm(synonyms, seenSynonyms, value);
      for (const value of definition.antonyms || []) addTerm(antonyms, seenAntonyms, value);
    }
    for (const value of meaning.synonyms || []) addTerm(synonyms, seenSynonyms, value);
    for (const value of meaning.antonyms || []) addTerm(antonyms, seenAntonyms, value);
  }

  for (const item of result?.examples || []) addExample(item);
  for (const item of result?.synonyms || []) addTerm(synonyms, seenSynonyms, item.text);
  for (const item of result?.antonyms || []) addTerm(antonyms, seenAntonyms, item.text);

  return { examples, synonyms, antonyms };
}
