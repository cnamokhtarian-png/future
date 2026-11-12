import { describe, expect, it } from "vitest";

import { tehranDayKey } from "@/lib/tehran-day";
import { addDaysKey, fa, projectProgress, todayKey, type Project } from "@/lib/types";

describe("tehranDayKey", () => {
  it("returns the Tehran calendar day, not the UTC day", () => {
    // 2026-03-20 20:59:59 UTC مصادف است با بامداد ۲۱ فروردین ۱۴۰۵ در تهران
    expect(tehranDayKey(new Date("2026-03-20T20:59:59Z"))).toBe("2026-03-21");
    expect(tehranDayKey(new Date("2026-03-20T19:00:00Z"))).toBe("2026-03-20");
  });

  it("matches the YYYY-MM-DD shape everywhere", () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("todayKey / addDaysKey", () => {
  it("walks across month and year boundaries", () => {
    expect(addDaysKey("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysKey("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("fa", () => {
  it("formats numbers with Persian digits", () => {
    expect(fa(3)).toBe("۳");
    expect(fa(1200)).toContain("۱");
  });

  it("converts ASCII digits inside strings", () => {
    expect(fa("ساعت 9:30")).toBe("ساعت ۹:۳۰");
  });
});

describe("projectProgress", () => {
  it("rounds the completion percentage of project steps", () => {
    const project = {
      steps: [{ done: true }, { done: false }, { done: false }],
    } as unknown as Project;
    expect(projectProgress(project)).toBe(33);
  });

  it("returns 0 for projects without steps", () => {
    const project = { steps: [] } as unknown as Project;
    expect(projectProgress(project)).toBe(0);
  });
});
