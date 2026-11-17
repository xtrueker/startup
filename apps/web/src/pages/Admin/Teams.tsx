import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  ArrowLeft, 
  Shield, 
  Car, 
  Mail, 
  IdCard, 
  User, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  MapPin,
  Radio,
  UserPlus,
  BadgeCheck,
  ChevronRight,
  Siren,
  Ambulance,
  RefreshCw
} from 'lucide-react';
import { teamService } from '../../services/teams';
import type { Team } from '../../services/teams';
import {
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  StatusPill,
} from '../../components/ui/LiquidPrimitives';

const AdminTeams: React.FC = () => {
  const navigate = useNavigate();

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // Form states - General Team Data
  const [teamName, setTeamName] = useState('');
  const [teamType, setTeamType] = useState<'patrulla' | 'ambulancia' | 'motorizada' | 'tactica' | 'vigilancia'>('patrulla');
  const [leaderUsername, setLeaderUsername] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [mainVehiclePlate, setMainVehiclePlate] = useState('');
  const [assignedZone, setAssignedZone] = useState('Sector Centro - Distrito Histórico');
  const [status] = useState<'patrullando' | 'disponible' | 'en_incidente' | 'fuera_servicio'>('disponible');

  // Form states - Members list
  const [members, setMembers] = useState<Array<{ id: string; name: string; identification: string; badgeOrPlate?: string; roleInTeam?: string }>>([]);

  // Member sub-form
  const [memberName, setMemberName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberBadgeOrPlate, setMemberBadgeOrPlate] = useState('');
  const [memberRole, setMemberRole] = useState('Patrullero / Agente');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const data = await teamService.getTeams();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar equipos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const resetForm = () => {
    setTeamName('');
    setTeamType('patrulla');
    setLeaderUsername('');
    setLeaderEmail('');
    setLeaderId('');
    setMainVehiclePlate('');
    setAssignedZone('Sector Centro - Distrito Histórico');
    setMembers([]);
    setMemberName('');
    setMemberId('');
    setMemberBadgeOrPlate('');
    setMemberRole('Patrullero / Agente');
    setFormError('');
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleAddMember = () => {
    if (!memberName.trim()) {
      setFormError('Escriba el nombre del integrante antes de agregarlo.');
      return;
    }
    if (!memberId.trim()) {
      setFormError('Escriba la identificación del integrante.');
      return;
    }

    const newMember = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: memberName.trim(),
      identification: memberId.trim(),
      badgeOrPlate: memberBadgeOrPlate.trim() || 'N/A',
      roleInTeam: memberRole.trim() || 'Patrullero / Agente',
    };

    setMembers(prev => [...prev, newMember]);
    setMemberName('');
    setMemberId('');
    setMemberBadgeOrPlate('');
    setMemberRole('Patrullero / Agente');
    setFormError('');
  };

  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!teamName.trim()) {
      setFormError('El nombre del equipo o unidad es requerido.');
      return;
    }
    if (!leaderUsername.trim()) {
      setFormError('El nombre de usuario del responsable es requerido.');
      return;
    }
    if (!leaderEmail.trim() || !leaderEmail.includes('@')) {
      setFormError('El correo del responsable debe ser válido.');
      return;
    }
    if (!leaderId.trim()) {
      setFormError('La identificación del responsable es obligatoria.');
      return;
    }
    if (!mainVehiclePlate.trim()) {
      setFormError('La placa del móvil / vehículo principal es obligatoria.');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalMembers = members.length > 0 ? members : [
        {
          name: leaderUsername.trim(),
          identification: leaderId.trim(),
          badgeOrPlate: mainVehiclePlate.trim().toUpperCase(),
          roleInTeam: 'Líder de Unidad'
        }
      ];

      await teamService.createTeam({
        teamName: teamName.trim(),
        teamType,
        leaderUsername: leaderUsername.trim(),
        leaderEmail: leaderEmail.trim(),
        leaderId: leaderId.trim(),
        mainVehiclePlate: mainVehiclePlate.trim().toUpperCase(),
        assignedZone,
        status,
        members: finalMembers,
      });

      await fetchTeams();
      handleCloseModal();
    } catch (err: any) {
      console.error('Error creando equipo:', err);
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar el equipo en el servidor.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    const confirmDelete = window.confirm(`¿Seguro que deseas eliminar el equipo "${team.teamName}"?`);
    if (!confirmDelete) return;
    try {
      await teamService.deleteTeam(team.id);
      setTeams(prev => prev.filter(t => t.id !== team.id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'No se pudo eliminar el equipo en el servidor.');
    }
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = 
      team.teamName.toLowerCase().includes(search.toLowerCase()) ||
      team.mainVehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
      team.leaderUsername.toLowerCase().includes(search.toLowerCase()) ||
      team.leaderEmail.toLowerCase().includes(search.toLowerCase()) ||
      team.leaderId.includes(search) ||
      team.members.some(m => 
        m.name.toLowerCase().includes(search.toLowerCase()) || 
        m.identification.includes(search) || 
        (m.badgeOrPlate || '').toLowerCase().includes(search.toLowerCase())
      );

    if (!matchesSearch) return false;
    if (typeFilter !== 'all' && team.teamType !== typeFilter) return false;
    if (statusFilter !== 'all' && team.status !== statusFilter) return false;

    return true;
  });

  const getTeamTypeBadge = (type: string) => {
    switch (type) {
      case 'patrulla':
        return { label: 'Patrulla policial', cls: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25' };
      case 'ambulancia':
        return { label: 'Ambulancia médica', cls: 'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25' };
      case 'motorizada':
        return { label: 'Escuadrón motorizado', cls: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25' };
      case 'tactica':
        return { label: 'Unidad táctica', cls: 'bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/35' };
      default:
        return { label: 'Cuadrante vigilancia', cls: 'bg-emerald-500/12 text-teal-800 dark:text-emerald-300 border-emerald-500/25' };
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'patrullando':
        return { label: 'Patrullando', dot: 'bg-[#10B981]', text: 'text-[#0D9488] dark:text-emerald-400' };
      case 'disponible':
        return { label: 'Disponible', dot: 'bg-[#0EA5E9]', text: 'text-[#0EA5E9]' };
      case 'en_incidente':
        return { label: 'En incidente', dot: 'bg-[#E11D48]', text: 'text-[#E11D48]' };
      default:
        return { label: 'Fuera de servicio', dot: 'bg-[var(--text-muted)]', text: 'text-[var(--text-muted)]' };
    }
  };

  const totalMembersCount = teams.reduce((acc, t) => acc + t.members.length, 0);

  return (
    <div className="flex flex-col h-full bg-transparent text-[var(--text-primary)] p-5 lg:p-7 gap-5 overflow-y-auto custom-scrollbar theme-transition">
      {/* Top Header */}
      <LiquidGlassCard strong className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-10 h-10 rounded-full glass-button flex items-center justify-center shrink-0 p-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center shrink-0 text-[#0D9488] dark:text-emerald-400">
            <Users size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Equipos y unidades en campo
              </h1>
              <StatusPill label={`${teams.length} unidades`} tone="emerald" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Dotación de patrullas, vehículos, personal e identificaciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTeams}
            disabled={loading}
            title="Actualizar"
            className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#0EA5E9]' : ''} />
          </button>
          <LiquidPillButton variant="obsidian" size="sm" onClick={handleOpenModal}>
            <Plus size={15} />
            <span>Nuevo equipo</span>
          </LiquidPillButton>
        </div>
      </LiquidGlassCard>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
        <LiquidGlassCard strong className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{teams.length}</div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Total equipos</div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-[#0D9488] dark:text-emerald-400">
            <Users size={17} />
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard strong className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#0D9488] dark:text-emerald-400 tabular-nums">
              {teams.filter(t => t.status === 'patrullando').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">En patrullaje</div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-[#0D9488] dark:text-emerald-400">
            <Radio size={17} />
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard strong className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#0EA5E9] tabular-nums">{totalMembersCount}</div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Agentes en dotación</div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-sky-500/12 border border-sky-500/25 flex items-center justify-center text-[#0EA5E9]">
            <BadgeCheck size={17} />
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard strong className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#D97706] dark:text-amber-400 tabular-nums">
              {teams.filter(t => t.status === 'disponible').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Disponibles base</div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-amber-500/12 border border-amber-500/25 flex items-center justify-center text-[#D97706] dark:text-amber-400">
            <Shield size={17} />
          </div>
        </LiquidGlassCard>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
        <div className="flex-1">
          <LiquidInput
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por equipo, placa, usuario, correo, identificación o personal..."
            leftIcon={<Search size={15} />}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="liquid-input-chamber rounded-full px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            <option value="patrulla">Patrullas policiales</option>
            <option value="ambulancia">Ambulancias médicas</option>
            <option value="motorizada">Motorizadas</option>
            <option value="tactica">Unidades tácticas</option>
            <option value="vigilancia">Vigilancia a pie</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="liquid-input-chamber rounded-full px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="patrullando">Patrullando</option>
            <option value="disponible">Disponible</option>
            <option value="en_incidente">En incidente</option>
            <option value="fuera_servicio">Fuera de servicio</option>
          </select>
        </div>
      </div>

      {/* Grid de Equipos */}
      <div className="flex-1 pb-6">
        {filteredTeams.length === 0 ? (
          <LiquidGlassCard className="flex flex-col items-center justify-center p-12 text-center gap-3">
            <Users size={40} className="text-[var(--text-muted)] opacity-60" />
            <p className="text-sm font-bold text-[var(--text-primary)]">No se encontraron equipos registrados</p>
            <p className="text-xs text-[var(--text-secondary)]">Crea un nuevo equipo con su dotación de personal y placas.</p>
          </LiquidGlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTeams.map((team) => {
              const typeBadge = getTeamTypeBadge(team.teamType);
              const statusBadge = getStatusBadge(team.status);
              const isExpanded = expandedTeamId === team.id;
              const isAmbulance = team.teamType === 'ambulancia' || team.teamName?.toLowerCase().includes('ambulanc');
              const TypeIcon = isAmbulance ? Ambulance : Siren;

              return (
                <LiquidGlassCard
                  key={team.id}
                  strong
                  className="p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                        isAmbulance
                          ? 'bg-rose-500/12 border-rose-500/25 text-[#E11D48]'
                          : 'bg-sky-500/12 border-sky-500/25 text-[#0EA5E9]'
                      }`}>
                        <TypeIcon size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                            {team.teamName}
                          </h3>
                          <span className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full border ${typeBadge.cls}`}>
                            {typeBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-0.5">
                          <MapPin size={12} className="text-[#0EA5E9]" />
                          <span>{team.assignedZone}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTeam(team)}
                      title="Eliminar equipo"
                      className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-[#E11D48] text-[#E11D48] hover:text-white border border-rose-500/25 flex items-center justify-center transition-colors p-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Leader and Vehicle details */}
                  <div className="grid grid-cols-2 gap-3 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[20px] p-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10.5px] text-[var(--text-muted)] font-semibold">
                        Placa móvil principal
                      </span>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-300 font-mono">
                        <Car size={15} />
                        <span>{team.mainVehiclePlate}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10.5px] text-[var(--text-muted)] font-semibold">
                        Usuario responsable
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)] truncate">
                        <User size={13} className="text-[#0D9488] dark:text-emerald-400 shrink-0" />
                        <span className="truncate">@{team.leaderUsername}</span>
                      </div>
                    </div>

                    <div className="col-span-2 pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)] font-mono">
                      <span className="flex items-center gap-1">
                        <IdCard size={12} /> ID: {team.leaderId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {team.leaderEmail}
                      </span>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[20px] overflow-hidden">
                    <button
                      onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#0EA5E9]" />
                        <span>Personal del equipo ({team.members.length})</span>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                        {isExpanded ? 'Ocultar' : 'Ver detalles'}
                        <ChevronRight size={13} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="p-3 border-t border-[var(--border-subtle)] space-y-2">
                        {team.members.map((member, idx) => (
                          <div
                            key={member.id || idx}
                            className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-[var(--accent-bg)] flex items-center justify-center font-bold text-[10px] text-[#0EA5E9]">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-bold text-[var(--text-primary)]">{member.name}</div>
                                <div className="text-[11px] text-[var(--text-muted)]">{member.roleInTeam}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 font-mono text-[11px] text-[var(--text-secondary)]">
                              <span>ID: {member.identification}</span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                                {member.badgeOrPlate}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Footer */}
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)] font-mono text-[11px]">
                      Registrado: {new Date(team.createdAt).toLocaleDateString('es-ES')}
                    </span>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                      <span className={statusBadge.text}>{statusBadge.label}</span>
                    </div>
                  </div>
                </LiquidGlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Creación de Equipo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
          <LiquidGlassCard strong className="w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#0D9488] dark:text-emerald-400">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    Nuevo equipo / Unidad de campo
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Datos del líder, vehículo, cuadrante y dotación de agentes
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full glass-button flex items-center justify-center p-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              {formError && (
                <div className="p-3.5 rounded-[18px] bg-rose-500/12 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  <AlertCircle size={15} className="shrink-0 text-[#E11D48]" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Sección 1: Datos de la Unidad */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-[#0D9488] dark:text-emerald-400 flex items-center gap-2">
                  <Shield size={13} />
                  <span>1. Información de la unidad y vehículo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LiquidInput
                    label="Nombre del equipo *"
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Ej. Patrulla Cuadrante 5"
                  />

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-[var(--text-primary)] px-1.5 block">
                      Tipo de unidad *
                    </label>
                    <select
                      value={teamType}
                      onChange={(e: any) => setTeamType(e.target.value)}
                      className="w-full liquid-input-chamber rounded-full px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none cursor-pointer"
                    >
                      <option value="patrulla">Patrulla Policial (Camioneta / Sedán)</option>
                      <option value="ambulancia">Ambulancia Médica / Asistencia SAMU</option>
                      <option value="motorizada">Escuadrón Motorizado (Motos)</option>
                      <option value="tactica">Unidad Táctica de Reacción (GOES / SWAT)</option>
                      <option value="vigilancia">Cuadrante a Pie / Vigilancia Comunitaria</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LiquidInput
                    label="Placa del vehículo principal *"
                    type="text"
                    required
                    value={mainVehiclePlate}
                    onChange={(e) => setMainVehiclePlate(e.target.value)}
                    placeholder="Ej. POL-554 o MTO-122"
                    className="font-mono uppercase font-bold"
                  />

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-[var(--text-primary)] px-1.5 block">
                      Sector / Zona asignada
                    </label>
                    <select
                      value={assignedZone}
                      onChange={(e) => setAssignedZone(e.target.value)}
                      className="w-full liquid-input-chamber rounded-full px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none cursor-pointer"
                    >
                      <option value="Sector Norte - Cuadrante 1 & 2">Sector Norte - Cuadrante 1 & 2</option>
                      <option value="Sector Centro - Distrito Histórico">Sector Centro - Distrito Histórico</option>
                      <option value="Sector Sur - Corredor Industrial">Sector Sur - Corredor Industrial</option>
                      <option value="Sector Oriente - Vía Perimetral">Sector Oriente - Vía Perimetral</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 2: Datos del Responsable / Líder */}
              <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="text-xs font-bold text-[#0EA5E9] flex items-center gap-2">
                  <User size={13} />
                  <span>2. Usuario líder / Responsable del equipo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <LiquidInput
                    label="Usuario *"
                    type="text"
                    required
                    value={leaderUsername}
                    onChange={(e) => setLeaderUsername(e.target.value)}
                    placeholder="oficial_garcia"
                  />

                  <LiquidInput
                    label="Correo *"
                    type="email"
                    required
                    value={leaderEmail}
                    onChange={(e) => setLeaderEmail(e.target.value)}
                    placeholder="lider@policia.gov.co"
                  />

                  <LiquidInput
                    label="Cédula *"
                    type="text"
                    required
                    value={leaderId}
                    onChange={(e) => setLeaderId(e.target.value)}
                    placeholder="80491823"
                    className="font-mono"
                  />
                </div>
              </div>

              {/* Sección 3: Personal que conforma el equipo */}
              <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#0D9488] dark:text-emerald-400 flex items-center gap-2">
                    <Users size={13} />
                    <span>3. Integrantes del equipo</span>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {members.length} añadidos
                  </span>
                </div>

                <div className="p-4 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[22px] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <LiquidInput
                      label="Nombre del integrante"
                      type="text"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="Ej. Patrullero Andrés Gómez"
                    />

                    <LiquidInput
                      label="Identificación / Cédula"
                      type="text"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="Ej. 1098234812"
                      className="font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <LiquidInput
                      label="Placa / Código personal"
                      type="text"
                      value={memberBadgeOrPlate}
                      onChange={(e) => setMemberBadgeOrPlate(e.target.value)}
                      placeholder="Ej. PL-9821 o MTO-441"
                      className="font-mono uppercase"
                    />

                    <LiquidInput
                      label="Rol en el equipo"
                      type="text"
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      placeholder="Ej. Conductor, Escolta..."
                    />
                  </div>

                  <LiquidPillButton
                    type="button"
                    variant="aqua"
                    size="sm"
                    onClick={handleAddMember}
                    className="w-full"
                  >
                    <UserPlus size={14} />
                    <span>Agregar integrante a la dotación</span>
                  </LiquidPillButton>
                </div>

                {members.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[18px] overflow-hidden">
                      {members.map((m, index) => (
                        <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-[var(--accent-bg)] text-[#0EA5E9] flex items-center justify-center text-[10px] font-bold">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-bold text-[var(--text-primary)]">{m.name}</div>
                              <div className="text-[10.5px] text-[var(--text-muted)]">{m.roleInTeam}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[var(--text-secondary)]">ID: {m.identification}</span>
                            <span className="font-mono text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full text-[10.5px] font-semibold">
                              {m.badgeOrPlate}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              className="text-[var(--text-muted)] hover:text-[#E11D48] p-1 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
                <LiquidPillButton type="button" variant="glass" size="sm" onClick={handleCloseModal}>
                  Cancelar
                </LiquidPillButton>
                <LiquidPillButton type="submit" variant="obsidian" size="sm" loading={isSubmitting}>
                  <Check size={14} />
                  <span>{isSubmitting ? 'Creando...' : 'Crear equipo'}</span>
                </LiquidPillButton>
              </div>
            </form>
          </LiquidGlassCard>
        </div>
      )}
    </div>
  );
};

export default AdminTeams;
