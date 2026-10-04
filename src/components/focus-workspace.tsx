import { useEffect, useMemo, useRef, useState } from "react";
import { Brain, Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarWorkspace } from "@/components/calendar-workspace";
import { RankEmblem } from "@/components/rank-emblem";
import { RotaryPicker } from "@/components/rotary-picker";
import { useCloudState } from "@/lib/cloud-state";
import { toDateKey, type CalendarEvent } from "@/lib/calendar";
import { domains, xpRank, type DeepWorkSession, type Domain } from "@/lib/growth";
import { cn } from "@/lib/utils";

const typeDomain: Record<string, Domain> = { study: "etudes", revision: "etudes", course: "etudes", training: "sante", focus: "business", meeting: "business", routine: "sante" };

export function FocusWorkspace({ xp, events, startDate, onStartDateChange, onEventsChange, onEarn, onEarnCalendar }: {
  xp: number;
  events: CalendarEvent[];
  startDate: string;
  onStartDateChange: (date: string) => void;
  onEventsChange: (events: CalendarEvent[]) => void;
  onEarn: (points: number, domain: Domain) => void;
  onEarnCalendar: (points: number) => void;
}) {
  const [sessions, setSessions] = useCloudState<DeepWorkSession[]>("deep-work", []);
  const today = toDateKey(new Date());
  const blocks = useMemo(() => events.filter((e) => e.date === today).sort((a, b) => a.time.localeCompare(b.time)), [events, today]);
  const [now, setNow] = useState(() => new Date());
  const [domain, setDomain] = useState<Domain>("etudes");
  const [workMin, setWorkMin] = useState(25);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);
  const block = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return blocks.find((b) => { const [hh = 0, mm = 0] = b.time.split(":").map(Number); const start = hh * 60 + mm; return nowMin >= start && nowMin < start + b.duration; }) ?? null;
  }, [blocks, now]);

  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(t); }, []);

  useEffect(() => { if (!running) return; const t = window.setInterval(() => {
    const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000)); setLeft(s);
    if (s === 0) { setRunning(false);
      if (phase === "work") { const d = block ? typeDomain[block.type] ?? domain : domain; setSessions((l) => [...l, { id: Date.now(), date: today, minutes: workMin, domain: d, label: block?.title ?? "Session libre" }]); onEarn(workMin * 2, d); setPhase("break"); setLeft(5 * 60); }
      else { setPhase("work"); setLeft(workMin * 60); }
    } }, 250); return () => window.clearInterval(t); }, [running, phase, block, domain, workMin, today, onEarn, setSessions]);

  const start = () => { endAt.current = Date.now() + left * 1000; setRunning(true); };
  const reset = () => { setRunning(false); setPhase("work"); setLeft(workMin * 60); };
  const changeWorkMinutes = (minutes: number) => {
    setWorkMin(minutes);
    if (!running && phase === "work") setLeft(minutes * 60);
  };
  const logManual = (m: number) => { const d = block ? typeDomain[block.type] ?? domain : domain; setSessions((l) => [...l, { id: Date.now(), date: today, minutes: m, domain: d, label: block?.title ?? "Deep work" }]); onEarn(m * 2, d); };

  const total = sessions.reduce((s, x) => s + x.minutes, 0);
  const todayMin = sessions.filter((s) => s.date === today).reduce((s, x) => s + x.minutes, 0);
  const weekAgo = toDateKey(new Date(Date.now() - 6 * 864e5));
  const weekMin = sessions.filter((s) => s.date >= weekAgo).reduce((s, x) => s + x.minutes, 0);
  const { rank, floor, next } = xpRank(xp);
  const pct = next ? ((xp - floor) / (next - floor)) * 100 : 100;
  const total0 = (phase === "work" ? workMin : 5) * 60; const ring = 1 - left / total0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"); const ss = String(left % 60).padStart(2, "0");

  return <div className="animate-enter space-y-4">
    <div><p className="eyebrow">Zone de focus</p><h1 className="font-display text-2xl font-bold sm:text-[30px]">Deep work & Pomodoro</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Chaque minute de travail profond rapporte 2 XP, nourrit ton arbre de compétences et fait monter ton rang.</p></div>

    <section className="performance-strip grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[auto_repeat(3,minmax(0,1fr))] lg:items-center">
      <div className="flex items-center gap-4"><RankEmblem rank={rank} size={76} /><div><p className="text-[10px] uppercase text-muted-foreground">Rang productivité</p><p className="font-display text-lg font-bold">{rank.label}</p><div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-muted"><div className="xp-bar-fill h-full rounded-full" style={{ width: `${pct}%` }} /></div><p className="mt-1 font-mono text-[9px] text-muted-foreground">{next ? `${next - xp} XP avant le rang suivant` : "Rang maximal"}</p></div></div>
      <Stat value={`${(todayMin / 60).toFixed(1)} h`} label="aujourd'hui" />
      <Stat value={`${(weekMin / 60).toFixed(1)} h`} label="7 derniers jours" />
      <Stat value={`${(total / 60).toFixed(1)} h`} label="deep work total" accent />
    </section>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="panel-lift flex flex-col items-center p-6">
        <RotaryPicker label="Durée de concentration" unit="min" min={1} max={180} step={1} value={workMin} onChange={changeWorkMinutes} className="mb-5 w-full max-w-[260px]" />
        <div className="relative size-64">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90"><circle cx="50" cy="50" r="45" fill="none" stroke="var(--muted)" strokeWidth="3" /><circle cx="50" cy="50" r="45" fill="none" stroke={phase === "work" ? "var(--primary)" : "var(--success)"} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${ring * 282.7} 282.7`} className="drop-shadow-[0_0_6px_var(--primary)] transition-[stroke-dasharray] duration-300" /></svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{phase === "work" ? "Concentration" : "Pause"}</p><p className="font-display text-5xl font-bold tabular-nums">{mm}:{ss}</p><p className="mt-1 max-w-40 truncate text-[11px] text-primary">{block?.title ?? domains[domain].label}</p></div>
        </div>
        <div className="mt-5 flex gap-2">{running ? <Button onClick={() => setRunning(false)}><Pause /> Pause</Button> : <Button onClick={start}><Play /> Démarrer</Button>}<Button variant="outline" onClick={reset}><RotateCcw /> Réinitialiser</Button></div>
        {!block && <div className="mt-4 flex flex-wrap justify-center gap-1">{(Object.keys(domains) as Domain[]).map((d) => <button key={d} onClick={() => setDomain(d)} className={cn("rounded-full border px-3 py-1 text-[11px]", domain === d ? "border-primary text-primary" : "border-border text-muted-foreground")}>{domains[d].label}</button>)}</div>}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground"><Brain className="size-3.5" /> Ajout manuel :{[30, 60, 120].map((m) => <Button key={m} size="sm" variant="ghost" onClick={() => logManual(m)}>+{m} min</Button>)}</div>
      </section>

    </div>

    <CalendarWorkspace events={events} startDate={startDate} onStartDateChange={onStartDateChange} onEventsChange={onEventsChange} onEarnXp={onEarnCalendar} embedded />

    <section className="panel-lift p-5"><h2 className="section-title">Historique deep work</h2><div className="mt-3 divide-y divide-border">{sessions.slice(-10).reverse().map((s) => <div key={s.id} className="flex items-center gap-3 py-2 text-xs"><span className="w-20 text-muted-foreground">{new Date(`${s.date}T12:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span><span className="min-w-0 flex-1 truncate">{s.label}</span><span className="text-muted-foreground">{domains[s.domain].label}</span><span className="font-mono text-primary">{s.minutes} min</span><Button size="icon" variant="ghost" onClick={() => setSessions((l) => l.filter((x) => x.id !== s.id))} aria-label="Supprimer"><Trash2 /></Button></div>)}{!sessions.length && <p className="py-3 text-xs text-muted-foreground">Lance ta première session pour commencer le compteur.</p>}</div></section>
  </div>;
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return <div className="lg:border-l lg:border-border lg:pl-5"><p className={cn("font-display text-2xl font-bold", accent && "text-primary")}>{value}</p><p className="text-[10px] uppercase text-muted-foreground">{label}</p></div>;
}
