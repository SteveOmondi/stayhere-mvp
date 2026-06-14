import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import { useApp } from "../context/AppContext";
import { IcoCheck, IcoX } from "./icons";

/* ── Logo ────────────────────────────────────────────────────────── */
export function Logo({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="flex flex-col leading-none">
        <span className="font-display text-2xl font-bold tracking-tight text-white">
          Stay<span className="text-gradient-gold">Here</span>
          <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-gold align-top" />
        </span>
        {withTagline && (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.25em] text-brand-muted">
            Find Your Space
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Animated number counter ─────────────────────────────────────── */
export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(display).toLocaleString("en-KE")}
      {suffix}
    </span>
  );
}

/* ── Toast host ──────────────────────────────────────────────────── */
export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          className={`glass-strong pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-elevated ${
            t.kind === "error"
              ? "border-red-400/40"
              : t.kind === "success"
              ? "border-brand-teal/40"
              : "border-white/15"
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              t.kind === "error"
                ? "bg-red-500/20 text-red-300"
                : t.kind === "success"
                ? "bg-brand-teal/20 text-brand-teallight"
                : "bg-white/10 text-white"
            }`}
          >
            {t.kind === "error" ? <IcoX size={14} /> : <IcoCheck size={14} />}
          </span>
          <span className="flex-1 text-white/90">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="text-brand-muted hover:text-white">
            <IcoX size={16} />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Skeleton blocks ─────────────────────────────────────────────── */
export function CardSkeleton() {
  return (
    <div className="card-dark overflow-hidden">
      <div className="skeleton h-48 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── Section heading with gold underline ─────────────────────────── */
export function SectionHeading({
  title,
  subtitle,
  center = false,
}: {
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center" : ""}>
      <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h2>
      <div className={`mt-3 h-1 w-16 rounded-full gradient-gold ${center ? "mx-auto" : ""}`} />
      {subtitle && <p className="mt-4 max-w-2xl text-brand-muted">{subtitle}</p>}
    </div>
  );
}

/* ── Animated gradient blobs (hero background) ───────────────────── */
export function GradientBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand-teal/25 blur-3xl animate-float" />
      <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-brand-gold/20 blur-3xl animate-float-slow" />
      <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-brand-teal/15 blur-3xl animate-float" />
    </div>
  );
}
