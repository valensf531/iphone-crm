import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const sql = getSql();
  const allowed = ["modelo", "capacidad", "color", "estado_equipo", "bateria_pct", "estado", "precio_compra_usd", "precio_venta_usd", "precio_venta_ars_manual", "proveedor", "notas", "serial", "sellado"] as const;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const k of allowed) {
    if (body[k] !== undefined) {
      sets.push(`${k} = $${values.length + 3}`);
      values.push(body[k] === "" ? null : body[k]);
    }
  }
  if (sets.length === 0) return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  // Query simple sin template dinámico complejo: actualiza campo por campo con SQL parametrizado crudo vía neon query().
  await sql.query(
    `UPDATE iphone_stock SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
    [id, admin.storeId, ...values]
  );
  await sql`INSERT INTO stock_movimientos (user_id, stock_id, tipo, motivo) VALUES (${admin.storeId}, ${id}, 'ajuste', 'edición')`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const sql = getSql();
  const movimientos = await sql`
    SELECT (SELECT COUNT(*)::int FROM ventas WHERE stock_id = ${id} AND user_id = ${admin.storeId})
      + (SELECT COUNT(*)::int FROM garantias WHERE stock_id = ${id} AND user_id = ${admin.storeId}) as total`;
  if ((movimientos[0] as { total: number }).total > 0) {
    return NextResponse.json({ error: "No se puede borrar: el equipo tiene ventas o garantías asociadas" }, { status: 409 });
  }
  await sql`DELETE FROM iphone_stock WHERE id = ${id} AND user_id = ${admin.storeId}`;
  return NextResponse.json({ ok: true });
}
