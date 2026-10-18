import { useCallback, useEffect, useRef, useState } from "react";
import { enquiryApi, type EnquiryMessage, type EnquirySummary } from "../lib/api";
import { useOwner } from "../context/OwnerContext";
import {
  IcoChat, IcoChevRight, IcoLoader, IcoMapPin, IcoRefresh, IcoSend, IcoUser, IcoX,
} from "../components/icons";

const POLL_MS = 4500;

export function EnquiriesPage() {
  const { refreshEnquiries } = useOwner();
  const [enquiries, setEnquiries] = useState<EnquirySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnquirySummary | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    enquiryApi.ownerMine().then(setEnquiries).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openThread(e: EnquirySummary) {
    setSelected(e);
    // Optimistically clear this thread's badge in the list right away; the shared refresh below
    // confirms it against the server a moment later.
    setEnquiries((prev) => prev.map((x) => (x.id === e.id ? { ...x, unreadCount: 0 } : x)));
  }

  function handleClose() {
    setSelected(null);
    load();
    void refreshEnquiries();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Enquiries</h1>
          <p className="text-sm text-brand-500 mt-0.5">Chat with customers interested in your listings</p>
        </div>
        <button onClick={load} className="btn-ghost border border-brand-200 flex items-center gap-1.5 text-sm">
          <IcoRefresh size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><IcoLoader size={32} className="text-brand-teal" /></div>
      ) : enquiries.length === 0 ? (
        <div className="card text-center py-16">
          <IcoChat size={40} className="mx-auto text-brand-300 mb-3" />
          <div className="font-semibold text-brand-700">No enquiries yet</div>
          <p className="text-sm text-brand-400 mt-1">When a customer enquires about one of your listings, it'll show up here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {enquiries.map((e) => (
            <EnquiryCard key={e.id} enquiry={e} onClick={() => openThread(e)} />
          ))}
        </div>
      )}

      {selected && <ChatOverlay enquiry={selected} onClose={handleClose} />}
    </div>
  );
}

function EnquiryCard({ enquiry: e, onClick }: { enquiry: EnquirySummary; onClick: () => void }) {
  return (
    <div onClick={onClick} className="card cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-brand-teal overflow-hidden">
          {e.listingImageUrl ? <img src={e.listingImageUrl} alt="" className="h-full w-full object-cover" /> : <IcoChat size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-brand-900">{e.listingTitle ?? `Listing ${e.listingId.slice(0, 8)}`}</div>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-brand-500 flex-wrap">
                {e.listingLocation && <span className="flex items-center gap-1"><IcoMapPin size={12} /> {e.listingLocation}</span>}
                <span className="flex items-center gap-1"><IcoUser size={12} /> {e.customerName ?? "StayHere customer"}</span>
              </div>
            </div>
            {e.unreadCount > 0 && (
              <span className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-teal px-1.5 text-[11px] font-bold text-white">
                {e.unreadCount}
              </span>
            )}
          </div>
          {e.lastMessagePreview && <p className="mt-2 text-xs text-brand-500 italic line-clamp-2">"{e.lastMessagePreview}"</p>}
        </div>
        <IcoChevRight size={16} className="text-brand-300 shrink-0 mt-1" />
      </div>
    </div>
  );
}

function ChatOverlay({ enquiry, onClose }: { enquiry: EnquirySummary; onClose: () => void }) {
  const [messages, setMessages] = useState<EnquiryMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCreatedAtRef = useRef<string | undefined>(undefined);

  const loadAll = useCallback(async () => {
    try {
      const data = await enquiryApi.getMessages(enquiry.id);
      setMessages(data);
      lastCreatedAtRef.current = data.length ? data[data.length - 1].createdAt : undefined;
    } finally {
      setLoading(false);
    }
  }, [enquiry.id]);

  const pollNew = useCallback(async () => {
    try {
      const data = await enquiryApi.getMessages(enquiry.id, lastCreatedAtRef.current);
      if (data.length) {
        setMessages((prev) => [...prev, ...data]);
        lastCreatedAtRef.current = data[data.length - 1].createdAt;
      }
    } catch {
      // A missed poll tick isn't worth surfacing - the next one will catch up.
    }
  }, [enquiry.id]);

  useEffect(() => {
    void loadAll();
    void enquiryApi.markRead(enquiry.id);
    const interval = window.setInterval(pollNew, POLL_MS);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const sent = await enquiryApi.sendMessage(enquiry.id, text);
      setMessages((prev) => [...prev, sent]);
      lastCreatedAtRef.current = sent.createdAt;
    } catch {
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-brand-100">
          <div className="min-w-0">
            <h2 className="font-bold text-brand-900 truncate">{enquiry.listingTitle ?? "Enquiry"}</h2>
            <p className="text-xs text-brand-500 truncate">{enquiry.customerName ?? "StayHere customer"}</p>
          </div>
          <button onClick={onClose} className="text-brand-400 hover:text-brand-700 p-1.5 rounded-lg hover:bg-brand-50 transition shrink-0">
            <IcoX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 p-5">
          {loading ? (
            <div className="flex justify-center py-12"><IcoLoader size={24} className="text-brand-teal" /></div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-brand-400">No messages yet.</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.senderRole === "Owner" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.senderRole === "Owner"
                      ? "bg-brand-teal text-white"
                      : "bg-brand-50 text-brand-900 border border-brand-100"
                  }`}
                >
                  {m.body}
                  <div className={`mt-1 text-[10px] ${m.senderRole === "Owner" ? "text-white/70" : "text-brand-400"}`}>
                    {new Date(m.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="shrink-0 flex items-center gap-2 border-t border-brand-100 p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Reply to this customer…"
            disabled={sending}
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-white disabled:opacity-40 transition"
          >
            {sending ? <IcoLoader size={15} /> : <IcoSend size={15} />}
          </button>
        </form>
        <p className="shrink-0 px-4 pb-3 text-[11px] text-brand-400">
          For their safety, StayHere doesn't share phone numbers or emails between customers and owners.
        </p>
      </div>
    </>
  );
}
