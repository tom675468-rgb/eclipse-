import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowUp, CalendarDays, Check, Dumbbell, Gauge, LineChart, Minus, Play, Plus, Search, Sigma, Sparkles, Timer, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RankEmblem } from "@/components/rank-emblem";
import { Link } from "@tanstack/react-router";

function CoachLink() {
  return (
    <section className="panel flex flex-col items-center p-8 text-center">
      <Sparkles className="size-6 text-primary" />
      <h2 className="mt-3 font-display text-lg font-semibold">Le Coach IA a son propre espace</h2>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">Discute librement avec lui : il connaît tes séances, tes charges, ta nutrition et tes objectifs.</p>
      <Button asChild className="mt-5"><Link to="/coach">Ouvrir le Coach IA</Link></Button>
    </section>
  );
}
import { StrengthStandards } from "@/components/strength-standards";
import { useCloudState } from "@/lib/cloud-state";
import type { Profile } from "@/lib/strength-standards";
import { findExercise, rankFromPercentile, searchExercises } from "@/lib/strength-standards";
import {
  defaultProfile, estimate1RM, exerciseHistory, formatRest, groupIndices, isPerSide, loadLabel, zoneScore,
  type GroupIndex, type PlannedExercise, type Session, type SetLog, type Workout,
} from "@/lib/training";

type Tab = "program" | "progress" | "analysis" | "standards" | "coach";
type Metric = "e1rm" | "load" | "reps" | "rest";
const metrics: { id: Metric; label: string; unit: string; lowerIsBetter?: boolean }[] = [
  { id: "e1rm", label: "1RM estimé", unit: "kg" },
  { id: "load", label: "Charge", unit: "kg" },
  { id: "reps", label: "Répétitions", unit: "reps" },
  { id: "rest", label: "Repos", unit: "s", lowerIsBetter: true },
];
const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function Stepper({ label, value, onChange, step = 1, min = 0, max = 999, format }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; format?: (v: number) => string }) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  useEffect(() => { if (!editing) setDraft(String(value)); }, [editing, value]);
  const commit = () => {
    const parsed = Number(draft.replace(",", "."));
    if (Number.isFinite(parsed)) set(parsed);
    setEditing(false);
  };
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[9px] font-semibold uppercase text-muted-foreground">{label}</p>
      <div className="flex items-center rounded-md border border-border bg-surface/70">
        <button type="button" onClick={() => set(value - step)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label={`Diminuer ${label}`}><Minus className="size-3" /></button>
        <input
          type="text"
          inputMode="decimal"
          value={editing ? draft : format ? format(value) : String(value)}
          onFocus={(event) => { setEditing(true); setDraft(String(value)); event.currentTarget.select(); }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") { setDraft(String(value)); setEditing(false); event.currentTarget.blur(); }
          }}
          className="min-w-0 flex-1 bg-transparent text-center font-mono text-xs tabular-nums outline-none focus:text-primary"
          aria-label={`Saisir ${label}`}
        />
        <button type="button" onClick={() => set(value + step)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label={`Augmenter ${label}`}><Plus className="size-3" /></button>
      </div>
    </div>
  );
}

