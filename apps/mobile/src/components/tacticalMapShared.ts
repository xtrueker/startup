import React from 'react';
import { config } from '../config';

export interface CameraItem {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  coverageRadius?: number;
}

export interface TacticalMapProps {
  mapRef?: React.RefObject<any>;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  userLocation: { latitude: number; longitude: number } | null;
  currentLocation: { lat: number; lng: number } | null;
  cameras: CameraItem[];
  isAlertActive: boolean;
}

export const DEFAULT_CAMERA_RADIUS_M = config.DEFAULT_CAMERA_COVERAGE_RADIUS_M;
export const SOS_PERIMETER_RADIUS_M = config.SOS_PERIMETER_RADIUS_M;

export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    Number.isFinite(nLat) &&
    Number.isFinite(nLng) &&
    Math.abs(nLat) <= 90 &&
    Math.abs(nLng) <= 180 &&
    (Math.abs(nLat) > 0.0001 || Math.abs(nLng) > 0.0001)
  );
}

export function deltaToZoom(latDelta?: number, minZoom = 11, maxZoom = 18): number {
  if (!latDelta || latDelta <= 0) return 16;
  const zoom = Math.round(Math.log2(360 / latDelta));
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}
