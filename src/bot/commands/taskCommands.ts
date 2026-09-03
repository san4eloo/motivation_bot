import { Bot } from "grammy";

import {
  findConflict,
  getDateInTimezone,
  getScheduleForDate,
  isInsideActiveDay,
  isValidTime,
  toMinutes,
} from "../../schedule/scheduleService";

import {
  CATEGORY_META,
  categoryLabel,
  resolveCategory,
} from "../../tasks/categories";

import { addTask, getTasksForDate } from "../../tasks/taskService";

import { buildTasksKeyboard, taskStatusText } from "../helpers/taskKeyboard";

const addUsage = (): string =>
  [
    "Использование:",
    "/add категория [название] 16:00 18:00",
    "",
    "Примеры:",
    "/add programming 16:00 18:00",
    "/add programming FastAPI 16:00 18:00",
    "/add reading Чистый код 21:00 22:00",
    "",
    "Категории:",
    "programming, reading, work, study, other",
  ].join("\n");

async function replyTodayTasks(
  bot: Bot,
  chatId: number | string
): Promise<void> {
  const date = getDateInTimezone();

  const tasks = await getTasksForDate(String(chatId), date);

  if (!tasks.length) {
    await bot.api.sendMessage(chatId, "На сегодня личных задач нет.");

    return;
  }

  const lines = [`📝 Задачи на сегодня · ${date}`, ""];

  for (const task of tasks) {
    const meta = CATEGORY_META[task.category];

    const time =
      task.status === "completed" && task.actualStart && task.actualEnd
        ? `${task.actualStart}–${task.actualEnd} факт`
        : `${task.plannedStart}–${task.plannedEnd}`;

    lines.push(
      `${meta.emoji} ${task.title}`,
      `${time} · ${taskStatusText(task.status)}`,
      ""
    );
  }

  const keyboard = buildTasksKeyboard(tasks);

  await bot.api.sendMessage(
    chatId,
    lines.join("\n"),
    keyboard
      ? {
          reply_markup: keyboard,
        }
      : undefined
  );
}

export function registerTaskCommands(bot: Bot): void {
  bot.command("add", async (ctx) => {
    const raw = ctx.match?.trim() ?? "";

    const parts = raw.split(/\s+/).filter(Boolean);

    if (parts.length < 3) {
      await ctx.reply(addUsage());

      return;
    }

    const end = parts.pop()!;

    const start = parts.pop()!;

    const categoryRaw = parts.shift()!;

    const category = resolveCategory(categoryRaw);

    if (!category) {
      await ctx.reply(
        [`Неизвестная категория «${categoryRaw}».`, "", addUsage()].join("\n")
      );

      return;
    }

    const title = parts.join(" ").trim() || CATEGORY_META[category].label;

    if (!isValidTime(start) || !isValidTime(end)) {
      await ctx.reply(["Не понял время.", "", addUsage()].join("\n"));

      return;
    }

    if (toMinutes(end) <= toMinutes(start)) {
      await ctx.reply("Время окончания должно быть позже времени начала.");

      return;
    }

    if (!isInsideActiveDay(start, end)) {
      await ctx.reply(
        "Задачи можно добавлять только в пределах активного дня 07:00–22:00."
      );

      return;
    }

    const date = getDateInTimezone();

    const schedule = await getScheduleForDate(date, String(ctx.chat.id));

    const conflict = findConflict(schedule, start, end);

    if (conflict) {
      await ctx.reply(
        `Не добавил: ${start}–${end} пересекается с «${conflict.title}» (${conflict.start}–${conflict.end}).`
      );

      return;
    }

    const task = await addTask({
      chatId: String(ctx.chat.id),

      date,

      title,

      category,

      plannedStart: start,

      plannedEnd: end,
    });

    await ctx.reply(
      [
        "✅ Задача запланирована",
        "",
        categoryLabel(task.category),
        `📝 ${task.title}`,
        `🕒 ${task.plannedStart}–${task.plannedEnd}`,
        "",
        "Она попадёт в фактическую статистику только после отметки «Выполнено» в /tasks.",
      ].join("\n")
    );
  });

  bot.command("tasks", async (ctx) => {
    await replyTodayTasks(bot, ctx.chat.id);
  });
}
