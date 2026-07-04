import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f7f8",
          100: "#ececf0",
          900: "#12131a",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;