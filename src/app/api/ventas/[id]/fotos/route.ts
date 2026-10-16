import { NextRequest, NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { getSql } from "@/lib/db";

/* Fotos de entrega de una venta (verifica que sea del local). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sql = getSql();
  const venta = await sql`SELECT id FROM ventas WHERE id = ${id} AND user_id = ${access.storeId}`;
  if (venta.length === 0) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
  const fotos = await sql`SELECT id, foto, created_at FROM venta_fotos WHERE venta_id = ${id} AND user_id = ${access.storeId} ORDER BY created_at`;
  return NextResponse.json({ fotos });
}
