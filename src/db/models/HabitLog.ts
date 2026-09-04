import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";

import { sequelize } from "../db";

export class HabitLog extends Model<
  InferAttributes<HabitLog>,
  InferCreationAttributes<HabitLog>
> {
  declare id: string;

  declare chatId: string;

  declare logDate: string;

  declare category: "phone" | "procrastination";

  declare startTime: string;

  declare endTime: string;

  declare createdAt: CreationOptional<Date>;
}

HabitLog.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },

    chatId: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "chat_id",
    },

    logDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "log_date",
    },

    category: {
      type: DataTypes.TEXT,
      allowNull: false,

      validate: {
        isIn: [["phone", "procrastination"]],
      },
    },

    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "start_time",
    },

    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "end_time",
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    sequelize,
    tableName: "habit_logs",
    timestamps: false,

    indexes: [
      {
        fields: ["chat_id", "log_date"],
      },
    ],
  }
);
