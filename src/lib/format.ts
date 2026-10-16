const arsFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const usdFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatUSD(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return usdFmt.format(0);
  return usdFmt.format(n);
}

export function formatARS(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return arsFmt.format(0);
  return arsFmt.format(n);
}

export function arsFromUsd(usd: number, tipoCambio: number): number {
  if (!Number.isFinite(usd) || !Number.isFinite(tipoCambio)) return 0;
  return Math.round(usd * tipoCambio);
}

export function usdFromArs(ars: number, tipoCambio: number): number {
  if (!Number.isFinite(ars) || !Number.isFinite(tipoCambio) || tipoCambio <= 0) return 0;
  return Math.round((ars / tipoCambio) * 100) / 100;
}
