import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  errorMessageFromOpenAiBody,
  extractOpenAiContent,
} from '../src/shared/openai-response.ts';

test('extractOpenAiContent parses standard non-streaming JSON completion', () => {
  const payload = JSON.stringify({
    id: 'chatcmpl-123',
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'Hello, how can I help you today?',
        },
      },
    ],
  });
  assert.equal(extractOpenAiContent(payload), 'Hello, how can I help you today?');
});

test('extractOpenAiContent parses user SSE chunk sample', () => {
  const userSample = `data: {"id":"chatcmpl-oIiaarjJI-eyg8UPhPmRoQM","object":"chat.completion.chunk","created":1788512423,"model":"gemini-3.8-flash","choices":[{"index":0,"delta":{"content":" \\"of\\": *pronunciation of something* (cách phát âm của từ/âm thanh nào đó).\\n* Kết hợp"},"finish_reason":null}]}

data: [DONE]`;

  const result = extractOpenAiContent(userSample);
  assert.equal(
    result,
    ' "of": *pronunciation of something* (cách phát âm của từ/âm thanh nào đó).\n* Kết hợp',
  );
});

test('extractOpenAiContent aggregates multiple streaming chunks', () => {
  const sse = [
    'data: {"choices":[{"delta":{"content":"First "}}]}',
    'data: {"choices":[{"delta":{"content":"second "}}]}',
    ': keep-alive comment',
    'data: {"choices":[{"delta":{"content":"third."}}]}',
    'data: [DONE]',
  ].join('\n');

  assert.equal(extractOpenAiContent(sse), 'First second third.');
});

test('extractOpenAiContent handles array content parts', () => {
  const payload = JSON.stringify({
    choices: [
      {
        message: {
          content: [{ text: 'Part 1' }, { text: ' Part 2' }],
        },
      },
    ],
  });
  assert.equal(extractOpenAiContent(payload), 'Part 1 Part 2');
});

test('extractOpenAiContent throws on inline error object in JSON body', () => {
  const payload = JSON.stringify({
    error: {
      message: 'Model "my-custom-model" does not exist',
      type: 'invalid_request_error',
    },
  });
  assert.throws(
    () => extractOpenAiContent(payload),
    /Model "my-custom-model" does not exist/,
  );
});

test('extractOpenAiContent throws on inline error in SSE stream chunk', () => {
  const sse = 'data: {"error":{"message":"Rate limit exceeded for endpoint"}}';
  assert.throws(
    () => extractOpenAiContent(sse),
    /Rate limit exceeded for endpoint/,
  );
});

test('extractOpenAiContent returns empty string on empty or invalid input', () => {
  assert.equal(extractOpenAiContent(''), '');
  assert.equal(extractOpenAiContent('   \n  '), '');
  assert.equal(extractOpenAiContent('data: [DONE]'), '');
});

test('errorMessageFromOpenAiBody extracts error message or falls back to status', () => {
  assert.equal(
    errorMessageFromOpenAiBody('{"error":{"message":"Unauthorized key"}}', 401),
    'Unauthorized key',
  );
  assert.equal(
    errorMessageFromOpenAiBody('{"message":"Resource not found"}', 404),
    'Resource not found',
  );
  assert.equal(
    errorMessageFromOpenAiBody('', 500),
    'AI request failed (500)',
  );
});
