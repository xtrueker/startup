"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Camera = void 0;
const connection_1 = require("../connection");
const postgis_1 = require("../../../shared/utils/postgis");
const system_1 = require("../../../shared/constants/system");
const CAMERA_SELECT_COLUMNS = `
  id, name, address, stream_url, status, coverage_radius, is_public,
  authority_id, created_at, updated_at, ST_AsText(location) AS location_wkt, location
`;
class Camera {
    static hydrateRow(row) {
        const rawLocation = row?.location_wkt ?? row?.location;
        const { location_wkt: _ignored, ...rest } = row || {};
        return {
            ...rest,
            location: (0, postgis_1.normalizePostgisLocationToWkt)(rawLocation),
        };
    }
    static async find() {
        const pool = (0, connection_1.getPgPool)();
        const res = await pool.query(`SELECT ${CAMERA_SELECT_COLUMNS}
       FROM public.cameras
       ORDER BY created_at DESC`);
        return res.rows.map((cam) => this.hydrateRow(cam));
    }
    static async findById(id) {
        if (!id || !system_1.UUID_REGEX.test(id))
            return null;
        const pool = (0, connection_1.getPgPool)();
        const res = await pool.query(`SELECT ${CAMERA_SELECT_COLUMNS}
       FROM public.cameras
       WHERE id = $1
       LIMIT 1`, [id]);
        return res.rows[0] ? this.hydrateRow(res.rows[0]) : null;
    }
    static async create(data) {
        const pool = (0, connection_1.getPgPool)();
        const safeAuthorityId = data.authorityId && system_1.UUID_REGEX.test(data.authorityId) ? data.authorityId : null;
        const res = await pool.query(`INSERT INTO public.cameras
         (name, location, address, stream_url, status, coverage_radius, is_public, authority_id)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, 'online', $6, $7, $8)
       RETURNING ${CAMERA_SELECT_COLUMNS}`, [
            data.name,
            Number(data.longitude),
            Number(data.latitude),
            data.address || '',
            data.streamUrl || '',
            data.coverageRadius || system_1.DEFAULT_CAMERA_COVERAGE_RADIUS_M,
            data.isPublic ?? true,
            safeAuthorityId,
        ]);
        return this.hydrateRow(res.rows[0]);
    }
    static async delete(id) {
        if (!id || !system_1.UUID_REGEX.test(id))
            return null;
        const pool = (0, connection_1.getPgPool)();
        const res = await pool.query(`DELETE FROM public.cameras WHERE id = $1 RETURNING ${CAMERA_SELECT_COLUMNS}`, [id]);
        return res.rows[0] ? this.hydrateRow(res.rows[0]) : null;
    }
    static async update(id, updateData) {
        if (!id || !system_1.UUID_REGEX.test(id))
            return null;
        const pool = (0, connection_1.getPgPool)();
        const fields = [];
        const values = [];
        if (updateData.name !== undefined) {
            fields.push(`name = $${values.length + 1}`);
            values.push(updateData.name);
        }
        if (updateData.address !== undefined) {
            fields.push(`address = $${values.length + 1}`);
            values.push(updateData.address);
        }
        if (updateData.status !== undefined) {
            fields.push(`status = $${values.length + 1}`);
            values.push(updateData.status);
        }
        if (updateData.streamUrl !== undefined) {
            fields.push(`stream_url = $${values.length + 1}`);
            values.push(updateData.streamUrl);
        }
        if (updateData.coverageRadius !== undefined) {
            fields.push(`coverage_radius = $${values.length + 1}`);
            values.push(updateData.coverageRadius);
        }
        if (updateData.isPublic !== undefined) {
            fields.push(`is_public = $${values.length + 1}`);
            values.push(updateData.isPublic);
        }
        if (updateData.latitude !== undefined && updateData.longitude !== undefined) {
            fields.push(`location = ST_SetSRID(ST_MakePoint($${values.length + 1}, $${values.length + 2}), 4326)`);
            values.push(Number(updateData.longitude), Number(updateData.latitude));
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const res = await pool.query(`UPDATE public.cameras
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING ${CAMERA_SELECT_COLUMNS}`, values);
        return res.rows[0] ? this.hydrateRow(res.rows[0]) : null;
    }
}
exports.Camera = Camera;
exports.default = Camera;
//# sourceMappingURL=Camera.js.map