export type BootSettings = {
  theme: string;
  textSize: string;
  dockPosition: 'none' | 'left' | 'right';
  selectionTriggerMode: 'off' | 'icon' | 'direct';
  postSelectionModifier: 'shift' | 'alt' | 'ctrl';
  pausedHostnames: string[];
  popupWidth: number;
  popupHeight: number;
  disablePageContextExtraction: boolean;
};

export const BOOT_DEFAULTS: BootSettings = {
  theme: 'dark',
  textSize: 'comfortable',
  dockPosition: 'none',
  selectionTriggerMode: 'icon',
  postSelectionModifier: 'shift',
  pausedHostnames: [],
  popupWidth: 1000,
  popupHeight: 900,
  disablePageContextExtraction: false,
};

export function normalizeHostnames(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  return typeof value === 'string' && value.trim()
    ? value.split('\n').map((item) => item.trim().toLowerCase()).filter(Boolean)
    : [];
}

export function normalizeBootSettings(stored: Record<string, unknown>): BootSettings {
  const mode = stored.selectionTriggerMode;
  const modifier = stored.postSelectionModifier;
  const dock = stored.dockPosition;
  return {
    theme: String(stored.theme || BOOT_DEFAULTS.theme),
    textSize: String(stored.textSize || BOOT_DEFAULTS.textSize),
    dockPosition: dock === 'left' || dock === 'right' ? dock : 'none',
    selectionTriggerMode: mode === 'off' || mode === 'direct' || mode === 'icon' ? mode : BOOT_DEFAULTS.selectionTriggerMode,
    postSelectionModifier: modifier === 'alt' || modifier === 'ctrl' || modifier === 'shift' ? modifier : BOOT_DEFAULTS.postSelectionModifier,
    pausedHostnames: normalizeHostnames(stored.pausedHostnames),
    popupWidth: Number(stored.popupWidth) || BOOT_DEFAULTS.popupWidth,
    popupHeight: Number(stored.popupHeight) || BOOT_DEFAULTS.popupHeight,
    disablePageContextExtraction: Boolean(stored.disablePageContextExtraction),
  };
}

export async function loadBootSettings(): Promise<BootSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage) return { ...BOOT_DEFAULTS };
  try {
    const [syncStored, localStored] = await Promise.all([
      chrome.storage.sync?.get ? chrome.storage.sync.get(BOOT_DEFAULTS).catch(() => ({})) : Promise.resolve({}),
      chrome.storage.local?.get ? chrome.storage.local.get(BOOT_DEFAULTS).catch(() => ({})) : Promise.resolve({}),
    ]);
    const stored = { ...BOOT_DEFAULTS, ...(localStored || {}), ...(syncStored || {}) };
    return normalizeBootSettings(stored);
  } catch {
    return { ...BOOT_DEFAULTS };
  }
}
