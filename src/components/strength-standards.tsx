import { useEffect, useMemo, useState } from "react";
import { useCloudState } from "@/lib/cloud-state";
import { Dumbbell, Flame, Globe2, Info, Plus, Scale, Search, Trophy, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RankEmblem, RankUpCelebration } from "@/components/rank-emblem";
import { RotaryPicker, RotaryToggle } from "@/components/rotary-picker";
import {
  exerciseCount,
  exerciseGroups,
  exercises,
  findExercise,
  loadForPercentile,
  nextTier,
  rankLadder,
  scorePerformance,
  estimateFromSets,
  searchExercises,
  tierFloor,
  type Exercise,
  type Profile,
  type Rank,
  type Sex,
} from "@/lib/strength-standards";

export type Performance = { id: number; exerciseId: string; load: number; date: string; isoDate?: string; reps?: number; sets?: number };

const perfLoad = (p: Performance) => estimateFromSets(p.load, p.reps ?? 1, p.sets ?? 1);

const toneClasses: Record<string, { text: string; bg: string; border: string; fill: string }> = {
  "rank-bronze": { text: "text-rank-bronze", bg: "bg-rank-bronze/10", border: "border-rank-bronze/30", fill: "bg-rank-bronze" },
  "rank-silver": { text: "text-rank-silver", bg: "bg-rank-silver/10", border: "border-rank-silver/30", fill: "bg-rank-silver" },
  "rank-gold": { text: "text-rank-gold", bg: "bg-rank-gold/10", border: "border-rank-gold/30", fill: "bg-rank-gold" },
  "rank-platinum": { text: "text-rank-platinum", bg: "bg-rank-platinum/10", border: "border-rank-platinum/30", fill: "bg-rank-platinum" },
  "rank-diamond": { text: "text-rank-diamond", bg: "bg-rank-diamond/10", border: "border-rank-diamond/30", fill: "bg-rank-diamond" },
  "rank-elite": { text: "text-rank-elite", bg: "bg-rank-elite/10", border: "border-rank-elite/30", fill: "bg-rank-elite" },
  "rank-olympian": { text: "text-rank-olympian", bg: "bg-rank-olympian/12", border: "border-rank-olympian/40", fill: "bg-rank-olympian" },
};

const tone = (rank: Rank) => toneClasses[rank.tone] ?? toneClasses["rank-silver"]!;

function RankBadge({ rank, size = "md", emblem = false }: { rank: Rank; size?: "sm" | "md" | "lg"; emblem?: boolean }) {
  const t = tone(rank);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-semibold",
        t.bg,
        t.border,
        t.text,
        rank.name === "Olympian" && "shadow-glow-sm",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
      )}
    >
      {emblem ? (
        <RankEmblem rank={rank} size={size === "lg" ? 26 : size === "md" ? 20 : 16} animated={false} />
      ) : (
        rank.name === "Olympian" && <Trophy className={size === "lg" ? "size-4" : "size-3"} />
      )}
      {rank.label}
    </span>
  );
}

function RankMeter({ rank, percentile }: { rank: Rank; percentile: number }) {
  const t = tone(rank);
  return (
    <div className="mt-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width] duration-700", t.fill)} style={{ width: `${Math.max(percentile, 2)}%` }} />
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Plus fort que {percentile.toFixed(1)} % de la population</p>
    </div>
  );
}

