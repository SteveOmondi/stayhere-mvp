import { FormEvent, useEffect, useRef, useState } from "react";
import { aiAgentApi, ApiError } from "../lib/api";
import { usePortal } from "../context/PortalContext";
import {
  IcoAI, IcoSend, IcoLoader, IcoSearch, IcoBuilding, IcoMapPin,
  IcoStar, IcoX, IcoPlus,
} from "../components/icons";

type Role = "user" | "assistant" | "system";
type Message = { id: number; role: Role; content: string; results?: unknown[]; ts: string };
type SearchResult = { id?: string; title?: string; price?: number; location?: string; type?: string; image?: string };

const SUGGESTIONS = [
  "Find 2-bedroom apartments in Westlands under 80k",
  "Show me all listings with agents assigned",
  "Which property owners have the most listings?",
  "Find furnished units in Kilimani",
  "Show commercial properties in Nairobi CBD",
  "What are the cheapest studios available right now?",
];

function mapSearchResult(r: unknown): SearchResult {
  const x = (r ?? {}) as Record<string, unknown>;
  return {
    id:       String(x.id ?? x.listingId ?? ""),
    title:    String(x.title ?? x.name ?? "Property"),
    price:    typeof x.price === "number" ? x.price : typeof x.rentPrice === "number" ? x.rentPrice : undefined,
    location: String(x.city ?? x.suburb ?? x.location ?? "Nairobi"),
    type:     String(x.propertyType ?? x.listingType ?? ""),
    image:    typeof x.imageUrl === "string" ? x.imageUrl : undefined,
  };
}

const HERO_IMGS = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=70",
];

