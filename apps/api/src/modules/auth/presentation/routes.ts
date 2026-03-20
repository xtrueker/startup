import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../../infrastructure/database/models';
import { env } from '../../../config/env';

const router = Router();

// REGISTRO DE USUARIO
// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
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
    const existingCedula = await User.findOne({ cedula });
    if (existingCedula) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un usuario con esa cédula',
      });
    }

    // Verificar si email ya existe
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un usuario con ese email',
      });
    }

    // Crear usuario
    const user = await User.create({
      fullName,
      cedula,
      email,
      password,
      role: role || 'citizen',
    });

    // Crear token JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role, cedula: user.cedula },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

// LOGIN DE USUARIO
// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
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
    const user = await User.findOne({ email }).select('+password');
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
    const token = jwt.sign(
      { userId: user._id, role: user.role, cedula: user.cedula },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
});

export { router as authRouter };