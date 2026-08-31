export const SETTINGS_SCHEMA_VERSION = 11;

export const SECRET_SETTING_KEYS = [
  'aiApiKey',
  'dictionaryApiKey',
  'wordnikApiKey',
  'wordsApiKey',
  'libreTranslateApiKey',
] as const;

export const SECRET_KEYS = new Set<string>(SECRET_SETTING_KEYS);

export function stripSecretRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Record<string, unknown> = { ...input };
  for (const key of SECRET_SETTING_KEYS) delete output[key];
  return output as Partial<T>;
}
