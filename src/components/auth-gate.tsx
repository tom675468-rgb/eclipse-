import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CloudStateProvider, loadCloudState } from "@/lib/cloud-state";
import { BootScreen } from "@/components/boot-screen";

type Loaded = { userId: string; email: string; initial: Map<string, unknown> };

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let current: string | null = null;
    let initialized = false;
    const apply = async (user: { id: string; email?: string | undefined } | null) => {
      if (!alive) return;
      if (!user) { current = null; setLoaded(null); setReady(true); return; }
      if (current === user.id) return;
      current = user.id;
      try {
        const initial = await loadCloudState(user.id);
        if (!alive || current !== user.id) return;
        setLoaded({ userId: user.id, email: user.email ?? "", initial });
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : "Chargement impossible."); }
      if (alive) setReady(true);
    };
    // Single source of truth for startup: the locally stored session is read once,
    // so the app never flashes sign-in → app → reload while the session is restored.
    void supabase.auth.getSession().then(({ data }) => {
      initialized = true;
      void apply(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initialized) return; // startup handled by getSession above
      if (event === "SIGNED_OUT") { void apply(null); return; }
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) void apply(session.user);
      // TOKEN_REFRESHED / INITIAL_SESSION never tear down the mounted app
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!ready) return <BootScreen />;
  if (error) return <div className="flex min-h-[100dvh] w-full min-w-0 max-w-full items-center justify-center overflow-x-hidden bg-background p-6 text-sm text-destructive">{error}</div>;
  if (!loaded) return <SignIn />;
  return (
    <CloudStateProvider key={loaded.userId} {...loaded} signOut={async () => { await supabase.auth.signOut(); }}>
      {children}
    </CloudStateProvider>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    if (res.error) setMsg({ ok: false, text: res.error.message });
    else if (mode === "up" && !res.data.session) setMsg({ ok: true, text: "Vérifie ta boîte mail pour confirmer ton compte." });
    setBusy(false);
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg({ ok: false, text: r.error.message });
  };

  return (
    <div className="flex min-h-[100dvh] w-full min-w-0 max-w-full items-center justify-center overflow-x-hidden bg-background p-4 text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-eclipse-grid opacity-40" />
      <div className="panel relative w-full max-w-sm p-7">
        <div className="mb-6 flex items-center gap-2"><Moon className="size-5 text-primary" /><span className="font-display text-lg font-semibold">Eclipse</span></div>
        <h1 className="font-display text-xl font-semibold">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Tes séances, ton suivi calorique et tes journées sont sauvegardés sur ton compte.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <Input type="password" required minLength={6} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Mot de passe" />
          <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{mode === "in" ? "Se connecter" : "S'inscrire"}</Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={google}>Continuer avec Google</Button>
        {msg && <p className={msg.ok ? "mt-3 text-xs text-success" : "mt-3 text-xs text-destructive"}>{msg.text}</p>}
        <button className="mt-5 w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
          {mode === "in" ? "Pas encore de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
        </button>
      </div>
    </div>
  );
}
