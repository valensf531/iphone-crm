import { esImeiValido, tasarCanje, calculaVencimiento, esDniValido, esTelefonoValido, limpiarTelefono, soloDigitos, formatearDni } from "./crm";
import { arsFromUsd } from "./format";
import { describe, expect, it } from "vitest";

describe("tasación plan canje por batería + modelo", () => {
  it("batería alta vale más que batería baja", () => {
    const alta = tasarCanje({ modelo: "iPhone 13", bateriaPct: 95, estetica: "a", pantallaOriginal: true, faceidOk: true, icloudDesbloqueado: true });
    const baja = tasarCanje({ modelo: "iPhone 13", bateriaPct: 81, estetica: "a", pantallaOriginal: true, faceidOk: true, icloudDesbloqueado: true });
    expect(alta.valor).toBeGreaterThan(baja.valor);
  });
  it("icloud bloqueado rechaza", () => {
    const r = tasarCanje({ modelo: "iPhone 13", bateriaPct: 100, estetica: "a", pantallaOriginal: true, faceidOk: true, icloudDesbloqueado: false });
    expect(r.rechazar).toBe(true);
  });
  it("penaliza pantalla no original y faceid", () => {
    const ok = tasarCanje({ modelo: "iPhone 12", bateriaPct: 90, estetica: "a", pantallaOriginal: true, faceidOk: true, icloudDesbloqueado: true });
    const mal = tasarCanje({ modelo: "iPhone 12", bateriaPct: 90, estetica: "c", pantallaOriginal: false, faceidOk: false, icloudDesbloqueado: true });
    expect(mal.valor).toBeLessThan(ok.valor);
  });
});

describe("imei + moneda", () => {
  it("valida 15 dígitos", () => {
    expect(esImeiValido("353456789012345")).toBe(true);
    expect(esImeiValido("123")).toBe(false);
  });
  it("convierte usd a ars", () => {
    expect(arsFromUsd(100, 1400)).toBe(140000);
  });
  it("vencimiento garantía suma días", () => {
    const v = calculaVencimiento(new Date("2026-01-01"), 90);
    expect(v.toISOString().slice(0, 10)).toBe("2026-04-01");
  });
});

describe("dni (máx 8) y teléfono (máx 15)", () => {
  it("dni acepta hasta 8 dígitos", () => {
    expect(esDniValido("12345678")).toBe(true);
    expect(esDniValido("1234567")).toBe(true);
    expect(esDniValido("123456789")).toBe(false);
    expect(esDniValido("12a4567")).toBe(false);
  });
  it("teléfono acepta hasta 15 dígitos", () => {
    expect(esTelefonoValido("+54 9 11 1234 5678")).toBe(true);
    expect(esTelefonoValido("123456789012345")).toBe(true);
    expect(esTelefonoValido("1234567890123456")).toBe(false);
    expect(esTelefonoValido("")).toBe(true);
  });
  it("limpia caracteres raros del teléfono", () => {
    expect(limpiarTelefono("+54 9 (11) 1234-5678 ext.5")).toBe("+54 9 (11) 1234-5678 5");
    expect(soloDigitos("+54 9 11 1234 5678")).toHaveLength(13);
  });
  it("formatea el dni como xx.xxx.xxx", () => {
    expect(formatearDni("12345678")).toBe("12.345.678");
    expect(formatearDni("1234567")).toBe("1.234.567");
    expect(formatearDni("12.345.678")).toBe("12.345.678");
    expect(formatearDni("")).toBe("");
  });
});
