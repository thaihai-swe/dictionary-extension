export function normalizeDictionaryTerm(text: string): string {
  const trimmed = String(text || '').trim();
  return trimmed.replace(/^[^a-zA-Z]+|[^a-zA-Z' -]+$/g, '') || trimmed;
}

const LEMMA_STOPWORDS = new Set([
  'is', 'was', 'has', 'his', 'its', 'this', 'thus', 'yes', 'news', 'series', 'species', 'corpus', 'chaos', 'bias', 'alias', 'lens', 'bus',
]);

const IRREGULAR_LEMMA_MAP: Record<string, string> = {
  am: 'be', are: 'be', been: 'be', being: 'be', was: 'be', were: 'be',
  went: 'go', gone: 'go', going: 'go',
  did: 'do', done: 'do', doing: 'do',
  had: 'have', having: 'have',
  got: 'get', gotten: 'get', getting: 'get',
  made: 'make', making: 'make',
  ran: 'run', running: 'run',
  came: 'come', coming: 'come',
  became: 'become', becoming: 'become',
  begun: 'begin', began: 'begin', beginning: 'begin',
  bought: 'buy', brought: 'bring', built: 'build', caught: 'catch',
  chose: 'choose', chosen: 'choose',
  drank: 'drink', drunk: 'drink',
  drove: 'drive', driven: 'drive',
  ate: 'eat', eaten: 'eat',
  fell: 'fall', fallen: 'fall',
  felt: 'feel', fought: 'fight', found: 'find',
  flew: 'fly', flown: 'fly',
  forgot: 'forget', forgotten: 'forget',
  forgave: 'forgive', forgiven: 'forgive',
  froze: 'freeze', frozen: 'freeze',
  gave: 'give', given: 'give',
  grew: 'grow', grown: 'grow',
  knew: 'know', known: 'know',
  left: 'leave', lost: 'lose',
  lay: 'lie', lain: 'lie',
  led: 'lead', lent: 'lend', meant: 'mean', met: 'meet', paid: 'pay',
  rode: 'ride', ridden: 'ride',
  rang: 'ring', rung: 'ring',
  rose: 'rise', risen: 'rise',
  saw: 'see', seen: 'see',
  sold: 'sell', sent: 'send',
  shook: 'shake', shaken: 'shake',
  shot: 'shoot', showed: 'show', shown: 'show',
  sang: 'sing', sung: 'sing',
  sank: 'sink', sunk: 'sink',
  sat: 'sit', slept: 'sleep',
  spoke: 'speak', spoken: 'speak',
  spent: 'spend', stood: 'stand',
  stole: 'steal', stolen: 'steal',
  stuck: 'stick',
  swimming: 'swim', swam: 'swim', swum: 'swim',
  winning: 'win',
  taking: 'take', took: 'take', taken: 'take',
  taught: 'teach', tore: 'tear', torn: 'tear', told: 'tell',
  thought: 'think', threw: 'throw', thrown: 'throw',
  understood: 'understand',
  woke: 'wake', woken: 'wake',
  wore: 'wear', worn: 'wear',
  won: 'win',
  wrote: 'write', written: 'write',
  children: 'child', feet: 'foot', geese: 'goose', mice: 'mouse',
  men: 'man', women: 'woman', teeth: 'tooth',
  better: 'good', best: 'good', worse: 'bad', worst: 'bad',
  farther: 'far', farthest: 'far', further: 'far', furthest: 'far',
  criteria: 'criterion', phenomena: 'phenomenon',
  analyses: 'analysis', hypotheses: 'hypothesis',
};

function uniquePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    const cleaned = String(item || '').trim().toLowerCase();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    output.push(cleaned);
  }
  return output;
}

function shouldDoubleFinalConsonant(lemma: string): boolean {
  return lemma.length >= 3
    && lemma.length <= 6
    && /[^aeiou][aeiou][^aeiouwxy]$/.test(lemma);
}

