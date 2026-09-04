import { Sequelize } from "sequelize";

import { config } from "../config/config";

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: "postgres",

  logging: false,

  dialectOptions: config.databaseSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : undefined,
});

export async function initDatabase(): Promise<void> {
  await import("./models/Task");

  await import("./models/HabitLog");

  await import("./models/WakeupLog");

  await sequelize.authenticate();

  await sequelize.sync();

  console.log("PostgreSQL connected through Sequelize");
}