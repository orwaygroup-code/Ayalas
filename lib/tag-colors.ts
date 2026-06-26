// Tokens de color de los tags → clases Tailwind LITERALES.
// Importante: Tailwind purga clases que no ve como string completo, por eso
// NO se construyen dinámicamente (`bg-${x}-100`) sino que se listan enteras.

export type TagColor =
  | "slate"
  | "red"
  | "amber"
  | "green"
  | "blue"
  | "violet"
  | "pink";

export const TAG_COLORS: Record<
  TagColor,
  { pill: string; dot: string; label: string }
> = {
  slate: { pill: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500", label: "Gris" },
  red: { pill: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500", label: "Rojo" },
  amber: { pill: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Ámbar" },
  green: { pill: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", label: "Verde" },
  blue: { pill: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500", label: "Azul" },
  violet: { pill: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500", label: "Violeta" },
  pink: { pill: "bg-pink-100 text-pink-700 border-pink-200", dot: "bg-pink-500", label: "Rosa" },
};

export const TAG_COLOR_TOKENS = Object.keys(TAG_COLORS) as TagColor[];

export function tagColor(token: string) {
  return TAG_COLORS[token as TagColor] ?? TAG_COLORS.slate;
}
