import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { getSql } from "@/lib/db";
import { getDolarSnapshot } from "@/lib/dolar";

/* Historial acotado: solo guarda si cambió el valor o pasaron 15 min.
   Antes insertaba una fila por cada request (cada navegación = varias). */
const HISTORIAL_STALE_MS = 15 * 60 * 1000;

export async function GET() {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const [live, rows, settings] = await Promise.all([
    getDolarSnapshot(),
    sql`
      SELECT oficial_venta, blue_venta, fuente, fecha
      FROM dolar_rates WHERE user_id = ${access.storeId}
      ORDER BY fecha DESC LIMIT 1`,
    sql`SELECT dolar_preferido FROM crm_settings WHERE user_id = ${access.storeId}`,
  ]);
  const saved = rows[0] as { oficial_venta?: number; blue_venta?: number; fuente?: string; fecha?: string } | undefined;

  try {
    // Guarda snapshot live si hay datos y (cambió o está viejo).
    if (live.fuente !== "sin-datos" && (live.blue.venta || live.oficial.venta)) {
      const igual = (a: unknown, b: number | null) => (a == null ? b == null : Number(a) === b);
      const cambio =
        !saved ||
        !igual(saved.blue_venta, live.blue.venta) ||
        !igual(saved.oficial_venta, live.oficial.venta);
      const viejo =
        !saved?.fecha || Date.now() - new Date(saved.fecha).getTime() > HISTORIAL_STALE_MS;
      if (cambio || viejo) {
        await sql`
          INSERT INTO dolar_rates (user_id, oficial_compra, oficial_venta, blue_compra, blue_venta, fuente, manual_override)
          VALUES (${access.storeId}, ${live.oficial.compra ?? null}, ${live.oficial.venta ?? null}, ${live.blue.compra ?? null}, ${live.blue.venta ?? null}, 'dolarapi.com', false)`;
      }
    }
    return NextResponse.json({
      live,
      saved: saved ?? null,
      preferido: (settings[0] as { dolar_preferido?: string } | undefined)?.dolar_preferido ?? "blue",
    });
  } catch (e) {
    console.error("dolar GET", e);
    return NextResponse.json({ live, saved: saved ?? null, preferido: "blue" });
  }
}

export async function POST(req: Request) {
  const access = await requireAccess();
  if (!access || !access.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { oficial_venta, blue_venta, oficial_compra, blue_compra, preferido } = body as {
    oficial_venta?: number; blue_venta?: number; oficial_compra?: number; blue_compra?: number; preferido?: string;
  };
  const sql = getSql();
  const rateP = sql`
    INSERT INTO dolar_rates (user_id, oficial_compra, oficial_venta, blue_compra, blue_venta, fuente, manual_override)
    VALUES (${access.storeId}, ${oficial_compra ?? null}, ${oficial_venta ?? null}, ${blue_compra ?? null}, ${blue_venta ?? null}, 'manual', true)`;
  if (preferido === "blue" || preferido === "oficial") {
    await Promise.all([
      rateP,
      sql`
        INSERT INTO crm_settings (user_id, dolar_preferido, updated_at)
        VALUES (${access.storeId}, ${preferido}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET dolar_preferido = EXCLUDED.dolar_preferido, updated_at = NOW()`,
    ]);
  } else {
    await rateP;
  }
  return NextResponse.json({ ok: true });
}
