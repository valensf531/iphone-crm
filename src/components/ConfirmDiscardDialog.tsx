"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* Confirmación genérica de "salir sin guardar" para formularios en diálogo. */
export function ConfirmDiscardDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent aria-describedby={undefined} className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">¿Salir sin guardar?</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tenés cambios sin guardar. Si salís ahora, se pierden.
          </p>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 min-[480px]:flex-row min-[480px]:justify-end">
          <Button variant="outline" className="w-full rounded-xl min-[480px]:w-auto" onClick={onCancel}>
            Seguir editando
          </Button>
          <Button variant="destructive" className="w-full rounded-xl min-[480px]:w-auto" onClick={onConfirm}>
            Salir sin guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
