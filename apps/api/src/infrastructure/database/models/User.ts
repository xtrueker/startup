import bcrypt from 'bcryptjs';
import { supabase } from '../connection';

export interface CreateUserDTO {
  fullName: string;
  cedula: string;
  email: string;
  password?: string;
  role?: string;
  isVerified?: boolean;
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

    const { data: inserted, error } = await sb.from('users').insert({
      full_name: data.fullName,
      cedula: data.cedula,
      email: data.email.toLowerCase(),
      password: passwordHash,
      role: data.role || 'citizen',
      is_verified: data.isVerified || false,
      facial_verification_status: 'pending'
    }).select().single();

    if (error) throw error;
    return inserted;
  }

  static async comparePassword(plain: string, hash: string): Promise<boolean> {
    if (!hash || !plain) return false;
    return await bcrypt.compare(plain, hash);
  }
}

export default User;