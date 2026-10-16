export interface DolarRate {
  compra: number | null;
  venta: number | null;
  fechaActualizacion?: string;
}

export interface DolarSnapshot {
  oficial: DolarRate;
  blue: DolarRate;
  fuente: string;
  fecha: string;
}

/* Tasación Plan Canje: base por modelo + % batería, con penalizadores.
   El dueño edita la tabla tasacion_base; esta función es el default inicial. */
const BASE_TOMA: Record<string, number> = {
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

export function bateriaFactor(bateria: number): number {
  if (bateria >= 91) return 1;
  if (bateria >= 85) return 0.9;
  if (bateria >= 80) return 0.78;
  return 0.6;
}

export interface TasacionInput {
  modelo: string;
  bateriaPct: number;
  estetica: "a" | "b" | "c";
  pantallaOriginal: boolean;
  faceidOk: boolean;
  icloudDesbloqueado: boolean;
}

export function tasarCanje(input: TasacionInput): { valor: number; rechazar: boolean; motivo?: string } {
  if (!input.icloudDesbloqueado) {
    return { valor: 0, rechazar: true, motivo: "iCloud bloqueado: se rechaza la toma" };
  }
  const key = input.modelo.trim().toLowerCase();
  const base = BASE_TOMA[key] ?? 150;
  let valor = base * bateriaFactor(input.bateriaPct);
  if (input.estetica === "b") valor -= 20;
  if (input.estetica === "c") valor -= 40;
  if (!input.pantallaOriginal) valor -= 30;
  if (!input.faceidOk) valor -= 50;
  valor = Math.max(0, Math.round(valor));
  return { valor, rechazar: false };
}

export const GARANTIA_TEXTO =
  "Cubre fallas funcionales de hardware/software no provocadas por el usuario (placa, batería, botones, cámaras, FaceID, etc). No cubre rotura de pantalla/vidrios, mojado/humedad, golpes, intervención de terceros, ni jailbreak.";

export function calculaVencimiento(fechaInicio: Date, dias: number): Date {
  const d = new Date(fechaInicio);
  d.setDate(d.getDate() + dias);
  return d;
}

export function normalizaImei(imei: string): string {
  return imei.replace(/\D/g, "").trim();
}

export function esImeiValido(imei: string): boolean {
  const n = normalizaImei(imei);
  return n.length === 15;
}

/* Clientes: DNI máx 8 dígitos, teléfono máx 15 dígitos (tope E.164). */
export const DNI_MAX_DIGITOS = 8;
export const TELEFONO_MAX_DIGITOS = 15;

export function soloDigitos(valor: string): string {
  return (valor ?? "").replace(/\D/g, "");
}

export function esDniValido(dni: string): boolean {
  return /^\d{1,8}$/.test((dni ?? "").trim());
}

export function esTelefonoValido(telefono: string): boolean {
  if (!telefono || telefono.trim() === "") return true;
  const digitos = soloDigitos(telefono);
  return digitos.length >= 1 && digitos.length <= TELEFONO_MAX_DIGITOS;
}

/* Muestra el DNI como xx.xxx.xxx (12.345.678). En DB se guardan los dígitos. */
export function formatearDni(dni: string): string {
  const d = soloDigitos(dni).slice(0, DNI_MAX_DIGITOS);
  if (!d) return "";
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* Limpia el teléfono conservando dígitos y separadores comunes (+ - ( ) espacio). */
export function limpiarTelefono(valor: string): string {
  return (valor ?? "").replace(/[^0-9+\-() ]/g, "").slice(0, 22);
}
