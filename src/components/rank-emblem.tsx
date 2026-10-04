import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { Rank } from "@/lib/strength-standards";
import bronzeImg from "@/assets/ranks/bronze.png";
import silverImg from "@/assets/ranks/silver.png";
import goldImg from "@/assets/ranks/gold.png";
import platinumImg from "@/assets/ranks/platinum.png";
import diamondImg from "@/assets/ranks/diamond.png";
import eliteImg from "@/assets/ranks/elite.png";
import olympianImg from "@/assets/ranks/olympian.png";

type Family = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Elite" | "Olympian";

const emblemImages: Record<Family, string> = {
  Bronze: bronzeImg,
  Silver: silverImg,
  Gold: goldImg,
  Platinum: platinumImg,
  Diamond: diamondImg,
  Elite: eliteImg,
  Olympian: olympianImg,
};

/**
 * Animated graphic emblem. Each tier family has its own silhouette and
 * ornaments, growing more elaborate from Bronze up to Olympian.
 */
export function RankEmblem({
  rank,
  size = 64,
  animated = true,
  className,
}: {
  rank: Rank;
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const family = rank.name as Family;
  const color = `var(--rank-${rank.name.toLowerCase()})`;
  const division = rank.division ?? 3;

  return (
    <div
      className={cn("relative shrink-0", animated && "rank-emblem-animated", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {animated && (
        <span
          className="rank-emblem-halo absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${color} 0%, transparent 68%)`, opacity: 0.38 }}
        />
      )}

      <img
        src={emblemImages[family]}
        alt=""
        width={1024}
        height={1024}
        loading="lazy"
        className={cn("relative h-full w-full object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)]", animated && "rank-emblem-float")}
      />

      {/* division pips */}
      {rank.division && (
        <span className="absolute inset-x-0 -bottom-1 flex justify-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rotate-45 rounded-[1px]"
              style={{ background: color, opacity: i < division ? 1 : 0.18, boxShadow: i < division ? `0 0 6px ${color}` : undefined }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

/** Full-screen performance reveal, dismissible from any pointer press. */
export function RankUpCelebration({
  rank,
  exercise,
  performance,
  estimate,
  onDone,
}: {
  rank: Rank;
  exercise?: string;
  performance?: string;
  estimate?: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 3800);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") onDone();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onDone, rank.name]);

  const color = `var(--rank-${rank.name.toLowerCase()})`;

  return createPortal(
    <div
      className="rank-reveal fixed inset-0 z-[100] flex cursor-pointer select-none items-center justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Performance enregistrée, rang ${rank.label}. Toucher pour fermer.`}
      tabIndex={0}
      onPointerDown={onDone}
    >
      <div className="rank-up-backdrop absolute inset-0" />
      <div className="rank-reveal-grid absolute inset-0" />
      <div className="rank-reveal-shutter rank-reveal-shutter-left absolute inset-y-0 left-0 w-1/2" />
      <div className="rank-reveal-shutter rank-reveal-shutter-right absolute inset-y-0 right-0 w-1/2" />

      <div className="rank-reveal-content relative flex w-full max-w-3xl flex-col items-center px-6 text-center">
        <div className="rank-reveal-kicker flex items-center gap-3 text-[10px] font-semibold uppercase text-muted-foreground sm:text-xs">
          <span className="h-px w-10 bg-current sm:w-16" />
          Performance enregistrée
          <span className="h-px w-10 bg-current sm:w-16" />
        </div>

        <div className="rank-reveal-stage relative mt-4 flex size-[250px] items-center justify-center sm:size-[330px]">
          <span className="rank-reveal-orbit absolute inset-3 rounded-full border border-current opacity-30" style={{ color }} />
          <span className="rank-reveal-orbit rank-reveal-orbit-reverse absolute inset-10 rounded-full border border-dashed border-current opacity-45" style={{ color }} />
          <span className="rank-up-burst absolute inset-12 rounded-full" style={{ boxShadow: `0 0 120px 44px ${color}` }} />
          <span className="rank-reveal-scan absolute left-1/2 top-0 h-full w-px" style={{ background: color }} />
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="rank-up-spark absolute left-1/2 top-1/2 h-1 w-1 rounded-full"
              style={{ background: color, ["--spark-angle" as string]: `${i * 18}deg`, animationDelay: `${i * 16}ms` }}
            />
          ))}
          <RankEmblem rank={rank} size={220} className="rank-reveal-emblem" />
        </div>

        <p className="rank-reveal-label text-[10px] font-semibold uppercase sm:text-xs" style={{ color }}>
          Rang atteint
        </p>
        <p className="rank-reveal-title mt-1 font-display text-3xl font-semibold text-foreground sm:text-5xl">{rank.label}</p>

        {(exercise || performance) && (
          <div className="rank-reveal-result mt-5 w-full max-w-xl border-y border-border py-3 sm:mt-6 sm:py-4">
            {exercise && <p className="text-sm font-medium text-foreground sm:text-base">{exercise}</p>}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground sm:text-sm">
              {performance && <span>{performance}</span>}
              {performance && estimate && <span aria-hidden>·</span>}
              {estimate && <span>{estimate}</span>}
            </div>
          </div>
        )}

        <p className="rank-reveal-skip mt-5 text-[10px] text-muted-foreground">Toucher n’importe où pour passer</p>
      </div>
    </div>,
    document.body,
  );
}

/** Tracks the best rank index and returns a rank to celebrate once it improves. */
export function useRankUp(currentIndex: number | null) {
  const best = useRef<number | null>(null);
  const [celebrate, setCelebrate] = useState<number | null>(null);

  useEffect(() => {
    if (currentIndex === null) return;
    if (best.current === null) {
      best.current = currentIndex;
      return;
    }
    if (currentIndex > best.current) {
      best.current = currentIndex;
      setCelebrate(currentIndex);
    }
  }, [currentIndex]);

  return { celebrate, clear: () => setCelebrate(null) };
}
