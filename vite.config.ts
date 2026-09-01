import { defineConfig, build as viteBuild, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';

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
          cssCodeSplit: true,
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
              assetFileNames: (assetInfo) => {
                if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                  return 'overlay.css';
                }
                return 'overlay-[name]-[hash][extname]';
              },
            },
          },
        },
      });

      const overlayCssParts: string[] = [];
      const assetsDir = resolve(__dirname, 'dist/assets');
      if (existsSync(assetsDir)) {
        const mainCss = readdirSync(assetsDir).find((name) => /^main-.*\.css$/.test(name));
        if (mainCss) overlayCssParts.push(readFileSync(resolve(assetsDir, mainCss), 'utf8'));
      }
      const distDir = resolve(__dirname, 'dist');
      for (const name of readdirSync(distDir)) {
        if ((name === 'overlay.css' || (name.startsWith('overlay-') && name.endsWith('.css'))) && existsSync(resolve(distDir, name))) {
          overlayCssParts.push(readFileSync(resolve(distDir, name), 'utf8'));
        }
      }
      if (overlayCssParts.length) {
        // Root-absolute /fonts/ URLs resolve against the host page, not the extension.
        // Overlay CSS is loaded from chrome-extension://id/overlay.css, so relative fonts/ works.
        const combinedCss = overlayCssParts.join('\n').replace(/url\((['"]?)\/fonts\//g, 'url($1fonts/');
        writeFileSync(resolve(distDir, 'overlay.css'), combinedCss);
      }

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
        options: resolve(__dirname, 'options.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
