"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatARS, formatUSD, arsFromUsd } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { ConfirmDiscardDialog } from "@/components/ConfirmDiscardDialog";
import { useDolar } from "@/hooks/use-dolar";
import { Plus, Search, PackageOpen, Loader2, Trash2, Minus, MoreVertical, Pencil } from "lucide-react";
import { useStoreSettings } from "@/hooks/use-store-settings";

interface Accesorio {
  id: string; nombre: string; categoria: string; cantidad: number;
  precio_venta_usd: number; precio_venta_ars_manual: number | null;
  proveedor: string | null;
}

export default function AccesoriosPage() {
  const { categorias, accesoriosEnabled } = useStoreSettings();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [items, setItems] = useState<Accesorio[]>([]);
  const [q, setQ] = useState("");
  const { blue: dolarBlue } = useDolar();
  const dolar = dolarBlue ?? 1450;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cargando, setCargando] = useState(true);
  const FORM_INICIAL = { nombre: "", categoria: "Cargadores", cantidad: "10", precio_venta_usd: "", precio_venta_ars_manual: "", proveedor: "" };
  const [form, setForm] = useState(FORM_INICIAL);
  const [editando, setEditando] = useState<Accesorio | null>(null);
  const [editForm, setEditForm] = useState({ nombre: "", categoria: "", cantidad: "", precio_venta_usd: "", precio_venta_ars_manual: "", proveedor: "" });
  const [editInicial, setEditInicial] = useState({ nombre: "", categoria: "", cantidad: "", precio_venta_usd: "", precio_venta_ars_manual: "", proveedor: "" });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [borrarAcc, setBorrarAcc] = useState<Accesorio | null>(null);
  const [borrando, setBorrando] = useState(false);

  const crearSucio = (Object.keys(FORM_INICIAL) as (keyof typeof FORM_INICIAL)[]).some((k) => form[k] !== FORM_INICIAL[k]);
  const edicionSucia = (Object.keys(editInicial) as (keyof typeof editInicial)[]).some((k) => editForm[k] !== editInicial[k]);
  const crearGuard = useDirtyGuard(crearSucio);
  const editarGuard = useDirtyGuard(editando != null && edicionSucia);

  const load = async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/accesorios?${params}`);
    if (res.ok) setItems((await res.json()).accesorios);
    setCargando(false);
  };

  // Una sola carga al montar: el debounce de búsqueda saltea el primer
  // render para no duplicar el request inicial.
  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      load();
      return;
    }
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const totalUnidades = useMemo(() => items.reduce((a, i) => a + Number(i.cantidad || 0), 0), [items]);
  const categoriaSel = categorias.includes(form.categoria) ? form.categoria : (categorias[0] ?? "Otros");

  const crear = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.nombre.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      document.getElementById("acc-nombre")?.focus();
      return;
    }
    setSaving(true);
    const res = await fetch("/api/accesorios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre.trim(),
        categoria: categoriaSel,
        cantidad: form.cantidad ? Number(form.cantidad) : 0,
        precio_venta_usd: form.precio_venta_usd ? Number(form.precio_venta_usd) : 0,
        precio_venta_ars_manual: form.precio_venta_ars_manual ? Number(form.precio_venta_ars_manual) : null,
        proveedor: form.proveedor || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No pudimos guardar. Revisá los datos.", variant: "destructive" });
      return;
    }
    toast({ title: "Accesorio agregado", variant: "success" });
    setOpen(false);
    setForm(FORM_INICIAL);
    load();
  };

  const ajustar = async (id: string, delta: number, actual: number) => {
    const nueva = Math.max(0, actual + delta);
    await fetch(`/api/accesorios/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cantidad: nueva }) });
    load();
  };

  const borrar = async () => {
    if (!borrarAcc) return;
    setBorrando(true);
    const res = await fetch(`/api/accesorios/${borrarAcc.id}`, { method: "DELETE" });
    setBorrando(false);
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No se pudo borrar", variant: "destructive" });
      return;
    }
    toast({ title: "Accesorio borrado", description: borrarAcc.nombre, variant: "success" });
    setBorrarAcc(null);
    load();
  };

  const abrirEdicion = (a: Accesorio) => {
    const inicial = {
      nombre: a.nombre ?? "",
      categoria: a.categoria ?? "",
      cantidad: String(a.cantidad ?? 0),
      precio_venta_usd: a.precio_venta_usd != null ? String(a.precio_venta_usd) : "",
      precio_venta_ars_manual: a.precio_venta_ars_manual != null ? String(a.precio_venta_ars_manual) : "",
      proveedor: a.proveedor ?? "",
    };
    setEditForm(inicial);
    setEditInicial(inicial);
    setEditando(a);
  };

  const guardarEdicion = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editando) return;
    if (!editForm.nombre.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      document.getElementById("acc-edit-nombre")?.focus();
      return;
    }
    const cantidad = editForm.cantidad === "" ? 0 : Number(editForm.cantidad);
    const usd = editForm.precio_venta_usd === "" ? 0 : Number(editForm.precio_venta_usd);
    if (!Number.isFinite(cantidad) || cantidad < 0 || !Number.isFinite(usd) || usd < 0) {
      toast({ title: "Cantidad y precio deben ser números válidos", variant: "destructive" });
      return;
    }
    setGuardandoEdicion(true);
    const res = await fetch(`/api/accesorios/${editando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: editForm.nombre.trim(),
        categoria: editForm.categoria.trim() || editando.categoria,
        cantidad: Math.floor(cantidad),
        precio_venta_usd: usd,
        precio_venta_ars_manual: editForm.precio_venta_ars_manual === "" ? null : Number(editForm.precio_venta_ars_manual),
        proveedor: editForm.proveedor.trim() || null,
      }),
    });
    setGuardandoEdicion(false);
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No se pudo guardar", variant: "destructive" });
      return;
    }
    toast({ title: "Accesorio actualizado", description: editForm.nombre.trim(), variant: "success" });
    setEditando(null);
    load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventario"
        title="Accesorios"
        description={`${items.length} productos · ${totalUnidades} unidades`}
        actions={
          <Dialog open={open} onOpenChange={(v) => { if (!v) crearGuard.guardClose(() => setOpen(false)); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl"><Plus className="h-4 w-4" aria-hidden="true" /> Agregar accesorio</Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader><DialogTitle className="font-display text-xl">Nuevo accesorio</DialogTitle></DialogHeader>
              <form onSubmit={crear} className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="acc-nombre">Nombre</Label>
                  <Input id="acc-nombre" name="nombre" autoComplete="off" spellCheck={false} required maxLength={200} placeholder="Cargador 20W USB-C…" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-cat">Categoría</Label>
                  <Select value={categoriaSel} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger id="acc-cat"><SelectValue /></SelectTrigger>
                    <SelectContent>{categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-cant">Cantidad</Label>
                  <Input id="acc-cant" name="cantidad" type="number" inputMode="numeric" min={0} placeholder="10…" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-usd">Precio venta USD</Label>
                  <Input id="acc-usd" name="precio_usd" type="number" inputMode="decimal" step="any" min={0} placeholder="15…" value={form.precio_venta_usd} onChange={(e) => setForm({ ...form, precio_venta_usd: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-ars">Precio ARS manual (opcional)</Label>
                  <Input id="acc-ars" name="precio_ars" type="number" inputMode="decimal" step="any" min={0} autoComplete="off" placeholder="Vacío = automático…" value={form.precio_venta_ars_manual} onChange={(e) => setForm({ ...form, precio_venta_ars_manual: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="acc-prov">Proveedor</Label>
                  <Input id="acc-prov" name="proveedor" autoComplete="off" placeholder="Proveedor…" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
                </div>
                <Button type="submit" className="col-span-2 rounded-xl" disabled={saving}>
                  {saving ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Guardando…</>) : "Guardar accesorio"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {mounted && !accesoriosEnabled ? (
        <Card className="rounded-3xl">
          <CardContent className="flex items-start gap-3 p-5 sm:p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border" aria-hidden="true">
              <PackageOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Accesorios deshabilitado</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Activá el módulo para gestionar accesorios.</p>
              <Button asChild size="sm" className="mt-3 rounded-xl">
                <Link href="/configuracion">Ir a Configuración</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid items-start gap-4">
        <div>
          <Card className="rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Productos <span className="ml-1 tabular-nums text-muted-foreground">· {items.length}</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form role="search" aria-label="Buscar accesorios" onSubmit={(e) => e.preventDefault()}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Label htmlFor="acc-q" className="sr-only">Buscar por nombre, categoría o proveedor</Label>
                  <Input id="acc-q" name="q" type="search" autoComplete="off" spellCheck={false} className="pl-9" placeholder="Buscá por nombre, categoría…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </form>
              <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{items.length} resultado{items.length === 1 ? "" : "s"}</p>
              <div className="cv-auto -mx-1 px-1">
                <Table>
                  <caption className="sr-only">Listado de accesorios con cantidad y precio</caption>
                  <TableHeader><TableRow><TableHead scope="col">Producto</TableHead><TableHead scope="col">Cantidad</TableHead><TableHead scope="col" className="text-right">Precio</TableHead><TableHead scope="col"><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cargando ? (
                      <TableSkeleton rows={6} cols={4} />
                    ) : (
                      items.map((i) => {
                        const ars = i.precio_venta_ars_manual != null ? Number(i.precio_venta_ars_manual) : arsFromUsd(Number(i.precio_venta_usd), dolar);
                        return (
                          <TableRow key={i.id}>
                            <TableCell>
                              <p className="min-w-0 truncate font-semibold text-foreground">{i.nombre}</p>
                              <p className="mt-0.5 min-w-0 truncate text-xs text-muted-foreground">{i.categoria}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="outline" className="h-7 w-7 rounded-lg p-0" aria-label={`Quitar una unidad de ${i.nombre}`} disabled={Number(i.cantidad) <= 0} onClick={() => ajustar(i.id, -1, Number(i.cantidad))}>
                                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                                <span className="w-8 text-center text-sm font-bold tabular-nums">{i.cantidad}</span>
                                <Button size="sm" variant="outline" className="h-7 w-7 rounded-lg p-0" aria-label={`Agregar una unidad de ${i.nombre}`} onClick={() => ajustar(i.id, 1, Number(i.cantidad))}>
                                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="text-sm font-bold tabular-nums text-foreground">{formatUSD(i.precio_venta_usd)}</p>
                              <p className="text-xs tabular-nums text-muted-foreground">{formatARS(ars)}</p>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="rounded-xl" aria-label={`Opciones de ${i.nombre}`}>
                                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => abrirEdicion(i)}>
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => setBorrarAcc(i)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Borrar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {!cargando && items.length === 0 ? (
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted p-4">
                  <PackageOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Sin resultados</p>
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">Probá con otro nombre o agregá tu primer accesorio.</p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editar accesorio: nombre, categoría, cantidad y precios */}
      <Dialog open={editando != null} onOpenChange={(v) => { if (!v) editarGuard.guardClose(() => setEditando(null)); }}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Editar accesorio</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarEdicion} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="acc-edit-nombre">Nombre *</Label>
              <Input id="acc-edit-nombre" autoComplete="off" spellCheck={false} required maxLength={200} value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-edit-cat">Categoría</Label>
              <Select value={categorias.includes(editForm.categoria) ? editForm.categoria : (categorias[0] ?? "Otros")} onValueChange={(v) => setEditForm({ ...editForm, categoria: v })}>
                <SelectTrigger id="acc-edit-cat"><SelectValue /></SelectTrigger>
                <SelectContent>{categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-edit-cant">Cantidad</Label>
              <Input id="acc-edit-cant" type="number" inputMode="numeric" min={0} value={editForm.cantidad} onChange={(e) => setEditForm({ ...editForm, cantidad: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-edit-usd">Precio venta USD</Label>
              <Input id="acc-edit-usd" type="number" inputMode="decimal" step="any" min={0} value={editForm.precio_venta_usd} onChange={(e) => setEditForm({ ...editForm, precio_venta_usd: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-edit-ars">Precio ARS manual (opcional)</Label>
              <Input id="acc-edit-ars" type="number" inputMode="decimal" step="any" min={0} autoComplete="off" placeholder="Vacío = automático…" value={editForm.precio_venta_ars_manual} onChange={(e) => setEditForm({ ...editForm, precio_venta_ars_manual: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="acc-edit-prov">Proveedor</Label>
              <Input id="acc-edit-prov" autoComplete="off" value={editForm.proveedor} onChange={(e) => setEditForm({ ...editForm, proveedor: e.target.value })} />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditando(null)} disabled={guardandoEdicion}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl" disabled={guardandoEdicion || !editForm.nombre.trim()}>
                {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar borrado */}
      <Dialog open={borrarAcc != null} onOpenChange={(v) => { if (!v && !borrando) setBorrarAcc(null); }}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Borrar accesorio</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {borrarAcc ? (
                <>¿Borrar <strong className="text-foreground">{borrarAcc.nombre}</strong>? Esta acción no se puede deshacer.</>
              ) : "¿Borrar este accesorio?"}
            </p>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setBorrarAcc(null)} disabled={borrando}>
              Cancelar
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={borrar} disabled={borrando}>
              {borrando ? "Borrando…" : "Borrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog open={crearGuard.confirmOpen} onConfirm={crearGuard.confirmDiscard} onCancel={crearGuard.cancelDiscard} />
      <ConfirmDiscardDialog open={editarGuard.confirmOpen} onConfirm={editarGuard.confirmDiscard} onCancel={editarGuard.cancelDiscard} />
    </div>
  );
}
