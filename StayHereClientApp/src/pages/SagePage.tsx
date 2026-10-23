import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import {
  aiApi, extractAiReply, ApiError,
  type AiAttachment, type AiChatResponse, type AiConversationSummary,
} from "../lib/api";
import { formatKes } from "../lib/format";
import { useApp } from "../context/AppContext";
import { loginUrlWithRedirect } from "../lib/authRedirect";
import {
  IcoArrowRight, IcoLoader, IcoLocation, IcoSend, IcoSparkle, IcoX, IcoBed, IcoBath,
  IcoList, IcoPlus,
} from "../components/icons";

const LAST_CONVERSATION_KEY = "sage:lastConversationId";

/* ── Types ────────────────────────────────────────────────────────────────── */
type SageMessage = {
  id: number;
  role: "user" | "bot";
  text: string;
  loading?: boolean;
  attachments?: AiAttachment[];
};

type ListingPin = {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  latitude?: number;
  longitude?: number;
  primaryImageUrl?: string;
};

type PlacePin = { name: string; address?: string; latitude?: number; longitude?: number };
type NextStep = { route: string; parameters?: Record<string, string>; label: string };

const GREETING =
  "Hi, I'm Sage — your StayHere property expert. Tell me what you're looking for, or ask about an application, viewing, or payment you already have with us.";

const DEFAULT_PROMPTS = [
  "2 bedroom apartments in Kilimani under 80k",
  "What's my application status?",
  "Show me listings with a pool and parking",
  "What's near Westlands — schools, hospitals?",
];

const NAIROBI = { lat: -1.2833, lng: 36.8167 };
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

let _msgId = 0;
const nextId = () => ++_msgId;

/* ── Attachment readers (tolerant of the two tool-result shapes) ────────────── */
function readListings(data: Record<string, unknown>): ListingPin[] {
  const raw = (data.listings ?? data.comparisons ?? []) as Record<string, unknown>[];
  return raw
    .filter((item) => typeof item.id === "string" && !item.error)
    .map((item) => ({
      id: item.id as string,
      title: (item.title as string) ?? "StayHere listing",
      price: item.price as number | undefined,
      currency: item.currency as string | undefined,
      bedrooms: item.bedrooms as number | undefined,
      bathrooms: item.bathrooms as number | undefined,
      latitude: item.latitude as number | undefined,
      longitude: item.longitude as number | undefined,
      primaryImageUrl: item.primaryImageUrl as string | undefined,
    }));
}

function readPlaces(data: Record<string, unknown>): { category?: string; places: PlacePin[] } {
  const raw = (data.places ?? []) as Record<string, unknown>[];
  return {
    category: data.category as string | undefined,
    places: raw.map((p) => ({
      name: p.name as string,
      address: p.address as string | undefined,
      latitude: p.latitude as number | undefined,
      longitude: p.longitude as number | undefined,
    })),
  };
}

function readNextStep(data: Record<string, unknown>): NextStep | null {
  if (!data.route) return null;
  return {
    route: data.route as string,
    parameters: data.parameters as Record<string, string> | undefined,
    label: (data.label as string) ?? "Continue",
  };
}

/* ── Quick-reply chips: derived from what just happened, not freeform LLM output ── */
function deriveQuickReplies(attachments: AiAttachment[] | undefined): string[] {
  if (!attachments?.length) return [];
  const types = new Set(attachments.map((a) => a.type));
  const chips: string[] = [];
  if (types.has("listings")) chips.push("Compare these", "What's nearby?");
  if (types.has("nearbyPlaces")) chips.push("Show me listings here");
  if (types.has("nextStep")) chips.push("What else do I need?");
  chips.push("Ask something else");
  return chips.slice(0, 4);
}

/* ── Compact listing card for the chat pane (purpose-built, not the full grid card) ──
 * Opens in a new tab, deliberately: clicking away from the chat to look at a listing shouldn't
 * lose the conversation - there's no "back to Sage" navigation needed if the chat tab never closes. */
