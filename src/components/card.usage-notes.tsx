import React, { useMemo } from 'react';
import { ConfusablePair } from '../types';
import { IconAlertTriangle } from './icons';

interface UsageNotesCardProps {
  notes?: string;
  warnings?: string[];
  pairs?: ConfusablePair[];
}

export const UsageNotesCard: React.FC<UsageNotesCardProps> = ({ notes, warnings, pairs }) => {
  const warningItems = useMemo(() => {
    if (warnings?.length) return warnings.filter((item) => item.trim());
    return notes?.trim() ? [notes.trim()] : [];
  }, [notes, warnings]);

  const hasData = Boolean(warningItems.length || pairs?.length);
  if (!hasData) return null;

  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/6 p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
        <IconAlertTriangle className="w-3.5 h-3.5" />
        <span>Usage &amp; Register</span>
      </div>
      <ul className="space-y-1 text-[13px] leading-relaxed text-content-secondary">
        {warningItems.map((warning) => (
          <li key={warning} className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
            <span>{warning}</span>
          </li>
        ))}
        {pairs?.map((pair) => (
          <li key={pair.word} className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
            <span>
              <strong>
                Confused with <em className="text-teal-700 dark:text-teal-300 not-italic font-semibold">{pair.word}</em>:
              </strong>{' '}
              {pair.distinction}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsageNotesCard;
