// Population-based strength standards.
// Two independent scores are produced for every logged performance:
//  1. Global   -> raw load compared with the whole adult population (pure strength)
//  2. Relative -> load adjusted for bodyweight, height, age and sex

export type Sex = "male" | "female";

export type Exercise = {
  id: string;
  name: string;
  /** Muscle group shown in the catalogue filters */
  group: string;
  /** Grip / angle / implement detail */
  variant: string;
  /** Bodyweight is part of the load (pull-ups, dips, push-ups...) */
  bodyweightLoaded?: boolean;
  /** Median 1RM in kg for the trained adult population, per sex */
  median: { male: number; female: number };
  /** Spread of the log-normal population distribution */
  logSd: { male: number; female: number };
  /**
   * How much taller lifters are penalised by leverage / range of motion.
   * 1 = strongly penalised (overhead, squats), 0 = neutral, negative = taller helps.
   */
  heightBias: number;
};

type Family = {
  slug: string;
  group: string;
  base: { male: number; female: number };
  logSd: { male: number; female: number };
  heightBias: number;
  bodyweightLoaded?: boolean;
  /** [name, grip / angle detail, load factor vs the family base] */
  variants: [string, string, number][];
};

const families: Family[] = [
  {
    slug: "bench",
    group: "Pectoraux",
    base: { male: 80, female: 42 },
    logSd: { male: 0.34, female: 0.38 },
    heightBias: 0.8,
    variants: [
      ["Développé couché barre", "Prise standard", 1],
      ["Développé couché prise large", "Prise large", 0.96],
      ["Développé couché prise serrée", "Prise serrée", 0.87],
      ["Développé incliné barre", "Banc 30°", 0.82],
      ["Développé incliné haut", "Banc 45°", 0.74],
      ["Développé décliné barre", "Banc -20°", 1.06],
      ["Développé couché haltères", "Haltères, plat", 0.84],
      ["Développé incliné haltères", "Haltères, 30°", 0.72],
      ["Développé couché Smith machine", "Barre guidée", 0.92],
      ["Développé machine convergente", "Machine, prise neutre", 0.95],
      ["Écarté haltères", "Bras tendus, plat", 0.4],
      ["Écarté incliné haltères", "Bras tendus, 30°", 0.35],
      ["Pec-deck", "Machine, coudes fléchis", 0.5],
      ["Écarté poulie haute", "Poulies, angle descendant", 0.42],
      ["Écarté poulie basse", "Poulies, angle montant", 0.38],
      ["Pull-over haltère", "Bras au-dessus de la tête", 0.42],
    ],
  },
  {
    slug: "pushup",
    group: "Pectoraux",
    base: { male: 78, female: 52 },
    logSd: { male: 0.26, female: 0.28 },
    heightBias: 0.6,
    bodyweightLoaded: true,
    variants: [
      ["Pompes lestées", "Prise standard", 1],
      ["Pompes prise large lestées", "Prise large", 0.96],
      ["Pompes diamant lestées", "Mains serrées", 0.9],
      ["Pompes déclinées lestées", "Pieds surélevés", 0.94],
      ["Pompes archer", "Prise asymétrique", 0.78],
    ],
  },
  {
    slug: "dip",
    group: "Pectoraux",
    base: { male: 92, female: 58 },
    logSd: { male: 0.3, female: 0.33 },
    heightBias: 0.8,
    bodyweightLoaded: true,
    variants: [
      ["Dips lestés poitrine", "Buste penché, prise large", 1],
      ["Dips lestés triceps", "Buste droit, prise serrée", 0.97],
      ["Dips anneaux lestés", "Anneaux, prise neutre", 0.86],
    ],
  },
  {
    slug: "pullup",
    group: "Dos",
    base: { male: 88, female: 56 },
    logSd: { male: 0.3, female: 0.33 },
    heightBias: 0.6,
    bodyweightLoaded: true,
    variants: [
      ["Tractions lestées pronation", "Prise pronation, largeur épaules", 1],
      ["Tractions lestées prise large", "Prise pronation large", 0.95],
      ["Tractions lestées supination", "Prise supination", 1.04],
      ["Tractions lestées prise neutre", "Poignées parallèles", 1.02],
      ["Tractions lestées commando", "Prise croisée", 0.9],
      ["Tractions anneaux lestées", "Anneaux, rotation libre", 0.92],
      ["Tractions à la serviette", "Prise serviette", 0.84],
    ],
  },
  {
    slug: "pulldown",
    group: "Dos",
    base: { male: 70, female: 42 },
    logSd: { male: 0.32, female: 0.35 },
    heightBias: 0.4,
    variants: [
      ["Tirage vertical prise large", "Barre large, pronation", 1],
      ["Tirage vertical prise serrée", "Barre serrée, supination", 0.95],
      ["Tirage vertical prise neutre", "Poignée V", 0.98],
      ["Tirage vertical unilatéral", "Poignée simple, par bras", 0.48],
      ["Tirage nuque", "Barre derrière la nuque", 0.82],
      ["Pull-over poulie haute", "Bras tendus", 0.5],
      ["Straight-arm pulldown corde", "Corde, bras tendus", 0.44],
    ],
  },
  {
    slug: "row",
    group: "Dos",
    base: { male: 78, female: 45 },
    logSd: { male: 0.34, female: 0.37 },
    heightBias: 0.5,
    variants: [
      ["Rowing barre pronation", "Buste 45°, pronation", 1],
      ["Rowing barre supination (Yates)", "Buste 60°, supination", 1.08],
      ["Rowing Pendlay", "Départ au sol, buste horizontal", 0.94],
      ["Rowing T-bar", "Barre en T, prise neutre", 1.05],
      ["Rowing haltère unilatéral", "Un bras, appui banc", 0.48],
      ["Rowing machine assis", "Machine, prise neutre", 1.02],
      ["Tirage horizontal poulie", "Poignée V", 0.95],
      ["Tirage horizontal prise large", "Barre large, coudes hauts", 0.88],
      ["Rowing inversé lesté", "Barre basse, corps tendu", 0.7],
      ["Rowing Seal", "Banc allongé, strict", 0.72],
      ["Rowing Meadows", "Barre landmine, un bras", 0.5],
      ["Shrug barre", "Trapèzes, prise pronation", 1.6],
      ["Shrug haltères", "Trapèzes, prise neutre", 0.8],
      ["Face pull corde", "Corde, coudes hauts", 0.42],
    ],
  },
  {
    slug: "deadlift",
    group: "Chaîne postérieure",
    base: { male: 130, female: 78 },
    logSd: { male: 0.35, female: 0.37 },
    heightBias: 0.35,
    variants: [
      ["Soulevé de terre conventionnel", "Prise pronation, pieds serrés", 1],
      ["Soulevé de terre sumo", "Pieds très larges", 1.02],
      ["Soulevé de terre déficit", "Départ surélevé de 5 cm", 0.9],
      ["Rack pull genoux", "Départ au-dessus du genou", 1.18],
      ["Soulevé de terre trap bar", "Barre hexagonale, prise neutre", 1.08],
      ["Soulevé de terre roumain", "Jambes semi-tendues", 0.77],
      ["Soulevé de terre jambes tendues", "Amplitude maximale", 0.68],
      ["Soulevé de terre unilatéral", "Une jambe, par côté", 0.3],
      ["Good morning", "Barre haute, dos à plat", 0.5],
      ["Hip thrust barre", "Bassin, appui banc", 1.04],
      ["Hip thrust unilatéral", "Une jambe", 0.42],
      ["Pont fessier machine", "Machine dédiée", 1.1],
      ["Leg curl allongé", "Machine, pieds en pointe", 0.42],
      ["Leg curl assis", "Machine, hanche fléchie", 0.4],
      ["Leg curl nordique lesté", "Excentrique genoux", 0.2],
      ["Extension lombaire lestée", "Banc à lombaires", 0.4],
      ["Back extension 45°", "Banc incliné", 0.45],
    ],
  },
  {
    slug: "squat",
    group: "Quadriceps",
    base: { male: 105, female: 62 },
    logSd: { male: 0.36, female: 0.38 },
    heightBias: 0.9,
    variants: [
      ["Squat barre haute", "Barre trapèzes hauts", 1],
      ["Squat barre basse", "Barre deltoïdes postérieurs", 1.06],
      ["Squat avant", "Barre en rack avant", 0.79],
      ["Squat gobelet", "Haltère devant la poitrine", 0.42],
      ["Squat pause", "Pause 3 s en bas", 0.88],
      ["Squat talons surélevés", "Cales 2 cm", 0.95],
      ["Squat Zercher", "Barre dans les coudes", 0.68],
      ["Squat Hack machine", "Machine, dos appuyé", 1.35],
      ["Presse à cuisses 45°", "Pieds largeur épaules", 1.8],
      ["Presse à cuisses pieds hauts", "Pieds hauts, fessiers", 1.85],
      ["Presse horizontale", "Machine assise", 1.5],
      ["Fentes marchées", "Barre sur le dos", 0.55],
      ["Fentes inversées", "Pas arrière", 0.58],
      ["Fente bulgare", "Pied arrière surélevé", 0.52],
      ["Split squat haltères", "Statique, haltères", 0.5],
      ["Step-up lesté", "Banc à hauteur genou", 0.45],
      ["Sissy squat lesté", "Genoux avancés", 0.3],
      ["Leg extension", "Machine, pieds neutres", 0.55],
      ["Leg extension unilatéral", "Une jambe", 0.28],
      ["Belt squat", "Charge à la ceinture", 1.25],
    ],
  },
  {
    slug: "press",
    group: "Épaules",
    base: { male: 52, female: 28 },
    logSd: { male: 0.33, female: 0.36 },
    heightBias: 1,
    variants: [
      ["Développé militaire debout", "Barre, prise pronation", 1],
      ["Développé assis barre", "Dossier vertical", 1.06],
      ["Développé haltères assis", "Haltères, pronation", 0.88],
      ["Développé Arnold", "Rotation supination-pronation", 0.7],
      ["Développé prise neutre haltères", "Paumes face à face", 0.84],
      ["Développé machine épaules", "Machine, trajectoire guidée", 1.1],
      ["Push press", "Impulsion jambes", 1.24],
      ["Développé Z", "Assis au sol, strict", 0.82],
      ["Développé landmine", "Barre inclinée, un bras", 0.42],
      ["Élévations latérales haltères", "Bras tendus, par bras", 0.24],
      ["Élévations latérales poulie", "Poulie basse, par bras", 0.22],
      ["Élévations latérales machine", "Machine, coudes fléchis", 0.5],
      ["Élévations frontales", "Devant, barre ou haltères", 0.3],
      ["Oiseau haltères", "Buste penché, deltoïde postérieur", 0.26],
      ["Reverse pec-deck", "Machine, bras tendus", 0.55],
      ["Upright row", "Tirage menton, prise moyenne", 0.6],
    ],
  },
  {
    slug: "biceps",
    group: "Biceps",
    base: { male: 42, female: 24 },
    logSd: { male: 0.31, female: 0.34 },
    heightBias: 0.3,
    variants: [
      ["Curl barre droite", "Prise supination", 1],
      ["Curl barre EZ", "Prise semi-supination", 0.98],
      ["Curl prise large", "Chef court", 0.94],
      ["Curl prise serrée", "Chef long", 0.92],
      ["Curl haltères alterné", "Par bras", 0.44],
      ["Curl marteau", "Prise neutre, par bras", 0.48],
      ["Curl incliné haltères", "Banc 45°, étirement", 0.38],
      ["Curl pupitre", "Banc Larry Scott", 0.8],
      ["Curl concentration", "Coude appuyé, par bras", 0.34],
      ["Curl poulie basse", "Barre droite", 0.9],
      ["Curl poulie haute", "Bras écartés, par bras", 0.3],
      ["Curl Spider", "Buste penché sur banc", 0.72],
      ["Curl Zottman", "Rotation pronation en descente", 0.4],
      ["Curl inverse barre", "Prise pronation", 0.62],
      ["Curl machine", "Machine, trajectoire fixe", 0.85],
    ],
  },
  {
    slug: "triceps",
    group: "Triceps",
    base: { male: 38, female: 20 },
    logSd: { male: 0.32, female: 0.35 },
    heightBias: 0.3,
    variants: [
      ["Barre au front", "Barre EZ, coudes serrés", 1],
      ["Extension nuque barre", "Chef long, bras verticaux", 0.85],
      ["Extension nuque haltère", "Un haltère, deux mains", 0.7],
      ["Extension poulie corde", "Corde, écartement final", 0.82],
      ["Extension poulie barre droite", "Prise pronation", 0.95],
      ["Extension poulie prise inversée", "Prise supination", 0.6],
      ["Extension poulie haute overhead", "Corde au-dessus de la tête", 0.65],
      ["Kickback haltère", "Buste penché, par bras", 0.24],
      ["Kickback poulie", "Poulie basse, par bras", 0.26],
      ["JM press", "Barre, hybride couché", 1.3],
      ["Développé couché prise serrée triceps", "Prise 30 cm", 1.9],
      ["Extension machine triceps", "Machine assise", 1.05],
      ["Pompes prise diamant lestées", "Mains serrées", 1.4],
    ],
  },
  {
    slug: "calves",
    group: "Mollets",
    base: { male: 110, female: 70 },
    logSd: { male: 0.34, female: 0.36 },
    heightBias: 0.2,
    variants: [
      ["Mollets debout machine", "Genoux tendus", 1],
      ["Mollets assis", "Genoux fléchis, soléaire", 0.55],
      ["Mollets à la presse", "Pieds sur plateau", 1.2],
      ["Mollets âne", "Buste penché", 0.9],
      ["Mollets unilatéral haltère", "Une jambe", 0.35],
    ],
  },
  {
    slug: "core",
    group: "Abdos & gainage",
    base: { male: 45, female: 30 },
    logSd: { male: 0.34, female: 0.36 },
    heightBias: 0.2,
    variants: [
      ["Crunch poulie haute", "Corde, dos arrondi", 1],
      ["Crunch machine", "Machine abdos", 1.2],
      ["Relevé de jambes lesté", "Suspendu, jambes tendues", 0.4],
      ["Relevé de genoux lesté", "Suspendu, genoux fléchis", 0.5],
      ["Ab wheel lesté", "Roue abdominale", 0.35],
      ["Planche lestée", "Gainage ventral", 0.6],
      ["Side plank lestée", "Gainage latéral", 0.35],
      ["Pallof press", "Anti-rotation poulie", 0.4],
      ["Rotation russe lestée", "Assis, rotation", 0.3],
      ["Dragon flag lesté", "Corps tendu", 0.25],
      ["Sit-up lesté", "Amplitude complète", 0.7],
    ],
  },
  {
    slug: "forearm",
    group: "Avant-bras & prise",
    base: { male: 55, female: 32 },
    logSd: { male: 0.35, female: 0.37 },
    heightBias: 0.1,
    variants: [
      ["Curl poignets barre", "Prise supination", 1],
      ["Curl poignets inversé", "Prise pronation", 0.5],
      ["Farmer walk", "Charge par main", 1.6],
      ["Suspension barre lestée", "Prise pronation, dead hang", 1.4],
      ["Pinch grip", "Prise pincée, par main", 0.5],
      ["Rotation avant-bras haltère", "Pronation-supination", 0.2],
    ],
  },
  {
    slug: "olympic",
    group: "Haltérophilie",
    base: { male: 78, female: 48 },
    logSd: { male: 0.35, female: 0.37 },
    heightBias: 0.7,
    variants: [
      ["Épaulé-jeté", "Mouvement complet", 1],
      ["Épaulé debout", "Depuis le sol", 0.94],
      ["Épaulé-jeté force", "Power clean & press", 0.86],
      ["Power clean", "Réception haute", 0.92],
      ["Hang clean", "Départ cuisses", 0.85],
      ["Arraché", "Snatch complet", 0.74],
      ["Power snatch", "Réception haute", 0.68],
      ["Hang snatch", "Départ cuisses", 0.64],
      ["Jeté depuis rack", "Split jerk", 1.02],
      ["Push jerk", "Réception pieds parallèles", 0.96],
      ["Tirage épaulé lourd", "Clean pull", 1.15],
      ["Tirage arraché lourd", "Snatch pull", 0.95],
      ["Overhead squat", "Barre bras tendus", 0.55],
      ["Thruster", "Squat + développé", 0.72],
    ],
  },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const exercises: Exercise[] = families.flatMap((family) =>
  family.variants.map(([name, variant, factor]) => ({
    id: `${family.slug}-${slugify(name)}`,
    name,
    variant,
    group: family.group,
    ...(family.bodyweightLoaded ? { bodyweightLoaded: true } : {}),
    median: {
      male: Math.round(family.base.male * factor * 10) / 10,
      female: Math.round(family.base.female * factor * 10) / 10,
    },
    // Calibrated for the whole lifting population (beginners to advanced naturals).
    logSd: { male: Math.round(family.logSd.male * 0.8 * 1000) / 1000, female: Math.round(family.logSd.female * 0.8 * 1000) / 1000 },
    heightBias: family.heightBias,
  })),
);

export const exerciseGroups = Array.from(new Set(exercises.map((item) => item.group)));

export const exerciseCount = exercises.length;

export function findExercise(id: string) {
  return exercises.find((item) => item.id === id);
}

export function searchExercises(query: string, group?: string) {
  const q = slugify(query);
  return exercises.filter((item) => {
    if (group && item.group !== group) return false;
    if (!q) return true;
    return slugify(`${item.name} ${item.variant} ${item.group}`).includes(q);
  });
}

// ---------------------------------------------------------------- ranks

export type RankName = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Elite" | "Olympian";

export type Rank = {
  name: RankName;
  /** 1 to 3, or null for Olympian which has no subdivision */
  division: 1 | 2 | 3 | null;
  label: string;
  /** 0 based index across all 19 tiers */
  index: number;
  tone: string;
};

const rankTones: Record<RankName, string> = {
  Bronze: "rank-bronze",
  Silver: "rank-silver",
  Gold: "rank-gold",
  Platinum: "rank-platinum",
  Diamond: "rank-diamond",
  Elite: "rank-elite",
  Olympian: "rank-olympian",
};

/** Upper percentile bound of each tier, ordered from weakest to strongest. */
const tiers: { name: RankName; division: 1 | 2 | 3 | null; max: number }[] = [
  { name: "Bronze", division: 1, max: 6 },
  { name: "Bronze", division: 2, max: 12 },
  { name: "Bronze", division: 3, max: 19 },
  { name: "Silver", division: 1, max: 27 },
  { name: "Silver", division: 2, max: 35 },
  { name: "Silver", division: 3, max: 43 },
  { name: "Gold", division: 1, max: 51 },
  { name: "Gold", division: 2, max: 59 },
  { name: "Gold", division: 3, max: 66 },
  { name: "Platinum", division: 1, max: 72 },
  { name: "Platinum", division: 2, max: 78 },
  { name: "Platinum", division: 3, max: 83 },
  { name: "Diamond", division: 1, max: 87.5 },
  { name: "Diamond", division: 2, max: 91 },
  { name: "Diamond", division: 3, max: 94 },
  { name: "Elite", division: 1, max: 96 },
  { name: "Elite", division: 2, max: 97.6 },
  { name: "Elite", division: 3, max: 98.8 },
  { name: "Olympian", division: null, max: 100 },
];

export const rankLadder: Rank[] = tiers.map((tier, index) => ({
  name: tier.name,
  division: tier.division,
  label: tier.division ? `${tier.name} ${tier.division}` : tier.name,
  index,
  tone: rankTones[tier.name],
}));

export function rankFromPercentile(percentile: number): Rank {
  const clamped = Math.min(Math.max(percentile, 0), 100);
  const found = tiers.findIndex((tier) => clamped <= tier.max);
  return rankLadder[found === -1 ? rankLadder.length - 1 : found]!;
}

/** Percentile needed to reach the next tier, or null at Olympian. */
export function nextTier(rank: Rank): { rank: Rank; percentile: number } | null {
  const next = rankLadder[rank.index + 1];
  if (!next) return null;
  return { rank: next, percentile: tiers[rank.index]!.max };
}

/** Percentile at which the tier at this index begins. */
export function tierFloor(index: number) {
  if (index <= 0) return 0.5;
  return tiers[index - 1]?.max ?? 0.5;
}

// ------------------------------------------------------- adjustments

const erf = (x: number) => {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-a * a);
  return sign * y;
};

