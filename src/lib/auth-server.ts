import { headers } from "next/headers";
import { cache } from "react";
import { getAuth } from "./auth";

export const getSession = cache(async () => {
  try {
    const auth = getAuth();
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    // Build sin DATABASE_URL o sin sesión: trata como no autenticado.
    return null;
  }
});

export async function requireUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}
