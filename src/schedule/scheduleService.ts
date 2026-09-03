import { config } from "../config/config";
import { getTasksForDate } from "../tasks/taskService";
import { DaySchedule, ScheduleItem } from "../types/schedule";
import { weeklySchedule } from "./weeklySchedule";

export const ACTIVE_DAY_START = "07:00";
export const ACTIVE_DAY_END = "22:00";
export const ACTIVE_WEEK_MINUTES = 15 * 60 * 7;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  if (minutes === 0) return `${hours} ч`;
  return `${hours} ч ${minutes} мин`;
}

export function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function getDateTimeInTimezone(date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

export function getDateInTimezone(date = new Date()): string {
  return getDateTimeInTimezone(date).date;
}

export function addDays(dateString: string, amount: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return date.toISOString().slice(0, 10);
}

export function weekdayFromDate(dateString: string): number {
  return new Date(`${dateString}T12:00:00Z`).getUTCDay();
}

export function getDaySchedule(day: number): DaySchedule {
  const schedule = weeklySchedule.find((item) => item.day === day);
  if (!schedule) throw new Error(`Schedule for day ${day} not found`);
  return schedule;
}

export async function getScheduleForDate(date: string, chatId: string): Promise<DaySchedule> {
  const base = getDaySchedule(weekdayFromDate(date));
  const tasks = await getTasksForDate(chatId, date);
  const personalItems: ScheduleItem[] = tasks
    .filter((task) => task.status === "planned" || task.status === "completed")
    .map((task) => ({
      title: task.title,
      start: task.status === "completed" && task.actualStart ? task.actualStart : task.plannedStart,
      end: task.status === "completed" && task.actualEnd ? task.actualEnd : task.plannedEnd,
      type: "personal",
      taskId: task.id,
      category: task.category,
      status: task.status,
    }));
  return { ...base, items: [...base.items, ...personalItems].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)) };
}

export function getFreeWindows(schedule: DaySchedule): string[] {
  const start = toMinutes(ACTIVE_DAY_START);
  const end = toMinutes(ACTIVE_DAY_END);
  const sorted = [...schedule.items].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const free: string[] = [];
  let cursor = start;
  for (const item of sorted) {
    const itemStart = Math.max(toMinutes(item.start), start);
    const itemEnd = Math.min(toMinutes(item.end), end);
    if (itemEnd <= start || itemStart >= end) continue;
    if (itemStart > cursor) free.push(`${fromMinutes(cursor)}–${fromMinutes(itemStart)}`);
    cursor = Math.max(cursor, itemEnd);
  }
  if (cursor < end) free.push(`${fromMinutes(cursor)}–${fromMinutes(end)}`);
  return free;
}

export function formatDay(schedule: DaySchedule, date?: string): string {
  const lines = [`📅 ${schedule.name}${date ? ` · ${date}` : ""}`];
  if (schedule.items.length === 0) {
    lines.push("Сегодня обязательных занятий и личных задач нет.");
  } else {
    lines.push("", "Занято:");
    for (const item of schedule.items) {
      const prefix = item.type === "personal" ? (item.status === "completed" ? "✅" : "📝") : "•";
      lines.push(`${prefix} ${item.start}–${item.end} — ${item.title}`);
      if (item.note) lines.push(`  ↳ ${item.note}`);
    }
  }
  const free = getFreeWindows(schedule);
  lines.push("", "Свободное время:");
  lines.push(free.length ? free.map((window) => `• ${window}`).join("\n") : "• Нет свободных окон с 07:00 до 22:00");
  return lines.join("\n");
}

export function findConflict(schedule: DaySchedule, start: string, end: string, excludeTaskId?: string): ScheduleItem | null {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return schedule.items.find((item) => {
    if (excludeTaskId && item.taskId === excludeTaskId) return false;
    return startMinutes < toMinutes(item.end) && endMinutes > toMinutes(item.start);
  }) ?? null;
}

export function isInsideActiveDay(start: string, end: string): boolean {
  return toMinutes(start) >= toMinutes(ACTIVE_DAY_START) && toMinutes(end) <= toMinutes(ACTIVE_DAY_END);
}

export function getWeekRangeForDate(date: string): { start: string; end: string } {
  const weekday = weekdayFromDate(date);
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const start = addDays(date, -daysSinceMonday);
  return { start, end: addDays(start, 6) };
}

export function getCurrentWeekRange(): { start: string; end: string } {
  return getWeekRangeForDate(getDateInTimezone());
}

export function getFixedWeekMinutes(): { universityMinutes: number; sportMinutes: number } {
  let universityMinutes = 0;
  let sportMinutes = 0;
  for (const day of weeklySchedule) {
    for (const item of day.items) {
      const duration = toMinutes(item.end) - toMinutes(item.start);
      if (item.type === "university" || item.type === "remote-university") universityMinutes += duration;
      if (item.type === "gym" || item.type === "sambo") sportMinutes += duration;
    }
  }
  return { universityMinutes, sportMinutes };
}
