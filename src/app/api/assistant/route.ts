import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace } from "@/lib/data";
import { callGemini, GeminiError, userInputStep, functionResultStep, type InteractionStep } from "@/lib/gemini";
import type { Mutation } from "@/lib/types";
import { functionDeclarations, buildContext, buildSystemPrompt, executeTool } from "@/lib/assistant";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(6000),
});
const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export async function POST(request: Request) {
  try {
    let rawBody: unknown;
    try { rawBody = await request.json(); }
    catch { return NextResponse.json({ error: "بدنه درخواست باید JSON معتبر باشد." }, { status: 400 }); }
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) return NextResponse.json({ error: "پیام‌ها معتبر نیستند." }, { status: 400 });
    const history = parsed.data.messages.slice(-24);

    let workspace = await getWorkspace();
    // The Interactions API has no separate system-instruction slot in its
    // documented stable shape, so the system briefing travels inside the
    // user input, followed by the recent conversation transcript.
    const systemInstruction = buildSystemPrompt(buildContext(workspace));
    const transcript = [
      systemInstruction,
      "",
      "گفتگوی اخیر با کاربر (از قدیمی به جدید):",
      ...history.map((message) => `${message.role === "user" ? "کاربر" : "دستیار"}: ${message.text}`),
      "",
      "به آخرین پیام کاربر پاسخ بده؛ اگر لازم است از ابزارها استفاده کن.",
    ].join("\n");
    const inputSteps: InteractionStep[] = [userInputStep(transcript)];

    const performed: string[] = [];
    let navigate: string | undefined;
    let pendingConfirmation: { label: string; action: Mutation } | undefined;
    let mutated = false;
    let reply = "";

    for (let iteration = 0; iteration < 5; iteration += 1) {
      const outcome = await callGemini({ inputSteps, tools: [...functionDeclarations] });

      if (!outcome.functionCalls.length) {
        reply = outcome.text;
        break;
      }

      // Echo the model's steps verbatim (thought/function_call) as documented,
      // then append each function result.
      inputSteps.push(...outcome.steps);
      const calls = outcome.functionCalls;
      for (const call of calls) {
        const executed = await executeTool(call.name, call.args, workspace);
        let responsePayload: Record<string, unknown>;
        if (executed.kind === "executed") {
          performed.push(executed.label);
          mutated = true;
          // Refresh the snapshot so chained tool calls see their own effects.
          workspace = await getWorkspace();
          responsePayload = { ok: true, message: executed.label };
        } else if (executed.kind === "confirm") {
          if (!pendingConfirmation) pendingConfirmation = { label: executed.label, action: executed.action };
          responsePayload = { ok: false, pending: true, message: "حذف بدون تأیید کاربر انجام نمی‌شود؛ ابزار روی سایت منتظر تأیید اوست. فقط بگو آماده‌ی حذف است و دقیقاً بپرس که تأیید می‌کند یا نه." };
        } else if (executed.kind === "navigate") {
          navigate = executed.view;
          responsePayload = { ok: true, message: `بخش ${executed.view} برای کاربر باز شد.` };
        } else {
          responsePayload = { ok: false, error: executed.error };
        }
        inputSteps.push(functionResultStep(call.name, call.id, responsePayload));
      }
    }

    if (!reply) reply = performed.length ? "انجام شد. چیز دیگه‌ای هست که برات انجام بدم؟" : "به نظر می‌رسد الان پاسخی ندارم؛ دوباره بپرس یا کمی دقیق‌تر بگو چه می‌خواهی.";

    return NextResponse.json({
      reply,
      performed,
      ...(mutated ? { workspace: await getWorkspace() } : {}),
      ...(navigate ? { navigate } : {}),
      ...(pendingConfirmation ? { pendingConfirmation } : {}),
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message }, { status: error.status && error.status >= 400 && error.status < 600 ? error.status : 500 });
    }
    console.error("Assistant failed", error);
    return NextResponse.json({ error: "دستیار موقتاً در دسترس نیست؛ دوباره تلاش کن." }, { status: 500 });
  }
}
