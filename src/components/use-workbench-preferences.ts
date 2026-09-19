import { useEffect, useState } from 'react';
import { useSetting } from '@/composables/composable.storage';
import { useAppTheme } from '@/ui/theme';
import { getTextSizeStyle } from '@/ui/text-size';
import type { AppTheme } from '@/types';

export function useWorkbenchPreferences(options?: {
  targetLang?: string;
  syncDocumentTheme?: boolean;
}) {
  const settingsTheme = useSetting('theme');
  const textSize = useSetting('textSize');
  const settingsProvider = useSetting('dictionaryProvider');
  const settingsTargetLang = useSetting('translateTargetLanguage');
  const [theme, setTheme] = useState<AppTheme>(settingsTheme);
  const [provider, setProvider] = useState(settingsProvider || 'wiktionary');
  const [targetLang, setTargetLang] = useState(
    options?.targetLang || settingsTargetLang || 'Vietnamese',
  );
  const { isDarkMode, toggleTheme } = useAppTheme(theme, {
    syncDocument: options?.syncDocumentTheme,
    onThemeChange: setTheme,
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

  return {
    isDarkMode,
    provider,
    setProvider,
    targetLang,
    setTargetLang,
    toggleTheme,
    textSizeStyle: getTextSizeStyle(textSize),
  };
}
