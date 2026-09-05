export const SETTINGS_SCHEMA_VERSION = 12;

export const SECRET_SETTING_KEYS = [
  'aiApiKey',
  'libreTranslateApiKey',
] as const;

export const SECRET_KEYS = new Set<string>(SECRET_SETTING_KEYS);

export function stripSecretRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Record<string, unknown> = { ...input };
  for (const key of SECRET_SETTING_KEYS) delete output[key];
  return output as Partial<T>;
}

export function shouldPersistSecretValue(value: unknown, _hydrated = false): boolean {
  return Boolean(String(value ?? '').trim());
}

export function hasConfiguredAiApiKey(settings?: { hasAiApiKey?: unknown; aiApiKey?: unknown } | null): boolean {
  const record = settings || {};
  return Boolean(record.hasAiApiKey) || Boolean(String(record.aiApiKey ?? '').trim());
}

export function mergePublicSettings(
  syncData?: Record<string, unknown> | null,
  localFlags?: Record<string, unknown> | null,
): Record<string, unknown> {
  const publicData = stripSecretRecord({ ...(syncData || {}) }) as Record<string, unknown>;
  const local = localFlags || {};
  if (Object.prototype.hasOwnProperty.call(local, 'hasAiApiKey')) {
    publicData.hasAiApiKey = Boolean(local.hasAiApiKey);
  } else {
    publicData.hasAiApiKey = Boolean(publicData.hasAiApiKey);
  }
  return publicData;
}

export function mergeStoredSettings(
  syncData?: Record<string, unknown> | null,
  localData?: Record<string, unknown> | null,
): Record<string, unknown> {
  const sync = syncData || {};
  const local = localData || {};
  const merged: Record<string, unknown> = { ...sync, ...local };
  for (const key of SECRET_SETTING_KEYS) {
    const localVal = local[key];
    const syncVal = sync[key];
    if (!String(localVal ?? '').trim() && String(syncVal ?? '').trim()) {
      merged[key] = syncVal;
    }
  }
  return merged;
}
