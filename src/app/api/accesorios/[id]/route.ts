import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const sql = getSql();
  const allowed = ["nombre", "categoria", "cantidad", "precio_compra_usd", "precio_venta_usd", "precio_venta_ars_manual", "proveedor", "notas"] as const;
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const k of allowed) {
    if (body[k] !== undefined) {
      if (k === "cantidad") {
        const n = Math.max(0, Number(body[k]));
        if (!Number.isFinite(n)) return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
        sets.push(`${k} = $${values.length + 3}`);
        values.push(Math.floor(n));
      } else {
        sets.push(`${k} = $${values.length + 3}`);
        values.push(body[k] === "" ? null : body[k]);
      }
    }
  }
  if (sets.length === 0) return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  await sql.query(
    `UPDATE accesorios SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
    [id, admin.storeId, ...values]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const sql = getSql();
  await sql`DELETE FROM accesorios WHERE id = ${id} AND user_id = ${admin.storeId}`;
  return NextResponse.json({ ok: true });
}
