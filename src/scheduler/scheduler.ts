import { Bot } from "grammy";
import cron from "node-cron";
import { config } from "../config/config";
import { getRandomQuote } from "../quotes/quoteService";
import { addDays, formatDay, getDateInTimezone, getDateTimeInTimezone, getScheduleForDate } from "../schedule/scheduleService";
import { buildStatsMessage } from "../stats/statsService";
import { CATEGORY_META } from "../tasks/categories";
import { getTasksStartingAt, markPastDaysMissed, markReminderSent } from "../tasks/taskService";

export function startScheduler(bot: Bot): void {
  cron.schedule("0 7 * * *", async () => {
    try {
      const date = getDateInTimezone();
      const todaySchedule = formatDay(await getScheduleForDate(date, config.chatId), date);
      await bot.api.sendMessage(config.chatId, [
        "☀️ Доброе утро!", "", `💬 ${getRandomQuote()}`, "",
        "📋 Расписание на сегодня:", "", todaySchedule,
      ].join("\n"));
    } catch (error) {
      console.error("Morning scheduler error:", error);
    }
  }, { timezone: config.timezone });

  cron.schedule("0 22 * * *", async () => {
    try {
      const tomorrow = addDays(getDateInTimezone(), 1);
      const tomorrowSchedule = formatDay(await getScheduleForDate(tomorrow, config.chatId), tomorrow);
      await bot.api.sendMessage(config.chatId, [
        "🌙 Спокойной ночи!", "", `💬 ${getRandomQuote()}`, "",
        "📅 Завтра:", "", tomorrowSchedule,
      ].join("\n"));
    } catch (error) {
      console.error("Evening scheduler error:", error);
    }
  }, { timezone: config.timezone });

  cron.schedule("0 16 * * 0", async () => {
    try {
      await bot.api.sendMessage(config.chatId, await buildStatsMessage(config.chatId));
    } catch (error) {
      console.error("Weekly stats scheduler error:", error);
    }
  }, { timezone: config.timezone });

  cron.schedule("* * * * *", async () => {
    try {
      const targetDate = new Date(Date.now() + config.taskReminderMinutes * 60_000);
      const target = getDateTimeInTimezone(targetDate);
      const tasks = await getTasksStartingAt(target.date, target.time);
      for (const task of tasks) {
        const meta = CATEGORY_META[task.category];
        await bot.api.sendMessage(task.chatId, [
          `⏰ Через ${config.taskReminderMinutes} мин`, "",
          `${meta.emoji} ${task.title}`,
          `${task.plannedStart}–${task.plannedEnd}`,
        ].join("\n"));
        await markReminderSent(task.id);
      }
    } catch (error) {
      console.error("Task reminder scheduler error:", error);
    }
  }, { timezone: config.timezone });

  cron.schedule("10 0 * * *", async () => {
    try {
      await markPastDaysMissed(getDateInTimezone());
    } catch (error) {
      console.error("Missed task scheduler error:", error);
    }
  }, { timezone: config.timezone });

  console.log(`Scheduler started. Timezone: ${config.timezone}`);
}
