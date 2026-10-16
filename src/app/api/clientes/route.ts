import { NextResponse } from "next/server";
import { requireAccess, requireAdmin } from "@/lib/access";
import { getSql } from "@/lib/db";
import { esDniValido, esTelefonoValido, soloDigitos } from "@/lib/crm";

function uid(p: string): string {
  return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export async function GET() {
  const access = await requireAccess();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = getSql();
  const rows = await sql`SELECT * FROM clientes WHERE user_id = ${access.storeId} ORDER BY created_at DESC LIMIT 200`;
  return NextResponse.json({ clientes: rows });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  if (!body.nombre || !String(body.nombre).trim()) {
    return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
  }
  // El DNI se guarda en dígitos (12.345.678 -> 12345678).
  const dni = soloDigitos(String(body.dni ?? ""));
  if (dni && !esDniValido(dni)) {
    return NextResponse.json({ error: "DNI inválido: máximo 8 dígitos numéricos" }, { status: 400 });
  }
  if (body.telefono && !esTelefonoValido(String(body.telefono))) {
    return NextResponse.json({ error: "Teléfono inválido: máximo 15 dígitos" }, { status: 400 });
  }
  const sql = getSql();
  const id = uid("cli");
  await sql`INSERT INTO clientes (id, user_id, nombre, dni, telefono, email, direccion, notas)
    VALUES (${id}, ${admin.storeId}, ${String(body.nombre).trim()}, ${dni || null}, ${body.telefono ?? null}, ${body.email ?? null}, ${body.direccion ?? null}, ${body.notas ?? null})`;
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
