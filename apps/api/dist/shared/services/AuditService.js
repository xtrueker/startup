"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const connection_1 = require("../../infrastructure/database/connection");
const system_1 = require("../constants/system");
class AuditService {
    /**
     * Logs a significant action to the audit_logs table using the native PG pool.
     */
    static async log(entry) {
        try {
            const pool = (0, connection_1.getPgPool)();
            const safeActorId = entry.actorId && system_1.UUID_REGEX.test(entry.actorId)
                ? entry.actorId
                : entry.actorId === 'system'
                    ? system_1.SYSTEM_ADMIN_UUID
                    : null;
            const safeResourceId = entry.resourceId && system_1.UUID_REGEX.test(entry.resourceId)
                ? entry.resourceId
                : null;
            await pool.query(`INSERT INTO public.audit_logs
           (actor_id, action, resource_type, resource_id, ip_address, details)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`, [
                safeActorId,
                entry.action,
                entry.resourceType,
                safeResourceId,
                entry.ipAddress || null,
                JSON.stringify(entry.details || {}),
            ]);
        }
        catch (err) {
            console.error('AuditService: Exception during logging', err);
        }
    }
    static async logAlertTransition(actorId, alertId, oldStatus, newStatus, ipAddress) {
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
exports.AuditService = AuditService;
//# sourceMappingURL=AuditService.js.map