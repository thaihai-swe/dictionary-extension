import { defineBackground } from 'wxt/utils/define-background';
import { startServiceWorker } from '../entrypoints/background/service-worker';

export default defineBackground(() => {
  startServiceWorker();
});
