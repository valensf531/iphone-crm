"use client";

import { useRef, useState } from "react";

/* Evita perder cambios al cerrar un diálogo sin querer (clic afuera o
   Escape): si `dirty` es true, primero pide confirmación. Uso:
   const guard = useDirtyGuard(dirty);
   <Dialog onOpenChange={(v) => { if (!v) guard.guardClose(() => setOpen(false)); else setOpen(true); }}>
   <ConfirmDiscardDialog open={guard.confirmOpen} onConfirm={guard.confirmDiscard} onCancel={guard.cancelDiscard} />
*/
export function useDirtyGuard(dirty: boolean) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  const guardClose = (close: () => void) => {
    if (dirty) {
      pendingRef.current = close;
      setConfirmOpen(true);
    } else {
      close();
    }
  };

  const confirmDiscard = () => {
    setConfirmOpen(false);
    const close = pendingRef.current;
    pendingRef.current = null;
    close?.();
  };

  const cancelDiscard = () => {
    setConfirmOpen(false);
    pendingRef.current = null;
  };

  return { confirmOpen, guardClose, confirmDiscard, cancelDiscard };
}
