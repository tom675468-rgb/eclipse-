export type NutritionEntry = {
  id: number;
  date?: string;
  /** Short day label, e.g. "Lun 08". */
  label: string;
  eaten: number;
  burned: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Goal = "cut" | "maintain" | "bulk";

export const goalOptions: { value: Goal; label: string; target: number; blurb: string }[] = [
  { value: "cut", label: "Sèche", target: -450, blurb: "Déficit régulier pour perdre du gras sans casser la performance." },
  { value: "maintain", label: "Maintien", target: 0, blurb: "Équilibre entrées/sorties pour stabiliser le poids." },
  { value: "bulk", label: "Surplus", target: 350, blurb: "Léger surplus pour construire du muscle proprement." },
];

export const goalMeta = (goal: Goal) => goalOptions.find((option) => option.value === goal)!;

export type NutritionSummary = {
  totalEaten: number;
  totalBurned: number;
  net: number;
  averageNet: number;
  averageEaten: number;
  averageBurned: number;
  /** Estimated body-mass change in kg (7 700 kcal ≈ 1 kg). */
  massChange: number;
  /** How far the average day sits from the goal target, in kcal. */
  deviation: number;
  onTrack: boolean;
  protein: number;
  carbs: number;
  fat: number;
};

export function summarize(entries: NutritionEntry[], goal: Goal): NutritionSummary {
  const count = Math.max(entries.length, 1);
  const totalEaten = entries.reduce((sum, entry) => sum + entry.eaten, 0);
  const totalBurned = entries.reduce((sum, entry) => sum + entry.burned, 0);
  const net = totalEaten - totalBurned;
  const averageNet = net / count;
  const target = goalMeta(goal).target;
  const deviation = averageNet - target;
  return {
    totalEaten,
    totalBurned,
    net,
    averageNet,
    averageEaten: totalEaten / count,
    averageBurned: totalBurned / count,
    massChange: net / 7700,
    deviation,
    onTrack: Math.abs(deviation) <= 200,
    protein: entries.reduce((sum, entry) => sum + entry.protein, 0) / count,
    carbs: entries.reduce((sum, entry) => sum + entry.carbs, 0) / count,
    fat: entries.reduce((sum, entry) => sum + entry.fat, 0) / count,
  };
}

/** Builds a smooth cubic path through the series, scaled into the given box. */
export function seriesPath(
  values: number[],
  { width, height, min, max }: { width: number; height: number; min: number; max: number },
) {
  if (!values.length) return "";
  const span = Math.max(max - min, 1);
  const points = values.map((value, i) => ({
    x: values.length === 1 ? width / 2 : (i / (values.length - 1)) * width,
    y: height - ((value - min) / span) * height,
  }));
  return points
    .map((point, i) => {
      if (i === 0) return `M${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      const previous = points[i - 1]!;
      const cx = (previous.x + point.x) / 2;
      return `C${cx.toFixed(2)} ${previous.y.toFixed(2)} ${cx.toFixed(2)} ${point.y.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

export function seriesPoints(
  values: number[],
  { width, height, min, max }: { width: number; height: number; min: number; max: number },
) {
  const span = Math.max(max - min, 1);
  return values.map((value, i) => ({
    x: values.length === 1 ? width / 2 : (i / (values.length - 1)) * width,
    y: height - ((value - min) / span) * height,
    value,
  }));
}
