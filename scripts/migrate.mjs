// Aplica src/lib/schema.sql contra DATABASE_URL (Neon).
// Uso: npm run migrate  (requiere DATABASE_URL en el entorno o .env.local)
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Carga mínima de .env.local sin dependencias extra.
for (const file of ['.env.local', '.env']) {
  const path = resolve(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Falta DATABASE_URL. Definila en el entorno o en .env.local.');
  process.exit(1);
}

// Este proyecto usa el driver HTTP de Neon (@neondatabase/serverless),
// que SOLO funciona contra Neon cloud. Un localhost da "fetch failed".
if (!/neon\.tech/i.test(connectionString)) {
  console.error(
    'DATABASE_URL no apunta a Neon. Este proyecto usa el driver serverless de Neon,\n' +
    'que solo funciona con una base Neon cloud (como la de kitchen-orders).\n' +
    'Pasos: creá un proyecto "iphone-crm" en https://console.neon.tech\n' +
    'y pegá su connection string en .env.local como DATABASE_URL.',
  );
  process.exit(1);
}

const schemaPath = resolve(root, 'src/lib/schema.sql');
const schema = readFileSync(schemaPath, 'utf8');

const sql = neon(connectionString);
// Neon http no acepta multi-statement: separamos por ';' de forma simple
// (schema.sql no contiene funciones con cuerpo ni ';' dentro de strings).
// Los comentarios '--' se quitan ANTES de separar, así un ';' dentro de
// un comentario no genera statements fantasmas.
const withoutComments = schema
  .split('\n')
  .map((line) => {
    const idx = line.indexOf('--');
    return idx >= 0 ? line.slice(0, idx) : line;
  })
  .join('\n');
const statements = withoutComments
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

// Ejecuta cada statement; los ALTER ... IF NOT EXISTS son idempotentes.
let applied = 0;
for (const statement of statements) {
  await sql.query(statement);
  applied += 1;
}
console.log(`Migración OK: ${applied} statements de ${schemaPath}`);
