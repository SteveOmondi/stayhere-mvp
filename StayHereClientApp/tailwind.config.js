/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#c9a227",
          goldlight: "#e8d48b",
          golddark: "#a07d1a",
          teal: "#0d9488",
          teallight: "#2dd4bf",
          dark: "#0a0f1e",
          card: "#111827",
          surface: "#161d33",
          border: "rgba(255,255,255,0.10)",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.35)",
        card: "0 4px 24px rgba(0,0,0,0.30)",
        "glow-gold": "0 0 30px rgba(201,162,39,0.35)",
        "glow-teal": "0 0 30px rgba(13,148,136,0.40)",
        elevated: "0 20px 50px rgba(0,0,0,0.45)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        "float-slow": "float 14s ease-in-out infinite",
        "pulse-slow": "pulseSlow 4s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
        "fade-in": "fadeIn 0.4s ease-in-out",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        "spin-slow": "spin 1.2s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-40px) scale(1.1)" },
          "66%": { transform: "translate(-20px,20px) scale(0.95)" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(13,148,136,0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(201,162,39,0.6)" },
        },
      },
    },
  },
  plugins: [],
};
