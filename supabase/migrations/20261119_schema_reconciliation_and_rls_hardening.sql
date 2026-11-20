-- ============================================================================
-- MIGRACIÓN: Reconciliación Integral de Esquema y Endurecimiento RLS (Zero-Anon)
-- Fecha: 2026-11-19
-- Descripción:
--   1. Garantiza existencia idempotente de tablas base (users, audit_logs, operators, teams, team_members)
--   2. Reconcilia columnas reales de alert_events (actor_id, previous_status, new_status, location, notes)
--   3. Actualiza restricción CHECK de alerts.status para permitir estado 'verified'
--   4. Revoca permisos abiertos a rol público 'anon' / 'authenticated' y aplica RLS estricto
--      exclusivo para el servidor central (service_role / conexión directa PostgreSQL)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla base: users (idempotente para entornos nuevos)
CREATE TABLE IF NOT EXISTS public.users (
  id                         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name                  TEXT NOT NULL,
  cedula                     TEXT NOT NULL UNIQUE,
  email                      TEXT NOT NULL UNIQUE,
  password                   TEXT NOT NULL DEFAULT 'nopassword_placeholder',
  role                       TEXT NOT NULL DEFAULT 'citizen',
  phone                      TEXT,
  ciudad                     TEXT,
  id_card_front              TEXT,
  id_card_back               TEXT,
  selfie_photo               TEXT,
  verification_notes         TEXT,
  is_verified                BOOLEAN NOT NULL DEFAULT false,
  facial_verification_status TEXT NOT NULL DEFAULT 'pending',
  privacy_consent_at         TIMESTAMPTZ,
  privacy_policy_version     TEXT DEFAULT 'L1581-2026.1',
  kyc_similarity_score       NUMERIC(5,2),
  kyc_provider               TEXT,
  kyc_metadata               JSONB DEFAULT '{}'::jsonb,
  kyc_encrypted_vault        JSONB,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Garantizar tablas administrativas (operators, teams, team_members) si aún no fueron aplicadas
CREATE TABLE IF NOT EXISTS public.operators (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  cedula          TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  console_station TEXT NOT NULL DEFAULT 'Consola Principal',
  shift           TEXT NOT NULL DEFAULT 'mañana'
                    CHECK (shift IN ('mañana', 'tarde', 'noche', '24x48')),
  specialty       TEXT NOT NULL DEFAULT 'cctv'
                    CHECK (specialty IN ('cctv', 'despacho', 'tactico', 'supervisor')),
  status          TEXT NOT NULL DEFAULT 'en_servicio'
                    CHECK (status IN ('en_servicio', 'disponible', 'en_descanso', 'inactivo')),
  zone_assigned   TEXT NOT NULL DEFAULT 'Sector General',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name           TEXT NOT NULL,
  team_type           TEXT NOT NULL DEFAULT 'patrulla'
                        CHECK (team_type IN ('patrulla', 'ambulancia', 'motorizada', 'tactica', 'vigilancia')),
  leader_username     TEXT NOT NULL,
  leader_email        TEXT NOT NULL,
  leader_id           TEXT NOT NULL,
  main_vehicle_plate  TEXT NOT NULL,
  assigned_zone       TEXT NOT NULL DEFAULT 'Sector General',
  status              TEXT NOT NULL DEFAULT 'disponible'
                        CHECK (status IN ('patrullando', 'disponible', 'en_incidente', 'fuera_servicio')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id         UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  identification  TEXT NOT NULL,
  badge_or_plate  TEXT DEFAULT 'N/A',
  role_in_team    TEXT NOT NULL DEFAULT 'Integrante',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de auditoría operacional: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id      UUID,
  action        VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id   UUID,
  ip_address    VARCHAR(64),
  details       JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 4. Reconciliar columnas de trazabilidad en alert_events
ALTER TABLE public.alert_events
  ADD COLUMN IF NOT EXISTS actor_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS previous_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS new_status      VARCHAR(40),
  ADD COLUMN IF NOT EXISTS location        GEOMETRY(Point, 4326),
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS payload         JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_alert_events_actor_id ON public.alert_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_created  ON public.alert_events(created_at DESC);

-- 5. Reconciliar CHECK constraint de alerts.status para admitir 'verified'
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_status_check;
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_status_check
  CHECK (status IN ('pending', 'reviewing', 'verified', 'resolved', 'discarded'));

-- 6. Endurecimiento RLS estricto: eliminar políticas abiertas USING (true) y revocar acceso 'anon'
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'roles',
    'operators',
    'teams',
    'team_members',
    'cameras',
    'alerts',
    'alert_events',
    'alert_evidence',
    'audit_logs',
    'privacy_audit_logs',
    'user_push_tokens',
    'historical_incidents'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);

      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
      END LOOP;

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        'service_role_only_' || tbl,
        tbl
      );
    END IF;
  END LOOP;
END $$;
