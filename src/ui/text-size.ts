import type { CSSProperties } from 'react';
import type { TextSizePreference } from '@/types';

export const TEXT_SIZE_PRESETS: Record<
  TextSizePreference,
  { fontSize: string; ui: string; reading: string; zoom: string }
> = {
  small: { fontSize: '13.5px', ui: '0.8125rem', reading: '0.9375rem', zoom: '0.92' },
  comfortable: { fontSize: '15px', ui: '0.875rem', reading: '1.03125rem', zoom: '1' },
  large: { fontSize: '16.5px', ui: '0.95rem', reading: '1.15rem', zoom: '1.08' },
};

export function getTextSizeStyle(size?: TextSizePreference): CSSProperties {
  const preset = TEXT_SIZE_PRESETS[size || 'comfortable'];
  return {
    fontSize: preset.fontSize,
    '--font-size-ui': preset.ui,
    '--font-size-reading': preset.reading,
    '--workbench-zoom': preset.zoom,
  } as CSSProperties;
}
