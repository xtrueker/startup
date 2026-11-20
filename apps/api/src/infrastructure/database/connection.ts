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
      const effectiveSupabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_KEY;
      this.supabaseClient = createClient(env.SUPABASE_URL, effectiveSupabaseKey, {
        auth: {
          persistSession: false,
        },
      });

      let connectionString = env.DATABASE_URL;
      if (!connectionString && env.SUPABASE_URL && env.DB_PASSWORD) {
        let urlObj: URL;
        try {
          urlObj = new URL(env.SUPABASE_URL);
        } catch {
          throw new Error(
            'SUPABASE_URL no tiene un formato de URL válido para derivar la conexión PostgreSQL.'
          );
        }
        const host = urlObj.hostname.startsWith('db.')
          ? urlObj.hostname
          : `db.${urlObj.hostname}`;
        connectionString = `postgresql://postgres:${encodeURIComponent(
          env.DB_PASSWORD
        )}@${host}:5432/postgres`;
      }

      if (!connectionString) {
        throw new Error('You must set either DATABASE_URL or DB_PASSWORD in your .env file to connect to the database.');
      }

      this.pgPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
      });

      // Verificar conectividad directa sobre el pool nativo PostgreSQL (sin depender de permisos anon en PostgREST)
      await this.pgPool.query('SELECT 1');

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