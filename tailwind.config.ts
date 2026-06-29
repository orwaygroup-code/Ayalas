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
          DEFAULT: "#ff5b03", // naranja Ayalas (del logo)
          dark: "#d94e00",
          light: "#ff7a33",
        },
      },
    },
  },
  plugins: [],
};

export default config;
