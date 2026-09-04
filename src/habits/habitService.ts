import { randomUUID } from "node:crypto";
import { Op } from "sequelize";

import { HabitLog } from "../db/models/HabitLog";

export type HabitCategory = "phone" | "procrastination";

export interface HabitLogData {
  id: string;
  chatId: string;
  date: string;
  category: HabitCategory;
  startTime: string;
  endTime: string;
  createdAt: string;
}

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function mapHabitLog(log: HabitLog): HabitLogData {
  return {
    id: log.id,
    chatId: log.chatId,
    date: log.logDate,
    category: log.category,
    startTime: normalizeTime(log.startTime),
    endTime: normalizeTime(log.endTime),
    createdAt: log.createdAt.toISOString(),
  };
}

export async function addHabitLog(input: {
  chatId: string;
  date: string;
  category: HabitCategory;
  startTime: string;
  endTime: string;
}): Promise<HabitLogData> {
  const log = await HabitLog.create({
    id: randomUUID(),
    chatId: input.chatId,
    logDate: input.date,
    category: input.category,
    startTime: input.startTime,
    endTime: input.endTime,
  });

  return mapHabitLog(log);
}

export async function getHabitLogsForDate(
  chatId: string,
  date: string
): Promise<HabitLogData[]> {
  const logs = await HabitLog.findAll({
    where: {
      chatId,
      logDate: date,
    },

    order: [["startTime", "ASC"]],
  });

  return logs.map(mapHabitLog);
}

export async function getHabitLogsBetween(
  chatId: string,
  startDate: string,
  endDate: string
): Promise<HabitLogData[]> {
  const logs = await HabitLog.findAll({
    where: {
      chatId,

      logDate: {
        [Op.between]: [startDate, endDate],
      },
    },

    order: [
      ["logDate", "ASC"],
      ["startTime", "ASC"],
    ],
  });

  return logs.map(mapHabitLog);
}
