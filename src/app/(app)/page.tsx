import Link from "next/link";
import { DolarCard } from "@/components/DolarCard";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatARS, formatUSD } from "@/lib/format";
import { getSql } from "@/lib/db";
import { requireAccess } from "@/lib/access";
import { redirect } from "next/navigation";
import { Smartphone, ShoppingCart, ShieldCheck, ArrowRight, TriangleAlert, PackageOpen, ReceiptText } from "lucide-react";

async function getData() {
  const access = await requireAccess();
  if (!access) redirect("/sign-in");
  const sql = getSql();
  try {
    const [stock, porModelo, ventasMes, gar, ultimas] = await Promise.all([
      sql`SELECT COUNT(*) FILTER (WHERE estado='disponible')::int as total, COUNT(*) FILTER (WHERE estado='disponible')::int as disponibles, COALESCE(SUM(precio_venta_usd) FILTER (WHERE estado='disponible'),0) as valorizado FROM iphone_stock WHERE user_id = ${access.storeId}`,
      sql`SELECT modelo, COUNT(*)::int as cantidad FROM iphone_stock WHERE user_id = ${access.storeId} AND estado='disponible' GROUP BY modelo ORDER BY cantidad DESC LIMIT 8`,
      sql`SELECT COUNT(*)::int as cantidad, COALESCE(SUM(precio_final_ars),0) as total FROM ventas WHERE user_id = ${access.storeId} AND fecha >= date_trunc('month', NOW())`,
      sql`SELECT COUNT(*) FILTER (WHERE estado='vigente')::int as vigentes, COUNT(*) FILTER (WHERE estado='en_reclamo')::int as reclamos, COUNT(*) FILTER (WHERE estado='vigente' AND fecha_vencimiento <= CURRENT_DATE + 7)::int as por_vencer FROM garantias WHERE user_id = ${access.storeId}`,
      sql`SELECT v.fecha, v.precio_final_ars, cl.nombre as cliente, s.modelo FROM ventas v LEFT JOIN clientes cl ON cl.id = v.cliente_id LEFT JOIN iphone_stock s ON s.id = v.stock_id WHERE v.user_id = ${access.storeId} ORDER BY v.fecha DESC LIMIT 5`,
    ]);
    return {
      stock: stock[0] as { total: number; disponibles: number; valorizado: number },
      porModelo: porModelo as { modelo: string; cantidad: number }[],
      ventasMes: ventasMes[0] as { cantidad: number; total: number },
      gar: gar[0] as { vigentes: number; reclamos: number; por_vencer: number },
      ultimas: ultimas as { fecha: string; precio_final_ars: number; cliente: string; modelo: string }[],
    };
  } catch {
    return { stock: { total: 0, disponibles: 0, valorizado: 0 }, porModelo: [], ventasMes: { cantidad: 0, total: 0 }, gar: { vigentes: 0, reclamos: 0, por_vencer: 0 }, ultimas: [] };
  }
}

/* Compound shell: composición con children en vez de boolean props */
function StatShell({
  icon,
  href,
  cta,
  children,
}: {
  icon: React.ReactNode;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="card-lift overflow-hidden rounded-3xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          {icon}
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1 py-0.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4">{children}</div>
      </CardContent>
    </Card>
  );
}

function StockStat({ disponibles }: { disponibles: number }) {
  return (
    <StatShell
      href="/stock"
      cta="Ver stock"
      icon={
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border" aria-hidden="true">
          <Smartphone className="h-5 w-5" />
        </span>
      }
    >
      <p className="text-xs font-semibold text-muted-foreground">Equipos disponibles</p>
      <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">{disponibles}</p>
      <p className="mt-1 text-sm tabular-nums text-muted-foreground">{disponibles === 1 ? "equipo en stock" : "equipos en stock"}</p>
    </StatShell>
  );
}

function SalesStat({ cantidad, total }: { cantidad: number; total: number }) {
  return (
    <StatShell
      href="/ventas"
      cta="Ver ventas"
      icon={
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border" aria-hidden="true">
          <ShoppingCart className="h-5 w-5" />
        </span>
      }
    >
      <p className="text-xs font-semibold text-muted-foreground">Ventas del mes</p>
      <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">{cantidad}</p>
      <p className="mt-1 min-w-0 truncate text-sm tabular-nums text-muted-foreground">{formatARS(total)} facturado</p>
    </StatShell>
  );
}

function WarrantyStat({ vigentes, reclamos, porVencer }: { vigentes: number; reclamos: number; porVencer: number }) {
  return (
    <StatShell
      href="/garantias"
      cta="Ver garantías"
      icon={
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground ring-1 ring-border" aria-hidden="true">
          <ShieldCheck className="h-5 w-5" />
        </span>
      }
    >
      <p className="text-xs font-semibold text-muted-foreground">Garantías vigentes</p>
      <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">{vigentes}</p>
      <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
        {reclamos > 0 ? <Badge variant="destructive">{reclamos} en reclamo</Badge> : null}
        {porVencer > 0 ? <Badge variant="warning">{porVencer} por vencer</Badge> : null}
        {reclamos === 0 && porVencer === 0 ? "Sin alertas" : ""}
      </p>
    </StatShell>
  );
}

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

