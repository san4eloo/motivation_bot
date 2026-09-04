import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";

import { sequelize } from "../db";

export class WakeupLog extends Model<
  InferAttributes<WakeupLog>,
  InferCreationAttributes<WakeupLog>
> {
  declare id: string;

  declare chatId: string;

  declare logDate: string;

  declare wakeupTime: string;

  declare createdAt: CreationOptional<Date>;
}

WakeupLog.init(
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

    wakeupTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: "wakeup_time",
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
    tableName: "wakeup_logs",
    timestamps: false,

    indexes: [
      {
        unique: true,
        fields: ["chat_id", "log_date"],
      },
    ],
  }
);
