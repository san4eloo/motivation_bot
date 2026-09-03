import {
    CreationOptional,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    Model,
  } from "sequelize";
  
  import { sequelize } from "../db";
  
  export class Task extends Model<
    InferAttributes<Task>,
    InferCreationAttributes<Task>
  > {
    declare id: string;
  
    declare chatId: string;
    declare taskDate: string;
  
    declare title: string;
  
    declare category:
      | "programming"
      | "reading"
      | "work"
      | "study"
      | "other";
  
    declare plannedStart: string;
    declare plannedEnd: string;
  
    declare actualStart: string | null;
    declare actualEnd: string | null;
  
    declare status: CreationOptional<
      "planned" | "completed" | "cancelled" | "missed"
    >;
  
    declare createdAt: CreationOptional<Date>;
    declare completedAt: Date | null;
    declare reminderSentAt: Date | null;
  }
  
  Task.init(
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
  
      taskDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "task_date",
      },
  
      title: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
  
      category: {
        type: DataTypes.TEXT,
        allowNull: false,
  
        validate: {
          isIn: [
            [
              "programming",
              "reading",
              "work",
              "study",
              "other",
            ],
          ],
        },
      },
  
      plannedStart: {
        type: DataTypes.TIME,
        allowNull: false,
        field: "planned_start",
      },
  
      plannedEnd: {
        type: DataTypes.TIME,
        allowNull: false,
        field: "planned_end",
      },
  
      actualStart: {
        type: DataTypes.TIME,
        allowNull: true,
        field: "actual_start",
      },
  
      actualEnd: {
        type: DataTypes.TIME,
        allowNull: true,
        field: "actual_end",
      },
  
      status: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "planned",
  
        validate: {
          isIn: [
            [
              "planned",
              "completed",
              "cancelled",
              "missed",
            ],
          ],
        },
      },
  
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
  
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "completed_at",
      },
  
      reminderSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "reminder_sent_at",
      },
    },
    {
      sequelize,
  
      tableName: "tasks",
  
      timestamps: false,
  
      indexes: [
        {
          fields: ["chat_id", "task_date"],
        },
        {
          fields: [
            "task_date",
            "planned_start",
            "status",
            "reminder_sent_at",
          ],
        },
      ],
    },
  );