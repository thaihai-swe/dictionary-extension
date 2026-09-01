import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasConfiguredAiApiKey,
  mergePublicSettings,
  shouldPersistSecretValue,
  stripSecretRecord,
} from '../src/shared/settings-export.ts';

describe('shouldPersistSecretValue', () => {
  it('never persists blank secrets', () => {
    assert.equal(shouldPersistSecretValue('', false), false);
    assert.equal(shouldPersistSecretValue('   ', true), false);
    assert.equal(shouldPersistSecretValue(undefined, true), false);
    assert.equal(shouldPersistSecretValue('AIzaSy123', false), true);
    assert.equal(shouldPersistSecretValue('AIzaSy123', true), true);
  });
});

describe('hasConfiguredAiApiKey', () => {
  it('treats the public flag or a non-empty key as configured', () => {
    assert.equal(hasConfiguredAiApiKey({ hasAiApiKey: true, aiApiKey: '' }), true);
    assert.equal(hasConfiguredAiApiKey({ hasAiApiKey: false, aiApiKey: 'AIzaSy123' }), true);
    assert.equal(hasConfiguredAiApiKey({ hasAiApiKey: false, aiApiKey: '' }), false);
  });
});

describe('mergePublicSettings', () => {
  it('prefers this device local hasAiApiKey flag over sync', () => {
    const merged = mergePublicSettings(
      { theme: 'dark', hasAiApiKey: false, aiApiKey: 'should-not-leak' },
      { hasAiApiKey: true },
    );
    assert.equal(merged.hasAiApiKey, true);
    assert.equal(merged.theme, 'dark');
    assert.equal(merged.aiApiKey, undefined);
  });

  it('falls back to the sync flag when local has not stored one', () => {
    const merged = mergePublicSettings({ hasAiApiKey: true }, {});
    assert.equal(merged.hasAiApiKey, true);
  });
});

describe('stripSecretRecord', () => {
  it('removes API keys from public snapshots', () => {
    const stripped = stripSecretRecord({
      theme: 'dark',
      aiApiKey: 'AIzaSy123',
      libreTranslateApiKey: 'secret',
      hasAiApiKey: true,
    });
    assert.equal(stripped.theme, 'dark');
    assert.equal(stripped.hasAiApiKey, true);
    assert.equal(stripped.aiApiKey, undefined);
    assert.equal(stripped.libreTranslateApiKey, undefined);
  });
});


