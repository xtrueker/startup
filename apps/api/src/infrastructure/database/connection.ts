import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { env } from '../../config/env';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;
  private supabaseClient: SupabaseClient | null = null;
  private pgPool: Pool | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
        auth: {
          persistSession: false,
        },
      });

      let connectionString = env.DATABASE_URL;
      if (!connectionString && env.SUPABASE_URL && env.DB_PASSWORD) {
        try {
          const urlObj = new URL(env.SUPABASE_URL);
          let host = urlObj.hostname;
          if (!host.startsWith('db.')) {
            host = `db.${host}`;
          }
          connectionString = `postgresql://postgres:${env.DB_PASSWORD}@${host}:5432/postgres`;
        } catch (e) {
          // Fallback just in case SUPABASE_URL parsing fails
          connectionString = `postgresql://postgres:${env.DB_PASSWORD}@db.yqfltmwohsyumwpqdkwh.supabase.co:5432/postgres`;
        }
      }

      if (!connectionString) {
        throw new Error('You must set either DATABASE_URL or DB_PASSWORD in your .env file to connect to the database.');
      }

      this.pgPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
      });

      // Hacer una consulta rápida para verificar conectividad
      const { error } = await this.supabaseClient.from('users').select('*').limit(1);
      if (error) throw error;

      this.isConnected = true;
      console.log('✅ Conectado a Supabase (PostgreSQL)');
    } catch (error) {
      console.error('❌ Error conectando a Supabase:', error);
      throw error;
    }
  }

  public getClient(): SupabaseClient {
    if (!this.supabaseClient) {
      throw new Error('El cliente de Supabase no ha sido inicializado. Llama a connect() primero.');
    }
    return this.supabaseClient;
  }

  public getPgPool(): Pool {
    if (!this.pgPool) {
      throw new Error('El cliente nativo PG no ha sido inicializado.');
    }
    return this.pgPool;
  }

  public async disconnect(): Promise<void> {
    this.supabaseClient = null;
    if (this.pgPool) await this.pgPool.end();
    this.pgPool = null;
    this.isConnected = false;
  }
}

export const dbConnection = DatabaseConnection.getInstance();
export const supabase = () => dbConnection.getClient();
export const getPgPool = () => dbConnection.getPgPool();