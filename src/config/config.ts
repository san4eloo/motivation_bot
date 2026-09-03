import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Environment variable ${name} is required`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export const config = {
  botToken: required("BOT_TOKEN"),
  chatId: required("CHAT_ID"),
  timezone: process.env.TIMEZONE?.trim() || "Europe/Moscow",
  databaseUrl: required("DATABASE_URL"),
  databaseSsl: process.env.DATABASE_SSL?.trim().toLowerCase() === "true",
  taskReminderMinutes: positiveInteger("TASK_REMINDER_MINUTES", 15),
};
