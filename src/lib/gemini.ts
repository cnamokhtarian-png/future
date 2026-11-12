import "server-only";

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: Record<string, unknown> } }
  | { functionResponse?: never };

export type GeminiContent = { role: "user" | "model" | "function"; parts: unknown[] };

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
// Ordered fallbacks: if the primary model is not available for this account/key,
// we transparently try cheaper/faster ones before surfacing an error.
const MODEL_CANDIDATES = [...new Set([GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.5-flash-lite"])];

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GeminiError";
  }
}

async function postToGemini(key: string, model: string, body: Record<string, unknown>) {
  try {
    return await fetch(`${API_ROOT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(50_000),
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

function buildBody(systemInstruction: string, contents: GeminiContent[], tools: unknown[] | undefined, withThinking: boolean): Record<string, unknown> {
  return {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    ...(tools?.length ? { tools } : {}),
    // Responses are designed to be short; a tight cap keeps 3.5-flash fast enough
    // for an interactive chat instead of generating a long essay per turn.
    generationConfig: withThinking
      ? { maxOutputTokens: 900, temperature: 0.7, thinkingConfig: { thinkingLevel: "low" } }
      : { maxOutputTokens: 900, temperature: 0.7 },
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    return ((await response.clone().json()) as { error?: { message?: string } })?.error?.message || "";
  } catch {
    return "";
  }
}

async function generateWithModel(key: string, model: string, systemInstruction: string, contents: GeminiContent[], tools: unknown[] | undefined) {
  let response = await postToGemini(key, model, buildBody(systemInstruction, contents, tools, true));
  if (response.status === 400) {
    const message = await readErrorMessage(response);
    if (/thinking/i.test(message)) {
      response = await postToGemini(key, model, buildBody(systemInstruction, contents, tools, false));
    }
  }
  return response;
}

export async function callGemini({ systemInstruction, contents, tools }: { systemInstruction: string; contents: GeminiContent[]; tools?: unknown[] }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("کلید Gemini روی سرور تنظیم نشده است.", 500);

  const failures: Array<{ model: string; status: number; message: string }> = [];
  for (const model of MODEL_CANDIDATES) {
    const response = await generateWithModel(key, model, systemInstruction, contents, tools);
    if (response.ok) {
      try {
        return await response.json() as {
          candidates?: Array<{ content?: { role?: string; parts?: Array<{ text?: string; functionCall?: { name?: string; args?: Record<string, unknown> } }> } }>;
        };
      } catch {
        throw new GeminiError("پاسخ غیرمنتظره‌ای از جمینا دریافت شد.", 502);
      }
    }
    const message = await readErrorMessage(response);
    failures.push({ model, status: response.status, message });
    // Auth/quota/model errors can be model-specific; try the next candidate.
    // Server-side 5xx usually affect all models, so stop early.
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
