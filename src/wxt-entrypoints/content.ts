import { defineContentScript } from 'wxt/utils/define-content-script';
import { startContentScript } from '../entrypoints/content-script/bootstrap';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'manual',
  main() {
    startContentScript();
  },
});
