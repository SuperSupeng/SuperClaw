/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        claw: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc8fc",
          400: "#36aaf7",
          500: "#0c8ee8",
          600: "#0070c6",
          700: "#0059a1",
          800: "#054c85",
          900: "#0a406e",
          950: "#072849",
        },
        success: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
        warning: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        error: {
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
        },
      },
      boxShadow: {
        "elevation-sm": "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        "elevation-md":
          "0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)",
        "elevation-lg":
          "0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
