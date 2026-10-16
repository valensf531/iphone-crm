-- CRM iPhones: tablas de auth (better-auth) + CRM.
-- Las tablas de auth las crea better-auth via CLI en otros proyectos;
-- acá se crean explícito para que `npm run migrate` sea autocontenido.
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role TEXT NOT NULL DEFAULT 'admin',
  "ownerId" TEXT
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roles (role/ownerId ya vienen en el CREATE; los ALTER cubren DBs viejas).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
CREATE INDEX IF NOT EXISTS idx_user_owner ON "user"("ownerId");

-- Stock por IMEI (unidad individual).
CREATE TABLE IF NOT EXISTS iphone_stock (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  imei VARCHAR(20) NOT NULL,
  serial VARCHAR(50),
  modelo VARCHAR(50) NOT NULL,
  capacidad VARCHAR(20) NOT NULL,
  color VARCHAR(50),
  estado_equipo VARCHAR(30) NOT NULL DEFAULT 'usado_a',
  bateria_pct INTEGER,
  estado VARCHAR(30) NOT NULL DEFAULT 'disponible',
  precio_compra_usd NUMERIC(12,2),
  precio_venta_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta_ars_manual NUMERIC(14,2),
  proveedor VARCHAR(200),
  fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, imei)
);
CREATE INDEX IF NOT EXISTS idx_stock_user ON iphone_stock(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_estado ON iphone_stock(user_id, estado);
CREATE INDEX IF NOT EXISTS idx_stock_modelo ON iphone_stock(user_id, modelo);
ALTER TABLE iphone_stock ADD COLUMN IF NOT EXISTS sellado BOOLEAN NOT NULL DEFAULT false;

-- Cotización dólar (cache + override manual).
CREATE TABLE IF NOT EXISTS dolar_rates (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  oficial_compra NUMERIC(12,2),
  oficial_venta NUMERIC(12,2),
  blue_compra NUMERIC(12,2),
  blue_venta NUMERIC(12,2),
  fuente VARCHAR(50) NOT NULL DEFAULT 'manual',
  manual_override BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_dolar_user_fecha ON dolar_rates(user_id, fecha DESC);

-- Dólar preferido para ventas por usuario.
CREATE TABLE IF NOT EXISTS crm_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  dolar_preferido VARCHAR(20) NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clientes.
CREATE TABLE IF NOT EXISTS clientes (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  dni VARCHAR(20),
  telefono VARCHAR(50),
  email VARCHAR(200),
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clientes_user ON clientes(user_id);

-- Tabla de tasación base Plan Canje (modelo + rango batería -> toma USD).
CREATE TABLE IF NOT EXISTS tasacion_base (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  modelo VARCHAR(50) NOT NULL,
  bateria_min INTEGER NOT NULL,
  bateria_max INTEGER NOT NULL,
  precio_toma_usd NUMERIC(12,2) NOT NULL,
  UNIQUE(user_id, modelo, bateria_min, bateria_max)
);

-- Canjes.
CREATE TABLE IF NOT EXISTS canjes (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cliente_id VARCHAR(50),
  stock_nuevo_id VARCHAR(50),
  modelo_recibido VARCHAR(50) NOT NULL,
  capacidad_recibida VARCHAR(20),
  imei_recibido VARCHAR(20),
  bateria_pct INTEGER,
  estetica VARCHAR(20) NOT NULL DEFAULT 'a',
  pantalla_original BOOLEAN NOT NULL DEFAULT true,
  faceid_ok BOOLEAN NOT NULL DEFAULT true,
  icloud_desbloqueado BOOLEAN NOT NULL DEFAULT true,
  observaciones TEXT,
  tasacion_auto_usd NUMERIC(12,2),
  tasacion_final_usd NUMERIC(12,2),
  estado VARCHAR(20) NOT NULL DEFAULT 'tasado',
  stock_entrada_id VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canjes_user ON canjes(user_id, fecha DESC);

-- Ventas.
CREATE TABLE IF NOT EXISTS ventas (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cliente_id VARCHAR(50),
  stock_id VARCHAR(50) NOT NULL,
  precio_usd NUMERIC(12,2) NOT NULL,
  dolar_tipo VARCHAR(20) NOT NULL DEFAULT 'blue',
  tipo_cambio NUMERIC(12,2) NOT NULL,
  precio_final_ars NUMERIC(14,2) NOT NULL,
  metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo',
  canje_id VARCHAR(50),
  descuento_canje_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ventas_user ON ventas(user_id, fecha DESC);

-- Fotos de entrega por venta (JPEG reducido a dataURL, máx. 4 por venta).
CREATE TABLE IF NOT EXISTS venta_fotos (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  venta_id VARCHAR(50) NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  foto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_venta_fotos_venta ON venta_fotos(venta_id);

-- Accesorios incluidos en cada venta (snapshot de nombre/precio + cantidad).
CREATE TABLE IF NOT EXISTS venta_accesorios (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  venta_id VARCHAR(50) NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  accesorio_id VARCHAR(50) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_final_ars NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_venta_acc_venta ON venta_accesorios(venta_id);

-- Verificación del dispositivo al vender (pantalla, piezas cambiadas,
-- detalles + flag REPRO informativo). Opcional 1-a-1 por venta.
CREATE TABLE IF NOT EXISTS venta_verificacion (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  venta_id VARCHAR(50) NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  pantalla TEXT NOT NULL DEFAULT '',
  piezas_cambiadas TEXT NOT NULL DEFAULT '',
  detalles TEXT NOT NULL DEFAULT '',
  repro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, venta_id)
);
CREATE INDEX IF NOT EXISTS idx_venta_verif_venta ON venta_verificacion(venta_id);

-- Garantías (solo fallas del equipo, no mal uso).
CREATE TABLE IF NOT EXISTS garantias (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  venta_id VARCHAR(50) NOT NULL,
  stock_id VARCHAR(50) NOT NULL,
  cliente_id VARCHAR(50),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  dias INTEGER NOT NULL DEFAULT 90,
  fecha_vencimiento DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'vigente',
  reclamo_fecha TIMESTAMPTZ,
  reclamo_motivo TEXT,
  reclamo_mal_uso BOOLEAN NOT NULL DEFAULT false,
  reclamo_solucion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_garantias_user ON garantias(user_id, estado);
CREATE INDEX IF NOT EXISTS idx_garantias_venc ON garantias(user_id, fecha_vencimiento);

-- Movimientos de stock (auditoría).
CREATE TABLE IF NOT EXISTS stock_movimientos (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  stock_id VARCHAR(50) NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  motivo TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mov_user_stock ON stock_movimientos(user_id, stock_id);

-- Accesorios (cargadores, cables, fundas: se manejan por cantidad, sin IMEI).
CREATE TABLE IF NOT EXISTS accesorios (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'otros',
  cantidad INTEGER NOT NULL DEFAULT 0,
  precio_compra_usd NUMERIC(12,2),
  precio_venta_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta_ars_manual NUMERIC(14,2),
  proveedor VARCHAR(200),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accesorios_user ON accesorios(user_id);
