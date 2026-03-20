import mongoose, { Schema, Document } from 'mongoose';

export interface IHistoricalIncident extends Document {
  originalAlertId: string;
  type: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitud, latitud]
  };
  resolvedAt: Date;
  reportedAt: Date;
}

const HistoricalIncidentSchema: Schema = new Schema(
  {
    originalAlertId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
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
    },
    resolvedAt: {
      type: Date,
      default: Date.now,
    },
    reportedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

HistoricalIncidentSchema.index({ location: '2dsphere' });

const HistoricalIncident = mongoose.model<IHistoricalIncident>('HistoricalIncident', HistoricalIncidentSchema);

export default HistoricalIncident;
