-- ============================================================================
-- MIGRACIÓN: Blindaje de Seguridad, Evidencia Forense, Push y Ley 1581 (KYC)
-- Fecha: 2026-11-16
-- Descripción:
--   1. Columnas de consentimiento Habeas Data (Ley 1581) y bóveda cifrada KYC en users
--   2. Tabla forense alert_evidence (cadena de custodia SHA-256 + cifrado AES-256-GCM)
--   3. Tabla user_push_tokens para notificaciones críticas FCM/APNs/Expo
--   4. Tabla privacy_audit_logs para trazabilidad legal de acceso a datos sensibles
--   5. Políticas RLS estrictas (cero acceso directo desde rol anon público)
-- ============================================================================

-- 1. Ampliar tabla users con trazabilidad Ley 1581 y metadatos biométricos
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privacy_consent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT DEFAULT 'L1581-2026.1',
  ADD COLUMN IF NOT EXISTS kyc_similarity_score   NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS kyc_provider           TEXT,
  ADD COLUMN IF NOT EXISTS kyc_metadata           JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS kyc_encrypted_vault    JSONB;

-- 2. Tabla de evidencia acústica/multimedia con cadena de custodia SHA-256
CREATE TABLE IF NOT EXISTS public.alert_evidence (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id          UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  user_id           UUID,
  media_type        TEXT NOT NULL DEFAULT 'audio/webm',
  chunk_index       INTEGER NOT NULL DEFAULT 0,
  duration_ms       INTEGER,
  byte_size         INTEGER NOT NULL,
  sha256_hash       TEXT NOT NULL,
  storage_provider  TEXT NOT NULL DEFAULT 'encrypted_vault',
  storage_path      TEXT,
  encrypted_payload TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_evidence_alert_id ON public.alert_evidence(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_evidence_created  ON public.alert_evidence(created_at DESC);

-- 3. Tabla de tokens Push (FCM / APNs / Expo) para despertar terminales bloqueadas
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform        TEXT NOT NULL DEFAULT 'unknown',
  role            TEXT NOT NULL DEFAULT 'citizen',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_role    ON public.user_push_tokens(role) WHERE is_active = true;

-- 4. Bitácora de auditoría legal (Ley 1581 de Protección de Datos Personales)
CREATE TABLE IF NOT EXISTS public.privacy_audit_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id       UUID,
  target_user_id UUID,
  resource_type  TEXT NOT NULL,
  action         TEXT NOT NULL,
  ip_address     TEXT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_target  ON public.privacy_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_created ON public.privacy_audit_logs(created_at DESC);

-- 5. Blindaje RLS estricto sobre las tablas sensibles nuevas (cero acceso anon)
ALTER TABLE public.alert_evidence     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_push_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.alert_evidence     FROM anon, authenticated;
REVOKE ALL ON public.user_push_tokens   FROM anon, authenticated;
REVOKE ALL ON public.privacy_audit_logs FROM anon, authenticated;

GRANT ALL ON public.alert_evidence     TO service_role;
GRANT ALL ON public.user_push_tokens   TO service_role;
GRANT ALL ON public.privacy_audit_logs TO service_role;

DROP POLICY IF EXISTS "service_role_only_alert_evidence" ON public.alert_evidence;
CREATE POLICY "service_role_only_alert_evidence"
  ON public.alert_evidence
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_only_push_tokens" ON public.user_push_tokens;
CREATE POLICY "service_role_only_push_tokens"
  ON public.user_push_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_only_privacy_audit" ON public.privacy_audit_logs;
CREATE POLICY "service_role_only_privacy_audit"
  ON public.privacy_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Crear buckets privados de Supabase Storage si el esquema storage está presente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES
      ('alert-evidence', 'alert-evidence', false),
      ('kyc-vault', 'kyc-vault', false)
    ON CONFLICT (id) DO UPDATE SET public = false;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Omitiendo creación directa en storage.buckets: %', SQLERRM;
END $$;
