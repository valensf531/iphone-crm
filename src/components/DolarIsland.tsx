"use client";

import { useState, useSyncExternalStore } from "react";
import { useDolar } from "@/hooks/use-dolar";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RefreshCw, ChevronUp } from "lucide-react";

/* Isla flotante con la cotización: se expande al tocar. Visible salvo que se oculte en ajustes. */
export function DolarIsland() {
  const { blue, oficial, blueCompra, oficialCompra, fuente, reload } = useDolar();
  const { islaEnabled } = useStoreSettings();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);

  if (mounted && !islaEnabled) return null;

  const refresh = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setSpinning(true);
    await reload();
    setSpinning(false);
  };

  return (
    <div className="fixed bottom-24 left-1/2 z-40 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 lg:bottom-6 lg:left-[calc(50%+8.5rem)]">
      <div className="overflow-hidden rounded-2xl border border-border bg-background/95 text-foreground shadow-lg backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Ocultar detalle del dólar" : "Ver detalle del dólar"}
          className="flex touch-manipulation items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
        >
          <span className="flex items-center gap-1.5 text-sm" aria-live="polite">
            <span className="live-dot h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="font-bold uppercase tracking-wide text-muted-foreground">Blue</span>
            <strong className="font-extrabold tabular-nums">{blue ? formatARS(blue) : "—"}</strong>
          </span>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <span className="flex items-center gap-1.5 text-sm" aria-live="polite">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/50" aria-hidden="true" />
            <span className="font-bold uppercase tracking-wide text-muted-foreground">Oficial</span>
            <strong className="font-extrabold tabular-nums">{oficial ? formatARS(oficial) : "—"}</strong>
          </span>
          <ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
        </button>
        {open && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs tabular-nums text-muted-foreground">
            <span className="min-w-0 truncate">
              Compra {blueCompra ? formatARS(blueCompra) : "—"}&nbsp;/ {oficialCompra ? formatARS(oficialCompra) : "—"}
              {fuente ? <span translate="no"> · {fuente}</span> : ""}
            </span>
            <button
              type="button"
              onClick={refresh}
              aria-label="Actualizar cotización"
              className="touch-manipulation rounded-lg p-1.5 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", spinning && "animate-spin")} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
