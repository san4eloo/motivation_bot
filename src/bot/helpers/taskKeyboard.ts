import { InlineKeyboard } from "grammy";

import { PersonalTask } from "../../types/schedule";

export function shortTitle(title: string, max = 22): string {
  return title.length <= max ? title : `${title.slice(0, max - 1)}…`;
}

export function taskStatusText(status: string): string {
  if (status === "completed") {
    return "✅ выполнено";
  }

  if (status === "cancelled") {
    return "🚫 отменено";
  }

  if (status === "missed") {
    return "❌ пропущено";
  }

  return "⏳ запланировано";
}

export function buildTasksKeyboard(
  tasks: PersonalTask[]
): InlineKeyboard | null {
  const keyboard = new InlineKeyboard();

  let hasButtons = false;

  for (const task of tasks) {
    if (task.status !== "planned") {
      continue;
    }

    hasButtons = true;

    keyboard
      .text(`✅ ${shortTitle(task.title)}`, `task_done:${task.id}`)
      .text("🚫", `task_cancel:${task.id}`)
      .row();
  }

  return hasButtons ? keyboard : null;
}

export function buildCompleteTaskKeyboard(taskId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ По плану", `task_plan_time:${taskId}`)
    .row()
    .text("✍️ Ввести фактическое время", `task_actual_time:${taskId}`)
    .row()
    .text("↩️ Отмена", `task_back:${taskId}`);
}
