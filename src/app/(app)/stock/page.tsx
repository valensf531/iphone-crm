"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatARS, formatUSD, arsFromUsd } from "@/lib/format";
import { MODELOS } from "@/lib/modelos";
import { useDolar } from "@/hooks/use-dolar";
import { toast } from "@/hooks/use-toast";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { ConfirmDiscardDialog } from "@/components/ConfirmDiscardDialog";
import { Plus, Search, PackageOpen, Loader2, Trash2, MoreVertical, Pencil } from "lucide-react";

interface Item {
  id: string; imei: string; modelo: string; capacidad: string; color: string | null;
  estado_equipo: string; bateria_pct: number | null; estado: string; sellado: boolean;
  precio_venta_usd: number; precio_venta_ars_manual: number | null; proveedor: string | null;
}

export default function StockPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const { blue: dolarBlue } = useDolar();
  const dolar = dolarBlue ?? 1450;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cargando, setCargando] = useState(true);
  const FORM_INICIAL = { imei: "", modelo: "iPhone 13", capacidad: "128GB", color: "", bateria_pct: "90", precio_venta_usd: "", precio_venta_ars_manual: "", proveedor: "", sellado: false };
  const [form, setForm] = useState(FORM_INICIAL);

  const formularioSucio =
    form.imei !== "" || form.modelo !== FORM_INICIAL.modelo || form.capacidad !== FORM_INICIAL.capacidad ||
    form.color !== "" || form.bateria_pct !== FORM_INICIAL.bateria_pct || form.precio_venta_usd !== "" ||
    form.precio_venta_ars_manual !== "" || form.proveedor !== "" || form.sellado !== false;
  const guard = useDirtyGuard(formularioSucio);

  const [editando, setEditando] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState({ modelo: "", capacidad: "", color: "", bateria_pct: "", precio_venta_usd: "", precio_venta_ars_manual: "", proveedor: "", sellado: false });
  const [editInicial, setEditInicial] = useState({ modelo: "", capacidad: "", color: "", bateria_pct: "", precio_venta_usd: "", precio_venta_ars_manual: "", proveedor: "", sellado: false });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [borrarItem, setBorrarItem] = useState<Item | null>(null);
  const [borrando, setBorrando] = useState(false);

  const edicionSucia =
    editForm.modelo !== editInicial.modelo || editForm.capacidad !== editInicial.capacidad ||
    editForm.color !== editInicial.color || editForm.bateria_pct !== editInicial.bateria_pct ||
    editForm.precio_venta_usd !== editInicial.precio_venta_usd ||
    editForm.precio_venta_ars_manual !== editInicial.precio_venta_ars_manual ||
    editForm.proveedor !== editInicial.proveedor || editForm.sellado !== editInicial.sellado;
  const editarGuard = useDirtyGuard(editando != null && edicionSucia);

  const load = async () => {
    const params = new URLSearchParams();
    params.set("estado", "disponible");
    const res = await fetch(`/api/stock?${params}`);
    if (res.ok) setItems((await res.json()).stock);
    setCargando(false);
  };

  // Carga inicial del disponible (el filtrado es local).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);
  // Filtros de búsqueda (todo local e instantáneo)
  const [fModelo, setFModelo] = useState("");
  const [fCap, setFCap] = useState("");
  const [fColor, setFColor] = useState("");
  const [fBatMin, setFBatMin] = useState("");
  const [fBatMax, setFBatMax] = useState("");
  const [fPrecioMin, setFPrecioMin] = useState("");
  const [fPrecioMax, setFPrecioMax] = useState("");

  const colores = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) if (i.color?.trim()) set.add(i.color.trim());
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [items]);

  const hayFiltros = q.trim() !== "" || fModelo !== "" || fCap !== "" || fColor !== "" ||
    fBatMin !== "" || fBatMax !== "" || fPrecioMin !== "" || fPrecioMax !== "";

  const limpiarFiltros = () => {
    setQ(""); setFModelo(""); setFCap(""); setFColor("");
    setFBatMin(""); setFBatMax(""); setFPrecioMin(""); setFPrecioMax("");
  };

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const batMin = fBatMin === "" ? null : Number(fBatMin);
    const batMax = fBatMax === "" ? null : Number(fBatMax);
    const preMin = fPrecioMin === "" ? null : Number(fPrecioMin);
    const preMax = fPrecioMax === "" ? null : Number(fPrecioMax);
    return items.filter((i) => {
      if (t && !`${i.imei} ${i.modelo} ${i.capacidad} ${i.color ?? ""}`.toLowerCase().includes(t)) return false;
      if (fModelo && i.modelo !== fModelo) return false;
      if (fCap && i.capacidad !== fCap) return false;
      if (fColor && (i.color ?? "").trim() !== fColor) return false;
      // Sellado = equipo nuevo = 100% de batería.
      const bat = i.bateria_pct != null ? Number(i.bateria_pct) : (i.sellado ? 100 : null);
      if (batMin != null && Number.isFinite(batMin) && (bat == null || bat < batMin)) return false;
      if (batMax != null && Number.isFinite(batMax) && (bat == null || bat > batMax)) return false;
      const precio = Number(i.precio_venta_usd || 0);
      if (preMin != null && Number.isFinite(preMin) && precio < preMin) return false;
      if (preMax != null && Number.isFinite(preMax) && precio > preMax) return false;
      return true;
    });
  }, [items, q, fModelo, fCap, fColor, fBatMin, fBatMax, fPrecioMin, fPrecioMax]);

  const total = useMemo(() => filtrados.reduce((a, i) => a + Number(i.precio_venta_usd || 0), 0), [filtrados]);

  const crear = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.imei.trim() || !form.precio_venta_usd) {
      toast({ title: "Completá IMEI y precio en USD", variant: "destructive" });
      document.getElementById("stock-imei")?.focus();
      return;
    }
    setSaving(true);
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imei: form.imei.trim(),
        modelo: form.modelo,
        capacidad: form.capacidad,
        color: form.color || null,
        bateria_pct: form.sellado || !form.bateria_pct ? null : Number(form.bateria_pct),
        precio_venta_usd: form.precio_venta_usd ? Number(form.precio_venta_usd) : 0,
        precio_venta_ars_manual: form.precio_venta_ars_manual ? Number(form.precio_venta_ars_manual) : null,
        proveedor: form.proveedor || null,
        sellado: form.sellado,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No pudimos guardar. Revisá los datos.", variant: "destructive" });
      return;
    }
    toast({ title: "iPhone agregado al stock", variant: "success" });
    setOpen(false);
    setForm(FORM_INICIAL);
    load();
  };

  const borrarEquipo = async () => {
    if (!borrarItem) return;
    setBorrando(true);
    const res = await fetch(`/api/stock/${borrarItem.id}`, { method: "DELETE" });
    setBorrando(false);
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No se pudo borrar", variant: "destructive" });
      return;
    }
    toast({ title: "Equipo borrado del stock", description: `${borrarItem.modelo} ${borrarItem.capacidad}`, variant: "success" });
    setBorrarItem(null);
    load();
  };

  const abrirEdicion = (item: Item) => {
    const inicial = {
      modelo: item.modelo ?? "",
      capacidad: item.capacidad ?? "",
      color: item.color ?? "",
      bateria_pct: item.bateria_pct != null ? String(item.bateria_pct) : "",
      precio_venta_usd: item.precio_venta_usd != null ? String(item.precio_venta_usd) : "",
      precio_venta_ars_manual: item.precio_venta_ars_manual != null ? String(item.precio_venta_ars_manual) : "",
      proveedor: item.proveedor ?? "",
      sellado: item.sellado === true,
    };
    setEditForm(inicial);
    setEditInicial(inicial);
    setEditando(item);
  };

  const guardarEdicion = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editando) return;
    const usd = editForm.precio_venta_usd === "" ? 0 : Number(editForm.precio_venta_usd);
    if (!Number.isFinite(usd) || usd < 0) {
      toast({ title: "El precio en USD debe ser un número válido", variant: "destructive" });
      return;
    }
    setGuardandoEdicion(true);
    const res = await fetch(`/api/stock/${editando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelo: editForm.modelo,
        capacidad: editForm.capacidad,
        color: editForm.color.trim() || null,
        bateria_pct: editForm.sellado || editForm.bateria_pct === "" ? null : Number(editForm.bateria_pct),
        precio_venta_usd: usd,
        precio_venta_ars_manual: editForm.precio_venta_ars_manual === "" ? null : Number(editForm.precio_venta_ars_manual),
        proveedor: editForm.proveedor.trim() || null,
        sellado: editForm.sellado,
      }),
    });
    setGuardandoEdicion(false);
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No se pudo guardar", variant: "destructive" });
      return;
    }
    toast({ title: "Equipo actualizado", description: `${editForm.modelo} ${editForm.capacidad}`, variant: "success" });
    setEditando(null);
    load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inventario"
        title="Stock por IMEI"
        description={hayFiltros ? `${filtrados.length} de ${items.length} equipos · valorizado ${formatUSD(total)}` : `${items.length} equipos · valorizado ${formatUSD(total)} · dólar ${formatARS(dolar)}`}
        actions={
        <Dialog open={open} onOpenChange={(v) => { if (!v) guard.guardClose(() => setOpen(false)); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-2xl"><Plus className="h-4 w-4" aria-hidden="true" /> Agregar iPhone</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle className="font-display text-xl">Nuevo iPhone</DialogTitle></DialogHeader>
            <form onSubmit={crear} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="stock-imei">IMEI (15 dígitos)</Label>
                <Input id="stock-imei" name="imei" inputMode="numeric" autoComplete="off" spellCheck={false} required minLength={15} maxLength={15} placeholder="3534…" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-modelo">Modelo</Label>
                <Select value={form.modelo} onValueChange={(v) => setForm({ ...form, modelo: v })}>
                  <SelectTrigger id="stock-modelo"><SelectValue /></SelectTrigger>
                  <SelectContent>{MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-cap">Capacidad</Label>
                <Select value={form.capacidad} onValueChange={(v) => setForm({ ...form, capacidad: v })}>
                  <SelectTrigger id="stock-cap"><SelectValue /></SelectTrigger>
                  <SelectContent>{["64GB", "128GB", "256GB", "512GB", "1TB"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-color">Color</Label>
                <Input id="stock-color" name="color" autoComplete="off" placeholder="Negro…" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-bat">Batería %</Label>
                <Input id="stock-bat" name="bateria" type="number" inputMode="numeric" min={0} max={100} placeholder={form.sellado ? "No aplica (sellado)" : "90…"} value={form.sellado ? "" : form.bateria_pct} disabled={form.sellado} onChange={(e) => setForm({ ...form, bateria_pct: e.target.value })} />
                {form.sellado ? <p className="text-xs text-muted-foreground">Equipo nuevo sellado: no lleva % de batería.</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-usd">Precio venta USD</Label>
                <Input id="stock-usd" name="precio_usd" type="number" inputMode="decimal" step="any" min={0} required placeholder="450…" value={form.precio_venta_usd} onChange={(e) => setForm({ ...form, precio_venta_usd: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-ars">Precio ARS manual (opcional)</Label>
                <Input id="stock-ars" name="precio_ars" type="number" inputMode="decimal" step="any" min={0} autoComplete="off" placeholder="Vacío = automático…" value={form.precio_venta_ars_manual} onChange={(e) => setForm({ ...form, precio_venta_ars_manual: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="stock-prov">Proveedor</Label>
                <Input id="stock-prov" name="proveedor" autoComplete="off" placeholder="Proveedor…" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
              </div>
              <label htmlFor="stock-sellado" className="col-span-2 flex cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl border border-input bg-control px-3.5 py-2.5 text-sm font-semibold">
                <input
                  id="stock-sellado"
                  name="sellado"
                  type="checkbox"
                  checked={form.sellado}
                  onChange={(e) => setForm({ ...form, sellado: e.target.checked, bateria_pct: e.target.checked ? "" : form.bateria_pct })}
                  className="h-4 w-4 shrink-0 accent-emerald-600"
                />
                Sellado de fábrica
              </label>
              <Button type="submit" className="col-span-2 rounded-xl" disabled={saving}>
                {saving ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Guardando…</>) : "Guardar iPhone"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      <ConfirmDiscardDialog open={guard.confirmOpen} onConfirm={guard.confirmDiscard} onCancel={guard.cancelDiscard} />

      <div className="grid items-start gap-4">
        <div>
          <Card className="rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Equipos <span className="ml-1 tabular-nums text-muted-foreground">· {filtrados.length}</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form role="search" aria-label="Buscar en stock" onSubmit={(e) => e.preventDefault()}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Label htmlFor="stock-q" className="sr-only">Buscar por IMEI, modelo o color</Label>
                  <Input id="stock-q" name="q" type="search" autoComplete="off" spellCheck={false} className="pl-9" placeholder="Buscá por IMEI, modelo, color…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </form>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Filtros de stock">
                <div className="space-y-1">
                  <Label htmlFor="stock-f-modelo" className="text-xs">Modelo</Label>
                  <Select value={fModelo || "todos"} onValueChange={(v) => setFModelo(v === "todos" ? "" : v)}>
                    <SelectTrigger id="stock-f-modelo" className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stock-f-cap" className="text-xs">Almacenamiento</Label>
                  <Select value={fCap || "todas"} onValueChange={(v) => setFCap(v === "todas" ? "" : v)}>
                    <SelectTrigger id="stock-f-cap" className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {["64GB", "128GB", "256GB", "512GB", "1TB"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stock-f-color" className="text-xs">Color</Label>
                  <Select value={fColor || "todos"} onValueChange={(v) => setFColor(v === "todos" ? "" : v)}>
                    <SelectTrigger id="stock-f-color" className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {colores.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="stock-f-batmin">Batería % (desde–hasta)</Label>
                  <div className="flex items-center gap-1.5">
                    <Input id="stock-f-batmin" type="number" inputMode="numeric" min={0} max={100} placeholder="0" value={fBatMin} onChange={(e) => setFBatMin(e.target.value)} className="h-9" aria-label="Batería mínima %" />
                    <span className="shrink-0 text-xs text-muted-foreground" aria-hidden="true">–</span>
                    <Input id="stock-f-batmax" type="number" inputMode="numeric" min={0} max={100} placeholder="100" value={fBatMax} onChange={(e) => setFBatMax(e.target.value)} className="h-9" aria-label="Batería máxima %" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="stock-f-premin">Precio USD (desde–hasta)</Label>
                  <div className="flex items-center gap-1.5">
                    <Input id="stock-f-premin" type="number" inputMode="decimal" step="any" min={0} placeholder="0" value={fPrecioMin} onChange={(e) => setFPrecioMin(e.target.value)} className="h-9" aria-label="Precio mínimo USD" />
                    <span className="shrink-0 text-xs text-muted-foreground" aria-hidden="true">–</span>
                    <Input id="stock-f-premax" type="number" inputMode="decimal" step="any" min={0} placeholder="∞" value={fPrecioMax} onChange={(e) => setFPrecioMax(e.target.value)} className="h-9" aria-label="Precio máximo USD" />
                  </div>
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" size="sm" className="h-9 w-full rounded-xl" onClick={limpiarFiltros} disabled={!hayFiltros}>
                    Limpiar
                  </Button>
                </div>
              </div>
              <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {hayFiltros ? `${filtrados.length} de ${items.length} equipos` : `${items.length} resultado${items.length === 1 ? "" : "s"}`}
              </p>
              <div className="cv-auto -mx-1 px-1">
              <Table>
                <caption className="sr-only">Listado de iPhones en stock con IMEI, batería y precio</caption>
                <TableHeader><TableRow><TableHead scope="col">Equipo</TableHead><TableHead scope="col">IMEI&nbsp;/&nbsp;Bat</TableHead><TableHead scope="col" className="text-right">Precio</TableHead><TableHead scope="col"><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                <TableBody>
                  {cargando ? (
                    <TableSkeleton rows={6} cols={4} />
                  ) : (
                    filtrados.map((i) => {
                    const ars = i.precio_venta_ars_manual != null ? Number(i.precio_venta_ars_manual) : arsFromUsd(Number(i.precio_venta_usd), dolar);
                    return (
                      <TableRow key={i.id}>
                        <TableCell>
                          <p className="flex min-w-0 flex-wrap items-center gap-1.5 font-semibold text-foreground">
                            <span className="truncate">{i.modelo} <span className="font-normal tabular-nums text-muted-foreground">{i.capacidad}</span></span>
                            {i.sellado ? <Badge variant="success" className="shrink-0">Sellado</Badge> : null}
                          </p>
                          <p className="mt-0.5 min-w-0 truncate text-xs text-muted-foreground">{i.color ?? "—"}</p>
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-mono tabular-nums text-foreground">{i.imei}</p>
                          {i.sellado ? null : <p className="mt-0.5 tabular-nums text-muted-foreground">Bat {i.bateria_pct ?? "—"}%</p>}
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-sm font-bold tabular-nums text-foreground">{formatUSD(i.precio_venta_usd)}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">{formatARS(ars)}{i.precio_venta_ars_manual != null ? " · manual" : ""}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="rounded-xl" aria-label={`Opciones de ${i.modelo} ${i.capacidad}`}>
                                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => abrirEdicion(i)}>
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => setBorrarItem(i)}
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
              {!cargando && filtrados.length === 0 ? (
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted p-4">
                  <PackageOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Sin resultados</p>
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">
                      {hayFiltros ? "Ningún equipo coincide con esos filtros." : "Probá con otro IMEI o modelo, o cargá un equipo nuevo."}
                    </p>
                    {hayFiltros ? (
                      <Button size="sm" variant="outline" className="mt-3 rounded-xl" onClick={limpiarFiltros}>
                        Limpiar filtros
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editar equipo: modelo, datos, batería, precios y sellado */}
      <Dialog open={editando != null} onOpenChange={(v) => { if (!v) editarGuard.guardClose(() => setEditando(null)); }}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Editar equipo</DialogTitle>
            {editando ? <p className="font-mono text-sm tabular-nums text-muted-foreground">IMEI {editando.imei}</p> : null}
          </DialogHeader>
          <form onSubmit={guardarEdicion} className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="stock-edit-modelo">Modelo</Label>
              <Select value={MODELOS.includes(editForm.modelo) ? editForm.modelo : (MODELOS[0] ?? editForm.modelo)} onValueChange={(v) => setEditForm({ ...editForm, modelo: v })}>
                <SelectTrigger id="stock-edit-modelo"><SelectValue /></SelectTrigger>
                <SelectContent>{MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-edit-cap">Capacidad</Label>
              <Select value={editForm.capacidad} onValueChange={(v) => setEditForm({ ...editForm, capacidad: v })}>
                <SelectTrigger id="stock-edit-cap"><SelectValue /></SelectTrigger>
                <SelectContent>{["64GB", "128GB", "256GB", "512GB", "1TB"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-edit-color">Color</Label>
              <Input id="stock-edit-color" autoComplete="off" value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-edit-bat">Batería %</Label>
              <Input id="stock-edit-bat" type="number" inputMode="numeric" min={0} max={100} placeholder={editForm.sellado ? "No aplica (sellado)" : "90…"} value={editForm.sellado ? "" : editForm.bateria_pct} disabled={editForm.sellado} onChange={(e) => setEditForm({ ...editForm, bateria_pct: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-edit-usd">Precio venta USD</Label>
              <Input id="stock-edit-usd" type="number" inputMode="decimal" step="any" min={0} value={editForm.precio_venta_usd} onChange={(e) => setEditForm({ ...editForm, precio_venta_usd: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-edit-ars">Precio ARS manual (opcional)</Label>
              <Input id="stock-edit-ars" type="number" inputMode="decimal" step="any" min={0} autoComplete="off" placeholder="Vacío = automático…" value={editForm.precio_venta_ars_manual} onChange={(e) => setEditForm({ ...editForm, precio_venta_ars_manual: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="stock-edit-prov">Proveedor</Label>
              <Input id="stock-edit-prov" autoComplete="off" value={editForm.proveedor} onChange={(e) => setEditForm({ ...editForm, proveedor: e.target.value })} />
            </div>
            <label htmlFor="stock-edit-sellado" className="col-span-2 flex cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl border border-input bg-control px-3.5 py-2.5 text-sm font-semibold">
              <input
                id="stock-edit-sellado"
                type="checkbox"
                checked={editForm.sellado}
                onChange={(e) => setEditForm({ ...editForm, sellado: e.target.checked, bateria_pct: e.target.checked ? "" : editForm.bateria_pct })}
                className="h-4 w-4 shrink-0 accent-emerald-600"
              />
              Sellado de fábrica (sin % de batería)
            </label>
            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => editarGuard.guardClose(() => setEditando(null))} disabled={guardandoEdicion}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl" disabled={guardandoEdicion}>
                {guardandoEdicion ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar borrado */}
      <Dialog open={borrarItem != null} onOpenChange={(v) => { if (!v && !borrando) setBorrarItem(null); }}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Borrar equipo</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {borrarItem ? (
                <>¿Borrar <strong className="text-foreground">{borrarItem.modelo} {borrarItem.capacidad}</strong> del stock? Esta acción no se puede deshacer.</>
              ) : "¿Borrar este equipo?"}
            </p>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setBorrarItem(null)} disabled={borrando}>
              Cancelar
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={borrarEquipo} disabled={borrando}>
              {borrando ? "Borrando…" : "Borrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog open={editarGuard.confirmOpen} onConfirm={editarGuard.confirmDiscard} onCancel={editarGuard.cancelDiscard} />
    </div>
  );
}
