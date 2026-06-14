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
          deep: "#060b18",
          smoke: "#1a2035",
          card: "#111827",
          surface: "#161d33",
          border: "rgba(255,255,255,0.10)",
          muted: "#94a3b8",
        },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        accent: ["'DM Serif Display'", "Georgia", "serif"],
        hero: ["'Source Sans 3'", "system-ui", "sans-serif"],
        sans: ["'Source Sans 3'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.35)",
        card: "0 4px 24px rgba(0,0,0,0.30)",
        "glow-gold": "0 0 30px rgba(201,162,39,0.35)",
        "glow-gold-lg": "0 0 60px rgba(201,162,39,0.4), 0 0 120px rgba(201,162,39,0.15)",
        "glow-teal": "0 0 30px rgba(13,148,136,0.40)",
        "glow-teal-lg": "0 0 60px rgba(13,148,136,0.5), 0 0 120px rgba(13,148,136,0.2)",
        elevated: "0 20px 50px rgba(0,0,0,0.45)",
        "card-hover": "0 30px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        "float-slow": "float 14s ease-in-out infinite",
        "float-rev": "floatRev 10s ease-in-out infinite",
        "pulse-slow": "pulseSlow 4s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
        "slide-right": "slideRight 0.5s cubic-bezier(0.16,1,0.3,1)",
        "fade-in": "fadeIn 0.4s ease-in-out",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        "spin-slow": "spin 1.2s linear infinite",
        marquee: "marquee 35s linear infinite",
        "marquee-slow": "marquee 55s linear infinite",
        "border-beam": "borderBeam 3s linear infinite",
        "gradient-x": "gradientX 10s ease infinite",
        aurora: "aurora 15s ease-in-out infinite",
        "text-shimmer": "textShimmer 4s linear infinite",
        "scale-in": "scaleIn 0.45s cubic-bezier(0.16,1,0.3,1) forwards",
        "ping-slow": "ping 3s cubic-bezier(0,0,0.2,1) infinite",
        "ken-burns": "kenBurns 16s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-40px) scale(1.1)" },
          "66%": { transform: "translate(-20px,20px) scale(0.95)" },
        },
        floatRev: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(-25px,35px) scale(0.95)" },
          "66%": { transform: "translate(20px,-25px) scale(1.05)" },
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
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(13,148,136,0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(201,162,39,0.6)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        borderBeam: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%", backgroundSize: "200% 200%" },
          "50%": { backgroundPosition: "100% 50%", backgroundSize: "200% 200%" },
        },
        aurora: {
          "0%": { backgroundPosition: "0% 50%", backgroundSize: "400% 400%" },
          "50%": { backgroundPosition: "100% 50%", backgroundSize: "400% 400%" },
          "100%": { backgroundPosition: "0% 50%", backgroundSize: "400% 400%" },
        },
        textShimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.92) translateY(8px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        kenBurns: {
          "0%": { transform: "scale(1) translateX(0%) translateY(0%)" },
          "100%": { transform: "scale(1.1) translateX(-2%) translateY(-1%)" },
        },
      },
    },
  },
  plugins: [],
};
