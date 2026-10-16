"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { esDniValido, esTelefonoValido, limpiarTelefono, soloDigitos, formatearDni, DNI_MAX_DIGITOS, TELEFONO_MAX_DIGITOS } from "@/lib/crm";
import { formatARS, formatUSD } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { ConfirmDiscardDialog } from "@/components/ConfirmDiscardDialog";
import { useStoreSettings } from "@/hooks/use-store-settings";
import {
  ArrowLeftRight,
  History,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  direccion?: string | null;
  notas?: string | null;
}

interface Historial {
  cliente: { id: string; nombre: string; dni: string | null; telefono: string | null; email: string | null; direccion?: string | null; notas?: string | null };
  resumen: { compras: number; canjes: number; garantias: number; garantias_vigentes: number; gasto_total_ars: number };
  ventas: { id: string; fecha: string; precio_final_ars: number; metodo_pago: string; modelo: string | null; capacidad: string | null }[];
  canjes: { id: string; fecha: string; modelo_recibido: string; bateria_pct: number; tasacion_final_usd: number; estado: string }[];
  garantias: { id: string; estado: string; fecha_vencimiento: string; dias: number; modelo: string | null }[];
}

const FORM_VACIO = { nombre: "", dni: "", telefono: "", email: "", direccion: "", notas: "" };

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (partes.length === 0) return "?";
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function lineaContacto(c: Pick<Cliente, "dni" | "telefono" | "email">): string {
  const partes: string[] = [];
  if (c.dni) partes.push(`DNI ${formatearDni(String(c.dni))}`);
  if (c.telefono) partes.push(String(c.telefono));
  if (c.email) partes.push(String(c.email));
  return partes.length > 0 ? partes.join(" · ") : "Sin datos de contacto";
}

