"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alert = void 0;
const connection_1 = require("../connection");
const postgis_1 = require("../../../shared/utils/postgis");
const system_1 = require("../../../shared/constants/system");
const ALERT_SELECT_COLUMNS = `
  id, user_id, type, status, address, description, direction, escape_routes,
  created_at, updated_at, ST_AsText(location) AS location_wkt, location
`;
class Alert {
    static hydrateRow(row) {
        const rawGeometry = row?.location_wkt ?? row?.location;
        const coords = (0, postgis_1.parsePostgisPoint)(rawGeometry);
        const { location_wkt: _ignored, ...rest } = row || {};
        return {
            ...rest,
            userId: row?.user_id ?? row?.userId ?? null,
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
            location: (0, postgis_1.normalizePostgisLocationToWkt)(rawGeometry),
        };
    }
    /**
     * Fetch active alerts with their PostGIS location hydrated to numeric coords + WKT
     */
    static async findActive(limit = 50) {
        const pool = (0, connection_1.getPgPool)();
        const res = await pool.query(`SELECT ${ALERT_SELECT_COLUMNS}
       FROM public.alerts
       WHERE status NOT IN ('resolved', 'discarded')
       ORDER BY created_at DESC
       LIMIT $1`, [limit]);
        return res.rows.map((alert) => this.hydrateRow(alert));
    }
    static async findById(id) {
        if (!id || !system_1.UUID_REGEX.test(id))
            return null;
        const pool = (0, connection_1.getPgPool)();
        const res = await pool.query(`SELECT ${ALERT_SELECT_COLUMNS}
       FROM public.alerts
       WHERE id = $1
       LIMIT 1`, [id]);
        if (!res.rows[0])
            return null;
        return this.hydrateRow(res.rows[0]);
    }
    static async create(data) {
        const pool = (0, connection_1.getPgPool)();
        const safeUserId = system_1.UUID_REGEX.test(data.userId)
            ? data.userId
            : system_1.ANONYMOUS_CITIZEN_UUID;
        // Ensure user exists (auto-create anonymous citizen if missing)
        try {
            const cleanSub = `anon_${safeUserId.replace(/-/g, '').substring(0, 12)}`;
            await pool.query(`INSERT INTO public.users (id, full_name, cedula, email, password, role)
         VALUES ($1, 'Ciudadano Anónimo', $2, $3, 'nopassword_anonymous_placeholder', 'citizen')
         ON CONFLICT DO NOTHING`, [safeUserId, cleanSub, `${cleanSub}@red-ciudadana.local`]);
        }
        catch (uErr) {
            console.warn('Warning creating anonymous user in Alert.create:', uErr.message);
        }
        const insertRes = await pool.query(`INSERT INTO public.alerts
         (user_id, type, status, location, address, description, direction, escape_routes)
       VALUES ($1, $2, 'pending', ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8::jsonb)
       RETURNING ${ALERT_SELECT_COLUMNS}`, [
            safeUserId,
            data.type,
            Number(data.longitude),
            Number(data.latitude),
            data.address || '',
            data.description || '',
            data.direction || null,
            JSON.stringify(data.escapeRoutes || []),
        ]);
        const inserted = insertRes.rows[0];
        // Insert Event Sourcing Log
        try {
            await pool.query(`INSERT INTO public.alert_events
           (alert_id, actor_id, event_type, new_status, location, notes)
         VALUES ($1, $2, 'created', 'pending', ST_SetSRID(ST_MakePoint($3, $4), 4326), 'Alert reported by citizen')`, [inserted.id, safeUserId, Number(data.longitude), Number(data.latitude)]);
        }
        catch (eventErr) {
            console.warn('Warning logging alert event:', eventErr.message);
        }
        return this.hydrateRow(inserted);
    }
    static async updateStatus(id, newStatus, actorId, notes) {
        if (!id || !system_1.UUID_REGEX.test(id)) {
            throw new Error('Alert not found');
        }
        const pool = (0, connection_1.getPgPool)();
        const prevRes = await pool.query(`SELECT status FROM public.alerts WHERE id = $1 LIMIT 1`, [id]);
        const oldStatus = prevRes.rows[0]?.status ?? null;
        let eventActorId = system_1.UUID_REGEX.test(actorId) ? actorId : system_1.SYSTEM_ADMIN_UUID;
        // Ensure actor exists to satisfy foreign key (alert_events_actor_id_fkey)
        try {
            const actorCheck = await pool.query(`SELECT id FROM public.users WHERE id = $1 LIMIT 1`, [eventActorId]);
            if (!actorCheck.rows[0]) {
                await pool.query(`INSERT INTO public.users (id, full_name, cedula, email, password, role)
           VALUES ($1, 'Operador del Sistema', 'sys_00000001', 'system@red-ciudadana.local', 'nopassword_system_placeholder', 'admin')
           ON CONFLICT DO NOTHING`, [system_1.SYSTEM_ADMIN_UUID]);
                const sysCheck = await pool.query(`SELECT id FROM public.users WHERE id = $1 LIMIT 1`, [system_1.SYSTEM_ADMIN_UUID]);
                eventActorId = sysCheck.rows[0]?.id ?? null;
            }
        }
        catch (aErr) {
            console.warn('Warning ensuring actor exists in Alert.updateStatus:', aErr.message);
            eventActorId = null;
        }
        const updateRes = await pool.query(`UPDATE public.alerts
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${ALERT_SELECT_COLUMNS}`, [newStatus, id]);
        const updated = updateRes.rows[0];
        if (!updated) {
            throw new Error('Alert not found');
        }
        try {
            await pool.query(`INSERT INTO public.alert_events
           (alert_id, actor_id, event_type, previous_status, new_status, notes)
         VALUES ($1, $2, 'status_change', $3, $4, $5)`, [id, eventActorId, oldStatus, newStatus, notes || 'Status updated manually']);
        }
        catch (eventErr) {
            console.warn('Warning logging alert update event:', eventErr.message);
        }
        return this.hydrateRow(updated);
    }
    static async archive(id, actorId) {
        return this.updateStatus(id, 'resolved', actorId, 'Archived to historical records');
    }
}
exports.Alert = Alert;
exports.default = Alert;
//# sourceMappingURL=Alert.js.map