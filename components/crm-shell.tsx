"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = { href: string; label: string; icon: string };

const NAV: NavItem[] = [
  { href: "/crm", label: "Dashboard", icon: "📊" },
  { href: "/crm/whatsapp", label: "Inbox", icon: "💬" },
  { href: "/crm/leads", label: "Leads", icon: "🎯" },
  { href: "/crm/socios", label: "Socios", icon: "🏋️" },
  { href: "/crm/marketing", label: "Marketing", icon: "📣" },
];

export default function CrmShell({
  children,
  staffName,
}: {
  children: React.ReactNode;
  staffName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/crm" ? pathname === "/crm" : pathname.startsWith(href);

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          A
        </div>
        <span className="text-base font-semibold text-slate-900">Ayalas</span>
      </div>
      <ul className="flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-brand/10 text-brand-dark"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-200 px-4 py-4">
        <p className="mb-2 truncate text-sm text-slate-500">{staffName ?? "Staff"}</p>
        <button
          onClick={logout}
          className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar fijo (desktop) */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
        {sidebar}
      </aside>

      {/* Drawer (móvil) */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-60 bg-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar (móvil) */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <span className="font-semibold text-slate-900">Ayalas</span>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
