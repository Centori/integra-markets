import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { primary: "#121212", secondary: "#1A1A1A", tertiary: "#222222" },
        text: { primary: "#ECECEC", secondary: "#A8A8A8", muted: "#6B6B6B" },
        accent: { positive: "#4ECCA3", negative: "#FF6B6B", warning: "#FFB84D" },
      },
    },
  },
  plugins: [],
};

export default config;
