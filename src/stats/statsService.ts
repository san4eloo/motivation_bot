import { weeklySchedule } from "../schedule/weeklySchedule";
import { CATEGORY_META } from "../tasks/categories";
import { getTasksBetween } from "../tasks/taskService";
import { TaskCategory } from "../types/schedule";
import {
  ACTIVE_DAY_END,
  ACTIVE_DAY_START,
  addDays,
  formatDuration,
  getDateTimeInTimezone,
  getWeekRangeForDate,
  toMinutes,
  weekdayFromDate,
} from "../schedule/scheduleService";

export interface WeekStats {
  range: { start: string; end: string };
  cutoffDate: string;
  cutoffTime: string;
  universityMinutes: number;
  sportMinutes: number;
  availableFreeMinutes: number;
  completedCount: number;
  missedCount: number;
  cancelledCount: number;
  plannedCount: number;
  categoryMinutes: Record<TaskCategory, number>;
  productiveMinutes: number;
  efficiencyPercent: number;
}

function overlapMinutes(startA: number, endA: number, startB: number, endB: number): number {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function getElapsedFixedAndActiveMinutes(weekStart: string, cutoffDate: string, cutoffTime: string): {
  activeMinutes: number;
  universityMinutes: number;
  sportMinutes: number;
} {
  const activeStart = toMinutes(ACTIVE_DAY_START);
  const activeEnd = toMinutes(ACTIVE_DAY_END);
  let activeMinutes = 0;
  let universityMinutes = 0;
  let sportMinutes = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(weekStart, offset);
    if (date > cutoffDate) break;

    const dayEnd = date < cutoffDate
      ? activeEnd
      : Math.max(activeStart, Math.min(activeEnd, toMinutes(cutoffTime)));

    if (dayEnd <= activeStart) continue;
    activeMinutes += dayEnd - activeStart;

    const weekday = weekdayFromDate(date);
    const schedule = weeklySchedule.find((day) => day.day === weekday);
    if (!schedule) continue;

    for (const item of schedule.items) {
      const elapsed = overlapMinutes(toMinutes(item.start), toMinutes(item.end), activeStart, dayEnd);
      if (item.type === "university" || item.type === "remote-university") universityMinutes += elapsed;
      if (item.type === "gym" || item.type === "sambo") sportMinutes += elapsed;
    }
  }

  return { activeMinutes, universityMinutes, sportMinutes };
}

function isTaskInsideCutoff(taskDate: string, taskEnd: string, cutoffDate: string, cutoffTime: string): boolean {
  if (taskDate < cutoffDate) return true;
  if (taskDate > cutoffDate) return false;
  return toMinutes(taskEnd) <= toMinutes(cutoffTime);
}

export async function calculateWeekStats(
  chatId: string,
  weekStart: string,
  cutoffDate: string,
  cutoffTime: string,
): Promise<WeekStats> {
  const range = getWeekRangeForDate(weekStart);
  const tasks = await getTasksBetween(chatId, range.start, cutoffDate);
  const elapsed = getElapsedFixedAndActiveMinutes(range.start, cutoffDate, cutoffTime);
  const categoryMinutes: Record<TaskCategory, number> = {
    programming: 0,
    reading: 0,
    work: 0,
    study: 0,
    other: 0,
  };

  let completedCount = 0;
  let missedCount = 0;
  let cancelledCount = 0;
  let plannedCount = 0;

  for (const task of tasks) {
    const statusEnd = task.status === "completed" && task.actualEnd ? task.actualEnd : task.plannedEnd;
    if (!isTaskInsideCutoff(task.date, statusEnd, cutoffDate, cutoffTime)) continue;

    if (task.status === "completed" && task.actualStart && task.actualEnd) {
      completedCount += 1;
      categoryMinutes[task.category] += Math.max(0, toMinutes(task.actualEnd) - toMinutes(task.actualStart));
    } else if (task.status === "missed") {
      missedCount += 1;
    } else if (task.status === "cancelled") {
      cancelledCount += 1;
    } else if (task.status === "planned") {
      plannedCount += 1;
    }
  }

  const productiveMinutes = (Object.keys(categoryMinutes) as TaskCategory[])
    .filter((category) => CATEGORY_META[category].productive)
    .reduce((sum, category) => sum + categoryMinutes[category], 0);
  const availableFreeMinutes = Math.max(0, elapsed.activeMinutes - elapsed.universityMinutes - elapsed.sportMinutes);
  const efficiencyPercent = availableFreeMinutes === 0 ? 0 : Math.round((productiveMinutes / availableFreeMinutes) * 100);

  return {
    range,
    cutoffDate,
    cutoffTime,
    universityMinutes: elapsed.universityMinutes,
    sportMinutes: elapsed.sportMinutes,
    availableFreeMinutes,
    completedCount,
    missedCount,
    cancelledCount,
    plannedCount,
    categoryMinutes,
    productiveMinutes,
    efficiencyPercent,
  };
}

