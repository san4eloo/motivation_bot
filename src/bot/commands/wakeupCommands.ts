import { Bot } from "grammy";
import { DateTime } from "luxon";

import { saveWakeupTime } from "../../wakeup/wakeupService";

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function registerWakeupCommands(bot: Bot): void {
  bot.command("wakeup", async (ctx) => {
    const chatId = ctx.chat?.id;

    if (chatId === undefined) {
      return;
    }

    const time = ctx.match?.trim() ?? "";

    if (!time) {
      await ctx.reply("Укажи время подъёма.\n\nНапример:\n/wakeup 07:35");

      return;
    }

    if (!isValidTime(time)) {
      await ctx.reply(
        "Неверный формат времени.\n\nИспользуй HH:MM.\nНапример:\n/wakeup 07:35"
      );

      return;
    }

    const now = DateTime.now().setZone("Europe/Moscow");

    await saveWakeupTime({
      chatId: String(chatId),
      date: now.toISODate()!,
      wakeupTime: time,
    });

    await ctx.reply(
      ["🌅 Время подъёма сохранено", "", `Сегодня: ${time}`].join("\n")
    );
  });
}
