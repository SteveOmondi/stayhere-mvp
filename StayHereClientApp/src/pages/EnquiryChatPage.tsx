import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { enquiryApi, type EnquiryMessage, type EnquirySummary } from "../lib/api";
import { formatKes } from "../lib/format";
import { useApp } from "../context/AppContext";
import { IcoChevLeft, IcoLoader, IcoSend } from "../components/icons";

const POLL_MS = 4500;

export function EnquiryChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enquiries, refreshEnquiries, toast } = useApp();

  const [thread, setThread] = useState<EnquirySummary | undefined>(() => enquiries.find((e) => e.id === id));
  const [messages, setMessages] = useState<EnquiryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCreatedAtRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setThread(enquiries.find((e) => e.id === id));
  }, [enquiries, id]);

  const loadAll = useCallback(async () => {
    if (!id) return;
    try {
      const data = await enquiryApi.getMessages(id);
      setMessages(data);
      lastCreatedAtRef.current = data.length ? data[data.length - 1].createdAt : undefined;
    } catch {
      toast("Failed to load this chat", "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  const pollNew = useCallback(async () => {
    if (!id) return;
    try {
      const data = await enquiryApi.getMessages(id, lastCreatedAtRef.current);
      if (data.length) {
        setMessages((prev) => [...prev, ...data]);
        lastCreatedAtRef.current = data[data.length - 1].createdAt;
      }
    } catch {
      // A missed poll tick isn't worth surfacing - the next one will catch up.
    }
  }, [id]);

  // On open: load the full thread, mark it read (clears this thread's badge immediately), then
  // poll for new messages only while this page stays mounted - stops the instant it unmounts.
  useEffect(() => {
    if (!id) return;
    void loadAll();
    void enquiryApi.markRead(id).then(() => refreshEnquiries());

    const interval = window.setInterval(pollNew, POLL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !id || sending) return;

    setSending(true);
    setInput("");
    try {
      const sent = await enquiryApi.sendMessage(id, text);
      setMessages((prev) => [...prev, sent]);
      lastCreatedAtRef.current = sent.createdAt;
    } catch {
      toast("Couldn't send that message - please try again.", "error");
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/cart")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition"
          aria-label="Back to enquiries"
        >
          <IcoChevLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <Link to={thread ? `/listing/${thread.listingId}` : "#"} className="truncate font-display text-base font-semibold text-white hover:text-brand-gold transition">
            {thread?.listingTitle ?? "Enquiry"}
          </Link>
          {thread?.listingLocation && <div className="text-xs text-brand-muted">{thread.listingLocation}</div>}
        </div>
        {thread?.listingPrice != null && (
          <div className="text-sm font-semibold text-brand-gold">{formatKes(thread.listingPrice)}</div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 glass"
      >
        <div className="flex-1 overflow-y-auto space-y-4 p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-brand-muted">
              <IcoLoader size={16} className="animate-spin" /> Loading chat…
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-brand-muted">
              No messages yet - say hello to get the conversation started.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderRole === "Customer" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.senderRole === "Customer"
                      ? "bg-brand-teal/20 text-white border border-brand-teal/30"
                      : "bg-white/5 text-white/90 border border-white/10"
                  }`}
                >
                  {m.body}
                  <div className="mt-1 text-[10px] text-white/40">
                    {new Date(m.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/10 p-3 sm:p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message the owner…"
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
      </motion.div>

      <p className="mt-3 text-[11px] text-brand-muted">
        For your safety, StayHere doesn't share phone numbers or emails between customers and owners.
      </p>
    </div>
  );
}
