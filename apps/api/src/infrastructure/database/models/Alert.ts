import { getPgPool } from '../connection';

export interface CreateAlertDTO {
  userId: string;
  type: 'emergency' | 'suspicious' | 'medical' | 'fire' | 'robo' | 'other';
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  direction?: string;
  escapeRoutes?: any[];
}

export class Alert {
  /**
   * Fetch active alerts with their PostGIS location cast to JSON
   */
  static async findActive(limit = 50) {
    const pool = getPgPool();
    
    const result = await pool.query(`
      SELECT id, user_id, type, status, ST_AsText(location) as location, 
             address, description, direction, escape_routes, created_at, updated_at
      FROM alerts
      WHERE status NOT IN ('resolved', 'discarded')
      ORDER BY created_at DESC
      LIMIT $1;
    `, [limit]);

    return result.rows;
  }

  static async findById(id: string) {
    const pool = getPgPool();
    const result = await pool.query(`
      SELECT id, user_id, type, status, ST_AsText(location) as location,
             address, description, direction, escape_routes, created_at, updated_at
      FROM alerts WHERE id = $1 LIMIT 1;
    `, [id]);
    return result.rows[0] || null;
  }

  static async create(data: CreateAlertDTO) {
    const pool = getPgPool();
    
    // PostGIS accepts Well-Known Text (WKT)
    const wktLocation = `POINT(${data.longitude} ${data.latitude})`;

    // Ensure user exists (auto-create anonymous citizen if missing)
    await pool.query(`
      INSERT INTO users (id, full_name, cedula, email, role)
      VALUES ($1, $2, $3, $4, 'citizen')
      ON CONFLICT (id) DO NOTHING;
    `, [data.userId, 'Ciudadano Anónimo', '0000000000', `anon_${data.userId.substring(0,8)}@red-ciudadana.local`]);

    const query = `
      INSERT INTO alerts (user_id, type, status, location, address, description, direction, escape_routes)
      VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6, $7, $8)
      RETURNING id, user_id, type, status, ST_AsText(location) as location, address, description, direction, escape_routes, created_at, updated_at;
    `;
    
    const values = [
      data.userId, data.type, 'pending', wktLocation,
      data.address || '', data.description || '', data.direction || null,
      JSON.stringify(data.escapeRoutes || [])
    ];

    try {
      const result = await pool.query(query, values);
      const inserted = result.rows[0];

      // Insert Event Sourcing Log
      await pool.query(`
        INSERT INTO alert_events (alert_id, actor_id, event_type, new_status, location, notes)
        VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326), $6)
      `, [inserted.id, data.userId, 'created', 'pending', wktLocation, 'Alert reported by citizen']);

      return inserted;
    } catch (error) {
      console.error('Error in Alert.create PostGIS (Native PG):', error);
      throw error;
    }
  }

  static async updateStatus(id: string, newStatus: string, actorId: string, notes?: string) {
    const pool = getPgPool();
    
    // Get old status
    const oldResult = await pool.query('SELECT status FROM alerts WHERE id = $1', [id]);
    const oldStatus = oldResult.rows[0]?.status;
    
    // Validate UUID format, fallback to System Admin UUID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId);
    const finalActorId = isValidUUID ? actorId : '00000000-0000-0000-0000-000000000001';

    // Ensure actor exists to satisfy foreign key (alert_events_actor_id_fkey)
    await pool.query(`
      INSERT INTO users (id, full_name, cedula, email, role)
      VALUES ($1, 'Operador del Sistema', '0000000001', 'system@red-ciudadana.local', 'admin')
      ON CONFLICT (id) DO NOTHING;
    `, [finalActorId]);
    
    // Update alert
    const result = await pool.query(`
      UPDATE alerts SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, user_id, type, status, ST_AsText(location) as location, address, description, direction, escape_routes, created_at, updated_at;
    `, [newStatus, id]);

    if (result.rows.length === 0) throw new Error('Alert not found');
    
    // Log event
    await pool.query(`
      INSERT INTO alert_events (alert_id, actor_id, event_type, previous_status, new_status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, finalActorId, 'status_change', oldStatus, newStatus, notes || 'Status updated manually']);

    return result.rows[0];
  }

  static async archive(id: string, actorId: string) {
    return this.updateStatus(id, 'resolved', actorId, 'Archived to historical records');
  }
}

export default Alert;