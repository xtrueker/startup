-- ============================================================
-- MIGRACIÓN COMPLETA: Módulos Administrativos y Centro de Mando
-- Fecha: 2026-10-09
-- Descripción: Tablas, índices, triggers y RLS para todos los módulos
--   - roles y permisos
--   - operators (operadores de monitoreo y despacho)
--   - teams y team_members (equipos de patrulla y campo)
--   - cameras (CCTV y streaming)
--   - alerts y alert_events (gestión de emergencias)
-- ============================================================

-- Habilitar extensión PostGIS si está disponible para coordenadas geográficas
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLA: roles
-- Gestión de roles y permisos del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TABLA: operators
-- Operadores del Centro de Mando (CCTV, despacho, supervisor)
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_operators_cedula    ON public.operators(cedula);
CREATE INDEX IF NOT EXISTS idx_operators_email     ON public.operators(email);
CREATE INDEX IF NOT EXISTS idx_operators_status    ON public.operators(status);
CREATE INDEX IF NOT EXISTS idx_operators_shift     ON public.operators(shift);
CREATE INDEX IF NOT EXISTS idx_operators_specialty ON public.operators(specialty);
CREATE INDEX IF NOT EXISTS idx_operators_user_id   ON public.operators(user_id);

-- ============================================================
-- 3. TABLA: teams
-- Unidades y equipos de respuesta táctica en campo
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_teams_status    ON public.teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_team_type ON public.teams(team_type);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON public.teams(leader_id);

-- ============================================================
-- 4. TABLA: team_members
-- Integrantes de cada cuadrante o unidad operativa
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id         UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  identification  TEXT NOT NULL,
  badge_or_plate  TEXT DEFAULT 'N/A',
  role_in_team    TEXT NOT NULL DEFAULT 'Integrante',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id        ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_identification  ON public.team_members(identification);

-- ============================================================
-- 5. TABLA: cameras
-- Red de videovigilancia CCTV y streams IP
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cameras (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  location        GEOMETRY(Point, 4326),
  address         TEXT DEFAULT '',
  stream_url      TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'online'
                    CHECK (status IN ('online', 'offline', 'maintenance')),
  coverage_radius NUMERIC DEFAULT 100,
  is_public       BOOLEAN DEFAULT true,
  authority_id    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cameras_status ON public.cameras(status);

-- ============================================================
-- 6. TABLA: alerts
-- Despacho de emergencias, incidentes y botones de pánico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewing', 'resolved', 'discarded')),
  location        GEOMETRY(Point, 4326),
  address         TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  direction       TEXT,
  escape_routes   JSONB DEFAULT '[]'::jsonb,
  assigned_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  assigned_operator_id UUID REFERENCES public.operators(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status  ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON public.alerts(created_at DESC);

-- ============================================================
-- 7. TABLA: alert_events
-- Registro de eventos y trazabilidad en tiempo real (Event Sourcing)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alert_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id    UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  payload     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_events_alert_id ON public.alert_events(alert_id);

-- ============================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roles_updated_at ON public.roles;
CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_operators_updated_at ON public.operators;
CREATE TRIGGER trg_operators_updated_at
  BEFORE UPDATE ON public.operators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cameras_updated_at ON public.cameras;
CREATE TRIGGER trg_cameras_updated_at
  BEFORE UPDATE ON public.cameras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_alerts_updated_at ON public.alerts;
CREATE TRIGGER trg_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS: Seguridad a nivel de fila
-- ============================================================
ALTER TABLE public.roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
DROP POLICY IF EXISTS "roles_read_policy" ON public.roles;
CREATE POLICY "roles_read_policy" ON public.roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "operators_read_policy" ON public.operators;
CREATE POLICY "operators_read_policy" ON public.operators FOR SELECT USING (true);

DROP POLICY IF EXISTS "teams_read_policy" ON public.teams;
CREATE POLICY "teams_read_policy" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "team_members_read_policy" ON public.team_members;
CREATE POLICY "team_members_read_policy" ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "cameras_read_policy" ON public.cameras;
CREATE POLICY "cameras_read_policy" ON public.cameras FOR SELECT USING (true);

DROP POLICY IF EXISTS "alerts_read_policy" ON public.alerts;
CREATE POLICY "alerts_read_policy" ON public.alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "alert_events_read_policy" ON public.alert_events;
CREATE POLICY "alert_events_read_policy" ON public.alert_events FOR SELECT USING (true);

-- Políticas de escritura
DROP POLICY IF EXISTS "roles_write_policy" ON public.roles;
CREATE POLICY "roles_write_policy" ON public.roles FOR ALL USING (true);

DROP POLICY IF EXISTS "operators_write_policy" ON public.operators;
CREATE POLICY "operators_write_policy" ON public.operators FOR ALL USING (true);

DROP POLICY IF EXISTS "teams_write_policy" ON public.teams;
CREATE POLICY "teams_write_policy" ON public.teams FOR ALL USING (true);

DROP POLICY IF EXISTS "team_members_write_policy" ON public.team_members;
CREATE POLICY "team_members_write_policy" ON public.team_members FOR ALL USING (true);

DROP POLICY IF EXISTS "cameras_write_policy" ON public.cameras;
CREATE POLICY "cameras_write_policy" ON public.cameras FOR ALL USING (true);

DROP POLICY IF EXISTS "alerts_write_policy" ON public.alerts;
CREATE POLICY "alerts_write_policy" ON public.alerts FOR ALL USING (true);

DROP POLICY IF EXISTS "alert_events_write_policy" ON public.alert_events;
CREATE POLICY "alert_events_write_policy" ON public.alert_events FOR ALL USING (true);

-- ============================================================
-- DATOS INICIALES: Roles del sistema
-- ============================================================
INSERT INTO public.roles (id, name, description, permissions, is_system)
VALUES
  ('admin',      'Administrador',    'Acceso total al sistema',                        ARRAY['*'],                                                          true),
  ('supervisor', 'Supervisor',       'Supervisión de operaciones y personal',           ARRAY['read:all', 'write:operators', 'write:teams', 'write:alerts'], true),
  ('operator',   'Operador',         'Monitoreo CCTV, despacho y seguimiento táctico',  ARRAY['read:cameras', 'read:alerts', 'write:alerts'],               true),
  ('police',     'Unidad de Campo',  'Agente o patrulla en cuadrante táctico',          ARRAY['read:teams', 'write:alerts'],                                true),
  ('citizen',    'Ciudadano',        'Usuario de la app móvil y reportes ciudadanos',  ARRAY['write:alerts'],                                               true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PERMISOS: Roles de Supabase
-- ============================================================
GRANT ALL ON public.roles        TO service_role;
GRANT ALL ON public.operators    TO service_role;
GRANT ALL ON public.teams        TO service_role;
GRANT ALL ON public.team_members TO service_role;
GRANT ALL ON public.cameras      TO service_role;
GRANT ALL ON public.alerts       TO service_role;
GRANT ALL ON public.alert_events TO service_role;

GRANT SELECT ON public.roles        TO anon;
GRANT SELECT ON public.operators    TO anon;
GRANT SELECT ON public.teams        TO anon;
GRANT SELECT ON public.team_members TO anon;
GRANT SELECT ON public.cameras      TO anon;
GRANT SELECT ON public.alerts       TO anon;
GRANT SELECT ON public.alert_events TO anon;
