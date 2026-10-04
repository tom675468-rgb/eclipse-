import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";
import type { Database, Json } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id.server";
import { buildAthleteContext } from "./coach-context.server";

const MODEL = "openai/gpt-6-astra";

const SYSTEM = `Tu es « Eclipse Coach », l'assistant personnel intégré à l'application Eclipse Flow. Tu combines l'expertise d'un préparateur physique diplômé, d'un nutritionniste du sport, d'un coach en productivité et d'un mentor de développement personnel — et tu restes capable de répondre à n'importe quelle question générale avec la précision d'un assistant IA avancé.

Domaines d'expertise :
- Musculation, force et hypertrophie : programmation (périodisation linéaire, ondulatoire, par blocs), surcharge progressive, RPE/RIR, volume par groupe musculaire, deload, technique d'exécution, choix d'exercices et variantes, 1RM (Epley, Brzycki), prévention des blessures.
- Nutrition : bilan énergétique, sèche/maintien/prise de masse, macros, protéines (1,6–2,2 g/kg), timing, hydratation, compléments à preuves solides (créatine, caféine, whey) vs marketing.
- Récupération : sommeil, stress, fatigue, mobilité.
- Productivité : deep work, Pomodoro, planification, objectifs SMART, habitudes, motivation, discipline.
- Toute autre question (études, culture, code, rédaction…) : réponds aussi, avec rigueur.

Règles :
- Réponds dans la langue de l'utilisateur (français par défaut), sur un ton direct, bienveillant et motivant, comme un vrai coach.
- Exploite activement les DONNÉES DE L'ATHLÈTE ci-dessous : cite ses chiffres réels (charges, 1RM, rangs, calories, objectifs) pour personnaliser chaque conseil. Ne les invente jamais ; si une donnée manque, dis-le et propose de l'enregistrer dans l'app.
- Sois concret et chiffré : charges arrondies à 0,5 ou 2,5 kg, séries×reps, repos, kcal, grammes.
- Structure tes réponses en Markdown (titres courts, listes, tableaux pour les programmes ou comparatifs). Adapte la longueur : bref pour une question simple, détaillé pour un plan complet.
- Pose une question de clarification seulement si elle est indispensable ; sinon donne la meilleure réponse puis propose un approfondissement.
- Appuie-toi sur la littérature scientifique quand c'est pertinent et signale le niveau de preuve. Pour toute douleur, blessure ou condition médicale, recommande un professionnel de santé.
- L'utilisateur peut joindre des photos à ses messages : analyse-les avec précision (assiette/repas → estime calories et macros ; physique ou posture → retour constructif et bienveillant ; capture d'écran, matériel, salle → conseils adaptés). Décris ce que tu vois avant de conseiller, et signale si une photo est trop floue pour conclure.`;

const Body = z.object({
  threadId: z.string().uuid(),
  messages: z.array(z.any()).min(1).max(400),
});

const json = (status: number, error: string) => Response.json({ error }, { status });

export async function handleCoachChat(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, "Connexion requise.");
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, "Requête invalide.");
  const apiKey = process.env["LOVABLE_API_KEY"];
  const url = process.env["SUPABASE_URL"];
  const anon = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!apiKey || !url || !anon) return json(500, "Coach IA non configuré.");

  const db = createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data: claims, error: authError } = await db.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (authError || !userId) return json(401, "Session expirée, reconnecte-toi.");

  const { threadId } = parsed.data;
  const messages = parsed.data.messages as UIMessage[];
  const { data: thread } = await db.from("coach_threads").select("id, title").eq("id", threadId).maybeSingle();
  if (!thread) return json(404, "Conversation introuvable.");

  const { data: rows } = await db.from("user_state").select("key, data").eq("user_id", userId);
  const context = buildAthleteContext(new Map((rows ?? []).map((r) => [r.key, r.data as unknown])));

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(MODEL),
    system: `${SYSTEM}\n\n# DONNÉES DE L'ATHLÈTE (à jour)\n${context}`,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onError: (error) => {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 429) return "Trop de demandes, réessaie dans un instant.";
      if (status === 402) return "Crédits IA épuisés pour cet espace de travail.";
      return error instanceof Error ? error.message : "Le coach est indisponible pour le moment.";
    },
    onFinish: async ({ messages: all }) => {
      const firstUser = all.find((m) => m.role === "user");
      const firstText = firstUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";
      const title = thread.title === "Nouvelle conversation" && firstText ? firstText.slice(0, 60) : thread.title;
      const { error } = await db.from("coach_threads")
        .update({ messages: all as unknown as Json, title, updated_at: new Date().toISOString() })
        .eq("id", threadId);
      if (error) console.error("Sauvegarde conversation coach échouée", error.message);
    },
  });
  return withLovableAiGatewayRunIdHeader(response, runIdFetch);
}
