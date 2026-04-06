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
      },
    },
  },
  plugins: [],
};
