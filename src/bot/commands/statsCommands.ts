import { Bot } from "grammy";

import { buildStatsMessage } from "../../stats/statsService";

export function registerStatsCommands(bot: Bot): void {
  bot.command("stats", async (ctx) => {
    const message = await buildStatsMessage(String(ctx.chat.id));

    await ctx.reply(message);
  });
}
