import type { Config } from "tailwindcss";

// Vert sobre (santé/confiance) + accent corail pour les actions urgentes.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        yako: {
          50: "#eef7f1",
          100: "#d5ebdc",
          500: "#2f8f5b",
          600: "#237a49",
          700: "#1c623b",
          900: "#0f3a23",
        },
        corail: { 500: "#f26b4f", 600: "#dc563b" },
      },
    },
  },
  plugins: [],
};
export default config;
