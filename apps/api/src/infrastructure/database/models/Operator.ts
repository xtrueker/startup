import { supabase, getPgPool } from '../connection';

export type OperatorShift = 'mañana' | 'tarde' | 'noche' | '24x48';
export type OperatorSpecialty = 'cctv' | 'despacho' | 'tactico' | 'supervisor';
export type OperatorStatus = 'en_servicio' | 'disponible' | 'en_descanso' | 'inactivo';

export interface OperatorDTO {
  id: string;
  userId?: string;
  fullName: string;
  cedula: string;
  email: string;
  phone?: string;
  consoleStation: string;
  shift: OperatorShift;
  specialty: OperatorSpecialty;
  status: OperatorStatus;
  zoneAssigned: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOperatorDTO {
  userId?: string;
  fullName: string;
  cedula: string;
  email: string;
  phone?: string;
  consoleStation?: string;
  shift?: OperatorShift;
  specialty?: OperatorSpecialty;
  status?: OperatorStatus;
  zoneAssigned?: string;
}

export class Operator {
  /**
   * Listar todos los operadores
   */
  static async findAll(filters?: { shift?: string; status?: string }): Promise<OperatorDTO[]> {
    const pool = getPgPool();
    let query = `SELECT * FROM public.operators`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.shift) {
      conditions.push(`shift = $${params.length + 1}`);
      params.push(filters.shift);
    }
    if (filters?.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY created_at DESC`;

    const res = await pool.query(query, params);
    return res.rows.map(this.format);
  }

  /**
   * Buscar operador por ID
   */
  static async findById(id: string): Promise<OperatorDTO | null> {
    const pool = getPgPool();
    const res = await pool.query(
      'SELECT * FROM public.operators WHERE id = $1 LIMIT 1',
      [id]
    );
    return res.rows[0] ? this.format(res.rows[0]) : null;
  }

  /**
   * Buscar operador por cédula
   */
  static async findByCedula(cedula: string): Promise<OperatorDTO | null> {
    const pool = getPgPool();
    const res = await pool.query(
      'SELECT * FROM public.operators WHERE cedula = $1 LIMIT 1',
      [cedula]
    );
    return res.rows[0] ? this.format(res.rows[0]) : null;
  }

  /**
   * Buscar operador por email
   */
  static async findByEmail(email: string): Promise<OperatorDTO | null> {
    const pool = getPgPool();
    const res = await pool.query(
      'SELECT * FROM public.operators WHERE email = $1 LIMIT 1',
      [email.toLowerCase()]
    );
    return res.rows[0] ? this.format(res.rows[0]) : null;
  }

  /**
   * Crear un nuevo operador
   */
  static async create(data: CreateOperatorDTO): Promise<OperatorDTO> {
    const pool = getPgPool();

    // Check duplicates
    const existing = await this.findByCedula(data.cedula);
    if (existing) {
      throw new Error(`Ya existe un operador con la cédula '${data.cedula}'`);
    }
    const existingEmail = await this.findByEmail(data.email);
    if (existingEmail) {
      throw new Error(`Ya existe un operador con el correo '${data.email}'`);
    }

    const res = await pool.query(
      `INSERT INTO public.operators
        (user_id, full_name, cedula, email, phone, console_station, shift, specialty, status, zone_assigned, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        data.userId || null,
        data.fullName,
        data.cedula,
        data.email.toLowerCase(),
        data.phone || null,
        data.consoleStation || 'Consola Principal',
        data.shift || 'mañana',
        data.specialty || 'cctv',
        data.status || 'en_servicio',
        data.zoneAssigned || 'Sector General',
      ]
    );

    return this.format(res.rows[0]);
  }

  /**
   * Actualizar un operador
   */
  static async update(id: string, updates: Partial<CreateOperatorDTO & { status: OperatorStatus }>): Promise<OperatorDTO> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Operador '${id}' no encontrado`);

    const pool = getPgPool();
    const fields: string[] = [];
    const values: any[] = [];

    const map: Record<string, string> = {
      fullName: 'full_name',
      phone: 'phone',
      consoleStation: 'console_station',
      shift: 'shift',
      specialty: 'specialty',
      status: 'status',
      zoneAssigned: 'zone_assigned',
    };

    for (const [key, col] of Object.entries(map)) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${col} = $${values.length + 1}`);
        values.push((updates as any)[key]);
      }
    }

    if (fields.length === 0) return existing;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const res = await pool.query(
      `UPDATE public.operators SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    return this.format(res.rows[0]);
  }

  /**
   * Eliminar un operador
   */
  static async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Operador '${id}' no encontrado`);

    const pool = getPgPool();
    await pool.query('DELETE FROM public.operators WHERE id = $1', [id]);
    return true;
  }

  /**
   * Estadísticas rápidas
   */
  static async stats(): Promise<Record<string, number>> {
    const pool = getPgPool();
    const res = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'en_servicio') AS en_servicio,
        COUNT(*) FILTER (WHERE status = 'disponible') AS disponible,
        COUNT(*) FILTER (WHERE status = 'en_descanso') AS en_descanso,
        COUNT(*) FILTER (WHERE status = 'inactivo') AS inactivo,
        COUNT(*) FILTER (WHERE specialty = 'cctv') AS cctv,
        COUNT(*) FILTER (WHERE specialty = 'despacho') AS despacho,
        COUNT(*) FILTER (WHERE specialty = 'tactico') AS tactico,
        COUNT(*) FILTER (WHERE specialty = 'supervisor') AS supervisor
      FROM public.operators
    `);
    const row = res.rows[0];
    return {
      total: parseInt(row.total, 10),
      en_servicio: parseInt(row.en_servicio, 10),
      disponible: parseInt(row.disponible, 10),
      en_descanso: parseInt(row.en_descanso, 10),
      inactivo: parseInt(row.inactivo, 10),
      cctv: parseInt(row.cctv, 10),
      despacho: parseInt(row.despacho, 10),
      tactico: parseInt(row.tactico, 10),
      supervisor: parseInt(row.supervisor, 10),
    };
  }

  private static format(row: any): OperatorDTO {
    return {
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      cedula: row.cedula,
      email: row.email,
      phone: row.phone,
      consoleStation: row.console_station,
      shift: row.shift,
      specialty: row.specialty,
      status: row.status,
      zoneAssigned: row.zone_assigned,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default Operator;
