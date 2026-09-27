import { useEffect, useState } from 'react';
import { saveSettingsToStorage, useSetting } from '@/composables/composable.storage';
import { useAppTheme } from '@/ui/theme';
import { getTextSizeStyle } from '@/ui/text-size';
import type { AppTheme, DictionaryProviderId } from '@/types';

export function useWorkbenchPreferences(options?: {
  targetLang?: string;
  syncDocumentTheme?: boolean;
}) {
  const settingsTheme = useSetting('theme');
  const textSize = useSetting('textSize');
  const settingsProvider = useSetting('dictionaryProvider');
  const settingsTargetLang = useSetting('translateTargetLanguage');
  const [theme, setTheme] = useState<AppTheme>(settingsTheme);
  const [provider, setProvider] = useState<string>(settingsProvider || 'wiktionary');
  const [targetLang, setTargetLang] = useState<string>(
    options?.targetLang || settingsTargetLang || 'Vietnamese',
  );
  const { isDarkMode, toggleTheme } = useAppTheme(theme, {
    syncDocument: options?.syncDocumentTheme,
    onThemeChange: setTheme,
    saveSettings: (partial) => {
      void saveSettingsToStorage(partial);
    },
  });

  useEffect(() => {
    if (settingsProvider) setProvider(settingsProvider);
  }, [settingsProvider]);

  useEffect(() => {
    if (options?.targetLang) setTargetLang(options.targetLang);
    else if (settingsTargetLang) setTargetLang(settingsTargetLang);
  }, [options?.targetLang, settingsTargetLang]);

  useEffect(() => {
    setTheme(settingsTheme);
  }, [settingsTheme]);

  const handleSetProvider = (nextProvider: string) => {
    setProvider(nextProvider);
    if (nextProvider) {
      void saveSettingsToStorage({ dictionaryProvider: nextProvider as DictionaryProviderId });
    }
  };

  const handleSetTargetLang = (nextLang: string) => {
    setTargetLang(nextLang);
    if (nextLang) {
      void saveSettingsToStorage({ translateTargetLanguage: nextLang });
    }
  };

  return {
    isDarkMode,
    provider,
    setProvider: handleSetProvider,
    targetLang,
    setTargetLang: handleSetTargetLang,
    toggleTheme,
    textSize,
    textSizeStyle: getTextSizeStyle(textSize),
  };
}
