import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { getSql } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const sql = getSql();

  const ventas = await sql`
    SELECT v.*,
      cl.nombre as cliente_nombre, cl.dni as cliente_dni, cl.telefono as cliente_telefono,
      cl.email as cliente_email, cl.direccion as cliente_direccion,
      s.modelo, s.capacidad, s.color, s.imei, s.serial, s.bateria_pct, s.sellado,
      s.estado_equipo, s.precio_venta_usd as precio_lista_usd
    FROM ventas v
    LEFT JOIN clientes cl ON cl.id = v.cliente_id
    LEFT JOIN iphone_stock s ON s.id = v.stock_id
    WHERE v.id = ${id} AND v.user_id = ${access.storeId}
    LIMIT 1`;
  if (ventas.length === 0) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
  const venta = ventas[0] as Record<string, unknown>;

  const [fotos, garantias, accs, verif] = await Promise.all([
    sql`SELECT id, foto, created_at FROM venta_fotos WHERE venta_id = ${id} AND user_id = ${access.storeId} ORDER BY created_at ASC`,
    sql`SELECT id, dias, fecha_inicio, fecha_vencimiento, estado FROM garantias WHERE venta_id = ${id} AND user_id = ${access.storeId} ORDER BY created_at DESC LIMIT 1`,
    sql`SELECT id, accesorio_id, nombre, cantidad, precio_usd, precio_final_ars FROM venta_accesorios WHERE venta_id = ${id} AND user_id = ${access.storeId} ORDER BY created_at ASC`,
    sql`SELECT pantalla, piezas_cambiadas, detalles, repro FROM venta_verificacion WHERE venta_id = ${id} AND user_id = ${access.storeId} LIMIT 1`,
  ]);

  return NextResponse.json({ venta, fotos, garantia: (garantias[0] as Record<string, unknown> | undefined) ?? null, accesorios: accs, verificacion: (verif[0] as Record<string, unknown> | undefined) ?? null });
}
