# روبه‌راه (Robeh Rah)

فضای شخصی و تک‌کاربره برای ساختن مسیر زندگی: نقشه راه ۹۰ روزه، پیگیری فرصت‌های شغلی، پروژه‌های شخصی، ثبت حال روزانه، مدیریت مالی و یادداشت‌ها.

یک اپ Next.js (App Router) + PostgreSQL با Drizzle ORM است. داده‌ها در اسکیمای جدای `robehrah` در همان دیتابیس Supabase پروژه‌ی `auralis` ذخیره می‌شوند.

## پیش‌نیازها

- Node.js 20+ و npm
- دسترسی به یک دیتابیس PostgreSQL (برای تولید: Supabase pooler)

## متغیرهای محیطی

| متغیر                | توضیح                                                                                                                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | رشته اتصال PostgreSQL. برای Supabase از pooler استفاده کنید (مستقیم/Direct IPv6-only است). برای runtime سرورلس: پورت `6543` (transaction)، برای ابزارهای CLI: پورت `5432` (session). نام کاربری pooler دقیقاً `<role>.<project-ref>` است. |
| `SITE_AUTH_USER`     | اختیاری؛ فعال‌سازی Basic Auth کل سایت (پیشنهادی برای deploy عمومی).                                                                                                                                                                      |
| `SITE_AUTH_PASSWORD` | اختیاری؛ رمز Basic Auth.                                                                                                                                                                                                                 |
| `PG_POOL_MAX`        | اختیاری؛ اندازه pool اتصالات (پیش‌فرض ۵).                                                                                                                                                                                                |
| `GEMINI_API_KEY`     | اختیاری؛ کلید Gemini برای «دستیار هوشمند» و «مربی روبه‌راه» (سمت سرور فقط).                                                                                                                                                              |
| `CRON_SECRET`        | اختیاری؛ از مسیرهای `/api/cron/*` محافظت می‌کند. روی Vercel، هنگام فراخوانی کران به‌صورت Bearer خودکار ارسال می‌شود.                                                                                                                     |

نمونه در `.env.example` آمده است. `.env.local` در گیتignore شده.

## اجرا و تست

```bash
npm install
npm run build        # production build
npm run start        # اجرای سرور production
npm run dev          # حالت توسعه
npm run test         # typecheck + lint + build
node scripts/local-db.mjs &              # PostgreSQL محلی (PGlite، بدون نیاز به شبکه)
DATABASE_URL=postgresql://127.0.0.1:55432/postgres npm run start
DATABASE_URL=postgresql://127.0.0.1:55432/postgres TEST_BASE_URL=http://localhost:3000 npm run test:e2e
```

`npm run test:e2e` تست کامل واسط و API (با Playwright) است. در محیط‌هایی که CDN پلی‌رایت مسدود است، از Chromium بسته‌ی npm (`@sparticuz/chromium`) با کتابخانه‌های سیستمی `al2023` استفاده می‌شود؛ در سایر سیستم‌ها کافی است `npx playwright install chromium` را یک بار اجرا کنید.

## دیتابیس

- اسکیمای Drizzle: `src/db/schema.ts` (pgSchema به نام `robehrah`؛ هرگز با اسکیمای `public` اپ auralis برخورد نمی‌کند)
- migrations تولیدشده در `drizzle/` نگهداری می‌شوند (`npm run db:generate` برای تولید، اعمال روی Supabase از طریق SQL یا `npm run db:push` در شبکه‌ی آزاد)
- تمام جداول `journey_*` هستند و Row Level Security فعال است؛ نقش `robehrah_app` تنها نقش اپلیکیشن است و فقط روی همین اسکیما grant دارد.

## استقرار (Vercel)

پروژه‌ی Vercel مجزا به نام `robeh-rah` روی فریم‌ورک Next.js.

- `DATABASE_URL` → transaction pooler سوپابیس (`:6543`)
- نکته‌ی مهم: خانواده‌ی هاست pooler (`aws-0-...` یا `aws-1-...`) برای هر پروژه تعیین شده است؛ انتخاب اشتباه خطای `tenant/user ... not found` می‌دهد. برای پروژه‌ی auralis مقدار صحیح `aws-1-eu-central-1.pooler.supabase.com` است.
- `sslmode` در `src/db/index.ts` نادیده و حذف می‌شود؛ اتصال TLS با `rejectUnauthorized: false` برقرار می‌شود (گواهی زنجیره‌ای Supabase توسط CA عمومی تأیید نمی‌شود).
- `SITE_AUTH_USER` / `SITE_AUTH_PASSWORD` → برای محافظت از داده‌های شخصی روی دامنه‌ی عمومی
- اولین بازدید از سایت، داده‌های اولیه (تنظیمات، سه پروژه‌ی پیش‌فرض و قدم‌های امروز) را خودکار seed می‌کند.
- کران روزانه (`vercel.json` → `30 20 * * *` (UTC = ۰۰:۰۰ تهران)): هر شب ساعت ۰۰:۰۰ تهران، روزِ سپری‌شده قفل و جمع‌بندی می‌شود (با Gemini؛ اگر نبود، خلاصه‌ی قطعی) و برنامه‌ی ساعتی روز بعد نوشته می‌شود. نتیجه در جدول `journey_daily_reviews` و در تب «جمع‌بندی» بخش «چالش ۷۵ روزه» دیده می‌شود. `/api/cron/daily?secret=...&mode=backfill` برای ساخت کارنامه‌ی روزهای گذشته (فقط روزهایی با فعالیت) دستی قابل اجراست.
