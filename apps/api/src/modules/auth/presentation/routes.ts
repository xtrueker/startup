import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../../infrastructure/database/models';
import { env } from '../../../config/env';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { fullName, cedula, email, password, phone, role, idCardFront, idCardBack, selfiePhoto } = req.body;

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

export { router as authRouter };