import { Bot, InlineKeyboard } from "grammy";
import { getRandomQuote } from "../quotes/quoteService";
import {
  addDays,
  findConflict,
  formatDay,
  formatDuration,
  getCurrentWeekRange,
  getDateInTimezone,
  getScheduleForDate,
  isInsideActiveDay,
  isValidTime,
  toMinutes,
} from "../schedule/scheduleService";
import { buildStatsMessage } from "../stats/statsService";
import { CATEGORY_META, categoryLabel, resolveCategory } from "../tasks/categories";
import { addTask, cancelTask, completeTask, getTaskById, getTasksForDate } from "../tasks/taskService";
import { TaskCategory } from "../types/schedule";

const pendingActualTime = new Map<string, string>();

const addUsage = () => [
  "Использование:",
  "/add категория [название] 16:00 18:00",
  "",
  "Примеры:",
  "/add programming 16:00 18:00",
  "/add programming FastAPI 16:00 18:00",
  "/add reading Чистый код 21:00 22:00",
  "",
  "Категории: programming, reading, work, study, other",
].join("\n");

function shortTitle(title: string, max = 22): string {
  return title.length <= max ? title : `${title.slice(0, max - 1)}…`;
}

function taskStatusText(status: string): string {
  if (status === "completed") return "✅ выполнено";
  if (status === "cancelled") return "🚫 отменено";
  if (status === "missed") return "❌ пропущено";
  return "⏳ запланировано";
}

async function replyTodayTasks(bot: Bot, chatId: number | string): Promise<void> {
  const date = getDateInTimezone();
  const tasks = await getTasksForDate(String(chatId), date);
  if (!tasks.length) {
    await bot.api.sendMessage(chatId, "На сегодня личных задач нет.");
    return;
  }

  const lines = [`📝 Задачи на сегодня · ${date}`, ""];
  const keyboard = new InlineKeyboard();
  let hasButtons = false;

  tasks.forEach((task) => {
    const meta = CATEGORY_META[task.category];
    const time = task.status === "completed" && task.actualStart && task.actualEnd
      ? `${task.actualStart}–${task.actualEnd} факт`
      : `${task.plannedStart}–${task.plannedEnd}`;
    lines.push(`${meta.emoji} ${task.title}`, `${time} · ${taskStatusText(task.status)}`, "");

    if (task.status === "planned") {
      hasButtons = true;
      keyboard.text(`✅ ${shortTitle(task.title)}`, `task_done:${task.id}`)
        .text("🚫", `task_cancel:${task.id}`)
        .row();
    }
  });

  await bot.api.sendMessage(chatId, lines.join("\n"), hasButtons ? { reply_markup: keyboard } : undefined);
}

