"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alert = void 0;
const connection_1 = require("../connection");
const postgis_1 = require("../../../shared/utils/postgis");
class Alert {
    static hydrateRow(row) {
        const coords = (0, postgis_1.parsePostgisPoint)(row?.location);
        return {
            ...row,
            userId: row?.user_id ?? row?.userId ?? null,
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
            location: (0, postgis_1.normalizePostgisLocationToWkt)(row?.location),
        };
    }
    /**
     * Fetch active alerts with their PostGIS location hydrated to numeric coords + WKT
     */
    static async findActive(limit = 50) {
        const sb = (0, connection_1.supabase)();
        const { data, error } = await sb
            .from('alerts')
            .select('*')
            .not('status', 'in', '("resolved","discarded")')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) {
            console.error('Error fetching active alerts:', error);
            throw error;
        }
        return (data || []).map((alert) => this.hydrateRow(alert));
    }
    static async findById(id) {
        const sb = (0, connection_1.supabase)();
        const { data, error } = await sb
            .from('alerts')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) {
            console.error('Error fetching alert by id:', error);
            throw error;
        }
        if (!data)
            return null;
        return this.hydrateRow(data);
    }
    static async create(data) {
        const sb = (0, connection_1.supabase)();
        const wktLocation = `POINT(${data.longitude} ${data.latitude})`;
        // Ensure user exists (auto-create anonymous citizen if missing)
        try {
            const cleanSub = data.userId.replace(/[^0-9]/g, '').substring(0, 10).padEnd(10, '0');
            await sb.from('users').upsert({
                id: data.userId,
                full_name: 'Ciudadano Anónimo',
                cedula: cleanSub,
                email: `anon_${data.userId.substring(0, 8)}@red-ciudadana.local`,
                password: 'nopassword_anonymous_placeholder',
                role: 'citizen'
            }, { onConflict: 'id', ignoreDuplicates: true });
        }
        catch (uErr) {
            console.warn('Warning creating anonymous user in Alert.create:', uErr.message);
        }
        const { data: inserted, error } = await sb.from('alerts').insert({
            user_id: data.userId,
            type: data.type,
            status: 'pending',
            location: wktLocation,
            address: data.address || '',
            description: data.description || '',
            direction: data.direction || null,
            escape_routes: data.escapeRoutes || []
        }).select().single();
        if (error) {
            console.error('Error in Alert.create (Supabase REST):', error);
            throw error;
        }
        // Insert Event Sourcing Log
        try {
            await sb.from('alert_events').insert({
                alert_id: inserted.id,
                actor_id: data.userId,
                event_type: 'created',
                new_status: 'pending',
                location: wktLocation,
                notes: 'Alert reported by citizen'
            });
        }
        catch (eventErr) {
            console.warn('Warning logging alert event:', eventErr.message);
        }
        return this.hydrateRow({
            ...inserted,
            location: wktLocation,
        });
    }
    static async updateStatus(id, newStatus, actorId, notes) {
        const sb = (0, connection_1.supabase)();
        // Get old status
        const { data: oldAlert } = await sb.from('alerts').select('status').eq('id', id).maybeSingle();
        const oldStatus = oldAlert?.status;
        // Validate UUID format, fallback to System Admin UUID
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId);
        const finalActorId = isValidUUID ? actorId : '00000000-0000-0000-0000-000000000001';
        // Ensure actor exists to satisfy foreign key (alert_events_actor_id_fkey)
        try {
            await sb.from('users').upsert({
                id: finalActorId,
                full_name: 'Operador del Sistema',
                cedula: '0000000001',
                email: 'system@red-ciudadana.local',
                role: 'admin'
            }, { onConflict: 'id', ignoreDuplicates: true });
        }
        catch (aErr) {
            console.warn('Warning ensuring actor exists in Alert.updateStatus:', aErr.message);
        }
        // Update alert
        const { data: updated, error } = await sb
            .from('alerts')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error || !updated) {
            throw new Error(error?.message || 'Alert not found');
        }
        // Log event
        try {
            await sb.from('alert_events').insert({
                alert_id: id,
                actor_id: finalActorId,
                event_type: 'status_change',
                previous_status: oldStatus,
                new_status: newStatus,
                notes: notes || 'Status updated manually'
            });
        }
        catch (eventErr) {
            console.warn('Warning logging alert update event:', eventErr.message);
        }
        return updated;
    }
    static async archive(id, actorId) {
        return this.updateStatus(id, 'resolved', actorId, 'Archived to historical records');
    }
}
exports.Alert = Alert;
exports.default = Alert;
//# sourceMappingURL=Alert.js.map