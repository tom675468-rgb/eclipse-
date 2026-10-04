import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Award, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Dumbbell, GraduationCap, GripHorizontal, Pencil, Plus, Repeat, Sparkles, Target, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agendaEndMinute, agendaStartMinute, agendaStep, calendarStats, calendarTypeMeta, dayHours, earnedMedals, minutesToTime, snapAgendaMinute, timeToMinutes, toDateKey, type CalendarEvent, type CalendarEventType } from "@/lib/calendar";
import { cn } from "@/lib/utils";

const typeIcons = { study: BookOpen, revision: Target, course: GraduationCap, training: Dumbbell, focus: Sparkles, meeting: Users, routine: Repeat };
const HOUR_HEIGHT = 64;
const DAY_HEIGHT = ((agendaEndMinute - agendaStartMinute) / 60) * HOUR_HEIGHT;
const LONG_PRESS_MS = 1000;
type Gesture = { id: number; mode: "move" | "resize"; startX: number; startY: number; startMinute: number; startDuration: number; moved: boolean; armed: boolean; timer: number | null };
const MIN_DATE = "2020-01-01";
const MAX_DATE = "2040-12-31";
const clampKey = (key: string) => key < MIN_DATE ? MIN_DATE : key > MAX_DATE ? MAX_DATE : key;
const viewLabels = { day: "Jour", week: "Semaine", month: "Mois" } as const;
const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString("fr-FR", { month: "long" }));
const years = Array.from({ length: 21 }, (_, i) => 2020 + i);
const addDays = (key: string, n: number) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + n); return toDateKey(d); };
const mondayOf = (key: string) => { const d = new Date(`${key}T12:00:00`); return addDays(key, -((d.getDay() + 6) % 7)); };
const weekDays = (key: string) => { const start = mondayOf(key); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); };
const monthWeeks = (key: string) => { const first = `${key.slice(0, 7)}-01`; const d = new Date(`${first}T12:00:00`); const last = toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0, 12)); const weeks: string[][] = []; for (let s = mondayOf(first); s <= last; s = addDays(s, 7)) weeks.push(weekDays(s)); return weeks; };
const isoWeek = (key: string) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const jan4 = new Date(d.getFullYear(), 0, 4, 12); return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7); };
/** "00:00" as an end time means midnight at the end of the day. */
const endToMinutes = (value: string, start: number) => { const m = timeToMinutes(value); return m === 0 && start > 0 ? agendaEndMinute : m; };
const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function CalendarWorkspace({ events, startDate, onStartDateChange, onEventsChange, onEarnXp, embedded = false }: {
  events: CalendarEvent[]; startDate: string; onStartDateChange: (date: string) => void; onEventsChange: (events: CalendarEvent[]) => void; onEarnXp: (points: number) => void; embedded?: boolean;
}) {
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [anchorY, setAnchorY] = useState(240);
  const [title, setTitle] = useState(""); const [time, setTime] = useState("09:00"); const [endTime, setEndTime] = useState("10:00"); const [type, setType] = useState<CalendarEventType>("study");
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: number; time: string; duration: number } | null>(null);
  const [armedId, setArmedId] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const previewRef = useRef<{ id: number; time: string; duration: number } | null>(null);
  const updatePreview = (value: { id: number; time: string; duration: number } | null) => { previewRef.current = value; setPreview(value); };
  const scrollRef = useRef<HTMLDivElement>(null);
  const stats = useMemo(() => calendarStats(events, startDate), [events, startDate]);
  const medals = earnedMedals(stats.completed);
  const selectedEvents = events.filter((event) => event.date === selected).sort((a, b) => a.time.localeCompare(b.time));

  const [view, setView] = useState<"day" | "week" | "month">("day");
  const selectedDate = new Date(`${selected}T12:00:00`);
  const shiftedKey = (delta: number) => { const date = new Date(`${selected}T12:00:00`); if (view === "month") { const day = date.getDate(); date.setDate(1); date.setMonth(date.getMonth() + delta); date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate())); } else date.setDate(date.getDate() + delta * (view === "week" ? 7 : 1)); return toDateKey(date); };
  const canShift = (delta: number) => { const next = shiftedKey(delta); return delta < 0 ? next >= MIN_DATE || (view !== "day" && selected.slice(0, 7) > MIN_DATE.slice(0, 7)) : next <= MAX_DATE || (view !== "day" && selected.slice(0, 7) < MAX_DATE.slice(0, 7)); };
  const shiftView = (delta: number) => setSelected(clampKey(shiftedKey(delta)));
  const jumpTo = (year: number, month: number) => { const day = Math.min(selectedDate.getDate(), new Date(year, month + 1, 0).getDate()); setSelected(clampKey(toDateKey(new Date(year, month, day, 12)))); };
  const headerTitle = view === "day" ? selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : view === "week" ? (() => { const days = weekDays(selected); const a = new Date(`${days[0]!}T12:00:00`); const b = new Date(`${days[6]!}T12:00:00`); return `Semaine ${isoWeek(days[0]!)} · ${a.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${b.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`; })() : selectedDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const defaultY = () => (typeof window === "undefined" ? 240 : window.innerHeight / 2);
  const openNew = (start = "09:00", y = defaultY()) => { const s = timeToMinutes(start); setEditingId(null); setTitle(""); setTime(start); setEndTime(minutesToTime(Math.min(agendaEndMinute, s + 60))); setType("study"); setFormError(null); setAnchorY(y); setEditorOpen(true); };
  const openEdit = (event: CalendarEvent, y = defaultY()) => { const s = timeToMinutes(event.time); setEditingId(event.id); setTitle(event.title); setTime(event.time); setEndTime(minutesToTime(Math.min(agendaEndMinute, s + event.duration))); setType(event.type); setFormError(null); setAnchorY(y); setEditorOpen(true); };
  const close = () => { setEditorOpen(false); setFormError(null); };
  const save = () => {
    if (!title.trim()) { setFormError("Donne un nom à la tâche."); return; }
    const start = snapAgendaMinute(Math.max(agendaStartMinute, Math.min(agendaEndMinute - agendaStep, timeToMinutes(time))));
    const end = snapAgendaMinute(Math.min(agendaEndMinute, endToMinutes(endTime, start)));
    if (end <= start) { setFormError("L’heure de fin doit être après l’heure de début."); return; }
    const data = { title: title.trim(), date: selected, time: minutesToTime(start), duration: end - start, type, completed: false, xp: calendarTypeMeta[type].xp };
    onEventsChange(editingId === null ? [...events, { id: Date.now(), ...data }] : events.map((event) => event.id === editingId ? { ...event, ...data, completed: event.completed } : event));
    close();
  };
  const complete = (event: CalendarEvent) => { if (event.completed) return; onEventsChange(events.map((item) => item.id === event.id ? { ...item, completed: true } : item)); onEarnXp(event.xp); };
  const remove = (id: number) => { onEventsChange(events.filter((item) => item.id !== id)); close(); };

  // Start the day view around 07:00 so the morning is visible without hiding the night hours.
  useEffect(() => { if (view === "day" && scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT - 8; }, [view, selected]);
  // Once a long-press is armed, block page scrolling so the finger drags the block instead.
  useEffect(() => {
    const block = (e: TouchEvent) => { if (gesture.current?.armed) e.preventDefault(); };
    window.addEventListener("touchmove", block, { passive: false });
    return () => window.removeEventListener("touchmove", block);
  }, []);
  useEffect(() => { if (!editorOpen) return; const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [editorOpen]);

  const resetGesture = () => { const g = gesture.current; if (g?.timer) window.clearTimeout(g.timer); gesture.current = null; setArmedId(null); updatePreview(null); };
  const beginGesture = (event: CalendarEvent, mode: Gesture["mode"], pointer: ReactPointerEvent) => {
    pointer.stopPropagation();
    if (pointer.button !== 0) return;
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    const g: Gesture = { id: event.id, mode, startX: pointer.clientX, startY: pointer.clientY, startMinute: timeToMinutes(event.time), startDuration: event.duration, moved: false, armed: mode === "resize", timer: null };
    gesture.current = g;
    if (mode === "resize") updatePreview({ id: event.id, time: event.time, duration: event.duration });
    else g.timer = window.setTimeout(() => {
      if (gesture.current !== g) return;
      g.armed = true; g.timer = null; setArmedId(event.id);
      updatePreview({ id: event.id, time: event.time, duration: event.duration });
      navigator.vibrate?.(25);
    }, LONG_PRESS_MS);
  };
  const moveGesture = (pointer: ReactPointerEvent) => {
    const current = gesture.current; if (!current) return;
    if (!current.armed) {
      // Moving before the 1 s hold means the user is scrolling or just clicking off: cancel.
      if (Math.hypot(pointer.clientX - current.startX, pointer.clientY - current.startY) > 8) { if (current.timer) window.clearTimeout(current.timer); current.timer = null; current.moved = true; }
      return;
    }
    const delta = snapAgendaMinute(((pointer.clientY - current.startY) / HOUR_HEIGHT) * 60);
    if (Math.abs(pointer.clientY - current.startY) > 4) current.moved = true;
    if (current.mode === "move") {
      const start = Math.max(agendaStartMinute, Math.min(agendaEndMinute - current.startDuration, current.startMinute + delta));
      updatePreview({ id: current.id, time: minutesToTime(start), duration: current.startDuration });
    } else {
      const nextDuration = Math.max(agendaStep, Math.min(agendaEndMinute - current.startMinute, current.startDuration + delta));
      updatePreview({ id: current.id, time: minutesToTime(current.startMinute), duration: snapAgendaMinute(nextDuration) });
    }
  };
  const endGesture = (pointer: ReactPointerEvent, event: CalendarEvent) => {
    pointer.stopPropagation(); const current = gesture.current; const next = previewRef.current;
    if (current?.armed && next && current.moved) onEventsChange(events.map((item) => item.id === next.id ? { ...item, time: next.time, duration: next.duration } : item));
    const click = current && current.mode === "move" && !current.moved && !current.armed;
    resetGesture();
    if (click) openEdit(event, pointer.clientY);
  };

  const popupTop = typeof window === "undefined" ? anchorY : Math.max(12, Math.min(anchorY - 24, window.innerHeight - 360));
  const editor = editorOpen && typeof document !== "undefined" ? createPortal(
    <div className="fixed inset-0 z-[80]" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <section role="dialog" aria-modal="true" aria-label={editingId === null ? "Nouvelle tâche" : "Modifier la tâche"} className="panel-lift absolute left-1/2 w-[min(380px,calc(100vw-24px))] -translate-x-1/2 bg-card p-4 shadow-2xl" style={{ top: popupTop }}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0"><h2 className="section-title">{editingId === null ? "Nouvelle tâche" : "Modifier la tâche"}</h2><p className="section-subtitle capitalize">{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p></div>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Fermer sans enregistrer"><X /></Button>
        </div>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Input autoFocus value={title} onChange={(event) => { setTitle(event.target.value); setFormError(null); }} placeholder="Nom de la tâche" aria-label="Nom de la tâche" />
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0 space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Début</span><Input type="time" step={900} value={time} onChange={(event) => { setTime(event.target.value); setFormError(null); }} aria-label="Heure de début" /></label>
            <label className="min-w-0 space-y-1"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Fin</span><Input type="time" step={900} value={endTime} onChange={(event) => { setEndTime(event.target.value); setFormError(null); }} aria-label="Heure de fin" /></label>
          </div>
          <select value={type} onChange={(event) => setType(event.target.value as CalendarEventType)} className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs" aria-label="Type">{Object.entries(calendarTypeMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select>
          {formError && <p className="text-xs text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">{editingId !== null && <Button type="button" variant="destructive" onClick={() => remove(editingId)}><Trash2 /> Supprimer</Button>}<Button type="submit">{editingId === null ? <Plus /> : <Pencil />} {editingId === null ? "Ajouter" : "Enregistrer"}</Button></div>
        </form>
      </section>
    </div>, document.body) : null;

  return <div className={cn("animate-enter", embedded && "border-t border-border pt-6")}>
    {editor}
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><div className="min-w-0"><p className="eyebrow">{embedded ? "Planification du focus" : "Chronologie globale"}</p><h2 className="font-display text-2xl font-bold sm:text-[30px]">Agenda quotidien</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Touche une heure pour créer. Maintiens un bloc 1 seconde pour le déplacer, étire sa poignée basse pour changer sa fin.</p></div><Button onClick={(e) => openNew("09:00", e.clientY)} className="shrink-0"><Plus /> <span className="hidden sm:inline">Planifier</span></Button></div>
    <section className="performance-strip mb-4 grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_repeat(3,auto)] lg:items-center"><div><label htmlFor="tracking-start" className="text-[10px] font-semibold uppercase text-muted-foreground">Début du suivi</label><Input id="tracking-start" type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} className="mt-2 max-w-48" /></div><Stat value={stats.completed.toString()} label="sessions accomplies" /><Stat value={`${Math.round(stats.minutes / 60)} h`} label="temps investi" /><Stat value={`+${stats.xp}`} label="XP calendrier" accent /></section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_340px]">
      <section className="panel-lift overflow-hidden"><div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="mobile-scroll-x max-w-full"><div className="flex min-w-max rounded-md border border-border bg-surface/60 p-0.5" role="tablist" aria-label="Affichage">{(["day", "week", "month"] as const).map((mode) => <button key={mode} role="tab" aria-selected={view === mode} onClick={() => setView(mode)} className={cn("min-h-9 shrink-0 rounded px-3 py-1.5 text-xs font-semibold text-muted-foreground transition", view === mode && "bg-primary text-primary-foreground")}>{viewLabels[mode]}</button>)}</div></div>
          <div className="flex items-center gap-1"><Button variant="ghost" size="icon" onClick={() => shiftView(-1)} disabled={!canShift(-1)} aria-label="Précédent"><ChevronLeft /></Button><Button variant="outline" size="sm" onClick={() => setSelected(toDateKey(new Date()))}>{selected === toDateKey(new Date()) ? "Aujourd’hui" : selectedDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</Button><Button variant="ghost" size="icon" onClick={() => shiftView(1)} disabled={!canShift(1)} aria-label="Suivant"><ChevronRight /></Button></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="section-title capitalize">{headerTitle}</h2><p className="section-subtitle">{view === "day" ? "24 h · pas de 15 minutes" : view === "week" ? "Touche un jour pour l’ouvrir" : "Touche une semaine ou un jour"}</p></div>
          <div className="flex gap-2"><select value={selectedDate.getMonth()} onChange={(e) => jumpTo(selectedDate.getFullYear(), Number(e.target.value))} className="h-9 rounded-md border border-border bg-surface px-2 text-xs capitalize" aria-label="Mois">{monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}</select><select value={selectedDate.getFullYear()} onChange={(e) => jumpTo(Number(e.target.value), selectedDate.getMonth())} className="h-9 rounded-md border border-border bg-surface px-2 text-xs" aria-label="Année">{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>
        </div>
      </div>
        {view === "week" && <div className="mobile-scroll-x"><div className="grid min-w-[700px] grid-cols-7 gap-2 p-4">{weekDays(selected).map((key) => { const d = new Date(`${key}T12:00:00`); const dayEvents = events.filter((e) => e.date === key).sort((a, b) => a.time.localeCompare(b.time)); const isToday = key === toDateKey(new Date()); return <div key={key} className={cn("flex min-h-[360px] min-w-0 flex-col rounded-md border border-border bg-surface/40", key === selected && "border-primary/50")}><button onClick={() => { setSelected(key); setView("day"); }} className="min-h-12 border-b border-border p-2 text-center hover:bg-primary/10" aria-label={`Ouvrir ${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`}><p className="text-[9px] uppercase text-muted-foreground">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</p><p className={cn("font-display text-lg font-bold", isToday && "text-primary")}>{d.getDate()}</p></button><div className="flex flex-1 flex-col gap-1 p-1">{dayEvents.map((event) => <button key={event.id} onClick={(e) => { setSelected(key); openEdit(event, e.clientY); }} className={cn("min-h-10 truncate rounded border-l-2 border-primary bg-primary/12 px-1.5 py-1 text-left text-[10px]", event.completed && "border-success bg-success/10 line-through opacity-65")}><span className="block font-mono text-[8px] text-muted-foreground">{event.time}</span>{event.title}</button>)}<button onClick={(e) => { setSelected(key); openNew("09:00", e.clientY); }} className="mt-auto flex min-h-10 justify-center rounded py-1 text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label="Ajouter un bloc"><Plus className="size-3.5" /></button></div></div>; })}</div></div>}
        {view === "month" && <div className="mobile-scroll-x"><div className="min-w-[420px] p-2 sm:min-w-0 sm:p-4"><div className="grid grid-cols-[28px_repeat(7,minmax(0,1fr))] gap-1 text-center text-[9px] uppercase text-muted-foreground"><span>Sem</span>{["lun", "mar", "mer", "jeu", "ven", "sam", "dim"].map((d) => <span key={d}>{d}</span>)}</div>{monthWeeks(selected).map((week) => <div key={week[0]!} className="mt-1 grid grid-cols-[28px_repeat(7,minmax(0,1fr))] gap-1"><button onClick={() => { setSelected(week[0]! < `${selected.slice(0, 7)}-01` ? `${selected.slice(0, 7)}-01` : week[0]!); setView("week"); }} className="rounded font-mono text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary" aria-label={`Ouvrir la semaine ${isoWeek(week[0]!)}`}>{isoWeek(week[0]!)}</button>{week.map((key) => { const d = new Date(`${key}T12:00:00`); const inMonth = key.slice(0, 7) === selected.slice(0, 7); const count = events.filter((e) => e.date === key).length; const isToday = key === toDateKey(new Date()); return <button key={key} disabled={key < MIN_DATE || key > MAX_DATE} onClick={() => { setSelected(key); setView("day"); }} className={cn("flex aspect-square min-h-10 flex-col items-center justify-center rounded-md border border-border/60 text-xs hover:border-primary/40 hover:bg-primary/10 disabled:opacity-20 sm:aspect-auto sm:h-16", !inMonth && "opacity-40", key === selected && "border-primary bg-primary/10")} aria-label={d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}><span className={cn("font-semibold", isToday && "text-primary")}>{d.getDate()}</span>{count > 0 && <span className="mt-1 flex gap-0.5">{Array.from({ length: Math.min(count, 3) }).map((_, i) => <span key={i} className="size-1 rounded-full bg-primary" />)}</span>}</button>; })}</div>)}</div></div>}
        {view === "day" && <div ref={scrollRef} className="flex max-h-[640px] overflow-y-auto p-3 sm:p-5"><div className="relative w-[52px] shrink-0" style={{ height: DAY_HEIGHT }}>{dayHours.slice(0, -1).map((hour) => <span key={hour} className="absolute right-3 font-mono text-[10px] text-muted-foreground" style={{ top: hour * HOUR_HEIGHT + 4 }}>{hourLabel(hour)}</span>)}</div><div className="relative min-w-0 flex-1 border-l border-border" style={{ height: DAY_HEIGHT }}>
          {dayHours.slice(0, -1).map((hour) => <button key={hour} type="button" onClick={(e) => openNew(hourLabel(hour), e.clientY)} className="agenda-hour absolute inset-x-0 border-b border-border/70 text-left transition-colors" style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }} aria-label={`Créer une tâche à ${hourLabel(hour)}`}><span className="pointer-events-none absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 bg-border/35" /></button>)}
          {selectedEvents.map((event) => { const current = preview?.id === event.id ? { ...event, time: preview.time, duration: preview.duration } : event; const Icon = typeIcons[event.type]; const startMin = timeToMinutes(current.time); const top = ((startMin - agendaStartMinute) / 60) * HOUR_HEIGHT; const height = Math.max(30, (current.duration / 60) * HOUR_HEIGHT); return <div key={event.id} data-dragging={preview?.id === event.id} data-armed={armedId === event.id} onPointerDown={(p) => beginGesture(event, "move", p)} onPointerMove={moveGesture} onPointerUp={(p) => endGesture(p, event)} onPointerCancel={resetGesture} onContextMenu={(e) => e.preventDefault()} className={cn("agenda-event absolute left-2 right-2 z-10 cursor-pointer overflow-hidden rounded-md border-l-2 border-primary bg-primary/15 px-3 py-1.5 text-left backdrop-blur-sm transition-transform", event.completed && "border-success bg-success/10 opacity-65")} style={{ top, height }} role="button" aria-label={`${event.title}, ${current.time}–${minutesToTime(startMin + current.duration)}. Maintenir pour déplacer.`}><div className="flex min-w-0 items-start gap-1.5"><Icon className="mt-0.5 size-3.5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className={cn("truncate text-xs font-semibold", event.completed && "line-through")}>{event.title}</p><p className="truncate font-mono text-[9px] text-muted-foreground">{current.time}–{minutesToTime(startMin + current.duration) === "00:00" ? "24:00" : minutesToTime(startMin + current.duration)} · +{event.xp} XP</p></div></div><button type="button" onPointerDown={(p) => beginGesture(event, "resize", p)} onPointerMove={moveGesture} onPointerUp={(p) => endGesture(p, event)} onPointerCancel={resetGesture} className="agenda-handle absolute inset-x-0 bottom-0 flex h-6 items-center justify-center text-primary/60" aria-label={`Redimensionner ${event.title}`}><GripHorizontal className="size-4" /></button></div>; })}
        </div></div>}
      </section>
      <aside className="space-y-4"><section className="panel-lift p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="section-title">Programme du jour</h2><p className="section-subtitle">{selectedEvents.length} bloc{selectedEvents.length > 1 ? "s" : ""}</p></div><CalendarDays className="size-5 text-primary" /></div><div className="space-y-2">{selectedEvents.map((event) => { const Icon = typeIcons[event.type]; return <button key={event.id} onClick={() => openEdit(event)} className="group flex w-full items-start gap-2 rounded-md border border-border bg-surface/60 p-3 text-left hover:border-primary/25"><div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className={cn("truncate text-xs font-semibold", event.completed && "text-muted-foreground line-through")}>{event.title}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="size-3" /> {event.time} · {event.duration} min</p></div>{!event.completed && <Button size="icon" variant="ghost" onClick={(pointer) => { pointer.stopPropagation(); complete(event); }} aria-label={`Terminer ${event.title}`}><Check /></Button>}<Pencil className="mt-2 size-3.5 text-muted-foreground group-hover:text-primary" /></button>; })}{!selectedEvents.length && <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">Cette journée est libre.</p>}</div></section><section className="panel-lift p-5"><div className="mb-4 flex items-center gap-2"><Award className="size-4 text-warning" /><h2 className="section-title">Récompenses</h2></div><div className="mobile-stack grid grid-cols-2 gap-2">{medals.map((medal) => <div key={medal.id} className={cn("medal-tile p-3", medal.earned && "medal-earned")}><Award className={cn("size-5", medal.earned ? "text-warning" : "text-muted-foreground")} /><p className="mt-3 text-[11px] font-semibold">{medal.label}</p><p className="mt-1 text-[9px] text-muted-foreground">{medal.detail}</p></div>)}</div></section></aside>
    </div>
  </div>;
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) { return <div className="min-w-0 lg:border-l lg:border-border lg:pl-5"><p className={cn("font-display text-2xl font-bold", accent && "text-primary")}>{value}</p><p className="text-[10px] uppercase text-muted-foreground">{label}</p></div>; }