const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

/** DOTS coefficient: normalises a lift against bodyweight. */
export function dotsCoefficient(bodyweight: number, sex: Sex) {
  const w = Math.min(Math.max(bodyweight, 40), 210);
  const c =
    sex === "male"
      ? [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076]
      : [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288];
  const denominator =
    c[0]! * w ** 4 + c[1]! * w ** 3 + c[2]! * w ** 2 + c[3]! * w + c[4]!;
  return 500 / denominator;
}

/** Masters / juniors coefficient, 1 at peak strength years (23-30). */
export function ageCoefficient(age: number) {
  const a = Math.min(Math.max(age, 12), 90);
  if (a < 23) return 1 + (23 - a) * 0.018;
  if (a <= 30) return 1;
  if (a <= 40) return 1 + (a - 30) * 0.0075;
  if (a <= 50) return 1.075 + (a - 40) * 0.011;
  if (a <= 60) return 1.185 + (a - 50) * 0.016;
  if (a <= 70) return 1.345 + (a - 60) * 0.023;
  return 1.575 + (a - 70) * 0.032;
}

/** Leverage coefficient: taller lifters move the bar further. */
export function heightCoefficient(height: number, sex: Sex, heightBias: number) {
  const reference = sex === "male" ? 178 : 165;
  const delta = (Math.min(Math.max(height, 140), 215) - reference) / reference;
  return 1 + delta * heightBias * 0.55;
}

