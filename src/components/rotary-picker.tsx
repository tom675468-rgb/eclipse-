import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ITEM = 40;
const VISIBLE = 3;

/**
 * Liftoff-style tactile drum. Motion is fully controlled (no native scroll),
 * so every drag, wheel tick or key press advances exactly one step and lands
 * cleanly on it — 1 cm at a time, 0.5 kg at a time.
 */
export function RotaryPicker({
  label,
  unit,
  min,
  max,
  step = 1,
  value,
  onChange,
  format,
  className,
}: {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  className?: string;
}) {
  const values = useMemo(() => {
    const items: number[] = [];
    const count = Math.floor((max - min) / step + 1e-6);
    for (let i = 0; i <= count; i += 1) items.push(Math.round((min + i * step) * 1000) / 1000);
    return items;
  }, [min, max, step]);

  const index = useMemo(() => {
    let best = 0;
    values.forEach((item, i) => {
      if (Math.abs(item - value) < Math.abs(values[best]! - value)) best = i;
    });
    return best;
  }, [values, value]);

  // continuous position, in index units
  const [pos, setPos] = useState(index);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, pos: 0, touch: false });
  const wheelAcc = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(String(value));
  const inputFocused = useRef(false);
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    if (!dragging.current) setPos(index);
  }, [index]);

  useEffect(() => {
    if (!inputFocused.current) setDraft(String(value));
  }, [value]);

  const commit = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(values.length - 1, nextIndex));
      const next = values[clamped];
      if (next !== undefined && next !== value) onChange(next);
      return clamped;
    },
    [onChange, value, values],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    start.current = { x: event.clientX, y: event.clientY, pos, touch: event.pointerType === "touch" };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    // Natural drum gesture on every device: swipe up = higher value.
    const delta = (start.current.y - event.clientY) / (start.current.touch ? ITEM * 0.6 : ITEM);
    const next = Math.max(0, Math.min(values.length - 1, start.current.pos + delta));
    setPos(next);
    const nearest = Math.round(next);
    if (nearest !== indexRef.current) commit(nearest);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const snapped = commit(Math.round(pos));
    setPos(snapped);
  };

  const nudge = (delta: number) => {
    const next = commit(indexRef.current + delta);
    setPos(next);
  };

  const commitDraft = (rawValue?: string) => {
    const parsed = Number((rawValue ?? draft).replace(",", "."));
    if (Number.isFinite(parsed)) {
      const stepped = min + Math.round((parsed - min) / step) * step;
      const clamped = Math.max(min, Math.min(max, Math.round(stepped * 1000) / 1000));
      onChange(clamped);
      setDraft(String(clamped));
    } else {
      setDraft(String(value));
    }
    inputFocused.current = false;
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    wheelAcc.current += event.deltaY;
    const threshold = 26;
    while (Math.abs(wheelAcc.current) >= threshold) {
      nudge(wheelAcc.current > 0 ? 1 : -1);
      wheelAcc.current -= Math.sign(wheelAcc.current) * threshold;
    }
  };

  const window = Math.ceil(VISIBLE / 2) + 1;
  const from = Math.max(0, Math.floor(pos) - window);
  const to = Math.min(values.length - 1, Math.ceil(pos) + window);
  const visible: number[] = [];
  for (let i = from; i <= to; i += 1) visible.push(i);

  return (
    <div className={cn("rounded-lg border border-border bg-surface/60 p-3", className)}>
      <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <label className="flex shrink-0 items-center gap-1 rounded border border-border bg-background/70 px-2 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-ring">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={draft}
            onFocus={(event) => { inputFocused.current = true; event.currentTarget.select(); }}
            onChange={(event) => {
              const nextDraft = event.target.value;
              setDraft(nextDraft);
              const parsed = Number(nextDraft.replace(",", "."));
              if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
                const stepped = min + Math.round((parsed - min) / step) * step;
                onChange(Math.round(stepped * 1000) / 1000);
              }
            }}
            onBlur={(event) => commitDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === "Escape") { setDraft(String(value)); inputFocused.current = false; inputRef.current?.blur(); }
            }}
            className="w-16 min-w-0 bg-transparent text-right font-mono text-xs text-primary outline-none"
            aria-label={`Saisir ${label}`}
          />
          {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
        </label>
      </div>

      <div
        className="rotary-drum relative select-none overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{ height: ITEM * VISIBLE }}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") { event.preventDefault(); nudge(-1); }
          if (event.key === "ArrowDown") { event.preventDefault(); nudge(1); }
          if (event.key === "PageUp") { event.preventDefault(); nudge(-5); }
          if (event.key === "PageDown") { event.preventDefault(); nudge(5); }
        }}
      >
        <div className="pointer-events-none absolute inset-x-1.5 top-1/2 z-10 h-[36px] -translate-y-1/2 rounded-md border border-primary/35 bg-primary/8 shadow-glow-sm" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7 bg-gradient-to-b from-surface to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-7 bg-gradient-to-t from-surface to-transparent" />

        {visible.map((i) => {
          const offset = i - pos;
          const distance = Math.abs(offset);
          const active = Math.round(pos) === i;
          return (
            <div
              key={values[i]}
              className="pointer-events-none absolute inset-x-0 top-1/2 flex items-center justify-center font-mono"
              style={{
                height: ITEM,
                transform: `translateY(calc(-50% + ${offset * ITEM}px)) perspective(300px) rotateX(${Math.max(-52, Math.min(52, offset * 19))}deg) scale(${active ? 1 : 0.86})`,
                opacity: Math.max(0.16, 1 - distance * 0.34),
                color: active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                fontSize: active ? 17 : 14,
                fontWeight: active ? 600 : 400,
              }}
            >
              {format ? format(values[i]!) : values[i]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Small rotary segment, used for two- or three-state choices. */
export function RotaryToggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const active = Math.max(0, options.findIndex((option) => option.value === value));
  const startY = useRef<number | null>(null);
  const select = (i: number) => {
    const next = options[(i + options.length) % options.length];
    if (next && next.value !== value) onChange(next.value);
  };
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const moved = startY.current - event.clientY;
    startY.current = null;
    if (Math.abs(moved) > 18) return select(active + (moved > 0 ? 1 : -1));
    const rect = event.currentTarget.getBoundingClientRect();
    const fromCenter = event.clientY - (rect.top + rect.height / 2);
    if (Math.abs(fromCenter) < ITEM / 2) select(active + 1);
    else select(active + Math.round(fromCenter / ITEM));
  };
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-3">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div
        className="rotary-drum relative cursor-pointer overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{ height: ITEM * VISIBLE }}
        role="radiogroup"
        aria-label={label}
        tabIndex={0}
        onPointerDown={(event) => { startY.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { startY.current = null; }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === " " || event.key === "Enter") { event.preventDefault(); select(active + 1); }
          if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); select(active - 1); }
        }}
      >
        <div className="pointer-events-none absolute inset-x-1.5 top-1/2 z-10 h-[36px] -translate-y-1/2 rounded-md border border-primary/35 bg-primary/8 shadow-glow-sm" />
        {options.map((option, i) => {
          const offset = i - active;
          return (
            <div
              key={option.value}
              role="radio"
              aria-checked={offset === 0}
              className="pointer-events-none absolute inset-x-0 top-1/2 flex items-center justify-center text-sm transition-all duration-300 ease-out"
              style={{
                height: ITEM,
                transform: `translateY(calc(-50% + ${offset * ITEM}px)) perspective(300px) rotateX(${offset * 20}deg)`,
                opacity: offset === 0 ? 1 : 0.36,
                color: offset === 0 ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                fontWeight: offset === 0 ? 600 : 400,
              }}
            >
              {option.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
