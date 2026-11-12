import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { db, pool } from "@/db";
import { checkins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { todayKey, type Workspace } from "@/lib/types";

async function main() {
  const base = process.env.TEST_BASE_URL || "http://localhost:3000";
  async function getData(): Promise<Workspace> { const result = await fetch(`${base}/api/workspace`).then((response) => response.json()); return result.data; }
  async function post(input: Record<string, unknown>): Promise<Workspace> { const response = await fetch(`${base}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }); const result = await response.json(); assert.equal(response.status, 200, JSON.stringify(result)); return result.data; }
  const original = await getData();
  const originalCheckin = original.checkins.find((entry) => entry.day === todayKey());
  const project = original.projects[0];
  const ids = { tasks: [] as string[], jobs: [] as string[], notes: [] as string[], finance: [] as string[] };
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const nav = () => page.getByRole("navigation", { name: "منوی اصلی" });
  const pendingSave = () => page.waitForResponse((response) => response.url().endsWith("/api/workspace") && response.request().method() === "POST");
  try {
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("main h1")).toContainText("خوش اومدی");
    await page.getByRole("button", { name: "افزودن کار", exact: true }).click();
    let dialog = page.getByRole("dialog");
    const taskTitle = "آزمون موقت ذخیره قدم روزانه";
    await dialog.getByLabel("عنوان قدم امروز").fill(taskTitle);
    await Promise.all([pendingSave(), dialog.getByRole("button", { name: "ذخیره تغییرات" }).click()]);
    await expect(dialog).not.toBeVisible();
    const createdTask = (await getData()).tasks.find((task) => task.title === taskTitle)!;
    ids.tasks.push(createdTask.id);
    const checkbox = page.getByRole("checkbox", { name: taskTitle, exact: true });
    await Promise.all([pendingSave(), checkbox.click()]);
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("checkbox", { name: taskTitle, exact: true })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: `حذف ${taskTitle}`, exact: true }).click();
    await Promise.all([pendingSave(), page.getByRole("dialog").getByRole("button", { name: "بله، حذف شود" }).click()]);
    await expect(page.getByRole("checkbox", { name: taskTitle, exact: true })).toHaveCount(0);
    console.log("PASS: create task, persist completion after reload, confirmed deletion");

    await page.getByRole("button", { name: "معمولی", exact: true }).click();
    await page.getByLabel("یادداشت حال امروز", { exact: true }).fill("یادداشت موقت آزمون؛ پس از آزمون حذف می‌شود.");
    await Promise.all([pendingSave(), page.getByRole("button", { name: /ثبت حال امروز|به‌روزرسانی حال امروز/ }).click()]);
    let data = await getData();
    assert.equal(data.checkins.find((entry) => entry.day === todayKey())?.mood, 3);
    await nav().getByRole("button", { name: "حال خوب و عادت‌ها", exact: true }).click();
    await page.getByLabel("امروز کانابیس مصرف نکردم", { exact: true }).check();
    await Promise.all([pendingSave(), page.getByRole("button", { name: "به‌روزرسانی حال امروز", exact: true }).click()]);
    data = await getData();
    assert.equal(data.checkins.find((entry) => entry.day === todayKey())?.cannabisFree, true);
    assert.ok(data.checkins.find((entry) => entry.day === todayKey())?.note.includes("یادداشت موقت آزمون"));
    console.log("PASS: mood and habit updates preserve each other");

    await nav().getByRole("button", { name: "نقشه راه من" }).click();
    await Promise.all([pendingSave(), page.getByRole("button", { name: "افزودن به امروز", exact: true }).first().click()]);
    data = await getData();
    const roadmapTask = data.tasks.find((task) => !original.tasks.some((old) => old.id === task.id) && task.title !== taskTitle);
    assert.ok(roadmapTask); ids.tasks.push(roadmapTask.id);
    await expect(page.getByRole("button", { name: "در برنامه امروز", exact: true }).first()).toBeDisabled();
    console.log("PASS: roadmap milestone adds a real daily task");

    data = await post({ action: "job.create", company: "شرکت موقت آزمون", role: "نقش موقت آزمون", status: "waiting", url: "https://example.com/job", note: "یادداشت آزمون" });
    const job = data.applications.find((item) => item.role === "نقش موقت آزمون")!; ids.jobs.push(job.id);
    data = await post({ action: "job.update", id: job.id, status: "interview" });
    assert.equal(data.applications.find((item) => item.id === job.id)?.status, "interview");
    await nav().getByRole("button", { name: "مسیر شغلی", exact: true }).click();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("نقش موقت آزمون", { exact: true })).toBeVisible();
    console.log("PASS: application tracking and hash navigation persist");

    data = await post({ action: "finance.create", title: "درآمد موقت آزمون", amount: 125000, type: "income" });
    ids.finance.push(data.transactions.find((item) => item.title === "درآمد موقت آزمون")!.id);
    data = await post({ action: "finance.create", title: "پس‌انداز موقت آزمون", amount: 10000, type: "saving" });
    ids.finance.push(data.transactions.find((item) => item.title === "پس‌انداز موقت آزمون")!.id);
    assert.equal(data.transactions.find((item) => item.title === "پس‌انداز موقت آزمون")?.amount, 10000);
    data = await post({ action: "note.save", title: "یادداشت موقت آزمون", body: "متن اولیه" });
    const note = data.notes.find((item) => item.title === "یادداشت موقت آزمون")!; ids.notes.push(note.id);
    data = await post({ action: "note.save", id: note.id, title: note.title, body: "متن ویرایش‌شده" });
    assert.equal(data.notes.find((item) => item.id === note.id)?.body, "متن ویرایش‌شده");
    data = await post({ action: "project.step", id: project.id, index: 1, done: !project.steps[1].done });
    assert.equal(data.projects.find((item) => item.id === project.id)?.steps[1].done, !project.steps[1].done);
    console.log("PASS: finance, notes, project progress persistence");

    data = await post({ action: "task.create", title: "آزمون موقت برنامه ساعتی", category: "career", minutes: 20, time: "07:15" });
    const timed = data.tasks.find((task) => task.title === "آزمون موقت برنامه ساعتی")!;
    ids.tasks.push(timed.id);
    assert.equal(timed.time, "07:15");
    data = await post({ action: "task.time", id: timed.id, time: "13:45" });
    assert.equal(data.tasks.find((task) => task.id === timed.id)?.time, "13:45");
    await nav().getByRole("button", { name: "پیشرفت من", exact: true }).click();
    await expect(page.getByRole("heading", { name: "پیشرفت ۱۴ روز گذشته" })).toBeVisible();
    await expect(page.locator(".chart-column")).toHaveCount(14);
    const beforeTarget = original.settings.dailyTarget;
    await page.getByRole("button", { name: "افزایش تعهد", exact: true }).click();
    await Promise.all([pendingSave(), page.getByRole("button", { name: "ثبت تعهد", exact: true }).click()]);
    data = await getData();
    assert.equal(data.settings.dailyTarget, Math.min(20, beforeTarget + 1));
    await post({ action: "settings.update", name: data.settings.name, startedOn: data.settings.startedOn, savingGoal: data.settings.savingGoal, dailyTarget: beforeTarget });
    await nav().getByRole("button", { name: "نمای کلی", exact: true }).click();
    await expect(page.locator(".time-block")).toHaveCount(5);
    await expect(page.locator(".time-block").first()).toContainText("صبح");
    await expect(page.locator(".commitment-strip")).toContainText("تعهد روزانه");
    await expect(page.locator(".next-action")).toContainText("قدم بعدی تو");
    console.log("PASS: scheduled task blocks, progress chart, daily commitment target");

    const invalid = await fetch(`${base}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finance.create", title: "رد شود", amount: -5, type: "income" }) });
    assert.equal(invalid.status, 400);
    const unsafeLink = await fetch(`${base}/api/workspace`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "project.link", id: project.id, link: "javascript:alert(1)" }) });
    assert.equal(unsafeLink.status, 400);
    console.log("PASS: invalid amounts and unsafe links rejected");

    await page.getByRole("textbox", { name: "جست‌وجو در مسیر من", exact: true }).fill("دانش");
    await page.locator(".search-popover").getByRole("button", { name: /دانش‌بوک/ }).click();
    await expect(page.getByRole("dialog", { name: "دانش‌بوک" })).toBeVisible();
    await page.getByRole("button", { name: "بستن پنجره", exact: true }).click();
    console.log("PASS: global search opens matching project");
  } finally {
    for (const id of ids.tasks) await post({ action: "task.delete", id });
    for (const id of ids.jobs) await post({ action: "job.delete", id });
    for (const id of ids.notes) await post({ action: "note.delete", id });
    for (const id of ids.finance) await post({ action: "finance.delete", id });
    await post({ action: "project.step", id: project.id, index: 1, done: project.steps[1].done });
    await post({ action: "settings.update", name: original.settings.name, startedOn: original.settings.startedOn, savingGoal: original.settings.savingGoal, dailyTarget: original.settings.dailyTarget });
    await db.delete(checkins).where(eq(checkins.day, todayKey()));
    if (originalCheckin) await db.insert(checkins).values(originalCheckin);
    await pool.end();
    console.log("RESTORED: original personal data; no test records left behind");
  }
  try {
    await page.goto(`${base}/#overview`, { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await mkdir("artifacts", { recursive: true });
    await page.screenshot({ path: "artifacts/dashboard-desktop.png", fullPage: true });
    await page.screenshot({ path: "artifacts/dashboard-viewport.png" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    for (const title of ["نقشه راه من", "مسیر شغلی", "پروژه‌های من", "حال خوب و عادت‌ها", "مدیریت مالی", "یادداشت‌های من"]) {
      await nav().getByRole("button", { name: title, exact: title !== "نقشه راه من" }).click();
      await expect(page.locator("main h1")).toBeVisible();
    }
    await nav().getByRole("button", { name: "نمای کلی", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "artifacts/dashboard-mobile.png", fullPage: true });
    await page.screenshot({ path: "artifacts/dashboard-mobile-viewport.png" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole("button", { name: "باز کردن منو", exact: true }).click();
    await nav().getByRole("button", { name: "مسیر شغلی", exact: true }).click();
    await expect(page.locator("main h1")).toHaveText("مسیر شغلی تو");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log("PASS: all views, desktop/mobile layout, mobile navigation, zero page errors");
    console.log("Screenshots: artifacts/dashboard-{desktop,viewport,mobile}.png");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exit(1); });
