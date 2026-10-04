import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { Copy, History, ImagePlus, Loader2, MessageSquarePlus, Mic, MicOff, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCloudAccount } from "@/lib/cloud-state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, usePromptInputAttachments, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import coachEmblem from "@/assets/coach-emblem.png";

type ThreadRow = { id: string; title: string; updated_at: string };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

const suggestions = [
  "Analyse mes dernières séances et dis-moi quoi améliorer",
  "Crée-moi un programme de 8 semaines pour progresser au développé couché",
  "Combien de protéines et de calories je devrais viser vu mon objectif ?",
  "Comment organiser ma semaine pour caser 10 h de deep work ?",
];

async function createThread(userId: string) {
  const { data, error } = await supabase.from("coach_threads").insert({ user_id: userId }).select("id").single();
  if (error) throw error;
  return data.id;
}

export function CoachChat({ threadId }: { threadId: string | null }) {
  const { userId } = useCloudAccount();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bootstrapped = useRef(false);

  const refreshThreads = useCallback(async () => {
    const { data, error } = await supabase.from("coach_threads").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(100);
    if (error) { toast.error("Impossible de charger tes conversations."); return []; }
    setThreads(data);
    return data;
  }, []);

  // /coach without an id: open the most recent conversation, or create the first one (once).
  useEffect(() => {
    void refreshThreads().then(async (list) => {
      if (threadId || bootstrapped.current) return;
      bootstrapped.current = true;
      try {
        const id = list[0]?.id ?? (await createThread(userId));
        void navigate({ to: "/coach/$threadId", params: { threadId: id }, replace: true });
        if (!list[0]) void refreshThreads();
      } catch { toast.error("Impossible de créer une conversation."); }
    });
  }, [threadId, userId, navigate, refreshThreads]);

  const newThread = async () => {
    try {
      const id = await createThread(userId);
      await refreshThreads();
      setHistoryOpen(false);
      void navigate({ to: "/coach/$threadId", params: { threadId: id } });
    } catch { toast.error("Impossible de créer une conversation."); }
  };

  const removeThread = async (id: string) => {
    const { error } = await supabase.from("coach_threads").delete().eq("id", id);
    if (error) { toast.error("Suppression impossible."); return; }
    const list = await refreshThreads();
    if (id === threadId) {
      const next = list[0]?.id;
      if (next) void navigate({ to: "/coach/$threadId", params: { threadId: next }, replace: true });
      else void newThread();
    }
  };

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <Button onClick={() => void newThread()} className="m-3 justify-start"><MessageSquarePlus /> Nouvelle conversation</Button>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {threads === null && <div className="p-4 text-center"><Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" /></div>}
        {threads?.map((t) => (
          <div key={t.id} className={cn("group mb-1 flex items-center gap-1 rounded-md", t.id === threadId ? "bg-primary/10" : "hover:bg-accent")}>
            <button onClick={() => { setHistoryOpen(false); void navigate({ to: "/coach/$threadId", params: { threadId: t.id } }); }} className="min-w-0 flex-1 px-3 py-2.5 text-left">
              <p className={cn("truncate text-sm", t.id === threadId ? "font-medium text-primary" : "text-foreground")}>{t.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(t.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </button>
            <button onClick={() => void removeThread(t.id)} className="mr-1 shrink-0 rounded p-2 text-muted-foreground opacity-70 hover:text-destructive group-hover:opacity-100" aria-label={`Supprimer ${t.title}`}><Trash2 className="size-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );

  const title = threads?.find((t) => t.id === threadId)?.title ?? "Coach IA";

  return (
    <div className="animate-enter">
      <div className="panel relative grid h-[calc(100dvh-11rem)] min-h-[480px] w-full min-w-0 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="coach-aside hidden min-h-0 border-r border-border bg-surface/60 lg:block">{list}</aside>
        {historyOpen && (
          <div className="coach-mobile-sheet absolute inset-0 z-20 flex flex-col bg-background/98 lg:hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="font-display text-sm font-semibold">Conversations</p><Button variant="ghost" size="icon" onClick={() => setHistoryOpen(false)} aria-label="Fermer"><X /></Button></div>
            {list}
          </div>
        )}
        <section className="flex min-h-0 min-w-0 flex-col">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <img src={coachEmblem} alt="" width={32} height={32} className="size-8 shrink-0" />
            <div className="min-w-0 flex-1"><p className="truncate font-display text-sm font-semibold">{title}</p><p className="text-[10px] text-muted-foreground">Eclipse Coach · connaît tes séances, ta nutrition et tes objectifs</p></div>
            <Button variant="ghost" size="icon" className="coach-mobile-btn lg:hidden" onClick={() => setHistoryOpen(true)} aria-label="Historique des conversations"><History /></Button>
            <Button variant="ghost" size="icon" className="coach-mobile-btn lg:hidden" onClick={() => void newThread()} aria-label="Nouvelle conversation"><MessageSquarePlus /></Button>
          </header>
          {threadId ? <ThreadLoader key={threadId} threadId={threadId} onSaved={refreshThreads} /> : <div className="flex flex-1 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}
        </section>
      </div>
    </div>
  );
}

function ThreadLoader({ threadId, onSaved }: { threadId: string; onSaved: () => void }) {
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    void supabase.from("coach_threads").select("messages").eq("id", threadId).maybeSingle().then(({ data, error }) => {
      if (!alive) return;
      if (error || !data) { setMissing(true); return; }
      setInitial((data.messages as unknown as UIMessage[]) ?? []);
    });
    return () => { alive = false; };
  }, [threadId]);
  if (missing) return <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">Conversation introuvable.</div>;
  if (!initial) return <div className="flex flex-1 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  return <ChatWindow threadId={threadId} initial={initial} onSaved={onSaved} />;
}

function ChatWindow({ threadId, initial, onSaved }: { threadId: string; initial: UIMessage[]; onSaved: () => void }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const toggleVoice = () => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { toast.error("La saisie vocale n'est pas disponible sur ce navigateur."); return; }
    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = true;
    const prefix = text ? text.trimEnd() + " " : "";
    rec.onresult = (e) => {
      let transcript = "";
    const r = e.results[e.results.length - 1];
      transcript = r[0]?.transcript ?? "";
      setText((prefix + transcript).trimStart());
    };
    rec.onend = () => { setListening(false); recognitionRef.current = null; };
    rec.onerror = (e) => {
      setListening(false); recognitionRef.current = null;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") toast.error("Autorise le micro pour utiliser la saisie vocale.");
      else if (e.error !== "aborted" && e.error !== "no-speech") toast.error("La saisie vocale a échoué.");
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/coach-chat",
    body: { threadId },
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  }), [threadId]);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onFinish: () => { window.setTimeout(onSaved, 400); textareaRef.current?.focus(); },
    onError: (e) => {
      let msg = e.message;
      try { msg = JSON.parse(e.message)?.error ?? msg; } catch { /* plain text */ }
      toast.error(msg || "Le coach est indisponible pour le moment.");
    },
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const send = (value: string) => {
    const v = value.trim();
    if (!v || busy) return;
    recognitionRef.current?.stop();
    void sendMessage({ text: v });
    setText("");
    textareaRef.current?.focus();
  };
  const onSubmit = (m: PromptInputMessage) => {
    const files = m.files ?? [];
    const v = (m.text ?? "").trim();
    if (busy || (!v && files.length === 0)) return;
    recognitionRef.current?.stop();
    void sendMessage({ text: v || "Analyse cette photo.", files });
    setText("");
    textareaRef.current?.focus();
  };
  const last = messages[messages.length - 1];
  const waiting = status === "submitted" || (status === "streaming" && last?.role === "assistant" && !last.parts.some((p) => p.type === "text" && p.text));

  return (
    <>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-5">
          {messages.length === 0 ? (
            <ConversationEmptyState className="py-10" title="" description="">
              <img src={coachEmblem} alt="Eclipse Coach" width={72} height={72} className="mx-auto size-[72px]" />
              <h2 className="mt-4 font-display text-xl font-semibold">Que veux-tu travailler aujourd'hui ?</h2>
              <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">Programmation, technique, nutrition, récupération, organisation, mental… ou n'importe quelle autre question. Je m'appuie sur tes vraies données.</p>
              <div className="mx-auto mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-lg border border-border bg-surface/70 p-3 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5">{s}</button>)}
              </div>
            </ConversationEmptyState>
          ) : messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                {m.parts.map((p, i) => {
                  if (p.type === "reasoning" && m.role === "assistant") {
                    if (!p.text.trim()) return null;
                    return <Reasoning key={i} isStreaming={status === "streaming" && m.id === last?.id && i === m.parts.length - 1} defaultOpen={false}><ReasoningTrigger /><ReasoningContent>{p.text}</ReasoningContent></Reasoning>;
                  }
                  if (p.type === "text") return m.role === "assistant" ? <MessageResponse key={i}>{p.text}</MessageResponse> : <p key={i} className="whitespace-pre-wrap">{p.text}</p>;
                  if (p.type === "file" && p.mediaType?.startsWith("image/")) {
                    return <img key={i} src={p.url} alt={p.filename ?? "Photo envoyée"} className="mt-1 max-h-64 w-auto max-w-full rounded-lg border border-border/60 object-contain" />;
                  }
                  return null;
                })}
              </MessageContent>
              {m.role === "assistant" && !(busy && m.id === last?.id) && (
                <MessageActions>
                  <MessageAction tooltip="Copier" label="Copier" onClick={() => { void navigator.clipboard.writeText(m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")); toast.success("Copié"); }}><Copy className="size-3.5" /></MessageAction>
                </MessageActions>
              )}
            </Message>
          ))}
          {waiting && <Shimmer className="text-sm">Le coach réfléchit…</Shimmer>}
          {error && !busy && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">La réponse n'a pas pu aboutir. Renvoie ton message pour réessayer.</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={onSubmit}
          className="mx-auto w-full max-w-3xl"
          accept="image/*"
          multiple
          maxFiles={4}
          maxFileSize={10 * 1024 * 1024}
          onError={(err) => toast.error(err.code === "max_file_size" ? "Photo trop lourde (10 Mo max)." : err.code === "max_files" ? "4 photos maximum par message." : "Seules les photos sont acceptées.")}
        >
          <AttachmentsBar />
          <PromptInputTextarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Pose ta question au coach…" />
          <PromptInputFooter className="justify-end">
            <AttachButton />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleVoice}
              aria-label={listening ? "Arrêter la saisie vocale" : "Dicter ton message"}
              className={cn("shrink-0", listening && "bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive")}
            >
              {listening ? <MicOff className="size-4 animate-pulse" /> : <Mic className="size-4" />}
            </Button>
            <PromptInputSubmit status={status} disabled={!busy && !text.trim()} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}

function AttachButton() {
  const attachments = usePromptInputAttachments();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => attachments.openFileDialog()}
      aria-label="Joindre une photo"
      className="shrink-0"
    >
      <ImagePlus className="size-4" />
    </Button>
  );
}

function AttachmentsBar() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-3 pt-3">
      {attachments.files.map((f: FileUIPart & { id: string }) => (
        <div key={f.id} className="group relative">
          <img src={f.url} alt={f.filename ?? "Photo"} className="size-16 rounded-md border border-border object-cover" />
          <button
            type="button"
            onClick={() => attachments.remove(f.id)}
            aria-label={`Retirer ${f.filename ?? "la photo"}`}
            className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-background p-0.5 text-muted-foreground shadow-sm hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
