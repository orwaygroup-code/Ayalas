import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Paleta base de Ayalas (ajustable cuando llegue el brand del gym).
        brand: {
          DEFAULT: "#ff5b03", // naranja Ayalas (del logo)
          dark: "#d94e00",
          light: "#ff7a33",
          50: "#fff3ec",
          100: "#ffe2d1",
        },
      },
      boxShadow: {
        // Sombra suave y tibia (tinta del fondo, no negro puro) para tarjetas.
        card: "0 1px 2px rgba(24, 24, 27, 0.04), 0 1px 3px rgba(24, 24, 27, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
