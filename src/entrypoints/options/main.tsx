import React from 'react';
import { createRoot } from 'react-dom/client';
import SettingsModal from '@/features/settings/SettingsModal';
import '@/assets/main.css';

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <SettingsModal />
    </React.StrictMode>,
  );
}
