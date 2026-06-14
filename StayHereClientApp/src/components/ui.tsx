import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import { useApp } from "../context/AppContext";
import { IcoCheck, IcoX } from "./icons";

/* ── Logo ────────────────────────────────────────────────────────── */
export function Logo({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="flex flex-col leading-none">
        <span className="font-hero font-bold text-xl uppercase tracking-widest text-white">
          Stay<span className="text-gradient-gold">Here</span>
          <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-gold align-middle" />
        </span>
        {withTagline && (
          <span className="mt-0.5 text-[9px] font-hero font-medium uppercase tracking-[0.28em] text-brand-muted">
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
      duration: 1.8,
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
          className={`glass-strong pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-elevated border ${
            t.kind === "error"
              ? "border-red-400/30"
              : t.kind === "success"
              ? "border-brand-teal/30"
              : "border-white/10"
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
      <div className="skeleton h-52 w-full rounded-none" />
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

/* ── Section heading ─────────────────────────────────────────────── */
export function SectionHeading({
  title,
  subtitle,
  tag,
  center = false,
}: {
  title: string;
  subtitle?: string;
  tag?: string;
  center?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={center ? "text-center" : ""}
    >
      {tag && (
        <div className={`mb-4 ${center ? "flex justify-center" : ""}`}>
          <span className="section-tag">{tag}</span>
        </div>
      )}
      <h2 className="font-hero font-bold uppercase tracking-tight text-white text-4xl sm:text-5xl leading-tight">
        {title}
      </h2>
      <div className={`mt-3 h-0.5 w-14 rounded-full gradient-gold ${center ? "mx-auto" : ""}`} />
      {subtitle && (
        <p className={`mt-4 text-[13px] text-brand-muted leading-relaxed ${center ? "mx-auto max-w-lg" : "max-w-xl"}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

/* ── Animated gradient blobs ─────────────────────────────────────── */
export function GradientBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-32 top-0 h-[500px] w-[500px] rounded-full bg-brand-teal/20 blur-[100px] animate-float" />
      <div className="absolute right-0 top-1/4 h-[600px] w-[600px] rounded-full bg-brand-gold/15 blur-[120px] animate-float-slow" />
      <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-brand-teal/12 blur-[80px] animate-float-rev" />
    </div>
  );
}

/* ── Cursor spotlight (mouse-tracking radial gradient) ───────────── */
export function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.background = `radial-gradient(700px circle at ${x}px ${y}px, rgba(201,162,39,0.07), rgba(13,148,136,0.04) 40%, transparent 70%)`;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-10 transition-all duration-300"
    />
  );
}

/* ── Grain layer (premium noise texture) ─────────────────────────── */
export function GrainLayer({ opacity = 0.035 }: { opacity?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  );
}

/* ── Marquee strip ───────────────────────────────────────────────── */
export function MarqueeStrip({
  items,
  speed = "normal",
  separator = "·",
}: {
  items: string[];
  speed?: "normal" | "slow";
  separator?: string;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/[0.06] bg-white/[0.015] py-3 marquee-pause">
      <div className={speed === "slow" ? "marquee-track-slow" : "marquee-track"}>
        {doubled.map((item, i) => (
          <div key={i} className="flex shrink-0 items-center gap-4 px-5">
            <span className="text-[13px] font-medium text-brand-muted/70 tracking-wide">{item}</span>
            <span className="h-1 w-1 rounded-full bg-brand-gold/30 shrink-0">{separator === "·" ? "" : separator}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Scroll reveal wrapper ───────────────────────────────────────── */
export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
}) {
  const initial =
    direction === "up" ? { opacity: 0, y: 32 } :
    direction === "left" ? { opacity: 0, x: -32 } :
    direction === "right" ? { opacity: 0, x: 32 } :
    { opacity: 0 };
  const animate = { opacity: 1, y: 0, x: 0 };

  return (
    <motion.div
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated stat card ──────────────────────────────────────────── */
export function StatCard({
  value,
  suffix = "",
  label,
  icon,
}: {
  value: number;
  suffix?: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl px-5 py-3.5 flex items-center gap-3 border border-white/[0.08] hover:border-brand-gold/20 transition-all duration-300">
      {icon && (
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gold/10 shrink-0">
          {icon}
        </div>
      )}
      <div>
        <span className="font-accent text-2xl font-bold text-brand-gold">
          <AnimatedCounter value={value} suffix={suffix} />
        </span>
        <span className="ml-1.5 text-sm text-brand-muted">{label}</span>
      </div>
    </div>
  );
}
