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
const auth_1 = require("../../../shared/middlewares/auth");
const KycVerificationService_1 = require("../../kyc/services/KycVerificationService");
const router = (0, express_1.Router)();
exports.authRouter = router;
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registro, login y perfil del usuario autenticado
 */
/**
 * @swagger
 * /api/auth/analyze-document:
 *   post:
 *     summary: Analizar documento con IA (OCR + detección de retrato en cédula colombiana)
 *     tags: [Auth]
 *     security: []
 */
router.post('/analyze-document', async (req, res) => {
    try {
        const { imageBase64, side } = req.body;
        const result = await KycVerificationService_1.KycVerificationService.analyzeIdDocumentPreview({
            imageBase64,
            side,
        });
        return res.status(200).json({
            success: true,
            message: 'Documento procesado por IA',
            data: result,
        });
    }
    catch (error) {
        const status = error?.statusCode || 500;
        return res.status(status).json({
            success: false,
            message: error?.message || 'No fue posible analizar el documento',
        });
    }
});
/**
 * @swagger
 * /api/auth/liveness-challenge:
 *   get:
 *     summary: Emitir reto biomecánico aleatorio firmado para prueba de vida en 2 fotogramas
 *     tags: [Auth]
 *     security: []
 */
router.get('/liveness-challenge', (_req, res) => {
    const challenge = KycVerificationService_1.KycVerificationService.issueLivenessChallenge();
    return res.status(200).json({
        success: true,
        data: challenge,
    });
});
/**
 * @swagger
 * /api/auth/liveness-probe:
 *   post:
 *     summary: Guía visual en tiempo real sin temporizador (detecta postura de mirada, gestos y antifraude)
 *     tags: [Auth]
 *     security: []
 */
router.post('/liveness-probe', async (req, res) => {
    try {
        const { stage, frameBase64, token } = req.body;
        const result = await KycVerificationService_1.KycVerificationService.evaluateLiveGuidanceProbe({
            stage,
            frameBase64,
            token,
        });
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(200).json({
            success: true,
            data: {
                status: 'coaching',
                tone: 'neutral',
                guidance: 'Mantén tu rostro frente a la pantalla',
            },
        });
    }
});
/**
 * @swagger
 * /api/auth/verify-biometrics:
 *   post:
 *     summary: Prueba de vida activa (2 fotogramas) + detección antisuplantación (PAD) contra cédula
 *     tags: [Auth]
 *     security: []
 */
router.post('/verify-biometrics', async (req, res) => {
    try {
        const { idCardFront, selfieNeutral, selfiePhoto, challengeToken } = req.body;
        const result = await KycVerificationService_1.KycVerificationService.verifyFaceMatchPreview({
            idCardFront,
            selfieNeutral,
            selfiePhoto,
            challengeToken,
        });
        return res.status(200).json({
            success: true,
            message: 'Prueba de vida e identidad biométrica confirmadas',
            data: result,
        });
    }
    catch (error) {
        const status = error?.statusCode || 500;
        return res.status(status).json({
            success: false,
            code: error?.code || 'BIOMETRIC_ERROR',
            similarityScore: error?.similarityScore ?? null,
            message: error?.message || 'Error al verificar biometría facial',
        });
    }
});
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, cedula, email, password]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Juan Pérez
 *               cedula:
 *                 type: string
 *                 example: "1020304050"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "MiClave123!"
 *               role:
 *                 type: string
 *                 enum: [citizen, operator, supervisor, admin]
 *                 default: citizen
 *               phone:
 *                 type: string
 *                 example: "+573001234567"
 *               ciudad:
 *                 type: string
 *                 example: "Bogotá"
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Faltan datos obligatorios
 *       409:
 *         description: Email o cédula ya registrados
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', async (req, res) => {
    try {
        const { fullName, cedula, email, password, role, phone, ciudad, idCardFront, idCardBack, selfiePhoto, livenessProofToken } = req.body;
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
        // Evaluar autenticidad óptica, anti-duplicado y biometría facial estricta (>=85%) + cifrado AES-256-GCM (Ley 1581)
        const kycEvaluation = await KycVerificationService_1.KycVerificationService.evaluateAndEncryptKyc({
            idCardFront,
            idCardBack,
            selfiePhoto,
            livenessProofToken,
        });
        if (!kycEvaluation.isVerified || kycEvaluation.facialVerificationStatus !== 'verified') {
            return res.status(422).json({
                success: false,
                code: 'BIOMETRIC_REJECTED',
                message: 'La verificación facial biométrica no superó el control de seguridad.',
            });
        }
        const user = await models_1.User.create({
            fullName,
            cedula,
            email,
            password,
            phone,
            ciudad,
            role: 'citizen', // La autoregistración pública siempre asigna rol citizen para prevenir escalado de privilegios
            isVerified: kycEvaluation.isVerified,
            facialVerificationStatus: kycEvaluation.facialVerificationStatus,
        });
        if (kycEvaluation.encryptedVault) {
            await KycVerificationService_1.KycVerificationService.persistEncryptedKycForUser(user.id, kycEvaluation, req.ip);
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, cedula: user.cedula }, env_1.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    cedula: user.cedula,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    ciudad: user.ciudad,
                    isVerified: kycEvaluation.isVerified,
                    facialVerificationStatus: kycEvaluation.facialVerificationStatus,
                    kycSimilarityScore: kycEvaluation.similarityScore,
                },
                token,
            },
        });
    }
    catch (error) {
        if (error?.statusCode === 422 || error?.statusCode === 503) {
            return res.status(error.statusCode).json({
                success: false,
                code: error?.code || 'KYC_VALIDATION_FAILED',
                similarityScore: error?.similarityScore ?? null,
                message: error.message,
            });
        }
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión y obtener JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "MiClave123!"
 *     responses:
 *       200:
 *         description: Login exitoso — retorna JWT y datos del usuario
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
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
        if (user.facial_verification_status === 'rejected') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado: la verificación biométrica de esta cuenta fue rechazada por seguridad.',
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, cedula: user.cedula }, env_1.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: {
                    id: user.id, fullName: user.full_name, cedula: user.cedula,
                    email: user.email, role: user.role, phone: user.phone, ciudad: user.ciudad, isVerified: user.is_verified,
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
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Perfil del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token inválido o expirado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await models_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        res.json({
            success: true,
            data: {
                id: user.id,
                fullName: user.full_name,
                cedula: user.cedula,
                email: user.email,
                role: user.role,
                phone: user.phone,
                ciudad: user.ciudad,
                isVerified: user.is_verified,
                facialVerificationStatus: user.facial_verification_status,
                createdAt: user.created_at,
            },
        });
    }
    catch (error) {
        console.error('Error en /me:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
//# sourceMappingURL=routes.js.map