import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Laptop, LogOut, MessagesSquare, Moon, Smartphone, Sun } from "lucide-react";
import { CoachChat } from "@/components/coach-chat";
import { useCloudState, useCloudAccount } from "@/lib/cloud-state";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Dumbbell,
  Flame,
  Focus,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Menu,
  MoonStar,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrainingWorkspace } from "@/components/training-workspace";
import { NutritionTracker } from "@/components/nutrition-tracker";
import { CalendarWorkspace } from "@/components/calendar-workspace";
import { GrowthWorkspace } from "@/components/growth-workspace";
import { FocusWorkspace } from "@/components/focus-workspace";
import { RankEmblem } from "@/components/rank-emblem";
import { type CalendarEvent } from "@/lib/calendar";
import { emptySkillXp, levelOf, xpRank, type Domain, type SkillXp } from "@/lib/growth";
import { summarize, type NutritionEntry } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

type View = "dashboard" | "notes" | "growth" | "focus" | "training" | "coach" | "nutrition" | "debrief" | "profile" | "notifications" | "settings";
type Status = "today" | "progress" | "done";
type Priority = "High" | "Medium" | "Low";
type Task = { id: number; title: string; project: string; priority: Priority; status: Status; xp: number };
type Note = { id: number; title: string; category: string; updated: string; content: string };
type DisplayMode = "mobile" | "desktop";
type ThemeMode = "dark" | "light";
const DISPLAY_MODE_STORAGE_KEY = "eclipse-display-mode";

function readLocalDisplayMode(): DisplayMode | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
  return saved === "mobile" || saved === "desktop" ? saved : null;
}

const navItems = [
  { id: "dashboard" as const, label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "growth" as const, label: "Objectifs", icon: Target },
  { id: "focus" as const, label: "Deep Work", icon: Focus },
  { id: "notes" as const, label: "Connaissances", icon: BookOpen },
  { id: "training" as const, label: "Entraînement & Force", icon: Dumbbell },
  { id: "coach" as const, label: "Coach IA", icon: MessagesSquare },
  { id: "nutrition" as const, label: "Nutrition", icon: Flame },
  { id: "debrief" as const, label: "Journal de bord", icon: MoonStar },
];

const mobileNavItems = navItems.filter((item) => ["dashboard", "focus", "growth", "training", "nutrition"].includes(item.id));

const retiredTaskTitles = new Set(["Finish product strategy memo", "Review Q3 growth experiments", "30 minute strength session", "Design onboarding narrative", "Map weekly priorities", "Read systems thinking notes"]);
const retiredNoteTitles = new Set(["Personal operating system", "Q3 product principles", "Books to revisit", "September intentions"]);
const retiredCalendarTitles = new Set(["Upper A — Force", "Révision statistiques", "Cours — stratégie produit"]);

