import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dbConnection, getPgPool } from '../infrastructure/database/connection';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../supabase/migrations');
const ADVISORY_LOCK_KEY = 74290188;

interface MigrationRecord {
  filename: string;
  checksum: string;
  applied_at: string;
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function listMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`No se encontró la carpeta de migraciones: ${MIGRATIONS_DIR}`);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

async function ensureMigrationsTable(): Promise<void> {
  const pool = getPgPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename   TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.schema_migrations FROM anon, authenticated;
    GRANT ALL ON public.schema_migrations TO service_role;
  `);
}

async function getAppliedMigrations(): Promise<Map<string, MigrationRecord>> {
  const pool = getPgPool();
  const res = await pool.query<MigrationRecord>(
    'SELECT filename, checksum, applied_at FROM public.schema_migrations ORDER BY filename ASC'
  );
  return new Map(res.rows.map((r) => [r.filename, r]));
}

async function run(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const isStatus = args.has('--status');
  const isBaseline = args.has('--baseline');

  await dbConnection.connect();
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    await ensureMigrationsTable();

    const files = listMigrationFiles();
    const applied = await getAppliedMigrations();

    if (isStatus) {
      console.log('=== ESTADO DE MIGRACIONES SQL ===');
      for (const file of files) {
        const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        const currentHash = sha256(content);
        const rec = applied.get(file);
        if (rec) {
          const drift = rec.checksum !== currentHash ? ' [CHECKSUM MODIFICADO]' : '';
          console.log(`  [APPLIED] ${file} (${new Date(rec.applied_at).toISOString()})${drift}`);
        } else {
          console.log(`  [PENDING] ${file}`);
        }
      }
      return;
    }

    let appliedCount = 0;
    for (const file of files) {
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      const checksum = sha256(sql);
      const existing = applied.get(file);

      if (existing) {
        if (existing.checksum !== checksum) {
          console.warn(`⚠️ Checksum distinto en migración ya aplicada: ${file}`);
        }
        continue;
      }

      if (isBaseline) {
        await client.query(
          `INSERT INTO public.schema_migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING`,
          [file, checksum]
        );
        console.log(`📌 Baseline registrado (sin re-ejecutar): ${file}`);
        appliedCount++;
        continue;
      }

      console.log(`🚀 Aplicando migración: ${file}...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO public.schema_migrations (filename, checksum) VALUES ($1, $2)`,
          [file, checksum]
        );
        await client.query('COMMIT');
        console.log(`✅ Migración aplicada: ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error aplicando ${file} (ROLLBACK ejecutado):`, err);
        throw err;
      }
    }

    if (appliedCount === 0) {
      console.log('✅ Base de datos al día: no hay migraciones pendientes.');
    } else {
      console.log(`✅ Proceso completado (${appliedCount} migración(es) registradas).`);
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => {});
    client.release();
    await dbConnection.disconnect().catch(() => {});
  }
}

run().catch((err) => {
  console.error('❌ Falló el runner de migraciones:', err?.message || err);
  process.exitCode = 1;
});
