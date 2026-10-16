import { NextRequest, NextResponse } from "next/server";
import { requireAccess, requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET(req: NextRequest) {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const sql = getSql();
  let rows;
  if (q) {
    rows = await sql`
      SELECT * FROM accesorios WHERE user_id = ${access.restaurantId}
      AND (nombre ILIKE ${"%" + q + "%"} OR categoria ILIKE ${"%" + q + "%"} OR proveedor ILIKE ${"%" + q + "%"})
      ORDER BY updated_at DESC LIMIT 200`;
  } else {
    rows = await sql`
      SELECT * FROM accesorios WHERE user_id = ${access.restaurantId}
      ORDER BY updated_at DESC LIMIT 200`;
  }
  return NextResponse.json({ accesorios: rows });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { nombre, categoria, cantidad, precio_compra_usd, precio_venta_usd, precio_venta_ars_manual, proveedor, notas } = body as Record<string, unknown>;
  if (!nombre || String(nombre).trim() === "") {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }
  const sql = getSql();
  const id = uid("acc");
  await sql`
    INSERT INTO accesorios (id, user_id, nombre, categoria, cantidad, precio_compra_usd, precio_venta_usd, precio_venta_ars_manual, proveedor, notas)
    VALUES (${id}, ${admin.restaurantId}, ${String(nombre).trim()}, ${String(categoria ?? "otros")}, ${Math.max(0, Number(cantidad ?? 0))}, ${precio_compra_usd != null && precio_compra_usd !== "" ? Number(precio_compra_usd) : null}, ${Number(precio_venta_usd ?? 0)}, ${precio_venta_ars_manual != null && precio_venta_ars_manual !== "" ? Number(precio_venta_ars_manual) : null}, ${(proveedor as string) ?? null}, ${(notas as string) ?? null})`;
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
