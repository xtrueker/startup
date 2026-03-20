import mongoose, { Schema, Document } from 'mongoose';

export type AlertType = 'emergency' | 'suspicious' | 'medical' | 'fire' | 'robo' | 'other';
export type AlertStatus = 'active' | 'resolved' | 'false_alarm';

export interface IAlert extends Document {
  userId: string;
  type: AlertType;
  status: AlertStatus;
  location: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
  };
  description?: string;
  direction?: string;
  escapeRoutes?: any[]; // GeoJSON paths
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['emergency', 'suspicious', 'medical', 'fire', 'robo', 'other'],
      default: 'emergency',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'false_alarm'],
      default: 'active',
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
      address: String,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    direction: {
      type: String,
    },
    escapeRoutes: {
      type: [Schema.Types.Mixed],
    },
  },
  {
    timestamps: true,
  }
);

AlertSchema.index({ location: '2dsphere' });

const Alert = mongoose.model<IAlert>('Alert', AlertSchema);

export default Alert;