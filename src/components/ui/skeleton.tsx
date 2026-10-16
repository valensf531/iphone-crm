import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  );
}

/* Filas de carga con el mismo alto que la tabla real: evita saltos de layout. */
function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} aria-hidden="true">
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c}>
              <div
                className="animate-pulse rounded-lg bg-muted"
                style={{ height: 14, width: `${92 - ((r * 17 + c * 23) % 40)}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export { Skeleton, TableSkeleton };
