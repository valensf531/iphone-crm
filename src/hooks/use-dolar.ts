"use client";

import { useCallback, useEffect, useState } from "react";

export interface DolarData {
  live: {
    oficial: { venta: number | null; compra: number | null };
    blue: { venta: number | null; compra: number | null };
    fuente: string;
  };
  saved: { blue_venta: number; oficial_venta: number } | null;
  preferido: string;
}

/* Cache compartida por pestaña: la isla + las tarjetas + las páginas pedían
   /api/dolar cada una al montar (3-4 requests por navegación). TTL 60s,
   una sola petición en vuelo, y `force` para el refresh manual. */
const SHARED_TTL_MS = 60 * 1000;
let sharedData: DolarData | null = null;
let sharedAt = 0;
let sharedPromise: Promise<DolarData | null> | null = null;

function getShared(force = false): Promise<DolarData | null> {
  if (!force && sharedData && Date.now() - sharedAt < SHARED_TTL_MS) {
    return Promise.resolve(sharedData);
  }
  if (!sharedPromise) {
    sharedPromise = (async () => {
      try {
        const res = await fetch("/api/dolar");
        if (res.ok) {
          sharedData = (await res.json()) as DolarData;
          sharedAt = Date.now();
        }
      } catch {
        /* sin red: se conserva el último valor */
      }
      return sharedData;
    })().finally(() => {
      sharedPromise = null;
    });
  }
  return sharedPromise;
}

/* Cotización compartida Blue/Oficial con refresco cada 5 minutos. */
export function useDolar() {
  const [data, setData] = useState<DolarData | null>(() => sharedData);

  const load = useCallback(async () => {
    setData(await getShared(true));
  }, []);

  useEffect(() => {
    let cancelado = false;
    getShared().then((d) => {
      if (!cancelado) setData(d);
    });
    const t = setInterval(() => {
      getShared(true).then((d) => {
        if (!cancelado) setData(d);
      });
    }, 5 * 60 * 1000);
    return () => {
      cancelado = true;
      clearInterval(t);
    };
  }, []);

  return {
    data,
    reload: load,
    blue: data?.live.blue.venta ?? data?.saved?.blue_venta ?? null,
    oficial: data?.live.oficial.venta ?? data?.saved?.oficial_venta ?? null,
    blueCompra: data?.live.blue.compra ?? null,
    oficialCompra: data?.live.oficial.compra ?? null,
    fuente: data?.live.fuente ?? null,
  };
}
