import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta base de Ayalas (ajustable cuando llegue el brand del gym).
        brand: {
          DEFAULT: "#16a34a", // verde — energía / gimnasio
          dark: "#15803d",
          light: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
