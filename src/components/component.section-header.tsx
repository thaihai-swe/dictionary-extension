import React from 'react';
import { cx } from '@/ui/cx';

export interface SectionHeaderProps {
  title: string;
  icon?: React.FC<{ className?: string }>;
  eyebrow?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon: Icon,
  eyebrow,
  badge,
  action,
  className,
}) => {
  return (
    <div
      className={cx(
        'flex items-center justify-between pb-1.5 border-b border-border/70 gap-2',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {Icon ? <Icon className="w-3.5 h-3.5 text-accent shrink-0" /> : null}
        <h3 className="text-[12.5px] font-bold text-content uppercase tracking-wider font-mono truncate">
          {title}
        </h3>
        {badge}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {eyebrow ? (
          <span className="text-[11.5px] text-content-muted font-mono">{eyebrow}</span>
        ) : null}
        {action}
      </div>
    </div>
  );
};

export default SectionHeader;
