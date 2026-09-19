import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

test('domain code remains independent from runtime and presentation layers', () => {
  for (const path of sourceFiles('src/domain')) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /from ['"].*(application|infrastructure|providers|features|components|entrypoints)/, path);
  }
});

test('application code depends on ports rather than concrete adapters', () => {
  for (const path of sourceFiles('src/application')) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /from ['"].*(infrastructure|providers)\//, path);
  }
});

test('presentation uses selector storage hooks instead of the broad compatibility hook', () => {
  for (const directory of ['src/components', 'src/features', 'src/entrypoints']) {
    for (const path of sourceFiles(directory)) {
      const source = readFileSync(path, 'utf8');
      assert.doesNotMatch(source, /\buseStorage\s*\(/, path);
    }
  }
});

test('popup surfaces share the workbench content renderer', () => {
  for (const path of [
    'src/entrypoints/toolbar-popup/app.toolbar-popup.tsx',
    'src/entrypoints/content-script/overlay.in-page.tsx',
  ]) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /component\.workbench-content/, path);
    assert.doesNotMatch(source, /features\/(dictionary|ai-assistant|rewriter)/, path);
  }
});

