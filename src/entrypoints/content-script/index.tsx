import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentScriptApp from './app.content-script';
import styleText from '@/assets/main.css?inline';

(function initContentScript() {
  if (document.getElementById('dictionary-extension-root')) return;

  const container = document.createElement('div');
  container.id = 'dictionary-extension-root';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = styleText;
  shadow.appendChild(styleEl);

  const appMount = document.createElement('div');
  appMount.id = 'app';
  shadow.appendChild(appMount);

  const root = createRoot(appMount);
  root.render(
    <React.StrictMode>
      <ContentScriptApp />
    </React.StrictMode>,
  );
})();
