import type { ProviderLookupDto } from '../../types';
import { NotFoundError } from '../../providers/errors.ts';
import { runBounded } from '../../providers/provider-scheduler.ts';
import type {
  DictionaryLookupContext,
  DictionaryProviderLookup,
  DictionaryProviderOutcome,
} from '../../domain/dictionary/contracts';

export const DEFAULT_PROVIDER_CONCURRENCY = 2;

function errorCode(error: unknown): string {
  if (error instanceof NotFoundError) return 'not_found';
  if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'provider_failed';
}

function isCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export interface CollectProviderOptions extends DictionaryLookupContext {
  concurrency?: number;
  onOutcome?: (outcome: DictionaryProviderOutcome) => void;
}

/**
 * Executes every requested provider and records an outcome for each one.
 * Normal "no match" responses are intentionally different from operational failures.
 */
export async function collectProviderOutcomes(
  providerIds: readonly string[],
  query: string,
  lookup: DictionaryProviderLookup,
  options: CollectProviderOptions,
): Promise<DictionaryProviderOutcome[]> {
  const outcomes: DictionaryProviderOutcome[] = [];
  const recordOutcome = (outcome: DictionaryProviderOutcome) => {
    outcomes.push(outcome);
    options.onOutcome?.(outcome);
  };
  const startedAt = new Map<string, number>();
  await runBounded(
    providerIds,
    (providerId) => {
      startedAt.set(providerId, Date.now());
      return lookup(providerId, query, options);
    },
    {
      concurrency: options.concurrency ?? DEFAULT_PROVIDER_CONCURRENCY,
      signal: options.signal,
      onSettled: (providerId, settled: PromiseSettledResult<ProviderLookupDto>) => {
        if (settled.status === 'fulfilled') {
          const result = settled.value;
          const latencyMs = Date.now() - (startedAt.get(providerId) || Date.now());
          const hasPayload = Boolean(
            result.meanings?.some((meaning) => meaning.definitions?.some((item) => item.definition?.trim()))
            || result.phonetics?.length
            || result.examples?.length
            || result.synonyms?.length
            || result.antonyms?.length
            || result.lexicalProfile,
          );
          recordOutcome({
            status: hasPayload ? 'contributed' : 'no_match',
            providerId,
            ...(hasPayload ? { result } : {}),
            latencyMs,
          } as DictionaryProviderOutcome);
          return;
        }

        if (isCancelled(settled.reason)) {
          recordOutcome({ status: 'cancelled', providerId });
          return;
        }
        recordOutcome({
          status: settled.reason instanceof NotFoundError ? 'no_match' : 'failed',
          providerId,
          ...(settled.reason instanceof NotFoundError ? {} : { errorCode: errorCode(settled.reason) }),
          latencyMs: Date.now() - (startedAt.get(providerId) || Date.now()),
        } as DictionaryProviderOutcome);
      },
    },
  );
  return outcomes;
}
