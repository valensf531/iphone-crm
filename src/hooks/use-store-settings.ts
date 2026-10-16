"use client";

import { useCallback, useSyncExternalStore } from "react";

const NAME_KEY = "iphone-crm:store-name";
const LOGO_KEY = "iphone-crm:logo";
const CANJE_KEY = "iphone-crm:canje-enabled";
const GARANTIAS_KEY = "iphone-crm:mod-garantias";
const CLIENTES_KEY = "iphone-crm:mod-clientes";
const ACCESORIOS_KEY = "iphone-crm:mod-accesorios";
const ISLA_KEY = "iphone-crm:isla-dolar";
const CAT_KEY = "iphone-crm:acc-categorias";
export const DEFAULT_STORE_NAME = "iPhone CRM";
export const STORE_EVENT = "store-settings-changed";
export const DEFAULT_CATEGORIAS = ["Cargadores", "Cables", "Fundas", "Vidrios templados", "Auriculares", "Otros"];
export const MAX_CATEGORIAS = 20;

function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || DEFAULT_STORE_NAME;
  } catch {
    return DEFAULT_STORE_NAME;
  }
}

function readLogo(): string | null {
  try {
    return localStorage.getItem(LOGO_KEY);
  } catch {
    return null;
  }
}

function readFlag(key: string): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function writeFlag(key: string, enabled: boolean) {
  try {
    localStorage.setItem(key, enabled ? "1" : "0");
  } catch {
    /* almacenamiento privado: se ignora */
  }
}

/* Las categorías se cachean por raw: el snapshot debe ser referencialmente
   estable o useSyncExternalStore re-renderiza en bucle. */
let catCache: { raw: string | null; parsed: string[] } | null = null;

function readCategorias(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CAT_KEY);
  } catch {
    raw = null;
  }
  if (catCache && catCache.raw === raw) return catCache.parsed;
  // raw === null = nunca se tocó -> defaults. raw seteado (incluso "[]") se respeta tal cual.
  let parsed = [...DEFAULT_CATEGORIAS];
  if (raw !== null) {
    try {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr)) {
        const clean = arr
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim().slice(0, 30))
          .filter(Boolean)
          .slice(0, MAX_CATEGORIAS);
        parsed = [...new Set(clean)];
      }
    } catch {
      parsed = [];
    }
  }
  catCache = { raw, parsed };
  return parsed;
}

function subscribe(onChange: () => void) {
  window.addEventListener(STORE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(STORE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function notify() {
  window.dispatchEvent(new Event(STORE_EVENT));
}

/* Ajustes del local + módulos. Persisten en localStorage.
   Los snapshots de servidor devuelven los valores por defecto para que
   el HTML hidratado coincida con el SSR (sin errores de hidratación). */
export function useStoreSettings() {
  const storeName = useSyncExternalStore(subscribe, readName, () => DEFAULT_STORE_NAME);
  const logoUrl = useSyncExternalStore(subscribe, readLogo, () => null);
  const canjeEnabled = useSyncExternalStore(subscribe, () => readFlag(CANJE_KEY), () => true);
  const garantiasEnabled = useSyncExternalStore(subscribe, () => readFlag(GARANTIAS_KEY), () => true);
  const clientesEnabled = useSyncExternalStore(subscribe, () => readFlag(CLIENTES_KEY), () => true);
  const accesoriosEnabled = useSyncExternalStore(subscribe, () => readFlag(ACCESORIOS_KEY), () => true);
  const islaEnabled = useSyncExternalStore(subscribe, () => readFlag(ISLA_KEY), () => true);
  const categorias = useSyncExternalStore(subscribe, readCategorias, () => DEFAULT_CATEGORIAS);

  const setStoreName = useCallback((name: string) => {
    const clean = name.trim().slice(0, 40) || DEFAULT_STORE_NAME;
    try {
      localStorage.setItem(NAME_KEY, clean);
    } catch {
      /* almacenamiento lleno o privado: se ignora */
    }
    notify();
  }, []);

  const setLogo = useCallback((dataUrl: string | null) => {
    try {
      if (dataUrl) localStorage.setItem(LOGO_KEY, dataUrl);
      else localStorage.removeItem(LOGO_KEY);
    } catch {
      /* dataURL muy pesada: se ignora */
    }
    notify();
  }, []);

  const setCanjeEnabled = useCallback((enabled: boolean) => {
    writeFlag(CANJE_KEY, enabled);
    notify();
  }, []);

  const setGarantiasEnabled = useCallback((enabled: boolean) => {
    writeFlag(GARANTIAS_KEY, enabled);
    notify();
  }, []);

  const setClientesEnabled = useCallback((enabled: boolean) => {
    writeFlag(CLIENTES_KEY, enabled);
    notify();
  }, []);

  const setAccesoriosEnabled = useCallback((enabled: boolean) => {
    writeFlag(ACCESORIOS_KEY, enabled);
    notify();
  }, []);
  const setIslaEnabled = useCallback((enabled: boolean) => {
    writeFlag(ISLA_KEY, enabled);
    notify();
  }, []);  const addCategoria = useCallback((nombre: string): string | null => {
    const clean = nombre.trim().slice(0, 30);
    if (!clean) return "Escribí un nombre para la categoría";
    const actual = readCategorias();
    if (actual.some((c) => c.toLowerCase() === clean.toLowerCase())) return "Esa categoría ya existe";
    if (actual.length >= MAX_CATEGORIAS) return `Máximo ${MAX_CATEGORIAS} categorías`;
    try {
      localStorage.setItem(CAT_KEY, JSON.stringify([...actual, clean]));
    } catch {
      return "No se pudo guardar";
    }
    notify();
    return null;
  }, []);

  const removeCategoria = useCallback((nombre: string) => {
    const actual = readCategorias().filter((c) => c !== nombre);
    try {
      // Guardar siempre (incluso []) para no volver a los defaults al borrar todo.
      localStorage.setItem(CAT_KEY, JSON.stringify(actual));
    } catch {
      /* se ignora */
    }
    notify();
  }, []);

  return {
    storeName, logoUrl, setStoreName, setLogo,
    canjeEnabled, setCanjeEnabled,
    garantiasEnabled, setGarantiasEnabled,
    clientesEnabled, setClientesEnabled,
    accesoriosEnabled, setAccesoriosEnabled,
    islaEnabled, setIslaEnabled,
    categorias, addCategoria, removeCategoria,
  };
}
