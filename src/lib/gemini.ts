import "server-only";

export type InteractionStep = Record<string, unknown>;

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Ordered fallbacks: if the primary model is not available for this account/key,
// we transparently try the others before surfacing an error.
const MODEL_CANDIDATES = [...new Set([GEMINI_MODEL, "gemini-3.5-flash", "gemini-3.5-flash-lite"])];

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GeminiError";
  }
}

export function userInputStep(text: string): InteractionStep {
  return { type: "user_input", content: [{ type: "text", text }] };
}

export function functionResultStep(name: string, callId: string | undefined, result: unknown): InteractionStep {
  return { type: "function_result", name, call_id: callId, result: [{ type: "text", text: JSON.stringify(result) }] };
}

async function postToInteractions(key: string, body: Record<string, unknown>) {
  try {
    return await fetch(`${API_ROOT}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key, "Api-Revision": "2026-05-20" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new GeminiError("پاسخ جمینا خیلی طول کشید؛ دوباره تلاش کن.", 504);
    }
    throw new GeminiError("ارتباط با جمینا برقرار نشد؛ اتصال اینترنت سرور را بررسی کن.", 502);
  }
}

export type InteractionOutcome = {
  steps: InteractionStep[];
  functionCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }>;
  text: string;
};

function extractText(data: Record<string, unknown>): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const texts: string[] = [];
  const steps = Array.isArray(data.steps) ? data.steps : [];
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const record = step as Record<string, unknown>;
    if (typeof record.text === "string") texts.push(record.text);
    const content = record.content;
    if (typeof content === "string") texts.push(content);
    else if (Array.isArray(content)) {
      for (const item of content) {
        if (typeof item === "string") texts.push(item);
        else if (item && typeof item === "object" && typeof (item as Record<string, unknown>).text === "string") texts.push((item as Record<string, unknown>).text as string);
      }
    }
  }
  return texts.join("\n").trim();
}

function parseOutcome(data: Record<string, unknown>): InteractionOutcome {
  const steps = (Array.isArray(data.steps) ? data.steps : []) as InteractionStep[];
  const functionCalls = steps
    .map((step) => step as Record<string, unknown>)
    .filter((step) => step.type === "function_call" && typeof step.name === "string")
    .map((step) => ({
      name: step.name as string,
      args: (step.arguments && typeof step.arguments === "object" ? step.arguments : {}) as Record<string, unknown>,
      id: typeof step.id === "string" ? step.id : undefined,
    }));
  return { steps, functionCalls, text: extractText(data) };
}

export async function callGemini({ inputSteps, tools }: { inputSteps: InteractionStep[]; tools?: unknown[] }): Promise<InteractionOutcome> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("کلید Gemini روی سرور تنظیم نشده است.", 500);

  const failures: Array<{ model: string; status: number; message: string }> = [];
  for (const model of MODEL_CANDIDATES) {
    const interactiveTools = tools?.length
      ? [...(tools as Array<Record<string, unknown>>)].map((tool) => (tool.type ? tool : { type: "function", ...tool }))
      : undefined;
    const response = await postToInteractions(key, {
      model,
      input: inputSteps,
      ...(interactiveTools ? { tools: interactiveTools } : {}),
      store: false,
    });
    if (response.ok) {
      let data: Record<string, unknown>;
      try { data = (await response.json()) as Record<string, unknown>; }
      catch { throw new GeminiError("پاسخ غیرمنتظره‌ای از جمینا دریافت شد.", 502); }
      return parseOutcome(data);
    }
    let message = "";
    try { message = ((await response.json()) as { error?: { message?: string } })?.error?.message || ""; } catch { /* no body */ }
    failures.push({ model, status: response.status, message });
    // Auth/model/quota errors can be model-specific; try the next candidate.
    if (response.status >= 500) break;
  }

  const last = failures[failures.length - 1];
  const summary = failures.map((failure) => `${failure.model} → ${failure.status}${failure.message ? ` (${failure.message})` : ""}`).join(" | ");
  if (last?.status === 429) {
    throw new GeminiError("ظرفیت استفاده از جمینا موقتاً تمام شده است؛ چند لحظه بعد دوباره تلاش کن.", 429);
  }
  if (last?.status === 400 || last?.status === 401 || last?.status === 403 || last?.status === 404) {
    throw new GeminiError(`کلید Gemini پذیرفته نشد یا به این مدل‌ها دسترسی ندارد. جزئیات گوگل: ${summary}`, last.status);
  }
  throw new GeminiError(`خطای جمینا: ${summary || "پاسخ نامعتبر"}`, last?.status);
}
