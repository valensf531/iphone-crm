import type { TasacionInput } from "./crm";

/* Lista de precios del Plan Canje: cada fila dice cuánto se toma un modelo
   según el rango de % de batería. La carga el dueño (Excel o manual) y el
   cálculo se hace en base a esa lista. */

export interface TasacionRow {
  id?: number;
  modelo: string;
  bateria_min: number;
  bateria_max: number;
  precio_toma_usd: number;
}

/* Precios por defecto si todavía no se cargó lista (origen: 'defecto'). */
const BASE_TOMA_DEFAULT: Record<string, number> = {
  "iphone 11": 180,
  "iphone 12": 250,
  "iphone 12 pro": 300,
  "iphone 13": 330,
  "iphone 13 pro": 420,
  "iphone 14": 400,
  "iphone 14 pro": 550,
  "iphone 15": 550,
  "iphone 15 pro": 700,
  "iphone 16": 700,
  "iphone 16 pro": 900,
};

function bateriaFactorDefault(bateria: number): number {
  if (bateria >= 91) return 1;
  if (bateria >= 85) return 0.9;
  if (bateria >= 80) return 0.78;
  return 0.6;
}

export function normalizaModelo(modelo: string): string {
  return (modelo ?? "").trim().toLowerCase();
}

/* Busca el precio base en la lista por modelo + batería dentro del rango.
   Ante rangos superpuestos gana el de bateria_min más alto (más específico). */
export function buscarPrecioBase(
  lista: TasacionRow[],
  modelo: string,
  bateria: number
): { precio: number; origen: "lista" | "defecto" } {
  const key = normalizaModelo(modelo);
  const candidatos = lista
    .filter(
      (r) =>
        normalizaModelo(r.modelo) === key &&
        Number.isFinite(r.bateria_min) &&
        Number.isFinite(r.bateria_max) &&
        bateria >= r.bateria_min &&
        bateria <= r.bateria_max
    )
    .sort((a, b) => b.bateria_min - a.bateria_min);
  if (candidatos.length > 0) return { precio: Number(candidatos[0].precio_toma_usd), origen: "lista" };
  const base = BASE_TOMA_DEFAULT[key] ?? 150;
  return { precio: Math.round(base * bateriaFactorDefault(bateria)), origen: "defecto" };
}

export interface TasacionResultado {
  valor: number;
  rechazar: boolean;
  motivo?: string;
  origen: "lista" | "defecto";
}

/* Tasación completa: base de la lista + ajustes por estado.
   El precio FINAL siempre lo fija la persona (tasacion_final_usd). */
export function tasarConLista(lista: TasacionRow[], input: TasacionInput): TasacionResultado {
  if (!input.icloudDesbloqueado) {
    return { valor: 0, rechazar: true, motivo: "iCloud bloqueado: se rechaza la toma", origen: "lista" };
  }
  const { precio, origen } = buscarPrecioBase(lista, input.modelo, input.bateriaPct);
  let valor = precio;
  if (input.estetica === "b") valor -= 20;
  if (input.estetica === "c") valor -= 40;
  if (!input.pantallaOriginal) valor -= 30;
  if (!input.faceidOk) valor -= 50;
  return { valor: Math.max(0, Math.round(valor)), rechazar: false, origen };
}

/* Valida una fila de la lista (del Excel o carga manual). */
export function validarFilaLista(raw: Record<string, unknown>): { fila?: TasacionRow; error?: string } {
  const modelo = String(raw.modelo ?? "").trim();
  const bateria_min = Number(raw.bateria_min);
  const bateria_max = Number(raw.bateria_max);
  const precio_toma_usd = Number(raw.precio_toma_usd);
  if (!modelo) return { error: "Falta el modelo" };
  if (!Number.isInteger(bateria_min) || bateria_min < 0 || bateria_min > 100) {
    return { error: `Batería mín inválida en ${modelo}` };
  }
  if (!Number.isInteger(bateria_max) || bateria_max < 0 || bateria_max > 100) {
    return { error: `Batería máx inválida en ${modelo}` };
  }
  if (bateria_min > bateria_max) return { error: `Rango invertido en ${modelo}` };
  if (!Number.isFinite(precio_toma_usd) || precio_toma_usd < 0) {
    return { error: `Precio inválido en ${modelo}` };
  }
  return { fila: { modelo, bateria_min, bateria_max, precio_toma_usd } };
}

/* Acepta encabezados con distintos nombres (Excel del usuario). */
const ALIAS: Record<string, string[]> = {
  modelo: ["modelo", "model", "equipo", "version"],
  bateria_min: ["bateria_min", "bat_min", "bateria min", "desde", "min"],
  bateria_max: ["bateria_max", "bat_max", "bateria max", "hasta", "max"],
  precio_toma_usd: ["precio_toma_usd", "precio", "precio_usd", "toma", "toma_usd", "valor"],
};

function normalizaHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapearFilaExcel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const h = normalizaHeader(String(k));
    for (const [campo, alias] of Object.entries(ALIAS)) {
      if (alias.includes(h)) {
        out[campo] = typeof v === "string" ? v.trim().replace(",", ".") : v;
        break;
      }
    }
  }
  return out;
}
