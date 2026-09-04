import { Bot } from "grammy";

import { getRandomQuote } from "../../quotes/quoteService";
import { CATEGORY_META } from "../../tasks/categories";

export function registerCommonCommands(bot: Bot): void {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      [
        "👋 Привет! Я твой бот для расписания и контроля времени.",
        "",
        "Я умею:",
        "📅 показывать расписание",
        "✅ учитывать выполненные задачи",
        "📊 считать продуктивность",
        "📱 учитывать потерянное время",
        "🌅 отслеживать время подъёма",
        "",
        "Основные команды:",
        "/today — расписание на сегодня",
        "/tomorrow — расписание на завтра",
        "/week — расписание на неделю",
        "/add — добавить задачу",
        "/tasks — задачи на сегодня",
        "/stats — статистика",
        "/waste — записать потерянное время",
        "/wakeup — записать время подъёма",
        "/help — все команды",
      ].join("\n")
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "📖 Команды бота",
        "",
        "📅 Расписание",
        "/today — сегодня",
        "/tomorrow — завтра",
        "/week — неделя",
        "",
        "✅ Задачи",
        "/add programming 16:00 18:00",
        "/add programming FastAPI 16:00 18:00",
        "/tasks — задачи на сегодня",
        "/categories — категории задач",
        "",
        "📉 Потерянное время",
        "/waste phone 14:20 15:10",
        "/waste procrastination 17:00 17:40",
        "",
        "🌅 Режим",
        "/wakeup 07:35 — записать время подъёма",
        "",
        "📊 Статистика",
        "/stats — статистика текущей недели",
        "",
        "Прочее",
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
