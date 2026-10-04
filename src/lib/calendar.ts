export type CalendarEventType = "study" | "revision" | "course" | "training" | "focus" | "meeting" | "routine";

export type CalendarEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  duration: number;
  type: CalendarEventType;
  completed: boolean;
  xp: number;
};

export const calendarTypeMeta: Record<CalendarEventType, { label: string; xp: number }> = {
  study: { label: "Étude", xp: 30 },
  revision: { label: "Révision", xp: 25 },
  course: { label: "Cours", xp: 20 },
  training: { label: "Entraînement", xp: 40 },
  focus: { label: "Focus", xp: 30 },
  meeting: { label: "Réunion", xp: 20 },
  routine: { label: "Routine", xp: 15 },
};

export const dayHours = Array.from({ length: 25 }, (_, i) => i); // 00:00 → 24:00
export const agendaStartMinute = 0;
export const agendaEndMinute = 24 * 60;
export const agendaStep = 15;

export const timeToMinutes = (time: string) => {
  const [hours = "7", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
};

export const minutesToTime = (minutes: number) => {
  const safe = Math.max(agendaStartMinute, Math.min(agendaEndMinute, minutes)) % (24 * 60);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

export const snapAgendaMinute = (minutes: number) => Math.round(minutes / agendaStep) * agendaStep;

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function calendarStats(events: CalendarEvent[], startDate: string) {
  const scoped = events.filter((event) => event.date >= startDate);
  const completed = scoped.filter((event) => event.completed);
  const minutes = completed.reduce((sum, event) => sum + event.duration, 0);
  const xp = completed.reduce((sum, event) => sum + event.xp, 0);
  return { planned: scoped.length, completed: completed.length, minutes, xp };
}

export const earnedMedals = (completed: number) => [
  { id: "spark", label: "Premier élan", detail: "1 session accomplie", threshold: 1 },
  { id: "rhythm", label: "Rythme solide", detail: "5 sessions accomplies", threshold: 5 },
  { id: "streak", label: "Série solaire", detail: "12 sessions accomplies", threshold: 12 },
  { id: "mastery", label: "Maîtrise Eclipse", detail: "25 sessions accomplies", threshold: 25 },
].map((medal) => ({ ...medal, earned: completed >= medal.threshold }));