function regularInflections(lemma: string): string[] {
  const forms = [lemma];
  if (lemma.endsWith('y') && lemma.length > 2 && !/[aeiou]y$/.test(lemma)) {
    forms.push(`${lemma.slice(0, -1)}ies`);
  } else if (/(?:s|x|z|ch|sh)$/.test(lemma)) {
    forms.push(`${lemma}es`);
  } else if (!lemma.endsWith('s')) {
    forms.push(`${lemma}s`);
  }

  if (lemma.endsWith('e') && lemma.length > 2) {
    forms.push(`${lemma}d`, `${lemma.slice(0, -1)}ing`);
  } else if (lemma.endsWith('y') && lemma.length > 2 && !/[aeiou]y$/.test(lemma)) {
    forms.push(`${lemma.slice(0, -1)}ied`, `${lemma}ing`);
  } else if (shouldDoubleFinalConsonant(lemma)) {
    const doubled = `${lemma}${lemma.slice(-1)}`;
    forms.push(`${doubled}ed`, `${doubled}ing`);
  } else {
    forms.push(`${lemma}ed`, `${lemma}ing`);
  }

  return forms;
}

export function getEnglishLemmaCandidates(text: string): string[] {
  const raw = normalizeDictionaryTerm(String(text || '')).trim().toLowerCase();
  if (!raw || raw.length < 3 || /\s/.test(raw) || !/^[a-z]+(-[a-z]+)?$/i.test(raw)) {
    return [];
  }

  if (LEMMA_STOPWORDS.has(raw)) return [];

  const irregularLemma = IRREGULAR_LEMMA_MAP[raw];
  if (irregularLemma && irregularLemma !== raw) {
    return [irregularLemma];
  }

  const candidates: string[] = [];
  const len = raw.length;

  if (raw.endsWith('ies') && len > 4) {
    candidates.push(raw.slice(0, -3) + 'y');
  } else if (raw.endsWith('es') && len > 4) {
    if (/(ses|xes|zes|ches|shes)$/.test(raw)) {
      candidates.push(raw.slice(0, -2));
    } else {
      candidates.push(raw.slice(0, -1));
      candidates.push(raw.slice(0, -2));
    }
  } else if (raw.endsWith('s') && !raw.endsWith('ss') && len > 3) {
    candidates.push(raw.slice(0, -1));
  }

  if (raw.endsWith('ing') && len > 5) {
    const stem = raw.slice(0, -3);
    if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
      candidates.push(stem.slice(0, -1));
    } else {
      candidates.push(stem + 'e');
      if (stem.length > 3) candidates.push(stem);
    }
  }

  if (raw.endsWith('ied') && len > 4) {
    candidates.push(raw.slice(0, -3) + 'y');
  } else if (raw.endsWith('ed') && len > 4) {
    const stem = raw.slice(0, -2);
    if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
      candidates.push(stem.slice(0, -1));
    } else {
      candidates.push(stem + 'e');
      if (stem.length > 3) candidates.push(stem);
    }
  }

  if (raw.endsWith('ier') && len > 4) {
    candidates.push(raw.slice(0, -3) + 'y');
  } else if (raw.endsWith('iest') && len > 5) {
    candidates.push(raw.slice(0, -4) + 'y');
  } else if (raw.endsWith('er') && len > 4) {
    const stem = raw.slice(0, -2);
    if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
      candidates.push(stem.slice(0, -1));
    } else {
      candidates.push(raw.slice(0, -1));
      candidates.push(stem);
    }
  } else if (raw.endsWith('est') && len > 5) {
    const stem = raw.slice(0, -3);
    if (/(bb|dd|gg|mm|nn|pp|rr|tt)$/.test(stem)) {
      candidates.push(stem.slice(0, -1));
    } else {
      candidates.push(raw.slice(0, -2));
      candidates.push(stem);
    }
  }

  return [...new Set(candidates.filter((candidate) => candidate && candidate !== raw && candidate.length >= 2))];
}

export function getEnglishLemma(text: string): string {
  const raw = normalizeDictionaryTerm(String(text || '')).trim().toLowerCase();
  if (!raw) return '';
  const irregularLemma = IRREGULAR_LEMMA_MAP[raw];
  if (irregularLemma) return irregularLemma;

  const candidates = uniquePreserveOrder([raw, ...getEnglishLemmaCandidates(raw)]);
  const matching = candidates.filter((candidate) => regularInflections(candidate).includes(raw));
  if (matching.length) {
    return matching.reduce((best, item) => (item.length < best.length ? item : best));
  }
  return getEnglishLemmaCandidates(raw)[0] || raw;
}

export function prefersLemmaHeadword(text: string): boolean {
  const raw = normalizeDictionaryTerm(String(text || '')).trim().toLowerCase();
  if (!raw || /\s/.test(raw)) return false;
  const lemma = getEnglishLemma(raw);
  return Boolean(lemma && lemma !== raw);
}