export default function ClientesPage() {
  const { clientesEnabled } = useStoreSettings();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [items, setItems] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [crearOpen, setCrearOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [historial, setHistorial] = useState<Historial | null>(null);
  const [historialId, setHistorialId] = useState<string | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState(FORM_VACIO);
  const [editInicial, setEditInicial] = useState(FORM_VACIO);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [borrarId, setBorrarId] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  const crearSucio = (Object.keys(FORM_VACIO) as (keyof typeof FORM_VACIO)[]).some((k) => form[k] !== FORM_VACIO[k]);
  const edicionSucia = (Object.keys(FORM_VACIO) as (keyof typeof FORM_VACIO)[]).some((k) => editForm[k] !== editInicial[k]);
  const crearGuard = useDirtyGuard(crearSucio);
  const historialGuard = useDirtyGuard(editando && edicionSucia);

  const load = async () => {
    const res = await fetch("/api/clientes");
    if (res.ok) setItems((await res.json()).clientes);
    setCargando(false);
  };

  useEffect(() => {
    let cancelado = false;
    fetch("/api/clientes").then(async (res) => {
      if (!cancelado && res.ok) setItems((await res.json()).clientes);
      if (!cancelado) setCargando(false);
    });
    return () => { cancelado = true; };
  }, []);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    const digitos = soloDigitos(t);
    return items.filter((c) =>
      c.nombre.toLowerCase().includes(t) ||
      (c.dni && (String(c.dni).includes(digitos) || formatearDni(String(c.dni)).toLowerCase().includes(t))) ||
      (c.telefono && c.telefono.toLowerCase().includes(t)) ||
      (c.email && c.email.toLowerCase().includes(t))
    );
  }, [items, q]);

  const clienteABorrar = borrarId ? items.find((c) => c.id === borrarId) ?? null : null;

  const onDni = (valor: string) => {
    setForm((f) => ({ ...f, dni: soloDigitos(valor).slice(0, DNI_MAX_DIGITOS) }));
  };

  const onTelefono = (valor: string) => {
    const limpio = limpiarTelefono(valor);
    if (soloDigitos(limpio).length > TELEFONO_MAX_DIGITOS) return;
    setForm((f) => ({ ...f, telefono: limpio }));
  };

  const crear = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.nombre.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      document.getElementById("cli-nombre")?.focus();
      return;
    }
    if (form.dni && !esDniValido(form.dni)) {
      toast({ title: "DNI inválido: máximo 8 dígitos numéricos", variant: "destructive" });
      return;
    }
    if (!esTelefonoValido(form.telefono)) {
      toast({ title: "Teléfono inválido: máximo 15 dígitos", variant: "destructive" });
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre.trim(),
        dni: form.dni || undefined,
        telefono: form.telefono || undefined,
        email: form.email.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        notas: form.notas.trim() || undefined,
      }),
    });
    setGuardando(false);
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "Error al guardar", variant: "destructive" });
      return;
    }
    toast({ title: "Cliente creado", description: form.nombre.trim(), variant: "success" });
    setForm(FORM_VACIO);
    setCrearOpen(false);
    load();
  };

  const verHistorial = async (id: string) => {
    setHistorialId(id);
    setCargandoHistorial(true);
    setHistorial(null);
    setEditando(false);
    const res = await fetch(`/api/clientes/${id}`);
    setCargandoHistorial(false);
    if (!res.ok) {
      toast({ title: "No se pudo cargar el historial", variant: "destructive" });
      setHistorialId(null);
      return;
    }
    const data: Historial = await res.json();
    setHistorial(data);
    const inicial = {
      nombre: data.cliente.nombre ?? "",
      dni: soloDigitos(String(data.cliente.dni ?? "")),
      telefono: data.cliente.telefono ?? "",
      email: data.cliente.email ?? "",
      direccion: data.cliente.direccion ?? "",
      notas: data.cliente.notas ?? "",
    };
    setEditForm(inicial);
    setEditInicial(inicial);
  };

  const cerrarHistorial = () => {
    setHistorial(null);
    setHistorialId(null);
    setEditando(false);
    setEditInicial(FORM_VACIO);
  };

  const guardarEdicion = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!historial) return;
    if (!editForm.nombre.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      document.getElementById("cli-edit-nombre")?.focus();
      return;
    }
    if (editForm.dni && !esDniValido(editForm.dni)) {
      toast({ title: "DNI inválido: máximo 8 dígitos numéricos", variant: "destructive" });
      return;
    }
    if (!esTelefonoValido(editForm.telefono)) {
      toast({ title: "Teléfono inválido: máximo 15 dígitos", variant: "destructive" });
      return;
    }
    setGuardandoEdicion(true);
    const res = await fetch(`/api/clientes/${historial.cliente.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: editForm.nombre.trim(),
        dni: editForm.dni || undefined,
        telefono: editForm.telefono || undefined,
        email: editForm.email.trim() || undefined,
        direccion: editForm.direccion.trim() || undefined,
        notas: editForm.notas.trim() || undefined,
      }),
    });
    setGuardandoEdicion(false);
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No se pudo guardar", variant: "destructive" });
      return;
    }
    toast({ title: "Cliente actualizado", description: editForm.nombre.trim(), variant: "success" });
    setEditando(false);
    const [h, l] = await Promise.all([fetch(`/api/clientes/${historial.cliente.id}`), fetch("/api/clientes")]);
    if (h.ok) {
      const data: Historial = await h.json();
      setHistorial(data);
    }
    if (l.ok) setItems((await l.json()).clientes);
  };

  const confirmarBorrado = async () => {
    if (!borrarId || !clienteABorrar) return;
    setBorrando(true);
    const res = await fetch(`/api/clientes/${borrarId}`, { method: "DELETE" });
    setBorrando(false);
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No se pudo borrar", variant: "destructive" });
      return;
    }
    toast({ title: "Cliente borrado", description: clienteABorrar.nombre, variant: "success" });
    setBorrarId(null);
    if (historialId === borrarId) cerrarHistorial();
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Clientes"
        description={
          cargando
            ? "Historial de compras, canjes y garantías por cliente."
            : `${items.length} cliente${items.length === 1 ? "" : "s"} en agenda`
        }
        actions={
          <Button size="lg" className="rounded-2xl" onClick={() => setCrearOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo cliente
          </Button>
        }
      />

      {mounted && !clientesEnabled ? (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border px-4 py-4 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground" aria-hidden="true">
            <Users className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Clientes deshabilitado</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Activá el módulo para gestionar clientes.</p>
            <Button asChild size="sm" className="mt-3 rounded-xl">
              <Link href="/configuracion">Ir a Configuración</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Buscador */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            autoComplete="off"
            spellCheck={false}
            className="rounded-2xl pl-9 pr-9"
            placeholder="Buscar por nombre, DNI, teléfono o email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar clientes"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
          {cargando ? "Cargando…" : q ? `${filtrados.length} de ${items.length}` : `${items.length} cliente${items.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* Listado: filas con divisores, sin cards ni tabla */}
      <section aria-label="Listado de clientes">
        {cargando ? (
          <ul className="divide-y divide-border rounded-2xl border border-border" aria-label="Cargando clientes">
            {["s1", "s2", "s3", "s4", "s5"].map((k) => (
              <li key={k} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-4 w-40 max-w-full animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 w-56 max-w-full animate-pulse rounded-lg bg-muted" />
                </div>
                <div className="h-8 w-24 shrink-0 animate-pulse rounded-lg bg-muted" />
              </li>
            ))}
          </ul>
        ) : filtrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
              {q ? <Search className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
            </span>
            <p className="mt-3 text-sm font-bold">
              {q ? "Sin resultados para esta búsqueda" : "Todavía no hay clientes"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {q
                ? "Probá con otro nombre, DNI o teléfono, o creá el cliente directamente."
                : "Creá el primero para llevar su historial de compras, canjes y garantías."}
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => (q ? setQ("") : setCrearOpen(true))}>
              {q ? "Limpiar búsqueda" : (<><Plus className="h-4 w-4" aria-hidden="true" /> Crear cliente</>)}
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {filtrados.map((c) => {
              const activo = historialId === c.id;
              return (
                <li key={c.id} className={activo ? "bg-accent/50" : undefined}>
                  <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-extrabold text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-400"
                      aria-hidden="true"
                    >
                      {iniciales(c.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{c.nombre}</p>
                      <p className="truncate text-[13px] tabular-nums text-muted-foreground">{lineaContacto(c)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant={activo ? "secondary" : "outline"}
                        className="rounded-xl"
                        onClick={() => verHistorial(c.id)}
                        disabled={cargandoHistorial && activo}
                        aria-label={`Ver historial de ${c.nombre}`}
                      >
                        {cargandoHistorial && activo
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          : <History className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span className="hidden sm:inline">Historial</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-muted-foreground hover:text-destructive"
                        aria-label={`Borrar a ${c.nombre}`}
                        onClick={() => setBorrarId(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Alta de cliente */}
      <Dialog open={crearOpen} onOpenChange={(v) => { if (!v) crearGuard.guardClose(() => setCrearOpen(false)); else setCrearOpen(true); }}>
        <DialogContent aria-describedby={undefined} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Nuevo cliente</DialogTitle>
            <p className="text-sm text-muted-foreground">Solo el nombre es obligatorio. El resto se puede completar después.</p>
          </DialogHeader>
          <form onSubmit={crear} className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cli-nombre">Nombre *</Label>
              <Input
                id="cli-nombre"
                autoComplete="off"
                placeholder="Nombre y apellido"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cli-dni">DNI</Label>
                <Input
                  id="cli-dni"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="12.345.678"
                  value={formatearDni(form.dni)}
                  onChange={(e) => onDni(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Máx. 8 dígitos.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cli-tel">Teléfono</Label>
                <Input
                  id="cli-tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="+54 9 11 1234 5678"
                  value={form.telefono}
                  onChange={(e) => onTelefono(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Máx. 15 dígitos.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cli-email">Email</Label>
              <Input
                id="cli-email"
                type="email"
                autoComplete="off"
                placeholder="cliente@mail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cli-dir">Dirección</Label>
              <Input
                id="cli-dir"
                autoComplete="off"
                placeholder="Calle 123…"
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cli-notas">Notas</Label>
              <Input
                id="cli-notas"
                autoComplete="off"
                placeholder="Preferencia, referido…"
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={guardando || !form.nombre.trim()}>
              {guardando ? "Guardando…" : "Guardar cliente"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Historial */}
      <Dialog open={cargandoHistorial || historial != null} onOpenChange={(v) => { if (!v) historialGuard.guardClose(cerrarHistorial); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {cargandoHistorial ? "Cargando historial…" : historial ? historial.cliente.nombre : "Historial"}
            </DialogTitle>
          </DialogHeader>
          {cargandoHistorial && !historial ? (
            <div className="space-y-3" aria-label="Cargando historial">
              <div className="h-4 w-48 animate-pulse rounded-lg bg-muted" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["a", "b", "c", "d"].map((k) => (
                  <div key={k} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
              <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : null}
          {historial && (
            <div className="space-y-5">
              {/* Perfil del cliente con edición */}
              <section aria-label="Perfil del cliente" className="rounded-2xl border border-border">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-base font-extrabold text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-400"
                    aria-hidden="true"
                  >
                    {iniciales(historial.cliente.nombre)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold tracking-tight">{historial.cliente.nombre}</p>
                    <p className="truncate text-[13px] tabular-nums text-muted-foreground">
                      {historial.cliente.dni ? `DNI ${formatearDni(historial.cliente.dni)}` : "Sin DNI"}
                      {historial.cliente.telefono ? ` · ${historial.cliente.telefono}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={editando ? "secondary" : "outline"}
                    className="shrink-0 rounded-xl"
                    onClick={() => {
                      if (editando) historialGuard.guardClose(() => setEditando(false));
                      else setEditando(true);
                    }}
                    aria-expanded={editando}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{editando ? "Cerrar" : "Editar"}</span>
                  </Button>
                </div>
                {editando ? (
                  <form onSubmit={guardarEdicion} className="grid gap-3 border-t border-border px-4 py-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="cli-edit-nombre">Nombre *</Label>
                      <Input
                        id="cli-edit-nombre"
                        autoComplete="off"
                        value={editForm.nombre}
                        onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cli-edit-dni">DNI</Label>
                        <Input
                          id="cli-edit-dni"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="12.345.678"
                          value={formatearDni(editForm.dni)}
                          onChange={(e) => setEditForm({ ...editForm, dni: soloDigitos(e.target.value).slice(0, DNI_MAX_DIGITOS) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cli-edit-tel">Teléfono</Label>
                        <Input
                          id="cli-edit-tel"
                          inputMode="tel"
                          autoComplete="off"
                          placeholder="+54 9 11…"
                          value={editForm.telefono}
                          onChange={(e) => {
                            const limpio = limpiarTelefono(e.target.value);
                            if (soloDigitos(limpio).length > TELEFONO_MAX_DIGITOS) return;
                            setEditForm({ ...editForm, telefono: limpio });
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="cli-edit-email">Email</Label>
                        <Input
                          id="cli-edit-email"
                          type="email"
                          autoComplete="off"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cli-edit-dir">Dirección</Label>
                        <Input
                          id="cli-edit-dir"
                          autoComplete="off"
                          value={editForm.direccion}
                          onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cli-edit-notas">Notas</Label>
                      <Input
                        id="cli-edit-notas"
                        autoComplete="off"
                        value={editForm.notas}
                        onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" className="rounded-xl" onClick={() => historialGuard.guardClose(() => setEditando(false))} disabled={guardandoEdicion}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="rounded-xl" disabled={guardandoEdicion || !editForm.nombre.trim()}>
                        {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
                      </Button>
                    </div>
                  </form>
                ) : historial.cliente.email || historial.cliente.direccion || historial.cliente.notas ? (
                  <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                    {[historial.cliente.email, historial.cliente.direccion, historial.cliente.notas].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </section>

              <dl className="grid grid-cols-2 divide-x divide-border rounded-2xl border border-border sm:grid-cols-4" aria-label="Resumen del cliente">
                <div className="px-4 py-3 text-center">
                  <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" /> Compras
                  </dt>
                  <dd className="mt-0.5 text-xl font-extrabold tabular-nums">{historial.resumen.compras}</dd>
                </div>
                <div className="px-4 py-3 text-center">
                  <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" /> Canjes
                  </dt>
                  <dd className="mt-0.5 text-xl font-extrabold tabular-nums">{historial.resumen.canjes}</dd>
                </div>
                <div className="px-4 py-3 text-center">
                  <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Vigentes
                  </dt>
                  <dd className="mt-0.5 text-xl font-extrabold tabular-nums">{historial.resumen.garantias_vigentes}</dd>
                </div>
                <div className="bg-emerald-500/5 px-4 py-3 text-center">
                  <dt className="text-xs text-muted-foreground">Gasto total</dt>
                  <dd className="mt-0.5 text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatARS(historial.resumen.gasto_total_ars)}
                  </dd>
                </div>
              </dl>

              <section aria-label="Compras del cliente">
                <h3 className="mb-1.5 text-sm font-bold">Compras ({historial.ventas.length})</h3>
                {historial.ventas.length === 0 ? <p className="text-sm text-muted-foreground">Sin compras.</p> : (
                  <ul className="divide-y divide-border rounded-2xl border border-border">
                    {historial.ventas.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{v.modelo ?? "Equipo"}{v.capacidad ? ` ${v.capacidad}` : ""} <span className="text-muted-foreground">· {String(v.fecha).slice(0, 10)}</span></span>
                        <strong className="shrink-0 tabular-nums">{formatARS(v.precio_final_ars)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-label="Canjes del cliente">
                <h3 className="mb-1.5 text-sm font-bold">Plan canje ({historial.canjes.length})</h3>
                {historial.canjes.length === 0 ? <p className="text-sm text-muted-foreground">Sin canjes.</p> : (
                  <ul className="divide-y divide-border rounded-2xl border border-border">
                    {historial.canjes.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{c.modelo_recibido} · Bat {c.bateria_pct}% <span className="text-muted-foreground">· {String(c.fecha).slice(0, 10)}</span></span>
                        <span className="flex shrink-0 items-center gap-2">
                          <strong className="tabular-nums">{formatUSD(c.tasacion_final_usd)}</strong>
                          <Badge variant={c.estado === "aceptado" ? "success" : "secondary"}>{c.estado}</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-label="Garantías del cliente">
                <h3 className="mb-1.5 text-sm font-bold">Garantías ({historial.garantias.length})</h3>
                {historial.garantias.length === 0 ? <p className="text-sm text-muted-foreground">Sin garantías.</p> : (
                  <ul className="divide-y divide-border rounded-2xl border border-border">
                    {historial.garantias.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{g.modelo ?? "Equipo"} <span className="text-muted-foreground">· vence {String(g.fecha_vencimiento).slice(0, 10)}</span></span>
                        <Badge variant={g.estado === "vigente" ? "success" : g.estado === "en_reclamo" ? "warning" : "secondary"}>{g.estado}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar borrado */}
      <Dialog open={borrarId != null} onOpenChange={(v) => { if (!v && !borrando) setBorrarId(null); }}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Borrar cliente</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {clienteABorrar ? (
                <>¿Borrar a <strong className="text-foreground">{clienteABorrar.nombre}</strong>? Esta acción no se puede deshacer. Solo se puede borrar si no tiene compras, canjes ni garantías.</>
              ) : "¿Borrar este cliente?"}
            </p>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setBorrarId(null)} disabled={borrando}>
              Cancelar
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={confirmarBorrado} disabled={borrando}>
              {borrando ? "Borrando…" : "Borrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog open={crearGuard.confirmOpen} onConfirm={crearGuard.confirmDiscard} onCancel={crearGuard.cancelDiscard} />
      <ConfirmDiscardDialog open={historialGuard.confirmOpen} onConfirm={historialGuard.confirmDiscard} onCancel={historialGuard.cancelDiscard} />
    </div>
  );
}
