"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Sparkles,
  SendHorizonal,
  Trash2,
  Check,
  X,
  Brain,
  ListChecks,
  ShieldCheck,
  Wallet,
  Heart,
  Flame,
  LoaderCircle,
} from "lucide-react";
import { fa, type Mutation, type Workspace, type View } from "@/lib/types";
import type { Mutate } from "@/components/ui";

type Confirmation = { id: string; label: string; action: Mutation };
type AssistantMessage = {
  id: string;
  role: "user" | "model";
  text: string;
  performed?: string[];
  confirmation?: Confirmation | null;
  confirmationState?: "pending" | "done" | "cancelled";
};

const STORAGE_KEY = "roberah-assistant-v1";
const SUGGESTIONS = [
  { icon: Heart, text: "حالم رو ببین؛ امروز حالم خیلی عادیه" },
  { icon: Wallet, text: "یه خرج ۷۵ هزار تومنی برای رفت‌وآمد ثبت کن" },
  { icon: ListChecks, text: "وضعیت قدم‌های امروزم چیه؟" },
  { icon: Flame, text: "قوانین چالش ۷۵ روزه‌ام رو ثبت کن: بیدار شدم، ورزش کردم و آب خوردم" },
];

function loadStoredMessages(): AssistantMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssistantMessage[];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

export function AssistantView({
  mutate,
  busy,
  go,
  applyWorkspace,
}: {
  mutate: Mutate;
  busy: boolean;
  go: (view: View) => void;
  applyWorkspace: (workspace: Workspace) => void;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>(() =>
    typeof window === "undefined" ? [] : loadStoredMessages(),
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* storage unavailable */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: "user", text };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-24).map((message) => ({ role: message.role, text: message.text })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.reply) throw new Error(result.error || "دستیار پاسخی نداد؛ دوباره تلاش کن.");
      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "model",
        text: result.reply as string,
        performed: Array.isArray(result.performed) && result.performed.length ? result.performed : undefined,
        confirmation: result.pendingConfirmation
          ? {
              id: crypto.randomUUID(),
              label: result.pendingConfirmation.label,
              action: result.pendingConfirmation.action,
            }
          : undefined,
        confirmationState: result.pendingConfirmation ? "pending" : undefined,
      };
      setMessages([...next, assistantMessage]);
      if (result.workspace) applyWorkspace(result.workspace as Workspace);
      if (result.navigate) go(result.navigate as View);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "اتصال برقرار نشد. دوباره تلاش کن.");
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(input);
  };

  const resolveConfirmation = async (message: AssistantMessage, accepted: boolean) => {
    if (!message.confirmation) return;
    if (accepted) {
      const ok = await mutate(message.confirmation.action, "انجام شد.");
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, confirmationState: ok ? "done" : "pending" } : item,
        ),
      );
    } else {
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? { ...item, confirmationState: "cancelled" } : item)),
      );
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div className="view-stack">
      <section className="panel assistant-panel">
        <div className="assistant-heading">
          <div className="assistant-identity">
            <span className="assistant-avatar">
              <Sparkles size={22} strokeWidth={1.7} />
            </span>
            <div>
              <h2>روبه‌راه، دستیار و مدیر هوشمند تو</h2>
              <p>
                با «جمینا»ی گوگل؛ هر چیزی که بخواهی می‌توانم تغییر دهم و برایت انجام دهم — از ثبت خرج و قدم گرفته تا
                دیدن گزارش ماه و چالش ۷۵ روزه.
              </p>
            </div>
          </div>
          <button className="icon-button" onClick={clearChat} title="پاک‌کردن گفتگو" aria-label="پاک‌کردن گفتگو">
            <Trash2 size={17} />
          </button>
        </div>

        <div className="chat-scroll" ref={scrollRef} aria-live="polite">
          {!messages.length && (
            <div className="chat-empty">
              <Brain size={34} strokeWidth={1.4} />
              <h3>سلام! من اینجا هستم تا فکر کردن را هم برداری.</h3>
              <p>
                می‌توانی با من حرف بزنی؛ من گزارش می‌دهم، ثبت می‌کنم و اگر چیزی خراب باشد، خودت می‌بینی. از هر کدام که
                می‌خواهی شروع کن:
              </p>
              <div className="suggestion-grid">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion.text} className="suggestion-card" onClick={() => void send(suggestion.text)}>
                    <suggestion.icon size={15} strokeWidth={1.8} />
                    <span>{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`chat-row ${message.role === "user" ? "from-user" : "from-model"}`}>
              {message.role === "model" && (
                <span className="chat-avatar small">
                  <Sparkles size={14} />
                </span>
              )}
              <div className="chat-bubble">
                <p>{message.text}</p>
                {message.performed?.length ? (
                  <div className="performed-list">
                    {message.performed.map((label) => (
                      <span key={label} className="performed-chip">
                        <Check size={11} strokeWidth={2.6} /> {label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {message.confirmation && message.confirmationState === "pending" && (
                  <div className="confirm-card">
                    <div className="confirm-card-title">
                      <ShieldCheck size={15} />
                      <span>{message.confirmation.label}</span>
                    </div>
                    <p>این کار قابل بازگشت نیست. خودت تصمیم بگیر:</p>
                    <div className="confirm-actions">
                      <button
                        className="button danger small"
                        disabled={busy}
                        onClick={() => void resolveConfirmation(message, true)}
                      >
                        تأیید و حذف
                      </button>
                      <button
                        className="button outline small"
                        disabled={busy}
                        onClick={() => void resolveConfirmation(message, false)}
                      >
                        نه، نگهش دار
                      </button>
                    </div>
                  </div>
                )}
                {message.confirmation && message.confirmationState === "done" && (
                  <span className="confirm-status done">
                    <Check size={12} strokeWidth={2.6} /> انجام شد
                  </span>
                )}
                {message.confirmation && message.confirmationState === "cancelled" && (
                  <span className="confirm-status cancelled">
                    <X size={12} strokeWidth={2.6} /> انجام نشد
                  </span>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="chat-row from-model">
              <span className="chat-avatar small">
                <Sparkles size={14} />
              </span>
              <div className="chat-bubble typing">
                <LoaderCircle size={16} className="spin" />
                <span>دارم فکر می‌کنم و اقدام‌های لازم را انجام می‌دهم…</span>
              </div>
            </div>
          )}
        </div>

        {error && <p className="assistant-error">{error}</p>}

        <form className="chat-input-row" onSubmit={submit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="بنویس: مثلاً «امروز رو مرور کنیم» یا «این ماه چقدر خرج کردم؟»"
            maxLength={4000}
            aria-label="پیام به دستیار"
            autoComplete="off"
          />
          <button type="submit" className="button primary" disabled={sending || !input.trim()} aria-label="ارسال">
            <SendHorizonal size={17} />
            <span>ارسال</span>
          </button>
        </form>
        <p className="field-help chat-safety">
          پاسخ‌های دستیار با کلید خصوصی گوگل و فقط روی سرور شما ساخته می‌شود؛ هیچ کلیدی به مرورگر نمی‌آید. حذف‌ها همیشه
          با تأیید تو انجام می‌شوند. برای بحران روانی با ۱۱۵ یا اورژانس اجتماعی ۱۲۳ تماس بگیر.
        </p>
      </section>
    </div>
  );
}
