import "reflect-metadata";

import { bot } from "./bot/bot";
import { initDatabase } from "./db/db";
import { getDateInTimezone } from "./schedule/scheduleService";
import { startScheduler } from "./scheduler/scheduler";
import { markPastDaysMissed } from "./tasks/taskService";

async function main(): Promise<void> {
  await initDatabase();
  await markPastDaysMissed(getDateInTimezone());
  console.log("PostgreSQL is ready");

  startScheduler(bot);

  console.log("Starting Telegram bot...");
  await bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} is running`);
    },
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
