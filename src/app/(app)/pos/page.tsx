"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { ClientePicker, type ClienteLite } from "@/components/ClientePicker";
import { formatARS, formatUSD } from "@/lib/format";
import { downscaleImage } from "@/lib/image";
import { toast } from "@/hooks/use-toast";
import { useDolar } from "@/hooks/use-dolar";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { CheckCircle2, ClipboardCheck, ImagePlus, Loader2, Minus, Plug, Plus, Search, ShoppingCart, Smartphone, Trash2 } from "lucide-react";

const MAX_FOTOS = 4;
const METODOS_PAGO = ["efectivo", "transferencia", "tarjeta_debito", "tarjeta_credito", "cuenta_corriente", "otro"] as const;

interface StockItem {
  id: string;
  imei: string;
  modelo: string;
  capacidad: string;
  color: string | null;
  bateria_pct: number | null;
  sellado: boolean;
  precio_venta_usd: number;
}

interface AccesorioItem {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  precio_venta_usd: number;
  precio_venta_ars_manual: number | null;
}

export default function PosPage() {
  const { accesoriosEnabled } = useStoreSettings();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [clientes, setClientes] = useState<ClienteLite[]>([]);
  const [accesorios, setAccesorios] = useState<AccesorioItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscarEquipo, setBuscarEquipo] = useState("");
  const [buscarAcc, setBuscarAcc] = useState("");
  const [accSel, setAccSel] = useState<Record<string, number>>({});
  const [stockId, setStockId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [precioUsd, setPrecioUsd] = useState("");
  const [dolarTipo, setDolarTipo] = useState("blue");
  const [tipoCambio, setTipoCambio] = useState("");
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");
  const [diasGarantia, setDiasGarantia] = useState("30");
  const [comentarios, setComentarios] = useState("");
  const [verifPantalla, setVerifPantalla] = useState("");
  const [verifPiezas, setVerifPiezas] = useState("");
  const [verifDetalles, setVerifDetalles] = useState("");
  const [verifRepro, setVerifRepro] = useState(false);
  const verifCompleta =
    verifPantalla.trim() !== "" && verifPiezas.trim() !== "" && verifDetalles.trim() !== "";
  const [tasas, setTasas] = useState({ blue: "", oficial: "" });
  const [fotos, setFotos] = useState<string[]>([]);
  const [procesandoFotos, setProcesandoFotos] = useState(false);
  const [vendiendo, setVendiendo] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<{ id: string; totalArs: number } | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const { blue: dolarBlue, oficial: dolarOficial } = useDolar();

  const load = async () => {
    const [s, c, a] = await Promise.all([
      fetch("/api/stock?estado=disponible").then((r) => r.json()).catch(() => ({ stock: [] })),
      fetch("/api/clientes").then((r) => r.json()).catch(() => ({ clientes: [] })),
      fetch("/api/accesorios").then((r) => r.json()).catch(() => ({ accesorios: [] })),
    ]);
    setStock(s.stock ?? []);
    setAccesorios(a.accesorios ?? []);
    setClientes(
      (c.clientes ?? []).map((x: Record<string, unknown>) => ({
        id: String(x.id),
        nombre: String(x.nombre ?? ""),
        dni: (x.dni as string | null) ?? null,
        telefono: (x.telefono as string | null) ?? null,
      }))
    );
    setCargando(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // Cotización vía caché compartida (use-dolar, TTL 60s): evita un
  // request extra a /api/dolar en cada montaje del PoS.
  useEffect(() => {
    const t = {
      blue: dolarBlue != null ? String(dolarBlue) : "",
      oficial: dolarOficial != null ? String(dolarOficial) : "",
    };
    setTasas(t);
    setTipoCambio((prev) => prev || (dolarTipo === "oficial" ? t.oficial : t.blue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dolarBlue, dolarOficial]);

  const equiposFiltrados = useMemo(() => {
    const t = buscarEquipo.trim().toLowerCase();
    if (!t) return stock.slice(0, 12);
    return stock
      .filter((s) => `${s.modelo} ${s.imei} ${s.color ?? ""} ${s.capacidad}`.toLowerCase().includes(t))
      .slice(0, 12);
  }, [stock, buscarEquipo]);

  const equipoSel = stock.find((s) => s.id === stockId);
  const accFiltrados = useMemo(() => {
    const t = buscarAcc.trim().toLowerCase();
    const disp = accesorios.filter((a) => Number(a.cantidad) > 0);
    if (!t) return disp.slice(0, 10);
    return disp.filter((a) => `${a.nombre} ${a.categoria}`.toLowerCase().includes(t)).slice(0, 10);
  }, [accesorios, buscarAcc]);

  const accUnitArs = (a: AccesorioItem, tc: number) =>
    a.precio_venta_ars_manual != null ? Number(a.precio_venta_ars_manual) : Math.round(Number(a.precio_venta_usd ?? 0) * tc);

  const equipoArs = useMemo(() => {
    const usd = Number(precioUsd);
    const tc = Number(tipoCambio);
    if (!Number.isFinite(usd) || !Number.isFinite(tc) || tc <= 0) return 0;
    return Math.round(usd * tc);
  }, [precioUsd, tipoCambio]);

  const accesoriosTotalArs = useMemo(() => {
    const tc = Number(tipoCambio);
    if (!Number.isFinite(tc) || tc <= 0) return 0;
    return Object.entries(accSel).reduce((sum, [id, qty]) => {
      const a = accesorios.find((x) => x.id === id);
      if (!a) return sum;
      return sum + accUnitArs(a, tc) * qty;
    }, 0);
  }, [accSel, accesorios, tipoCambio]);

  const totalArs = equipoArs + accesoriosTotalArs;
  const accUnidades = useMemo(() => Object.values(accSel).reduce((a, n) => a + n, 0), [accSel]);

  const cambiarAcc = (id: string, delta: number, max: number) => {
    setAccSel((prev) => {
      const actual = prev[id] ?? 0;
      const next = Math.max(0, Math.min(max, actual + delta));
      if (next === 0) {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const elegirEquipo = (id: string) => {
    setStockId(id);
    const it = stock.find((s) => s.id === id);
    if (it) setPrecioUsd(String(it.precio_venta_usd ?? ""));
  };

  const agregarFotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (fotos.length >= MAX_FOTOS) {
      toast({ title: `Máximo ${MAX_FOTOS} fotos`, variant: "destructive" });
      return;
    }
    setProcesandoFotos(true);
    try {
      const lugar = MAX_FOTOS - fotos.length;
      const elegidas = Array.from(files).slice(0, lugar);
      const reducidas: string[] = [];
      for (const f of elegidas) {
        if (!f.type.startsWith("image/")) continue;
        reducidas.push(await downscaleImage(f));
      }
      setFotos((prev) => [...prev, ...reducidas].slice(0, MAX_FOTOS));
    } catch {
      toast({ title: "No se pudieron procesar las fotos", variant: "destructive" });
    } finally {
      setProcesandoFotos(false);
    }
  };

  const cobrar = async () => {
    if (!stockId) {
      toast({ title: "Elegí un equipo", variant: "destructive" });
      return;
    }
    if (!clienteId) {
      toast({ title: "Elegí o creá un cliente", variant: "destructive" });
      return;
    }
    if (!precioUsd || !tipoCambio) {
      toast({ title: "Falta precio o tipo de cambio", variant: "destructive" });
      return;
    }
    if (!verifCompleta) {
      toast({ title: "Completá la verificación del dispositivo", variant: "destructive" });
      document.getElementById("pos-verif-pantalla")?.focus();
      return;
    }
    setVendiendo(true);
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stock_id: stockId,
        cliente_id: clienteId,
        precio_usd: Number(precioUsd),
        dolar_tipo: dolarTipo,
        tipo_cambio: Number(tipoCambio),
        metodo_pago: metodoPago,
        dias_garantia: Number(diasGarantia),
        notas: comentarios.trim() || undefined,
        verificacion: {
          pantalla: verifPantalla.trim(),
          piezas_cambiadas: verifPiezas.trim(),
          detalles: verifDetalles.trim(),
          repro: verifRepro,
        },
        fotos,
        accesorios: Object.entries(accSel).map(([accesorio_id, cantidad]) => ({ accesorio_id, cantidad })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setVendiendo(false);
    if (!res.ok) {
      toast({ title: data.error ?? "No se pudo cobrar", variant: "destructive" });
      return;
    }
    toast({ title: `Venta cobrada: ${formatARS(data.total_general_ars ?? data.precio_final_ars)}`, variant: "success" });
    setUltimaVenta({ id: String(data.id), totalArs: Number(data.total_general_ars ?? data.precio_final_ars ?? totalArs) });
    setStockId("");
    setPrecioUsd("");
    setComentarios("");
    setVerifPantalla("");
    setVerifPiezas("");
    setVerifDetalles("");
    setVerifRepro(false);
    setFotos([]);
    setBuscarEquipo("");
    setBuscarAcc("");
    setAccSel({});
    void load();
  };

  const nuevaVenta = () => {
    setUltimaVenta(null);
    setClienteId("");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Mostrador"
        title="PoS"
        description={cargando ? "Cargando stock…" : `${stock.length} equipos en stock para cobrar.`}
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link href="/ventas">Ver ventas</Link>
          </Button>
        }
      />

      {ultimaVenta ? (
        <Card className="rounded-3xl border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center gap-3 p-5">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Cobro exitoso · {formatARS(ultimaVenta.totalArs)}</p>
              <p className="text-xs tabular-nums text-muted-foreground">Venta {ultimaVenta.id} · garantía creada</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={nuevaVenta}>Nueva venta</Button>
              <Button asChild size="sm" className="rounded-xl">
                <Link href="/ventas">Ir a ventas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card className="rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Smartphone className="h-4 w-4" aria-hidden="true" /> 1 · Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  autoComplete="off"
                  spellCheck={false}
                  className="pl-9"
                  placeholder="Buscar por IMEI, modelo o color…"
                  value={buscarEquipo}
                  onChange={(e) => setBuscarEquipo(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5" role="listbox" aria-label="Equipos disponibles">
                {cargando ? (
                  <p className="text-sm text-muted-foreground">Cargando…</p>
                ) : equiposFiltrados.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">Sin resultados en stock.</p>
                ) : (
                  equiposFiltrados.map((s) => {
                    const active = s.id === stockId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => elegirEquipo(s.id)}
                        className={`flex w-full touch-manipulation items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          active ? "border-emerald-500/60 bg-emerald-500/10" : "border-border hover:bg-accent"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                            {s.modelo} <span className="font-normal tabular-nums text-muted-foreground">{s.capacidad}</span>
                            {s.sellado ? <Badge variant="success">Sellado</Badge> : null}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-xs tabular-nums text-muted-foreground">{s.imei}</span>
                        </span>
                        <strong className="shrink-0 text-sm font-bold tabular-nums">{formatUSD(s.precio_venta_usd)}</strong>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">2 · Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientePicker
                clientes={clientes}
                value={clienteId}
                onChange={setClienteId}
                onClienteCreado={(c) => setClientes((prev) => [c, ...prev])}
              />
            </CardContent>
          </Card>

          {accesoriosEnabled ? (
            <Card className="rounded-3xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <Plug className="h-4 w-4" aria-hidden="true" /> 3 · Accesorios
                  {accUnidades > 0 ? <Badge variant="secondary">{accUnidades}</Badge> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    type="search"
                    autoComplete="off"
                    spellCheck={false}
                    className="pl-9"
                    placeholder="Buscar funda, cargador…"
                    value={buscarAcc}
                    onChange={(e) => setBuscarAcc(e.target.value)}
                  />
                </div>
                {Object.keys(accSel).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(accSel).map(([id, qty]) => {
                      const a = accesorios.find((x) => x.id === id);
                      if (!a) return null;
                      const tc = Number(tipoCambio) || 0;
                      return (
                        <div key={id} className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => cambiarAcc(id, 1, Number(a.cantidad))}
                            disabled={qty >= Number(a.cantidad)}
                            aria-label={`Agregar uno más de ${a.nombre} (lleva ${qty})`}
                            title="Tocar para sumar uno"
                            className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed"
                          >
                            <span className="block truncate text-sm font-semibold">{a.nombre}</span>
                            <span className="text-xs tabular-nums text-muted-foreground">{formatARS(accUnitArs(a, tc))} c/u</span>
                          </button>
                          <Button size="sm" variant="outline" className="h-10 w-10 rounded-lg p-0" aria-label={`Quitar uno de ${a.nombre}`} onClick={() => cambiarAcc(id, -1, Number(a.cantidad))}>
                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">{qty}</span>
                          <Button size="sm" variant="outline" className="h-10 w-10 rounded-lg p-0" aria-label={`Agregar uno de ${a.nombre}`} disabled={qty >= Number(a.cantidad)} onClick={() => cambiarAcc(id, 1, Number(a.cantidad))}>
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <div className="grid gap-1.5" role="listbox" aria-label="Accesorios disponibles">
                  {accFiltrados.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">Sin accesorios con stock.</p>
                  ) : (
                    accFiltrados
                      .filter((a) => !(a.id in accSel))
                      .map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => cambiarAcc(a.id, 1, Number(a.cantidad))}
                          disabled={Number(a.cantidad) <= 0}
                          className="flex w-full touch-manipulation items-center gap-3 rounded-2xl border border-border px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{a.nombre}</span>
                            <span className="text-xs tabular-nums text-muted-foreground">{a.categoria} · stock {a.cantidad}</span>
                          </span>
                          <strong className="shrink-0 text-sm font-bold tabular-nums">{formatUSD(a.precio_venta_usd)}</strong>
                        </button>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Card className="rounded-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> 4 · Verificación del dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pos-verif-pantalla">Pantalla *</Label>
                <textarea
                  id="pos-verif-pantalla"
                  rows={2}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Estado de la pantalla…"
                  value={verifPantalla}
                  onChange={(e) => setVerifPantalla(e.target.value)}
                  className="flex min-h-[60px] w-full rounded-xl border border-input bg-control px-3 py-2 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pos-verif-piezas">Piezas cambiadas *</Label>
                <textarea
                  id="pos-verif-piezas"
                  rows={2}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Ninguna / batería, módulo…"
                  value={verifPiezas}
                  onChange={(e) => setVerifPiezas(e.target.value)}
                  className="flex min-h-[60px] w-full rounded-xl border border-input bg-control px-3 py-2 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pos-verif-detalles">Detalles *</Label>
                <textarea
                  id="pos-verif-detalles"
                  rows={2}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Observaciones de la revisión…"
                  value={verifDetalles}
                  onChange={(e) => setVerifDetalles(e.target.value)}
                  className="flex min-h-[60px] w-full rounded-xl border border-input bg-control px-3 py-2 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <label htmlFor="pos-verif-repro" className="flex cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl border border-input bg-control px-3.5 py-2.5 text-sm font-semibold">
                <input
                  id="pos-verif-repro"
                  type="checkbox"
                  checked={verifRepro}
                  onChange={(e) => setVerifRepro(e.target.checked)}
                  className="h-4 w-4 shrink-0 accent-emerald-600"
                />
                REPRO
              </label>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl lg:col-span-2 lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" /> 5 · Cobro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pos-precio">Precio USD</Label>
                <Input id="pos-precio" inputMode="decimal" value={precioUsd} onChange={(e) => setPrecioUsd(e.target.value)} placeholder={equipoSel ? String(equipoSel.precio_venta_usd) : "450"} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pos-tc">Tipo de cambio</Label>
                <Input id="pos-tc" inputMode="decimal" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} placeholder="1450" />
              </div>
              <div className="space-y-1.5">
                <Label>Dólar</Label>
                <Select
                  value={dolarTipo}
                  onValueChange={(v) => {
                    setDolarTipo(v);
                    const auto = v === "oficial" ? tasas.oficial : tasas.blue;
                    if (auto) setTipoCambio(auto);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="blue">Blue</SelectItem><SelectItem value="oficial">Oficial</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Método pago</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METODOS_PAGO.map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-[480px]:col-span-2">
                <Label>Garantía</Label>
                <Select value={diasGarantia} onValueChange={setDiasGarantia}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="60">60 días</SelectItem>
                    <SelectItem value="90">90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-[480px]:col-span-2">
                <Label htmlFor="pos-comentarios">Comentarios <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <textarea
                  id="pos-comentarios"
                  rows={2}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Detalle de la entrega, acuerdo con el cliente…"
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  className="flex min-h-[60px] w-full rounded-xl border border-input bg-control px-3 py-2 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Fotos <span className="font-normal text-muted-foreground">(máx. {MAX_FOTOS})</span></Label>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled={procesandoFotos || fotos.length >= MAX_FOTOS} onClick={() => fotoRef.current?.click()}>
                  {procesandoFotos ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Procesando…</> : <><ImagePlus className="h-4 w-4" aria-hidden="true" /> Agregar ({fotos.length}/{MAX_FOTOS})</>}
                </Button>
              </div>
              <input ref={fotoRef} type="file" accept="image/*" multiple className="hidden" aria-label="Elegir fotos" onChange={(e) => { void agregarFotos(e.target.files); e.target.value = ""; }} />
              {fotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {fotos.map((f, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f} alt={`Foto ${i + 1}`} className="aspect-square w-full object-cover" />
                      <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => setFotos((p) => p.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950/70 text-white hover:bg-zinc-950">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-muted p-4" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total a cobrar</p>
              <p className="font-display mt-1 break-words text-3xl font-bold tabular-nums sm:text-4xl">{formatARS(totalArs)}</p>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">Equipo {formatARS(equipoArs)}{accesoriosTotalArs > 0 ? ` + acc. ${formatARS(accesoriosTotalArs)}` : ""}</p>
            </div>

            <Button className="h-auto min-h-12 w-full whitespace-normal rounded-2xl py-3" size="lg" onClick={cobrar} disabled={!stockId || !clienteId || !precioUsd || !tipoCambio || !verifCompleta || vendiendo || procesandoFotos}>
              {vendiendo ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Cobrando…</> : `Cobrar ${formatARS(totalArs)}`}
            </Button>
            {!stockId || !clienteId ? <p className="text-center text-xs text-muted-foreground">Elegí equipo y cliente para cobrar.</p> : !verifCompleta ? <p className="text-center text-xs text-muted-foreground">Completá la verificación del dispositivo para cobrar.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
