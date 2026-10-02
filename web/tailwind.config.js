/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // FinTraQ-style dark theme used by the Finances section
        fin: {
          bg: "#0b0b0d",
          card: "#1c1c21",
          tile: "#26262c",
          input: "#121215",
          line: "rgba(255,255,255,0.07)",
          muted: "#9b9ba5",
          faint: "#6b6b75",
          accent: "rgb(var(--fin-accent) / <alpha-value>)",
          accentDeep: "#e8590c",
          needs: "#fb8a3c",
          wants: "#facc15",
          savings: "#34d399",
          danger: "#f87171",
        },
      },
      fontFamily: {
        fin: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 10px 30px -8px var(--fin-glow)",
        card: "0 1px 0 rgba(255,255,255,0.03) inset",
      },
      keyframes: {
        "fade-up": { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "none" } },
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
        "sheet-up": { from: { transform: "translateY(100%)" }, to: { transform: "none" } },
        "pop-in": { from: { opacity: 0, transform: "scale(0.96)" }, to: { opacity: 1, transform: "none" } },
      },
      animation: {
        "fade-up": "fade-up 0.35s cubic-bezier(.2,.8,.2,1) both",
        "fade-in": "fade-in 0.2s ease-out both",
        "sheet-up": "sheet-up 0.32s cubic-bezier(.2,.8,.2,1) both",
        "pop-in": "pop-in 0.22s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};
