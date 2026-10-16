import { NextRequest, NextResponse } from "next/server";
import { requireAccess, requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";

export async function GET() {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  // Marca vencidas en segundo plano: no bloquea la lectura (best-effort,
  // el próximo GET reintenta si este no alcanzó a completarse).
  sql`UPDATE garantias SET estado = 'vencida' WHERE user_id = ${access.restaurantId} AND estado = 'vigente' AND fecha_vencimiento < CURRENT_DATE`.catch(() => {});
  const rows = await sql`
    SELECT g.*, cl.nombre as cliente_nombre, s.modelo, s.imei
    FROM garantias g LEFT JOIN clientes cl ON cl.id = g.cliente_id
    LEFT JOIN iphone_stock s ON s.id = g.stock_id
    WHERE g.user_id = ${access.restaurantId} ORDER BY g.fecha_vencimiento ASC LIMIT 200`;
  return NextResponse.json({ garantias: rows });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { id, motivo, mal_uso, solucion } = body as { id: string; motivo?: string; mal_uso?: boolean; solucion?: string };
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  const sql = getSql();
  if (solucion) {
    await sql`UPDATE garantias SET estado = 'finalizada', reclamo_solucion = ${solucion} WHERE id = ${id} AND user_id = ${admin.restaurantId}`;
  } else {
    // Iniciar reclamo: si es mal uso (pantalla rota, mojado, golpe) se rechaza.
    const estado = mal_uso ? "finalizada" : "en_reclamo";
    const sol = mal_uso ? "Rechazada: daño por mal uso no cubierto (pantalla/golpe/humedad)." : null;
    await sql`UPDATE garantias SET estado = ${estado}, reclamo_fecha = NOW(), reclamo_motivo = ${motivo ?? null}, reclamo_mal_uso = ${mal_uso === true}, reclamo_solucion = ${sol} WHERE id = ${id} AND user_id = ${admin.restaurantId}`;
  }
  return NextResponse.json({ ok: true });
}
