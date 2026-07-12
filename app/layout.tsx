import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Fuente de marca: geométrica, moderna y muy legible para datos.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ayalas Wellness Center — CRM",
  description: "CRM + chatbot de Ayalas Wellness Center",
  icons: { icon: "/isologo.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