export function EclipseApp() {
  const detectedMobile = useIsMobile();
  const [baseView, setView] = useState<View>("dashboard");
  // The coach lives at /coach/$threadId (real URLs per conversation); every other view is local state on "/".
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCoachRoute = pathname.startsWith("/coach");
  const coachThreadId = /^\/coach\/([^/]+)/.exec(pathname)?.[1] ?? null;
  const view: View = isCoachRoute ? "coach" : baseView;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [xp, setXp] = useCloudState("xp", 0);
  const [tasks, setTasks] = useCloudState<Task[]>("tasks", []);
  const [notes, setNotes] = useCloudState<Note[]>("notes", []);
  const [selectedNote, setSelectedNote] = useState(0);
  const [reward, setReward] = useState<number | null>(null);
  const [nutrition, setNutrition] = useCloudState<NutritionEntry[]>("nutrition", []);
  const [debriefs, setDebriefs] = useCloudState<DebriefEntry[]>("debriefs", []);
  const [trackingStartDate, setTrackingStartDate] = useCloudState("tracking-start-date", new Date().toISOString().slice(0, 10));
  const [calendarEvents, setCalendarEvents] = useCloudState<CalendarEvent[]>("calendar-events", []);
  const [skillXp, setSkillXp] = useCloudState<SkillXp>("skill-xp", emptySkillXp);
  const [displayMode, setDisplayMode] = useCloudState<DisplayMode>("display-mode", detectedMobile ? "mobile" : "desktop");
  const [localDisplayMode, setLocalDisplayMode] = useState<DisplayMode | null>(readLocalDisplayMode);
  const [themeMode, setThemeMode] = useCloudState<ThemeMode>("theme-mode", "dark");
  // A physical phone always owns the mobile shell. Account or device preferences
  // must never restore the 1180px desktop viewport on a narrow screen.
  const effectiveDisplayMode = detectedMobile ? "mobile" : (localDisplayMode ?? displayMode);
  const forceMobile = effectiveDisplayMode === "mobile";
  const changeDisplayMode = (mode: DisplayMode) => {
    const nextMode = detectedMobile ? "mobile" : mode;
    window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, nextMode);
    setLocalDisplayMode(nextMode);
    setDisplayMode(nextMode);
  };
  useLayoutEffect(() => {
    if (!detectedMobile) return;
    window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, "mobile");
    setLocalDisplayMode("mobile");
    if (displayMode !== "mobile") setDisplayMode("mobile");
  }, [detectedMobile, displayMode, setDisplayMode]);
  useLayoutEffect(() => {
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!viewport) return;
    viewport.content = effectiveDisplayMode === "desktop"
      ? "width=1180, initial-scale=1, viewport-fit=cover"
      : "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content";
  }, [effectiveDisplayMode]);
  // The first screen appears instantly; page fade-ins only play on later navigation.
  const [firstPaint, setFirstPaint] = useState(true);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("light", themeMode === "light");
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    document.documentElement.style.colorScheme = themeMode;
    document.documentElement.style.background = themeMode === "light" ? "#F4F4F2" : "#08090A";
    window.localStorage.setItem("eclipse-theme", themeMode);
    return () => {
      document.documentElement.style.removeProperty("color-scheme");
    };
  }, [themeMode]);
  const earn = (points: number) => { setXp((value) => value + points); setReward(points); window.setTimeout(() => setReward(null), 1800); };
  const earnSkill = (points: number, domain: Domain) => { earn(points); setSkillXp((s) => ({ ...emptySkillXp, ...s, [domain]: (s[domain] ?? 0) + points })); };
  useEffect(() => {
    const demoTasks = tasks.length > 0 && tasks.every((item) => retiredTaskTitles.has(item.title));
    const demoNotes = notes.length > 0 && notes.every((item) => retiredNoteTitles.has(item.title));
    const retiredNutritionLabels = new Set(["Mar 03", "Mer 04", "Jeu 05", "Ven 06", "Sam 07", "Dim 08", "Lun 09", "Mar 10", "Mer 11", "Jeu 12", "Ven 13", "Sam 14", "Dim 15", "Lun 16"]);
    const isRetiredFourteenDayDemo = (item: NutritionEntry) => !item.date && item.id >= 1 && item.id <= 14 && retiredNutritionLabels.has(item.label);
    const isRetiredLoggedTest = (item: NutritionEntry) => item.id === 1790531482531 && item.date === "2026-09-27" && item.eaten === 2300 && item.burned === 2750;
    const isDemoDay = (item: NutritionEntry) => isRetiredFourteenDayDemo(item) || isRetiredLoggedTest(item);
    const demoNutrition = nutrition.some(isDemoDay);
    const demoCalendar = calendarEvents.length > 0 && calendarEvents.every((item) => retiredCalendarTitles.has(item.title));
    if (demoTasks) setTasks([]);
    if (demoNotes) setNotes([]);
    if (demoNutrition) setNutrition(nutrition.filter((item) => !isDemoDay(item)));
    if (demoCalendar) setCalendarEvents([]);
    if (xp === 728 && (demoTasks || demoNotes || demoNutrition || demoCalendar)) setXp(0);
  }, [calendarEvents, notes, nutrition, setCalendarEvents, setNotes, setNutrition, setTasks, setXp, tasks, xp]);
  const logNutrition = (entry: Omit<NutritionEntry, "id" | "label">) => setNutrition((items) => {
    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const date = entry.date ?? new Date().toISOString().slice(0, 10);
    const d = new Date(`${date}T12:00:00`);
    const label = `${days[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
    const next = { ...entry, date, label };
    const existing = items.find((item) => item.date === date);
    if (existing) return items.map((item) => item.date === date ? { ...item, ...next } : item).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    return [...items, { ...next, id: Date.now() }].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  });
  const deleteNutrition = (id: number) => setNutrition((items) => items.filter((item) => item.id !== id));

  const completeTask = (id: number) => {
    const task = tasks.find((item) => item.id === id);
    if (!task || task.status === "done") return;
    setTasks((items) => items.map((item) => item.id === id ? { ...item, status: "done" } : item));
    setXp((value) => value + task.xp);
    setReward(task.xp);
    window.setTimeout(() => setReward(null), 1800);
  };

  const addTask = (title: string, priority: Priority) => {
    if (!title.trim()) return;
    setTasks((items) => [{ id: Date.now(), title: title.trim(), project: "Personal", priority, status: "today", xp: 35 }, ...items]);
  };

  const openView = (next: View) => {
    setFirstPaint(false);
    setMobileOpen(false);
    if (next === "coach") { if (!isCoachRoute) void navigate({ to: "/coach" }); return; }
    setView(next);
    if (isCoachRoute) void navigate({ to: "/" });
  };

  return (
    <div data-display-mode={effectiveDisplayMode} data-first-paint={firstPaint ? "" : undefined} className={cn("min-h-[100dvh] max-w-full overflow-x-clip bg-background text-foreground selection:bg-primary/30", themeMode === "light" && "light")}>
       <div className="pointer-events-none fixed inset-0 bg-eclipse-grid opacity-25" />
      {reward !== null && (
        <div className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 animate-reward rounded-full border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary shadow-glow backdrop-blur-xl">
          <span className="flex items-center gap-2"><Sparkles className="size-4" /> +{reward} XP earned</span>
        </div>
      )}

      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} forceMobile={forceMobile} view={view} onNavigate={openView} onCollapse={() => setCollapsed((value) => !value)} onClose={() => setMobileOpen(false)} />

      <div className={cn("app-layout-shell relative min-h-[100dvh] w-full min-w-0 max-w-full box-border overflow-x-clip transition-[padding] duration-300", !forceMobile && (collapsed ? "pl-[76px]" : "pl-[236px]"))}>
         <Header xp={xp} forceMobile={forceMobile} onMenu={() => setMobileOpen(true)} onNavigate={openView} />
        <main className="app-main mx-auto w-full min-w-0 max-w-[1500px] box-border overflow-x-clip px-3 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] min-[360px]:px-4 sm:p-6 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-10">
           {view === "dashboard" && <Dashboard xp={xp} tasks={tasks} nutrition={nutrition} calendarEvents={calendarEvents} trackingStartDate={trackingStartDate} onNavigate={openView} onComplete={completeTask} />}
           {view === "growth" && <GrowthWorkspace skillXp={skillXp} onEarn={earnSkill} onNavigate={openView} />}
          {view === "focus" && <FocusWorkspace xp={xp} events={calendarEvents} startDate={trackingStartDate} onStartDateChange={setTrackingStartDate} onEventsChange={setCalendarEvents} onEarn={earnSkill} onEarnCalendar={earn} />}
          {view === "notes" && <NotesWorkspace notes={notes} selected={selectedNote} onSelect={setSelectedNote} onChange={setNotes} />}
          {view === "training" && <TrainingWorkspace onEarnXp={earn} onOpenNutrition={() => openView("nutrition")} trackingStartDate={trackingStartDate} />}
          {view === "coach" && <CoachChat threadId={coachThreadId} />}
          {view === "nutrition" && <NutritionTracker entries={nutrition} onLog={logNutrition} onDelete={deleteNutrition} onEarnXp={earn} trackingStartDate={trackingStartDate} />}
          {view === "debrief" && <Debrief history={debriefs} onClearHistory={() => setDebriefs([])} onComplete={(points, entry) => { setDebriefs((list) => [...list, entry]); setXp((value) => value + points); setReward(points); window.setTimeout(() => setReward(null), 1800); }} />}
           {view === "profile" && <AccountPanel xp={xp} onNavigate={openView} />}
           {view === "notifications" && <NotificationsPanel tasks={tasks} events={calendarEvents} onNavigate={openView} />}
            {view === "settings" && <SettingsPanel startDate={trackingStartDate} onStartDateChange={setTrackingStartDate} displayMode={effectiveDisplayMode} onDisplayModeChange={changeDisplayMode} themeMode={themeMode} onThemeModeChange={setThemeMode} />}
        </main>
      </div>

       <nav className={cn("mobile-dock fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 grid w-full min-w-0 max-w-full grid-cols-5 gap-1 overflow-hidden rounded-lg border border-border/80 bg-surface/95 p-1.5 box-border shadow-panel backdrop-blur-xl", !forceMobile && "hidden")} aria-label="Navigation mobile">
        {mobileNavItems.map((item) => (
          <button key={item.id} onClick={() => openView(item.id)} className={cn("flex w-full min-w-0 max-w-full flex-col items-center gap-1 overflow-hidden rounded-md px-1 py-1.5 box-border text-[9px] transition-colors", view === item.id ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground")}>
            <item.icon className="size-4 shrink-0" /><span className="block w-full min-w-0 truncate text-center">{item.label === "Entraînement & Force" ? "Training" : item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Sidebar({ collapsed, mobileOpen, forceMobile, view, onNavigate, onCollapse, onClose }: { collapsed: boolean; mobileOpen: boolean; forceMobile: boolean; view: View; onNavigate: (view: View) => void; onCollapse: () => void; onClose: () => void }) {
  const compact = collapsed && !forceMobile;
  return (
    <>
      {forceMobile && mobileOpen && <button className="fixed inset-0 z-40 bg-overlay/70 backdrop-blur-sm" onClick={onClose} aria-label="Fermer le menu" />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar/95 backdrop-blur-xl transition-all duration-300", compact ? "w-[76px]" : "w-[236px]", forceMobile ? (mobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0")}>
         <div className="flex h-[72px] items-center border-b border-border px-5">
           <div className="brand-eclipse flex size-9 shrink-0 items-center justify-center rounded-md text-primary shadow-glow"><MoonStar className="size-5" /></div>
           {!compact && <div className="ml-3"><span className="block font-display text-[15px] font-bold">Eclipse Flow</span><span className="block text-[8px] font-semibold uppercase text-muted-foreground">Performance system</span></div>}
           {forceMobile && <Button variant="ghost" size="icon" onClick={onClose} className="ml-auto" aria-label="Fermer le menu"><X /></Button>}
        </div>
         <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5">
           {!compact && <p className="mb-2 px-3 text-[10px] font-semibold uppercase text-muted-foreground">Espace athlète</p>}
          <nav className="space-y-1" aria-label="Primary navigation">
            {navItems.map((item) => (
               <button key={item.id} onClick={() => onNavigate(item.id)} title={compact ? item.label : undefined} className={cn("group relative flex min-h-10 w-full items-center rounded-md py-2 text-sm transition-all", compact ? "justify-center" : "gap-3 px-3", view === item.id ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_var(--primary-border)] before:absolute before:-left-3 before:h-5 before:w-0.5 before:bg-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                <item.icon className="size-[17px] shrink-0" />{!compact && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="border-t border-border p-3">
          <button className={cn("mb-2 flex h-10 w-full items-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", compact ? "justify-center" : "gap-3 px-3")} onClick={() => onNavigate("settings")} title="Réglages"><Settings className="size-[17px]" />{!compact && "Réglages"}</button>
           {!forceMobile && <button onClick={onCollapse} className="flex h-9 w-full items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label={collapsed ? "Déployer le menu" : "Réduire le menu"}>
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
           </button>}
        </div>
      </aside>
    </>
  );
}

function Header({ xp, forceMobile, onMenu, onNavigate }: { xp: number; forceMobile: boolean; onMenu: () => void; onNavigate: (view: View) => void }) {
  const progress = Math.min(((xp % 1000) / 1000) * 100, 100);
  const { email, signOut } = useCloudAccount();
  return (
    <header className="app-header sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="grid h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
           {forceMobile && <Button variant="ghost" size="icon" onClick={onMenu} className="shrink-0" aria-label="Ouvrir le menu"><Menu /></Button>}
          <Button variant="ghost" size="icon" onClick={() => void signOut()} className="shrink-0" aria-label="Se déconnecter" title={`Se déconnecter (${email})`}><LogOut /></Button>
          <div className="min-w-0">
             <p className="truncate font-display text-sm font-bold sm:text-base">Bonsoir{email ? `, ${email.split("@")[0]}` : ""}</p>
             <p className="hidden text-xs text-muted-foreground sm:block">Ta dynamique est lancée.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden w-48 lg:block">
             <div className="mb-1 flex justify-between text-[10px]"><span className="font-semibold text-primary">Niveau {levelOf(xp)}</span><span className="font-mono text-muted-foreground">{xp % 1000} / 1 000 XP</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full xp-bar-fill rounded-full transition-all duration-700" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="hidden items-center gap-2 sm:flex" title={`Rang ${xpRank(xp).rank.label}`}><RankEmblem rank={xpRank(xp).rank} size={38} /><span className="hidden text-[10px] font-semibold uppercase text-muted-foreground xl:block">{xpRank(xp).rank.label}</span></div>
          <Button variant="ghost" size="icon" onClick={() => onNavigate("notifications")} className="relative" aria-label="Notifications"><Bell /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" /></Button>
           <button onClick={() => onNavigate("profile")} className="flex size-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20" aria-label="Ouvrir le profil">{email?.slice(0, 2).toUpperCase() || "EF"}</button>
        </div>
      </div>
    </header>
  );
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-title mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4"><div className="min-w-0"><p className="mb-1.5 text-[10px] font-semibold uppercase text-primary">{eyebrow}</p><h1 className="font-display text-2xl font-semibold sm:text-[28px]">{title}</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}

function Dashboard({ xp, tasks, nutrition, calendarEvents, trackingStartDate, onNavigate, onComplete }: { xp: number; tasks: Task[]; nutrition: NutritionEntry[]; calendarEvents: CalendarEvent[]; trackingStartDate: string; onNavigate: (view: View) => void; onComplete: (id: number) => void }) {
  const completed = tasks.filter((task) => task.status === "done").length;
  const active = tasks.filter((task) => task.status !== "done");
  const next = calendarEvents.filter((event) => !event.completed && event.date >= trackingStartDate).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
  return (
    <div className="animate-enter">
       <PageTitle eyebrow="Système personnel" title="Centre de commande" description="Une lecture précise de tes engagements, sans données fictives." action={<Button onClick={() => onNavigate("focus")} className="hidden sm:flex"><Focus /> Lancer un focus</Button>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
         <Metric icon={Focus} label="Blocs à lancer" value={calendarEvents.filter((event) => !event.completed).length.toString()} note="Ouvrir Deep Work" onClick={() => onNavigate("focus")} />
         <Metric icon={CheckCircle2} label="Blocs accomplis" value={calendarEvents.filter((event) => event.completed).length.toString()} note="Voir la progression" onClick={() => onNavigate("focus")} />
         <Metric icon={CalendarDays} label="Prochain focus" value={next?.time ?? "Libre"} note={next ? `${next.date} · ${next.title}` : "Planifier la journée"} onClick={() => onNavigate("focus")} />
         <Metric icon={Zap} label="XP global" value={xp.toLocaleString("fr-FR")} note={`Niveau ${levelOf(xp)}`} onClick={() => onNavigate("growth")} />
      </div>
       <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><NutritionCard entries={nutrition.filter((entry) => !entry.date || entry.date >= trackingStartDate)} onOpen={() => onNavigate("nutrition")} /><CalendarCard events={calendarEvents} startDate={trackingStartDate} onOpen={() => onNavigate("focus")} /></div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="section-title">Plan de concentration</h2><p className="section-subtitle">Tes blocs planifiés, directement actionnables.</p></div><Button variant="ghost" size="sm" onClick={() => onNavigate("focus")}>Tout voir <ChevronRight /></Button></div><div className="divide-y divide-border">{calendarEvents.filter((event) => !event.completed).slice(0, 5).map((event) => <button key={event.id} onClick={() => onNavigate("focus")} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/50"><Clock3 className="size-4 text-primary" /><span className="min-w-0 truncate text-sm font-medium">{event.title}</span><span className="font-mono text-[10px] text-muted-foreground">{event.date} · {event.time}</span></button>)}{!calendarEvents.some((event) => !event.completed) && <button onClick={() => onNavigate("focus")} className="w-full p-6 text-left text-xs text-muted-foreground hover:bg-accent/30">Aucun bloc actif. Planifier le premier →</button>}</div></section><section className="grid gap-3"><QuickLink icon={Target} title="Objectifs & compétences" note="Faire progresser une branche" onClick={() => onNavigate("growth")} /><QuickLink icon={Dumbbell} title="Entraînement & Force" note="Créer ou lancer une séance" onClick={() => onNavigate("training")} /><QuickLink icon={BookOpen} title="Base de connaissances" note="Capturer une idée" onClick={() => onNavigate("notes")} /></section></div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note, onClick }: { icon: typeof Focus; label: string; value: string; note: string; onClick: () => void }) {
  return <button onClick={onClick} className="panel group p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/25 sm:p-5"><div className="flex items-start justify-between"><div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></div><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div><p className="mt-5 text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-semibold">{value}</p><p className="mt-2 truncate text-[10px] text-muted-foreground">{note}</p></button>;
}

function QuickLink({ icon: Icon, title, note, onClick }: { icon: typeof Target; title: string; note: string; onClick: () => void }) { return <button onClick={onClick} className="panel group flex items-center gap-3 p-4 text-left transition-colors hover:border-primary/25"><span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{title}</span><span className="block truncate text-[10px] text-muted-foreground">{note}</span></span><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></button>; }

function TaskRow({ task, onComplete }: { task: Task; onComplete: (id: number) => void }) {
  return <div className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/50"><button onClick={() => onComplete(task.id)} className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border transition-all", task.status === "done" ? "border-success bg-success text-success-foreground" : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10")} aria-label={`Complete ${task.title}`}>{task.status === "done" && <Check className="size-3" />}</button><div className="min-w-0"><p className={cn("truncate text-sm font-medium", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{task.project} · +{task.xp} XP</p></div><PriorityBadge priority={task.priority} /></div>;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cn("rounded px-2 py-1 text-[9px] font-semibold uppercase", priority === "High" ? "bg-danger/10 text-danger" : priority === "Medium" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground")}>{priority}</span>;
}

function TasksWorkspace({ tasks, onComplete, onAdd }: { tasks: Task[]; onComplete: (id: number) => void; onAdd: (title: string, priority: Priority) => void }) {
  const [adding, setAdding] = useState(false); const [title, setTitle] = useState(""); const [priority, setPriority] = useState<Priority>("Medium");
  const columns: { id: Status; title: string; icon: typeof Inbox }[] = [{ id: "today", title: "Today", icon: Inbox }, { id: "progress", title: "In progress", icon: Clock3 }, { id: "done", title: "Completed", icon: CheckCircle2 }];
  const submit = () => { onAdd(title, priority); setTitle(""); setAdding(false); };
  return <div className="animate-enter"><PageTitle eyebrow="Exécution" title="Tâches" description="Organise, priorise et valide chaque prochaine action." action={<Button onClick={() => setAdding(true)}><Plus /> <span className="hidden sm:inline">Nouvelle tâche</span></Button>} />
    {adding && <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="What needs to move forward?" /><div className="flex rounded-md border border-border p-1">{(["Low","Medium","High"] as Priority[]).map((item) => <button key={item} onClick={() => setPriority(item)} className={cn("rounded px-2.5 py-1 text-xs", item === priority ? "bg-accent text-foreground" : "text-muted-foreground")}>{item}</button>)}</div><div className="flex gap-2"><Button onClick={submit}>Add task</Button><Button variant="ghost" size="icon" onClick={() => setAdding(false)} aria-label="Cancel"><X /></Button></div></div>}
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><div className="panel p-4"><p className="text-xs text-muted-foreground">Completion rate</p><p className="mt-1 font-display text-xl font-semibold">84%</p></div><div className="panel p-4"><p className="text-xs text-muted-foreground">XP available</p><p className="mt-1 font-display text-xl font-semibold text-primary">+{tasks.filter(t => t.status !== "done").reduce((sum,t) => sum+t.xp,0)}</p></div><div className="panel p-4"><p className="text-xs text-muted-foreground">High priority</p><p className="mt-1 font-display text-xl font-semibold">{tasks.filter(t => t.priority === "High" && t.status !== "done").length}</p></div></div>
    <div className="grid gap-4 xl:grid-cols-3">{columns.map((column) => <section key={column.id} className="min-w-0"><div className="mb-3 flex items-center gap-2 px-1"><column.icon className="size-4 text-muted-foreground" /><h2 className="text-xs font-semibold uppercase text-muted-foreground">{column.title}</h2><span className="ml-auto rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{tasks.filter(task => task.status === column.id).length}</span></div><div className="space-y-2">{tasks.filter(task => task.status === column.id).map(task => <article key={task.id} className="panel group p-4 transition-all hover:-translate-y-0.5 hover:border-primary/25"><div className="flex items-start justify-between gap-3"><PriorityBadge priority={task.priority} /><button className="text-muted-foreground hover:text-foreground" aria-label="Task options"><MoreHorizontal className="size-4" /></button></div><h3 className={cn("mt-4 text-sm font-medium leading-6", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</h3><div className="mt-5 flex items-center justify-between border-t border-border pt-3"><span className="text-[10px] text-muted-foreground">{task.project} · {task.xp} XP</span>{task.status !== "done" ? <button onClick={() => onComplete(task.id)} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"><Circle className="size-4" /> Complete</button> : <span className="flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="size-4" /> Earned</span>}</div></article>)}</div></section>)}</div>
  </div>;
}

function NotesWorkspace({ notes, selected, onSelect, onChange }: { notes: Note[]; selected: number; onSelect: (id: number) => void; onChange: (notes: Note[]) => void }) {
  const [query, setQuery] = useState(""); const note = notes.find((item) => item.id === selected) ?? notes[0];
  const filtered = useMemo(() => notes.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())), [notes, query]);
  if (!note) return <div className="animate-enter"><PageTitle eyebrow="Connaissances" title="Base de connaissances" description="Tes notes commencent ici, sans contenu d'exemple." action={<Button onClick={() => { const next = { id: Date.now(), title: "Nouvelle note", category: "Personnel", updated: "À l'instant", content: "" }; onChange([next]); onSelect(next.id); }}><Plus /> Nouvelle note</Button>} /><button onClick={() => { const next = { id: Date.now(), title: "Nouvelle note", category: "Personnel", updated: "À l'instant", content: "" }; onChange([next]); onSelect(next.id); }} className="panel flex min-h-64 w-full flex-col items-center justify-center border-dashed p-8 text-center hover:border-primary/30"><BookOpen className="size-8 text-primary" /><p className="mt-4 font-display text-lg font-semibold">Créer la première note</p><p className="mt-2 text-xs text-muted-foreground">Un espace vierge pour tes idées, cours et décisions.</p></button></div>;
  const update = (field: "title" | "content", value: string) => onChange(notes.map((item) => item.id === note.id ? { ...item, [field]: value, updated: "Just now" } : item));
  const addNote = () => { const next = { id: Date.now(), title: "Untitled note", category: "Personal", updated: "Just now", content: "# Untitled note\n\nStart writing..." }; onChange([next, ...notes]); onSelect(next.id); };
  return <div className="animate-enter"><PageTitle eyebrow="Knowledge" title="Second brain" description="Ideas become useful when they are easy to return to." action={<Button onClick={addNote}><Plus /> <span className="hidden sm:inline">New note</span></Button>} />
    <div className="grid min-h-[650px] min-w-0 overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="border-b border-border bg-surface/60 lg:border-b-0 lg:border-r"><div className="border-b border-border p-3"><div className="relative"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="pl-9" /></div></div><div className="max-h-56 overflow-y-auto p-2 lg:max-h-[590px]">{filtered.map((item) => <button key={item.id} onClick={() => onSelect(item.id)} className={cn("mb-1 w-full rounded-md p-3 text-left transition-colors", item.id === selected ? "bg-primary/10" : "hover:bg-accent")}><div className="flex items-start gap-3"><BookOpen className={cn("mt-0.5 size-4 shrink-0", item.id === selected ? "text-primary" : "text-muted-foreground")} /><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.category} · {item.updated}</p></div></div></button>)}</div></aside>
      <article className="min-w-0 p-5 sm:p-8 lg:p-12"><div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center justify-between border-b border-border pb-4"><span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{note.category}</span><span className="text-[10px] text-muted-foreground">Saved · {note.updated}</span></div><input value={note.title} onChange={(e) => update("title", e.target.value)} className="w-full bg-transparent font-display text-2xl font-semibold outline-none sm:text-3xl" aria-label="Note title" /><Textarea value={note.content} onChange={(e) => update("content", e.target.value)} className="mt-6 min-h-[430px] resize-none border-0 bg-transparent p-0 font-mono text-sm leading-7 shadow-none focus-visible:ring-0" aria-label="Note content" /></div></article>
    </div>
  </div>;
}

type DebriefEntry = { date: string; score: number; wins: number; habits: number; reflection: string };

function Debrief({ history, onComplete, onClearHistory }: { history: DebriefEntry[]; onComplete: (points: number, entry: DebriefEntry) => void; onClearHistory: () => void }) {
  const blankHabits = [false, false, false, false];
  const [score, setScore] = useState(5); const [wins, setWins] = useState(["", "", ""]); const [habits, setHabits] = useState(blankHabits); const [reflection, setReflection] = useState(""); const [submitted, setSubmitted] = useState(false);
  const winCount = wins.filter((w) => w.trim()).length;
  const bonus = 50 + winCount * 10 + habits.filter(Boolean).length * 5;
  const clear = () => { setScore(5); setWins(["", "", ""]); setHabits(blankHabits); setReflection(""); };
  const complete = () => { setSubmitted(true); onComplete(bonus, { date: new Date().toISOString(), score, wins: winCount, habits: habits.filter(Boolean).length, reflection }); };
  if (submitted) return <div className="mx-auto max-w-2xl animate-enter pt-8"><div className="panel p-8 text-center sm:p-12"><div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary shadow-glow"><Trophy className="size-6" /></div><p className="mt-6 text-[10px] font-semibold uppercase text-primary">Journée bouclée</p><h1 className="mt-2 font-display text-3xl font-semibold">Journal enregistré.</h1><div className="mx-auto mt-7 w-fit rounded-md border border-primary/25 bg-primary/5 px-5 py-3 text-sm font-semibold text-primary">+{bonus} XP bonus</div><Button className="mt-7" onClick={() => { clear(); setSubmitted(false); }}>Nouvelle entrée</Button></div><DebriefHistory history={history} onClear={onClearHistory} /></div>;
  return <div className="mx-auto max-w-4xl animate-enter"><div className="flex flex-wrap items-end justify-between gap-3"><PageTitle eyebrow="Rituel du soir" title="Journal de bord" description="Note tes victoires, évalue ta journée et garde une leçon pour demain." /><Button variant="outline" onClick={clear} className="mb-6"><X /> Effacer l'entrée</Button></div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]"><div className="space-y-4"><section className="panel p-5 sm:p-6"><Step number="01" icon={Star} title="Victoires du jour" subtitle="Écris jusqu'à trois réussites, même petites." /><div className="mt-5 space-y-2">{wins.map((w, i) => <Input key={i} value={w} onChange={(e) => setWins((v) => v.map((x, j) => j === i ? e.target.value : x))} placeholder={`Victoire ${i + 1}`} aria-label={`Victoire ${i + 1}`} />)}</div></section>
      <section className="panel p-5 sm:p-6"><Step number="02" icon={BarChart3} title="Note de la journée" subtitle="Sans trop réfléchir." /><div className="mt-6 flex items-center gap-4"><span className="text-xs text-muted-foreground">Basse</span><input type="range" min="1" max="10" value={score} onChange={(e) => setScore(Number(e.target.value))} className="eclipse-range min-w-0 flex-1" aria-label="Note de la journée" /><span className="text-xs text-muted-foreground">Top</span><div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10 font-display text-xl font-semibold text-primary">{score}</div></div></section>
      <section className="panel p-5 sm:p-6"><Step number="03" icon={Brain} title="Ce que j'ai appris" subtitle="Une phrase honnête suffit." /><Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Aujourd'hui j'ai compris que…" className="mt-5 min-h-28 resize-none" /></section></div>
      <aside className="space-y-4"><section className="panel p-5"><h2 className="section-title">Habitudes</h2><div className="mt-5 space-y-3">{["Bouger", "Lire", "Méditer", "Planifier demain"].map((item, i) => <button key={item} onClick={() => setHabits(values => values.map((value,index) => index === i ? !value : value))} className="flex w-full items-center justify-between text-sm"><span className="text-muted-foreground">{item}</span><span className={cn("flex size-5 items-center justify-center rounded-full border", habits[i] ? "border-success bg-success text-success-foreground" : "border-border")} >{habits[i] && <Check className="size-3" />}</span></button>)}</div></section><section className="rounded-lg border border-primary/20 bg-primary/5 p-5"><p className="text-[10px] font-semibold uppercase text-primary">Bonus de réflexion</p><div className="mt-2 flex items-end justify-between"><span className="font-display text-2xl font-semibold">+{bonus} XP</span><Zap className="size-5 text-primary" /></div><Button className="mt-5 w-full" onClick={complete}><Sparkles /> Valider la journée</Button></section></aside></div>
    <DebriefHistory history={history} onClear={onClearHistory} />
  </div>;
}

function DebriefHistory({ history, onClear }: { history: DebriefEntry[]; onClear: () => void }) {
  if (!history.length) return null;
  return <section className="panel mt-4 p-5"><div className="flex items-center justify-between"><h2 className="section-title">Journées enregistrées</h2><Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Effacer tout le journal ?")) onClear(); }}>Tout effacer</Button></div><p className="section-subtitle">{history.length} bilan{history.length > 1 ? "s" : ""} sauvegardé{history.length > 1 ? "s" : ""} sur ton compte.</p><div className="mt-4 divide-y divide-border">{history.slice(-7).reverse().map((d) => <div key={d.date} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="text-muted-foreground">{new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}</span><span className="min-w-0 flex-1 truncate text-muted-foreground">{d.reflection || "—"}</span><span className="font-mono text-primary">{d.score}/10</span></div>)}</div></section>;
}

function Step({ number, icon: Icon, title, subtitle }: { number: string; icon: typeof Star; title: string; subtitle: string }) {
  return <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></div><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[9px] font-semibold text-muted-foreground">{number}</span><h2 className="section-title">{title}</h2></div><p className="section-subtitle">{subtitle}</p></div></div>;
}

function AccountPanel({ xp, onNavigate }: { xp: number; onNavigate: (view: View) => void }) {
  const { email, signOut } = useCloudAccount();
  const rank = xpRank(xp).rank;
  return <div className="mx-auto max-w-3xl animate-enter"><PageTitle eyebrow="Compte" title="Profil utilisateur" description="Ton identité, ton niveau et tes données de progression." /><section className="panel-lift flex flex-col items-center p-8 text-center sm:p-12"><RankEmblem rank={rank} size={112} /><p className="mt-5 font-display text-xl font-bold">{email?.split("@")[0] || "Athlète Eclipse"}</p><p className="mt-1 text-xs text-muted-foreground">{email}</p><div className="mobile-stack mt-6 grid w-full max-w-lg grid-cols-2 gap-3"><button onClick={() => onNavigate("growth")} className="rounded-md border border-border bg-surface p-4 text-left hover:border-primary/30"><span className="text-[10px] uppercase text-muted-foreground">Progression</span><span className="mt-1 block font-display text-lg font-bold">{xp.toLocaleString("fr-FR")} XP</span></button><button onClick={() => onNavigate("training")} className="rounded-md border border-border bg-surface p-4 text-left hover:border-primary/30"><span className="text-[10px] uppercase text-muted-foreground">Rang</span><span className="mt-1 block font-display text-lg font-bold">{rank.label}</span></button></div><Button variant="outline" className="mt-6" onClick={() => void signOut()}><LogOut /> Se déconnecter</Button></section></div>;
}

function NotificationsPanel({ tasks, events, onNavigate }: { tasks: Task[]; events: CalendarEvent[]; onNavigate: (view: View) => void }) {
  const active = tasks.filter((task) => task.status !== "done");
  const upcoming = events.filter((event) => !event.completed).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return <div className="mx-auto max-w-3xl animate-enter"><PageTitle eyebrow="Centre d'attention" title="Notifications" description="Uniquement les actions et blocs qui demandent ton attention." /><div className="space-y-3">{active.slice(0, 4).map((task) => <button key={`task-${task.id}`} onClick={() => onNavigate("focus")} className="panel flex w-full items-center gap-3 p-4 text-left hover:border-primary/25"><ListTodo className="size-4 text-primary" /><span className="min-w-0 flex-1 truncate text-sm">{task.title}</span><span className="text-[10px] text-muted-foreground">Action</span></button>)}{upcoming.slice(0, 4).map((event) => <button key={`event-${event.id}`} onClick={() => onNavigate("focus")} className="panel flex w-full items-center gap-3 p-4 text-left hover:border-primary/25"><CalendarDays className="size-4 text-primary" /><span className="min-w-0 flex-1 truncate text-sm">{event.title}</span><span className="font-mono text-[10px] text-muted-foreground">{event.date} · {event.time}</span></button>)}{!active.length && !upcoming.length && <div className="panel p-8 text-center"><Bell className="mx-auto size-7 text-primary" /><p className="mt-3 text-sm font-semibold">Tout est calme</p><p className="mt-1 text-xs text-muted-foreground">Aucune notification active.</p></div>}</div></div>;
}

function SettingsPanel({ startDate, onStartDateChange, displayMode, onDisplayModeChange, themeMode, onThemeModeChange }: { startDate: string; onStartDateChange: (date: string) => void; displayMode: DisplayMode; onDisplayModeChange: (mode: DisplayMode) => void; themeMode: ThemeMode; onThemeModeChange: (mode: ThemeMode) => void }) {
  return <div className="mx-auto max-w-3xl animate-enter"><PageTitle eyebrow="Configuration" title="Réglages" description="Adapte l'affichage, l'ambiance et la chronologie à tes préférences." /><div className="space-y-4">
    <section className="panel-lift p-5 sm:p-6"><h2 className="section-title">Format d'affichage</h2><p className="section-subtitle">Force l'interface mobile compacte ou la navigation complète sur ordinateur.</p><div className="mobile-scroll-x mt-4 flex gap-2" role="group" aria-label="Format d'affichage">
      <Button variant={displayMode === "mobile" ? "default" : "outline"} onClick={() => onDisplayModeChange("mobile")} className="shrink-0"><Smartphone /> Mobile</Button>
      <Button variant={displayMode === "desktop" ? "default" : "outline"} onClick={() => onDisplayModeChange("desktop")} className="shrink-0"><Laptop /> Ordinateur</Button>
    </div></section>
    <section className="panel-lift p-5 sm:p-6"><h2 className="section-title">Thème</h2><p className="section-subtitle">Choisis une ambiance sombre ou claire pour toute l'application.</p><div className="mobile-scroll-x mt-4 flex gap-2" role="group" aria-label="Thème de l'application">
      <Button variant={themeMode === "dark" ? "default" : "outline"} onClick={() => onThemeModeChange("dark")} className="shrink-0"><Moon /> Sombre</Button>
      <Button variant={themeMode === "light" ? "default" : "outline"} onClick={() => onThemeModeChange("light")} className="shrink-0"><Sun /> Clair</Button>
    </div></section>
    <section className="panel-lift p-5 sm:p-6"><label htmlFor="global-start-date" className="text-xs font-semibold">Date de début du suivi</label><p className="mt-1 text-xs text-muted-foreground">Calendrier, nutrition, entraînement et force utilisent cette même chronologie.</p><Input id="global-start-date" type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} className="mt-4 max-w-64" /></section>
  </div></div>;
}

function NutritionCard({ entries, onOpen }: { entries: NutritionEntry[]; onOpen: () => void }) {
  const week = entries.slice(-7); const s = summarize(week, "cut"); const last = entries[entries.length - 1];
  const fmt = (n: number) => `${n > 0 ? "+" : ""}${Math.round(n).toLocaleString("fr-FR")} kcal`;
  return (
     <button onClick={onOpen} className="panel-lift grid w-full gap-4 p-5 text-left transition-colors hover:border-primary/30 sm:grid-cols-4 sm:p-6">
      <div className="sm:col-span-1"><p className="text-[10px] font-semibold uppercase text-primary">Nutrition · 7 jours</p><h2 className="section-title mt-1">Bilan énergétique</h2><p className="section-subtitle">Ouvrir le suivi calorique →</p></div>
      <div><p className="text-[10px] uppercase text-muted-foreground">Moy. mangées</p><p className="mt-1 font-display text-lg font-semibold text-danger">{Math.round(s.averageEaten)} kcal</p></div>
      <div><p className="text-[10px] uppercase text-muted-foreground">Moy. dépensées</p><p className="mt-1 font-display text-lg font-semibold text-warning">{Math.round(s.averageBurned)} kcal</p></div>
      <div><p className="text-[10px] uppercase text-muted-foreground">Bilan net (7 j)</p><p className={cn("mt-1 font-display text-lg font-semibold", s.net < 0 ? "text-success" : "text-primary")}>{fmt(s.net)}</p>{last && <p className="text-[10px] text-muted-foreground">Dernier jour : {fmt(last.eaten - last.burned)}</p>}</div>
    </button>
  );
}

function CalendarCard({ events, startDate, onOpen }: { events: CalendarEvent[]; startDate: string; onOpen: () => void }) {
  const next = events.filter((event) => !event.completed && event.date >= startDate).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
  return <button onClick={onOpen} className="panel-lift group w-full p-5 text-left sm:p-6"><div className="flex items-start justify-between"><div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"><CalendarDays className="size-5" /></div><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div><p className="eyebrow mt-6">Prochain engagement</p><h2 className="mt-1 font-display text-lg font-bold">{next?.title ?? "Planifier la suite"}</h2><p className="mt-2 text-xs text-muted-foreground">{next ? `${new Date(`${next.date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · ${next.time} · +${next.xp} XP` : "Ton calendrier est prêt."}</p></button>;
}