function signedDuration(diffMinutes: number): string {
  if (diffMinutes === 0) return "= без изменений";
  const arrow = diffMinutes > 0 ? "↑" : "↓";
  const sign = diffMinutes > 0 ? "+" : "-";
  return `${arrow} ${sign}${formatDuration(Math.abs(diffMinutes))}`;
}

function signedPercent(diff: number): string {
  if (diff === 0) return "= без изменений";
  return `${diff > 0 ? "↑" : "↓"} ${diff > 0 ? "+" : ""}${diff}%`;
}

export async function buildStatsMessage(chatId: string): Promise<string> {
  const now = getDateTimeInTimezone();
  const currentRange = getWeekRangeForDate(now.date);
  const previousStart = addDays(currentRange.start, -7);
  const previousCutoffDate = addDays(now.date, -7);

  const current = await calculateWeekStats(chatId, currentRange.start, now.date, now.time);
  const previous = await calculateWeekStats(chatId, previousStart, previousCutoffDate, now.time);

  const lines = [
    "📊 Статистика текущей недели",
    `${current.range.start} — ${current.cutoffDate} ${current.cutoffTime}`,
    "",
    `🎓 ВУЗ: ${formatDuration(current.universityMinutes)}`,
    `💪 Спорт: ${formatDuration(current.sportMinutes)}`,
    "",
    "Фактическое время по категориям:",
  ];

  for (const category of Object.keys(CATEGORY_META) as TaskCategory[]) {
    const meta = CATEGORY_META[category];
    lines.push(`${meta.emoji} ${meta.label}: ${formatDuration(current.categoryMinutes[category])}`);
  }

  lines.push(
    "",
    `✅ Выполнено задач: ${current.completedCount}`,
    `❌ Пропущено: ${current.missedCount}`,
    `🚫 Отменено: ${current.cancelledCount}`,
    `⏳ Запланировано к этому моменту: ${current.plannedCount}`,
    "",
    `⏱ Доступного свободного времени к этому моменту: ${formatDuration(current.availableFreeMinutes)}`,
    `🎯 Использовано с пользой: ${formatDuration(current.productiveMinutes)}`,
    `📊 Эффективность: ${current.efficiencyPercent}%`,
    "",
    `📈 В сравнении с прошлой неделей на тот же день и время:`,
  );

  for (const category of Object.keys(CATEGORY_META) as TaskCategory[]) {
    const meta = CATEGORY_META[category];
    const diff = current.categoryMinutes[category] - previous.categoryMinutes[category];
    lines.push(`${meta.emoji} ${meta.label}: ${signedDuration(diff)}`);
  }

  lines.push(
    `🎯 Полезное время: ${signedDuration(current.productiveMinutes - previous.productiveMinutes)}`,
    `📊 Эффективность: ${signedPercent(current.efficiencyPercent - previous.efficiencyPercent)}`,
  );

  return lines.join("\n");
}
