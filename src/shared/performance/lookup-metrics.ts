export type LookupMetricValue = string | number | boolean | null | undefined;

export interface LookupMetricEvent {
  name: string;
  timestamp: number;
  values?: Record<string, LookupMetricValue>;
}

const MAX_EVENTS = 200;
const events: LookupMetricEvent[] = [];
let enabled = false;

function isEnabled(): boolean {
  if (enabled) return true;
  try {
    return Boolean((globalThis as typeof globalThis & { __DICT_PERF__?: boolean }).__DICT_PERF__);
  } catch {
    return false;
  }
}

export function setLookupMetricsEnabled(value: boolean): void {
  enabled = value;
}

export function recordLookupMetric(
  name: string,
  values?: Record<string, LookupMetricValue>,
): void {
  if (!isEnabled()) return;
  events.push({ name, timestamp: Date.now(), values });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

export function readLookupMetrics(): LookupMetricEvent[] {
  return events.map((event) => ({
    ...event,
    values: event.values ? { ...event.values } : undefined,
  }));
}

export function clearLookupMetrics(): void {
  events.length = 0;
}

export function measureLookupMetric<T>(
  name: string,
  values: Record<string, LookupMetricValue> | undefined,
  work: () => T,
): T {
  if (!isEnabled()) return work();
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    return work();
  } finally {
    const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    recordLookupMetric(name, {
      ...(values || {}),
      durationMs: Math.max(0, finishedAt - startedAt),
    });
  }
}
