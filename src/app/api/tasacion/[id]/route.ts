import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";
import { validarFilaLista } from "@/lib/tasacion";

/* Editar (PUT) o borrar (DELETE) una fila puntual de la lista. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const { fila, error } = validarFilaLista((body ?? {}) as Record<string, unknown>);
  if (!fila) return NextResponse.json({ error: error ?? "Fila inválida" }, { status: 400 });
  const sql = getSql();
  await sql.query(
    `UPDATE tasacion_base SET modelo = $3, bateria_min = $4, bateria_max = $5, precio_toma_usd = $6 WHERE id = $1 AND user_id = $2`,
    [Number(id), admin.storeId, fila.modelo, fila.bateria_min, fila.bateria_max, fila.precio_toma_usd]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const sql = getSql();
  await sql`DELETE FROM tasacion_base WHERE id = ${Number(id)} AND user_id = ${admin.storeId}`;
  return NextResponse.json({ ok: true });
}
