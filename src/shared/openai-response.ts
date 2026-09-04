function stringifyOpenAiContent(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object') {
        const record = part as { text?: string; content?: string };
        return record.text || record.content || '';
      }
      return '';
    }).join('');
  }
  if (typeof value === 'object') {
    const record = value as { text?: string; content?: string };
    return record.text || record.content || '';
  }
  return String(value);
}

function contentFromChoice(choice: unknown): string {
  if (!choice || typeof choice !== 'object') return '';
  const record = choice as {
    message?: { content?: unknown };
    delta?: { content?: unknown; text?: unknown };
    text?: unknown;
  };
  return stringifyOpenAiContent(
    record.message?.content
    ?? record.delta?.content
    ?? record.delta?.text
    ?? record.text,
  );
}

function parsePayload(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function extractOpenAiContent(rawText: string): string {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return '';

  // 1. Direct JSON response (standard non-streaming completion)
  if (trimmed.startsWith('{')) {
    const json = parsePayload(trimmed) as { choices?: unknown[]; error?: { message?: string } } | null;
    if (json) {
      if (json.error?.message) {
        throw new Error(json.error.message);
      }
      const fromJson = contentFromChoice(json.choices?.[0]);
      if (fromJson) return fromJson;
    }
  }

  // 2. Stream response (Server-Sent Events or line-delimited JSON)
  const chunks: string[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith(':')) continue; // Skip comments and empty lines

    const payload = clean.startsWith('data:') ? clean.slice(5).trim() : clean.startsWith('{') ? clean : '';
    if (!payload || payload === '[DONE]') continue;

    const parsed = parsePayload(payload) as { choices?: unknown[]; error?: { message?: string } } | null;
    if (!parsed) continue;

    if (parsed.error?.message) {
      throw new Error(parsed.error.message);
    }

    const piece = contentFromChoice(parsed.choices?.[0]);
    if (piece) chunks.push(piece);
  }

  return chunks.join('');
}

export function errorMessageFromOpenAiBody(rawText: string, status: number): string {
  const fallback = `AI request failed (${status})`;
  const trimmed = String(rawText || '').trim();
  if (!trimmed) return fallback;
  try {
    const json = JSON.parse(trimmed) as { error?: { message?: string }; message?: string };
    return json.error?.message || json.message || fallback;
  } catch {
    return trimmed.length < 280 ? trimmed : fallback;
  }
}
