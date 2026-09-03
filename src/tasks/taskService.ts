import { randomUUID } from "node:crypto";
import { Op } from "sequelize";

import { Task } from "../db/models/Task";
import {
  PersonalTask,
  TaskCategory,
} from "../types/schedule";

function timeOnly(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return String(value).slice(0, 5);
}

function mapTask(task: Task): PersonalTask {
  return {
    id: task.id,
    chatId: task.chatId,
    date: task.taskDate,

    title: task.title,
    category: task.category,

    plannedStart: timeOnly(task.plannedStart)!,
    plannedEnd: timeOnly(task.plannedEnd)!,

    actualStart: timeOnly(task.actualStart),
    actualEnd: timeOnly(task.actualEnd),

    status: task.status,

    createdAt: task.createdAt.toISOString(),

    completedAt: task.completedAt
      ? task.completedAt.toISOString()
      : null,

    reminderSentAt: task.reminderSentAt
      ? task.reminderSentAt.toISOString()
      : null,
  };
}

export async function addTask(input: {
  chatId: string;
  date: string;
  title: string;
  category: TaskCategory;
  plannedStart: string;
  plannedEnd: string;
}): Promise<PersonalTask> {
  const task = await Task.create({
    id: randomUUID(),

    chatId: input.chatId,
    taskDate: input.date,

    title: input.title,
    category: input.category,

    plannedStart: input.plannedStart,
    plannedEnd: input.plannedEnd,

    status: "planned",
  });

  return mapTask(task);
}

export async function getTaskById(
  id: string,
): Promise<PersonalTask | null> {
  const task = await Task.findByPk(id);

  if (!task) {
    return null;
  }

  return mapTask(task);
}

export async function getTasksForDate(
  chatId: string,
  date: string,
): Promise<PersonalTask[]> {
  const tasks = await Task.findAll({
    where: {
      chatId,
      taskDate: date,
    },

    order: [
      ["plannedStart", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

  return tasks.map(mapTask);
}

export async function getTasksBetween(
  chatId: string,
  startDate: string,
  endDate: string,
): Promise<PersonalTask[]> {
  const tasks = await Task.findAll({
    where: {
      chatId,

      taskDate: {
        [Op.between]: [startDate, endDate],
      },
    },

    order: [
      ["taskDate", "ASC"],
      ["plannedStart", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

  return tasks.map(mapTask);
}

export async function completeTask(
  id: string,
  actualStart: string,
  actualEnd: string,
): Promise<PersonalTask | null> {
  const task = await Task.findOne({
    where: {
      id,

      status: {
        [Op.in]: ["planned", "missed"],
      },
    },
  });

  if (!task) {
    return null;
  }

  task.status = "completed";
  task.actualStart = actualStart;
  task.actualEnd = actualEnd;
  task.completedAt = new Date();

  await task.save();

  return mapTask(task);
}

export async function cancelTask(
  id: string,
): Promise<PersonalTask | null> {
  const task = await Task.findOne({
    where: {
      id,
      status: "planned",
    },
  });

  if (!task) {
    return null;
  }

  task.status = "cancelled";

  await task.save();

  return mapTask(task);
}

export async function getTasksStartingAt(
  date: string,
  time: string,
): Promise<PersonalTask[]> {
  const tasks = await Task.findAll({
    where: {
      taskDate: date,
      plannedStart: time,
      status: "planned",
      reminderSentAt: null,
    },

    order: [
      ["chatId", "ASC"],
      ["plannedStart", "ASC"],
    ],
  });

  return tasks.map(mapTask);
}

export async function markReminderSent(
  id: string,
): Promise<void> {
  await Task.update(
    {
      reminderSentAt: new Date(),
    },
    {
      where: {
        id,
      },
    },
  );
}

export async function markPastDaysMissed(
  today: string,
): Promise<number> {
  const [updatedCount] = await Task.update(
    {
      status: "missed",
    },
    {
      where: {
        taskDate: {
          [Op.lt]: today,
        },

        status: "planned",
      },
    },
  );

  return updatedCount;
}