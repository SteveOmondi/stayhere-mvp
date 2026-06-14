import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiApi, extractAiReply, type AiChatResponse } from "../lib/api";
import { useApp } from "../context/AppContext";
import {
  IcoChevDown, IcoLoader, IcoSearch, IcoSend, IcoSparkle,
} from "./icons";

type Message = {
  id: number;
  role: "user" | "bot";
  text: string;
  loading?: boolean;
};

const SUGGESTED_PROMPTS = [
  "Show me 2BR apartments in Nairobi",
  "Properties under KES 40,000/mo",
  "Listings in Westlands with parking",
  "Bedsitters near CBD",
];

const GREETING = "Hi! I'm Sage, your StayHere AI assistant. Ask me to find properties, compare listings, or answer any real estate questions. ✨";

let _msgId = 0;
const nextId = () => ++_msgId;

export function AiChat() {
  const { isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: "bot", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for external open trigger from Navbar
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("sh:open-ai-chat", handler);
    return () => window.removeEventListener("sh:open-ai-chat", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    if (!isAuthenticated) {
      const id = nextId();
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "user", text },
        { id, role: "bot", text: "Please sign in to chat with Sage and get personalised property recommendations." },
      ]);
      setInput("");
      return;
    }

    const userMsg: Message = { id: nextId(), role: "user", text };
    const loadingId = nextId();
    const loadingMsg: Message = { id: loadingId, role: "bot", text: "", loading: true };
    setMessages((m) => [...m, userMsg, loadingMsg]);
    setInput("");
    setSending(true);

    try {
      let data: AiChatResponse;
      try {
        data = await aiApi.chat({ query: text, sessionId });
      } catch {
        data = await aiApi.recommend({ query: text, sessionId });
      }

      const reply = extractAiReply(data) || "I found some properties that might match! Let me know if you want to refine the search.";
      if (data.sessionId) setSessionId(data.sessionId);

      setMessages((m) =>
        m.map((msg) =>
          msg.id === loadingId ? { ...msg, text: reply, loading: false } : msg
        )
      );
    } catch (err) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === loadingId
            ? { ...msg, text: "Sorry, I'm having trouble connecting right now. Please try searching listings directly.", loading: false }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-elevated transition hover:-translate-y-0.5 animate-pulse-glow"
            style={{ background: "linear-gradient(135deg, #0d9488 0%, #c9a227 100%)" }}
          >
            <IcoSparkle size={18} />
            <span className="hidden sm:block">Ask Sage</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-6 right-4 z-40 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl glass-strong shadow-elevated sm:right-6 sm:w-[380px]"
            style={{ height: "min(600px, calc(100vh - 7rem))" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4" style={{ background: "linear-gradient(135deg, rgba(13,148,136,0.2), rgba(201,162,39,0.1))" }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-brand-dark font-bold text-sm" style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}>
                  S
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    Sage <IcoSparkle size={13} className="text-brand-gold" />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-brand-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    AI Property Expert
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate("/explore")}
                  className="flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/60 hover:text-white transition"
                >
                  <IcoSearch size={11} /> Browse
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition"
                >
                  <IcoChevDown size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {msg.role === "bot" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-brand-dark" style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}>
                      S
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
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
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Suggested prompts */}
            {messages.length <= 2 && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/70 hover:border-brand-gold/40 hover:text-white transition whitespace-nowrap"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 p-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any property…"
                disabled={sending}
                className="input-dark flex-1 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40 transition"
                style={{ background: "linear-gradient(135deg,#0d9488,#c9a227)" }}
              >
                {sending ? <IcoLoader size={16} /> : <IcoSend size={16} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
