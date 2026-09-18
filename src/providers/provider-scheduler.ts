export interface BoundedRunOptions<T, R> {
  concurrency: number;
  signal?: AbortSignal;
  onSettled?: (item: T, result: PromiseSettledResult<R>) => void;
}

/** Runs independent provider tasks with a hard concurrency ceiling. */
export async function runBounded<T, R>(
  items: readonly T[],
  task: (item: T) => Promise<R>,
  options: BoundedRunOptions<T, R>,
): Promise<void> {
  const concurrency = Math.max(1, Math.floor(options.concurrency));
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      if (options.signal?.aborted) return;
      const item = items[nextIndex++];
      const settled = await Promise.allSettled([task(item)]);
      options.onSettled?.(item, settled[0]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
}
