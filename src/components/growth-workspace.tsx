import { useMemo, useState } from "react";
import { Check, ChevronDown, Flag, GitBranch, ListChecks, Plus, Target, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCloudState } from "@/lib/cloud-state";
import { domains, type Domain, type Goal, type SkillXp, type SubGoal } from "@/lib/growth";
import { cn } from "@/lib/utils";

type GrowthDestination = "growth" | "training" | "notes";
type GoalFilter = "all" | "active" | "done";

export function GrowthWorkspace({ skillXp, onEarn, onNavigate }: { skillXp: SkillXp; onEarn: (points: number, domain: Domain) => void; onNavigate: (view: GrowthDestination) => void }) {
  const [goals, setGoals] = useCloudState<Goal[]>("smart-goals", []);
  const [filter, setFilter] = useState<GoalFilter>("all");

  const active = goals.filter((g) => !g.done).length;
  const done = goals.length - active;

  const visible = useMemo(() => {
    const list = filter === "all" ? goals : goals.filter((g) => filter === "done" ? g.done : !g.done);
    return [...list].sort((a, b) => Number(a.done) - Number(b.done) || a.deadline.localeCompare(b.deadline));
  }, [goals, filter]);

  const updateGoal = (id: number, fn: (g: Goal) => Goal) => setGoals((list) => list.map((g) => g.id === id ? fn(g) : g));
  const bumpSub = (goal: Goal, subId: number, next: number) => {
    const sub = goal.subs.find((s) => s.id === subId); if (!sub) return;
    const clamped = Math.max(0, Math.min(sub.target, next));
    if (clamped === sub.current) return;
    if (clamped > sub.current) onEarn(clamped === sub.target ? 40 : clamped - sub.current >= 1 ? 5 : 0, goal.domain);
    updateGoal(goal.id, (g) => ({ ...g, subs: g.subs.map((s) => s.id === subId ? { ...s, current: clamped } : s) }));
  };
  const removeSub = (goalId: number, subId: number) => updateGoal(goalId, (g) => ({ ...g, subs: g.subs.filter((s) => s.id !== subId) }));

  return <div className="animate-enter space-y-4">
    <div><p className="eyebrow">Projets & objectifs</p><h1 className="font-display text-2xl font-bold sm:text-[30px]">Arbre de progression</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Chaque action validée nourrit une branche. Découpe tes objectifs en jalons mesurables et coche-les un par un.</p></div>

    <section className="panel-lift p-5">
      <div className="mb-5 flex items-center gap-2"><GitBranch className="size-4 text-primary" /><h2 className="section-title">Arbre de compétences</h2></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{(Object.keys(domains) as Domain[]).map((d) => {
        const xp = skillXp[d] ?? 0; const nodes = domains[d].nodes; const nextNode = nodes.find((n) => n.xp > xp);
        return <button key={d} onClick={() => d === "sante" ? onNavigate("training") : d === "creativite" ? onNavigate("notes") : document.getElementById("smart-goals")?.scrollIntoView({ behavior: "smooth" })} className="skill-branch group rounded-lg border border-border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30">
          <div className="flex items-baseline justify-between"><h3 className="font-display text-base font-semibold">{domains[d].label}</h3><span className="font-mono text-xs text-primary">{xp} XP</span></div>
          <div className="relative mt-4 space-y-3 pl-5">
            <span className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
            {nodes.map((n) => { const on = xp >= n.xp; return <div key={n.label} className="relative flex items-center gap-3">
              <span className={cn("absolute -left-5 flex size-4 items-center justify-center rounded-full border", on ? "border-primary bg-primary shadow-glow" : "border-border bg-surface")}>{on && <Check className="size-2.5 text-primary-foreground" />}</span>
              <span className={cn("text-xs", on ? "font-semibold text-foreground" : "text-muted-foreground")}>{n.label}</span><span className="ml-auto font-mono text-[9px] text-muted-foreground">{n.xp}</span>
            </div>; })}
          </div>
          <p className="mt-4 text-[10px] text-muted-foreground">{nextNode ? `${nextNode.xp - xp} XP avant « ${nextNode.label} »` : "Branche maîtrisée"}</p>
          <span className="mt-3 block text-[9px] text-primary opacity-0 transition-opacity group-hover:opacity-100">Ouvrir la section →</span>
        </button>;
      })}</div>
    </section>

    <section id="smart-goals" className="panel-lift scroll-mt-24 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Target className="size-4 text-primary" /><h2 className="section-title">Objectifs personnels</h2>
        <span className="font-mono text-[10px] text-muted-foreground">{active} en cours · {done} terminé{done > 1 ? "s" : ""}</span>
        <div className="mobile-scroll-x w-full sm:ml-auto sm:w-auto"><div className="flex min-w-max items-center gap-1 rounded-md border border-border p-0.5">
          {([["all", "Tous"], ["active", "En cours"], ["done", "Terminés"]] as [GoalFilter, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={cn("rounded px-2.5 py-1 text-[11px] transition-colors", filter === key ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div></div>
      </div>

      <GoalComposer onCreate={(g) => setGoals((l) => [g, ...l])} />

      <div className="mt-4 space-y-3">
        {visible.map((g) => <GoalCard key={g.id} goal={g} onBump={bumpSub} onRemoveSub={removeSub} onUpdate={updateGoal} onRemove={() => setGoals((l) => l.filter((x) => x.id !== g.id))} />)}
        {!visible.length && <p className="rounded-md border border-dashed border-border p-5 text-center text-xs text-muted-foreground">{filter === "done" ? "Aucun objectif terminé pour l'instant." : filter === "active" ? "Tout est terminé. Crée un nouvel objectif pour continuer." : "Aucun objectif pour l'instant. Crée le premier, puis découpe-le en jalons mesurables."}</p>}
      </div>
    </section>
  </div>;
}

function GoalComposer({ onCreate }: { onCreate: (g: Goal) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""); const [domain, setDomain] = useState<Domain>("etudes"); const [deadline, setDeadline] = useState(""); const [why, setWhy] = useState("");
  const create = () => { if (!title.trim()) return; onCreate({ id: Date.now(), title: title.trim(), domain, deadline, why: why.trim(), subs: [], done: false }); setTitle(""); setWhy(""); setDeadline(""); };
  return <div className="rounded-lg border border-border bg-surface/40">
    <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-accent/40" aria-expanded={open}>
      <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary"><Plus className="size-3.5" /></span>
      Nouvel objectif
      <ChevronDown className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
    </button>
    {open && <div className="space-y-3 border-t border-border p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label="Objectif"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : valider le semestre avec 14/20" onKeyDown={(e) => e.key === "Enter" && create()} /></Field>
        <Field label="Domaine"><select value={domain} onChange={(e) => setDomain(e.target.value as Domain)} className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm" aria-label="Domaine">{(Object.keys(domains) as Domain[]).map((d) => <option key={d} value={d}>{domains[d].label}</option>)}</select></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
        <Field label="Échéance (optionnelle)"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
        <Field label="Pourquoi c'est pertinent (optionnel)"><Input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Ta motivation, en une phrase" onKeyDown={(e) => e.key === "Enter" && create()} /></Field>
        <div className="flex items-end"><Button onClick={create} className="w-full sm:w-auto"><Plus /> Créer l'objectif</Button></div>
      </div>
    </div>}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}

function daysLeft(deadline: string): number | null {
  if (!deadline) return null;
  const diff = Math.round((new Date(`${deadline}T12:00`).getTime() - Date.now()) / 86_400_000);
  return Number.isNaN(diff) ? null : diff;
}

function GoalCard({ goal, onBump, onRemoveSub, onUpdate, onRemove }: { goal: Goal; onBump: (g: Goal, id: number, next: number) => void; onRemoveSub: (goalId: number, subId: number) => void; onUpdate: (id: number, fn: (g: Goal) => Goal) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(true);
  const [label, setLabel] = useState(""); const [target, setTarget] = useState(""); const [unit, setUnit] = useState(""); const [confirming, setConfirming] = useState(false);
  const total = goal.subs.reduce((s, x) => s + x.target, 0); const cur = goal.subs.reduce((s, x) => s + Math.min(x.current, x.target), 0);
  const pct = total > 0 ? Math.round(cur / total * 100) : 0;
  const left = daysLeft(goal.deadline);
  const complete = goal.subs.length > 0 && goal.subs.every((s) => s.current >= s.target);
  const addSub = () => { const t = Math.max(1, Math.floor(Number(target) || 0)); if (!label.trim() || !t) return; onUpdate(goal.id, (g) => ({ ...g, subs: [...g.subs, { id: Date.now(), label: label.trim(), target: t, current: 0, unit: unit.trim() }] })); setLabel(""); setTarget(""); setUnit(""); };

  return <div className={cn("rounded-lg border bg-surface/40 transition-colors", goal.done ? "border-border/60 opacity-75" : "border-border")}>
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
      <button onClick={() => onUpdate(goal.id, (g) => ({ ...g, done: !g.done }))} aria-label={goal.done ? "Rouvrir l'objectif" : "Marquer l'objectif comme terminé"} className={cn("flex size-5 shrink-0 items-center justify-center rounded border transition-colors", goal.done || complete ? "border-success bg-success text-success-foreground" : "border-muted-foreground/40 hover:border-primary")}>{(goal.done || complete) && <Check className="size-3" />}</button>
      <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
        <p className={cn("truncate text-sm font-semibold", goal.done && "text-muted-foreground line-through")}>{goal.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-primary">{domains[goal.domain].label}</span>
          {left !== null && <span className={cn("font-mono", left < 0 && !goal.done && "font-semibold text-destructive")}>{left < 0 ? `échéance dépassée (${Math.abs(left)} j)` : left === 0 ? "échéance aujourd'hui" : `dans ${left} j`}</span>}
          {goal.why && <span className="truncate">· {goal.why}</span>}
        </div>
      </button>
      <div className="shrink-0 text-right">
        <span className="font-display text-lg font-bold text-primary">{pct}%</span>
        <p className="font-mono text-[9px] text-muted-foreground">{cur}/{total || 0} unités</p>
      </div>
      <ChevronDown className={cn("col-start-3 row-start-1 size-4 shrink-0 self-start text-muted-foreground transition-transform sm:self-center", open && "rotate-180")} />
    </div>
    {total > 0 && <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all duration-700", complete || goal.done ? "bg-success" : "xp-bar-fill")} style={{ width: `${pct}%` }} /></div>}
    {open && <div className="space-y-3 border-t border-border/60 p-4">
      {goal.subs.map((s) => <SubRow key={s.id} sub={s} onNext={() => onBump(goal, s.id, s.current + 1)} onCommit={(v) => onBump(goal, s.id, v)} onRemove={() => onRemoveSub(goal.id, s.id)} />)}
      {!goal.subs.length && <p className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 text-[11px] text-muted-foreground"><ListChecks className="size-3.5 shrink-0" />Découpe cet objectif en jalons mesurables : chaque pas vaut +5 XP, un jalon complété +40 XP.</p>}
      <div className="grid gap-2 rounded-md border border-border bg-background/40 p-2 sm:grid-cols-[minmax(0,1fr)_72px_80px_auto]">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nouveau jalon (ex : 8 fiches de révision)" aria-label="Jalon" className="h-9 text-xs" onKeyDown={(e) => e.key === "Enter" && addSub()} />
        <Input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" placeholder="Cible" aria-label="Cible du jalon" className="h-9 text-xs" onKeyDown={(e) => e.key === "Enter" && addSub()} />
        <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unité" aria-label="Unité" className="h-9 text-xs" onKeyDown={(e) => e.key === "Enter" && addSub()} />
        <Button variant="outline" size="sm" className="h-9" onClick={addSub}><Plus /> Jalon</Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] text-muted-foreground">{goal.subs.length} jalon{goal.subs.length > 1 ? "s" : ""}{total > 0 && ` · ${cur}/${total} unités accomplies`}</p>
        {confirming ? <div className="flex items-center gap-2"><span className="text-[10px] text-destructive">Supprimer l'objectif ?</span><Button size="sm" variant="destructive" className="h-7 text-[11px]" onClick={onRemove}>Confirmer</Button><Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setConfirming(false)}><X /> Annuler</Button></div>
          : <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)}><Trash2 /> Supprimer</Button>}
      </div>
    </div>}
  </div>;
}

function SubRow({ sub, onNext, onCommit, onRemove }: { sub: SubGoal; onNext: () => void; onCommit: (v: number) => void; onRemove: () => void }) {
  const [draft, setDraft] = useState(String(sub.current));
  const done = sub.current >= sub.target;
  const commit = () => { const v = Math.floor(Number(draft)); if (!Number.isNaN(v)) onCommit(v); else setDraft(String(sub.current)); };
  return <div className={cn("grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md border p-2 transition-colors sm:flex", done ? "border-success/40 bg-success/5" : "border-border bg-background/40")}>
    {done && <Check className="size-3.5 shrink-0 text-success" />}
    <span className={cn("min-w-0 flex-1 truncate text-xs", done && "text-muted-foreground line-through")}>{sub.label}</span>
    <div className="col-span-2 flex min-w-0 items-center justify-end gap-1 sm:col-span-1">
      <Input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }} inputMode="numeric" aria-label={`Progression : ${sub.label}`} className="h-9 w-16 text-center font-mono text-xs" />
      <span className="font-mono text-[10px] text-muted-foreground">/{sub.target}{sub.unit && ` ${sub.unit}`}</span>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onNext} aria-label="Incrémenter" disabled={done}>+1</Button>
      <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Supprimer le jalon ${sub.label}`}><Trash2 /></Button>
    </div>
  </div>;
}
