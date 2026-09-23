import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const hostPermissions = [
  'https://api.dictionaryapi.dev/*',
  'https://translate.googleapis.com/*',
  'https://clients5.google.com/*',
  'https://*.wiktionary.org/*',
  'https://generativelanguage.googleapis.com/*',
  'https://libretranslate.com/*',
  'https://api.datamuse.com/*',
  'https://api.urbandictionary.com/*',
  'https://rhymebrain.com/*',
  'https://api.mymemory.translated.net/*',
];

export default defineConfig({
  srcDir: 'src',
  entrypointsDir: 'wxt-entrypoints',
  publicDir: 'public',
  imports: false,
  targetBrowsers: ['chrome', 'firefox'],
  manifestVersion: 3,
  suppressWarnings: {
    firefoxId: true,
  },
  manifest: ({ browser }) => ({
    name: 'Dictionary & AI Learning Assistant',
    version: '0.1.0',
    description: 'Modern dictionary and AI language learning workbench.',
    icons: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    action: {
      default_title: 'Dictionary Assistant',
      default_icon: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
        '48': 'icons/icon-48.png',
        '128': 'icons/icon-128.png',
      },
    },
    permissions: [
      'storage',
      'activeTab',
      'contextMenus',
      'scripting',
      ...(browser === 'chrome' ? ['offscreen'] : []),
    ],
    host_permissions: hostPermissions,
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    web_accessible_resources: [
      {
        resources: ['assets/overlay.css', 'assets/overlay-app.js', 'chunks/*.js'],
        matches: ['<all_urls>'],
      },
    ],
    commands: {
      'lookup-selection': {
        suggested_key: { default: 'Alt+L' },
        description: 'Look up the selected text',
      },
    },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'dictionary-ai-assistant@web-ext',
              strict_min_version: '140.0',
              data_collection_permissions: {
                required: ['websiteContent'],
              },
            },
            gecko_android: {
              strict_min_version: '142.0',
            },
          },
        }
      : {}),
  }),
  vite: () => ({
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(process.cwd(), 'src'),
      },
    },
  }),
  hooks: {
    'vite:build:extendConfig'(entrypoints, viteConfig) {
      if (!entrypoints.some((entrypoint) => entrypoint.type === 'unlisted-page' && entrypoint.name === 'overlay-app')) {
        return;
      }

      const output = viteConfig.build?.rollupOptions?.output;
      if (!output || Array.isArray(output)) return;
      const defaultEntryFileNames = output.entryFileNames;
      output.entryFileNames = (chunkInfo) => {
        if (chunkInfo.name === 'overlay-app') return 'assets/overlay-app.js';
        if (typeof defaultEntryFileNames === 'function') return defaultEntryFileNames(chunkInfo);
        return defaultEntryFileNames || '[name].js';
      };
    },
  },
  zip: {
    artifactTemplate: '{{name}}-{{version}}-{{browser}}.zip',
    excludeSources: ['dist/**', 'dist-firefox/**'],
  },
});
