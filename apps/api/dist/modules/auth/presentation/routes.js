"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../../../infrastructure/database/models");
const env_1 = require("../../../config/env");
const router = (0, express_1.Router)();
exports.authRouter = router;
router.post('/register', async (req, res) => {
    try {
        const { fullName, cedula, email, password, role } = req.body;
        if (!fullName || !cedula || !email || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
        }
        const existingCedula = await models_1.User.findByCedula(cedula);
        if (existingCedula) {
            return res.status(409).json({ success: false, message: 'Ya existe un usuario con esa cédula' });
        }
        const existingEmail = await models_1.User.findByEmail(email);
        if (existingEmail) {
            return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese email' });
        }
        const user = await models_1.User.create({ fullName, cedula, email, password, role: role || 'citizen' });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, cedula: user.cedula }, env_1.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: {
                    id: user.id, fullName: user.full_name, cedula: user.cedula,
                    email: user.email, role: user.role, isVerified: user.is_verified,
                    facialVerificationStatus: user.facial_verification_status,
                },
                token,
            },
        });
    }
    catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios' });
        }
        const user = await models_1.User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
        const isMatch = await models_1.User.comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, cedula: user.cedula }, env_1.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: {
                    id: user.id, fullName: user.full_name, cedula: user.cedula,
                    email: user.email, role: user.role, isVerified: user.is_verified,
                    facialVerificationStatus: user.facial_verification_status,
                },
                token,
            },
        });
    }
    catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
//# sourceMappingURL=routes.js.map