// ------------------------------------------------------------ scoring

export type Profile = { sex: Sex; bodyweight: number; height: number; age: number };

export type Score = {
  /** Total load moved, including bodyweight where relevant */
  totalLoad: number;
  global: { percentile: number; rank: Rank; score: number };
  relative: {
    percentile: number;
    rank: Rank;
    score: number;
    multiplier: number;
    factors: { bodyweight: number; height: number; age: number };
  };
};

export function scorePerformance(exercise: Exercise, load: number, profile: Profile): Score {
  const totalLoad = exercise.bodyweightLoaded ? load + profile.bodyweight : load;
  const median = exercise.median[profile.sex];
  const sd = exercise.logSd[profile.sex];

  // Global: raw load against the population distribution for this exercise.
  const globalZ = Math.log(Math.max(totalLoad, 1) / median) / sd;
  const globalPercentile = normalCdf(globalZ) * 100;

  // Relative: normalise the load for bodyweight, height and age first.
  const bodyweightFactor = dotsCoefficient(profile.bodyweight, profile.sex) / dotsCoefficient(profile.sex === "male" ? 93 : 74, profile.sex);
  const heightFactor = heightCoefficient(profile.height, profile.sex, exercise.heightBias);
  const ageFactor = ageCoefficient(profile.age);
  const multiplier = bodyweightFactor * heightFactor * ageFactor;
  const adjustedLoad = totalLoad * multiplier;
  const relativeZ = Math.log(Math.max(adjustedLoad, 1) / median) / sd;
  const relativePercentile = normalCdf(relativeZ) * 100;

  return {
    totalLoad,
    global: {
      percentile: globalPercentile,
      rank: rankFromPercentile(globalPercentile),
      score: Math.round(globalPercentile * 10),
    },
    relative: {
      percentile: relativePercentile,
      rank: rankFromPercentile(relativePercentile),
      score: Math.round(relativePercentile * 10),
      multiplier,
      factors: { bodyweight: bodyweightFactor, height: heightFactor, age: ageFactor },
    },
  };
}

