import { getPgPool } from '../connection';

export type TeamType = 'patrulla' | 'ambulancia' | 'motorizada' | 'tactica' | 'vigilancia';
export type TeamStatus = 'patrullando' | 'disponible' | 'en_incidente' | 'fuera_servicio';

export interface TeamMemberDTO {
  id: string;
  teamId: string;
  name: string;
  identification: string;
  badgeOrPlate?: string;
  roleInTeam: string;
  createdAt: string;
}

export interface TeamDTO {
  id: string;
  teamName: string;
  teamType: TeamType;
  leaderUsername: string;
  leaderEmail: string;
  leaderId: string;
  mainVehiclePlate: string;
  assignedZone: string;
  status: TeamStatus;
  members: TeamMemberDTO[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTeamDTO {
  teamName: string;
  teamType?: TeamType;
  leaderUsername: string;
  leaderEmail: string;
  leaderId: string;
  mainVehiclePlate: string;
  assignedZone?: string;
  status?: TeamStatus;
  members?: Array<{
    name: string;
    identification: string;
    badgeOrPlate?: string;
    roleInTeam?: string;
  }>;
}

export class Team {
  /**
   * Listar todos los equipos con sus miembros
   */
  static async findAll(filters?: { teamType?: string; status?: string }): Promise<TeamDTO[]> {
    const pool = getPgPool();
    let query = `SELECT * FROM public.teams`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.teamType) {
      conditions.push(`team_type = $${params.length + 1}`);
      params.push(filters.teamType);
    }
    if (filters?.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY created_at DESC`;

    const teamsRes = await pool.query(query, params);
    if (teamsRes.rows.length === 0) return [];

    const teamIds = teamsRes.rows.map((t: any) => t.id);
    const membersRes = await pool.query(
      `SELECT * FROM public.team_members WHERE team_id = ANY($1) ORDER BY created_at ASC`,
      [teamIds]
    );

    const membersByTeam: Record<string, TeamMemberDTO[]> = {};
    for (const m of membersRes.rows) {
      if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
      membersByTeam[m.team_id].push(this.formatMember(m));
    }

    return teamsRes.rows.map((t: any) => ({
      ...this.formatTeam(t),
      members: membersByTeam[t.id] || [],
    }));
  }

  /**
   * Buscar equipo por ID (incluye miembros)
   */
  static async findById(id: string): Promise<TeamDTO | null> {
    const pool = getPgPool();
    const teamRes = await pool.query(
      'SELECT * FROM public.teams WHERE id = $1 LIMIT 1',
      [id]
    );
    if (!teamRes.rows[0]) return null;

    const membersRes = await pool.query(
      'SELECT * FROM public.team_members WHERE team_id = $1 ORDER BY created_at ASC',
      [id]
    );

    return {
      ...this.formatTeam(teamRes.rows[0]),
      members: membersRes.rows.map(this.formatMember),
    };
  }

  /**
   * Crear un nuevo equipo con sus integrantes
   */
  static async create(data: CreateTeamDTO): Promise<TeamDTO> {
    const pool = getPgPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert team
      const teamRes = await client.query(
        `INSERT INTO public.teams
          (team_name, team_type, leader_username, leader_email, leader_id, main_vehicle_plate, assigned_zone, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [
          data.teamName,
          data.teamType || 'patrulla',
          data.leaderUsername,
          data.leaderEmail.toLowerCase(),
          data.leaderId,
          data.mainVehiclePlate.toUpperCase(),
          data.assignedZone || 'Sector General',
          data.status || 'disponible',
        ]
      );

      const team = teamRes.rows[0];

      // Insert members if provided
      const members: TeamMemberDTO[] = [];
      const membersList = data.members || [];

      // Always include leader if not already in members
      const leaderInMembers = membersList.some(
        (m) => m.identification === data.leaderId
      );

      const allMembers = leaderInMembers
        ? membersList
        : [
            {
              name: data.leaderUsername,
              identification: data.leaderId,
              badgeOrPlate: data.mainVehiclePlate,
              roleInTeam: 'Líder de Unidad',
            },
            ...membersList,
          ];

      for (const m of allMembers) {
        const mRes = await client.query(
          `INSERT INTO public.team_members
            (team_id, name, identification, badge_or_plate, role_in_team, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING *`,
          [
            team.id,
            m.name,
            m.identification,
            m.badgeOrPlate || 'N/A',
            m.roleInTeam || 'Integrante',
          ]
        );
        members.push(this.formatMember(mRes.rows[0]));
      }

      await client.query('COMMIT');

      return {
        ...this.formatTeam(team),
        members,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Actualizar datos de un equipo
   */
  static async update(id: string, updates: Partial<CreateTeamDTO>): Promise<TeamDTO> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Equipo '${id}' no encontrado`);

    const pool = getPgPool();
    const fields: string[] = [];
    const values: any[] = [];

    const map: Record<string, string> = {
      teamName: 'team_name',
      teamType: 'team_type',
      leaderUsername: 'leader_username',
      leaderEmail: 'leader_email',
      leaderId: 'leader_id',
      mainVehiclePlate: 'main_vehicle_plate',
      assignedZone: 'assigned_zone',
      status: 'status',
    };

    for (const [key, col] of Object.entries(map)) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${col} = $${values.length + 1}`);
        values.push((updates as any)[key]);
      }
    }

    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      values.push(id);
      await pool.query(
        `UPDATE public.teams SET ${fields.join(', ')} WHERE id = $${values.length}`,
        values
      );
    }

