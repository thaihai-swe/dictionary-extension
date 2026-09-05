import React from 'react';
import { useToast } from '@/composables/composable.toast';
import { IconCheck } from './icons';

export const ToastContainer: React.FC = () => {
  const message = useToast();

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface/95 dark:bg-[#161a23]/95 text-content text-[12px] font-medium border border-border dark:border-gold-300/35 shadow-card-elevated backdrop-blur-md transition-all select-none"
    >
      <IconCheck className="w-3.5 h-3.5 text-teal-600 dark:text-gold-300 flex-shrink-0" />
      <span className="whitespace-nowrap">{message}</span>
    </div>
  );
};

export default ToastContainer;
