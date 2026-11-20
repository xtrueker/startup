/**
 * Constantes transversales de roles, estados e identidades de sistema.
 * Centraliza UUIDs centinela y listas de control de acceso para evitar valores quemados.
 */

export const SYSTEM_ADMIN_UUID = '00000000-0000-0000-0000-000000000001';
export const ANONYMOUS_CITIZEN_UUID = '00000000-0000-0000-0000-000000000002';
export const FALLBACK_AUTHORITY_UUID = '00000000-0000-0000-0000-000000000000';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EMERGENCY_PUSH_CHANNEL_ID = 'rc-emergency-siren';
export const DEFAULT_AUDIO_CHUNK_DURATION_MS = 15000;
export const DEFAULT_CAMERA_COVERAGE_RADIUS_M = 100;

export const ADMIN_ONLY_ROLES = ['admin'];
export const ADMIN_SUPERVISOR_ROLES = ['admin', 'supervisor'];
export const COMMAND_CENTER_ROLES = ['admin', 'supervisor', 'operator'];
export const AUTHORITY_ROLES = ['admin', 'supervisor', 'operator', 'police'];
export const ALL_AUTHENTICATED_ROLES = [
  'admin',
  'supervisor',
  'operator',
  'police',
  'citizen',
];
export const STANDARD_SYSTEM_ROLES = [
  'citizen',
  'operator',
  'supervisor',
  'admin',
  'police',
];

export const ALERT_VALID_STATUSES = [
  'pending',
  'reviewing',
  'verified',
  'resolved',
  'discarded',
] as const;

export const FACIAL_VERIFICATION_STATUSES = [
  'pending',
  'verified',
  'under_review',
  'rejected',
] as const;
