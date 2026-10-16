"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { DEFAULT_STORE_NAME, useStoreSettings } from "@/hooks/use-store-settings";
import { toast } from "@/hooks/use-toast";
import { Sun, Moon, Monitor, Store, ImagePlus, Trash2, Check, ArrowLeftRight, Plug, ShieldCheck, Users, Tags, X, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const MODULOS = [
  { key: "canje", label: "Plan Canje", icon: ArrowLeftRight },
  { key: "accesorios", label: "Accesorios", icon: Plug },
  { key: "garantias", label: "Garantías", icon: ShieldCheck },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "isla", label: "Isla del dólar", icon: DollarSign },
] as const;

type ModuloKey = (typeof MODULOS)[number]["key"];

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

const LOGO_MAX_BYTES = 1024 * 1024;

export default function ConfiguracionPage() {
  const { theme, setTheme } = useTheme();
  const {
    storeName, logoUrl, setStoreName, setLogo,
    canjeEnabled, setCanjeEnabled,
    garantiasEnabled, setGarantiasEnabled,
    clientesEnabled, setClientesEnabled,
    accesoriosEnabled, setAccesoriosEnabled,
    islaEnabled, setIslaEnabled,
    categorias, addCategoria, removeCategoria,
  } = useStoreSettings();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [nuevaCat, setNuevaCat] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const modulos: Record<ModuloKey, boolean> = { canje: canjeEnabled, accesorios: accesoriosEnabled, garantias: garantiasEnabled, clientes: clientesEnabled, isla: islaEnabled };
  const setters: Record<ModuloKey, (v: boolean) => void> = { canje: setCanjeEnabled, accesorios: setAccesoriosEnabled, garantias: setGarantiasEnabled, clientes: setClientesEnabled, isla: setIslaEnabled };

  const agregarCategoria = (e?: React.FormEvent) => {
    e?.preventDefault();
    const error = addCategoria(nuevaCat);
    if (error) {
      toast({ title: error, variant: "destructive" });
      return;
    }
    setNuevaCat("");
    toast({ title: "Categoría agregada", variant: "success" });
  };

  // Evita mismatch de hidratación con el tema guardado (solo cliente).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const name = nameDraft ?? storeName;

  if (!mounted) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Cargando configuración">
        <PageHeader eyebrow="Tienda" title="Configuración" description="Cargando…" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-3xl bg-muted" />
          <div className="h-56 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  const saveName = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = name.trim().slice(0, 40);
    if (!clean) {
      toast({ title: "Escribí un nombre para el local", variant: "destructive" });
      document.getElementById("store-name")?.focus();
      return;
    }
    setStoreName(clean);
    document.title = `${clean} · CRM`;
    toast({ title: "Nombre actualizado", variant: "success" });
  };

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Subí un archivo de imagen (PNG, JPG o WebP)", variant: "destructive" });
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast({ title: "Logo muy pesado: máximo 1 MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogo(dataUrl);
      toast({ title: "Logo actualizado", variant: "success" });
    };
    reader.onerror = () => toast({ title: "No pudimos leer el archivo", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tienda"
        title="Configuración"
        description="Tema, módulos, categorías, nombre del local y logo. Se guardan en este dispositivo."
      />

      <div className="mx-auto w-full max-w-2xl space-y-10 pb-4">
        <section aria-labelledby="cfg-apariencia">
          <h2 id="cfg-apariencia" className="text-lg font-bold tracking-tight text-foreground">Apariencia</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Elegí cómo se ve la página.</p>
          <div className="mt-4 space-y-3">
            <div role="radiogroup" aria-label="Tema de la página" className="grid grid-cols-3 gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => {
                const checked = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => {
                      setTheme(value);
                      toast({ title: `Tema ${label.toLowerCase()} activado`, variant: "success" });
                    }}
                    className={cn(
                      "flex touch-manipulation flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 text-sm font-bold transition-[border-color,background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.98]",
                      checked
                        ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                        : "border-input bg-control text-foreground hover:border-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {label}
                    {checked ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Tema actual: {theme === "light" ? "claro" : theme === "dark" ? "oscuro" : "según el sistema"}
            </p>
          </div>
        </section>

        <section aria-labelledby="cfg-modulos" className="border-t border-border pt-8">
          <h2 id="cfg-modulos" className="text-lg font-bold tracking-tight text-foreground">Módulos</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Elegí qué secciones aparecen en el menú.</p>
          <div className="mt-4 space-y-4">
            {MODULOS.map(({ key, label, icon: Icon }) => {
              const enabled = modulos[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {enabled ? "Visible en el menú" : "Oculto del menú"}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Mostrar ${label} en el menú`}
                    onClick={() => {
                      setters[key](!enabled);
                      toast({ title: enabled ? `${label} ocultado` : `${label} activado`, variant: "success" });
                    }}
                    className={cn(
                      "relative h-8 w-[52px] shrink-0 touch-manipulation rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                      enabled ? "bg-emerald-500" : "bg-input"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-1.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-150",
                        enabled ? "left-[26px]" : "left-1"
                      )}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="cfg-categorias" className="border-t border-border pt-8">
          <h2 id="cfg-categorias" className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <Tags className="h-4 w-4" aria-hidden="true" />
            Categorías de accesorios
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Creá las categorías que usás al cargar accesorios.</p>
          <div className="mt-4 space-y-3">
            <form onSubmit={agregarCategoria} className="flex flex-col gap-2 min-[480px]:flex-row">
              <Label htmlFor="nueva-cat" className="sr-only">Nueva categoría</Label>
              <Input
                id="nueva-cat"
                name="categoria"
                autoComplete="off"
                spellCheck={false}
                maxLength={30}
                placeholder="Ej. Soportes…"
                value={nuevaCat}
                onChange={(e) => setNuevaCat(e.target.value)}
              />
              <Button type="submit" className="w-full shrink-0 rounded-xl min-[480px]:w-auto">Agregar</Button>
            </form>
            {categorias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin categorías.</p>
            ) : (
              <ul className="flex flex-wrap gap-2" aria-label="Categorías actuales">
                {categorias.map((c) => (
                  <li key={c} className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted py-1 pl-3 pr-1 text-[13px] font-semibold">
                    <span className="max-w-[12rem] truncate">{c}</span>
                    <button
                      type="button"
                      aria-label={`Quitar categoría ${c}`}
                      onClick={() => {
                        removeCategoria(c);
                        toast({ title: `Categoría ${c} eliminada`, variant: "success" });
                      }}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="cfg-local" className="border-t border-border pt-8">
          <h2 id="cfg-local" className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <Store className="h-4 w-4" aria-hidden="true" />
            Datos del local
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Nombre y logo que se muestran en el menú.</p>
          <div className="mt-4 space-y-5">
            <form onSubmit={saveName} className="space-y-2">
              <Label htmlFor="store-name">Nombre del lugar</Label>
              <div className="flex flex-col gap-2 min-[480px]:flex-row">
                <Input
                  id="store-name"
                  name="store-name"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={40}
                  placeholder={DEFAULT_STORE_NAME}
                  value={name}
                  onChange={(e) => setNameDraft(e.target.value)}
                />
                <Button type="submit" className="w-full shrink-0 rounded-xl min-[480px]:w-auto">
                  Guardar
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // dataURL local del usuario: next/image no optimiza dataURLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={`Logo actual de ${storeName}`}
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-2xl border border-input bg-card object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border" aria-hidden="true">
                    <Store className="h-6 w-6" />
                  </span>
                )}
                <div className="flex min-w-0 flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label="Elegir archivo de logo"
                    onChange={(e) => {
                      onLogoFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {logoUrl ? "Cambiar" : "Subir logo"}
                  </Button>
                  {logoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-destructive hover:text-destructive"
                      onClick={() => {
                        setLogo(null);
                        toast({ title: "Logo eliminado", variant: "success" });
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Quitar
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG o WebP de hasta 1 MB. Se muestra arriba en el menú.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
