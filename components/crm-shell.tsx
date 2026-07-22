"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconDashboard,
  IconInbox,
  IconLeads,
  IconSocios,
  IconProfesor,
  IconCalendar,
  IconMarketing,
  IconConfig,
  IconMenu,
  IconLogout,
  IconClose,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const NAV: NavItem[] = [
  { href: "/crm", label: "Dashboard", icon: IconDashboard },
  { href: "/crm/whatsapp", label: "Inbox", icon: IconInbox },
  { href: "/crm/leads", label: "Leads", icon: IconLeads },
  { href: "/crm/socios", label: "Socios", icon: IconSocios },
  { href: "/crm/profesores", label: "Profesores", icon: IconProfesor },
  { href: "/crm/horarios", label: "Horarios", icon: IconCalendar },
  { href: "/crm/marketing", label: "Marketing", icon: IconMarketing },
  { href: "/crm/configuracion", label: "Configuración", icon: IconConfig },
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

  const initials = (staffName ?? "Staff")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/isologo.svg"
          alt="Ayalas Wellness Center"
          className="h-8 w-8 shrink-0"
        />
        <span className="text-[15px] font-bold tracking-tight text-slate-900">
          Ayalas
        </span>
      </div>

      <ul className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand/10 text-brand-dark"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand" />
                )}
                <item.icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    active
                      ? "text-brand"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand-dark">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {staffName ?? "Staff"}
            </p>
            <p className="truncate text-xs text-slate-400">Personal</p>
          </div>
          <button
            onClick={logout}
            aria-label="Cerrar sesión"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <IconLogout className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-[100dvh] bg-slate-50">
      {/* Sidebar fijo (desktop) */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
        {sidebar}
      </aside>

      {/* Drawer (móvil) */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <IconClose className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar (móvil) */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="-ml-1 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/isologo.svg" alt="" className="h-6 w-6" />
            <span className="font-bold tracking-tight text-slate-900">
              Ayalas
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