export function AiAgentPage() {
  const { toast } = usePortal();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0, role: "assistant", ts: "now",
      content: "Hello! I'm the StayHere AI Agent. I can help you search listings, find properties matching specific criteria, or answer questions about your portfolio. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [tab, setTab] = useState<"chat" | "search">("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim(), ts: new Date().toLocaleTimeString() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await aiAgentApi.chat({ message: text.trim(), sessionId });
      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: res.reply ?? "I processed your request.",
        results: res.results,
        ts: new Date().toLocaleTimeString(),
      };
      if (res.sessionId) setSessionId(res.sessionId);
      setMessages(m => [...m, assistantMsg]);
    } catch (e) {
      const errMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: e instanceof ApiError
          ? `I encountered an error: ${e.message}`
          : "I'm having trouble connecting right now. Please check the AI Agent API configuration in Settings.",
        ts: new Date().toLocaleTimeString(),
      };
      setMessages(m => [...m, errMsg]);
      toast("AI Agent API call failed", "error");
    } finally {
      setSending(false);
    }
  }

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const raw = await aiAgentApi.searchListings(q);
      const results = Array.isArray(raw) ? raw : [];
      setSearchResults(results.map(mapSearchResult));
    } catch {
      toast("Search failed — check AI Agent API", "error");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="animate-slide-up space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#f59e0b18" }}>
              <IcoAI size={18} style={{ color: "#f59e0b" }} />
            </div>
            <h2 className="font-display text-3xl text-brand-900">AI Agent</h2>
            <span className="badge badge-success ml-1 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-online" /> Online
            </span>
          </div>
          <p className="text-sm text-brand-500">Natural language search and property intelligence powered by StayHere AI</p>
        </div>
        <button
          onClick={() => {
            setMessages([{ id: 0, role: "assistant", ts: "now",
              content: "Session cleared. How can I help you?" }]);
            setSessionId(undefined);
          }}
          className="btn-secondary text-xs flex items-center gap-1.5"
        >
          <IcoPlus size={13} /> New Session
        </button>
      </div>

      {/* Tab switch */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white border border-black/[0.07] w-fit">
        {(["chat","search"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t
                ? "bg-brand-950 text-brand-goldlight shadow-sm"
                : "text-brand-600 hover:text-brand-900"
            }`}
          >
            {t === "chat" ? "💬 Chat" : "🔍 Search"}
          </button>
        ))}
      </div>

      {tab === "chat" ? (
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Chat panel */}
          <div className="portal-card flex flex-col lg:col-span-2" style={{ height: 560 }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    m.role === "assistant"
                      ? "text-brand-950"
                      : "text-white"
                  }`}
                    style={{ background: m.role === "assistant"
                      ? "linear-gradient(135deg, #e8d48b, #c9a227)"
                      : "linear-gradient(135deg, #334155, #0c1222)" }}>
                    {m.role === "assistant" ? "AI" : "A"}
                  </div>
                  {/* Bubble */}
                  <div className={`max-w-[80%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-brand-950 text-white rounded-tr-sm"
                        : "bg-slate-50 border border-black/[0.07] text-brand-800 rounded-tl-sm"
                    }`}>
                      {m.content}
                    </div>
                    {/* Property results inline */}
                    {m.results && m.results.length > 0 && (
                      <div className="space-y-2 mt-1 w-full">
                        {m.results.slice(0, 3).map((r, i) => {
                          const sr = mapSearchResult(r);
                          return (
                            <div key={i} className="flex gap-2 p-2 rounded-xl border border-black/[0.07] bg-white text-xs">
                              <img src={HERO_IMGS[i % HERO_IMGS.length]} alt=""
                                className="w-10 h-10 rounded-lg object-cover shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-brand-900 truncate">{sr.title}</div>
                                <div className="flex items-center gap-1 text-brand-500 mt-0.5">
                                  <IcoMapPin size={10} />{sr.location}
                                </div>
                                {sr.price && (
                                  <div className="text-brand-gold font-bold mt-0.5">KES {sr.price.toLocaleString()}/mo</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <span className="text-[10px] text-brand-400">{m.ts}</span>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-brand-950"
                    style={{ background: "linear-gradient(135deg, #e8d48b, #c9a227)" }}>AI</div>
                  <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-black/[0.07] rounded-tl-sm">
                    <IcoLoader size={16} className="text-brand-400" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-black/[0.06] p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  className="portal-input flex-1"
                  placeholder="Ask about listings, owners, market trends…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="btn-primary px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <IcoLoader size={16} /> : <IcoSend size={16} />}
                </button>
              </form>
            </div>
          </div>

          {/* Suggestions panel */}
          <div className="space-y-4">
            <div className="portal-card p-5">
              <h3 className="font-semibold text-brand-900 mb-3 text-sm">Suggested Queries</h3>
              <div className="space-y-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => void sendMessage(s)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-black/[0.07] hover:border-brand-gold/40 hover:bg-brand-gold/[0.04] transition-all text-xs text-brand-700 hover:text-brand-900"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="portal-card p-5">
              <h3 className="font-semibold text-brand-900 mb-3 text-sm">AI Capabilities</h3>
              <div className="space-y-2.5">
                {[
                  { icon: IcoSearch,   text: "Natural language property search" },
                  { icon: IcoBuilding, text: "Portfolio analysis & insights" },
                  { icon: IcoStar,     text: "Property recommendations" },
                  { icon: IcoMapPin,   text: "Location-based filtering" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-xs text-brand-600">
                    <Icon size={14} className="text-brand-gold shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* Search tab */
        <div className="space-y-5">
          <div className="portal-card p-5">
            <h3 className="font-semibold text-brand-900 mb-3">AI-Powered Property Search</h3>
            <form onSubmit={e => { e.preventDefault(); void runSearch(searchQuery); }} className="flex gap-2">
              <input
                className="portal-input flex-1"
                placeholder="e.g. 2 bedroom apartment Westlands under 80k per month"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                  className="btn-icon border border-black/10">
                  <IcoX size={14} />
                </button>
              )}
              <button type="submit" disabled={searching || !searchQuery.trim()}
                className="btn-primary disabled:opacity-50">
                {searching ? <IcoLoader size={16} /> : <IcoSearch size={16} />}
                {searching ? "Searching…" : "Search"}
              </button>
            </form>
            {/* Quick filters */}
            <div className="flex flex-wrap gap-2 mt-3">
              {["Apartments","Houses","Furnished","Westlands","Karen","Studio"].map(f => (
                <button key={f} onClick={() => setSearchQuery(f.toLowerCase())}
                  className="px-3 py-1 rounded-full text-xs border border-black/[0.08] text-brand-600 hover:border-brand-gold/40 hover:text-brand-900 transition-colors">
                  {f}
                </button>
              ))}
            </div>
          </div>

          {searchResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-brand-900">{searchResults.length} Results Found</h3>
                <span className="text-xs text-brand-500">Powered by StayHere AI</span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((r, i) => (
                  <div key={r.id || i} className="portal-card-hover overflow-hidden">
                    <div className="relative h-32">
                      <img
                        src={r.image || HERO_IMGS[i % HERO_IMGS.length]}
                        alt={r.title}
                        className="w-full h-full object-cover"
                      />
                      {r.type && (
                        <div className="absolute top-2 left-2 badge badge-navy text-[10px]">{r.type}</div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="font-semibold text-brand-900 text-sm truncate">{r.title}</div>
                      <div className="flex items-center gap-1 text-xs text-brand-500 mt-1">
                        <IcoMapPin size={11} />{r.location}
                      </div>
                      {r.price && (
                        <div className="text-base font-bold text-brand-gold mt-2">
                          KES {r.price.toLocaleString()}<span className="text-xs font-normal text-brand-500">/mo</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searching && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="portal-card overflow-hidden">
                  <div className="skeleton h-32 rounded-none rounded-t-2xl" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searching && searchResults.length === 0 && searchQuery && (
            <div className="portal-card p-12 text-center">
              <IcoSearch size={36} className="text-brand-300 mx-auto mb-3" />
              <div className="font-medium text-brand-700">No results found</div>
              <div className="text-sm text-brand-400 mt-1">Try a different query or check AI Agent API configuration</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
