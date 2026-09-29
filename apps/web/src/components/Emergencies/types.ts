import type { Alert as ApiAlert } from '../../services/alerts';
import type { Camera } from '../../services/cameras';

export interface RouteCameraCoverage {
  routeName: string;
  riskLevel: string;
  waypointsCount: number;
  cameras: Array<Camera & { distanceToRoute: number }>;
}

export interface AssignedOperatorInfo {
  fullName: string;
  cedula: string;
  email: string;
  consoleStation: string;
  shift: string;
  specialty: string;
  status: string;
}

export interface AssignedTeamMember {
  name: string;
  identification: string;
  badgeOrPlate: string;
  roleInTeam: string;
}

export interface AssignedTeamInfo {
  teamName: string;
  teamType: string;
  mainVehiclePlate: string;
  leaderUsername: string;
  leaderId: string;
  leaderEmail: string;
  assignedZone: string;
  status: string;
  members: AssignedTeamMember[];
}

export function stripEmojis(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1FA00}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]/gu, '')
    .trim();
}

