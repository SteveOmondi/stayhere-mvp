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
          gold: "#c9a227",
          goldlight: "#e8d48b",
          cream: "#faf8f3",
        },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        sans: ["'Source Sans 3'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
