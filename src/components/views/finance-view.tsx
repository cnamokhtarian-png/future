"use client";

import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, ArrowUpLeft, PawPrint, Trash2, Info } from "lucide-react";
import { fa, todayKey, type Workspace, type Mutation } from "@/lib/types";
import { Money, PersianDate, Progress, EmptyState, IconBox } from "@/components/ui";
import { parseTimestamp, monthKeyOf, monthLabelOf } from "@/lib/program";

export function FinanceView({
  data,
  onAdd,
  onDelete,
  onSettings,
}: {
  data: Workspace;
  onAdd: () => void;
  onDelete: (action: Mutation, message: string) => void;
  onSettings: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const income = data.transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = data.transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const saved = data.transactions.filter((item) => item.type === "saving").reduce((sum, item) => sum + item.amount, 0);
  const rows = data.transactions.filter((item) =>
    filter === "all" ? true : filter === "cats" ? item.category === "cats" : item.type === filter,
  );
  const thisMonthKey = monthKeyOf(new Date(`${todayKey()}T12:00:00Z`));
  const catsAllTime = data.transactions
    .filter((item) => item.type === "expense" && item.category === "cats")
    .reduce((sum, item) => sum + item.amount, 0);
  const catsThisMonth = data.transactions
    .filter((item) => {
      if (item.type !== "expense" || item.category !== "cats") return false;
      const parsed = parseTimestamp(item.createdAt);
      return Boolean(parsed) && monthKeyOf(parsed!) === thisMonthKey;
    })
    .reduce((sum, item) => sum + item.amount, 0);
  const percent = Math.min(100, Math.round((saved / data.settings.savingGoal) * 100));
  const monthBuckets = new Map<string, { income: number; expense: number; saving: number }>();
  for (const item of data.transactions) {
    const parsed = parseTimestamp(item.createdAt);
    if (!parsed) continue;
    const key = monthKeyOf(parsed);
    const bucket = monthBuckets.get(key) || { income: 0, expense: 0, saving: 0 };
    if (item.type === "income") bucket.income += item.amount;
    else if (item.type === "expense") bucket.expense += item.amount;
    else bucket.saving += item.amount;
    monthBuckets.set(key, bucket);
  }
  const anchor = new Date(`${todayKey()}T12:00:00Z`);
  const monthKeys: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    const date = new Date(anchor);
    date.setUTCMonth(date.getUTCMonth() - index);
    monthKeys.push(monthKeyOf(date));
  }
  const monthRows = monthKeys
    .map((key) => ({
      key,
      label: monthLabelOf(key),
      ...(monthBuckets.get(key) || { income: 0, expense: 0, saving: 0 }),
    }))
    .reverse();
  const monthMax = Math.max(1, ...monthRows.map((row) => Math.max(row.income, row.expense, row.saving)));
  const thisMonth = monthRows[monthRows.length - 1];
  const thisMonthNet = thisMonth.income - thisMonth.expense - thisMonth.saving;
  const savingRate = thisMonth.income > 0 ? Math.round((thisMonth.saving / thisMonth.income) * 100) : null;
  const expenseRate = thisMonth.income > 0 ? Math.round((thisMonth.expense / thisMonth.income) * 100) : null;
  const monthsWithData = monthRows.filter((row) => row.income || row.expense || row.saving);
  const avgExpense = monthsWithData.length
    ? Math.round(monthsWithData.reduce((sum, row) => sum + row.expense, 0) / monthsWithData.length)
    : 0;
  return (
    <div className="view-stack">
      <div className="info-banner">
        <IconBox icon={Wallet} />
        <div>
          <h3>اول امنیت مالی، بعد رشد سرمایه.</h3>
          <p>فعلاً اولویت با خوراک، مسکن، رفت‌وآمد و درآمد ثابت است؛ نه دوره پولی، خرید دامنه یا معامله رمزارز.</p>
        </div>
        <button className="button primary small" onClick={onAdd}>
          <Plus size={15} /> ثبت تراکنش
        </button>
      </div>
      <div className="finance-stats">
        {[
          { title: "درآمد ثبت‌شده", amount: income, icon: TrendingUp, color: "green" },
          { title: "هزینه ثبت‌شده", amount: expense, icon: TrendingDown, color: "peach" },
          { title: "پس‌انداز کنارگذاشته‌شده", amount: saved, icon: PiggyBank, color: "purple" },
          { title: "مانده محاسبه‌شده", amount: income - expense - saved, icon: Wallet, color: "blue" },
        ].map((stat) => (
          <div className="panel finance-stat" key={stat.title}>
            <IconBox icon={stat.icon} color={stat.color} />
            <span>{stat.title}</span>
            <strong>
              <Money amount={stat.amount} />
            </strong>
          </div>
        ))}
      </div>
      <section className="panel savings-panel">
        <IconBox icon={PiggyBank} color="purple" className="large-icon" />
        <div className="savings-content">
          <div className="section-heading">
            <div>
              <h2>اولین قدمِ صندوق اضطراری</h2>
              <p>وقتی ضروریات تأمین شد، حتی یک مبلغ کوچک ارزش دارد؛ نه به قیمت غذا و اجاره.</p>
            </div>
            <button className="text-button" onClick={onSettings}>
              تغییر هدف <ArrowUpLeft size={14} />
            </button>
          </div>
          <div className="project-progress-label">
            <span>
              <Money amount={saved} /> از <Money amount={data.settings.savingGoal} />
            </span>
            <strong>{fa(percent)}٪</strong>
          </div>
          <Progress value={percent} />
        </div>
      </section>
      <section className="panel months-panel">
        <div className="section-heading">
          <div>
            <h2>این ماه تو چقدر خرج شد؟</h2>
            <p>جمع‌بندی ۶ ماه اخیر؛ درآمد، هزینه و پس‌انداز هر ماه کنار هم. ماه جاری در پایین پررنگ است.</p>
          </div>
          <button className="text-button" onClick={onAdd}>
            <Plus size={13} /> ثبت تراکنش
          </button>
        </div>
        <div className="month-summary-chips">
          <span className="month-chip">
            <span>میانگین هزینه ماهانه</span>
            <strong>
              <Money amount={avgExpense} />
            </strong>
          </span>
          <span className="month-chip">
            <span>نرخ پس‌انداز این ماه</span>
            <strong>{savingRate == null ? "—" : `${fa(savingRate)}٪`}</strong>
          </span>
          <span className="month-chip">
            <span>هزینه نسبت به درآمد این ماه</span>
            <strong>{expenseRate == null ? "—" : `${fa(expenseRate)}٪`}</strong>
          </span>
          <span className="month-chip cats-chip">
            <span>
              <PawPrint size={12} /> هزینه‌ی گربه‌ها این ماه
            </span>
            <strong>{catsThisMonth > 0 ? <Money amount={catsThisMonth} /> : "—"}</strong>
            {catsAllTime > 0 && <small>در کل {fa(catsAllTime)} تومان ثبت شده</small>}
          </span>
        </div>
        <div className="month-rows">
          {monthRows.map((row, index) => {
            const isCurrent = index === monthRows.length - 1;
            const net = row.income - row.expense - row.saving;
            return (
              <div className={`month-row ${isCurrent ? "current" : ""}`} key={row.key}>
                <div className="month-label">
                  <strong>{row.label}</strong>
                  {isCurrent && <span className="pill purple">این ماه</span>}
                </div>
                <div className="month-bars">
                  <div className="month-bar income" title={`درآمد ${fa(row.income)} تومان`}>
                    <span style={{ width: `${Math.round((row.income / monthMax) * 100)}%` }} />
                  </div>
                  <div className="month-bar expense" title={`هزینه ${fa(row.expense)} تومان`}>
                    <span style={{ width: `${Math.round((row.expense / monthMax) * 100)}%` }} />
                  </div>
                  <div className="month-bar saving" title={`پس‌انداز ${fa(row.saving)} تومان`}>
                    <span style={{ width: `${Math.round((row.saving / monthMax) * 100)}%` }} />
                  </div>
                </div>
                <div className="month-figures">
                  <span className="fig-income">+{fa(row.income)}</span>
                  <span className="fig-expense">-{fa(row.expense)}</span>
                  <span className={`fig-net ${net >= 0 ? "ok" : "bad"}`}>
                    {net >= 0 ? "مانده " : "کسری "}
                    {fa(Math.abs(net))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="month-legend">
          <span>
            <i className="legend-dot income" /> درآمد
          </span>
          <span>
            <i className="legend-dot expense" /> هزینه
          </span>
          <span>
            <i className="legend-dot saving" /> پس‌انداز
          </span>
          <span className="month-legend-note">مبالغ به تومان‌اند و از ثبت‌های خودت خوانده می‌شوند.</span>
        </div>
        <div className={`month-net-banner ${thisMonthNet >= 0 ? "ok" : "bad"}`}>
          {thisMonthNet >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
          <p>
            <strong>
              {thisMonthNet >= 0
                ? `این ماه تا این‌جای کار، ${fa(thisMonthNet)} تومان از خرج نخورده‌ات مانده.`
                : `این ماه ${fa(Math.abs(thisMonthNet))} تومان بیشتر از دریافتی‌ات خرج کرده‌ای.`}
            </strong>
            <span>
              {thisMonthNet >= 0
                ? "اول سهم پس‌انداز را از حساب جدا کن، بعد بقیه را خرج کن؛ نه برعکس."
                : "همین امروز خرج‌های غیرضروری را مرور کن و برای باقی‌مانده‌ی ماه، سقف هزینه‌ای مشخص کن."}
            </span>
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>دفتر دخل و خرج</h2>
            <p>همه مبلغ‌ها به تومان هستند. مانده فقط از ثبت‌های تو محاسبه می‌شود و موجودی حساب بانکی نیست.</p>
          </div>
          <button className="button outline small" onClick={onAdd}>
            <Plus size={15} /> تراکنش جدید
          </button>
        </div>
        <div className="filter-tabs">
          {[
            { key: "all", label: "همه تراکنش‌ها" },
            { key: "income", label: "درآمد" },
            { key: "expense", label: "هزینه" },
            { key: "saving", label: "پس‌انداز" },
            { key: "cats", label: "گربه‌ها" },
          ].map((tab) => (
            <button className={filter === tab.key ? "active" : ""} key={tab.key} onClick={() => setFilter(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
        {!rows.length ? (
          <EmptyState
            icon={Wallet}
            title="شفافیت از اولین ثبت شروع می‌شه"
            text="هنوز تراکنشی در این بخش ثبت نشده. با یک هزینه کوچک امروز یا اولین درآمدت شروع کن."
          >
            <button className="button outline small" onClick={onAdd}>
              <Plus size={15} /> ثبت اولین تراکنش
            </button>
          </EmptyState>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>شرح</th>
                  <th>نوع</th>
                  <th>مبلغ</th>
                  <th>تاریخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      {item.category === "cats" && (
                        <span className="pill peach cat-pill">
                          <PawPrint size={11} /> گربه‌ها
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`pill ${item.type === "income" ? "green" : item.type === "expense" ? "peach" : "purple"}`}
                      >
                        {item.type === "income" ? "درآمد" : item.type === "expense" ? "هزینه" : "پس‌انداز"}
                      </span>
                    </td>
                    <td>
                      <Money amount={item.amount} />
                    </td>
                    <td>
                      <PersianDate value={item.createdAt} />
                    </td>
                    <td>
                      <button
                        className="icon-button danger-hover"
                        onClick={() =>
                          onDelete({ action: "finance.delete", id: item.id }, "این تراکنش از دفترت حذف شود؟")
                        }
                        aria-label={`حذف ${item.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="page-footnote">
        <Info size={14} /> پیشنهاد اولیه: هزینه‌های یک هفته را ببین، بعد هدفی متناسب با درآمدت انتخاب کن. هیچ نرخ
        پس‌انداز ثابتی برای همه مناسب نیست.
      </p>
    </div>
  );
}
