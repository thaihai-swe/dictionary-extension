import React from 'react';
import { createRoot } from 'react-dom/client';
import ToolbarPopupApp from './app.toolbar-popup';
import '@/assets/main.css';

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ToolbarPopupApp />
    </React.StrictMode>,
  );
}