export function StrengthStandards({ onEarnXp, onOpenNutrition, embedded = false, trackingStartDate = "1970-01-01" }: { onEarnXp?: ((points: number) => void) | undefined; onOpenNutrition?: (() => void) | undefined; embedded?: boolean; trackingStartDate?: string }) {
  const [profile, setProfile] = useCloudState<Profile>("strength-profile", { sex: "male", bodyweight: 82, height: 180, age: 29 });
  const [performances, setPerformances] = useCloudState<Performance[]>("strength-performances", []);
  const [exerciseId, setExerciseId] = useCloudState<string>("strength-exercise", exercises[0]!.id);
  const [load, setLoad] = useCloudState<number>("strength-load", 80);
  const [reps, setReps] = useCloudState<number>("strength-reps", 8);
  const [sets, setSets] = useCloudState<number>("strength-sets", 3);
  const [celebration, setCelebration] = useState<{
    rank: Rank;
    exercise: string;
    performance: string;
    estimate: string;
  } | null>(null);
  useEffect(() => {
    const retiredExercises = new Set(["squat-squat-barre-haute", "bench-developpe-couche-barre", "deadlift-souleve-de-terre-conventionnel", "pullup-tractions-lestees-pronation"]);
    const sample = performances.length === 4 && performances.every((entry) => entry.id >= 1 && entry.id <= 4 && retiredExercises.has(entry.exerciseId) && !entry.isoDate);
    if (sample) setPerformances([]);
  }, [performances, setPerformances]);
  const estimated = estimateFromSets(load, reps, sets);
  const [group, setGroup] = useState<string>(exerciseGroups[0]!);
  const [query, setQuery] = useState("");

  const exercise = findExercise(exerciseId) ?? exercises[0]!;
  const catalogue = useMemo(() => searchExercises(query, query ? undefined : group), [query, group]);

  const scored = useMemo(
    () =>
       performances.filter((entry) => !entry.isoDate || entry.isoDate >= trackingStartDate)
        .map((entry) => {
          const item = findExercise(entry.exerciseId);
          if (!item) return null;
          return { entry, exercise: item, score: scorePerformance(item, perfLoad(entry), profile) };
        })
        .filter((item): item is { entry: Performance; exercise: Exercise; score: ReturnType<typeof scorePerformance> } => item !== null),
    [performances, profile, trackingStartDate],
  );

  const best = useMemo(() => {
    if (!scored.length) return null;
    return scored.reduce((top, item) => (item.score.relative.percentile > top.score.relative.percentile ? item : top));
  }, [scored]);

  const averageRelative = scored.length
    ? scored.reduce((sum, item) => sum + item.score.relative.percentile, 0) / scored.length
    : 0;

  const preview = load > 0 || exercise.bodyweightLoaded ? scorePerformance(exercise, estimated, profile) : null;

  const logPerformance = () => {
    if (!Number.isFinite(load) || load < 0) return;
    const now = new Date();
    const result = scorePerformance(exercise, estimated, profile);
    setPerformances((items) => [{ id: Date.now(), exerciseId: exercise.id, load, reps, sets, date: now.toLocaleDateString("fr-FR"), isoDate: now.toISOString().slice(0, 10) }, ...items]);
    setCelebration({
      rank: result.relative.rank,
      exercise: exercise.name,
      performance: `${sets} × ${reps} à ${load.toFixed(1)} kg`,
      estimate: `1RM estimé ${estimated.toFixed(1)} kg`,
    });
    onEarnXp?.(40);
  };

  return (
    <div className="animate-enter">
      {celebration && (
        <RankUpCelebration
          rank={celebration.rank}
          exercise={celebration.exercise}
          performance={celebration.performance}
          estimate={celebration.estimate}
          onDone={() => setCelebration(null)}
        />
      )}

       {!embedded && (
         <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
           <div>
             <p className="mb-1.5 text-[10px] font-semibold uppercase text-primary">Standards de force</p>
             <h1 className="font-display text-2xl font-semibold sm:text-[28px]">Ton niveau réel</h1>
             <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
               Chaque performance reçoit deux rangs : la force brute face à la population, et un rang relatif ajusté à ton poids, ta taille, ton âge et ton sexe. {exerciseCount} exercices et variantes disponibles.
             </p>
           </div>
           {onOpenNutrition && (
             <Button variant="outline" onClick={onOpenNutrition}><Flame /> Suivi calorique</Button>
           )}
         </div>
       )}
       {embedded && onOpenNutrition && <div className="mb-4 flex justify-end"><Button variant="outline" onClick={onOpenNutrition}><Flame /> Suivi calorique</Button></div>}


      <section className="panel mb-4 p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Données corporelles</h2>
            <p className="section-subtitle">Fais tourner les molettes, le rang relatif se recalcule aussitôt.</p>
          </div>
          <User className="size-5 text-primary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <RotaryToggle<Sex>
            label="Sexe"
            value={profile.sex}
            onChange={(sex) => setProfile((state) => ({ ...state, sex }))}
            options={[
              { value: "male", label: "Homme" },
              { value: "female", label: "Femme" },
            ]}
          />
          <RotaryPicker
            label="Poids de corps"
            unit="kg"
            min={35}
            max={220}
            step={0.5}
            value={profile.bodyweight}
            onChange={(bodyweight) => setProfile((state) => ({ ...state, bodyweight }))}
            format={(v) => v.toFixed(1)}
          />
          <RotaryPicker
            label="Taille"
            unit="cm"
            min={140}
            max={215}
            value={profile.height}
            onChange={(height) => setProfile((state) => ({ ...state, height }))}
          />
          <RotaryPicker
            label="Âge"
            unit="ans"
            min={12}
            max={90}
            value={profile.age}
            onChange={(age) => setProfile((state) => ({ ...state, age }))}
          />
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <section className="panel min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Catalogue & performance</h2>
              <p className="section-subtitle">Prises, angles et machines pour chaque muscle.</p>
            </div>
            <Dumbbell className="size-5 text-primary" />
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un exercice, une prise, un angle…"
              className="pl-9"
              aria-label="Rechercher un exercice"
            />
          </div>

          {!query && (
            <div className="mobile-scroll-x -mx-1 px-1"><div className="flex min-w-max gap-1.5">
              {exerciseGroups.map((item) => (
                <button
                  key={item}
                  onClick={() => setGroup(item)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                    group === item
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {item}
                </button>
              ))}
            </div></div>
          )}

          <div className="mt-3 grid max-h-[280px] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {catalogue.map((item) => (
              <button
                key={item.id}
                onClick={() => setExerciseId(item.id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-xs transition-all duration-200",
                  item.id === exerciseId
                    ? "border-primary/30 bg-primary/10 text-foreground shadow-glow-sm"
                    : "border-border text-muted-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="block truncate font-medium">{item.name}</span>
                <span className="mt-0.5 block truncate text-[10px]">
                  {item.variant}
                  {item.bodyweightLoaded ? " · poids du corps inclus" : ""}
                </span>
              </button>
            ))}
            {!catalogue.length && <p className="text-xs text-muted-foreground">Aucun exercice trouvé.</p>}
          </div>

          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <RotaryPicker
              label={exercise.bodyweightLoaded ? `Lest — ${exercise.name}` : `Charge de travail — ${exercise.name}`}
              unit="kg"
              min={0}
              max={400}
              step={0.5}
              value={load}
              onChange={setLoad}
              format={(v) => v.toFixed(1)}
              className="min-w-0"
            />
            <Button onClick={logPerformance} className="order-last mx-auto h-11 w-full max-w-xs justify-center sm:order-none sm:mx-0 sm:h-10 sm:w-auto">
              <Plus /> Enregistrer
            </Button>
          </div>
          <div className="mobile-stack mt-3 grid grid-cols-2 gap-3">
            <RotaryPicker label="Séries" unit="" min={1} max={10} step={1} value={sets} onChange={setSets} />
            <RotaryPicker label="Répétitions" unit="reps" min={1} max={30} step={1} value={reps} onChange={setReps} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {sets} × {reps} à {load.toFixed(1)} kg → 1RM estimé <span className="font-mono text-foreground">{estimated.toFixed(1)} kg</span> (Epley/Brzycki, correction multi-séries).
          </p>

          {preview && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ScoreCard
                title="Rang global"
                subtitle="Force brute, tous pratiquants"
                icon={Globe2}
                rank={preview.global.rank}
                percentile={preview.global.percentile}
                detail={`${preview.totalLoad.toFixed(1)} kg de charge totale`}
              />
              <ScoreCard
                title="Rang relatif"
                subtitle="Ajusté poids, taille, âge, sexe"
                icon={Scale}
                rank={preview.relative.rank}
                percentile={preview.relative.percentile}
                detail={`Ajustement ×${preview.relative.multiplier.toFixed(2)}`}
              />
            </div>
          )}

          <div className="mt-4 rounded-md border border-border bg-surface/60 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <Info className="size-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold">Barèmes {exercise.name} ({exercise.variant})</h3>
            </div>
            <div className="grid gap-1.5">
              {rankLadder
                .filter((rank) => rank.division === 1 || rank.division === null)
                .map((rank) => {
                  const percentile = tierFloor(rank.index);
                  const globalLoad = loadForPercentile(exercise, percentile, profile, false);
                  const relativeLoad = loadForPercentile(exercise, percentile, profile, true);
                  return (
                    <div key={rank.label} className="grid grid-cols-[minmax(0,1fr)_56px_56px] items-center gap-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-3">
                      <RankBadge rank={rank} size="sm" emblem />
                      <span className="text-right font-mono text-[11px] text-muted-foreground sm:w-20">{Math.max(globalLoad, 0).toFixed(0)} kg</span>
                      <span className="text-right font-mono text-[11px] text-foreground sm:w-20">{Math.max(relativeLoad, 0).toFixed(0)} kg</span>
                    </div>
                  );
                })}
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_56px_56px] gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-3">
              <span>Entrée de palier</span>
              <span className="text-right sm:w-20">Global</span>
              <span className="text-right sm:w-20">Relatif</span>
            </div>
          </div>
        </section>

        <div className="min-w-0 space-y-4">
          <section className="panel p-5">
            <h2 className="section-title">Niveau général</h2>
            <p className="section-subtitle">Sur {scored.length} performances enregistrées.</p>
            {best ? (
              <>
                <div className="mt-5 flex items-center gap-4">
                  <RankEmblem rank={best.score.relative.rank} size={72} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">Meilleur rang relatif</p>
                    <p className={cn("font-display text-lg font-semibold", tone(best.score.relative.rank).text)}>
                      {best.score.relative.rank.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{best.exercise.name}</p>
                  </div>
                </div>
                <RankMeter rank={best.score.relative.rank} percentile={best.score.relative.percentile} />
                <div className="mt-5 border-t border-border pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Percentile relatif moyen</span>
                    <span className="font-display text-lg font-semibold">{averageRelative.toFixed(1)} %</span>
                  </div>
                  {nextTier(best.score.relative.rank) && (
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                      Palier suivant : <span className="text-foreground">{nextTier(best.score.relative.rank)!.rank.label}</span> au{" "}
                      {nextTier(best.score.relative.rank)!.percentile.toFixed(1)}ᵉ percentile.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-5 text-xs text-muted-foreground">Enregistre une performance pour voir ton niveau.</p>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="section-title">Échelle des rangs</h2>
            <p className="section-subtitle">De Bronze à Olympien, trois divisions par palier.</p>
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {rankLadder.map((rank) => (
                <div key={rank.label} className="flex flex-col items-center gap-1">
                  <RankEmblem rank={rank} size={44} animated={rank.index >= 15} />
                  <span className={cn("text-center text-[9px] font-semibold", tone(rank).text)}>{rank.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="panel mt-4 overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="section-title">Performances enregistrées</h2>
          <p className="section-subtitle">Les deux classements suivent ton profil.</p>
        </div>
        <div className="divide-y divide-border">
          {scored.map(({ entry, exercise: item, score }) => (
            <div key={entry.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-3 transition-colors hover:bg-accent/40 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:gap-4 sm:px-5 sm:py-4">
              <RankEmblem rank={score.relative.rank} size={34} animated={false} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground sm:truncate">
                  {item.variant} · {entry.reps ? `${entry.sets ?? 1}×${entry.reps} @ ` : ""}{entry.load} kg{item.bodyweightLoaded ? ` de lest · ${score.totalLoad.toFixed(0)} kg total` : ""} · {entry.date}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="mb-1 text-[9px] font-semibold uppercase text-muted-foreground">Global</p>
                <RankBadge rank={score.global.rank} size="sm" />
              </div>
              <div className="text-right">
                <p className="mb-1 text-[9px] font-semibold uppercase text-muted-foreground">Relatif</p>
                <RankBadge rank={score.relative.rank} size="sm" />
              </div>
              <button
                type="button"
                onClick={() => setPerformances((items) => items.filter((option) => option.id !== entry.id))}
                className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive sm:size-9"
                aria-label={`Retirer ${item.name}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {!scored.length && <p className="p-5 text-xs text-muted-foreground">Aucune performance enregistrée.</p>}
        </div>
      </section>
    </div>
  );
}

function ScoreCard({
  title,
  subtitle,
  icon: Icon,
  rank,
  percentile,
  detail,
}: {
  title: string;
  subtitle: string;
  icon: typeof Globe2;
  rank: Rank;
  percentile: number;
  detail: string;
}) {
  return (
    <div className={cn("rounded-md border p-4", tone(rank).border, tone(rank).bg)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <Icon className={cn("size-4", tone(rank).text)} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <RankEmblem rank={rank} size={56} />
        <div>
          <p className={cn("font-display text-lg font-semibold", tone(rank).text)}>{rank.label}</p>
          <p className="text-[10px] text-muted-foreground">{detail}</p>
        </div>
      </div>
      <RankMeter rank={rank} percentile={percentile} />
    </div>
  );
}
