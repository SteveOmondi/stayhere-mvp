/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#0c1222", 900: "#111827", 800: "#1e293b",
          700: "#334155", 600: "#475569", 500: "#64748b", 400: "#94a3b8",
          gold: "#c9a227", goldlight: "#e8d48b", golddark: "#a07d1a",
          teal: "#0d9488", teallight: "#5eead4",
          cream: "#faf8f3",
        },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        sans:    ["'Source Sans 3'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card:        "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover":"0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.05)",
        elevated:    "0 12px 40px rgba(0,0,0,0.14)",
        modal:       "0 24px 64px rgba(0,0,0,0.28)",
        glow:        "0 0 24px rgba(13,148,136,0.35)",
        glass:       "0 8px 32px rgba(0,0,0,0.12)",
      },
      animation: {
        "fade-in":    "fadeIn 0.25s ease-in-out",
        "slide-up":   "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        "slide-up-1": "slideUp 0.4s 0.05s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up-2": "slideUp 0.4s 0.10s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up-3": "slideUp 0.4s 0.15s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up-4": "slideUp 0.4s 0.20s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in":   "scaleIn 0.2s ease-out",
        "pulse-dot":  "pulseDot 2s ease-in-out infinite",
        "shimmer":    "shimmer 1.5s infinite",
        "draw":       "draw 1.2s ease-out forwards",
        "fill-bar":   "fillBar 0.8s ease-out forwards",
        "float":      "float 3s ease-in-out infinite",
        "spin-slow":  "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn:   { "0%": { opacity: "0" },              "100%": { opacity: "1" } },
        slideUp:  { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn:  { "0%": { opacity: "0", transform: "scale(0.94)" },     "100%": { opacity: "1", transform: "scale(1)" } },
        pulseDot: { "0%,100%": { boxShadow: "0 0 0 0 rgba(13,148,136,0.4)" }, "50%": { boxShadow: "0 0 0 6px rgba(13,148,136,0)" } },
        shimmer:  { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        draw:     { "0%": { strokeDashoffset: "1" }, "100%": { strokeDashoffset: "0" } },
        fillBar:  { "0%": { width: "0%" }, "100%": { width: "var(--bar-width, 70%)" } },
        float:    { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
    },
  },
  plugins: [],
};
