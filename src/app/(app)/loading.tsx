import { Card, CardContent } from "@/components/ui/card";

/* Esqueleto instantáneo mientras carga cualquier página de la app. */
export default function AppLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando contenido">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded-xl bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-52 animate-pulse rounded-3xl border border-border bg-card" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["a", "b", "c", "d"].map((k) => (
          <Card key={k} className="rounded-3xl">
            <CardContent className="space-y-3 p-5">
              <div className="h-10 w-10 animate-pulse rounded-2xl bg-muted" />
              <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded-lg bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
