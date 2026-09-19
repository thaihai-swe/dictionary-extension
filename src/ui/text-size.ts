import type { CSSProperties } from 'react';
import type { TextSizePreference } from '@/types';

const TEXT_SIZE_PRESETS: Record<TextSizePreference, { ui: string; reading: string }> = {
  small: { ui: '1rem', reading: '1.0625rem' },
  comfortable: { ui: '1.0625rem', reading: '1.125rem' },
  large: { ui: '1.125rem', reading: '1.25rem' },
};

export function getTextSizeStyle(size?: TextSizePreference): CSSProperties {
  const preset = TEXT_SIZE_PRESETS[size || 'comfortable'];
  return {
    '--font-size-ui': preset.ui,
    '--font-size-reading': preset.reading,
  } as CSSProperties;
}
