import { randomUUID } from "node:crypto";
import { Op } from "sequelize";

import { WakeupLog } from "../db/models/WakeupLog";

export interface WakeupLogData {
  id: string;
  chatId: string;
  date: string;
  wakeupTime: string;
  createdAt: string;
}

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function mapWakeupLog(log: WakeupLog): WakeupLogData {
  return {
    id: log.id,
    chatId: log.chatId,
    date: log.logDate,
    wakeupTime: normalizeTime(log.wakeupTime),
    createdAt: log.createdAt.toISOString(),
  };
}

export async function saveWakeupTime(input: {
  chatId: string;
  date: string;
  wakeupTime: string;
}): Promise<WakeupLogData> {
  const existing = await WakeupLog.findOne({
    where: {
      chatId: input.chatId,
      logDate: input.date,
    },
  });

  if (existing) {
    existing.wakeupTime = input.wakeupTime;

    await existing.save();

    return mapWakeupLog(existing);
  }

  const log = await WakeupLog.create({
    id: randomUUID(),
    chatId: input.chatId,
    logDate: input.date,
    wakeupTime: input.wakeupTime,
  });

  return mapWakeupLog(log);
}

export async function getWakeupForDate(
  chatId: string,
  date: string
): Promise<WakeupLogData | null> {
  const log = await WakeupLog.findOne({
    where: {
      chatId,
      logDate: date,
    },
  });

  return log ? mapWakeupLog(log) : null;
}

export async function getWakeupsBetween(
  chatId: string,
  startDate: string,
  endDate: string
): Promise<WakeupLogData[]> {
  const logs = await WakeupLog.findAll({
    where: {
      chatId,

      logDate: {
        [Op.between]: [startDate, endDate],
      },
    },

    order: [["logDate", "ASC"]],
  });

  return logs.map(mapWakeupLog);
}