export default async function DashboardPage() {
  const d = await getData();
  const hasAlert = d.gar.reclamos > 0 || d.gar.por_vencer > 0;
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Resumen"
        title="Mi tienda"
        description="Mirá tu stock, tus ventas y tus garantías de un vistazo."
        actions={
          <Button asChild size="lg" className="rounded-2xl">
            <Link href="/pos"><ShoppingCart className="h-4 w-4" aria-hidden="true" /> PoS</Link>
          </Button>
        }
      />

      <section aria-label="Stock valorizado" className="animate-rise rounded-3xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="live-dot h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Stock valorizado
            </p>
            <p className="font-display mt-2 break-words text-3xl font-bold tabular-nums leading-none tracking-tight text-foreground sm:text-6xl" aria-live="polite">
              {formatUSD(d.stock.valorizado)}
            </p>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed tabular-nums text-muted-foreground">
              <strong className="font-bold text-foreground">{d.stock.disponibles}</strong> {d.stock.disponibles === 1 ? "equipo en stock" : "equipos en stock"} ·{" "}
              <strong className="font-bold text-foreground">{d.ventasMes.cantidad}</strong> ventas este mes ({formatARS(d.ventasMes.total)})
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button asChild className="w-full rounded-xl sm:w-auto">
                <Link href="/pos"><ShoppingCart className="h-4 w-4" aria-hidden="true" /> Cobrar en PoS</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                <Link href="/ventas">Ver ventas <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </Button>
            </div>
          </div>
          {hasAlert && (
            <Link
              href="/garantias"
              className="animate-rise delay-2 inline-flex max-w-full items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold tabular-nums text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
            >
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">
                {d.gar.reclamos > 0 ? `${d.gar.reclamos} en reclamo` : ""}
                {d.gar.reclamos > 0 && d.gar.por_vencer > 0 ? " · " : ""}
                {d.gar.por_vencer > 0 ? `${d.gar.por_vencer} por vencer` : ""}
              </span>
            </Link>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="animate-rise delay-1"><StockStat disponibles={d.stock.disponibles} /></div>
        <div className="animate-rise delay-2"><SalesStat cantidad={d.ventasMes.cantidad} total={d.ventasMes.total} /></div>
        <div className="animate-rise delay-3"><WarrantyStat vigentes={d.gar.vigentes} reclamos={d.gar.reclamos} porVencer={d.gar.por_vencer} /></div>
        <div className="animate-rise delay-4 sm:col-span-2 xl:col-span-1">
          <DolarCard compact />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-lift animate-rise delay-3 rounded-3xl">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[17px] font-semibold tracking-tight text-foreground">Stock por modelo</h2>
              <Link href="/stock" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1 py-0.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                Gestionar <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.porModelo.length === 0 ? (
                <div className="flex w-full items-start gap-3 rounded-2xl border border-border bg-muted p-4">
                  <PackageOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Sin stock todavía</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">Cargá tu primer iPhone y aparece acá.</p>
                    <Link href="/stock" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-foreground hover:underline">Ir a Stock <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
                  </div>
                </div>
              ) : (
                d.porModelo.map((m) => (
                  <Badge key={m.modelo} variant="secondary" className="rounded-xl px-3 py-1.5 text-[13px]">
                    <span className="max-w-[14rem] truncate">{m.modelo}</span>
                    <span className="tabular-nums text-muted-foreground">×&nbsp;{m.cantidad}</span>
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="card-lift animate-rise delay-4 rounded-3xl">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-[17px] font-semibold tracking-tight text-foreground">Últimas ventas</h2>
              <Link href="/ventas" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1 py-0.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                Ver todas <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-2 divide-y divide-border">
              {d.ultimas.length === 0 ? (
                <div className="flex items-start gap-3 py-4">
                  <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Todavía no hay ventas</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">Cuando vendas tu primer equipo lo ves acá.</p>
                  </div>
                </div>
              ) : (
                d.ultimas.map((v, i) => (
                  <div key={`${v.fecha}-${i}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">
                      <strong className="font-semibold text-foreground">{v.modelo ?? "Equipo"}</strong>
                      <span className="text-muted-foreground"> · </span>
                      <span className="truncate">{v.cliente ?? "Sin cliente"}</span>
                      <span className="ml-2 hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">{v.fecha ? dateFmt.format(new Date(v.fecha)) : ""}</span>
                    </span>
                    <strong className="shrink-0 font-bold tabular-nums text-foreground">{formatARS(v.precio_final_ars)}</strong>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
