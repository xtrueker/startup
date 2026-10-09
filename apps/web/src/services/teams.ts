import api from './api';

export interface TeamMember {
  id: string;
  teamId: string;
  name: string;
  identification: string;
  badgeOrPlate?: string;
  roleInTeam: string;
  createdAt: string;
}

export interface Team {
  id: string;
  teamName: string;
  teamType: 'patrulla' | 'ambulancia' | 'motorizada' | 'tactica' | 'vigilancia';
  leaderUsername: string;
  leaderEmail: string;
  leaderId: string;
  mainVehiclePlate: string;
  assignedZone: string;
  status: 'patrullando' | 'disponible' | 'en_incidente' | 'fuera_servicio';
  members: TeamMember[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTeamPayload {
  teamName: string;
  teamType?: Team['teamType'];
  leaderUsername: string;
  leaderEmail: string;
  leaderId: string;
  mainVehiclePlate: string;
  assignedZone?: string;
  status?: Team['status'];
  members?: Array<{
    name: string;
    identification: string;
    badgeOrPlate?: string;
    roleInTeam?: string;
  }>;
}

export interface TeamStats {
  total: number;
  patrullando: number;
  disponible: number;
  en_incidente: number;
  fuera_servicio: number;
  totalMembers: number;
}

export const teamService = {
  async getTeams(params?: { teamType?: string; status?: string }): Promise<Team[]> {
    const query = new URLSearchParams();
    if (params?.teamType) query.set('teamType', params.teamType);
    if (params?.status) query.set('status', params.status);
    const res = await api.get(`/teams?${query.toString()}`);
    return res.data?.data || [];
  },

  async getStats(): Promise<TeamStats> {
    const res = await api.get('/teams/stats');
    return res.data?.data;
  },

  async getTeam(id: string): Promise<Team> {
    const res = await api.get(`/teams/${id}`);
    return res.data?.data;
  },

  async createTeam(payload: CreateTeamPayload): Promise<Team> {
    const res = await api.post('/teams', payload);
    return res.data?.data;
  },

  async updateTeam(id: string, payload: Partial<CreateTeamPayload>): Promise<Team> {
    const res = await api.patch(`/teams/${id}`, payload);
    return res.data?.data;
  },

  async deleteTeam(id: string): Promise<void> {
    await api.delete(`/teams/${id}`);
  },

  async addMember(teamId: string, member: {
    name: string;
    identification: string;
    badgeOrPlate?: string;
    roleInTeam?: string;
  }): Promise<TeamMember> {
    const res = await api.post(`/teams/${teamId}/members`, member);
    return res.data?.data;
  },

  async removeMember(teamId: string, memberId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/members/${memberId}`);
  },
};
