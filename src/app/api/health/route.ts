import { NextResponse } from "next/server";

/* Healthcheck público para Vercel/monitor uptime. No toca la DB
   a propósito: solo confirma que la función responde. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "iphone-crm" });
}
