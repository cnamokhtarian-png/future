import "server-only";

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: Record<string, unknown> } }
  | { functionResponse?: never };

export type GeminiContent = { role: "user" | "model" | "function"; parts: unknown[] };

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GeminiError";
  }
}

async function postToGemini(key: string, body: Record<string, unknown>) {
  try {
    return await fetch(`${API_ROOT}/${GEMINI_MODEL}:generateContent`, {
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

export async function callGemini({ systemInstruction, contents, tools }: { systemInstruction: string; contents: GeminiContent[]; tools?: unknown[] }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("کلید Gemini روی سرور تنظیم نشده است.", 500);

  const baseBody: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    ...(tools?.length ? { tools } : {}),
    // Responses are designed to be short; a tight cap keeps 3.5-flash fast enough
    // for an interactive chat instead of generating a long essay per turn.
    generationConfig: { maxOutputTokens: 900, temperature: 0.7, thinkingConfig: { thinkingLevel: "low" } },
  };

  let response = await postToGemini(key, baseBody);

  if (response.status === 400) {
    // Some model variants reject thinkingConfig; retry once without it.
    let message = "";
    try { message = ((await response.clone().json()) as { error?: { message?: string } })?.error?.message || ""; } catch { /* keep empty */ }
    if (/thinking/i.test(message)) {
      const relaxed = { ...baseBody, generationConfig: { maxOutputTokens: 900, temperature: 0.7 } };
      response = await postToGemini(key, relaxed);
    }
  }

  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new GeminiError("پاسخ غیرمنتظره‌ای از جمینا دریافت شد.", 502); }
  if (!response.ok) {
    const message = ((payload as { error?: { message?: string } })?.error?.message) || "";
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new GeminiError("کلید Gemini نامعتبر است یا دسترسی این مدل را ندارد. کلید را بررسی کن.", response.status);
    }
    if (response.status === 429) {
      throw new GeminiError("ظرفیت استفاده از جمینا موقتاً تمام شده است؛ چند لحظه بعد دوباره تلاش کن.", 429);
    }
    throw new GeminiError(message ? `خطای جمینا: ${message}` : "جمینا در حال حاضر پاسخ نمی‌دهد؛ دوباره تلاش کن.", response.status);
  }
  return payload as {
    candidates?: Array<{ content?: { role?: string; parts?: Array<{ text?: string; functionCall?: { name?: string; args?: Record<string, unknown> } }> } }>;
  };
}
