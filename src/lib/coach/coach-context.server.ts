import { findExercise, scorePerformance, type Profile } from "@/lib/strength-standards";
import { estimate1RM, totalLoad, type Session, type Workout } from "@/lib/training";
import { goalMeta, type Goal as NutritionGoal, type NutritionEntry } from "@/lib/nutrition";
import { levelOf, xpRank, domains, type DeepWorkSession, type Goal, type SkillXp } from "@/lib/growth";
import type { CalendarEvent } from "@/lib/calendar";

type Perf = { exerciseId: string; load: number; reps?: number; sets?: number; date: string; isoDate?: string };

const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString("fr-FR");

/** Compact, factual French snapshot of the athlete's saved data, injected into the coach's instructions. */
export function buildAthleteContext(state: Map<string, unknown>): string {
  const get = <T,>(k: string, fb: T) => (state.has(k) ? (state.get(k) as T) : fb);
  const profile = get<Profile | null>("strength-profile", null);
  const out: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  out.push(`Date du jour : ${today}. Date de début du suivi : ${get("tracking-start-date", "non définie")}.`);

  const xp = get<number>("xp", 0);
  out.push(`\n## Progression globale\nXP ${xp} · niveau ${levelOf(xp)} · rang productivité ${xpRank(xp).rank.label}.`);
  const skill = get<SkillXp | null>("skill-xp", null);
  if (skill) out.push(`XP par domaine : ${Object.entries(skill).map(([k, v]) => `${domains[k as keyof typeof domains]?.label ?? k} ${v}`).join(", ")}.`);

  out.push("\n## Corps");
  out.push(profile ? `${profile.sex === "male" ? "Homme" : "Femme"}, ${profile.age} ans, ${profile.height} cm, ${profile.bodyweight} kg.` : "Profil corporel non renseigné.");

  const perfs = get<Perf[]>("strength-performances", []);
  if (perfs.length && profile) {
    out.push("\n## Performances de force enregistrées (plus récentes d'abord)");
    for (const p of perfs.slice(-20).reverse()) {
      const ex = findExercise(p.exerciseId); if (!ex) continue;
      const e1 = estimate1RM(totalLoad(ex, p.load, profile), p.reps ?? 1);
      const s = scorePerformance(ex, e1 || p.load, profile);
      out.push(`- ${p.isoDate ?? p.date} · ${ex.name} (${ex.variant}) : ${p.sets ?? 1}×${p.reps ?? 1} à ${p.load} kg · 1RM estimé ${fmt(e1)} kg · rang global ${s.global.rank.label} (top ${fmt(100 - s.global.percentile, 0)} %) · rang relatif ${s.relative.rank.label}`);
    }
  }

  const workouts = get<Workout[]>("workouts", []);
  if (workouts.length) {
    out.push("\n## Programmes d'entraînement");
    for (const w of workouts) {
      const lines = w.exercises.map((e) => {
        const ex = findExercise(e.exerciseId);
        const extra = (e.extra ?? []).map((g) => ` + ${g.sets}×${g.reps} à ${g.load} kg`).join("");
        return `${ex?.name ?? e.exerciseId} ${e.sets}×${e.reps} à ${e.load} kg${extra}, repos ${e.rest}s`;
      });
      out.push(`- ${w.name} (${w.focus}, ${w.day}) : ${lines.join(" ; ")}`);
    }
  }

  const sessions = get<Session[]>("sessions", []);
  if (sessions.length) {
    out.push("\n## Dernières séances réalisées");
    for (const s of sessions.slice(-12).reverse()) {
      const w = workouts.find((x) => x.id === s.workoutId);
      const logs = s.logs.map((l) => {
        const ex = findExercise(l.exerciseId);
        const e1 = profile ? estimate1RM(totalLoad(ex, l.load, profile), l.reps) : 0;
        return `${ex?.name ?? l.exerciseId} ${l.load} kg × ${l.reps}${e1 ? ` (1RM≈${fmt(e1)})` : ""}`;
      });
      out.push(`- ${s.date ?? s.label} · ${w?.name ?? "séance"} : ${logs.join(", ")}`);
    }
  }

  const nGoal = get<NutritionGoal>("nutrition-goal", "cut");
  const nutrition = get<NutritionEntry[]>("nutrition", []);
  out.push(`\n## Nutrition\nObjectif : ${goalMeta(nGoal).label} (bilan cible ${goalMeta(nGoal).target} kcal/jour).`);
  if (nutrition.length) {
    const last = [...nutrition].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")).slice(-14);
    for (const n of last) out.push(`- ${n.date ?? n.label} : mangé ${n.eaten} kcal, dépensé ${n.burned} kcal, net ${n.eaten - n.burned}, P${n.protein}/G${n.carbs}/L${n.fat} g`);
  } else out.push("Aucune journée nutritionnelle enregistrée.");

  const goals = get<Goal[]>("smart-goals", []);
  if (goals.length) {
    out.push("\n## Objectifs personnels");
    for (const g of goals) out.push(`- ${g.done ? "[terminé] " : ""}${g.title} (${domains[g.domain]?.label ?? g.domain}, échéance ${g.deadline || "—"})${g.why ? ` — motivation : ${g.why}` : ""}${g.subs.length ? ` · jalons : ${g.subs.map((s) => `${s.label} ${s.current}/${s.target}${s.unit ? " " + s.unit : ""}`).join(", ")}` : ""}`);
  }

  const deep = get<DeepWorkSession[]>("deep-work", []);
  if (deep.length) {
    const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const recent = deep.filter((d) => d.date >= since);
    const total = recent.reduce((a, d) => a + d.minutes, 0);
    out.push(`\n## Deep work\n${recent.length} sessions sur 14 jours, ${total} min au total (${deep.reduce((a, d) => a + d.minutes, 0)} min depuis le début).`);
  }

  const events = get<CalendarEvent[]>("calendar-events", []);
  const upcoming = events.filter((e) => e.date >= today && !e.completed).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 10);
  if (upcoming.length) {
    out.push("\n## Agenda à venir");
    for (const e of upcoming) out.push(`- ${e.date} ${e.time} · ${e.title} (${e.duration} min, ${e.type})`);
  }
  return out.join("\n");
}
