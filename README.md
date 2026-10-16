# iPhone CRM — Stock, Dólar AR, Plan Canje y Garantías

CRM para tienda de iPhones (1 local). Stack: Next.js 16 + React 19 + Tailwind 4 + shadcn/ui + better-auth + Neon Postgres. Basado en `kitchen-orders`.

## Qué incluye (Fase 1 lista)

- **Dashboard**: stock disponible, valorizado USD, ventas del mes, garantías vigentes/reclamos/por vencer.
- **Dólar Argentina**: Blue + Oficial en vivo vía `dolarapi.com` (cache 1h + histórico en DB) + carga manual + dólar preferido.
- **Stock por IMEI**: alta con validación 15 dígitos, modelo/capacidad/color/batería %, precio venta **USD + ARS manual opcional** (si no cargás ARS se calcula auto con el blue), filtros y búsqueda.
- **Plan Canje**: tasación auto por **modelo + % batería** (91%+=100%, 85-90%=90%, 80-84%=78%, <80%=60%) con penalizadores (estética B/C, pantalla no original, FaceID) y rechazo si iCloud bloqueado.
- **Ventas**: elige equipo disponible + cliente + dólar/tipo de cambio, calcula ARS final, marca equipo vendido y **crea garantía automática** (30/60/90 días).
- **Garantías**: solo fallas del equipo (no mal uso). Certificado con texto legal, reclamos, botón "mal uso" que rechaza (pantalla rota/mojado/golpe).
- **Clientes**: ABM básico.

## Puesta en marcha

```bash
cd iphone-crm
cp .env.example .env.local
# editar .env.local: DATABASE_URL (Neon), BETTER_AUTH_SECRET (openssl rand -hex 32)
npm install
npm run migrate
npm run create-owner   # crea tu usuario dueño
npm run dev            # http://localhost:3000
```

## Scripts

- `npm run dev` / `build` / `start`
- `npm run typecheck` — `tsc --noEmit`
- `npm run test` — vitest (lógica tasación/IMEI/moneda en `src/lib/crm.test.ts`)
- `npm run migrate` — aplica `src/lib/schema.sql` a Neon

## Pendiente (Fase 2)

- Limpieza de rutas legacy de restaurante (`/menu`, `/carta`, `/api/orders`, `/api/tables`, `/api/zones`, componentes `KitchenDisplay`, etc.).
- PDF de tasación/garantía/ticket, etiquetas QR, importación Excel, tabla `tasacion_base` editable desde UI.
