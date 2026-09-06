import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAiIntentPreloadEnabled,
  normalizePreloadedAiIntents,
  resolvePreloadedAiIntents,
} from '../src/shared/ai-prompts.ts';

test('normalizePreloadedAiIntents preserves only valid preloadable intents and deduplicates', () => {
  const result = normalizePreloadedAiIntents(['default', 'grammar', 'default', 'unknown_intent', 'rephrase']);
  assert.deepEqual(result, ['default', 'grammar', 'rephrase']);
});

test('normalizePreloadedAiIntents returns empty array for non-array input', () => {
  assert.deepEqual(normalizePreloadedAiIntents(null), []);
  assert.deepEqual(normalizePreloadedAiIntents(undefined), []);
  assert.deepEqual(normalizePreloadedAiIntents('default'), []);
});

test('isAiIntentPreloadEnabled correctly identifies if an intent is enabled for preload', () => {
  const settings = { preloadedAiIntents: ['default', 'grammar'] };
  assert.equal(isAiIntentPreloadEnabled(settings, 'default'), true);
  assert.equal(isAiIntentPreloadEnabled(settings, 'grammar'), true);
  assert.equal(isAiIntentPreloadEnabled(settings, 'rephrase'), false);
  assert.equal(isAiIntentPreloadEnabled(null, 'default'), false);
});

test('resolvePreloadedAiIntents maps legacy enableAiPreload true to Main AI only', () => {
  assert.deepEqual(resolvePreloadedAiIntents({ enableAiPreload: true }), ['default']);
  assert.deepEqual(resolvePreloadedAiIntents({ preloadedAiIntents: ['grammar'] }), ['grammar']);
  assert.deepEqual(resolvePreloadedAiIntents({ preloadedAiIntents: [] }), []);
  assert.deepEqual(resolvePreloadedAiIntents({}), []);
});
