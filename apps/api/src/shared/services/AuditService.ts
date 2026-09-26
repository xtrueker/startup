import { supabase } from '../../infrastructure/database/connection';

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
   * Logs a significant action to the audit_logs table.
   * Useful for tracking operator actions, escalations, and settings changes.
   */
  static async log(entry: AuditLogEntry) {
    try {
      const sb = supabase();
      
      const { error } = await sb.from('audit_logs').insert({
        actor_id: entry.actorId || null,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        ip_address: entry.ipAddress || null,
        details: entry.details || {}
      });

      if (error) {
        console.error('AuditService: Failed to log action', error);
      }
    } catch (err) {
      console.error('AuditService: Exception during logging', err);
    }
  }

  /**
   * Helper specifically for Alert state transitions
   */
  static async logAlertTransition(actorId: string, alertId: string, oldStatus: string, newStatus: string, ipAddress?: string) {
    return this.log({
      actorId,
      action: 'ALERT_STATE_TRANSITION',
      resourceType: 'alert',
      resourceId: alertId,
      ipAddress,
      details: {
        from: oldStatus,
        to: newStatus
      }
    });
  }
}
