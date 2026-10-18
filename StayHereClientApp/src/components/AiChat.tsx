import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IcoSparkle } from "./icons";

/**
 * Floating "Ask Sage" launcher. The full conversation now lives at the dedicated /sage
 * full-screen experience (SagePage.tsx) rather than a small inline panel — this component's only
 * job is to be visible everywhere and get the user there, either via direct click or the
 * `sh:open-ai-chat` event other pages already dispatch (Navbar, HomePage, ListingDetailPage).
 */
export function AiChat() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => navigate("/sage");
    window.addEventListener("sh:open-ai-chat", handler);
    return () => window.removeEventListener("sh:open-ai-chat", handler);
  }, [navigate]);

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => navigate("/sage")}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-elevated transition hover:-translate-y-0.5 animate-pulse-glow"
        style={{ background: "linear-gradient(135deg, #0d9488 0%, #c9a227 100%)" }}
      >
        <IcoSparkle size={18} />
        <span className="hidden sm:block">Ask Sage</span>
      </motion.button>
    </AnimatePresence>
  );
}
