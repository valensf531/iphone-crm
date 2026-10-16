import type { DolarSnapshot } from "./crm";

const DOLAR_API = "https://dolarapi.com/v1/dolares";

interface DolarApiEntry {
  moneda: string;
  casa: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

async function fetchEntrada(casa: "oficial" | "blue"): Promise<DolarApiEntry | null> {
  try {
    // Timeout corto: si dolarapi cuelga, se usa lo guardado en vez de
    // trabar el request (el abort también cuenta como null).
    const res = await fetch(`${DOLAR_API}/${casa}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as DolarApiEntry;
  } catch {
    return null;
  }
}

/* Cache en memoria por proceso (un contenedor = un cliente): la cotización
   cambia poco y cada navegación disparaba varios fetch externos + INSERTs.
   TTL 5 min + una sola petición en vuelo compartida. */
const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; snap: DolarSnapshot } | null = null;
let inflight: Promise<DolarSnapshot> | null = null;

async function fetchSnapshot(): Promise<DolarSnapshot> {
  const [oficial, blue] = await Promise.all([fetchEntrada("oficial"), fetchEntrada("blue")]);
  const now = new Date().toISOString();
  return {
    oficial: {
      compra: oficial?.compra ?? null,
      venta: oficial?.venta ?? null,
      fechaActualizacion: oficial?.fechaActualizacion ?? now,
    },
    blue: {
      compra: blue?.compra ?? null,
      venta: blue?.venta ?? null,
      fechaActualizacion: blue?.fechaActualizacion ?? now,
    },
    fuente: oficial || blue ? "dolarapi.com" : "sin-datos",
    fecha: now,
  };
}

export async function getDolarSnapshot(): Promise<DolarSnapshot> {
  const now = Date.now();
  if (cached && now - cached.at < SNAPSHOT_TTL_MS) return cached.snap;
  if (!inflight) {
    inflight = fetchSnapshot()
      .then((snap) => {
        cached = { at: Date.now(), snap };
        return snap;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function eligeTipoCambio(snap: DolarSnapshot, preferido: "blue" | "oficial"): number | null {
  const entry = preferido === "blue" ? snap.blue : snap.oficial;
  return entry.venta ?? entry.compra ?? null;
}
