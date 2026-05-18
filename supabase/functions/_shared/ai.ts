// Provider-agnostic AI client. Reads AI_PROVIDER (openai|anthropic|gemini) and
// the corresponding API key from env. All edge functions should go through
// chatJson() / embed() rather than calling providers directly.

type Provider = 'openai' | 'anthropic' | 'gemini';
const PROVIDER = (Deno.env.get('AI_PROVIDER') ?? 'openai') as Provider;
const MODEL = Deno.env.get('AI_MODEL');

const DEFAULT_CHAT_MODEL: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  gemini: 'gemini-1.5-flash',
};

const DEFAULT_EMBED_MODEL = 'text-embedding-3-small';

export async function chatJson<T = unknown>(opts: {
  system: string;
  user: string;
  schemaHint?: string;
  maxTokens?: number;
}): Promise<T> {
  const model = MODEL ?? DEFAULT_CHAT_MODEL[PROVIDER];
  const json = await chat({
    system: `${opts.system}\nReply with strict JSON. ${opts.schemaHint ?? ''}`,
    user: opts.user,
    maxTokens: opts.maxTokens ?? 800,
    forceJson: true,
    model,
  });
  // Some providers wrap JSON in code fences
  const cleaned = json.replace(/^```(?:json)?|```$/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error('AI returned malformed JSON: ' + cleaned.slice(0, 200));
  }
}

async function chat(opts: {
  system: string;
  user: string;
  maxTokens: number;
  forceJson: boolean;
  model: string;
}): Promise<string> {
  if (PROVIDER === 'openai') return openaiChat(opts);
  if (PROVIDER === 'anthropic') return anthropicChat(opts);
  if (PROVIDER === 'gemini') return geminiChat(opts);
  throw new Error(`unsupported provider ${PROVIDER}`);
}

async function openaiChat(opts: { system: string; user: string; maxTokens: number; forceJson: boolean; model: string; }) {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      response_format: opts.forceJson ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  });
  if (!res.ok) throw new Error('openai: ' + (await res.text()));
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function anthropicChat(opts: { system: string; user: string; maxTokens: number; forceJson: boolean; model: string; }) {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    }),
  });
  if (!res.ok) throw new Error('anthropic: ' + (await res.text()));
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function geminiChat(opts: { system: string; user: string; maxTokens: number; forceJson: boolean; model: string; }) {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: 'user', parts: [{ text: opts.user }] }],
        generationConfig: { maxOutputTokens: opts.maxTokens, responseMimeType: opts.forceJson ? 'application/json' : 'text/plain' },
      }),
    }
  );
  if (!res.ok) throw new Error('gemini: ' + (await res.text()));
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/** Embed a string. Returns null if no embedding provider is configured. */
export async function embed(text: string): Promise<number[] | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: text.slice(0, 6000), model: DEFAULT_EMBED_MODEL }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.[0]?.embedding ?? null;
}
