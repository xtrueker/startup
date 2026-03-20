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
// REGISTRO DE USUARIO
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { fullName, cedula, email, password, role } = req.body;
        // Validar datos requeridos
        if (!fullName || !cedula || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios: fullName, cedula, email, password',
            });
        }
        // Verificar si cédula ya existe
        const existingCedula = await models_1.User.findOne({ cedula });
        if (existingCedula) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un usuario con esa cédula',
            });
        }
        // Verificar si email ya existe
        const existingEmail = await models_1.User.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'Ya existe un usuario con ese email',
            });
        }
        // Crear usuario
        const user = await models_1.User.create({
            fullName,
            cedula,
            email,
            password,
            role: role || 'citizen',
        });
        // Crear token JWT
        const token = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role, cedula: user.cedula }, env_1.env.JWT_SECRET, { expiresIn: '24h' });
        // Responder éxito
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    cedula: user.cedula,
                    email: user.email,
                    role: user.role,
                    isVerified: user.isVerified,
                    facialVerificationStatus: user.facialVerificationStatus,
                },
                token,
            },
        });
    }
    catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});
// LOGIN DE USUARIO
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validar datos
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son obligatorios',
            });
        }
        // Buscar usuario (incluyendo contraseña)
        const user = await models_1.User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
            });
        }
        // Comparar contraseña
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas',
            });
        }
        // Crear token JWT
        const token = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role, cedula: user.cedula }, env_1.env.JWT_SECRET, { expiresIn: '24h' });
        // Responder éxito
        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    cedula: user.cedula,
                    email: user.email,
                    role: user.role,
                    isVerified: user.isVerified,
                    facialVerificationStatus: user.facialVerificationStatus,
                },
                token,
            },
        });
    }
    catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
});
//# sourceMappingURL=routes.js.map