/**
 * Minimal OpenAI-compatible client.
 *
 * Configured with a SINGLE base URL + API key used for both the text assistant
 * (Quick Capture) and the vision model (Receipt Scanner). Works with OpenAI,
 * Gemini's OpenAI-compat endpoint, OpenRouter, Groq, LM Studio, Ollama, etc.
 */

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel: string;
}

export function getAIConfig(): AIConfig {
  return {
    baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || "gpt-4o-mini",
    visionModel: process.env.AI_VISION_MODEL || process.env.AI_MODEL || "gpt-4o-mini",
  };
}

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type Content = string | (TextPart | ImagePart)[];
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: Content;
}

interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  /** Ask for a JSON object back (best-effort; not all providers honor it). */
  json?: boolean;
}

export async function chat(opts: ChatOptions): Promise<string> {
  const cfg = getAIConfig();
  if (!cfg.apiKey) throw new Error("AI is not configured (set AI_API_KEY).");

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model || cfg.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.1,
      // Some gateways (e.g. reasoning models) only emit the answer when
      // streaming; non-stream returns empty content. We stream and reassemble
      // the body in readCompletion(), so callers still get a plain string.
      stream: true,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return readCompletion(await res.text());
}

/**
 * Read the assistant text from a /chat/completions response body. Handles both
 * a plain JSON object and an SSE stream (`data: {...}` lines) — some
 * OpenAI-compatible gateways stream even when stream:false is requested.
 */
function readCompletion(raw: string): string {
  if (raw.trimStart().startsWith("data:")) {
    let content = "";
    for (const line of raw.split("\n")) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const payload = l.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        const choice = j?.choices?.[0];
        content += choice?.delta?.content ?? choice?.message?.content ?? "";
      } catch {
        // ignore keep-alive / non-JSON lines
      }
    }
    return content;
  }
  const data = JSON.parse(raw);
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Pull the first JSON object out of a model response, tolerating code fences. */
export function extractJson<T = unknown>(raw: string): T {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  return JSON.parse(s) as T;
}
