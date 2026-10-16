import { NextResponse } from "next/server";
import { requireAccess, requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";
import { tasarConLista, type TasacionRow } from "@/lib/tasacion";

function uid(p: string): string {
  return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET() {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const rows = await sql`SELECT c.*, cl.nombre as cliente_nombre FROM canjes c LEFT JOIN clientes cl ON cl.id = c.cliente_id WHERE c.user_id = ${access.storeId} ORDER BY c.fecha DESC LIMIT 200`;
  return NextResponse.json({ canjes: rows });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { cliente_id, modelo_recibido, capacidad_recibida, imei_recibido, bateria_pct, estetica, pantalla_original, faceid_ok, icloud_desbloqueado, observaciones, tasacion_final_usd, solo_calculo } = body as Record<string, unknown>;
  if (!modelo_recibido || bateria_pct == null) {
    return NextResponse.json({ error: "Modelo y batería son obligatorios" }, { status: 400 });
  }
  const sql = getSql();
  const listaRows = await sql`SELECT modelo, bateria_min, bateria_max, precio_toma_usd FROM tasacion_base WHERE user_id = ${admin.storeId}`;
  const lista = listaRows as unknown as TasacionRow[];
  const tas = tasarConLista(lista, {
    modelo: String(modelo_recibido),
    bateriaPct: Number(bateria_pct),
    estetica: (estetica as "a" | "b" | "c") ?? "a",
    pantallaOriginal: pantalla_original !== false,
    faceidOk: faceid_ok !== false,
    icloudDesbloqueado: icloud_desbloqueado !== false,
  });
  if (tas.rechazar) return NextResponse.json({ error: tas.motivo }, { status: 400 });
  // Vista previa: calcula sin guardar, para que la persona fije el precio final.
  if (solo_calculo) {
    return NextResponse.json({ tasacion_auto: tas.valor, origen: tas.origen, tiene_lista: lista.length > 0 });
  }
  const id = uid("cnj");
  const final = tasacion_final_usd != null && tasacion_final_usd !== "" ? Number(tasacion_final_usd) : tas.valor;
  if (!Number.isFinite(final) || final < 0) {
    return NextResponse.json({ error: "Precio final inválido" }, { status: 400 });
  }
  await sql`INSERT INTO canjes (id, user_id, cliente_id, modelo_recibido, capacidad_recibida, imei_recibido, bateria_pct, estetica, pantalla_original, faceid_ok, icloud_desbloqueado, observaciones, tasacion_auto_usd, tasacion_final_usd, estado)
    VALUES (${id}, ${admin.storeId}, ${(cliente_id as string) ?? null}, ${String(modelo_recibido)}, ${(capacidad_recibida as string) ?? null}, ${(imei_recibido as string) ?? null}, ${Number(bateria_pct)}, ${(estetica as string) ?? "a"}, ${pantalla_original !== false}, ${faceid_ok !== false}, ${icloud_desbloqueado !== false}, ${(observaciones as string) ?? null}, ${tas.valor}, ${final}, 'tasado')`;
  return NextResponse.json({ ok: true, id, tasacion_auto: tas.valor, tasacion_final: final, origen: tas.origen }, { status: 201 });
}
