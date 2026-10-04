import { findExercise, scorePerformance, type Exercise, type Profile } from "@/lib/strength-standards";

export type ExtraSetGroup = { sets: number; reps: number; load: number; rest?: number };
/** `extra` holds additional set groups at other loads (drop sets / pyramids). */
export type PlannedExercise = { exerciseId: string; sets: number; reps: number; rest: number; load: number; extra?: ExtraSetGroup[] };

/** Free-weight moves loaded per hand (dumbbells, kettlebells) are entered per side; everything else is total load. */
export const isPerSide = (ex: Exercise | undefined) =>
  !!ex && !ex.bodyweightLoaded && /haltère|kettlebell/i.test(`${ex.name} ${ex.variant}`);
export const loadLabel = (ex: Exercise | undefined) => (isPerSide(ex) ? "Poids / côté" : "Poids total");
export type Workout = { id: string; name: string; focus: "upper" | "lower"; day: string; exercises: PlannedExercise[] };
export type SetLog = { exerciseId: string; load: number; reps: number; rest: number };
export type Session = { id: number; workoutId: string; label: string; order: number; date?: string; logs: SetLog[] };

export const upperGroups = ["Pectoraux", "Dos", "Épaules", "Biceps", "Triceps", "Avant-bras & prise"];
export const lowerGroups = ["Quadriceps", "Chaîne postérieure", "Mollets"];
export const bodyZone = (group: string): "upper" | "lower" | "other" =>
  upperGroups.includes(group) ? "upper" : lowerGroups.includes(group) ? "lower" : "other";

/** Epley (1985): 1RM = w × (1 + r/30) */
export const epley = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30));
/** Brzycki (1993): 1RM = w × 36 / (37 − r) */
export const brzycki = (w: number, r: number) => (r <= 1 ? w : w * (36 / (37 - Math.min(r, 36))));
/** Both formulas agree best under 10 reps; beyond that Epley is more stable. */
export function estimate1RM(w: number, r: number) {
  if (w <= 0 || r <= 0) return 0;
  return r <= 10 ? (epley(w, r) + brzycki(w, r)) / 2 : epley(w, r);
}

export const defaultProfile: Profile = { sex: "male", bodyweight: 82, height: 180, age: 29 };

export const totalLoad = (exercise: Exercise | undefined, load: number, profile: Profile) =>
  exercise?.bodyweightLoaded ? load + profile.bodyweight : load;

export type ExercisePoint = { order: number; label: string; load: number; reps: number; rest: number; e1rm: number };

export function exerciseHistory(sessions: Session[], exerciseId: string, profile: Profile): ExercisePoint[] {
  const ex = findExercise(exerciseId);
  return sessions
    .flatMap((s) => s.logs.filter((l) => l.exerciseId === exerciseId).map((l) => ({
      order: s.order, label: s.label, load: l.load, reps: l.reps, rest: l.rest,
      e1rm: estimate1RM(totalLoad(ex, l.load, profile), l.reps),
    })))
    .sort((a, b) => a.order - b.order);
}

export type GroupIndex = { group: string; zone: "upper" | "lower" | "other"; index: number; start: number; gain: number; percentile: number; best: Exercise };

/**
 * Strength index per muscle group: latest estimated 1RM divided by the population median
 * of that exact exercise (100 = median lifter). Gain compares the first and latest sessions.
 */
export function groupIndices(sessions: Session[], profile: Profile): GroupIndex[] {
  const ids = Array.from(new Set(sessions.flatMap((s) => s.logs.map((l) => l.exerciseId))));
  const byGroup = new Map<string, { idx: number[]; start: number[]; pct: number[]; best: Exercise; bestPct: number }>();
  for (const id of ids) {
    const ex = findExercise(id);
    const hist = exerciseHistory(sessions, id, profile);
    if (!ex || !hist.length) continue;
    const median = ex.median[profile.sex];
    const last = hist[hist.length - 1]!.e1rm;
    const first = hist[0]!.e1rm;
    const liftLoad = ex.bodyweightLoaded ? last - profile.bodyweight : last;
    const pct = scorePerformance(ex, Math.max(liftLoad, 0), profile).relative.percentile;
    const g = byGroup.get(ex.group) ?? { idx: [], start: [], pct: [], best: ex, bestPct: -1 };
    g.idx.push((last / median) * 100);
    g.start.push((first / median) * 100);
    g.pct.push(pct);
    if (pct > g.bestPct) { g.best = ex; g.bestPct = pct; }
    byGroup.set(ex.group, g);
  }
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  return Array.from(byGroup.entries()).map(([group, g]) => {
    const index = avg(g.idx);
    const start = avg(g.start);
    return { group, zone: bodyZone(group), index, start, gain: ((index - start) / start) * 100, percentile: avg(g.pct), best: g.best };
  });
}

export function zoneScore(items: GroupIndex[]) {
  if (!items.length) return { index: 0, gain: 0, percentile: 0 };
  const avg = (k: "index" | "gain" | "percentile") => items.reduce((s, v) => s + v[k], 0) / items.length;
  return { index: avg("index"), gain: avg("gain"), percentile: avg("percentile") };
}

export const formatRest = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
