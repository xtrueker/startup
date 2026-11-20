import bcrypt from 'bcryptjs';
import { getPgPool } from '../connection';
import { UUID_REGEX } from '../../../shared/constants/system';

export interface CreateUserDTO {
  fullName: string;
  cedula: string;
  email: string;
  password?: string;
  role?: string;
  phone?: string;
  ciudad?: string;
  idCardFront?: string;
  idCardBack?: string;
  selfiePhoto?: string;
  isVerified?: boolean;
  facialVerificationStatus?: 'pending' | 'verified' | 'under_review' | 'rejected';
}

const PUBLIC_USER_COLUMNS =
  'id, full_name, cedula, email, role, phone, ciudad, is_verified, facial_verification_status, created_at';

export class User {
  static toDTO(row: Record<string, any>, extras?: Record<string, unknown>) {
    return {
      id: row.id,
      fullName: row.full_name ?? row.fullName,
      cedula: row.cedula,
      email: row.email,
      role: row.role,
      phone: row.phone ?? null,
      ciudad: row.ciudad ?? null,
      isVerified: Boolean(row.is_verified ?? row.isVerified),
      facialVerificationStatus:
        row.facial_verification_status ?? row.facialVerificationStatus ?? 'pending',
      ...(row.created_at !== undefined ? { createdAt: row.created_at } : {}),
      ...(extras || {}),
    };
  }

  static async findByEmail(email: string) {
    const pool = getPgPool();
    const res = await pool.query(
      `SELECT * FROM public.users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    return res.rows[0] || null;
  }

  static async findByCedula(cedula: string) {
    const pool = getPgPool();
    const res = await pool.query(
      `SELECT * FROM public.users WHERE cedula = $1 LIMIT 1`,
      [cedula.trim()]
    );
    return res.rows[0] || null;
  }

  static async create(data: CreateUserDTO) {
    const pool = getPgPool();

    let passwordHash = data.password || null;
    if (passwordHash) {
      passwordHash = await bcrypt.hash(passwordHash, 10);
    }

    const isKycComplete = Boolean(data.idCardFront && data.selfiePhoto);
    const defaultVerification =
      data.isVerified !== undefined ? data.isVerified : isKycComplete;
    const defaultFacialStatus =
      data.facialVerificationStatus || (isKycComplete ? 'verified' : 'pending');

    const res = await pool.query(
      `INSERT INTO public.users
         (full_name, cedula, email, password, role, phone, ciudad,
          id_card_front, id_card_back, selfie_photo, is_verified, facial_verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.fullName,
        data.cedula,
        data.email.toLowerCase().trim(),
        passwordHash,
        data.role || 'citizen',
        data.phone || null,
        data.ciudad || null,
        data.idCardFront || null,
        data.idCardBack || null,
        data.selfiePhoto || null,
        defaultVerification,
        defaultFacialStatus,
      ]
    );

    return res.rows[0];
  }

  static async comparePassword(plain: string, hash: string): Promise<boolean> {
    if (!hash || !plain) return false;
    return bcrypt.compare(plain, hash);
  }

  static async findById(id: string) {
    if (!id || !UUID_REGEX.test(id)) return null;
    const pool = getPgPool();
    const res = await pool.query(
      `SELECT ${PUBLIC_USER_COLUMNS} FROM public.users WHERE id = $1 LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findAll(limit = 100, offset = 0, role?: string) {
    const pool = getPgPool();
    const params: any[] = [];
    let whereClause = '';

    if (role) {
      params.push(role);
      whereClause = `WHERE role = $1`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM public.users ${whereClause}`,
      params
    );
    const dataRes = await pool.query(
      `SELECT ${PUBLIC_USER_COLUMNS}
       FROM public.users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      users: dataRes.rows,
      total: Number(countRes.rows[0]?.total) || 0,
    };
  }

  static async update(
    id: string,
    updates: Partial<{
      fullName: string;
      role: string;
      phone: string;
      ciudad: string;
      isVerified: boolean;
      facialVerificationStatus: string;
    }>
  ) {
    if (!id || !UUID_REGEX.test(id)) return null;
    const pool = getPgPool();
    const fields: string[] = [];
    const values: any[] = [];

    const columnMap: Record<string, string> = {
      fullName: 'full_name',
      role: 'role',
      phone: 'phone',
      ciudad: 'ciudad',
      isVerified: 'is_verified',
      facialVerificationStatus: 'facial_verification_status',
    };

    for (const [key, col] of Object.entries(columnMap)) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${col} = $${values.length + 1}`);
        values.push((updates as any)[key]);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const res = await pool.query(
      `UPDATE public.users
       SET ${fields.join(', ')}
       WHERE id = $${values.length}
       RETURNING ${PUBLIC_USER_COLUMNS}`,
      values
    );

    return res.rows[0] || null;
  }

  static async delete(id: string) {
    if (!id || !UUID_REGEX.test(id)) return;
    const pool = getPgPool();
    await pool.query(`DELETE FROM public.users WHERE id = $1`, [id]);
  }
}

export default User;
