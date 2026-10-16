"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Smartphone,
  ArrowLeftRight,
  ShoppingCart,
  Store,
  ShieldCheck,
  Users,
  Settings,
  Plug,
  LogOut,
} from "lucide-react";
import { useStoreSettings } from "@/hooks/use-store-settings";

type Modulo = "canje" | "garantias" | "clientes" | "accesorios";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; module?: Modulo }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "PoS", icon: Store },
  { href: "/stock", label: "Stock", icon: Smartphone },
  { href: "/canjes", label: "Plan Canje", icon: ArrowLeftRight, module: "canje" },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/garantias", label: "Garantías", icon: ShieldCheck, module: "garantias" },
  { href: "/clientes", label: "Clientes", icon: Users, module: "clientes" },
  { href: "/accesorios", label: "Accesorios", icon: Plug, module: "accesorios" },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { storeName, logoUrl, canjeEnabled, garantiasEnabled, clientesEnabled, accesoriosEnabled } = useStoreSettings();
  // En servidor muestra todo; en cliente filtra sin romper hidratación.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const modulos: Record<Modulo, boolean> = { canje: canjeEnabled, garantias: garantiasEnabled, clientes: clientesEnabled, accesorios: accesoriosEnabled };
  const nav = NAV.filter((item) => !item.module || !mounted || modulos[item.module]);
  const initial = (session?.user?.name ?? session?.user?.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-border bg-background lg:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          {logoUrl ? (
            // dataURL local del usuario: next/image no optimiza dataURLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`Logo de ${storeName}`}
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-2xl bg-card object-cover ring-1 ring-border"
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground" aria-hidden="true">
              <Smartphone className="h-6 w-6" strokeWidth={2.5} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[19px] font-bold tracking-tight text-foreground">{storeName}</p>
          </div>
        </div>
        <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Tienda</p>
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                  active
                    ? "bg-accent font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.99]"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                <span className="min-w-0 truncate">{item.label}</span>
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <div className="rounded-2xl border border-border bg-muted p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground" aria-hidden="true">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{session?.user?.name ?? "Usuario"}</p>
                <p className="truncate text-xs tabular-nums text-muted-foreground">{session?.user?.email}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  window.location.href = "/sign-in";
                }}
                aria-label="Cerrar sesión"
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Desarrollado por <span className="font-bold" translate="no">Lumen</span>
          </p>
        </div>
      </aside>
      <nav
        aria-label="Navegación principal"
        className="scrollbar-hide fixed inset-x-0 bottom-0 z-40 flex snap-x gap-1 overflow-x-auto border-t border-border bg-background/95 px-2 pt-2 pb-safe backdrop-blur-xl lg:hidden"
      >
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] w-[68px] shrink-0 snap-start touch-manipulation flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
              {active ? <span className="h-1 w-1 rounded-full bg-emerald-400" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
