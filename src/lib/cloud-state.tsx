import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type Ctx = { userId: string; email: string; initial: Map<string, unknown>; signOut: () => Promise<void> };
const CloudCtx = createContext<Ctx | null>(null);

export function CloudStateProvider({ userId, email, initial, signOut, children }: Ctx & { children: ReactNode }) {
  return <CloudCtx.Provider value={{ userId, email, initial, signOut }}>{children}</CloudCtx.Provider>;
}

export function useCloudAccount() {
  const ctx = useContext(CloudCtx);
  if (!ctx) throw new Error("useCloudAccount outside provider");
  return ctx;
}

export async function loadCloudState(userId: string) {
  const { data, error } = await supabase.from("user_state").select("key, data").eq("user_id", userId);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.key, r.data as unknown]));
}

/** State saved to the signed-in account (debounced upsert). */
export function useCloudState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const ctx = useContext(CloudCtx);
  const [value, setValue] = useState<T>(() => (ctx?.initial.has(key) ? (ctx.initial.get(key) as T) : fallback));
  const first = useRef(true);
  useEffect(() => {
    if (!ctx) return;
    if (first.current) { first.current = false; return; }
    ctx.initial.set(key, value);
    const t = window.setTimeout(() => {
      void supabase.from("user_state").upsert({ user_id: ctx.userId, key, data: value as Json, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error("Sauvegarde échouée", key, error.message); });
    }, 600);
    return () => window.clearTimeout(t);
  }, [value, key, ctx]);
  return [value, setValue];
}
