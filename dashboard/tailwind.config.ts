import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { primary: "#121212", secondary: "#1A1A1A", tertiary: "#222222" },
        text: { primary: "#ECECEC", secondary: "#A8A8A8", muted: "#6B6B6B" },
        accent: {
          positive: "#4ECCA3",
          negative: "#FF6B6B",
          warning: "#FFB84D",
          // `accent-primary` was used in 26 places across app/ (text-, border-)
          // but never defined, so Tailwind emitted nothing for those classes and
          // every one of them fell back to inherited colour — most visibly the
          // links on /account and /account/api, which rendered as plain body
          // text instead of the brand green. Same colour as `positive`; kept as
          // a named alias so the existing call sites work rather than editing 26
          // of them and risking a miss.
          primary: "#4ECCA3",
        },
        // `border-divider` was used in 11 places, also undefined — those card
        // borders were simply invisible. Matches bg.tertiary, which is what the
        // borders that DID work already used.
        divider: "#222222",
      },
    },
  },
  plugins: [],
};

export default config;
