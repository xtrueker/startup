"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const connection_1 = require("../connection");
class User {
    static async findByEmail(email) {
        const sb = (0, connection_1.supabase)();
        const { data, error } = await sb.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
        if (error)
            throw error;
        return data;
    }
    static async findByCedula(cedula) {
        const sb = (0, connection_1.supabase)();
        const { data, error } = await sb.from('users').select('*').eq('cedula', cedula).maybeSingle();
        if (error)
            throw error;
        return data;
    }
    static async create(data) {
        const sb = (0, connection_1.supabase)();
        let passwordHash = data.password;
        if (passwordHash) {
            passwordHash = await bcryptjs_1.default.hash(passwordHash, 10);
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
        if (error)
            throw error;
        return inserted;
    }
    static async comparePassword(plain, hash) {
        if (!hash || !plain)
            return false;
        return await bcryptjs_1.default.compare(plain, hash);
    }
}
exports.User = User;
exports.default = User;
//# sourceMappingURL=User.js.map