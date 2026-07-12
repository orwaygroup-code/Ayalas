// Set de iconos propio (SVG inline, sin librería externa → CSP-safe y consistente).
// Trazo 1.6, currentColor, 24x24. Se colorean con className (text-*) y tamaño con h-/w-.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.8" />
      <rect x="13" y="3" width="8" height="5" rx="1.8" />
      <rect x="13" y="10" width="8" height="11" rx="1.8" />
      <rect x="3" y="13" width="8" height="8" rx="1.8" />
    </Base>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 11.4a8 8 0 0 1-11.6 7.1L4 20l1.5-5A8 8 0 1 1 21 11.4Z" />
      <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
    </Base>
  );
}

export function IconLeads(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M18.5 7.5v5M16 10h5" />
    </Base>
  );
}

export function IconSocios(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="7.5" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 4.7a3 3 0 0 1 0 5.6" />
      <path d="M17.5 14.4A5.5 5.5 0 0 1 20.5 19.4" />
    </Base>
  );
}

export function IconMarketing(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21.5 3.5 10.8 13.2" />
      <path d="M21.5 3.5 15 21l-4.2-7.8L3 9l18.5-5.5Z" />
    </Base>
  );
}

export function IconConfig(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7h9M18 7h2" />
      <circle cx="15.5" cy="7" r="2.4" />
      <path d="M4 17h5M14 17h6" />
      <circle cx="10.5" cy="17" r="2.4" />
    </Base>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 4h-4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M18 15l3-3-3-3" />
      <path d="M21 12H10" />
    </Base>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Base>
  );
}
