"use client";

import { tagColor } from "@/lib/tag-colors";

export function TagPill({
  name,
  color,
  onRemove,
}: {
  name: string;
  color: string;
  onRemove?: () => void;
}) {
  const c = tagColor(color);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.pill}`}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-0.5 ml-0.5 rounded-full px-0.5 leading-none opacity-60 transition hover:opacity-100"
          aria-label={`Quitar ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
