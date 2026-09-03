export type ActivityType = "university" | "remote-university" | "sambo" | "gym" | "personal";
export type TaskCategory = "programming" | "reading" | "work" | "study" | "other";
export type TaskStatus = "planned" | "completed" | "cancelled" | "missed";

export interface ScheduleItem {
  title: string;
  start: string;
  end: string;
  type: ActivityType;
  note?: string;
  taskId?: string;
  category?: TaskCategory;
  status?: TaskStatus;
}

export interface DaySchedule {
  day: number;
  name: string;
  items: ScheduleItem[];
}

export interface PersonalTask {
  id: string;
  chatId: string;
  date: string;
  title: string;
  category: TaskCategory;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
  reminderSentAt: string | null;
}
