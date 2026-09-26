"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const connection_1 = require("../../infrastructure/database/connection");
class AuditService {
    /**
     * Logs a significant action to the audit_logs table.
     * Useful for tracking operator actions, escalations, and settings changes.
     */
    static async log(entry) {
        try {
            const sb = (0, connection_1.supabase)();
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
        }
        catch (err) {
            console.error('AuditService: Exception during logging', err);
        }
    }
    /**
     * Helper specifically for Alert state transitions
     */
    static async logAlertTransition(actorId, alertId, oldStatus, newStatus, ipAddress) {
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
exports.AuditService = AuditService;
//# sourceMappingURL=AuditService.js.map