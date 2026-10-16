"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { ConfirmDiscardDialog } from "@/components/ConfirmDiscardDialog";
import {
  esDniValido,
  esTelefonoValido,
  formatearDni,
  limpiarTelefono,
  soloDigitos,
} from "@/lib/crm";
import { Plus, Search, UserCheck } from "lucide-react";

export interface ClienteLite {
  id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
}

export function ClientePicker({
  clientes,
  value,
  onChange,
  onClienteCreado,
}: {
  clientes: ClienteLite[];
  value: string;
  onChange: (id: string) => void;
  onClienteCreado?: (c: ClienteLite) => void;
}) {
  const [q, setQ] = useState("");
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const FORM_INICIAL = { nombre: "", dni: "", telefono: "" };
  const [form, setForm] = useState(FORM_INICIAL);

  const formularioSucio = form.nombre !== "" || form.dni !== "" || form.telefono !== "";
  const guard = useDirtyGuard(formularioSucio);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clientes.slice(0, 8);
    return clientes
      .filter((c) =>
        `${c.nombre} ${c.dni ?? ""} ${c.telefono ?? ""}`.toLowerCase().includes(t)
      )
      .slice(0, 8);
  }, [clientes, q]);

  const seleccionado = clientes.find((c) => c.id === value);

  const crear = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    const dni = soloDigitos(form.dni);
    if (dni && !esDniValido(dni)) {
      toast({ title: "DNI inválido: máximo 8 dígitos", variant: "destructive" });
      return;
    }
    if (!esTelefonoValido(form.telefono)) {
      toast({ title: "Teléfono inválido: máximo 15 dígitos", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: form.nombre.trim(), dni: dni || undefined, telefono: form.telefono || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast({ title: data.error ?? "No se pudo crear el cliente", variant: "destructive" });
      return;
    }
    const nuevo: ClienteLite = {
      id: String(data.id),
      nombre: form.nombre.trim(),
      dni: dni || null,
      telefono: form.telefono || null,
    };
    onClienteCreado?.(nuevo);
    onChange(nuevo.id);
    setQ("");
    setForm(FORM_INICIAL);
    setNuevoOpen(false);
    toast({ title: `Cliente creado: ${nuevo.nombre}`, variant: "success" });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="cliente-buscar">Cliente *</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => setNuevoOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo
        </Button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="cliente-buscar"
          type="search"
          autoComplete="off"
          spellCheck={false}
          className="pl-9"
          placeholder="Buscar por nombre, DNI o teléfono…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {seleccionado ? (
        <p className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold" aria-live="polite">
          <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="min-w-0 truncate">{seleccionado.nombre}</span>
          <span className="ml-auto shrink-0 text-xs font-normal tabular-nums text-muted-foreground">
            {seleccionado.dni ? formatearDni(seleccionado.dni) : ""}
          </span>
        </p>
      ) : null}
      <div className="max-h-44 space-y-1 overflow-y-auto overscroll-contain" role="listbox" aria-label="Clientes">
        {filtrados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
            Sin resultados{clientes.length >= 100 ? ` entre ${clientes.length} clientes` : ""}. Creá uno con Nuevo.
          </p>
        ) : (
          filtrados.map((c) => {
            const active = c.id === value;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={active}
                aria-label={active ? `Quitar selección de ${c.nombre}` : `Seleccionar a ${c.nombre}`}
                onClick={() => onChange(active ? "" : c.id)}
                className={`flex w-full touch-manipulation items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  active
                    ? "border-emerald-500/60 bg-emerald-500/10 font-semibold"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {c.dni ? formatearDni(c.dni) : ""}{c.dni && c.telefono ? " · " : ""}{c.telefono ?? ""}
                </span>
              </button>
            );
          })
        )}
      </div>
      <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
        {clientes.length === 0 ? "Todavía no hay clientes." : `${clientes.length} cliente${clientes.length === 1 ? "" : "s"} en agenda`}
      </p>

      <Dialog open={nuevoOpen} onOpenChange={(v) => { if (!v) guard.guardClose(() => setNuevoOpen(false)); else setNuevoOpen(true); }}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="font-display text-xl">Nuevo cliente</DialogTitle></DialogHeader>
          <div className="grid gap-3">
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
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cli-dni">DNI</Label>
                <Input
                  id="cli-dni"
                  inputMode="numeric"
                  placeholder="12.345.678"
                  value={formatearDni(form.dni)}
                  onChange={(e) => setForm({ ...form, dni: soloDigitos(e.target.value).slice(0, 8) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cli-tel">Teléfono</Label>
                <Input
                  id="cli-tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="+54 9 11…"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: limpiarTelefono(e.target.value) })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Se guarda con los mismos datos del panel Clientes. Email y dirección se completan después como datos extras.</p>
            <Button className="rounded-xl" onClick={crear} disabled={saving || !form.nombre.trim()}>
              {saving ? "Guardando…" : "Crear y seleccionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDiscardDialog open={guard.confirmOpen} onConfirm={guard.confirmDiscard} onCancel={guard.cancelDiscard} />
    </div>
  );
}