export function registerCommands(bot: Bot): void {
  bot.command("start", async (ctx) => {
    await ctx.reply([
      "Привет! Я твой бот-расписание и трекер времени 👋", "",
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
    ].join("\n"));
  });

  bot.command("help", async (ctx) => {
    await ctx.reply([
      "/today", "/tomorrow", "/week", "/stats",
      "/add programming 16:00 18:00",
      "/add programming FastAPI 16:00 18:00",
      "/tasks", "/categories", "/quote", "/id",
    ].join("\n"));
  });

  bot.command("categories", async (ctx) => {
    const lines = ["Категории задач:", ""];
    for (const [key, meta] of Object.entries(CATEGORY_META)) lines.push(`${meta.emoji} ${key} — ${meta.label}`);
    await ctx.reply(lines.join("\n"));
  });

  bot.command("quote", async (ctx) => ctx.reply(`💬 ${getRandomQuote()}`));
  bot.command("id", async (ctx) => ctx.reply(`CHAT_ID=${ctx.chat.id}`));

  bot.command("today", async (ctx) => {
    const date = getDateInTimezone();
    await ctx.reply(formatDay(await getScheduleForDate(date, String(ctx.chat.id)), date));
  });

  bot.command("tomorrow", async (ctx) => {
    const date = addDays(getDateInTimezone(), 1);
    await ctx.reply(formatDay(await getScheduleForDate(date, String(ctx.chat.id)), date));
  });

  bot.command("week", async (ctx) => {
    const range = getCurrentWeekRange();
    const days: string[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(range.start, offset);
      const schedule = await getScheduleForDate(date, String(ctx.chat.id));
      const items = schedule.items.length
        ? schedule.items.map((item) => `${item.type === "personal" ? (item.status === "completed" ? "✅" : "📝") : "•"} ${item.start}–${item.end} — ${item.title}`).join("\n")
        : "• Выходной";
      days.push(`📅 ${schedule.name} · ${date}\n${items}`);
    }
    await ctx.reply(days.join("\n\n"));
  });

  bot.command("stats", async (ctx) => {
    await ctx.reply(await buildStatsMessage(String(ctx.chat.id)));
  });

  bot.command("add", async (ctx) => {
    const raw = ctx.match?.trim() ?? "";
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length < 3) return void await ctx.reply(addUsage());

    const end = parts.pop()!;
    const start = parts.pop()!;
    const categoryRaw = parts.shift()!;
    const category = resolveCategory(categoryRaw);
    if (!category) return void await ctx.reply(`Неизвестная категория «${categoryRaw}».\n\n${addUsage()}`);

    const title = parts.join(" ").trim() || CATEGORY_META[category].label;
    if (!isValidTime(start) || !isValidTime(end)) return void await ctx.reply(`Не понял время.\n\n${addUsage()}`);
    if (toMinutes(end) <= toMinutes(start)) return void await ctx.reply("Время окончания должно быть позже времени начала.");
    if (!isInsideActiveDay(start, end)) return void await ctx.reply("Задачи можно добавлять только в пределах активного дня 07:00–22:00.");

    const date = getDateInTimezone();
    const schedule = await getScheduleForDate(date, String(ctx.chat.id));
    const conflict = findConflict(schedule, start, end);
    if (conflict) return void await ctx.reply(`Не добавил: ${start}–${end} пересекается с «${conflict.title}» (${conflict.start}–${conflict.end}).`);

    const task = await addTask({
      chatId: String(ctx.chat.id),
      date,
      title,
      category,
      plannedStart: start,
      plannedEnd: end,
    });

    await ctx.reply([
      "✅ Задача запланирована",
      categoryLabel(task.category),
      `📝 ${task.title}`,
      `🕒 ${task.plannedStart}–${task.plannedEnd}`,
      "",
      "Она попадёт в фактическую статистику только после отметки «Выполнено» в /tasks.",
    ].join("\n"));
  });

  bot.command("tasks", async (ctx) => {
    await replyTodayTasks(bot, ctx.chat.id);
  });

  bot.callbackQuery(/^task_done:(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    const task = await getTaskById(id);
    if (!task || task.chatId !== String(ctx.chat.id)) return void await ctx.answerCallbackQuery({ text: "Задача не найдена" });
    if (task.status !== "planned" && task.status !== "missed") return void await ctx.answerCallbackQuery({ text: "Задача уже обработана" });

    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text("✅ По плану", `task_plan_time:${task.id}`)
      .row()
      .text("✍️ Ввести фактическое время", `task_actual_time:${task.id}`)
      .row()
      .text("↩️ Отмена", `task_back:${task.id}`);

    await ctx.reply([
      `✅ Завершаем «${task.title}»`,
      `План: ${task.plannedStart}–${task.plannedEnd}`,
      "",
      "Можно засчитать время по плану или указать фактическое.",
    ].join("\n"), { reply_markup: keyboard });
  });

  bot.callbackQuery(/^task_plan_time:(.+)$/, async (ctx) => {
    const task = await getTaskById(ctx.match[1]);
    if (!task || task.chatId !== String(ctx.chat.id)) return void await ctx.answerCallbackQuery({ text: "Задача не найдена" });
    const completed = await completeTask(task.id, task.plannedStart, task.plannedEnd);
    await ctx.answerCallbackQuery({ text: completed ? "Готово" : "Не удалось изменить задачу" });
    if (completed) {
      const minutes = toMinutes(completed.plannedEnd) - toMinutes(completed.plannedStart);
      await ctx.reply(`✅ ${completed.title}\nФакт: ${completed.plannedStart}–${completed.plannedEnd} · ${formatDuration(minutes)}`);
    }
  });

  bot.callbackQuery(/^task_actual_time:(.+)$/, async (ctx) => {
    const task = await getTaskById(ctx.match[1]);
    if (!task || task.chatId !== String(ctx.chat.id)) return void await ctx.answerCallbackQuery({ text: "Задача не найдена" });
    pendingActualTime.set(String(ctx.chat.id), task.id);
    await ctx.answerCallbackQuery();
    await ctx.reply([
      `✍️ Фактическое время для «${task.title}»`,
      `План: ${task.plannedStart}–${task.plannedEnd}`,
      "",
      "Отправь только начало и конец, например:",
      "16:10 17:35",
      "",
      "Для отмены напиши: отмена",
    ].join("\n"));
  });

  bot.callbackQuery(/^task_cancel:(.+)$/, async (ctx) => {
    const task = await getTaskById(ctx.match[1]);
    if (!task || task.chatId !== String(ctx.chat.id)) return void await ctx.answerCallbackQuery({ text: "Задача не найдена" });
    const cancelled = await cancelTask(task.id);
    await ctx.answerCallbackQuery({ text: cancelled ? "Задача отменена" : "Не удалось отменить" });
    if (cancelled) await ctx.reply(`🚫 Отменено: ${cancelled.title} · ${cancelled.plannedStart}–${cancelled.plannedEnd}`);
  });

  bot.callbackQuery(/^task_back:(.+)$/, async (ctx) => {
    pendingActualTime.delete(String(ctx.chat.id));
    await ctx.answerCallbackQuery({ text: "Отменено" });
  });

  bot.on("message:text", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const taskId = pendingActualTime.get(chatId);
    if (!taskId) return;

    const text = ctx.message.text.trim();
    if (text.toLowerCase() === "отмена") {
      pendingActualTime.delete(chatId);
      await ctx.reply("Ок, отметку выполнения отменил.");
      return;
    }

    const [start, end, ...extra] = text.split(/\s+/);
    if (extra.length || !isValidTime(start ?? "") || !isValidTime(end ?? "")) {
      await ctx.reply("Нужны два времени в формате HH:MM. Например: 16:10 17:35");
      return;
    }
    if (toMinutes(end) <= toMinutes(start)) {
      await ctx.reply("Фактическое время окончания должно быть позже начала.");
      return;
    }
    if (!isInsideActiveDay(start, end)) {
      await ctx.reply("Фактическое время должно быть в пределах 07:00–22:00.");
      return;
    }

    const task = await getTaskById(taskId);
    if (!task || task.chatId !== chatId) {
      pendingActualTime.delete(chatId);
      await ctx.reply("Не смог найти эту задачу. Открой /tasks ещё раз.");
      return;
    }

    const schedule = await getScheduleForDate(task.date, chatId);
    const conflict = findConflict(schedule, start, end, task.id);
    if (conflict) {
      await ctx.reply(`Фактическое время пересекается с «${conflict.title}» (${conflict.start}–${conflict.end}). Укажи другое время.`);
      return;
    }

    const completed = await completeTask(task.id, start, end);
    pendingActualTime.delete(chatId);
    if (!completed) {
      await ctx.reply("Не удалось отметить задачу выполненной. Возможно, она уже была изменена.");
      return;
    }
    await ctx.reply(`✅ ${completed.title}\nФакт: ${start}–${end} · ${formatDuration(toMinutes(end) - toMinutes(start))}`);
  });
}
