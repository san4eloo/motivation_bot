import { Bot } from "grammy";
import { DateTime } from "luxon";

import { addHabitLog, HabitCategory } from "../../habits/habitService";

const HABIT_LABELS: Record<HabitCategory, string> = {
  phone: "📱 Телефон",
  procrastination: "🫥 Прокрастинация",
};

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function registerHabitCommands(bot: Bot): void {
  bot.command("waste", async (ctx) => {
    const chatId = ctx.chat?.id;

    if (chatId === undefined) {
      return;
    }

    const text = ctx.match?.trim() ?? "";

    if (!text) {
      await ctx.reply(
        [
          "Использование:",
          "",
          "/waste phone 14:20 15:10",
          "/waste procrastination 17:00 17:40",
          "",
          "Категории:",
          "📱 phone — телефон",
          "🫥 procrastination — прокрастинация",
        ].join("\n")
      );

      return;
    }

    const parts = text.split(/\s+/);

    if (parts.length !== 3) {
      await ctx.reply("Неверный формат.\n\nПример:\n/waste phone 14:20 15:10");

      return;
    }

    const [categoryRaw, startTime, endTime] = parts;

    if (categoryRaw !== "phone" && categoryRaw !== "procrastination") {
      await ctx.reply(
        "Неизвестная категория.\n\nДоступно:\nphone\nprocrastination"
      );

      return;
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      await ctx.reply(
        "Время нужно указывать в формате HH:MM.\n\nНапример:\n/waste phone 14:20 15:10"
      );

      return;
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      await ctx.reply("Время окончания должно быть позже времени начала.");

      return;
    }

    const now = DateTime.now().setZone("Europe/Moscow");

    await addHabitLog({
      chatId: String(chatId),
      date: now.toISODate()!,
      category: categoryRaw,
      startTime,
      endTime,
    });

    const durationMinutes = endMinutes - startMinutes;

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    const durationText = [
      hours > 0 ? `${hours} ч` : "",
      minutes > 0 ? `${minutes} мин` : "",
    ]
      .filter(Boolean)
      .join(" ");

    await ctx.reply(
      [
        "📉 Потерянное время записано",
        "",
        HABIT_LABELS[categoryRaw],
        `⏰ ${startTime}–${endTime}`,
        `⏱ ${durationText}`,
      ].join("\n")
    );
  });
}
