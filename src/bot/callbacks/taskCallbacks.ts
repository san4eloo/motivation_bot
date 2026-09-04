import { Bot } from "grammy";

import {
  findConflict,
  formatDuration,
  getScheduleForDate,
  isInsideActiveDay,
  isValidTime,
  toMinutes,
} from "../../schedule/scheduleService";

import { cancelTask, completeTask, getTaskById } from "../../tasks/taskService";

import { buildCompleteTaskKeyboard } from "../helpers/taskKeyboard";

const pendingActualTime = new Map<string, string>();

export function registerTaskCallbacks(bot: Bot): void {
  bot.callbackQuery(/^task_done:(.+)$/, async (ctx) => {
    const chatId = ctx.chat?.id;

    if (chatId === undefined) {
      await ctx.answerCallbackQuery({
        text: "Не удалось определить чат",
      });

      return;
    }

    const taskId = ctx.match[1];

    const task = await getTaskById(taskId);

    if (!task || task.chatId !== String(chatId)) {
      await ctx.answerCallbackQuery({
        text: "Задача не найдена",
      });

      return;
    }

    if (task.status !== "planned" && task.status !== "missed") {
      await ctx.answerCallbackQuery({
        text: "Задача уже обработана",
      });

      return;
    }

    await ctx.answerCallbackQuery();

    const keyboard = buildCompleteTaskKeyboard(task.id);

    await ctx.reply(
      [
        `✅ Завершаем «${task.title}»`,
        "",
        `План: ${task.plannedStart}–${task.plannedEnd}`,
        "",
        "Можно засчитать время по плану или указать фактическое.",
      ].join("\n"),
      {
        reply_markup: keyboard,
      }
    );
  });

  bot.callbackQuery(/^task_plan_time:(.+)$/, async (ctx) => {
    const chatId = ctx.chat?.id;

    if (chatId === undefined) {
      await ctx.answerCallbackQuery({
        text: "Не удалось определить чат",
      });

      return;
    }

    const task = await getTaskById(ctx.match[1]);

    if (!task || task.chatId !== String(chatId)) {
      await ctx.answerCallbackQuery({
        text: "Задача не найдена",
      });

      return;
    }

    const completed = await completeTask(
      task.id,
      task.plannedStart,
      task.plannedEnd
    );

    await ctx.answerCallbackQuery({
      text: completed ? "Готово" : "Не удалось изменить задачу",
    });

    if (!completed) {
      return;
    }

    const minutes =
      toMinutes(completed.plannedEnd) - toMinutes(completed.plannedStart);

    await ctx.reply(
      [
        `✅ ${completed.title}`,
        `Факт: ${completed.plannedStart}–${completed.plannedEnd}`,
        `⏱ ${formatDuration(minutes)}`,
      ].join("\n")
    );
  });

  bot.callbackQuery(/^task_actual_time:(.+)$/, async (ctx) => {
    const chatId = ctx.chat?.id;

    if (chatId === undefined) {
      await ctx.answerCallbackQuery({
        text: "Не удалось определить чат",
      });

      return;
    }

    const task = await getTaskById(ctx.match[1]);

    if (!task || task.chatId !== String(chatId)) {
      await ctx.answerCallbackQuery({
        text: "Задача не найдена",
      });

      return;
    }

    pendingActualTime.set(String(chatId), task.id);

    await ctx.answerCallbackQuery();

    await ctx.reply(
      [
        `✍️ Фактическое время для «${task.title}»`,
        "",
        `План: ${task.plannedStart}–${task.plannedEnd}`,
        "",
        "Отправь только начало и конец, например:",
        "16:10 17:35",
        "",
        "Для отмены напиши:",
        "отмена",
      ].join("\n")
    );
  });

  bot.callbackQuery(/^task_cancel:(.+)$/, async (ctx) => {
    const chatId = ctx.chat?.id;

    if (chatId === undefined) {
      await ctx.answerCallbackQuery({
        text: "Не удалось определить чат",
      });

      return;
    }

    const task = await getTaskById(ctx.match[1]);

    if (!task || task.chatId !== String(chatId)) {
      await ctx.answerCallbackQuery({
        text: "Задача не найдена",
      });

      return;
    }

    const cancelled = await cancelTask(task.id);

    await ctx.answerCallbackQuery({
      text: cancelled ? "Задача отменена" : "Не удалось отменить",
    });

    if (!cancelled) {
      return;
    }

    await ctx.reply(
      `🚫 Отменено: ${cancelled.title} · ${cancelled.plannedStart}–${cancelled.plannedEnd}`
    );
  });

  bot.callbackQuery(/^task_back:(.+)$/, async (ctx) => {
    const chatId = ctx.chat?.id;

    if (chatId !== undefined) {
      pendingActualTime.delete(String(chatId));
    }

    await ctx.answerCallbackQuery({
      text: "Отменено",
    });
  });

  bot.on("message:text", async (ctx, next) => {
    const chatId = String(ctx.chat.id);

    const taskId = pendingActualTime.get(chatId);

    if (!taskId) {
      await next();
      return;
    }

    const text = ctx.message.text.trim();

    if (text.toLowerCase() === "отмена") {
      pendingActualTime.delete(chatId);

      await ctx.reply("Ок, отметку выполнения отменил.");

      return;
    }

    const [start, end, ...extra] = text.split(/\s+/);

    if (extra.length || !isValidTime(start ?? "") || !isValidTime(end ?? "")) {
      await ctx.reply(
        "Нужны два времени в формате HH:MM. Например: 16:10 17:35"
      );

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
      await ctx.reply(
        `Фактическое время пересекается с «${conflict.title}» (${conflict.start}–${conflict.end}). Укажи другое время.`
      );

      return;
    }

    const completed = await completeTask(task.id, start, end);

    pendingActualTime.delete(chatId);

    if (!completed) {
      await ctx.reply(
        "Не удалось отметить задачу выполненной. Возможно, она уже была изменена."
      );

      return;
    }

    const minutes = toMinutes(end) - toMinutes(start);

    await ctx.reply(
      [
        `✅ ${completed.title}`,
        `Факт: ${start}–${end}`,
        `⏱ ${formatDuration(minutes)}`,
      ].join("\n")
    );
  });
}
