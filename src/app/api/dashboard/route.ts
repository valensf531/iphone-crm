import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { getSql } from "@/lib/db";

export async function GET() {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  try {
    const [stock, porModelo, ventasMes, garantias, ultimas] = await Promise.all([
      sql`SELECT COUNT(*) FILTER (WHERE estado='disponible')::int as total, COUNT(*) FILTER (WHERE estado='disponible')::int as disponibles, COALESCE(SUM(precio_venta_usd) FILTER (WHERE estado='disponible'),0) as valorizado_usd FROM iphone_stock WHERE user_id = ${access.storeId}`,
      sql`SELECT modelo, COUNT(*)::int as cantidad FROM iphone_stock WHERE user_id = ${access.storeId} AND estado='disponible' GROUP BY modelo ORDER BY cantidad DESC LIMIT 10`,
      sql`SELECT COUNT(*)::int as cantidad, COALESCE(SUM(precio_final_ars),0) as total_ars FROM ventas WHERE user_id = ${access.storeId} AND fecha >= date_trunc('month', NOW())`,
      sql`SELECT COUNT(*) FILTER (WHERE estado='vigente')::int as vigentes, COUNT(*) FILTER (WHERE estado='en_reclamo')::int as reclamos, COUNT(*) FILTER (WHERE estado='vigente' AND fecha_vencimiento <= CURRENT_DATE + 7)::int as por_vencer FROM garantias WHERE user_id = ${access.storeId}`,
      sql`SELECT v.id, v.fecha, v.precio_final_ars, cl.nombre as cliente, s.modelo FROM ventas v LEFT JOIN clientes cl ON cl.id = v.cliente_id LEFT JOIN iphone_stock s ON s.id = v.stock_id WHERE v.user_id = ${access.storeId} ORDER BY v.fecha DESC LIMIT 5`,
    ]);
    return NextResponse.json({ stock: stock[0], porModelo, ventasMes: ventasMes[0], garantias: garantias[0], ultimas });
  } catch (e) {
    console.error("dashboard", e);
    return NextResponse.json({ stock: { total: 0, disponibles: 0, valorizado_usd: 0 }, porModelo: [], ventasMes: { cantidad: 0, total_ars: 0 }, garantias: { vigentes: 0, reclamos: 0, por_vencer: 0 }, ultimas: [] });
  }
}