/** Load required to reach a given percentile, useful for standards tables. */
export function loadForPercentile(exercise: Exercise, percentile: number, profile: Profile, relative: boolean) {
  const median = exercise.median[profile.sex];
  const sd = exercise.logSd[profile.sex];
  // invert the normal CDF with a compact rational approximation
  const p = Math.min(Math.max(percentile / 100, 0.0005), 0.9995);
  const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
  const raw = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  const z = p < 0.5 ? -raw : raw;
  let load = median * Math.exp(z * sd);
  if (relative) {
    const multiplier =
      (dotsCoefficient(profile.bodyweight, profile.sex) / dotsCoefficient(profile.sex === "male" ? 93 : 74, profile.sex)) *
      heightCoefficient(profile.height, profile.sex, exercise.heightBias) *
      ageCoefficient(profile.age);
    load = load / multiplier;
  }
  if (exercise.bodyweightLoaded) load -= profile.bodyweight;
  return load;
}

/**
 * Estimated 1RM from working sets (e.g. 3 x 8 @ 30 kg).
 * Epley + Brzycki average up to 10 reps, Epley beyond. Repeating the same reps
 * over several sets shows reserve on the first set: +1.5 % per extra set (max 3).
 */
export function estimateFromSets(load: number, reps: number, sets = 1) {
  if (load <= 0) return load;
  const r = Math.max(1, Math.min(reps, 30));
  const epley = r === 1 ? load : load * (1 + r / 30);
  const brzycki = load * (36 / (37 - Math.min(r, 36)));
  const base = r <= 10 ? (epley + brzycki) / 2 : epley;
  const bonus = 1 + Math.min(Math.max(sets - 1, 0), 3) * 0.015;
  return Math.round(base * bonus * 10) / 10;
}
