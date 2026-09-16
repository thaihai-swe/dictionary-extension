import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canInjectIntoUrl,
  isExtensionPage,
  isExtensionProtocol,
} from '../src/shared/ext.ts';

test('isExtensionProtocol is true for chrome-extension and moz-extension', () => {
  assert.equal(isExtensionProtocol('chrome-extension:'), true);
  assert.equal(isExtensionProtocol('moz-extension:'), true);
  assert.equal(isExtensionProtocol('https:'), false);
  assert.equal(isExtensionProtocol('http:'), false);
  assert.equal(isExtensionProtocol(''), false);
  assert.equal(isExtensionProtocol(null), false);
});

test('isExtensionPage is false outside a browser window', () => {
  assert.equal(isExtensionPage(), false);
});

test('canInjectIntoUrl blocks restricted Chrome and Firefox pages', () => {
  assert.equal(canInjectIntoUrl('https://example.com/article'), true);
  assert.equal(canInjectIntoUrl('http://localhost:3000'), true);
  assert.equal(canInjectIntoUrl('about:blank'), false);
  assert.equal(canInjectIntoUrl('about:debugging'), false);
  assert.equal(canInjectIntoUrl('chrome://extensions'), false);
  assert.equal(canInjectIntoUrl('chrome-extension://abc/index.html'), false);
  assert.equal(canInjectIntoUrl('moz-extension://abc/index.html'), false);
  assert.equal(canInjectIntoUrl('https://chromewebstore.google.com/detail/foo'), false);
  assert.equal(canInjectIntoUrl('https://addons.mozilla.org/en-US/firefox/addon/foo'), false);
  assert.equal(canInjectIntoUrl(''), false);
  assert.equal(canInjectIntoUrl(undefined), false);
});
