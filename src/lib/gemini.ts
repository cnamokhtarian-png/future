import "server-only";

export type InteractionStep = Record<string, unknown>;

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
// Ordered fallbacks: if a model is unavailable or overloaded for this key,
// we transparently try the others before surfacing an error.
const MODEL_CANDIDATES = [...new Set([GEMINI_MODEL, "gemini-3.8-flash", "gemini-3.5-flash-lite"])];
// Transient failures (overload / rate limit) deserve a quick retry before
// moving on to the next model.
const RETRY_DELAYS_MS = [600, 1600];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
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

export function extractTextFromInteraction(data: Record<string, unknown>): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  // Walk the payload generically and harvest every "text" string. The exact
  // step envelope (e.g. model_output > content > text parts) may vary between
  // API revisions; this tolerates all of them.
  const texts: string[] = [];
  const walk = (node: unknown, depth: number) => {
    if (!node || depth > 8) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const recordType = typeof record.type === "string" ? record.type : "";
    // Never harvest thought-step signatures or function-call payloads.
    if (recordType === "function_call" || recordType === "function_result") return;
    if (typeof record.text === "string" && record.text.trim()) texts.push(record.text);
    for (const [key, value] of Object.entries(record)) {
      if (key === "text" || key === "signature" || key === "thoughtSignature") continue;
      if (value && typeof value === "object") walk(value, depth + 1);
    }
  };
  const steps = Array.isArray(data.steps) ? data.steps : [];
  for (const step of steps) walk(step, 0);
  return texts.join("\n").trim();
}

function extractText(data: Record<string, unknown>): string {
  return extractTextFromInteraction(data);
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

export async function callGemini({
  inputSteps,
  tools,
}: {
  inputSteps: InteractionStep[];
  tools?: unknown[];
}): Promise<InteractionOutcome> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("کلید Gemini روی سرور تنظیم نشده است.", 500);

  const failures: Array<{ model: string; status: number; message: string }> = [];
  for (const model of MODEL_CANDIDATES) {
    const interactiveTools = tools?.length
      ? [...(tools as Array<Record<string, unknown>>)].map((tool) => (tool.type ? tool : { type: "function", ...tool }))
      : undefined;
    let response: Response | null = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      response = await postToInteractions(key, {
        model,
        input: inputSteps,
        ...(interactiveTools ? { tools: interactiveTools } : {}),
        store: false,
      });
      // Only overload / rate-limit responses are worth an in-place retry.
      if ((response.status === 503 || response.status === 429) && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      break;
    }
    if (response!.ok) {
      let data: Record<string, unknown>;
      try {
        data = (await response!.json()) as Record<string, unknown>;
      } catch {
        throw new GeminiError("پاسخ غیرمنتظره‌ای از جمینا دریافت شد.", 502);
      }
      return parseOutcome(data);
    }
    let message = "";
    try {
      message = ((await response!.json()) as { error?: { message?: string } })?.error?.message || "";
    } catch {
      /* no body */
    }
    failures.push({ model, status: response!.status, message });
    // Every failure — including 5xx — may be model-specific (overload), so we
    // continue to the next candidate instead of giving up early.
  }

  const last = failures[failures.length - 1];
  const summary = failures
    .map((failure) => `${failure.model} → ${failure.status}${failure.message ? ` (${failure.message})` : ""}`)
    .join(" | ");
  if (last?.status === 429) {
    throw new GeminiError("ظرفیت استفاده از جمینا موقتاً تمام شده است؛ چند لحظه بعد دوباره تلاش کن.", 429);
  }
  if (last?.status === 400 || last?.status === 401 || last?.status === 403 || last?.status === 404) {
    throw new GeminiError(
      `کلید Gemini پذیرفته نشد یا به این مدل‌ها دسترسی ندارد. جزئیات گوگل: ${summary}`,
      last.status,
    );
  }
  throw new GeminiError(`خطای جمینا: ${summary || "پاسخ نامعتبر"}`, last?.status);
}
