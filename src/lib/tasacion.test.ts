import { buscarPrecioBase, tasarConLista, validarFilaLista, mapearFilaExcel } from "./tasacion";
import { describe, expect, it } from "vitest";

const LISTA = [
  { modelo: "iPhone 13", bateria_min: 91, bateria_max: 100, precio_toma_usd: 330 },
  { modelo: "iPhone 13", bateria_min: 85, bateria_max: 90, precio_toma_usd: 300 },
  { modelo: "iPhone 12", bateria_min: 0, bateria_max: 100, precio_toma_usd: 250 },
];

describe("lista de precios del plan canje", () => {
  it("encuentra el precio por modelo + rango de batería", () => {
    expect(buscarPrecioBase(LISTA, "iPhone 13", 95)).toEqual({ precio: 330, origen: "lista" });
    expect(buscarPrecioBase(LISTA, "iPhone 13", 88)).toEqual({ precio: 300, origen: "lista" });
    expect(buscarPrecioBase(LISTA, "IPHONE 12", 70)).toEqual({ precio: 250, origen: "lista" });
  });
  it("sin coincidencia usa precio por defecto y lo informa", () => {
    const r = buscarPrecioBase([], "iPhone 13", 95);
    expect(r.origen).toBe("defecto");
    expect(r.precio).toBeGreaterThan(0);
  });
  it("aplica ajustes por estado sobre el precio de lista", () => {
    const base = { modelo: "iPhone 13", bateriaPct: 95, estetica: "a" as const, pantallaOriginal: true, faceidOk: true, icloudDesbloqueado: true };
    const ok = tasarConLista(LISTA, base);
    expect(ok).toMatchObject({ valor: 330, rechazar: false, origen: "lista" });
    const mal = tasarConLista(LISTA, { ...base, estetica: "c", pantallaOriginal: false, faceidOk: false });
    expect(mal.valor).toBe(330 - 40 - 30 - 50);
  });
  it("icloud bloqueado rechaza", () => {
    const r = tasarConLista(LISTA, { modelo: "iPhone 13", bateriaPct: 95, estetica: "a", pantallaOriginal: true, faceidOk: true, icloudDesbloqueado: false });
    expect(r.rechazar).toBe(true);
  });
});

describe("validación e importación de la lista", () => {
  it("valida filas", () => {
    expect(validarFilaLista({ modelo: "iPhone 13", bateria_min: 85, bateria_max: 90, precio_toma_usd: 300 }).fila).toBeDefined();
    expect(validarFilaLista({ modelo: "", bateria_min: 85, bateria_max: 90, precio_toma_usd: 300 }).error).toBeDefined();
    expect(validarFilaLista({ modelo: "iPhone 13", bateria_min: 95, bateria_max: 90, precio_toma_usd: 300 }).error).toBeDefined();
    expect(validarFilaLista({ modelo: "iPhone 13", bateria_min: 85, bateria_max: 90, precio_toma_usd: -5 }).error).toBeDefined();
  });
  it("mapea encabezados alternativos del Excel", () => {
    const m = mapearFilaExcel({ Equipo: "iPhone 12", Desde: 80, Hasta: 100, Precio: 240 });
    expect(m).toMatchObject({ modelo: "iPhone 12", bateria_min: 80, bateria_max: 100, precio_toma_usd: 240 });
  });
});
