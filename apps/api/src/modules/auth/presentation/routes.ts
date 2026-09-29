import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../../infrastructure/database/models';
import { env } from '../../../config/env';
import { requireAuth } from '../../../shared/middlewares/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registro, login y perfil del usuario autenticado
 */

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
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { fullName, cedula, email, password, role, phone, idCardFront, idCardBack, selfiePhoto } = req.body;

    if (!fullName || !cedula || !email || !password) {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
    }

    const existingCedula = await User.findByCedula(cedula);
    if (existingCedula) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con esa cédula' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese email' });
    }

    const user = await User.create({
      fullName,
      cedula,
      email,
      password,
      phone,
      role: 'citizen', // La autoregistración pública siempre asigna rol citizen para prevenir escalado de privilegios
      idCardFront,
      idCardBack,
      selfiePhoto
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, cedula: user.cedula },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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
  } catch (error) {
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
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, cedula: user.cedula },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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
  } catch (error) {
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
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const user = await User.findById(userId);

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
        isVerified: user.is_verified,
        facialVerificationStatus: user.facial_verification_status,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

export { router as authRouter };