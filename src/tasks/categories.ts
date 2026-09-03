import { TaskCategory } from "../types/schedule";

export const CATEGORY_META: Record<TaskCategory, { label: string; emoji: string; productive: boolean }> = {
  programming: { label: "Программирование", emoji: "💻", productive: true },
  reading: { label: "Чтение", emoji: "📚", productive: true },
  work: { label: "Работа", emoji: "💼", productive: true },
  study: { label: "Самообучение", emoji: "📖", productive: true },
  other: { label: "Другое", emoji: "🧩", productive: false },
};

const aliases = new Map<string, TaskCategory>([
  ["programming", "programming"], ["coding", "programming"], ["code", "programming"], ["программирование", "programming"], ["код", "programming"],
  ["reading", "reading"], ["read", "reading"], ["чтение", "reading"],
  ["work", "work"], ["работа", "work"],
  ["study", "study"], ["learning", "study"], ["учеба", "study"], ["учёба", "study"], ["самообучение", "study"],
  ["other", "other"], ["другое", "other"],
]);

export function resolveCategory(value: string): TaskCategory | null {
  return aliases.get(value.trim().toLowerCase()) ?? null;
}

export function categoryLabel(category: TaskCategory): string {
  return `${CATEGORY_META[category].emoji} ${CATEGORY_META[category].label}`;
}
