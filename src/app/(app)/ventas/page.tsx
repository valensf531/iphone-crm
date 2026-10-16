"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatARS, formatUSD } from "@/lib/format";
import { formatearDni } from "@/lib/crm";
import { PageHeader } from "@/components/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Eye, MoreVertical, Plus } from "lucide-react";

const MAX_FOTOS = 4;
const dateTimeFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

interface AccLine {
  id: string;
  nombre: string;
  cantidad: number;
  precio_usd: number;
  precio_final_ars: number;
}

interface Verificacion {
  pantalla: string;
  piezas_cambiadas: string;
  detalles: string;
  repro: boolean;
}

interface Detalle {
  venta: Record<string, unknown>;
  fotos: { id: string; foto: string }[];
  garantia: Record<string, unknown> | null;
  accesorios: AccLine[];
  verificacion: Verificacion | null;
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Record<string, unknown>[]>([]);
  const [cargando, setCargando] = useState(true);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [detalleTitulo, setDetalleTitulo] = useState("");
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const load = async () => {
    const v = await fetch("/api/ventas").then((r) => r.json()).catch(() => ({ ventas: [] }));
    setVentas(v.ventas ?? []);
    setCargando(false);
  };
  useEffect(() => { load(); }, []);

  const verDetalle = async (id: string, titulo: string) => {
    setDetalleTitulo(titulo);
    setDetalle(null);
    setCargandoDetalle(true);
    try {
      const res = await fetch(`/api/ventas/${id}`);
      if (!res.ok) throw new Error();
      setDetalle(await res.json());
    } catch {
      toast({ title: "No se pudo cargar el detalle", variant: "destructive" });
    } finally {
      setCargandoDetalle(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Facturación"
        title="Ventas"
        description="Historial de ventas. Las ventas nuevas se generan en PoS."
        actions={
          <Button asChild size="sm" className="rounded-xl">
            <Link href="/pos"><Plus className="h-4 w-4" aria-hidden="true" /> Vender en PoS</Link>
          </Button>
        }
      />
      <div className="grid items-start gap-4">
        <Card className="rounded-3xl">
          <CardHeader><CardTitle className="text-[15px]">Historial</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Equipo</TableHead><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Total</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {cargando ? (
                  <TableSkeleton rows={5} cols={5} />
                ) : (
                  ventas.map((v) => {
                    const accCount = Number(v.accesorios_count ?? 0);
                    const totalGen = Number(v.precio_final_ars ?? 0) + Number(v.accesorios_total_ars ?? 0);
                    return (
                      <TableRow key={String(v.id)}>
                        <TableCell className="min-w-0">
                          <span className="block min-w-0 truncate font-medium">{String(v.modelo ?? "")}</span>
                          <span className="mt-0.5 block font-mono text-xs tabular-nums text-muted-foreground">{String(v.imei ?? "").slice(-4) ? `··${String(v.imei).slice(-4)}` : ""}</span>
                          {accCount > 0 ? <Badge variant="secondary" className="mt-1">+{accCount} acc.</Badge> : null}
                        </TableCell>
                        <TableCell className="min-w-0 max-w-[10rem] truncate">{String(v.cliente_nombre ?? "—")}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                          {v.fecha ? dateTimeFmt.format(new Date(String(v.fecha))) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="text-sm font-bold tabular-nums">{formatUSD(v.precio_usd as number)}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">{formatARS(totalGen)}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-10 w-10 rounded-lg p-0" aria-label={`Acciones de venta ${String(v.modelo ?? "")}`}>
                                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => verDetalle(String(v.id), `${String(v.modelo ?? "Equipo")} · ${String(v.cliente_nombre ?? "Sin cliente")}`)}>
                                <Eye className="h-4 w-4" aria-hidden="true" /> Ver detalle
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
            {!cargando && ventas.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Todavía no hay ventas. Generá la primera en PoS.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detalleTitulo !== ""} onOpenChange={(v) => { if (!v) { setDetalleTitulo(""); setDetalle(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de venta</DialogTitle>
          </DialogHeader>
          <p className="min-w-0 truncate text-sm text-muted-foreground">{detalleTitulo}</p>
          {cargandoDetalle ? (
            <div className="space-y-3" aria-label="Cargando detalle">
              <div className="h-4 w-48 animate-pulse rounded-lg bg-muted" />
              <div className="grid grid-cols-2 gap-2">
                {["a", "b", "c", "d"].map((k) => <div key={k} className="h-20 animate-pulse rounded-xl bg-muted" />)}
              </div>
            </div>
          ) : detalle ? (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Fecha</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">{detalle.venta.fecha ? dateTimeFmt.format(new Date(String(detalle.venta.fecha))) : "—"}</p>
                </div>
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Precio</p>
                  <p className="mt-1 text-sm font-bold tabular-nums">{formatUSD(detalle.venta.precio_usd as number)}</p>
                  <p className="text-sm tabular-nums text-muted-foreground">{formatARS(detalle.venta.precio_final_ars as number)}</p>
                </div>
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pago</p>
                  <p className="mt-1 text-sm font-semibold">{String(detalle.venta.metodo_pago ?? "—").replace("_", " ")}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">Dólar {String(detalle.venta.dolar_tipo ?? "—")} · TC {String(detalle.venta.tipo_cambio ?? "—")}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Equipo</p>
                  <p className="mt-1 text-sm font-bold">{String(detalle.venta.modelo ?? "—")} {String((detalle.venta as Record<string, unknown>).capacidad ?? "")}</p>
                  <p className="mt-1 font-mono text-xs tabular-nums">IMEI {String(detalle.venta.imei ?? "—")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {String((detalle.venta as Record<string, unknown>).color ?? "—")}
                    {(detalle.venta as Record<string, unknown>).sellado
                      ? " · Sellado"
                      : ` · Bat ${String((detalle.venta as Record<string, unknown>).bateria_pct ?? "—")}% · ${String((detalle.venta as Record<string, unknown>).estado_equipo ?? "")}`}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Cliente</p>
                  <p className="mt-1 text-sm font-bold">{String(detalle.venta.cliente_nombre ?? "—")}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {detalle.venta.cliente_dni ? `DNI ${formatearDni(String(detalle.venta.cliente_dni))}` : "Sin DNI"}
                    {detalle.venta.cliente_telefono ? ` · ${String(detalle.venta.cliente_telefono)}` : ""}
                  </p>
                  {detalle.venta.cliente_email || detalle.venta.cliente_direccion ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {String(detalle.venta.cliente_email ?? "")}{detalle.venta.cliente_email && detalle.venta.cliente_direccion ? " · " : ""}{String(detalle.venta.cliente_direccion ?? "")}
                    </p>
                  ) : null}
                </div>
              </div>

              {detalle.accesorios.length > 0 ? (
                <div className="rounded-2xl border border-border">
                  <p className="px-3 pt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Accesorios ({detalle.accesorios.reduce((a, l) => a + Number(l.cantidad), 0)})</p>
                  <div className="divide-y divide-border">
                    {detalle.accesorios.map((l) => (
                      <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{l.nombre} <span className="text-muted-foreground">× {l.cantidad}</span></span>
                        <strong className="shrink-0 tabular-nums">{formatARS(l.precio_final_ars)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-sm font-bold">
                    <span>Total general</span>
                    <span className="tabular-nums">{formatARS(Number(detalle.venta.precio_final_ars ?? 0) + detalle.accesorios.reduce((a, l) => a + Number(l.precio_final_ars), 0))}</span>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Garantía:</span>
                {detalle.garantia ? (
                  <Badge variant={String(detalle.garantia.estado) === "vigente" ? "success" : "secondary"} className="min-w-0 max-w-full whitespace-normal text-left">
                    {String(detalle.garantia.dias)} días · vence {String(detalle.garantia.fecha_vencimiento).slice(0, 10)} · {String(detalle.garantia.estado)}
                  </Badge>
                ) : <span className="text-muted-foreground">—</span>}
                {Number((detalle.venta as Record<string, unknown>).descuento_canje_usd ?? 0) > 0 ? (
                  <Badge variant="secondary">Descuento canje {formatUSD((detalle.venta as Record<string, unknown>).descuento_canje_usd as number)}</Badge>
                ) : null}
              </div>
              {detalle.verificacion ? (
                <div className="rounded-2xl border border-border p-3">
                  <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Verificación del dispositivo
                    {detalle.verificacion.repro ? <Badge variant="warning">REPRO</Badge> : null}
                  </p>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Pantalla</dt>
                      <dd className="whitespace-pre-wrap text-sm">{detalle.verificacion.pantalla}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Piezas cambiadas</dt>
                      <dd className="whitespace-pre-wrap text-sm">{detalle.verificacion.piezas_cambiadas}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted-foreground">Detalles</dt>
                      <dd className="whitespace-pre-wrap text-sm">{detalle.verificacion.detalles}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
              {detalle.venta.notas ? (
                <div className="rounded-2xl border border-border p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Comentarios</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{String(detalle.venta.notas)}</p>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-bold">Fotos de entrega ({detalle.fotos.length}/{MAX_FOTOS})</p>
                {detalle.fotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Esta venta no tiene fotos.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {detalle.fotos.map((f, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={f.id} src={f.foto} alt={`Foto de entrega ${i + 1}`} loading="lazy" className="aspect-square w-full rounded-2xl border border-border object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
