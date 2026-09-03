import { Bot } from "grammy";

import { registerCommonCommands } from "./commands/commonCommands";
import { registerScheduleCommands } from "./commands/scheduleCommands";
import { registerStatsCommands } from "./commands/statsCommands";
import { registerTaskCommands } from "./commands/taskCommands";
import { registerTaskCallbacks } from "./callbacks/taskCallbacks";

export function registerCommands(bot: Bot): void {
  registerCommonCommands(bot);
  registerScheduleCommands(bot);
  registerStatsCommands(bot);
  registerTaskCommands(bot);
  registerTaskCallbacks(bot);
}
