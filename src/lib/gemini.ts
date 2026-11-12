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

export async function callGemini({ systemInstruction, contents, tools }: { systemInstruction: string; contents: GeminiContent[]; tools?: unknown[] }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("کلید Gemini روی سرور تنظیم نشده است.", 500);
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        ...(tools?.length ? { tools } : {}),
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") throw new GeminiError("پاسخ جمینا خیلی طول کشید؛ دوباره تلاش کن.", 504);
    throw new GeminiError("ارتباط با جمینا برقرار نشد؛ اتصال اینترنت سرور را بررسی کن.", 502);
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
