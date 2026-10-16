import { NextResponse } from "next/server";
import { requireAccess, requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";
import { validarFilaLista, type TasacionRow } from "@/lib/tasacion";

/* Lista de precios del Plan Canje (tasacion_base).
   GET: toda la lista. POST { rows: [...] }: reemplaza la lista completa
   (es lo que manda el Excel). Validación fila por fila. */
export async function GET() {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const rows = await sql`SELECT id, modelo, bateria_min, bateria_max, precio_toma_usd FROM tasacion_base WHERE user_id = ${access.restaurantId} ORDER BY modelo, bateria_min`;
  return NextResponse.json({ lista: rows });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const rawRows = (body as { rows?: unknown }).rows;
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return NextResponse.json({ error: "Mandá al menos una fila" }, { status: 400 });
  }
  if (rawRows.length > 500) {
    return NextResponse.json({ error: "Máximo 500 filas por lista" }, { status: 400 });
  }
  const filas: TasacionRow[] = [];
  const errores: string[] = [];
  rawRows.forEach((r, i) => {
    const { fila, error } = validarFilaLista((r ?? {}) as Record<string, unknown>);
    if (fila) filas.push(fila);
    else errores.push(`Fila ${i + 1}: ${error}`);
  });
  if (errores.length > 0) {
    return NextResponse.json({ error: errores.slice(0, 5).join(" · ") }, { status: 400 });
  }
  const sql = getSql();
  await sql`DELETE FROM tasacion_base WHERE user_id = ${admin.restaurantId}`;
  for (const f of filas) {
    await sql`INSERT INTO tasacion_base (user_id, modelo, bateria_min, bateria_max, precio_toma_usd)
      VALUES (${admin.restaurantId}, ${f.modelo}, ${f.bateria_min}, ${f.bateria_max}, ${f.precio_toma_usd})`;
  }
  return NextResponse.json({ ok: true, cantidad: filas.length }, { status: 201 });
}
