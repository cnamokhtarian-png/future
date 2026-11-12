"use client";

import { useState, type FormEvent } from "react";
import { HeartHandshake, ShieldAlert, NotebookPen, Lock, Trash2, Check, ChevronLeft, Info } from "lucide-react";
import { fa, todayKey, type Workspace } from "@/lib/types";
import type { Mutate } from "@/components/ui";

const dayShortLabel = (day: string) =>
  new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", month: "numeric", day: "numeric" }).format(
    new Date(`${day}T12:00:00+03:30`),
  );

const ladder = [
  { step: 1, title: "لبخند و تماس چشمی", detail: "با فروشنده، همسایه یا نگهبان — بدون حرف زدن هم کافی است." },
  {
    step: 2,
    title: "یک سؤال ساده بپرس",
    detail: "«این چند؟»، «کجاست؟»، «می‌تونی کمک کنی؟» — جوابش هرچه باشد، امتحان بوده.",
  },
  {
    step: 3,
    title: "۵ دقیقه گپ با آشنا",
    detail: "با همکار، هم‌کلاسی یا همسایه سر راه؛ یک موضوع بی‌خطر (هوا، ماهی، سفر).",
  },
  {
    step: 4,
    title: "در صف یا داروخانه دو جمله بگو",
    detail: "«منم مثل شما منتظرم»؛ آدم‌هایی که روزی می‌بینی و خداحافظی می‌کنی.",
  },
  {
    step: 5,
    title: "یک آشنا را برای چای دعوت کن",
    detail: "یک نفر که قبلاً باهاش کم حرف زده‌ای؛ یک جای کوچک، یک قهوه یا چای.",
  },
  {
    step: 6,
    title: "یک جمع کوچک ۳ تا ۵ نفره",
    detail: "در یکی از این جمع‌ها با یک نفر گپ بزنی؛ اگر زحمت بود، فقط گوش کن.",
  },
  {
    step: 7,
    title: "در یک جمع ۸+ نفره نظرت را بگو",
    detail: "حتی یک نظر کوتاه یا یک سؤال؛ همه لازم نیست دنبالت کنند.",
  },
  { step: 8, title: "«نه» گفتن مودبانه", detail: "به چیزی که ازت خواسته شده ولی نمی‌خواهی. احترام می‌زاره، نه رصد." },
  {
    step: 9,
    title: "ثبت‌نام در یک فعالیت گروهی منظم",
    detail: "کلاس، باشگاه، کارگاه، گروه مطالعه — جایی که هر هفته می‌روی.",
  },
  {
    step: 10,
    title: "یک چیز را در جمع ارائه کن",
    detail: "حتی دو دقیقه — درباره‌ی یک کتاب، یک پروژه یا یک تجربه‌ی خودت.",
  },
];

