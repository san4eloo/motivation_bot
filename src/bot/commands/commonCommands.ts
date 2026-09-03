import { Bot } from "grammy";

import { getRandomQuote } from "../../quotes/quoteService";
import { CATEGORY_META } from "../../tasks/categories";

export function registerCommonCommands(bot: Bot): void {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      [
        "Привет! Я твой бот-расписание и трекер времени 👋",
        "",
        "/today — расписание на сегодня",
        "/tomorrow — расписание на завтра",
        "/week — текущая неделя",
        "/stats — статистика и сравнение с прошлой неделей",
        "/add — добавить задачу на сегодня",
        "/tasks — задачи на сегодня с кнопками",
        "/categories — категории задач",
        "/quote — случайная цитата",
        "/id — показать ID текущего чата",
        "/help — список команд",
      ].join("\n")
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "📋 Доступные команды:",
        "",
        "/today — расписание на сегодня",
        "/tomorrow — расписание на завтра",
        "/week — расписание на неделю",
        "/stats — статистика",
        "",
        "/add programming 16:00 18:00",
        "/add programming FastAPI 16:00 18:00",
        "/tasks — личные задачи на сегодня",
        "",
        "/categories — категории",
        "/quote — случайная цитата",
        "/id — ID текущего чата",
      ].join("\n")
    );
  });

  bot.command("categories", async (ctx) => {
    const lines = ["📂 Категории задач:", ""];

    for (const [key, meta] of Object.entries(CATEGORY_META)) {
      lines.push(`${meta.emoji} ${key} — ${meta.label}`);
    }

    await ctx.reply(lines.join("\n"));
  });

  bot.command("quote", async (ctx) => {
    await ctx.reply(`💬 ${getRandomQuote()}`);
  });

  bot.command("id", async (ctx) => {
    await ctx.reply(`CHAT_ID=${ctx.chat.id}`);
  });
}