function SageListingCard({ listing }: { listing: ListingPin }) {
  return (
    <a
      href={`/listing/${listing.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="glass w-56 shrink-0 overflow-hidden rounded-2xl border border-white/10 text-left transition hover:border-brand-gold/40"
    >
      <div className="h-28 w-full overflow-hidden bg-white/5">
        {listing.primaryImageUrl ? (
          <img src={listing.primaryImageUrl} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-white/20">
            <IcoLocation size={24} />
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <div className="line-clamp-1 text-sm font-semibold text-white">{listing.title}</div>
        <div className="flex items-center gap-3 text-[11px] text-brand-muted">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-1"><IcoBed size={11} /> {listing.bedrooms} BR</span>
          )}
          {listing.bathrooms != null && (
            <span className="flex items-center gap-1"><IcoBath size={11} /> {listing.bathrooms} BA</span>
          )}
        </div>
        {listing.price != null && (
          <div className="text-sm font-bold text-gradient-gold">{formatKes(listing.price)}</div>
        )}
      </div>
    </a>
  );
}

function NextStepCard({ step }: { step: NextStep }) {
  const navigate = useNavigate();
  const url = step.parameters
    ? `${step.route}?${new URLSearchParams(step.parameters).toString()}`
    : step.route;
  return (
    <button
      onClick={() => navigate(url)}
      className="btn-gold w-full max-w-xs justify-center text-sm"
    >
      {step.label} <IcoArrowRight size={15} />
    </button>
  );
}

function AttachmentBlock({ attachment }: { attachment: AiAttachment }) {
  if (attachment.type === "listings") {
    const listings = readListings(attachment.data);
    if (listings.length === 0) return null;
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {listings.map((l) => <SageListingCard key={l.id} listing={l} />)}
      </div>
    );
  }

  if (attachment.type === "nearbyPlaces") {
    const { category, places } = readPlaces(attachment.data);
    if (places.length === 0) return null;
    return (
      <div className="glass rounded-2xl border border-white/10 p-3 text-xs text-white/80">
        {category && <div className="mb-1.5 font-semibold uppercase tracking-wider text-brand-muted">{category}</div>}
        <ul className="space-y-1">
          {places.slice(0, 6).map((p, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <IcoLocation size={11} className="shrink-0 text-brand-teal" />
              <span className="line-clamp-1">{p.name}{p.address ? ` — ${p.address}` : ""}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (attachment.type === "nextStep") {
    const step = readNextStep(attachment.data);
    return step ? <NextStepCard step={step} /> : null;
  }

  return null;
}

/* ── Live map pane — reflects the latest turn's listings/places ─────────────── */
function SageMap({ listings, places }: { listings: ListingPin[]; places: PlacePin[] }) {
  if (!MAPS_API_KEY) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-brand-dark/60 p-8 text-center">
        <IcoLocation size={32} className="text-white/20" />
        <p className="text-sm text-brand-muted">
          Map view isn't configured yet — set <code className="text-white/70">VITE_GOOGLE_MAPS_API_KEY</code> to enable it.
          Sage still works fully without it.
        </p>
      </div>
    );
  }

  const listingPins = listings.filter((l) => l.latitude != null && l.longitude != null);
  const placePins = places.filter((p) => p.latitude != null && p.longitude != null);
  const center = listingPins[0]
    ? { lat: listingPins[0].latitude!, lng: listingPins[0].longitude! }
    : placePins[0]
    ? { lat: placePins[0].latitude!, lng: placePins[0].longitude! }
    : NAIROBI;

  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      <Map
        defaultCenter={center}
        center={listingPins.length || placePins.length ? center : undefined}
        defaultZoom={12}
        mapId="SAGE_MAP"
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: "100%", height: "100%" }}
      >
        {listingPins.map((l) => (
          <AdvancedMarker
            key={l.id}
            position={{ lat: l.latitude!, lng: l.longitude! }}
            onClick={() => window.open(`/listing/${l.id}`, "_blank", "noopener,noreferrer")}
          >
            <Pin background="#c9a227" borderColor="#8a6f1a" glyphColor="#0a0f1e" />
          </AdvancedMarker>
        ))}
        {placePins.map((p, i) => (
          <AdvancedMarker key={i} position={{ lat: p.latitude!, lng: p.longitude! }}>
            <Pin background="#0d9488" borderColor="#0a6b62" glyphColor="#ffffff" />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export function SagePage() {
  const navigate = useNavigate();
  const { isAuthenticated, refreshFavorites } = useApp();
  const [messages, setMessages] = useState<SageMessage[]>([{ id: nextId(), role: "bot", text: GREETING }]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AiConversationSummary[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) navigate(loginUrlWithRedirect("/sage"), { replace: true });
  }, [isAuthenticated, navigate]);

  // Auto-continue whichever chat you were last in, so revisiting /sage later picks up where you
  // left off without any extra steps — "New chat" (below) is the explicit way to start fresh.
  useEffect(() => {
    const lastId = localStorage.getItem(LAST_CONVERSATION_KEY);
    if (!lastId) { setResuming(false); return; }
    aiApi.getConversation(lastId)
      .then((data) => loadConversation(lastId, data))
      .catch(() => localStorage.removeItem(LAST_CONVERSATION_KEY))
      .finally(() => setResuming(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (conversationId) localStorage.setItem(LAST_CONVERSATION_KEY, conversationId);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function loadConversation(id: string, data: { messages: { role: string; content: string }[] }) {
    setConversationId(id);
    setMessages(
      data.messages.length
        ? data.messages.map((m) => ({ id: nextId(), role: m.role === "user" ? "user" : "bot", text: m.content }))
        : [{ id: nextId(), role: "bot", text: GREETING }]
    );
  }

  function startNewChat() {
    localStorage.removeItem(LAST_CONVERSATION_KEY);
    setConversationId(undefined);
    setMessages([{ id: nextId(), role: "bot", text: GREETING }]);
    setShowHistory(false);
  }

  async function openHistory() {
    setShowHistory(true);
    if (history) return; // already loaded this visit
    setHistoryLoading(true);
    try {
      setHistory(await aiApi.listConversations());
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function resumeFromHistory(id: string) {
    setShowHistory(false);
    setResuming(true);
    try {
      const data = await aiApi.getConversation(id);
      loadConversation(id, data);
    } catch {
      // conversation gone or no longer yours — stay on the current chat
    } finally {
      setResuming(false);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;

    const userMsg: SageMessage = { id: nextId(), role: "user", text };
    const loadingId = nextId();
    setMessages((m) => [...m, userMsg, { id: loadingId, role: "bot", text: "", loading: true }]);
    setInput("");
    setSending(true);

    try {
      const data: AiChatResponse = await aiApi.chat({ query: text, conversationId });
      if (data.conversationId) setConversationId(data.conversationId);
      const reply = extractAiReply(data) || "I'm not sure how to answer that yet — could you rephrase?";
      setMessages((m) =>
        m.map((msg) => msg.id === loadingId ? { ...msg, text: reply, loading: false, attachments: data.attachments } : msg)
      );
      // Sage can save/unsave listings (and other data) mid-conversation via its own tools - the
      // rest of the app only finds out by asking again, so resync after every turn instead of
      // leaving the Saved page/heart icons stale until the user happens to reload.
      void refreshFavorites();
    } catch (err) {
      // A thrown ApiError means the request reached the server and got a real HTTP error back
      // (rate-limited, auth, a genuine 500) - show what actually happened instead of a one-size-
      // fits-all message that makes a transient "Sage is busy" indistinguishable from the server
      // being unreachable at all. Anything else (TypeError from fetch itself, no response) really
      // is a connection failure, so that generic message is still accurate there.
      const text = err instanceof ApiError
        ? err.userMessage
        : "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
      setMessages((m) =>
        m.map((msg) =>
          msg.id === loadingId
            ? { ...msg, text, loading: false }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const lastBotWithAttachments = [...messages].reverse().find((m) => m.role === "bot" && m.attachments?.length);
  const mapListings = lastBotWithAttachments?.attachments
    ?.filter((a) => a.type === "listings")
    .flatMap((a) => readListings(a.data)) ?? [];
  const mapPlaces = lastBotWithAttachments?.attachments
    ?.filter((a) => a.type === "nearbyPlaces")
    .flatMap((a) => readPlaces(a.data).places) ?? [];

  const quickReplies = deriveQuickReplies(lastBotWithAttachments?.attachments);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left — live map */}
      <div className="relative hidden w-[42%] shrink-0 lg:block">
        <SageMap listings={mapListings} places={mapPlaces} />
      </div>

      {/* Right — chat */}
      <div className="flex flex-1 flex-col gradient-hero">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4" style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.2), rgba(201,162,39,0.1))" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full text-brand-dark font-bold" style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}>
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                Sage <IcoSparkle size={13} className="text-brand-gold" />
              </div>
              <div className="flex items-center gap-1 text-[11px] text-brand-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {sending ? "thinking…" : "online"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={startNewChat}
              title="Start a new chat"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/70 hover:border-brand-gold/40 hover:text-white transition"
            >
              <IcoPlus size={14} /> <span className="hidden sm:inline">New chat</span>
            </button>
            <button
              onClick={openHistory}
              title="Your past chats"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/70 hover:border-brand-gold/40 hover:text-white transition"
            >
              <IcoList size={14} /> <span className="hidden sm:inline">History</span>
            </button>
            <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition">
              <IcoX size={18} />
            </button>
          </div>
        </div>

        {/* History panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="max-h-64 overflow-y-auto border-b border-white/10 bg-black/20"
            >
              {historyLoading ? (
                <div className="flex items-center justify-center gap-2 p-6 text-sm text-brand-muted">
                  <IcoLoader size={16} className="animate-spin" /> Loading your chats…
                </div>
              ) : !history || history.length === 0 ? (
                <div className="p-6 text-center text-sm text-brand-muted">No past chats yet — ask Sage something to start one.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {history.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => resumeFromHistory(c.id)}
                      className={`flex w-full flex-col gap-0.5 px-5 py-3 text-left transition hover:bg-white/5 ${
                        c.id === conversationId ? "bg-white/5" : ""
                      }`}
                    >
                      <span className="line-clamp-1 text-sm text-white/90">{c.preview || "New conversation"}</span>
                      <span className="text-[11px] text-brand-muted">{new Date(c.updatedAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-5 p-4 sm:p-6">
          {resuming && (
            <div className="flex items-center justify-center gap-2 text-sm text-brand-muted">
              <IcoLoader size={16} className="animate-spin" /> Resuming your last chat…
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "bot" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-brand-dark" style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}>
                  S
                </div>
              )}
              <div className="flex max-w-[85%] flex-col gap-2.5">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-brand-teal/20 text-white border border-brand-teal/30"
                      : "bg-white/5 text-white/90 border border-white/10"
                  }`}
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-2 w-2 rounded-full bg-brand-muted"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  ) : msg.text}
                </div>
                {msg.attachments?.map((a, i) => <AttachmentBlock key={i} attachment={a} />)}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <AnimatePresence>
          {(messages.length <= 1 || quickReplies.length > 0) && !sending && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-6"
            >
              {(messages.length <= 1 ? DEFAULT_PROMPTS : quickReplies).map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/70 hover:border-brand-gold/40 hover:text-white transition whitespace-nowrap"
                >
                  {p}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 p-3 sm:p-4">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Sage anything…"
            disabled={sending}
            className="input-dark flex-1 py-3 text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40 transition"
            style={{ background: "linear-gradient(135deg,#0d9488,#c9a227)" }}
          >
            {sending ? <IcoLoader size={16} /> : <IcoSend size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
