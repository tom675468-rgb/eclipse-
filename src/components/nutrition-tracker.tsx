import { useEffect, useMemo, useState } from "react";
import { useCloudState } from "@/lib/cloud-state";
import { CalendarDays, ChevronLeft, ChevronRight, Flame, Plus, Scale, Trash2, TrendingDown, TrendingUp, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RotaryPicker, RotaryToggle } from "@/components/rotary-picker";
import { cn } from "@/lib/utils";
import {
  goalMeta,
  goalOptions,
  seriesPath,
  seriesPoints,
  summarize,
  type Goal,
  type NutritionEntry,
} from "@/lib/nutrition";

const RANGES = [7, 14] as const;

export function NutritionTracker({
  entries,
  onLog,
  onDelete,
  onEarnXp,
  trackingStartDate,
}: {
  entries: NutritionEntry[];
  onLog: (entry: Omit<NutritionEntry, "id" | "label">) => void;
  onDelete?: (id: number) => void;
  onEarnXp?: (points: number) => void;
  trackingStartDate: string;
}) {
  const [goal, setGoal] = useCloudState<Goal>("nutrition-goal", "cut");
  const [range, setRange] = useState<number>(14);
  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today);
  const [eaten, setEaten] = useState(2300);
  const [burned, setBurned] = useState(2750);
  const [protein, setProtein] = useState(175);
  const [carbs, setCarbs] = useState(230);
  const [fat, setFat] = useState(70);

  const dayEntry = useMemo(() => entries.find((entry) => entry.date === day), [entries, day]);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const remove = (id: number) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    onDelete?.(id);
    setConfirmDelete(null);
  };

  useEffect(() => {
    if (!dayEntry) return;
    setEaten(dayEntry.eaten);
    setBurned(dayEntry.burned);
    setProtein(dayEntry.protein);
    setCarbs(dayEntry.carbs);
    setFat(dayEntry.fat);
  }, [dayEntry]);

  const shiftDay = (delta: number) => {
    const d = new Date(`${day}T12:00:00`);
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().slice(0, 10);
    if (next > today) return;
    setDay(next);
  };

  const dayLabel = new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });


  const window = useMemo(() => entries.filter((entry) => !entry.date || entry.date >= trackingStartDate).slice(-range), [entries, range, trackingStartDate]);
  const summary = useMemo(() => summarize(window, goal), [window, goal]);
  const meta = goalMeta(goal);

  const macroKcal = protein * 4 + carbs * 4 + fat * 9;

  const log = () => {
    onLog({ eaten, burned, protein, carbs, fat, date: day });
    if (!dayEntry) onEarnXp?.(25);
  };

  return (
    <div className="animate-enter">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase text-primary">Énergie</p>
          <h1 className="font-display text-2xl font-semibold sm:text-[28px]">Suivi calorique</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Entrées, sorties et bilan net — que tu sois en sèche, en maintien ou en prise de masse.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface/60 p-2.5">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
            <CalendarDays className="size-3.5 text-primary" /> Journée éditée
          </p>
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <button onClick={() => shiftDay(-1)} aria-label="Jour précédent" className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <ChevronLeft className="size-4" />
            </button>
            <input
              type="date"
              value={day}
              max={today}
              onChange={(event) => { if (event.target.value) setDay(event.target.value); }}
              className="min-w-0 rounded-md border border-border bg-background/70 px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary/50"
              aria-label="Choisir la date"
            />
            <button onClick={() => shiftDay(1)} disabled={day >= today} aria-label="Jour suivant" className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-[10px] capitalize text-muted-foreground">
            {dayLabel} · {dayEntry ? "journée déjà enregistrée" : "aucune saisie"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Calories mangées vs dépensées</h2>
              <p className="section-subtitle">Courbe rouge : apports. Courbe jaune : dépense totale.</p>
            </div>
            <div className="flex rounded-md border border-border p-1">
              {RANGES.map((option) => (
                <button
                  key={option}
                  onClick={() => setRange(option)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs transition-colors",
                    range === option ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option} jours
                </button>
              ))}
            </div>
          </div>

          <CalorieChart entries={window} />

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Total mangé" value={`${Math.round(summary.totalEaten).toLocaleString("fr-FR")} kcal`} tone="danger" />
            <Stat label="Total dépensé" value={`${Math.round(summary.totalBurned).toLocaleString("fr-FR")} kcal`} tone="warning" />
            <Stat
              label="Bilan net"
              value={`${summary.net > 0 ? "+" : ""}${Math.round(summary.net).toLocaleString("fr-FR")} kcal`}
              tone={summary.net < 0 ? "success" : "primary"}
            />
          </div>
        </section>

        <div className="space-y-4">
          <section className="panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="section-title">Objectif</h2>
                <p className="section-subtitle">{meta.blurb}</p>
              </div>
              <Scale className="size-5 text-primary" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {goalOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setGoal(option.value)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs transition-colors",
                    goal === option.value
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-border bg-surface/60 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Bilan moyen / jour</span>
                <span className={cn("font-display text-xl font-semibold", summary.averageNet < 0 ? "text-success" : "text-primary")}>
                  {summary.averageNet > 0 ? "+" : ""}
                  {Math.round(summary.averageNet)} kcal
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700", summary.onTrack ? "bg-success" : "bg-warning")}
                  style={{ width: `${Math.min(100, Math.max(8, 100 - Math.abs(summary.deviation) / 8))}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                Cible {meta.label.toLowerCase()} : {meta.target > 0 ? "+" : ""}{meta.target} kcal / jour.{" "}
                {summary.onTrack ? "Tu es dans la fenêtre." : `Écart de ${Math.round(Math.abs(summary.deviation))} kcal.`}
              </p>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs">
                {summary.massChange < 0 ? <TrendingDown className="size-4 text-success" /> : <TrendingUp className="size-4 text-warning" />}
                <span className="text-muted-foreground">Tendance estimée</span>
                <span className="ml-auto font-mono text-foreground">
                  {summary.massChange > 0 ? "+" : ""}
                  {summary.massChange.toFixed(2)} kg
                </span>
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="section-title">Macros moyennes</h2>
            <p className="section-subtitle">Sur les {window.length} derniers jours.</p>
            <div className="mt-4 space-y-3">
              <MacroBar label="Protéines" grams={summary.protein} kcal={summary.protein * 4} total={summary.averageEaten} tone="bg-primary" />
              <MacroBar label="Glucides" grams={summary.carbs} kcal={summary.carbs * 4} total={summary.averageEaten} tone="bg-warning" />
              <MacroBar label="Lipides" grams={summary.fat} kcal={summary.fat * 9} total={summary.averageEaten} tone="bg-danger" />
            </div>
          </section>
        </div>
      </div>

      <section className="panel mt-4 p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Saisie du {dayLabel}</h2>
            <p className="section-subtitle">{dayEntry ? "Modifie les valeurs de cette journée puis mets à jour." : "Tourne les molettes ou tape la valeur au clavier, puis enregistre pour gagner 25 XP."}</p>
          </div>
          <UtensilsCrossed className="size-5 text-primary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <RotaryPicker label="Calories mangées" unit="kcal" min={800} max={6000} step={1} value={eaten} onChange={setEaten} />
          <RotaryPicker label="Calories dépensées" unit="kcal" min={800} max={6000} step={1} value={burned} onChange={setBurned} />
          <RotaryPicker label="Protéines" unit="g" min={0} max={400} step={1} value={protein} onChange={setProtein} />
          <RotaryPicker label="Glucides" unit="g" min={0} max={700} step={1} value={carbs} onChange={setCarbs} />
          <RotaryPicker label="Lipides" unit="g" min={0} max={250} step={1} value={fat} onChange={setFat} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <NumberField label="Mangées" unit="kcal" min={800} max={6000} value={eaten} onChange={setEaten} />
          <NumberField label="Dépensées" unit="kcal" min={800} max={6000} value={burned} onChange={setBurned} />
          <NumberField label="Protéines" unit="g" min={0} max={400} value={protein} onChange={setProtein} />
          <NumberField label="Glucides" unit="g" min={0} max={700} value={carbs} onChange={setCarbs} />
          <NumberField label="Lipides" unit="g" min={0} max={250} value={fat} onChange={setFat} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={log}><Plus /> {dayEntry ? "Mettre à jour la journée" : "Enregistrer la journée"}</Button>
          {dayEntry && onDelete && (
            <Button variant="outline" onClick={() => remove(dayEntry.id)} className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger">
              <Trash2 /> {confirmDelete === dayEntry.id ? "Confirmer la suppression" : "Supprimer la journée"}
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground">
            Bilan du jour : <span className={cn("font-mono", eaten - burned < 0 ? "text-success" : "text-primary")}>{eaten - burned > 0 ? "+" : ""}{eaten - burned} kcal</span>
            {" · "}macros ≈ {macroKcal} kcal
          </span>
        </div>
      </section>

      <section className="panel mt-4 overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="section-title">Journal</h2>
          <p className="section-subtitle">Les journées les plus récentes en premier.</p>
        </div>
        <div className="divide-y divide-border">
          {[...window].reverse().map((entry) => {
            const net = entry.eaten - entry.burned;
            return (
              <div
                key={entry.id}
                className={cn(
                  "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/40 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-4 sm:px-5",
                  entry.date === day && "bg-primary/5",
                )}
              >
                <button type="button" onClick={() => entry.date && setDay(entry.date)} className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary" aria-label={`Éditer ${entry.label}`}>
                  <Flame className="size-4" />
                </button>
                <button type="button" onClick={() => entry.date && setDay(entry.date)} className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium">{entry.label}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {entry.eaten} kcal in · {entry.burned} kcal out · {entry.protein}P / {entry.carbs}G / {entry.fat}L
                  </p>
                </button>
                <span className={cn("col-start-2 font-mono text-xs sm:col-start-auto", net < 0 ? "text-success" : "text-warning")}>{net > 0 ? "+" : ""}{net}</span>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    aria-label={confirmDelete === entry.id ? `Confirmer la suppression de ${entry.label}` : `Supprimer ${entry.label}`}
                    className={cn(
                      "col-start-3 row-span-2 row-start-1 flex size-10 items-center justify-center rounded-md border transition-colors sm:col-start-auto sm:row-span-1 sm:row-start-auto sm:size-8",
                      confirmDelete === entry.id
                        ? "border-danger/50 bg-danger/10 text-danger"
                        : "border-transparent text-muted-foreground hover:border-danger/30 hover:bg-danger/10 hover:text-danger",
                    )}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
          {!window.length && <div className="p-8 text-center"><UtensilsCrossed className="mx-auto size-7 text-primary" /><p className="mt-3 text-sm font-semibold">Journal vierge</p><p className="mt-1 text-xs text-muted-foreground">Enregistre ta première journée pour afficher les courbes et le bilan.</p></div>}
        </div>
      </section>
    </div>
  );
}

function NumberField({
  label,
  unit,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const parsed = Number(draft.replace(",", "."));
    if (Number.isFinite(parsed)) onChange(Math.max(min, Math.min(max, Math.round(parsed))));
    setDraft(null);
  };
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2.5 transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-ring">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") { setDraft(null); event.currentTarget.blur(); }
        }}
        className="ml-auto w-16 min-w-0 bg-transparent text-right font-mono text-sm text-primary outline-none"
        aria-label={`Taper ${label.toLowerCase()}`}
      />
      <span className="shrink-0 text-[10px] text-muted-foreground">{unit}</span>
    </label>
  );
}

function CalorieChart({ entries }: { entries: NutritionEntry[] }) {
  if (!entries.length) return <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border bg-surface/40 text-center"><div><TrendingUp className="mx-auto size-7 text-primary" /><p className="mt-3 text-xs font-semibold">Aucune donnée à tracer</p><p className="mt-1 text-[11px] text-muted-foreground">La courbe apparaîtra après ta première saisie.</p></div></div>;
  const width = 720;
  const height = 210;
  const eaten = entries.map((entry) => entry.eaten);
  const burned = entries.map((entry) => entry.burned);
  const all = [...eaten, ...burned];
  const min = Math.min(...all) - 250;
  const max = Math.max(...all) + 250;
  const box = { width, height, min, max };
  const eatenPoints = seriesPoints(eaten, box);
  const burnedPoints = seriesPoints(burned, box);

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap gap-4 text-[11px]">
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="size-2 rounded-full bg-danger" /> Mangées</span>
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="size-2 rounded-full bg-warning" /> Dépensées</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height + 26}`} className="w-full" role="img" aria-label="Courbes des calories mangées et dépensées">
        <defs>
          <linearGradient id="cal-in-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1="0" x2={width} y1={ratio * height} y2={ratio * height} stroke="var(--color-border)" strokeWidth="1" />
        ))}
        <path d={`${seriesPath(eaten, box)} L${width} ${height} L0 ${height} Z`} fill="url(#cal-in-fill)" />
        <path d={seriesPath(burned, box)} fill="none" stroke="var(--warning)" strokeWidth="2.2" strokeLinecap="round" className="chart-line" />
        <path d={seriesPath(eaten, box)} fill="none" stroke="var(--danger)" strokeWidth="2.2" strokeLinecap="round" className="chart-line" />
        {burnedPoints.map((point, i) => (
          <circle key={`b${i}`} cx={point.x} cy={point.y} r="2.6" fill="var(--warning)" />
        ))}
        {eatenPoints.map((point, i) => (
          <circle key={`e${i}`} cx={point.x} cy={point.y} r="2.6" fill="var(--danger)" />
        ))}
        {entries.map((entry, i) => (
          <text
            key={entry.id}
            x={entries.length === 1 ? width / 2 : (i / (entries.length - 1)) * width}
            y={height + 18}
            textAnchor="middle"
            fontSize="9"
            fill="var(--color-muted-foreground)"
          >
            {entry.label.split(" ")[1]}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "danger" | "warning" | "success" | "primary" }) {
  const toneClass = { danger: "text-danger", warning: "text-warning", success: "text-success", primary: "text-primary" }[tone];
  return (
    <div className="rounded-md border border-border bg-surface/60 p-4">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 font-display text-lg font-semibold", toneClass)}>{value}</p>
    </div>
  );
}

function MacroBar({ label, grams, kcal, total, tone }: { label: string; grams: number; kcal: number; total: number; tone: string }) {
  const share = total > 0 ? Math.min(100, (kcal / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] text-foreground">{Math.round(grams)} g · {share.toFixed(0)} %</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width] duration-700", tone)} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
