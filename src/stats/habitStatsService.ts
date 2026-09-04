import { DateTime } from "luxon";

import { getHabitLogsBetween, HabitCategory } from "../habits/habitService";

import { getWakeupsBetween } from "../wakeup/wakeupService";

export interface HabitCategoryStats {
  category: HabitCategory;
  minutes: number;
}

export interface WakeupDayStats {
  date: string;
  wakeupTime: string;
  targetTime: string;
  success: boolean;
}

export interface HabitStatsResult {
  habitMinutes: Record<HabitCategory, number>;
  totalWasteMinutes: number;

  wakeups: WakeupDayStats[];
  successfulWakeups: number;
  totalWakeups: number;
  averageWakeupTime: string | null;
}

const WAKEUP_TARGETS: Record<number, string> = {
  // Luxon:
  // 1 = понедельник
  // ...
  // 7 = воскресенье

  1: "07:00",
  2: "08:00",
  3: "07:00",
  4: "08:30",
  5: "08:30",
  6: "07:00",
  7: "09:00",
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export async function getHabitStats(
  chatId: string,
  startDate: string,
  endDate: string
): Promise<HabitStatsResult> {
  const habitLogs = await getHabitLogsBetween(chatId, startDate, endDate);

  const habitMinutes: Record<HabitCategory, number> = {
    phone: 0,
    procrastination: 0,
  };

  for (const log of habitLogs) {
    const start = timeToMinutes(log.startTime);
    const end = timeToMinutes(log.endTime);

    if (end <= start) {
      continue;
    }

    habitMinutes[log.category] += end - start;
  }

  const totalWasteMinutes = habitMinutes.phone + habitMinutes.procrastination;

  const wakeupLogs = await getWakeupsBetween(chatId, startDate, endDate);

  const wakeups: WakeupDayStats[] = wakeupLogs.map((log) => {
    const date = DateTime.fromISO(log.date);

    const targetTime = WAKEUP_TARGETS[date.weekday];

    const success = timeToMinutes(log.wakeupTime) <= timeToMinutes(targetTime);

    return {
      date: log.date,
      wakeupTime: log.wakeupTime,
      targetTime,
      success,
    };
  });

  const successfulWakeups = wakeups.filter((wakeup) => wakeup.success).length;

  let averageWakeupTime: string | null = null;

  if (wakeups.length > 0) {
    const totalMinutes = wakeups.reduce(
      (sum, wakeup) => sum + timeToMinutes(wakeup.wakeupTime),
      0
    );

    averageWakeupTime = minutesToTime(
      Math.round(totalMinutes / wakeups.length)
    );
  }

  return {
    habitMinutes,
    totalWasteMinutes,

    wakeups,
    successfulWakeups,
    totalWakeups: wakeups.length,
    averageWakeupTime,
  };
}
