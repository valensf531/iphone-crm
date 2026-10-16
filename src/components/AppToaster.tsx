"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

/* Las notificaciones se descartan solas a los 5 segundos.
   También se pueden cerrar manualmente (X o swipe). */
const TOAST_DURATION = 5000;

function haceCuanto(ts?: number): string | null {
  if (!ts) return null;
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "ahora";
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return `hace ${h} h`;
}

function Icono({ variant }: { variant?: string | null }) {
  if (variant === "destructive")
    return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive-foreground" aria-hidden="true" />;
  if (variant === "success")
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />;
  return <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

/* Notificaciones shadcn clásicas: lista simple abajo a la derecha,
   persistentes hasta cierre manual. */
export function AppToaster() {
  const { toasts } = useToast();
  const [, tick] = React.useState(0);

  // Reloj vivo: refresca el "ahora / hace X" cada 5s.
  React.useEffect(() => {
    if (toasts.length === 0) return;
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, [toasts.length]);

  return (
    <ToastProvider duration={TOAST_DURATION} swipeDirection="right">
      {toasts.map(({ id, title, description, action, createdAt, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <Icono variant={variant} />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <div className="flex min-w-0 items-baseline gap-2">
              {title ? <ToastTitle className="min-w-0 flex-1">{title}</ToastTitle> : null}
              {createdAt ? (
                <span
                  className="shrink-0 text-[11px] tabular-nums text-muted-foreground group-[.destructive]:text-destructive-foreground"
                  title={new Date(createdAt).toLocaleString()}
                >
                  {haceCuanto(createdAt)}
                </span>
              ) : null}
            </div>
            {description ? <ToastDescription>{description}</ToastDescription> : null}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport
        className="flex-col"
        aria-label={toasts.length > 0 ? `Notificaciones (${toasts.length})` : "Notificaciones"}
      />
    </ToastProvider>
  );
}