export function SocialTab({
  data,
  mutate,
  busy,
  todayClosed,
}: {
  data: Workspace;
  mutate: Mutate;
  busy: boolean;
  todayClosed: boolean;
}) {
  const today = todayKey();
  const logs = data.socialLogs;
  const [title, setTitle] = useState("");
  const [feared, setFeared] = useState("");
  const [prediction, setPrediction] = useState(7);
  const [outcome, setOutcome] = useState(4);
  const [note, setNote] = useState("");

  const total = logs.length;
  const avgPrediction = total
    ? Math.round((logs.reduce((sum, log) => sum + log.prediction, 0) / total) * 10) / 10
    : null;
  const avgOutcome = total ? Math.round((logs.reduce((sum, log) => sum + log.outcome, 0) / total) * 10) / 10 : null;
  const gap = avgPrediction != null && avgOutcome != null ? Math.round((avgPrediction - avgOutcome) * 10) / 10 : null;
  const todayLogs = logs.filter((log) => log.day === today).length;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const saved = await mutate(
      { action: "social.log", title: cleanTitle, feared: feared.trim(), prediction, outcome, note: note.trim() },
      "مواجهه‌ات ثبت شد؛ ترس را اندازه گرفتی، این خودش پیروزی است.",
    );
    if (saved) {
      setTitle("");
      setFeared("");
      setPrediction(7);
      setOutcome(4);
      setNote("");
    }
  };

  const remove = (id: string) => {
    if (!window.confirm("این مواجهه از دفترچه حذف شود؟")) return;
    void mutate({ action: "social.delete", id }, "از دفترچه حذف شد.");
  };

  return (
    <>
      <div className="medical-note social-safety">
        <ShieldAlert size={19} />
        <div>
          <strong>اول از همه: من مربی مجازی‌ام، روانشناس نیستم.</strong>
          <p>
            اگر این حس با ناامیدی عمیق، گریه‌ی بی‌پایان، بی‌خوابی جدی یا فکر آسیب به خودت همراه شد، لطفاً همین حالا با
            اورژانس اجتماعی <b>۱۲۳</b>، اورژانس <b>۱۱۵</b> یا سامانه‌ی <b>۱۴۸۰</b> (مشاوره‌ی تلفنی بهزیستی) تماس بگیر.
            اگر حس می‌کنی تمرینِ تنها کافی نیست، یه روانشناس خوب پیدا کن — این نشانه ضعف نیست؛ سرمایه‌گذاری روی خودته.
          </p>
        </div>
      </div>

      <section className="panel social-intro">
        <div className="section-heading">
          <div>
            <h2>درون‌گرا ≠ ناتوان در اجتماع</h2>
            <p>چیزی که توصیف کردی، بین «خلق» و «اضطراب» گیر کرده؛ این دو را جدا کنیم:</p>
          </div>
          <HeartHandshake size={18} className="purple-text" />
        </div>
        <ul className="social-facts">
          <li>
            <strong>درون‌گرایی خلق توست، نه بیماری.</strong> یعنی انرژی‌ات را بیشتر از تنهایی می‌گیری؛ نه از مهمانی‌های
            شلوغ. عیب نیست؛ نیاز به مدیریت دارد، نه درمان.
          </li>
          <li>
            <strong>اضطراب اجتماعی فرقش این است:</strong> قبل از جمع، پیش‌بینی می‌کنی قضاوت می‌شوی؛ حین جمع، یا قفل
            می‌کنی یا می‌ترسی؛ بعد از جمع، خودت را مرور و سرزنش می‌کنی؛ نتیجه: اجتناب. این یکی دقیقاً تمرین‌کردنی است.
          </li>
          <li>
            <strong>هیچ‌کس آن‌قدر که ذهنت می‌ترسد بهت نگاه نمی‌کند.</strong> دیگران گرفتار خودشان‌اند؛ بیشترشان اصلاً
            متوجه تو نبودند.
          </li>
          <li>
            <strong>«پذیرفته شدنِ همه» هدف غیرممکنی است.</strong> حتی کاریزماتیک‌ترین آدم‌های دنیا هم همه‌جا پذیرفته
            نیستند. هدف واقعی: ۳ تا ۵ نفر که تو را واقعی بشناسند و رهایت نکرده باشند.
          </li>
        </ul>
        <p className="social-quote">
          «اضطراب اجتماعی از پیش‌بینی ذهنت تغذیه می‌کند؛ دفترچه‌ی پایین دقیقاً همان را می‌شکند — هر بار پیش‌بینی‌ات را با
          واقعیت مقایسه کن.»
        </p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>
              ترس را اندازه بگیر <span className="count-badge">{fa(total)} مواجهه</span>
            </h2>
            <p>
              هر بار قبل از موقعیت پیش‌بینی کن چقدر سخت است؛ بعدش واقعاً بود. شکافش معمولاً بزرگ‌تر از چیزی است که فکر
              می‌کنی.
            </p>
          </div>
          <Info size={18} className="purple-text" />
        </div>
        <div className="social-stats">
          <div className="social-stat">
            <strong>{fa(total)}</strong>
            <span>کل مواجهه‌ها ثبت شده</span>
          </div>
          <div className="social-stat">
            <strong>{avgPrediction != null ? fa(avgPrediction) : "—"}</strong>
            <span>میانگین پیش‌بینی سختی (از ۱۰)</span>
          </div>
          <div className="social-stat">
            <strong>{avgOutcome != null ? fa(avgOutcome) : "—"}</strong>
            <span>میانگین سختی واقعی (از ۱۰)</span>
          </div>
          <div className="social-stat gap">
            <strong>{gap != null ? fa(Math.max(0, gap)) : "—"}</strong>
            <span>{gap != null && gap > 0 ? "امتیاز اضافهٔ اضطراب نسبت به واقعیت" : "هنوز داده کافی نیست"}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>نردبان مواجهه</h2>
            <p>
              از پله‌ی ۱ شروع کن و هر ۲ تا ۴ هفته یک پله بالا برو. لازم نیست همه را یکجا انجام دهی؛ لازم است هر روز یک
              تعامل واقعی داشته باشی (نگاه کن به تیک قانون «پیوند اجتماعی» در «امروز»).
            </p>
          </div>
          <ChevronLeft size={16} className="purple-text" />
        </div>
        <ol className="social-ladder">
          {ladder.map((item) => (
            <li key={item.step}>
              <span className="social-step">{fa(item.step)}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>دفترچه‌ی مواجهه‌ی من</h2>
            <p>بعدِ یک تعامل واقعی، این‌جا ثبتش کن. سه خط بیشتر نیست؛ همین سه خط درمان را جلو می‌اندازد.</p>
          </div>
          <NotebookPen size={18} className="purple-text" />
        </div>
        {todayClosed ? (
          <div className="lock-banner compact">
            <Lock size={16} />
            <div>
              <strong>امروز بسته شده است.</strong>
              <p>ثبت مواجهه‌ی جدید تا نیمه‌شب بعد قفل است؛ فردا از سر می‌گیری.</p>
            </div>
          </div>
        ) : (
          <form className="social-form" onSubmit={submit}>
            <div className="form-grid">
              <label>
                با کی و کجا؟
                <input
                  name="title"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="مثلاً: فروشنده‌ی نانوایی سر چهارراه"
                />
              </label>
              <label>
                چی می‌ترسیدی که بشه؟
                <input
                  name="feared"
                  maxLength={300}
                  value={feared}
                  onChange={(event) => setFeared(event.target.value)}
                  placeholder="مثلاً: بگه چیزی احمقانه بگم"
                />
              </label>
            </div>
            <div className="social-ranges">
              <label>
                قبل از: چقدر سخت به نظر می‌رسید؟ <strong>{fa(prediction)} از ۱۰</strong>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={prediction}
                  onChange={(event) => setPrediction(Number(event.target.value))}
                  aria-label="پیش‌بینی سختی"
                />
              </label>
              <label>
                بعد از: واقعاً چقدر سخت بود؟ <strong>{fa(outcome)} از ۱۰</strong>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={outcome}
                  onChange={(event) => setOutcome(Number(event.target.value))}
                  aria-label="سختی واقعی"
                />
              </label>
            </div>
            <label>
              چی شد؟ چی یاد گرفتی؟
              <textarea
                name="note"
                rows={2}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="مثلاً: رسیدگی جواب داد؛ لبخند زد و گفت روز به خیر"
              />
            </label>
            <div className="review-actions">
              <button className="button primary small" type="submit" disabled={busy || !title.trim()}>
                <Check size={14} /> ثبت این مواجهه{todayLogs > 0 ? ` (امروز: ${fa(todayLogs)})` : ""}
              </button>
            </div>
          </form>
        )}
        {logs.length > 0 && (
          <ul className="social-log-list">
            {logs.slice(0, 14).map((log) => (
              <li key={log.id}>
                <div className="social-log-main">
                  <div className="social-log-top">
                    <strong>{log.title}</strong>
                    <span className="social-log-date">{dayShortLabel(log.day)}</span>
                  </div>
                  <div className="social-log-chips">
                    <span className="chip prediction">پیش‌بینی {fa(log.prediction)}</span>
                    <span className="chip outcome">واقعیت {fa(log.outcome)}</span>
                    {log.prediction - log.outcome > 0 && (
                      <span className="chip gap-good">ترس {fa(log.prediction - log.outcome)} امتیاز اضافه بود</span>
                    )}
                  </div>
                  {log.feared.trim() && <p className="social-log-feared">می‌ترسیدم: «{log.feared.trim()}»</p>}
                  {log.note.trim() && <p className="social-log-note">{log.note.trim()}</p>}
                </div>
                <button
                  className="icon-button danger-hover"
                  onClick={() => remove(log.id)}
                  aria-label={`حذف ${log.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
