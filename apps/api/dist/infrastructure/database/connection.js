"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPgPool = exports.supabase = exports.dbConnection = exports.DatabaseConnection = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const pg_1 = require("pg");
const env_1 = require("../../config/env");
class DatabaseConnection {
    constructor() {
        this.isConnected = false;
        this.supabaseClient = null;
        this.pgPool = null;
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            const effectiveSupabaseKey = env_1.env.SUPABASE_SERVICE_ROLE_KEY || env_1.env.SUPABASE_KEY;
            this.supabaseClient = (0, supabase_js_1.createClient)(env_1.env.SUPABASE_URL, effectiveSupabaseKey, {
                auth: {
                    persistSession: false,
                },
            });
            let connectionString = env_1.env.DATABASE_URL;
            if (!connectionString && env_1.env.SUPABASE_URL && env_1.env.DB_PASSWORD) {
                let urlObj;
                try {
                    urlObj = new URL(env_1.env.SUPABASE_URL);
                }
                catch {
                    throw new Error('SUPABASE_URL no tiene un formato de URL válido para derivar la conexión PostgreSQL.');
                }
                const host = urlObj.hostname.startsWith('db.')
                    ? urlObj.hostname
                    : `db.${urlObj.hostname}`;
                connectionString = `postgresql://postgres:${encodeURIComponent(env_1.env.DB_PASSWORD)}@${host}:5432/postgres`;
            }
            if (!connectionString) {
                throw new Error('You must set either DATABASE_URL or DB_PASSWORD in your .env file to connect to the database.');
            }
            this.pgPool = new pg_1.Pool({
                connectionString,
                ssl: { rejectUnauthorized: false }
            });
            // Verificar conectividad directa sobre el pool nativo PostgreSQL (sin depender de permisos anon en PostgREST)
            await this.pgPool.query('SELECT 1');
            this.isConnected = true;
            console.log('✅ Conectado a Supabase (PostgreSQL)');
        }
        catch (error) {
            console.error('❌ Error conectando a Supabase:', error);
            throw error;
        }
    }
    getClient() {
        if (!this.supabaseClient) {
            throw new Error('El cliente de Supabase no ha sido inicializado. Llama a connect() primero.');
        }
        return this.supabaseClient;
    }
    getPgPool() {
        if (!this.pgPool) {
            throw new Error('El cliente nativo PG no ha sido inicializado.');
        }
        return this.pgPool;
    }
    async disconnect() {
        this.supabaseClient = null;
        if (this.pgPool)
            await this.pgPool.end();
        this.pgPool = null;
        this.isConnected = false;
    }
}
exports.DatabaseConnection = DatabaseConnection;
exports.dbConnection = DatabaseConnection.getInstance();
const supabase = () => exports.dbConnection.getClient();
exports.supabase = supabase;
const getPgPool = () => exports.dbConnection.getPgPool();
exports.getPgPool = getPgPool;
//# sourceMappingURL=connection.js.map