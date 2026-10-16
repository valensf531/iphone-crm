/* Roles de la tienda: 'admin' ve todo, 'staff' opera stock/ventas.
   La tienda efectiva es la dueña de los datos: tu propio id, o el ownerId
   si tu cuenta fue vinculada como personal de otra tienda. */

export const ADMIN_ROLE = 'admin' as const;
export const STAFF_ROLE = 'staff' as const;

export type AppRole = typeof ADMIN_ROLE | typeof STAFF_ROLE;

export interface AccessContext {
  /* Id del usuario autenticado (quién sos). */
  userId: string;
  /* Id del dueño de los datos (sobre qué tienda operás). */
  storeId: string;
  role: AppRole;
  isAdmin: boolean;
  /* Nombre para defaults (p. ej. cliente sin nombre). */
  name: string | null;
}

type UnknownUser = {
  id?: unknown;
  role?: unknown;
  ownerId?: unknown;
  name?: unknown;
} | null | undefined;

/* Normaliza el rol crudo de la sesión. Ante cualquier duda: staff
   solo si hay vínculo; si no, admin de la propia tienda. Roles
   desconocidos (legados) con vínculo caen a staff. */
export function resolveRole(raw: UnknownUser): { role: AppRole; ownerId: string | null } {
  const ownerId = typeof raw?.ownerId === 'string' && raw.ownerId.length > 0 ? raw.ownerId : null;
  if (ownerId) {
    return { role: STAFF_ROLE, ownerId };
  }
  if (raw?.role === STAFF_ROLE) return { role: STAFF_ROLE, ownerId: null };
  return { role: ADMIN_ROLE, ownerId: null };
}

/* Construye el contexto de acceso desde el user de la sesión.
   Devuelve null si no hay usuario válido. */
export function buildAccess(raw: UnknownUser): AccessContext | null {
  if (!raw || typeof raw.id !== 'string' || raw.id.length === 0) return null;
  const { role, ownerId } = resolveRole(raw);
  return {
    userId: raw.id,
    storeId: ownerId ?? raw.id,
    role,
    isAdmin: role === ADMIN_ROLE,
    name: typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : null,
  };
}
