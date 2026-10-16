"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GARANTIA_TEXTO } from "@/lib/crm";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";
import { useStoreSettings } from "@/hooks/use-store-settings";

export default function GarantiasPage() {
  const { garantiasEnabled } = useStoreSettings();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [cargando, setCargando] = useState(true);
  const [motivo, setMotivo] = useState("");

  const load = async () => {
    const res = await fetch("/api/garantias");
    if (res.ok) setItems((await res.json()).garantias);
    setCargando(false);
  };
  useEffect(() => {
    let cancelado = false;
    fetch("/api/garantias").then(async (res) => {
      if (!cancelado && res.ok) setItems((await res.json()).garantias);
      if (!cancelado) setCargando(false);
    });
    return () => { cancelado = true; };
  }, []);

  const reclamo = async (id: string, malUso: boolean) => {
    const res = await fetch("/api/garantias", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, motivo: motivo || "Reclamo", mal_uso: malUso }),
    });
    if (!res.ok) {
      toast({ title: "Error", variant: "destructive" });
      return;
    }
    toast({ title: malUso ? "Reclamo rechazado por mal uso" : "Reclamo abierto", variant: "success" });
    setMotivo("");
    load();
  };

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Postventa" title="Garantías" description={GARANTIA_TEXTO} />
      {mounted && !garantiasEnabled ? (
        <Card className="rounded-3xl">
          <CardContent className="flex items-start gap-3 p-5 sm:p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border" aria-hidden="true">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Garantías deshabilitado</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Activá el módulo para gestionar garantías.</p>
              <Button asChild size="sm" className="mt-3 rounded-xl">
                <Link href="/configuracion">Ir a Configuración</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle className="text-sm font-medium">Vigentes, por vencer y reclamos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Motivo del reclamo…" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Equipo</TableHead><TableHead>Vence</TableHead><TableHead>Estado</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {cargando ? (
                <TableSkeleton rows={5} cols={4} />
              ) : (
                items.map((g) => (
                  <TableRow key={String(g.id)}>
                    <TableCell>{String(g.modelo ?? "")} · {String(g.imei ?? "")}</TableCell>
                    <TableCell className="text-xs tabular-nums">{String(g.fecha_vencimiento ?? "").slice(0, 10)}</TableCell>
                    <TableCell><Badge variant={g.estado === "vigente" ? "success" : g.estado === "en_reclamo" ? "warning" : "secondary"}>{String(g.estado)}</Badge></TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => reclamo(String(g.id), false)}>Reclamo</Button>
                      <Button size="sm" variant="ghost" onClick={() => reclamo(String(g.id), true)}>Mal uso</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {!cargando && items.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Sin garantías cargadas.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
