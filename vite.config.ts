import { defineConfig, build as viteBuild, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync, existsSync } from 'fs';

function buildContentScriptPlugin(): Plugin {
  return {
    name: 'build-content-script',
    async closeBundle() {
      await viteBuild({
        configFile: false,
        plugins: [vue()],
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
        resolve: {
          alias: { '@': resolve(__dirname, 'src') },
        },
        build: {
          write: true,
          outDir: 'dist',
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/content/script.content-script.ts'),
            name: 'ContentScript',
            formats: ['iife'],
            fileName: () => 'content-script.js',
          },
        },
      });

      if (existsSync('manifest.json')) {
        copyFileSync('manifest.json', 'dist/manifest.json');
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), buildContentScriptPlugin()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background/worker.service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'service-worker.js';
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
