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
      className="glass-toast absolute bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-2xl text-content text-[13px] font-medium transition-all select-none"
    >
      <IconCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />
      <span className="whitespace-nowrap">{message}</span>
    </div>
  );
};

export default ToastContainer;
