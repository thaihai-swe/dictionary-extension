import { createApp } from 'vue';
import ContentScriptApp from './app.content-script.vue';
import styleText from '../assets/main.css?inline';

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

  createApp(ContentScriptApp).mount(appMount);
})();
