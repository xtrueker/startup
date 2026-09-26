"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Camera = void 0;
const connection_1 = require("../connection");
class Camera {
    /**
     * Fetch all cameras
     */
    static async find() {
        const pool = (0, connection_1.getPgPool)();
        const query = `SELECT id, name, stream_url, status, coverage_radius, is_public, authority_id, ST_AsText(location) as location, address, created_at, updated_at FROM cameras ORDER BY created_at DESC`;
        try {
            const result = await pool.query(query);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching cameras:', error);
            throw error;
        }
    }
    static async findById(id) {
        const sb = (0, connection_1.supabase)();
        const { data, error } = await sb.from('cameras').select('*').eq('id', id).maybeSingle();
        if (error)
            throw error;
        return data;
    }
    static async create(data) {
        const sb = (0, connection_1.supabase)();
        const wktLocation = `POINT(${data.longitude} ${data.latitude})`;
        const { data: inserted, error } = await sb.from('cameras').insert({
            name: data.name,
            location: wktLocation,
            address: data.address || '',
            stream_url: data.streamUrl || '',
            status: 'online',
            coverage_radius: data.coverageRadius || 100,
            is_public: data.isPublic ?? true,
            authority_id: data.authorityId || null
        }).select().single();
        if (error) {
            console.error('Error in Camera.create PostGIS:', error);
            throw error;
        }
        return inserted;
    }
    static async delete(id) {
        const sb = (0, connection_1.supabase)();
        const { data, error } = await sb.from('cameras').delete().eq('id', id).select().maybeSingle();
        if (error)
            throw error;
        return data;
    }
    static async update(id, updateData) {
        const sb = (0, connection_1.supabase)();
        const mappedUpdate = {};
        if (updateData.name !== undefined)
            mappedUpdate.name = updateData.name;
        if (updateData.status !== undefined)
            mappedUpdate.status = updateData.status;
        if (updateData.streamUrl !== undefined)
            mappedUpdate.stream_url = updateData.streamUrl;
        if (updateData.coverageRadius !== undefined)
            mappedUpdate.coverage_radius = updateData.coverageRadius;
        if (updateData.isPublic !== undefined)
            mappedUpdate.is_public = updateData.isPublic;
        if (updateData.latitude && updateData.longitude) {
            mappedUpdate.location = `POINT(${updateData.longitude} ${updateData.latitude})`;
        }
        const { data, error } = await sb.from('cameras').update(mappedUpdate).eq('id', id).select().maybeSingle();
        if (error)
            throw error;
        return data;
    }
}
exports.Camera = Camera;
exports.default = Camera;
//# sourceMappingURL=Camera.js.map