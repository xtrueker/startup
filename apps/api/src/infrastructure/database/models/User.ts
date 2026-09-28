import bcrypt from 'bcryptjs';
import { supabase } from '../connection';

export interface CreateUserDTO {
  fullName: string;
  cedula: string;
  email: string;
  password?: string;
  role?: string;
  phone?: string;
  idCardFront?: string;
  idCardBack?: string;
  selfiePhoto?: string;
  isVerified?: boolean;
  facialVerificationStatus?: 'pending' | 'verified' | 'under_review' | 'rejected';
}

export class User {
  static async findByEmail(email: string) {
    const sb = supabase();
    const { data, error } = await sb.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
    if (error) throw error;
    return data;
  }

  static async findByCedula(cedula: string) {
    const sb = supabase();
    const { data, error } = await sb.from('users').select('*').eq('cedula', cedula).maybeSingle();
    if (error) throw error;
    return data;
  }

  static async create(data: CreateUserDTO) {
    const sb = supabase();
    
    let passwordHash = data.password;
    if (passwordHash) {
      passwordHash = await bcrypt.hash(passwordHash, 10);
    }

    const isKycComplete = Boolean(data.idCardFront && data.selfiePhoto);
    const defaultVerification = data.isVerified !== undefined 
      ? data.isVerified 
      : (isKycComplete ? true : false);

    const defaultFacialStatus = data.facialVerificationStatus || 
      (isKycComplete ? 'verified' : 'pending');

    const { data: inserted, error } = await sb.from('users').insert({
      full_name: data.fullName,
      cedula: data.cedula,
      email: data.email.toLowerCase(),
      password: passwordHash,
      role: data.role || 'citizen',
      phone: data.phone || null,
      id_card_front: data.idCardFront || null,
      id_card_back: data.idCardBack || null,
      selfie_photo: data.selfiePhoto || null,
      is_verified: defaultVerification,
      facial_verification_status: defaultFacialStatus
    }).select().single();

    if (error) throw error;
    return inserted;
  }

  static async comparePassword(plain: string, hash: string): Promise<boolean> {
    if (!hash || !plain) return false;
    return await bcrypt.compare(plain, hash);
  }

  static async findById(id: string) {
    const sb = supabase();
    const { data, error } = await sb
      .from('users')
      .select('id, full_name, cedula, email, role, phone, is_verified, facial_verification_status, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async findAll(limit = 100, offset = 0, role?: string) {
    const sb = supabase();
    let query = sb
      .from('users')
      .select('id, full_name, cedula, email, role, phone, is_verified, facial_verification_status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role) query = query.eq('role', role);

    const { data, error, count } = await query;
    if (error) throw error;
    return { users: data || [], total: count || 0 };
  }

  static async update(id: string, updates: Partial<{
    fullName: string;
    role: string;
    phone: string;
    isVerified: boolean;
    facialVerificationStatus: string;
  }>) {
    const sb = supabase();
    const dbUpdates: Record<string, any> = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.isVerified !== undefined) dbUpdates.is_verified = updates.isVerified;
    if (updates.facialVerificationStatus !== undefined) dbUpdates.facial_verification_status = updates.facialVerificationStatus;

    const { data, error } = await sb
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select('id, full_name, cedula, email, role, phone, is_verified, facial_verification_status, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const sb = supabase();
    const { error } = await sb.from('users').delete().eq('id', id);
    if (error) throw error;
  }
}

export default User;