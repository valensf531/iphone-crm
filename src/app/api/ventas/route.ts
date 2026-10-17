import { NextResponse } from "next/server";
import { requireAccess, requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";

function uid(p: string): string {
  return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET() {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const rows = await sql`
    SELECT v.*, cl.nombre as cliente_nombre, s.modelo, s.imei,
      (SELECT COUNT(*)::int FROM venta_fotos f WHERE f.venta_id = v.id) as fotos_count,
      (SELECT COALESCE(SUM(cantidad), 0)::int FROM venta_accesorios a WHERE a.venta_id = v.id) as accesorios_count,
      (SELECT COALESCE(SUM(precio_final_ars), 0) FROM venta_accesorios a WHERE a.venta_id = v.id) as accesorios_total_ars
    FROM ventas v LEFT JOIN clientes cl ON cl.id = v.cliente_id
    LEFT JOIN iphone_stock s ON s.id = v.stock_id
    WHERE v.user_id = ${access.storeId} ORDER BY v.fecha DESC LIMIT 200`;
  return NextResponse.json({ ventas: rows });
}

const MAX_FOTOS = 4;
const MAX_FOTO_CHARS = 2_000_000;

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { cliente_id, stock_id, precio_usd, dolar_tipo, tipo_cambio, metodo_pago, canje_id, descuento_canje_usd, dias_garantia, notas, fotos, accesorios, verificacion } = body as Record<string, unknown>;
  if (!stock_id || precio_usd == null || tipo_cambio == null) {
    return NextResponse.json({ error: "Equipo, precio y tipo de cambio obligatorios" }, { status: 400 });
  }
  if (!cliente_id) {
    return NextResponse.json({ error: "El cliente es obligatorio para registrar la venta" }, { status: 400 });
  }
  const sql = getSql();
  const fotosArr = Array.isArray(fotos) ? fotos.filter((f): f is string => typeof f === "string") : [];
  if (fotosArr.length > MAX_FOTOS) {
    return NextResponse.json({ error: `Máximo ${MAX_FOTOS} fotos por venta` }, { status: 400 });
  }
  for (const f of fotosArr) {
    if (!f.startsWith("data:image/") || f.length > MAX_FOTO_CHARS) {
      return NextResponse.json({ error: "Foto inválida o muy pesada" }, { status: 400 });
    }
  }
  // Validaciones independientes en paralelo (1 round-trip en vez de 2).
  const [stock, cli] = await Promise.all([
    sql`SELECT * FROM iphone_stock WHERE id = ${String(stock_id)} AND user_id = ${admin.storeId}`,
    sql`SELECT id FROM clientes WHERE id = ${String(cliente_id)} AND user_id = ${admin.storeId}`,
  ]);
  if (stock.length === 0) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  if (cli.length === 0) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });  if ((stock[0] as { estado: string }).estado === "vendido") {
    return NextResponse.json({ error: "Ese equipo ya está vendido" }, { status: 400 });
  }
  // Verificación del dispositivo: obligatoria salvo equipo sellado
  // (nuevo de fábrica: se registra con valores por defecto).
  const esSellado = (stock[0] as { sellado?: boolean }).sellado === true;
  const verif = (verificacion ?? {}) as Record<string, unknown>;
  let verifPantalla = String(verif.pantalla ?? "").trim();
  let verifPiezas = String(verif.piezas_cambiadas ?? "").trim();
  let verifDetalles = String(verif.detalles ?? "").trim();
  let verifRepro = verif.repro === true;
  if (esSellado) {
    verifPantalla = "Sellado de fábrica";
    verifPiezas = "Ninguna (sellado)";
    verifDetalles = "Equipo nuevo sellado de fábrica";
    verifRepro = false;
  } else if (!verifPantalla || !verifPiezas || !verifDetalles) {
    return NextResponse.json({ error: "La verificación del dispositivo es obligatoria" }, { status: 400 });
  }
  // Accesorios opcionales: [{ accesorio_id, cantidad }]. Se validan y descuentan de stock.
  const accArr = Array.isArray(accesorios) ? accesorios : [];
  if (accArr.length > 20) return NextResponse.json({ error: "Demasiados accesorios" }, { status: 400 });
  type AccLine = { accesorio_id: string; cantidad: number; nombre: string; precio_usd: number; precio_ars: number };
  // Lecturas de accesorios en paralelo (1 tanda en vez de N secuenciales).
  const accRows = await Promise.all(
    accArr.map((item) => {
      const o = item as Record<string, unknown>;
      return sql`SELECT * FROM accesorios WHERE id = ${String(o.accesorio_id ?? "")} AND user_id = ${admin.storeId}`;
    })
  );
  const accLines: AccLine[] = [];
  for (let idx = 0; idx < accArr.length; idx++) {
    const o = accArr[idx] as Record<string, unknown>;
    const aid = String(o.accesorio_id ?? "");
    const cant = Math.floor(Number(o.cantidad ?? 0));
    if (!aid || !Number.isFinite(cant) || cant < 1 || cant > 99) {
      return NextResponse.json({ error: "Cantidad de accesorio inválida" }, { status: 400 });
    }
    if (accLines.some((l) => l.accesorio_id === aid)) {
      return NextResponse.json({ error: "Accesorio duplicado" }, { status: 400 });
    }
    const rows = accRows[idx];
    if (rows.length === 0) return NextResponse.json({ error: "Accesorio no encontrado" }, { status: 404 });
    const a = rows[0] as { nombre: string; cantidad: number; precio_venta_usd: number; precio_venta_ars_manual: number | null };
    if (Number(a.cantidad) < cant) {
      return NextResponse.json({ error: `Sin stock: ${a.nombre} (quedan ${a.cantidad})` }, { status: 400 });
    }
    const tcPreview = Number(tipo_cambio);
    const unitUsd = Number(a.precio_venta_usd ?? 0);
    const unitArs = a.precio_venta_ars_manual != null ? Number(a.precio_venta_ars_manual) : Math.round(unitUsd * tcPreview);
    accLines.push({ accesorio_id: aid, cantidad: cant, nombre: a.nombre, precio_usd: unitUsd, precio_ars: unitArs * cant });
  }
  const usd = Number(precio_usd);
  const tc = Number(tipo_cambio);
  const desc = Number(descuento_canje_usd ?? 0);
  const ars = Math.round((usd - desc) * tc);
  const ventaId = uid("vta");
  await sql`INSERT INTO ventas (id, user_id, cliente_id, stock_id, precio_usd, dolar_tipo, tipo_cambio, precio_final_ars, metodo_pago, canje_id, descuento_canje_usd, notas)
    VALUES (${ventaId}, ${admin.storeId}, ${(cliente_id as string) ?? null}, ${String(stock_id)}, ${usd}, ${String(dolar_tipo ?? "blue")}, ${tc}, ${ars}, ${String(metodo_pago ?? "efectivo")}, ${(canje_id as string) ?? null}, ${desc}, ${(notas as string) ?? null})`;
  await sql`UPDATE iphone_stock SET estado = 'vendido', updated_at = NOW() WHERE id = ${String(stock_id)} AND user_id = ${admin.storeId}`;
  await sql`INSERT INTO stock_movimientos (user_id, stock_id, tipo, motivo) VALUES (${admin.storeId}, ${String(stock_id)}, 'venta', ${"venta " + ventaId})`;

  // Accesorios: snapshot + descuento de stock (todo en paralelo).
  let accesoriosTotalArs = 0;
  for (const l of accLines) accesoriosTotalArs += l.precio_ars;
  await Promise.all([
    ...accLines.map((l) => sql`INSERT INTO venta_accesorios (id, user_id, venta_id, accesorio_id, nombre, cantidad, precio_usd, precio_final_ars)
      VALUES (${uid("vac")}, ${admin.storeId}, ${ventaId}, ${l.accesorio_id}, ${l.nombre}, ${l.cantidad}, ${l.precio_usd}, ${l.precio_ars})`),
    ...accLines.map((l) => sql`UPDATE accesorios SET cantidad = cantidad - ${l.cantidad}, updated_at = NOW() WHERE id = ${l.accesorio_id} AND user_id = ${admin.storeId}`),
    // Fotos de cómo se entregó el equipo (opcional, máx. 4).
    ...fotosArr.map((foto) => sql`INSERT INTO venta_fotos (id, user_id, venta_id, foto) VALUES (${uid("fot")}, ${admin.storeId}, ${ventaId}, ${foto})`),
    // Verificación del dispositivo (1-a-1 por venta; en sellados va por defecto).
    sql`INSERT INTO venta_verificacion (id, user_id, venta_id, pantalla, piezas_cambiadas, detalles, repro)
      VALUES (${uid("vve")}, ${admin.storeId}, ${ventaId}, ${verifPantalla}, ${verifPiezas}, ${verifDetalles}, ${verifRepro})`,
  ]);

  // Garantía automática de 30 días (solo fallas del equipo).
  // OJO: el driver HTTP de Neon tipa los parámetros como unknown, y
  // `CURRENT_DATE + $1` es ambiguo (falla con "operator is not unique").
  // Por eso se castea explícito a int.
  const diasRaw = Number(dias_garantia ?? 30);
  const dias = Number.isFinite(diasRaw) ? Math.max(0, Math.floor(diasRaw)) : 30;
  const garId = uid("gar");
  await sql`INSERT INTO garantias (id, user_id, venta_id, stock_id, cliente_id, dias, fecha_vencimiento, estado)
    VALUES (${garId}, ${admin.storeId}, ${ventaId}, ${String(stock_id)}, ${(cliente_id as string) ?? null}, ${dias}, CURRENT_DATE + ${dias}::int, 'vigente')`;

  // Si el canje se usó, márcalo aceptado y da de alta el equipo recibido en stock.
  if (canje_id) {
    const cnj = await sql`SELECT * FROM canjes WHERE id = ${String(canje_id)} AND user_id = ${admin.storeId}`;
    if (cnj.length > 0) {
      const c = cnj[0] as { modelo_recibido: string; capacidad_recibida: string; imei_recibido: string; bateria_pct: number; tasacion_final_usd: number };
      await sql`UPDATE canjes SET estado = 'aceptado', stock_nuevo_id = ${String(stock_id)} WHERE id = ${String(canje_id)}`;
      if (c.imei_recibido) {
        const entradaId = uid("stk");
        await sql`INSERT INTO iphone_stock (id, user_id, imei, modelo, capacidad, bateria_pct, estado, estado_equipo, precio_compra_usd, precio_venta_usd, proveedor, notas)
          VALUES (${entradaId}, ${admin.storeId}, ${c.imei_recibido}, ${c.modelo_recibido}, ${c.capacidad_recibida ?? "128GB"}, ${c.bateria_pct ?? null}, 'disponible', 'usado_a', ${c.tasacion_final_usd ?? 0}, 0, 'plan canje', ${"ingreso por canje " + String(canje_id)})`;
        await sql`UPDATE canjes SET stock_entrada_id = ${entradaId} WHERE id = ${String(canje_id)}`;
      }
    }
  }
  return NextResponse.json({ ok: true, id: ventaId, garantia_id: garId, precio_final_ars: ars, accesorios_total_ars: accesoriosTotalArs, total_general_ars: ars + accesoriosTotalArs }, { status: 201 });
}