    return (await this.findById(id))!;
  }

  /**
   * Eliminar un equipo y sus miembros
   */
  static async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Equipo '${id}' no encontrado`);

    const pool = getPgPool();
    // team_members will be cascade deleted
    await pool.query('DELETE FROM public.teams WHERE id = $1', [id]);
    return true;
  }

  /**
   * Agregar un miembro a un equipo
   */
  static async addMember(teamId: string, member: {
    name: string;
    identification: string;
    badgeOrPlate?: string;
    roleInTeam?: string;
  }): Promise<TeamMemberDTO> {
    const existing = await this.findById(teamId);
    if (!existing) throw new Error(`Equipo '${teamId}' no encontrado`);

    const pool = getPgPool();
    const res = await pool.query(
      `INSERT INTO public.team_members
        (team_id, name, identification, badge_or_plate, role_in_team, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        teamId,
        member.name,
        member.identification,
        member.badgeOrPlate || 'N/A',
        member.roleInTeam || 'Integrante',
      ]
    );
    return this.formatMember(res.rows[0]);
  }

  /**
   * Eliminar un miembro de un equipo
   */
  static async removeMember(teamId: string, memberId: string): Promise<boolean> {
    const pool = getPgPool();
    await pool.query(
      'DELETE FROM public.team_members WHERE id = $1 AND team_id = $2',
      [memberId, teamId]
    );
    return true;
  }

  /**
   * Estadísticas de equipos
   */
  static async stats(): Promise<Record<string, number>> {
    const pool = getPgPool();
    const res = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'patrullando') AS patrullando,
        COUNT(*) FILTER (WHERE status = 'disponible') AS disponible,
        COUNT(*) FILTER (WHERE status = 'en_incidente') AS en_incidente,
        COUNT(*) FILTER (WHERE status = 'fuera_servicio') AS fuera_servicio,
        (SELECT COUNT(*) FROM public.team_members) AS total_members
      FROM public.teams
    `);
    const row = res.rows[0];
    return {
      total: parseInt(row.total, 10),
      patrullando: parseInt(row.patrullando, 10),
      disponible: parseInt(row.disponible, 10),
      en_incidente: parseInt(row.en_incidente, 10),
      fuera_servicio: parseInt(row.fuera_servicio, 10),
      totalMembers: parseInt(row.total_members, 10),
    };
  }

  private static formatTeam(row: any): Omit<TeamDTO, 'members'> {
    return {
      id: row.id,
      teamName: row.team_name,
      teamType: row.team_type,
      leaderUsername: row.leader_username,
      leaderEmail: row.leader_email,
      leaderId: row.leader_id,
      mainVehiclePlate: row.main_vehicle_plate,
      assignedZone: row.assigned_zone,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static formatMember(row: any): TeamMemberDTO {
    return {
      id: row.id,
      teamId: row.team_id,
      name: row.name,
      identification: row.identification,
      badgeOrPlate: row.badge_or_plate,
      roleInTeam: row.role_in_team,
      createdAt: row.created_at,
    };
  }
}

export default Team;
