import { DaySchedule } from "../types/schedule";

export const weeklySchedule: DaySchedule[] = [
  {
    day: 1,
    name: "Понедельник",
    items: [
      { title: "ВУЗ", start: "08:00", end: "13:05", type: "university" },
      { title: "Самбо", start: "19:30", end: "21:00", type: "sambo" }
    ]
  },
  {
    day: 2,
    name: "Вторник",
    items: [
      { title: "ВУЗ", start: "09:45", end: "15:00", type: "university" },
      { title: "Качалка", start: "18:00", end: "21:00", type: "gym" }
    ]
  },
  {
    day: 3,
    name: "Среда",
    items: [
      { title: "ВУЗ", start: "08:00", end: "11:00", type: "university" },
      { title: "Самбо", start: "19:30", end: "21:00", type: "sambo" }
    ]
  },
  {
    day: 4,
    name: "Четверг",
    items: [
      { title: "Качалка", start: "10:00", end: "13:00", type: "gym", note: "Основной вариант. Можно перенести на 19:00–22:00." },
      { title: "ВУЗ — дистант", start: "13:25", end: "18:30", type: "remote-university" }
    ]
  },
  {
    day: 5,
    name: "Пятница",
    items: [
      { title: "ВУЗ — дистант", start: "11:30", end: "18:30", type: "remote-university" },
      { title: "Самбо", start: "19:30", end: "21:00", type: "sambo" }
    ]
  },
  {
    day: 6,
    name: "Суббота",
    items: [
      { title: "ВУЗ", start: "08:00", end: "11:20", type: "university" },
      { title: "Качалка", start: "12:00", end: "15:00", type: "gym" }
    ]
  },
  {
    day: 0,
    name: "Воскресенье",
    items: []
  }
];
