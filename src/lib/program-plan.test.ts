import { describe, expect, it } from "vitest";

import { todayKey, type Checkin, type Workspace } from "@/lib/types";
import {
  autoDoneFor,
  effectiveCompleted,
  monthKeyOf,
  monthLabelOf,
  parseTimestamp,
  programDayComplete,
  programRuleIds,
  programRules,
  programStreak,
} from "@/lib/program";
import { computeDeltas, type PlanItemLike } from "@/lib/plan";

const baseItem = {
  title: "کار",
  kind: "deepwork",
  time: "09:00",
  note: "",
  done: false,
  dropped: false,
  origin: "ai",
  base: null,
} satisfies PlanItemLike;

describe("parseTimestamp", () => {
  it("reads Postgres naive timestamps as UTC", () => {
    expect(parseTimestamp("2026-11-12 08:30:00.000")?.toISOString()).toBe("2026-11-12T08:30:00.000Z");
  });

  it("passes through ISO strings and rejects garbage", () => {
    expect(parseTimestamp("2026-11-12T08:30:00Z")?.toISOString()).toBe("2026-11-12T08:30:00.000Z");
    expect(parseTimestamp("not a date")).toBeNull();
    expect(parseTimestamp("")).toBeNull();
  });
});

describe("monthKeyOf / monthLabelOf", () => {
  it("attributes late UTC hours to the next day in Tehran", () => {
    expect(monthKeyOf(new Date("2026-06-30T21:00:00Z"))).toBe("2026-07");
    expect(monthKeyOf(new Date("2026-06-30T10:00:00Z"))).toBe("2026-06");
  });

  it("labels a Gregorian month with its Jalali name", () => {
    const label = monthLabelOf("2026-07");
    expect(label).toContain("تیر");
    expect(label).toContain("۱۴۰۵");
  });
});

describe("autoDoneFor / effectiveCompleted / programDayComplete", () => {
  const cleanCheckin = {
    cigarettes: 0,
    cannabisFree: true,
    alcoholFree: true,
  } as Checkin;

  it("auto rule 'clean' needs a spotless check-in", () => {
    const rule = programRules.find((item) => item.id === "clean")!;
    expect(autoDoneFor(rule, { todayTransactions: [] })).toBe(false);
    expect(autoDoneFor(rule, { checkin: cleanCheckin, todayTransactions: [] })).toBe(true);
  });

  it("auto rule 'finance' needs at least one transaction today", () => {
    const rule = programRules.find((item) => item.id === "finance")!;
    expect(autoDoneFor(rule, { todayTransactions: [] })).toBe(false);
    expect(
      autoDoneFor(rule, {
        todayTransactions: [{ id: "x" } as never],
      }),
    ).toBe(true);
  });

  it("drops unknown ids from the manual list and adds satisfied auto rules", () => {
    const done = effectiveCompleted(["wake", "bogus-rule"], {
      checkin: cleanCheckin,
      todayTransactions: [],
    });
    expect(done).toContain("wake");
    expect(done).toContain("clean");
    expect(done).not.toContain("bogus-rule");
  });

  it("programDayComplete only when every rule is satisfied", () => {
    const incomplete = programDayComplete(["wake"], { todayTransactions: [] });
    expect(incomplete).toBe(false);
    const complete = programDayComplete([...programRuleIds], { todayTransactions: [] });
    expect(complete).toBe(true);
  });
});

describe("programStreak", () => {
  it("counts a fully completed today as a 1-day streak", () => {
    const workspace = {
      tasks: [],
      transactions: [],
      checkins: [],
      programDays: [{ day: todayKey(), completed: [...programRuleIds], note: "", updatedAt: `${todayKey()} 21:00:00.000` }],
    } as unknown as Workspace;
    const { streak, best } = programStreak(workspace);
    expect(streak).toBe(1);
    expect(best).toBeGreaterThanOrEqual(1);
  });
});

describe("computeDeltas", () => {
  it("detects added, dropped, substituted, rescheduled items and notes", () => {
    const deltas = computeDeltas([
      { ...baseItem, title: "پیاده‌روی عصر", origin: "user" }, // added
      { ...baseItem, title: "کار مهم‌تر", done: true, base: { title: "کار", kind: "deepwork", time: "09:00" } }, // substituted
      { ...baseItem, title: "جلسه", base: { title: "جلسه", kind: "deepwork", time: "09:00" }, time: "10:30" }, // rescheduled
      { ...baseItem, title: "گران‌قیمت", dropped: true }, // dropped
      { ...baseItem, title: "مطالعه", note: "یک جمله درباره امروز" }, // note
    ]);
    expect(deltas.planned).toBe(4);
    expect(deltas.done).toBe(1);
    expect(deltas.added).toEqual(["پیاده‌روی عصر"]);
    expect(deltas.dropped).toEqual(["گران‌قیمت"]);
    expect(deltas.substituted).toEqual([{ from: "کار", to: "کار مهم‌تر" }]);
    expect(deltas.rescheduled).toEqual([{ title: "جلسه", from: "09:00", to: "10:30" }]);
    expect(deltas.notes).toEqual(["مطالعه: یک جمله درباره امروز"]);
  });

  it("counts only non-dropped items as planned", () => {
    const deltas = computeDeltas([{ ...baseItem, dropped: true }]);
    expect(deltas.planned).toBe(0);
    expect(deltas.done).toBe(0);
  });
});
