import { rankLadder, type Rank } from "@/lib/strength-standards";

export type Domain = "etudes" | "business" | "sante" | "creativite";

export const domains: Record<Domain, { label: string; nodes: { label: string; xp: number }[] }> = {
  etudes: { label: "Études", nodes: [{ label: "Méthode", xp: 0 }, { label: "Mémorisation", xp: 150 }, { label: "Analyse", xp: 400 }, { label: "Recherche", xp: 800 }, { label: "Expertise", xp: 1500 }] },
  business: { label: "Business", nodes: [{ label: "Organisation", xp: 0 }, { label: "Communication", xp: 150 }, { label: "Négociation", xp: 400 }, { label: "Leadership", xp: 800 }, { label: "Stratégie", xp: 1500 }] },
  sante: { label: "Santé", nodes: [{ label: "Routine", xp: 0 }, { label: "Sommeil", xp: 150 }, { label: "Nutrition", xp: 400 }, { label: "Force", xp: 800 }, { label: "Performance", xp: 1500 }] },
  creativite: { label: "Créativité", nodes: [{ label: "Curiosité", xp: 0 }, { label: "Écriture", xp: 150 }, { label: "Design", xp: 400 }, { label: "Création", xp: 800 }, { label: "Signature", xp: 1500 }] },
};

export type SkillXp = Record<Domain, number>;
export const emptySkillXp: SkillXp = { etudes: 0, business: 0, sante: 0, creativite: 0 };

export type SubGoal = { id: number; label: string; target: number; current: number; unit: string };
export type Goal = { id: number; title: string; domain: Domain; deadline: string; why: string; subs: SubGoal[]; done: boolean };

export type DeepWorkSession = { id: number; date: string; minutes: number; domain: Domain; label: string };

/** Productivity rank from total XP: 19 tiers, steps grow progressively. */
export function xpRank(xp: number): { rank: Rank; floor: number; next: number | null } {
  const floors = rankLadder.map((_, i) => Math.round(250 * i * (1 + i * 0.35)));
  let idx = 0;
  floors.forEach((f, i) => { if (xp >= f) idx = i; });
  return { rank: rankLadder[idx]!, floor: floors[idx]!, next: floors[idx + 1] ?? null };
}

export const levelOf = (xp: number) => Math.floor(xp / 1000) + 1;
