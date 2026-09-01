import React, { useMemo } from 'react';
import { ConfusablePair } from '../types';

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
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
        <span>⚠️</span>
        <span>USAGE &amp; REGISTER NOTES</span>
      </div>
      <ul className="space-y-1 text-xs text-slate-200">
        {warningItems.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
        {pairs?.map((pair) => (
          <li key={pair.word}>
            <strong>
              Confused with <em>{pair.word}</em>:
            </strong>{' '}
            {pair.distinction}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsageNotesCard;
