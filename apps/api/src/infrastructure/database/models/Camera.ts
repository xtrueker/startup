import mongoose, { Schema, Document } from 'mongoose';

// Estados de la cámara
export type CameraStatus = 'online' | 'offline' | 'maintenance';

// Interfaz de la cámara
export interface ICamera extends Document {
  name: string;                      // Nombre identificativo
  location: {
    type: 'Point';
    coordinates: [number, number];   // [longitud, latitud]
    address: string;                 // Dirección completa
  };
  streamUrl: string;                 // URL del video (simulado por ahora)
  status: CameraStatus;
  coverageRadius: number;            // Metros de cobertura
  isPublic: boolean;                 // Ciudadanos pueden verla
  authorityId: string;               // Quién la administra
  createdAt: Date;
}

// Schema de la cámara
const CameraSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
    },
    streamUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'maintenance'],
      default: 'offline',
    },
    coverageRadius: {
      type: Number,
      default: 100,                  // 100 metros por defecto
      min: 10,
      max: 1000,
    },
    isPublic: {
      type: Boolean,
      default: false,                // Por defecto solo autoridades ven
    },
    authorityId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índice geoespacial para búsquedas por ubicación
CameraSchema.index({ location: '2dsphere' });

// Crear modelo
const Camera = mongoose.model<ICamera>('Camera', CameraSchema);

// Exportar
export default Camera;