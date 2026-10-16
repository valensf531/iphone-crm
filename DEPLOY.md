# Deploy del iPhone CRM (1 tienda)

## Local con Docker
```bash
docker compose up --build
# app en http://localhost:3000, postgres local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/iphone_crm" npm run create-owner -- \
  --email dueno@ejemplo.com --password ClaveSegura123 --name "Dueño"
```

## Dokploy / VPS
1. App desde el repo (detecta el `Dockerfile`).
2. Database PostgreSQL 16 + `DATABASE_URL` interna en Environment.
3. `BETTER_AUTH_URL` y `NEXT_PUBLIC_BASE_URL` = `https://tu-dominio`.
4. `BETTER_AUTH_SECRET` = `openssl rand -hex 32` (único, nunca compartir).
5. Deploy: el contenedor corre `node scripts/migrate.mjs` (idempotente) y arranca.
6. Crear cuenta dueña con `create-owner` contra esa base. El registro web está cerrado a propósito.

## Vercel + Neon
1. Proyecto en Vercel desde el repo.
2. Base en Neon, `DATABASE_URL` en Environment (+ resto de vars).
3. `npm run migrate` una vez contra esa base, luego `create-owner`.
