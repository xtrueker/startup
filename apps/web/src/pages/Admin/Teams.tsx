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
import type { Team, TeamMember } from '../../services/teams';

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
  const [status, setStatus] = useState<'patrullando' | 'disponible' | 'en_incidente' | 'fuera_servicio'>('disponible');

  // Form states - Members list
  const [members, setMembers] = useState<Array<{ id: string; name: string; identification: string; badgeOrPlate?: string; roleInTeam?: string }>>([]);

  // Member sub-form
  const [memberName, setMemberName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberBadgeOrPlate, setMemberBadgeOrPlate] = useState('');
  const [memberRole, setMemberRole] = useState('Patrullero / Agente');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar equipos desde el backend
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
    setStatus('disponible');
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

  // Agregar un integrante a la lista dentro del modal
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

  // Quitar un integrante de la lista en el modal
  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  // Crear el equipo completo en la API
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
      // Si no se agregaron miembros explícitos en la lista dinámica, agregar al líder por defecto
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
        m.badgeOrPlate.toLowerCase().includes(search.toLowerCase())
      );

    if (!matchesSearch) return false;
    if (typeFilter !== 'all' && team.teamType !== typeFilter) return false;
    if (statusFilter !== 'all' && team.status !== statusFilter) return false;

    return true;
  });

  const getTeamTypeBadge = (type: string) => {
    switch (type) {
      case 'patrulla':
        return { label: 'Patrulla Policial', Icon: Siren, bg: 'bg-[#0369a1]/30', text: 'text-[#38bdf8]', border: 'border-[#0284c7]/40' };
      case 'ambulancia':
        return { label: 'Ambulancia Médica', Icon: Ambulance, bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' };
      case 'motorizada':
        return { label: 'Escuadrón Motorizado', Icon: Siren, bg: 'bg-[#d97706]/20', text: 'text-[#fbbf24]', border: 'border-[#d97706]/40' };
      case 'tactica':
        return { label: 'Unidad Táctica Reacción', Icon: Siren, bg: 'bg-[#991b1b]/30', text: 'text-[#f87171]', border: 'border-[#b91c1c]/40' };
      default:
        return { label: 'Cuadrante Vigilancia', Icon: Siren, bg: 'bg-[#065f46]/30', text: 'text-[#34d399]', border: 'border-[#059669]/40' };
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'patrullando':
        return { label: 'Patrullando', dot: 'bg-[#10b981]', text: 'text-[#34d399]' };
      case 'disponible':
        return { label: 'Disponible', dot: 'bg-[#38bdf8]', text: 'text-[#38bdf8]' };
      case 'en_incidente':
        return { label: 'En Atención de Incidente', dot: 'bg-[#f43f5e]', text: 'text-[#fb7185]' };
      default:
        return { label: 'Fuera de Servicio', dot: 'bg-[#6b7280]', text: 'text-[#9ca3af]' };
    }
  };

  const totalMembersCount = teams.reduce((acc, t) => acc + t.members.length, 0);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] p-6 lg:p-8 gap-6 overflow-y-auto custom-scrollbar theme-transition">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] border border-[var(--border-base)] hover:border-[var(--border-strong)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all mr-1 p-0 shrink-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[#064e3b]/50 border border-[#065f46]/40 flex items-center justify-center shrink-0">
            <Users size={20} className="text-[#34d399]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Equipos y Unidades en Campo</h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Dotación de patrullas, vehículos, personal e identificaciones
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(5,150,105,0.3)] shrink-0"
        >
          <Plus size={16} />
          <span>Nuevo Equipo</span>
        </button>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-[#efede3]">{teams.length}</div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-bold">Total Equipos</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#064e3b]/30 border border-[#065f46]/40 flex items-center justify-center text-[#34d399]">
            <Users size={16} />
          </div>
        </div>

        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-[#34d399]">
              {teams.filter(t => t.status === 'patrullando').length}
            </div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-bold">En Patrullaje</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#064e3b]/30 border border-[#065f46]/40 flex items-center justify-center text-[#34d399]">
            <Radio size={16} />
          </div>
        </div>

        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-[#38bdf8]">
              {totalMembersCount}
            </div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-bold">Agentes en Dotación</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#0c1a2e] border border-[#1e40af]/40 flex items-center justify-center text-[#38bdf8]">
            <BadgeCheck size={16} />
          </div>
        </div>

        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-[#fbbf24]">
              {teams.filter(t => t.status === 'disponible').length}
            </div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-bold">Disponibles Base</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#451a03]/30 border border-[#92400e]/40 flex items-center justify-center text-[#fbbf24]">
            <Shield size={16} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#525252]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por equipo, placa, usuario, correo, identificación o personal integrante..."
            className="w-full bg-[#121212] border border-[#222222] focus:border-[#059669]/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Tipo de equipo */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#121212] border border-[#222222] text-[#d4d4d4] rounded-xl px-3 py-2 text-xs outline-none cursor-pointer hover:border-[#333333]"
          >
            <option value="all">Todos los Tipos</option>
            <option value="patrulla">Patrullas Policiales</option>
            <option value="ambulancia">Ambulancias Médicas</option>
            <option value="motorizada">Motorizadas</option>
            <option value="tactica">Unidades Tácticas</option>
            <option value="vigilancia">Vigilancia a Pie</option>
          </select>

          {/* Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#121212] border border-[#222222] text-[#d4d4d4] rounded-xl px-3 py-2 text-xs outline-none cursor-pointer hover:border-[#333333]"
          >
            <option value="all">Todos los Estados</option>
            <option value="patrullando">Patrullando</option>
            <option value="disponible">Disponible</option>
            <option value="en_incidente">En Incidente</option>
            <option value="fuera_servicio">Fuera de Servicio</option>
          </select>
        </div>
      </div>

      {/* Grid de Equipos */}
      <div className="flex-1">
        {filteredTeams.length === 0 ? (
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl flex flex-col items-center justify-center p-12 text-[#404040] gap-3">
            <Users size={42} strokeWidth={1} />
            <p className="text-sm font-bold text-[#737373]">No se encontraron equipos registrados</p>
            <p className="text-xs text-[#525252]">Crea un nuevo equipo con su dotación de personal y placas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTeams.map((team) => {
              const typeBadge = getTeamTypeBadge(team.teamType);
              const statusBadge = getStatusBadge(team.status);
              const isExpanded = expandedTeamId === team.id;
              const isAmbulance = team.teamType === 'ambulancia' || team.teamName?.toLowerCase().includes('ambulanc');
              const TypeIcon = isAmbulance ? Ambulance : Siren;

              return (
                <div
                  key={team.id}
                  className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-xl"
                >
                  {/* Top card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow-md ${
                        isAmbulance
                          ? 'bg-gradient-to-br from-[#3b1219] to-[#200a0e] border border-rose-600/40 text-rose-400'
                          : 'bg-gradient-to-br from-[#0c2340] to-[#071322] border border-sky-600/40 text-sky-400'
                      }`}>
                        <TypeIcon size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#efede3]">
                            {team.teamName}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeBadge.bg} ${typeBadge.text} ${typeBadge.border}`}>
                            {typeBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#a3a3a3] mt-0.5 font-mono">
                          <MapPin size={12} className="text-[#34d399]" />
                          <span>{team.assignedZone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        title="Eliminar equipo"
                        className="text-[#525252] hover:text-[#ef4444] p-1.5 rounded-lg hover:bg-[#1f1f1f] transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Leader and Vehicle details */}
                  <div className="grid grid-cols-2 gap-2 bg-[#181818] border border-[#262626] rounded-xl p-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#737373] uppercase font-bold tracking-wider">
                        Placa Móvil Principal
                      </span>
                      <div className="flex items-center gap-1.5 text-sm font-black text-[#facc15] font-mono">
                        <Car size={15} />
                        <span>{team.mainVehiclePlate}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-[#737373] uppercase font-bold tracking-wider">
                        Usuario Responsable
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#efede3] truncate">
                        <User size={13} className="text-[#34d399] shrink-0" />
                        <span className="truncate">@{team.leaderUsername}</span>
                      </div>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-[#262626] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8c8c8c] font-mono">
                      <span className="flex items-center gap-1">
                        <IdCard size={12} /> Identificación: {team.leaderId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {team.leaderEmail}
                      </span>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="bg-[#161616] border border-[#242424] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[#a3a3a3] hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#34d399]" />
                        <span>Personal que conforma el equipo ({team.members.length})</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#737373] flex items-center gap-1">
                        {isExpanded ? 'Ocultar' : 'Ver detalles'}
                        <ChevronRight size={13} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="p-3 border-t border-[#242424] space-y-2 bg-[#141414]">
                        {team.members.map((member, idx) => (
                          <div
                            key={member.id || idx}
                            className="bg-[#1c1c1c] border border-[#2b2b2b] rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-[#282828] flex items-center justify-center font-bold text-[10px] text-[#34d399]">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="font-bold text-[#efede3]">{member.name}</div>
                                <div className="text-[11px] text-[#8c8c8c]">{member.roleInTeam}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 font-mono text-[11px] text-[#a3a3a3]">
                              <span>ID: {member.identification}</span>
                              <span className="px-1.5 py-0.5 rounded bg-[#262626] text-[#facc15] font-bold">
                                Placa: {member.badgeOrPlate}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Footer */}
                  <div className="pt-2 border-t border-[#1c1c1c] flex items-center justify-between text-xs">
                    <span className="text-[#737373] font-mono text-[11px]">
                      Registrado: {new Date(team.createdAt).toLocaleDateString('es-ES')}
                    </span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                      <span className={statusBadge.text}>{statusBadge.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Creación de Equipo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121212] border border-[#2b2b2b] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#222222] flex items-center justify-between bg-[#161616]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#064e3b]/80 border border-[#065f46]/40 flex items-center justify-center text-[#34d399]">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#efede3]">
                    Crear Nuevo Equipo / Unidad de Campo
                  </h2>
                  <p className="text-xs text-[#737373] font-mono">
                    Datos del líder, vehículo, cuadrante y dotación de agentes
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg bg-[#202020] hover:bg-[#2c2c2c] border border-[#333] text-[#a3a3a3] hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateTeam} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              {formError && (
                <div className="p-3 rounded-xl bg-[#450a0a]/60 border border-[#991b1b]/60 flex items-center gap-2 text-xs text-[#fca5a5]">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Sección 1: Datos de la Unidad */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#34d399] flex items-center gap-2">
                  <Shield size={13} />
                  <span>1. Información de la Unidad y Vehículo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                      Nombre del Equipo / Unidad *
                    </label>
                    <input
                      type="text"
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Ej. Patrulla Cuadrante 5"
                      className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#059669] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                      Tipo de Unidad *
                    </label>
                    <select
                      value={teamType}
                      onChange={(e: any) => setTeamType(e.target.value)}
                      className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#059669] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] outline-none transition-colors cursor-pointer"
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                      Placa del Vehículo Principal *
                    </label>
                    <input
                      type="text"
                      required
                      value={mainVehiclePlate}
                      onChange={(e) => setMainVehiclePlate(e.target.value)}
                      placeholder="Ej. POL-554 o MTO-122"
                      className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#059669] rounded-xl px-3.5 py-2.5 text-sm text-[#facc15] font-mono font-bold uppercase placeholder-[#525252] outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                      Sector / Zona Asignada
                    </label>
                    <select
                      value={assignedZone}
                      onChange={(e) => setAssignedZone(e.target.value)}
                      className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#059669] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] outline-none transition-colors cursor-pointer"
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
              <div className="space-y-3 pt-3 border-t border-[#222222]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#34d399] flex items-center gap-2">
                  <User size={13} />
                  <span>2. Usuario Líder / Responsable del Equipo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                      Usuario de Acceso *
                    </label>
                    <input
                      type="text"
                      required
                      value={leaderUsername}
                      onChange={(e) => setLeaderUsername(e.target.value)}
                      placeholder="Ej. oficial_garcia"
                      className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#059669] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={leaderEmail}
                      onChange={(e) => setLeaderEmail(e.target.value)}
                      placeholder="lider@policia.gov.co"
                      className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#059669] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                      Identificación / Cédula *
                    </label>
                    <input
                      type="text"
                      required
                      value={leaderId}
                      onChange={(e) => setLeaderId(e.target.value)}
                      placeholder="Ej. 80491823"
                      className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#059669] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] font-mono placeholder-[#525252] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Personal que conforma el equipo (Dinámico) */}
              <div className="space-y-3 pt-3 border-t border-[#222222]">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#34d399] flex items-center gap-2">
                    <Users size={13} />
                    <span>3. Integrantes que conforman el Equipo</span>
                  </div>
                  <span className="text-xs font-mono text-[#737373]">
                    {members.length} integrantes añadidos
                  </span>
                </div>

                {/* Sub-formulario de integrante */}
                <div className="p-3.5 bg-[#161616] border border-[#262626] rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#a3a3a3]">
                        Nombre del Integrante
                      </label>
                      <input
                        type="text"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder="Ej. Patrullero Andrés Gómez"
                        className="w-full bg-[#1e1e1e] border border-[#303030] focus:border-[#059669] rounded-lg px-3 py-2 text-xs text-[#e5e5e5] placeholder-[#525252] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#a3a3a3]">
                        Identificación / Cédula
                      </label>
                      <input
                        type="text"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        placeholder="Ej. 1098234812"
                        className="w-full bg-[#1e1e1e] border border-[#303030] focus:border-[#059669] rounded-lg px-3 py-2 text-xs text-[#e5e5e5] font-mono placeholder-[#525252] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#a3a3a3]">
                        Placa / Código Personal o Móvil
                      </label>
                      <input
                        type="text"
                        value={memberBadgeOrPlate}
                        onChange={(e) => setMemberBadgeOrPlate(e.target.value)}
                        placeholder="Ej. PL-9821 o MTO-441"
                        className="w-full bg-[#1e1e1e] border border-[#303030] focus:border-[#059669] rounded-lg px-3 py-2 text-xs text-[#facc15] font-mono uppercase placeholder-[#525252] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#a3a3a3]">
                        Rol en el Equipo
                      </label>
                      <input
                        type="text"
                        value={memberRole}
                        onChange={(e) => setMemberRole(e.target.value)}
                        placeholder="Ej. Conductor, Escolta, Paramédico..."
                        className="w-full bg-[#1e1e1e] border border-[#303030] focus:border-[#059669] rounded-lg px-3 py-2 text-xs text-[#e5e5e5] placeholder-[#525252] outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="w-full py-2 bg-[#1b3326] hover:bg-[#234533] border border-[#065f46] text-[#34d399] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={14} />
                    <span>Agregar Integrante a la Dotación</span>
                  </button>
                </div>

                {/* Lista de integrantes agregados */}
                {members.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <span className="text-[11px] text-[#737373] uppercase font-bold tracking-wider">
                      Lista de Personal Asignado
                    </span>
                    <div className="divide-y divide-[#222222] bg-[#161616] border border-[#242424] rounded-xl overflow-hidden">
                      {members.map((m, index) => (
                        <div key={m.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#202020] text-[#34d399] flex items-center justify-center text-[10px] font-bold">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-bold text-[#efede3]">{m.name}</div>
                              <div className="text-[10px] text-[#8c8c8c]">{m.roleInTeam}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[#a3a3a3]">ID: {m.identification}</span>
                            <span className="font-mono text-[#facc15] bg-[#222222] px-1.5 py-0.5 rounded text-[11px]">
                              {m.badgeOrPlate}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              className="text-[#737373] hover:text-[#ef4444] p-1 transition-colors"
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
              <div className="pt-4 border-t border-[#222222] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] text-xs font-bold text-[#a3a3a3] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  <Check size={14} />
                  <span>Crear Equipo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeams;
