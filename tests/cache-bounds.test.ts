import assert from 'node:assert/strict';
import test from 'node:test';
import { AbortRegistry } from '../src/shared/abort-registry.ts';
import { createBoundedLruCache } from '../src/shared/bounded-cache.ts';
import { createPersistedLruCache } from '../src/shared/lookup-cache.ts';
import { getSecondaryDictionaryProviderIds } from '../src/shared/text-utils.ts';
import { runBounded } from '../src/providers/provider-scheduler.ts';
import { GenerationGate } from '../src/shared/generation-gate.ts';
import { createTtlCache } from '../src/entrypoints/background/ttl-cache.ts';

test('persisted LRU evicts oldest entries when the byte cap is exceeded', () => {
  const cache = createPersistedLruCache<string>({
    maxSize: 10,
    maxBytes: 20,
    ttlMs: 60_000,
    storageKey: 'test-cache-bounds',
  });

  cache.write('oldest', '12345');
  cache.write('newest', '67890');

  assert.equal(cache.read('oldest'), undefined);
  assert.equal(cache.read('newest'), '67890');
});

test('secondary dictionary providers include every source except the primary', () => {
  const providers = getSecondaryDictionaryProviderIds('wiktionary');

  assert.equal(providers.includes('wiktionary'), false);
  assert.deepEqual(providers.sort(), [
    'datamuse',
    'free_dictionary',
    'rhymebrain',
    'tatoeba',
    'urban_dictionary',
    'wikipedia',
    'wiktionary_bilingual',
    'wiktionary_etymology',
  ]);
});

test('bounded LRU evicts the oldest entry and refreshes recency on read', () => {
  const cache = createBoundedLruCache<string, string>({ maxSize: 2 });
  cache.set('first', '1');
  cache.set('second', '2');
  assert.equal(cache.get('first'), '1');
  cache.set('third', '3');

  assert.equal(cache.has('first'), true);
  assert.equal(cache.has('second'), false);
  assert.equal(cache.has('third'), true);
});

test('abort registry cancels conflicting requests without affecting other scopes', () => {
  const registry = new AbortRegistry();
  const first = registry.register('tab:1:dictionary:one', 'tab:1:dictionary:');
  const otherScope = registry.register('tab:1:ai:one', 'tab:1:ai:');
  const second = registry.register('tab:1:dictionary:two', 'tab:1:dictionary:');

  assert.equal(first.signal.aborted, true);
  assert.equal(otherScope.signal.aborted, false);
  assert.equal(second.signal.aborted, false);
  registry.cancelPrefix('tab:1:ai:');
  assert.equal(otherScope.signal.aborted, true);
  assert.equal(registry.size, 1);
});

test('bounded provider scheduler never exceeds its concurrency limit', async () => {
  let active = 0;
  let peak = 0;
  const settled: number[] = [];

  await runBounded(
    [1, 2, 3, 4, 5],
    async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return item;
    },
    {
      concurrency: 2,
      onSettled: (_item, result) => {
        if (result.status === 'fulfilled') settled.push(result.value);
      },
    },
  );

  assert.equal(peak, 2);
  assert.deepEqual(settled.sort(), [1, 2, 3, 4, 5]);
});

test('generation gate invalidates stale async work', () => {
  const gate = new GenerationGate();
  const first = gate.next();
  const second = gate.next();

  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);
  gate.invalidate();
  assert.equal(gate.isCurrent(second), false);
});

test('TTL cache deduplicates loads and invalidates stale values', async () => {
  let loads = 0;
  let value = 'first';
  const cache = createTtlCache(async () => {
    loads += 1;
    return value;
  }, 60_000);

  assert.equal(await cache.get(), 'first');
  assert.equal(await cache.get(), 'first');
  cache.invalidate();
  value = 'second';
  assert.equal(await cache.get(), 'second');
  assert.equal(loads, 2);
});
