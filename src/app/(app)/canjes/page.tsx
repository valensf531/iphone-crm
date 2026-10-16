"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatUSD } from "@/lib/format";
import { MODELOS } from "@/lib/modelos";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/ui/skeleton";
import { mapearFilaExcel, validarFilaLista, type TasacionRow } from "@/lib/tasacion";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Plus, Pencil, Trash2, Calculator, ArrowLeftRight } from "lucide-react";
import { useStoreSettings } from "@/hooks/use-store-settings";

interface ListaRow extends TasacionRow {
  id: number;
}

const PLANTILLA: TasacionRow[] = [
  { modelo: "iPhone 11", bateria_min: 91, bateria_max: 100, precio_toma_usd: 180 },
  { modelo: "iPhone 11", bateria_min: 85, bateria_max: 90, precio_toma_usd: 160 },
  { modelo: "iPhone 12", bateria_min: 91, bateria_max: 100, precio_toma_usd: 250 },
  { modelo: "iPhone 13", bateria_min: 91, bateria_max: 100, precio_toma_usd: 330 },
  { modelo: "iPhone 13", bateria_min: 85, bateria_max: 90, precio_toma_usd: 300 },
];

export default function CanjesPage() {
  const { canjeEnabled } = useStoreSettings();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [canjes, setCanjes] = useState<Record<string, unknown>[]>([]);
  const [lista, setLista] = useState<ListaRow[]>([]);
  const [form, setForm] = useState({ modelo_recibido: "iPhone 13", capacidad_recibida: "128GB", imei_recibido: "", bateria_pct: "88", estetica: "a", pantalla_original: true, faceid_ok: true, icloud: true, observaciones: "" });
  const [sugerido, setSugerido] = useState<{ valor: number; origen: string } | null>(null);
  const [precioFinal, setPrecioFinal] = useState("");
  const [calculando, setCalculando] = useState(false);
  const [nueva, setNueva] = useState({ modelo: "", bateria_min: "", bateria_max: "", precio_toma_usd: "" });
  const [editando, setEditando] = useState<number | null>(null);
  const [borrador, setBorrador] = useState({ modelo: "", bateria_min: "", bateria_max: "", precio_toma_usd: "" });
  const [vistaPrevia, setVistaPrevia] = useState<TasacionRow[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCanjes = async () => {
    const res = await fetch("/api/canjes");
    if (res.ok) setCanjes((await res.json()).canjes);
  };
  const loadLista = async () => {
    const res = await fetch("/api/tasacion");
    if (res.ok) setLista((await res.json()).lista ?? []);
  };
  useEffect(() => { Promise.all([loadCanjes(), loadLista()]).finally(() => setCargando(false)); }, []);

  /* --- Tasar: primero calcula el sugerido, el precio final lo pone la persona --- */
  const calcular = async () => {
    setCalculando(true);
    setSugerido(null);
    const res = await fetch("/api/canjes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelo_recibido: form.modelo_recibido,
        capacidad_recibida: form.capacidad_recibida,
        imei_recibido: form.imei_recibido || null,
        bateria_pct: Number(form.bateria_pct),
        estetica: form.estetica,
        pantalla_original: form.pantalla_original,
        faceid_ok: form.faceid_ok,
        icloud_desbloqueado: form.icloud,
        observaciones: form.observaciones || null,
        solo_calculo: true,
      }),
    });
    const data = await res.json();
    setCalculando(false);
    if (!res.ok) {
      toast({ title: data.error ?? "No se pudo calcular", variant: "destructive" });
      return;
    }
    setSugerido({ valor: data.tasacion_auto, origen: data.origen });
    setPrecioFinal(String(data.tasacion_auto));
  };

  const guardar = async () => {
    if (sugerido == null) {
      toast({ title: "Primero calculá el sugerido", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/canjes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelo_recibido: form.modelo_recibido,
        capacidad_recibida: form.capacidad_recibida,
        imei_recibido: form.imei_recibido || null,
        bateria_pct: Number(form.bateria_pct),
        estetica: form.estetica,
        pantalla_original: form.pantalla_original,
        faceid_ok: form.faceid_ok,
        icloud_desbloqueado: form.icloud,
        observaciones: form.observaciones || null,
        tasacion_final_usd: Number(precioFinal),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: data.error ?? "No se pudo guardar", variant: "destructive" });
      return;
    }
    toast({ title: `Tasación guardada en ${formatUSD(data.tasacion_final)}`, variant: "success" });
    setSugerido(null);
    setPrecioFinal("");
    loadCanjes();
  };

  /* --- Lista de precios --- */
  const descargarPlantilla = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      PLANTILLA.map((r) => ({ modelo: r.modelo, bateria_min: r.bateria_min, bateria_max: r.bateria_max, precio_toma_usd: r.precio_toma_usd }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista");
    XLSX.writeFile(wb, "lista-precios-canje.xlsx");
  };

  const leerArchivo = async (file: File) => {
    try {
      let crudos: Record<string, unknown>[] = [];
      if (/\.csv$/i.test(file.name)) {
        const texto = await file.text();
        const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lineas.length < 2) throw new Error("El CSV está vacío");
        const sep = lineas[0].includes(";") ? ";" : ",";
        const headers = lineas[0].split(sep).map((h) => h.trim());
        crudos = lineas.slice(1).map((l) => {
          const celdas = l.split(sep);
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => { obj[h] = (celdas[i] ?? "").trim(); });
          return obj;
        });
      } else {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        crudos = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      }
      const filas: TasacionRow[] = [];
      const errores: string[] = [];
      crudos.forEach((c, i) => {
        const { fila, error } = validarFilaLista(mapearFilaExcel(c));
        if (fila) filas.push(fila);
        else errores.push(`Fila ${i + 2}: ${error}`);
      });
      if (filas.length === 0) {
        toast({ title: errores[0] ?? "No se leyó ninguna fila válida", variant: "destructive" });
        return;
      }
      if (errores.length > 0) toast({ title: `${errores.length} filas con error (se ignoran): ${errores[0]}`, variant: "destructive" });
      setVistaPrevia(filas);
    } catch {
      toast({ title: "No se pudo leer el archivo. Usá el formato de la plantilla.", variant: "destructive" });
    }
  };

  const reemplazarLista = async () => {
    if (!vistaPrevia) return;
    const res = await fetch("/api/tasacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: vistaPrevia }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: data.error ?? "No se pudo guardar la lista", variant: "destructive" });
      return;
    }
    toast({ title: `Lista actualizada: ${data.cantidad} precios`, variant: "success" });
    setVistaPrevia(null);
    if (fileRef.current) fileRef.current.value = "";
    loadLista();
  };

  const agregarFila = async () => {
    const { fila, error } = validarFilaLista({
      modelo: nueva.modelo,
      bateria_min: Number(nueva.bateria_min),
      bateria_max: Number(nueva.bateria_max),
      precio_toma_usd: Number(nueva.precio_toma_usd),
    });
    if (!fila) {
      toast({ title: error ?? "Fila inválida", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/tasacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: [...lista.map((r) => ({ modelo: r.modelo, bateria_min: Number(r.bateria_min), bateria_max: Number(r.bateria_max), precio_toma_usd: Number(r.precio_toma_usd) })), fila] }),
    });
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No se pudo agregar", variant: "destructive" });
      return;
    }
    toast({ title: "Precio agregado", variant: "success" });
    setNueva({ modelo: "", bateria_min: "", bateria_max: "", precio_toma_usd: "" });
    loadLista();
  };

  const empezarEdicion = (r: ListaRow) => {
    setEditando(r.id);
    setBorrador({ modelo: r.modelo, bateria_min: String(r.bateria_min), bateria_max: String(r.bateria_max), precio_toma_usd: String(r.precio_toma_usd) });
  };

  const guardarEdicion = async (id: number) => {
    const { fila, error } = validarFilaLista({
      modelo: borrador.modelo,
      bateria_min: Number(borrador.bateria_min),
      bateria_max: Number(borrador.bateria_max),
      precio_toma_usd: Number(borrador.precio_toma_usd),
    });
    if (!fila) {
      toast({ title: error ?? "Fila inválida", variant: "destructive" });
      return;
    }
    const res = await fetch(`/api/tasacion/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fila),
    });
    if (!res.ok) {
      toast({ title: (await res.json()).error ?? "No se pudo guardar", variant: "destructive" });
      return;
    }
    setEditando(null);
    loadLista();
  };

  const borrarFila = async (id: number) => {
    const res = await fetch(`/api/tasacion/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "No se pudo borrar", variant: "destructive" });
      return;
    }
    loadLista();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Toma de usados"
        title="Plan Canje"
        description="La tasación sale de tu lista de precios. El precio final siempre lo fijás vos."
      />

      {mounted && !canjeEnabled ? (
        <Card className="rounded-3xl">
          <CardContent className="flex items-start gap-3 p-5 sm:p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border" aria-hidden="true">
              <ArrowLeftRight className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Plan Canje deshabilitado</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Activá el módulo para tasar y tomar usados.
              </p>
              <Button asChild size="sm" className="mt-3 rounded-xl">
                <Link href="/configuracion">Ir a Configuración</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold">Tasar equipo recibido</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="canje-modelo">Modelo</Label>
              <Select value={MODELOS.includes(form.modelo_recibido) ? form.modelo_recibido : MODELOS[0]} onValueChange={(v) => setForm({ ...form, modelo_recibido: v })}>
                <SelectTrigger id="canje-modelo"><SelectValue /></SelectTrigger>
                <SelectContent>{MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Batería %</Label><Input inputMode="numeric" value={form.bateria_pct} onChange={(e) => setForm({ ...form, bateria_pct: e.target.value })} /></div>
            <div><Label>IMEI</Label><Input value={form.imei_recibido} onChange={(e) => setForm({ ...form, imei_recibido: e.target.value })} placeholder="Opcional" /></div>
            <div><Label>Estética</Label>
              <Select value={form.estetica} onValueChange={(v) => setForm({ ...form, estetica: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="a">A - Muy bueno</SelectItem><SelectItem value="b">B - Detalles</SelectItem><SelectItem value="c">C - Gastado</SelectItem></SelectContent>
              </Select>
            </div>
            <label className="flex min-h-[44px] cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl border border-input bg-control px-3 py-2 text-sm"><input type="checkbox" checked={form.pantalla_original} onChange={(e) => setForm({ ...form, pantalla_original: e.target.checked })} className="h-4 w-4 shrink-0 accent-emerald-600" /> Pantalla original</label>
            <label className="flex min-h-[44px] cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl border border-input bg-control px-3 py-2 text-sm"><input type="checkbox" checked={form.faceid_ok} onChange={(e) => setForm({ ...form, faceid_ok: e.target.checked })} className="h-4 w-4 shrink-0 accent-emerald-600" /> FaceID OK</label>
            <label className="flex min-h-[44px] cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl border border-input bg-control px-3 py-2 text-sm font-semibold min-[480px]:col-span-2"><input type="checkbox" checked={form.icloud} onChange={(e) => setForm({ ...form, icloud: e.target.checked })} className="h-4 w-4 shrink-0 accent-emerald-600" /> iCloud desbloqueado (obligatorio)</label>
            <div className="min-[480px]:col-span-2"><Label>Observaciones</Label><Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
            <Button className="min-[480px]:col-span-2 rounded-xl" onClick={calcular} disabled={calculando}>
              <Calculator className="h-4 w-4" /> {calculando ? "Calculando…" : "Calcular sugerido"}
            </Button>
            {sugerido != null && (
              <div className="min-[480px]:col-span-2 space-y-3 rounded-xl border border-border bg-muted p-3">
                <p className="text-sm">
                  Sugerido según lista: <strong>{formatUSD(sugerido.valor)}</strong>{" "}
                  <Badge variant={sugerido.origen === "lista" ? "success" : "warning"} className="ml-1">
                    {sugerido.origen === "lista" ? "de tu lista" : "por defecto"}
                  </Badge>
                </p>
                <div>
                  <Label htmlFor="precio-final">Precio final que pagás (lo fijás vos)</Label>
                  <Input id="precio-final" name="precio-final" inputMode="decimal" autoComplete="off" value={precioFinal} onChange={(e) => setPrecioFinal(e.target.value)} />
                </div>
                <Button className="w-full rounded-xl font-bold" onClick={guardar}>Guardar tasación</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold">Historial</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Equipo</TableHead><TableHead>Bat</TableHead><TableHead>Final</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {cargando ? (
                  <TableSkeleton rows={4} cols={4} />
                ) : (
                  canjes.map((c) => (
                    <TableRow key={String(c.id)}>
                      <TableCell>{String(c.modelo_recibido)}</TableCell>
                      <TableCell className="tabular-nums">{String(c.bateria_pct)}%</TableCell>
                      <TableCell className="tabular-nums">{formatUSD(c.tasacion_final_usd as number)}</TableCell>
                      <TableCell><Badge variant={c.estado === "aceptado" ? "success" : "secondary"}>{String(c.estado)}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {!cargando && canjes.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Todavía no hay tasaciones.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-sm font-bold">Lista de precios ({lista.length})</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Subí tu Excel/CSV o cargá filas a mano. Reemplaza la lista anterior.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) leerArchivo(f); }} />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={descargarPlantilla}>
              <Download className="h-4 w-4" /> Plantilla
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Subir Excel/CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {vistaPrevia && (
            <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
              <p className="text-sm font-semibold text-foreground">Se leyeron {vistaPrevia.length} precios válidos. Al confirmar se reemplaza toda la lista actual.</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" className="rounded-xl" onClick={reemplazarLista}>Confirmar reemplazo</Button>
                <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => { setVistaPrevia(null); if (fileRef.current) fileRef.current.value = ""; }}>Cancelar</Button>
              </div>
            </div>
          )}
          <Table>
            <TableHeader><TableRow><TableHead>Modelo</TableHead><TableHead>Bat mín</TableHead><TableHead>Bat máx</TableHead><TableHead>Toma USD</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {cargando ? (
                <TableSkeleton rows={3} cols={5} />
              ) : (
                lista.map((r) => (
                <TableRow key={r.id}>
                  {editando === r.id ? (
                    <>
                      <TableCell><Input value={borrador.modelo} onChange={(e) => setBorrador({ ...borrador, modelo: e.target.value })} className="h-10 min-w-[7rem]" /></TableCell>
                      <TableCell><Input inputMode="numeric" value={borrador.bateria_min} onChange={(e) => setBorrador({ ...borrador, bateria_min: e.target.value })} className="h-10 min-w-[3.5rem]" /></TableCell>
                      <TableCell><Input inputMode="numeric" value={borrador.bateria_max} onChange={(e) => setBorrador({ ...borrador, bateria_max: e.target.value })} className="h-10 min-w-[3.5rem]" /></TableCell>
                      <TableCell><Input inputMode="decimal" value={borrador.precio_toma_usd} onChange={(e) => setBorrador({ ...borrador, precio_toma_usd: e.target.value })} className="h-10 min-w-[5rem]" /></TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-10 rounded-lg px-3" onClick={() => guardarEdicion(r.id)}>OK</Button>
                          <Button size="sm" variant="ghost" className="h-10 w-10 rounded-lg p-0" onClick={() => setEditando(null)}>X</Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="min-w-0 max-w-[9rem] truncate font-medium">{r.modelo}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{Number(r.bateria_min)}%</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{Number(r.bateria_max)}%</TableCell>
                      <TableCell className="whitespace-nowrap font-bold tabular-nums">{formatUSD(Number(r.precio_toma_usd))}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" className="h-10 w-10 rounded-lg p-0" aria-label="Editar" onClick={() => empezarEdicion(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-10 w-10 rounded-lg p-0 text-destructive" aria-label="Borrar" onClick={() => borrarFila(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
              )}
              <TableRow>
                <TableCell><Input value={nueva.modelo} onChange={(e) => setNueva({ ...nueva, modelo: e.target.value })} placeholder="iPhone 14" className="h-10 min-w-[7rem]" /></TableCell>
                <TableCell><Input inputMode="numeric" value={nueva.bateria_min} onChange={(e) => setNueva({ ...nueva, bateria_min: e.target.value })} placeholder="91" className="h-10 min-w-[3.5rem]" /></TableCell>
                <TableCell><Input inputMode="numeric" value={nueva.bateria_max} onChange={(e) => setNueva({ ...nueva, bateria_max: e.target.value })} placeholder="100" className="h-10 min-w-[3.5rem]" /></TableCell>
                <TableCell><Input inputMode="decimal" value={nueva.precio_toma_usd} onChange={(e) => setNueva({ ...nueva, precio_toma_usd: e.target.value })} placeholder="400" className="h-10 min-w-[5rem]" /></TableCell>
                <TableCell><Button size="sm" variant="outline" className="h-10 w-10 rounded-lg p-0" onClick={agregarFila} aria-label="Agregar fila"><Plus className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {!cargando && lista.length === 0 && !vistaPrevia ? (
            <p className="text-sm text-muted-foreground">Sin lista cargada: la tasación usa precios por defecto. Subí tu Excel para trabajar con tus precios.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
