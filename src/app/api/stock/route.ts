import { NextRequest, NextResponse } from "next/server";
import { requireAccess, requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";
import { esImeiValido, normalizaImei } from "@/lib/crm";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(req: NextRequest) {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const estado = searchParams.get("estado");
  const sql = getSql();
  let rows;
  if (q && estado) {
    rows = await sql`
      SELECT * FROM iphone_stock WHERE user_id = ${access.restaurantId} AND estado = ${estado}
      AND (imei ILIKE ${"%" + q + "%"} OR modelo ILIKE ${"%" + q + "%"} OR color ILIKE ${"%" + q + "%"})
      ORDER BY updated_at DESC LIMIT 200`;
  } else if (q) {
    rows = await sql`
      SELECT * FROM iphone_stock WHERE user_id = ${access.restaurantId}
      AND (imei ILIKE ${"%" + q + "%"} OR modelo ILIKE ${"%" + q + "%"} OR color ILIKE ${"%" + q + "%"})
      ORDER BY updated_at DESC LIMIT 200`;
  } else if (estado) {
    rows = await sql`
      SELECT * FROM iphone_stock WHERE user_id = ${access.restaurantId} AND estado = ${estado}
      ORDER BY updated_at DESC LIMIT 200`;
  } else {
    rows = await sql`
      SELECT * FROM iphone_stock WHERE user_id = ${access.restaurantId}
      ORDER BY updated_at DESC LIMIT 200`;
  }
  return NextResponse.json({ stock: rows });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { imei, modelo, capacidad, color, estado_equipo, bateria_pct, estado, precio_compra_usd, precio_venta_usd, precio_venta_ars_manual, proveedor, notas, serial, sellado } = body as Record<string, unknown>;
  if (!imei || !modelo || !capacidad) {
    return NextResponse.json({ error: "IMEI, modelo y capacidad son obligatorios" }, { status: 400 });
  }
  const cleanImei = normalizaImei(String(imei));
  if (!esImeiValido(cleanImei)) {
    return NextResponse.json({ error: "IMEI debe tener 15 dígitos" }, { status: 400 });
  }
  const sql = getSql();
  const id = uid("stk");
  try {
    await sql`
      INSERT INTO iphone_stock (id, user_id, imei, serial, modelo, capacidad, color, estado_equipo, bateria_pct, estado, precio_compra_usd, precio_venta_usd, precio_venta_ars_manual, proveedor, notas, sellado)
      VALUES (${id}, ${admin.restaurantId}, ${cleanImei}, ${(serial as string) ?? null}, ${String(modelo)}, ${String(capacidad)}, ${(color as string) ?? null}, ${(estado_equipo as string) ?? "usado_a"}, ${bateria_pct != null ? Number(bateria_pct) : null}, ${(estado as string) ?? "disponible"}, ${precio_compra_usd != null ? Number(precio_compra_usd) : null}, ${Number(precio_venta_usd ?? 0)}, ${precio_venta_ars_manual != null ? Number(precio_venta_ars_manual) : null}, ${(proveedor as string) ?? null}, ${(notas as string) ?? null}, ${sellado === true})`;
    await sql`INSERT INTO stock_movimientos (user_id, stock_id, tipo, motivo) VALUES (${admin.restaurantId}, ${id}, 'ingreso', 'alta manual')`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("duplicate") || msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "Ese IMEI ya existe en tu stock" }, { status: 409 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
