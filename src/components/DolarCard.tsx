"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, DollarSign, Loader2 } from "lucide-react";
import { useDolar } from "@/hooks/use-dolar";
import { formatARS } from "@/lib/format";

export function DolarCard({ compact = false }: { compact?: boolean }) {
  const { data, reload, blue, oficial } = useDolar();
  const [editBlue, setEditBlue] = useState("");
  const [editOficial, setEditOficial] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch("/api/dolar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blue_venta: editBlue ? Number(editBlue) : undefined,
        oficial_venta: editOficial ? Number(editOficial) : undefined,
      }),
    });
    setEditBlue("");
    setEditOficial("");
    setSaving(false);
    reload();
  };

  return (
    <Card className="card-lift h-full rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-[15px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground ring-1 ring-border" aria-hidden="true">
            <DollarSign className="h-4 w-4" />
          </span>
          <span className="min-w-0 truncate">Dólar hoy</span>
        </CardTitle>
        <Button variant="ghost" size="icon" className="shrink-0 rounded-xl" onClick={reload} aria-label="Actualizar cotización">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2.5" aria-live="polite" aria-busy={!data}>
          <div className="rounded-2xl border border-border bg-muted p-3.5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Blue
            </p>
            {blue ? (
              <p className="mt-0.5 text-[22px] font-extrabold tabular-nums tracking-tight text-foreground">{formatARS(blue)}</p>
            ) : (
              <div className="mt-1.5 h-[30px] w-3/4 animate-pulse rounded-lg bg-border" aria-label="Cargando cotización blue" />
            )}
          </div>
          <div className="rounded-2xl border border-border bg-muted p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Oficial</p>
            {oficial ? (
              <p className="mt-0.5 text-[22px] font-extrabold tabular-nums tracking-tight text-foreground">{formatARS(oficial)}</p>
            ) : (
              <div className="mt-1.5 h-[30px] w-3/4 animate-pulse rounded-lg bg-border" aria-label="Cargando cotización oficial" />
            )}
          </div>
        </div>
        <p className="mt-2.5 text-[11px] tabular-nums text-muted-foreground">
          Cotización del dólar{data?.live.fuente ? <> · <span translate="no">{data.live.fuente}</span></> : ""}
        </p>
        {!compact && (
          <form
            className="mt-4 grid grid-cols-2 gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="blue-manual">Blue manual</Label>
              <Input id="blue-manual" name="blue_venta" type="number" inputMode="decimal" step="any" min={0} autoComplete="off" spellCheck={false} placeholder="Ej. 1450…" value={editBlue} onChange={(e) => setEditBlue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oficial-manual">Oficial manual</Label>
              <Input id="oficial-manual" name="oficial_venta" type="number" inputMode="decimal" step="any" min={0} autoComplete="off" spellCheck={false} placeholder="Ej. 1180…" value={editOficial} onChange={(e) => setEditOficial(e.target.value)} />
            </div>
            <Button type="submit" className="col-span-2 mt-1" disabled={saving || (!editBlue && !editOficial)}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Guardando…
                </>
              ) : (
                "Guardar manual"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
