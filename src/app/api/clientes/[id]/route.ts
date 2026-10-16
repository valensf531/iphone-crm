import { NextRequest, NextResponse } from "next/server";
import { requireAccess, requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";
import { esDniValido, esTelefonoValido, soloDigitos } from "@/lib/crm";

/* Historial del cliente: compras (ventas), plan canje y garantías + resumen. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const sql = getSql();

  const cli = await sql`SELECT id, nombre, dni, telefono, email, direccion, notas FROM clientes WHERE id = ${id} AND user_id = ${access.storeId}`;
  if (cli.length === 0) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const ventasP = sql`
    SELECT v.id, v.fecha, v.precio_usd, v.precio_final_ars, v.metodo_pago, s.modelo, s.imei, s.capacidad
    FROM ventas v LEFT JOIN iphone_stock s ON s.id = v.stock_id
    WHERE v.user_id = ${access.storeId} AND v.cliente_id = ${id}
    ORDER BY v.fecha DESC LIMIT 200`;
  const canjesP = sql`
    SELECT id, fecha, modelo_recibido, capacidad_recibida, bateria_pct, tasacion_final_usd, estado
    FROM canjes WHERE user_id = ${access.storeId} AND cliente_id = ${id}
    ORDER BY fecha DESC LIMIT 200`;
  const garantiasP = sql`
    SELECT g.id, g.estado, g.fecha_vencimiento, g.dias, s.modelo, s.imei
    FROM garantias g LEFT JOIN iphone_stock s ON s.id = g.stock_id
    WHERE g.user_id = ${access.storeId} AND g.cliente_id = ${id}
    ORDER BY g.fecha_vencimiento DESC LIMIT 200`;
  const [ventas, canjes, garantias] = await Promise.all([ventasP, canjesP, garantiasP]);
  const gasto = (ventas as { precio_final_ars: number }[]).reduce((a, v) => a + Number(v.precio_final_ars || 0), 0);

  return NextResponse.json({
    cliente: cli[0],
    resumen: {
      compras: ventas.length,
      canjes: canjes.length,
      garantias: garantias.length,
      garantias_vigentes: (garantias as { estado: string }[]).filter((g) => g.estado === "vigente").length,
      gasto_total_ars: gasto,
    },
    ventas,
    canjes,
    garantias,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const sql = getSql();
  const movimientos = await sql`
    SELECT (SELECT COUNT(*)::int FROM ventas WHERE cliente_id = ${id} AND user_id = ${admin.storeId})
      + (SELECT COUNT(*)::int FROM canjes WHERE cliente_id = ${id} AND user_id = ${admin.storeId})
      + (SELECT COUNT(*)::int FROM garantias WHERE cliente_id = ${id} AND user_id = ${admin.storeId}) as total`;
  if ((movimientos[0] as { total: number }).total > 0) {
    return NextResponse.json({ error: "No se puede borrar: el cliente tiene compras, canjes o garantías" }, { status: 409 });
  }
  await sql`DELETE FROM clientes WHERE id = ${id} AND user_id = ${admin.storeId}`;
  return NextResponse.json({ ok: true });
}

/* Actualiza los datos del perfil del cliente. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  if (!body.nombre || !String(body.nombre).trim()) {
    return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
  }
  const dni = soloDigitos(String(body.dni ?? ""));
  if (dni && !esDniValido(dni)) {
    return NextResponse.json({ error: "DNI inválido: máximo 8 dígitos numéricos" }, { status: 400 });
  }
  if (body.telefono && !esTelefonoValido(String(body.telefono))) {
    return NextResponse.json({ error: "Teléfono inválido: máximo 15 dígitos" }, { status: 400 });
  }
  const sql = getSql();
  const filas = await sql`UPDATE clientes SET
      nombre = ${String(body.nombre).trim()},
      dni = ${dni || null},
      telefono = ${body.telefono || null},
      email = ${body.email || null},
      direccion = ${body.direccion || null},
      notas = ${body.notas || null}
    WHERE id = ${id} AND user_id = ${admin.storeId}`;
  if (filas.length === 0) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
