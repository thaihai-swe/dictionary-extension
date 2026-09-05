export const KNOWN_LANGUAGE_MAPPINGS = [
  { name: 'English', code: 'en' },
  { name: 'Vietnamese', code: 'vi' },
  { name: 'Spanish', code: 'es' },
  { name: 'French', code: 'fr' },
  { name: 'German', code: 'de' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Korean', code: 'ko' },
  { name: 'Chinese (Simplified)', code: 'zh-CN' },
  { name: 'Chinese (Traditional)', code: 'zh-TW' },
  { name: 'Italian', code: 'it' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'Russian', code: 'ru' },
  { name: 'Thai', code: 'th' },
  { name: 'Indonesian', code: 'id' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Arabic', code: 'ar' },
] as const;

const CODE_ALIASES: Record<string, string> = {
  vn: 'vi',
  jp: 'ja',
  kr: 'ko',
  cn: 'zh-CN',
  tw: 'zh-TW',
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
};

const NAME_ALIASES: Record<string, string> = {
  chinese: 'Chinese (Simplified)',
  'chinese simplified': 'Chinese (Simplified)',
  'chinese traditional': 'Chinese (Traditional)',
};

export function resolveLanguageCode(value: string | undefined): string {
  const raw = String(value || '').trim().replace(/\s+/g, ' ');
  if (!raw) return 'en';

  const lower = raw.toLowerCase();
  if (CODE_ALIASES[lower]) return CODE_ALIASES[lower];

  const byCode = KNOWN_LANGUAGE_MAPPINGS.find((item) => item.code.toLowerCase() === lower);
  if (byCode) return byCode.code;

  const aliasName = NAME_ALIASES[lower];
  if (aliasName) {
    const aliased = KNOWN_LANGUAGE_MAPPINGS.find((item) => item.name === aliasName);
    if (aliased) return aliased.code;
  }

  const byName = KNOWN_LANGUAGE_MAPPINGS.find((item) => item.name.toLowerCase() === lower);
  if (byName) return byName.code;

  if (/^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(raw)) {
    if (lower === 'zh-cn') return 'zh-CN';
    if (lower === 'zh-tw') return 'zh-TW';
    return lower;
  }

  return raw;
}

export function resolveLanguageName(value: string | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return 'English';
  const code = resolveLanguageCode(raw);
  const byCode = KNOWN_LANGUAGE_MAPPINGS.find((item) => item.code.toLowerCase() === code.toLowerCase());
  if (byCode) return byCode.name;
  const byName = KNOWN_LANGUAGE_MAPPINGS.find((item) => item.name.toLowerCase() === raw.toLowerCase());
  return byName?.name || raw;
}
