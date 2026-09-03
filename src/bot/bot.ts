import { Bot } from "grammy";
import { config } from "../config/config";
import { registerCommands } from "./commands";

export const bot = new Bot(config.botToken);
registerCommands(bot);

bot.catch((error) => {
  console.error("Telegram bot error:", error.error);
});