export function TrainingWorkspace({ onEarnXp, onOpenNutrition, trackingStartDate }: { onEarnXp?: ((points: number) => void) | undefined; onOpenNutrition?: (() => void) | undefined; trackingStartDate: string }) {
  const [profile] = useCloudState<Profile>("strength-profile", defaultProfile);
  const [tab, setTab] = useState<Tab>("program");
  const [workouts, setWorkouts] = useCloudState<Workout[]>("workouts", []);
  const [sessions, setSessions] = useCloudState<Session[]>("sessions", []);
  const [builder, setBuilder] = useState(false);
  const [active, setActive] = useState<Workout | null>(null);
  const [focusId, setFocusId] = useCloudState<string>("training-focus", "bench-developpe-couche-barre");

  useEffect(() => {
    const retiredIds = new Set(["upper-a", "lower-a", "upper-b", "lower-b"]);
    const sampleWorkouts = workouts.length === 4 && workouts.every((workout) => retiredIds.has(workout.id));
    const sampleSessions = sessions.length === 32 && sessions.every((session) => session.id >= 1 && session.id <= 32 && session.date?.startsWith("2026-"));
    if (sampleWorkouts) setWorkouts([]);
    if (sampleSessions) setSessions([]);
  }, [sessions, setSessions, setWorkouts, workouts]);

  const scopedSessions = useMemo(() => sessions.filter((session) => !session.date || session.date >= trackingStartDate), [sessions, trackingStartDate]);
  const indices = useMemo(() => groupIndices(scopedSessions, profile), [scopedSessions, profile]);
  const trackedIds = useMemo(() => Array.from(new Set(scopedSessions.flatMap((s) => s.logs.map((l) => l.exerciseId)))), [scopedSessions]);

  const saveSession = (workout: Workout, logs: SetLog[]) => {
    const order = (sessions.at(-1)?.order ?? 0) + 1;
    setSessions((s) => [...s, { id: Date.now(), workoutId: workout.id, order, date: new Date().toISOString().slice(0, 10), label: `Nouv. · ${workout.day.slice(0, 3)}`, logs }]);
    setActive(null);
    onEarnXp?.(60);
  };

  return (
    <div className="animate-enter">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
           <p className="eyebrow">Performance athlétique</p>
           <h1 className="font-display text-2xl font-bold sm:text-[30px]">Entraînement & Force</h1>
           <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Programme, performances, standards de population et analyse Upper / Lower réunis dans un même cockpit.</p>
        </div>
        <Button onClick={() => { setBuilder(true); setTab("program"); }}><Plus /> Créer un entraînement</Button>
      </div>

      <div className="mobile-scroll-x -mx-3 mb-5 px-3 min-[360px]:-mx-4 min-[360px]:px-4 sm:mx-0 sm:px-0"><div className="inline-flex min-w-max rounded-md border border-border bg-surface/70 p-1">
         {([["program", "Programme", CalendarDays], ["progress", "Progression", LineChart], ["analysis", "Upper · Lower · Global", Sigma], ["standards", "Standards & rangs", Gauge], ["coach", "Coach IA", Sparkles]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={cn("flex min-h-9 shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors", tab === id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div></div>

      {tab === "program" && (
        <>
          {builder && <WorkoutBuilder onCancel={() => setBuilder(false)} onSave={(w) => { setWorkouts((list) => [...list, w]); setBuilder(false); onEarnXp?.(30); }} />}
          {active && <SessionLogger workout={active} sessions={sessions} onCancel={() => setActive(null)} onSave={(logs) => saveSession(active, logs)} />}
          <div className="grid gap-4 md:grid-cols-2">
            {workouts.map((w) => (
              <section key={w.id} className="panel p-5">
                <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <span className={cn("rounded px-2 py-0.5 text-[9px] font-semibold uppercase", w.focus === "upper" ? "bg-primary/10 text-primary" : "bg-rank-gold/10 text-rank-gold")}>{w.focus === "upper" ? "Haut du corps" : "Bas du corps"} · {w.day}</span>
                    <h2 className="mt-2 truncate font-display text-base font-semibold">{w.name}</h2>
                    <p className="text-[10px] text-muted-foreground">{sessions.filter((s) => s.workoutId === w.id).length} séances enregistrées</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => setActive(w)}><Play /> Séance</Button>
                    <Button size="icon" variant="ghost" onClick={() => setWorkouts((list) => list.filter((x) => x.id !== w.id))} aria-label={`Supprimer ${w.name}`}><Trash2 /></Button>
                  </div>
                </div>
                <div className="divide-y divide-border rounded-md border border-border">
                  {w.exercises.map((p) => {
                    const ex = findExercise(p.exerciseId);
                    return (
                      <button key={p.exerciseId} onClick={() => { setFocusId(p.exerciseId); setTab("progress"); }} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40">
                        <span className="min-w-0"><span className="block truncate text-xs font-medium">{ex?.name}</span><span className="block truncate text-[10px] text-muted-foreground">{ex?.variant}</span></span>
                        <span className="max-w-[45vw] truncate font-mono text-[11px] text-muted-foreground sm:max-w-none">{p.sets}×{p.reps} · {p.load} kg{isPerSide(ex) ? "/côté" : ""}{(p.extra ?? []).map((g, k) => <span key={k}> + {g.sets}×{g.reps} · {g.load} kg · {formatRest(g.rest ?? p.rest)}</span>)} · <Timer className="inline size-3" /> {formatRest(p.rest)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            {!workouts.length && <button onClick={() => setBuilder(true)} className="panel col-span-full min-h-40 border-dashed p-6 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"><Dumbbell className="size-6 text-primary" /><h2 className="mt-4 font-display text-base font-semibold">Créer ton premier entraînement</h2><p className="mt-1 text-xs text-muted-foreground">Choisis tes exercices, séries, répétitions et temps de repos.</p></button>}
          </div>
        </>
      )}

       {tab === "progress" && <ProgressView ids={trackedIds} focusId={focusId} setFocusId={setFocusId} sessions={scopedSessions} />}
      {tab === "analysis" && <AnalysisView indices={indices} />}
       {tab === "standards" && <StrengthStandards embedded onEarnXp={onEarnXp} onOpenNutrition={onOpenNutrition} trackingStartDate={trackingStartDate} />}
       {tab === "coach" && <CoachLink />}
    </div>
  );
}

function WorkoutBuilder({ onSave, onCancel }: { onSave: (w: Workout) => void; onCancel: () => void }) {
  const [name, setName] = useState("Nouvelle séance");
  const [focus, setFocus] = useState<"upper" | "lower">("upper");
  const [day, setDay] = useState("Samedi");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PlannedExercise[]>([]);
  const results = useMemo(() => searchExercises(query).slice(0, 8), [query]);
  const update = (i: number, patch: Partial<PlannedExercise>) => setItems((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <section className="panel mb-4 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><h2 className="section-title">Créer un entraînement</h2><button onClick={onCancel} aria-label="Fermer" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button></div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nom de l'entraînement" />
        <div className="flex rounded-md border border-border p-1">{(["upper", "lower"] as const).map((f) => <button key={f} onClick={() => setFocus(f)} className={cn("rounded px-2.5 py-1 text-xs", focus === f ? "bg-accent text-foreground" : "text-muted-foreground")}>{f === "upper" ? "Upper" : "Lower"}</button>)}</div>
        <select value={day} onChange={(e) => setDay(e.target.value)} className="h-9 rounded-md border border-border bg-surface px-2 text-xs" aria-label="Jour">{days.map((d) => <option key={d}>{d}</option>)}</select>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="relative mb-2"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ajouter un exercice…" className="pl-9" aria-label="Chercher un exercice à ajouter" /></div>
          <div className="grid gap-1.5">
            {results.map((ex) => (
              <button key={ex.id} onClick={() => !items.some((p) => p.exerciseId === ex.id) && setItems((l) => [...l, { exerciseId: ex.id, sets: 3, reps: 8, rest: 120, load: ex.bodyweightLoaded ? 0 : 20 }])} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-accent">
                <span className="min-w-0"><span className="block truncate font-medium">{ex.name}</span><span className="block truncate text-[10px] text-muted-foreground">{ex.group} · {ex.variant}</span></span>
                {items.some((p) => p.exerciseId === ex.id) ? <Check className="size-3.5 text-success" /> : <Plus className="size-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {!items.length && <p className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">Sélectionne des exercices à gauche, puis règle séries, répétitions et repos.</p>}
          {items.map((p, i) => (
            <div key={p.exerciseId} className="rounded-md border border-border bg-surface/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2"><span className="truncate text-xs font-medium">{findExercise(p.exerciseId)?.name}</span><button onClick={() => setItems((l) => l.filter((_, j) => j !== i))} aria-label="Retirer" className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button></div>
              <div className="mobile-stack grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stepper label={`${loadLabel(findExercise(p.exerciseId))} kg`} value={p.load} step={0.5} min={0} max={500} format={(v) => v.toFixed(1)} onChange={(load) => update(i, { load })} />
                <Stepper label="Séries" value={p.sets} min={1} max={10} onChange={(sets) => update(i, { sets })} />
                <Stepper label="Reps" value={p.reps} min={1} max={30} onChange={(reps) => update(i, { reps })} />
                <Stepper label="Repos" value={p.rest} step={15} min={15} max={600} format={formatRest} onChange={(rest) => update(i, { rest })} />
              </div>
              {(p.extra ?? []).map((g, k) => {
                const setExtra = (patch: Partial<typeof g>) => update(i, { extra: (p.extra ?? []).map((x, j) => (j === k ? { ...x, ...patch } : x)) });
                return (
                  <div key={k} className="mt-2 rounded-md border border-dashed border-primary/30 p-2">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-primary"><span>Autres séries {k + 2}</span><button onClick={() => update(i, { extra: (p.extra ?? []).filter((_, j) => j !== k) })} aria-label="Retirer ces séries" className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button></div>
                    <div className="mobile-stack grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Stepper label={`${loadLabel(findExercise(p.exerciseId))} kg`} value={g.load} step={0.5} min={0} max={500} format={(v) => v.toFixed(1)} onChange={(load) => setExtra({ load })} />
                      <Stepper label="Séries" value={g.sets} min={1} max={10} onChange={(sets) => setExtra({ sets })} />
                      <Stepper label="Reps" value={g.reps} min={1} max={30} onChange={(reps) => setExtra({ reps })} />
                      <Stepper label="Repos" value={g.rest ?? p.rest} step={15} min={15} max={600} format={formatRest} onChange={(rest) => setExtra({ rest })} />
                    </div>
                  </div>
                );
              })}
              <button onClick={() => { const last = (p.extra ?? []).at(-1) ?? p; update(i, { extra: [...(p.extra ?? []), { sets: 2, reps: last.reps, load: Math.max(0, last.load - 10), rest: last.rest ?? p.rest }] }); }} className="mt-2 inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"><Plus className="size-3" /> Autres séries</button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={onCancel}>Annuler</Button><Button disabled={!items.length || !name.trim()} onClick={() => onSave({ id: `w-${Date.now()}`, name: name.trim(), focus, day, exercises: items })}>Enregistrer l'entraînement</Button></div>
    </section>
  );
}

function SessionLogger({ workout, sessions, onSave, onCancel }: { workout: Workout; sessions: Session[]; onSave: (logs: SetLog[]) => void; onCancel: () => void }) {
  const [profile] = useCloudState<Profile>("strength-profile", defaultProfile);
  const [logs, setLogs] = useState<SetLog[]>(() => workout.exercises.map((p) => {
    const last = [...sessions].reverse().flatMap((s) => s.logs).find((l) => l.exerciseId === p.exerciseId);
    return { exerciseId: p.exerciseId, load: last?.load ?? p.load ?? 20, reps: last?.reps ?? p.reps, rest: last?.rest ?? p.rest };
  }));
  const update = (i: number, patch: Partial<SetLog>) => setLogs((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <section className="panel mb-4 border-primary/30 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="section-title">Séance : {workout.name}</h2><p className="section-subtitle">Série de travail principale de chaque exercice.</p></div><button onClick={onCancel} aria-label="Fermer" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button></div>
      <div className="space-y-2">
        {logs.map((l, i) => {
          const ex = findExercise(l.exerciseId);
          const total = ex?.bodyweightLoaded ? l.load + profile.bodyweight : l.load;
          return (
            <div key={l.exerciseId} className="grid gap-3 rounded-md border border-border bg-surface/60 p-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,110px)_90px] sm:items-end">
              <span className="min-w-0"><span className="block truncate text-xs font-medium">{ex?.name}</span><span className="block truncate text-[10px] text-muted-foreground">{ex?.bodyweightLoaded ? "Lest (poids du corps ajouté)" : ex?.variant}</span></span>
              <Stepper label={`${loadLabel(ex)} kg`} value={l.load} step={0.5} max={500} format={(v) => v.toFixed(1)} onChange={(load) => update(i, { load })} />
              <Stepper label="Reps" value={l.reps} min={1} max={30} onChange={(reps) => update(i, { reps })} />
              <Stepper label="Repos" value={l.rest} step={15} min={15} max={600} format={formatRest} onChange={(rest) => update(i, { rest })} />
              <div className="text-right"><p className="text-[9px] font-semibold uppercase text-muted-foreground">1RM est.</p><p className="font-mono text-sm text-primary">{estimate1RM(total, l.reps).toFixed(1)}</p></div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={onCancel}>Annuler</Button><Button onClick={() => onSave(logs)}><Check /> Terminer la séance · +60 XP</Button></div>
    </section>
  );
}

function ProgressView({ ids, focusId, setFocusId, sessions }: { ids: string[]; focusId: string; setFocusId: (id: string) => void; sessions: Session[] }) {
  const [metric, setMetric] = useState<Metric>("e1rm");
  const [profile] = useCloudState<Profile>("strength-profile", defaultProfile);
  const history = useMemo(() => exerciseHistory(sessions, focusId, profile), [sessions, focusId, profile]);
  const meta = metrics.find((m) => m.id === metric)!;
  const values = history.map((h) => h[metric]);
  const first = values[0] ?? 0;
  const last = values.at(-1) ?? 0;
  const delta = last - first;
  const good = meta.lowerIsBetter ? delta < 0 : delta > 0;
  const min = Math.min(...values), max = Math.max(...values);
  const W = 640, H = 200, pad = 16;
  const pts = values.map((v, i) => [pad + (i / Math.max(values.length - 1, 1)) * (W - pad * 2), H - pad - ((v - min) / Math.max(max - min, 1e-6)) * (H - pad * 2)] as const);
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const ex = findExercise(focusId);

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
      <section className="panel max-h-[520px] overflow-y-auto p-2">
        {ids.map((id) => { const e = findExercise(id); return (
          <button key={id} onClick={() => setFocusId(id)} className={cn("w-full rounded-md px-3 py-2 text-left text-xs transition-colors", id === focusId ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <span className="block truncate font-medium">{e?.name}</span><span className="block truncate text-[10px]">{e?.group}</span>
          </button>); })}
      </section>
      <section className="panel p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="section-title">{ex?.name}</h2><p className="section-subtitle">{history.length} séances · {ex?.variant}</p></div>
          <div className="flex flex-wrap gap-1">{metrics.map((m) => <button key={m.id} onClick={() => setMetric(m.id)} className={cn("rounded-md border px-2.5 py-1 text-[11px]", metric === m.id ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{m.label}</button>)}</div>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border p-3"><p className="text-[10px] text-muted-foreground">Départ</p><p className="font-mono text-sm">{first.toFixed(metric === "rest" || metric === "reps" ? 0 : 1)} {meta.unit}</p></div>
          <div className="rounded-md border border-border p-3"><p className="text-[10px] text-muted-foreground">Actuel</p><p className="font-mono text-sm">{last.toFixed(metric === "rest" || metric === "reps" ? 0 : 1)} {meta.unit}</p></div>
          <div className={cn("rounded-md border p-3", good ? "border-success/30 bg-success/10" : "border-border")}><p className="text-[10px] text-muted-foreground">Évolution</p><p className={cn("flex items-center gap-1 font-mono text-sm", good ? "text-success" : "text-muted-foreground")}>{delta < 0 ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}{Math.abs(delta).toFixed(1)} {meta.unit}</p></div>
        </div>
        {values.length > 1 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-52 w-full" role="img" aria-label={`Courbe ${meta.label}`}>
            {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad} x2={W - pad} y1={H * f} y2={H * f} className="stroke-border" strokeDasharray="3 5" />)}
            <path d={`${path} L${pts.at(-1)![0]},${H - pad} L${pts[0]![0]},${H - pad} Z`} className="fill-primary/10" />
            <path d={path} fill="none" className="chart-line stroke-primary" strokeWidth={2.5} strokeLinejoin="round" />
            {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} className="fill-background stroke-primary" strokeWidth={2} />)}
          </svg>
        ) : <p className="text-xs text-muted-foreground">Enregistre au moins deux séances pour tracer la courbe.</p>}
        <div className="mobile-scroll-x mt-4 max-h-56 overflow-y-auto rounded-md border border-border"><div className="min-w-[520px] divide-y divide-border">
          {[...history].reverse().map((h, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_repeat(3,auto)] gap-4 px-3 py-2 font-mono text-[11px]">
              <span className="font-sans text-muted-foreground">{h.label}</span><span>{h.load} kg × {h.reps}</span><span className="text-muted-foreground">{formatRest(h.rest)}</span><span className="text-primary">{h.e1rm.toFixed(1)}</span>
            </div>
          ))}
        </div></div>
      </section>
    </div>
  );
}

function ZoneSection({ title, items }: { title: string; items: GroupIndex[] }) {
  const score = zoneScore(items);
  const rank = rankFromPercentile(score.percentile);
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-4">
        <RankEmblem rank={rank} size={60} />
        <div className="min-w-0 flex-1"><h2 className="section-title">{title}</h2><p className="section-subtitle">{rank.label} · {score.percentile.toFixed(0)}ᵉ percentile relatif</p></div>
        <div className="text-right"><p className="font-display text-2xl font-semibold">{score.index.toFixed(0)}</p><p className={cn("text-[10px]", score.gain >= 0 ? "text-success" : "text-destructive")}>{score.gain >= 0 ? "+" : ""}{score.gain.toFixed(1)} %</p></div>
      </div>
      <div className="space-y-3">
        {items.map((g) => (
          <div key={g.group}>
            <div className="mb-1 flex items-baseline justify-between text-xs"><span className="font-medium">{g.group}</span><span className="font-mono text-[11px]"><span className="text-muted-foreground">{g.start.toFixed(0)} → </span>{g.index.toFixed(0)} <span className={g.gain >= 0 ? "text-success" : "text-destructive"}>({g.gain >= 0 ? "+" : ""}{g.gain.toFixed(1)} %)</span></span></div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary/30" style={{ width: `${Math.min(g.start / 2, 100)}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.min(g.index / 2, 100)}%` }} />
              <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
            </div>
          </div>
        ))}
        {!items.length && <p className="text-xs text-muted-foreground">Aucun exercice enregistré dans cette zone.</p>}
      </div>
    </section>
  );
}

function AnalysisView({ indices }: { indices: GroupIndex[] }) {
  const upper = indices.filter((g) => g.zone === "upper");
  const lower = indices.filter((g) => g.zone === "lower");
  const up = zoneScore(upper), low = zoneScore(lower);
  const zones = [up, low].filter((z) => z.index > 0);
  const global = zones.length ? { index: zones.reduce((s, z) => s + z.index, 0) / zones.length, gain: zones.reduce((s, z) => s + z.gain, 0) / zones.length, percentile: zones.reduce((s, z) => s + z.percentile, 0) / zones.length } : { index: 0, gain: 0, percentile: 0 };
  const rank = rankFromPercentile(global.percentile);
  const balance = up.index && low.index ? up.index / low.index : 0;
  return (
    <div className="space-y-4">
      <section className="panel grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <RankEmblem rank={rank} size={84} />
        <div><p className="text-[10px] font-semibold uppercase text-primary">Score de force global</p><p className="font-display text-3xl font-semibold">{global.index.toFixed(0)} <span className="text-sm text-muted-foreground">/ 100 = médiane</span></p><p className="text-xs text-muted-foreground">{rank.label} · {global.gain >= 0 ? "+" : ""}{global.gain.toFixed(1)} % depuis la première séance · ratio haut/bas {balance.toFixed(2)}</p></div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Activity className="size-4 text-primary" /> Données réelles</div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <ZoneSection title="Haut du corps (Upper)" items={upper} />
        <ZoneSection title="Bas du corps (Lower)" items={lower} />
      </div>
      <section className="panel p-5 text-xs leading-6 text-muted-foreground">
        <h2 className="section-title mb-2 flex items-center gap-2 text-foreground"><Dumbbell className="size-4 text-primary" /> Méthode de calcul</h2>
        <p><span className="text-foreground">1RM estimé</span> : moyenne d'Epley, 1RM = w × (1 + r/30), et de Brzycki, 1RM = w × 36 / (37 − r), jusqu'à 10 reps ; Epley seule au-delà. Pour les exercices au poids du corps, le poids corporel s'ajoute au lest.</p>
        <p><span className="text-foreground">Indice de groupe</span> : 1RM estimé de ta dernière séance ÷ 1RM médian de la population pour ce même exercice × 100 (100 = pratiquant médian). La barre pâle montre ton point de départ ; le trait vertical marque la médiane.</p>
        <p><span className="text-foreground">Rang</span> : percentile relatif ajusté au poids (DOTS), à la taille, à l'âge et au sexe. Le score global correspond à la moyenne des zones haut et bas.</p>
      </section>
    </div>
  );
}
