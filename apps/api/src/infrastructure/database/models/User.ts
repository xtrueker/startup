import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interfaz de TypeScript
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  cedula: string;
  email: string;
  password: string;
  role: 'citizen' | 'operator' | 'supervisor' | 'admin';
  isVerified: boolean;
  facialVerificationStatus: 'pending' | 'verified' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Schema de Mongoose
const UserSchema: Schema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    cedula: {
      type: String,
      required: [true, 'La cédula es obligatoria'],
      unique: true,
      match: [/^\d{6,10}$/, 'Cédula inválida (6-10 dígitos)'],
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'Mínimo 6 caracteres'],
      select: false,
    },
    role: {
      type: String,
      enum: ['citizen', 'operator', 'supervisor', 'admin'],
      default: 'citizen',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    facialVerificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Middleware: encriptar contraseña antes de guardar
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método: comparar contraseña
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Crear modelo
const User = mongoose.model<IUser>('User', UserSchema);

// Exportar
export default User;