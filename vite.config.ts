import { defineConfig, build as viteBuild, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync, existsSync } from 'fs';

function buildExtensionScriptsPlugin(): Plugin {
  return {
    name: 'build-extension-scripts',
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
            entry: resolve(__dirname, 'src/entrypoints/background/service-worker.ts'),
            name: 'DictionaryServiceWorker',
            formats: ['iife'],
            fileName: () => 'service-worker.js',
          },
          rollupOptions: {
            output: {
              inlineDynamicImports: true,
            },
          },
        },
      });

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
            entry: resolve(__dirname, 'src/entrypoints/content-script/bootstrap.ts'),
            name: 'ContentScriptBootstrap',
            formats: ['iife'],
            fileName: () => 'content-script.js',
          },
        },
      });

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
          cssCodeSplit: false,
          lib: {
            entry: resolve(__dirname, 'src/entrypoints/content-script/overlay-app.ts'),
            name: 'DictionaryOverlay',
            formats: ['es'],
            fileName: () => 'overlay.js',
          },
          rollupOptions: {
            output: {
              inlineDynamicImports: false,
              chunkFileNames: 'overlay-[name]-[hash].js',
              assetFileNames: 'overlay-[name]-[hash][extname]',
            },
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
  plugins: [vue(), buildExtensionScriptsPlugin()],
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
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
