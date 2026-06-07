/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#0c1222",
          900: "#111827",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
          500: "#64748b",
          400: "#94a3b8",
          gold: "#c9a227",
          goldlight: "#e8d48b",
          golddark: "#a07d1a",
          cream: "#faf8f3",
        },
        portal: {
          bg: "#f0f2f7",
          card: "#ffffff",
          border: "rgba(0,0,0,0.07)",
          sidebar: "#0c1222",
          sidebarBorder: "rgba(255,255,255,0.07)",
        },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        sans: ["'Source Sans 3'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.12)",
        card: "0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.05)",
        elevated: "0 12px 40px rgba(0,0,0,0.14)",
        modal: "0 24px 64px rgba(0,0,0,0.28)",
        "glow-gold": "0 0 24px rgba(201,162,39,0.30)",
        sidebar: "4px 0 24px rgba(0,0,0,0.15)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-in-out",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
        "slide-in-left": "slideInLeft 0.3s cubic-bezier(0.16,1,0.3,1)",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-14px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseDot: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(16,185,129,0.4)" },
          "50%": { boxShadow: "0 0 0 6px rgba(16,185,129,0)" },
        },
      },
    },
  },
  plugins: [],
};
