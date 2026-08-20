import { describe, expect, it } from "vitest";
import { computeLifecycleStatus } from "./schedule";
import type { RaffleSchedule } from "./types";

function fakeTimestamp(date: Date) {
  return { toDate: () => date } as unknown as RaffleSchedule["registrationStart"];
}

function scheduleFor(startOffsetMs: number, endOffsetMs: number, now: Date): RaffleSchedule {
  return {
    timezone: "Africa/Lagos",
    registrationStart: fakeTimestamp(new Date(now.getTime() + startOffsetMs)),
    registrationEnd: fakeTimestamp(new Date(now.getTime() + endOffsetMs)),
    drawAt: fakeTimestamp(new Date(now.getTime() + endOffsetMs)),
  };
}

describe("computeLifecycleStatus", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("is UPCOMING before registration opens", () => {
    const schedule = scheduleFor(60_000, 120_000, now);
    expect(computeLifecycleStatus(schedule, now)).toBe("UPCOMING");
  });

  it("is OPEN within the registration window", () => {
    const schedule = scheduleFor(-60_000, 60_000, now);
    expect(computeLifecycleStatus(schedule, now)).toBe("OPEN");
  });

  it("is OPEN exactly at the registration end boundary (inclusive)", () => {
    const schedule = scheduleFor(-60_000, 0, now);
    expect(computeLifecycleStatus(schedule, now)).toBe("OPEN");
  });

  it("is READY_FOR_DRAW after registration closes", () => {
    const schedule = scheduleFor(-120_000, -60_000, now);
    expect(computeLifecycleStatus(schedule, now)).toBe("READY_FOR_DRAW");
  });
});
