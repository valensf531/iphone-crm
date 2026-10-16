import { headers } from 'next/headers';
import { getAuth } from './auth';
import { buildAccess, type AccessContext } from './roles';

/* Contexto de acceso del request actual (sesión + rol + tienda
   efectiva). Null si no hay sesión válida. */
export async function requireAccess(): Promise<AccessContext | null> {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    return buildAccess(session?.user);
  } catch {
    return null;
  }
}

/* Contexto solo si es admin de la tienda efectiva. */
export async function requireAdmin(): Promise<AccessContext | null> {
  const ctx = await requireAccess();
  return ctx && ctx.isAdmin ? ctx : null;
}

export type { AccessContext };
