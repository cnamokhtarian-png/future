import { describe, expect, it } from "vitest";

import { addDaysKey, todayKey, type Checkin, type Task, type Transaction, type Workspace } from "@/lib/types";
import {
  blockOf,
  computeStreak,
  dayStats,
  formatTime,
  goalFor,
  projectPercent,
  recentDays,
  savingsTotal,
  weekStats,
} from "@/lib/stats";

const daysAgo = (n: number) => addDaysKey(todayKey(), -n);

function task(day: string, done: boolean, minutes = 30): Task {
  return {
    id: Math.random().toString(36).slice(2),
    day,
    done,
    title: "قدم",
    category: "personal",
    minutes,
    time: null,
    createdAt: `${day} 08:00:00.000`,
  } as Task;
}

function checkin(day: string, mood: number): Checkin {
  return {
    day,
    mood,
    note: "",
    cannabisFree: true,
    alcoholFree: true,
    walked: true,
    sleepHours: 8,
    cigarettes: 0,
    updatedAt: `${day} 21:00:00.000`,
  } as Checkin;
}

describe("dayStats / goalFor", () => {
  it("computes totals, done count and percent", () => {
    const tasks = [task(daysAgo(0), true), task(daysAgo(0), false), task(daysAgo(1), true)];
    expect(dayStats(tasks, daysAgo(0))).toEqual({ total: 2, done: 1, percent: 50, met: false });
    expect(dayStats(tasks, daysAgo(1)).percent).toBe(100);
    expect(dayStats([], daysAgo(0))).toEqual({ total: 0, done: 0, percent: 0, met: false });
  });

  it("clamps the commitment to the number of planned steps", () => {
    expect(goalFor({ total: 2, done: 0, percent: 0, met: false }, 5)).toBe(2);
    expect(goalFor({ total: 0, done: 0, percent: 0, met: false }, 5)).toBe(0);
    expect(goalFor({ total: 9, done: 0, percent: 0, met: false }, 3)).toBe(3);
  });
});

describe("computeStreak", () => {
  it("counts consecutive met days ending today (or yesterday)", () => {
    const tasks = [
      task(daysAgo(0), true),
      task(daysAgo(0), true),
      task(daysAgo(1), true),
      task(daysAgo(1), true),
      task(daysAgo(2), false),
      task(daysAgo(2), false),
    ];
    const { streak } = computeStreak(tasks, 2);
    expect(streak).toBe(2);
  });

  it("an unmet today does not erase the run from previous days", () => {
    const tasks = [task(daysAgo(0), false), task(daysAgo(1), true), task(daysAgo(2), true)];
    const { streak } = computeStreak(tasks, 1);
    expect(streak).toBe(2);
  });
});

describe("recentDays", () => {
  it("returns a chronological window ending today", () => {
    const days = recentDays([task(daysAgo(0), true)], 3);
    expect(days.map((day) => day.day)).toEqual([daysAgo(2), daysAgo(1), daysAgo(0)]);
    expect(days[2].done).toBe(1);
  });
});

describe("weekStats", () => {
  it("rolls up done steps, focus minutes, met days, mood and percent", () => {
    const tasks = [
      task(daysAgo(0), true, 20),
      task(daysAgo(0), true, 30),
      task(daysAgo(1), true, 5),
    ];
    const checkins = [checkin(daysAgo(0), 2), checkin(daysAgo(1), 4)];
    const week = weekStats(tasks, checkins, 2);
    expect(week.days).toBe(7);
    expect(week.done).toBe(3);
    expect(week.focusMinutes).toBe(55);
    expect(week.planned).toBe(2);
    expect(week.metDays).toBe(2);
    expect(week.avgPercent).toBe(100);
    expect(week.avgMood).toBe(3);
    expect(week.checkins).toBe(2);
  });

  it("treats a week with no plan and no check-in gracefully", () => {
    const week = weekStats([], [], 3);
    expect(week.done).toBe(0);
    expect(week.planned).toBe(0);
    expect(week.avgPercent).toBe(0);
    expect(week.avgMood).toBeNull();
    expect(week.checkins).toBe(0);
  });
});

describe("blockOf / formatTime", () => {
  it("maps clock times to day blocks", () => {
    expect(blockOf("07:30")).toBe("morning");
    expect(blockOf("13:00")).toBe("noon");
    expect(blockOf("17:45")).toBe("afternoon");
    expect(blockOf("22:15")).toBe("night");
    expect(blockOf(null)).toBeNull();
  });

  it("formats 24h times without a leading zero", () => {
    expect(formatTime("09:05")).toBe("9:05");
    expect(formatTime(null)).toBe("");
  });
});

describe("savingsTotal / projectPercent", () => {
  it("sums only saving transactions", () => {
    const items = [
      { type: "saving", amount: 100 },
      { type: "expense", amount: 999 },
      { type: "saving", amount: 250 },
    ] as Transaction[];
    expect(savingsTotal(items)).toBe(350);
  });

  it("computes the done/total percentage across all projects", () => {
    const workspace = {
      projects: [
        { steps: [{ done: true }, { done: true }] },
        { steps: [{ done: false }, { done: false }] },
      ],
    } as unknown as Workspace;
    expect(projectPercent(workspace)).toBe(50);
  });
});
