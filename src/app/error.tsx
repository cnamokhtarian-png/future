"use client";

import { Compass, ArrowLeft } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="empty-state" style={{ minHeight: "100vh", padding: 30 }}><span className="icon-box purple" style={{ width: 60, height: 60 }}><Compass size={29} /></span><h1 style={{ fontSize: 22, marginTop: 15 }}>گاهی مسیر نیاز به یک مکث دارد.</h1><p>فعلاً دریافت اطلاعات ممکن نشد. چیزی را تغییر نده؛ چند لحظه بعد دوباره امتحان کن.</p><button className="button primary" onClick={reset} style={{ marginTop: 24 }}>دوباره تلاش کن <ArrowLeft size={16} /></button></main>;
}
