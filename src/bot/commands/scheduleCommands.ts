import { Bot } from "grammy";

import {
  addDays,
  formatDay,
  getCurrentWeekRange,
  getDateInTimezone,
  getScheduleForDate,
} from "../../schedule/scheduleService";

export function registerScheduleCommands(bot: Bot): void {
  bot.command("today", async (ctx) => {
    const date = getDateInTimezone();

    const schedule = await getScheduleForDate(date, String(ctx.chat.id));

    await ctx.reply(formatDay(schedule, date));
  });

  bot.command("tomorrow", async (ctx) => {
    const date = addDays(getDateInTimezone(), 1);

    const schedule = await getScheduleForDate(date, String(ctx.chat.id));

    await ctx.reply(formatDay(schedule, date));
  });

  bot.command("week", async (ctx) => {
    const range = getCurrentWeekRange();

    const days: string[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(range.start, offset);

      const schedule = await getScheduleForDate(date, String(ctx.chat.id));

      const items = schedule.items.length
        ? schedule.items
            .map((item) => {
              let icon = "•";

              if (item.type === "personal") {
                icon = item.status === "completed" ? "✅" : "📝";
              }

              return `${icon} ${item.start}–${item.end} — ${item.title}`;
            })
            .join("\n")
        : "• Выходной";

      days.push([`📅 ${schedule.name} · ${date}`, items].join("\n"));
    }

    await ctx.reply(days.join("\n\n"));
  });
}
