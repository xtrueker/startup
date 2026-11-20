import { getPgPool } from '../../infrastructure/database/connection';
import { SYSTEM_ADMIN_UUID, UUID_REGEX } from '../constants/system';

export interface AuditLogEntry {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
}

export class AuditService {
  /**
   * Logs a significant action to the audit_logs table using the native PG pool.
   */
  static async log(entry: AuditLogEntry) {
    try {
      const pool = getPgPool();
      const safeActorId =
        entry.actorId && UUID_REGEX.test(entry.actorId)
          ? entry.actorId
          : entry.actorId === 'system'
          ? SYSTEM_ADMIN_UUID
          : null;
      const safeResourceId =
        entry.resourceId && UUID_REGEX.test(entry.resourceId)
          ? entry.resourceId
          : null;

      await pool.query(
        `INSERT INTO public.audit_logs
           (actor_id, action, resource_type, resource_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          safeActorId,
          entry.action,
          entry.resourceType,
          safeResourceId,
          entry.ipAddress || null,
          JSON.stringify(entry.details || {}),
        ]
      );
    } catch (err) {
      console.error('AuditService: Exception during logging', err);
    }
  }

  static async logAlertTransition(
    actorId: string,
    alertId: string,
    oldStatus: string,
    newStatus: string,
    ipAddress?: string
  ) {
    return this.log({
      actorId,
      action: 'ALERT_STATE_TRANSITION',
      resourceType: 'alert',
      resourceId: alertId,
      ipAddress,
      details: {
        from: oldStatus,
        to: newStatus,
      },
    });
  }
}
