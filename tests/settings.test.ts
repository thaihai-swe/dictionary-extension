import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GEMINI_BASE_URL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  defaultAiBaseUrlFor,
  defaultAiModelFor,
  isOpenAiStandard,
  normalizeSettings,
} from '../src/shared/settings.ts';

test('isOpenAiStandard returns true only when aiProvider is openai', () => {
  assert.equal(isOpenAiStandard({ aiProvider: 'openai' }), true);
  assert.equal(isOpenAiStandard({ aiProvider: 'gemini' }), false);
  assert.equal(isOpenAiStandard({}), false);
  assert.equal(isOpenAiStandard(null), false);
});

test('defaultAiModelFor returns empty string for openai and gemini model for gemini', () => {
  assert.equal(defaultAiModelFor('openai'), '');
  assert.equal(defaultAiModelFor('gemini'), DEFAULT_GEMINI_MODEL);
});

test('defaultAiBaseUrlFor returns local endpoint for openai and google url for gemini', () => {
  assert.equal(defaultAiBaseUrlFor('openai'), DEFAULT_OPENAI_BASE_URL);
  assert.equal(defaultAiBaseUrlFor('gemini'), DEFAULT_GEMINI_BASE_URL);
});

test('normalizeSettings preserves custom OpenAI model and does not inject a preset', () => {
  const result = normalizeSettings({
    aiProvider: 'openai',
    aiModel: 'mistral-nemo:12b',
  });
  assert.equal(result.aiProvider, 'openai');
  assert.equal(result.aiModel, 'mistral-nemo:12b');
});

test('normalizeSettings leaves OpenAI model empty when not specified by user', () => {
  const result = normalizeSettings({
    aiProvider: 'openai',
    aiModel: '',
  });
  assert.equal(result.aiProvider, 'openai');
  assert.equal(result.aiModel, '');
});

test('normalizeSettings defaults Gemini model when empty', () => {
  const result = normalizeSettings({
    aiProvider: 'gemini',
    aiModel: '',
  });
  assert.equal(result.aiProvider, 'gemini');
  assert.equal(result.aiModel, DEFAULT_GEMINI_MODEL);
});
