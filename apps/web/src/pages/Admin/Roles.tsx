import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  ArrowLeft, 
  Users, 
  Lock, 
  Check, 
  X, 
  KeyRound, 
  ShieldAlert, 
  Trash2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Siren,
  Ambulance
} from 'lucide-react';
import { rolesService, type Role } from '../../services/rolesService';
import {
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  StatusPill,
} from '../../components/ui/LiquidPrimitives';

const AVAILABLE_PERMISSIONS = [
  { id: 'all_access', label: 'Acceso Total (Root)', desc: 'Control irrestricto de todo el sistema' },
  { id: 'map_view', label: 'Ver Mapa Táctico 3D/2D', desc: 'Visualización de unidades y capas' },
  { id: 'dispatch_master', label: 'Despacho de Emergencias', desc: 'Asignar patrullas y cuadrantes' },
  { id: 'alerts_manage', label: 'Modificar Estado de Alertas', desc: 'Atender, escalar y resolver alertas' },
  { id: 'cctv_view', label: 'Transmisión en Vivo Cámaras', desc: 'Monitoreo de feeds CCTV' },
  { id: 'cctv_admin', label: 'Agregar / Configurar Cámaras', desc: 'Gestión técnica de infraestructura' },
  { id: 'users_write', label: 'Crear y Gestionar Usuarios', desc: 'Administrar credenciales y altas' },
  { id: 'kpi_reports', label: 'Reportes y Métricas KPI', desc: 'Analítica de incidentes y SLA' },
  { id: 'audit_logs', label: 'Registro de Auditoría', desc: 'Bitácora forense de seguridad' },
];

const AdminRoles: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New role form state
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['map_view']);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await rolesService.getRoles();
      setRoles(data);
    } catch (err: any) {
      console.error('Error cargando roles:', err);
      setErrorMsg('No se pudieron sincronizar los roles con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleNameChange = (val: string) => {
    setNewRoleName(val);
    if (!newRoleId || newRoleId === generateSlug(newRoleName)) {
      setNewRoleId(generateSlug(val));
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const createdRole = await rolesService.createRole({
        id: newRoleId.trim() || undefined,
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || 'Rol táctico personalizado',
        permissions: selectedPermissions,
      });

      setRoles(prev => [...prev, createdRole]);
      setSuccessMsg(`Rol "${createdRole.name}" creado con éxito.`);
      setTimeout(() => setSuccessMsg(null), 4000);

      setNewRoleId('');
      setNewRoleName('');
      setNewRoleDesc('');
      setSelectedPermissions(['map_view']);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error al crear rol:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Error al guardar el rol');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el rol "${name}"?`)) {
      return;
    }

    try {
      await rolesService.deleteRole(id);
      setRoles(prev => prev.filter(r => r.id !== id));
      setSuccessMsg(`Rol "${name}" eliminado.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar el rol');
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-[var(--text-primary)] p-5 lg:p-7 gap-5 overflow-y-auto custom-scrollbar theme-transition">
      {/* Header */}
      <LiquidGlassCard strong className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-10 h-10 rounded-full glass-button flex items-center justify-center shrink-0 p-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center shrink-0 text-[#0EA5E9]">
            <ShieldCheck size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Roles y permisos</h1>
              <StatusPill label={`${roles.length} roles`} tone="aqua" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Control de acceso y privilegios operacionales</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRoles}
            disabled={loading}
            title="Sincronizar con el servidor"
            className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#0EA5E9]' : ''} />
          </button>
          <LiquidPillButton
            variant="obsidian"
            size="sm"
            onClick={() => {
              setErrorMsg(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={15} />
            <span>Nuevo rol</span>
          </LiquidPillButton>
        </div>
      </LiquidGlassCard>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-500/12 border border-emerald-500/30 text-teal-800 dark:text-emerald-300 px-4 py-3 rounded-[18px] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Sparkles size={16} className="text-[#10B981]" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-500/12 border border-rose-500/30 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-[18px] text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="text-[#E11D48]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <LiquidGlassCard strong className="p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/12 border border-sky-500/25 flex items-center justify-center text-[#0EA5E9]">
            <KeyRound size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{roles.length}</div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Roles configurados</div>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard strong className="p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-[#0D9488] dark:text-emerald-400">
            <Users size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {roles.reduce((acc, r) => acc + (r.userCount || 0), 0)}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Usuarios asignados</div>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard strong className="p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/12 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Lock size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{AVAILABLE_PERMISSIONS.length}</div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Privilegios del sistema</div>
          </div>
        </LiquidGlassCard>
      </div>

      {/* Search Input */}
      <LiquidInput
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Buscar rol por nombre, clave o alcance de permisos..."
        leftIcon={<Search size={15} />}
      />

      {/* Loading Skeleton */}
      {loading && roles.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 liquid-glass rounded-[28px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
        {filteredRoles.map((role) => (
          <LiquidGlassCard
            key={role.id}
            strong
            className="p-5 flex flex-col justify-between gap-4 transition-all hover:-translate-y-0.5 relative overflow-hidden group"
          >
            {/* Top Indicator bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              role.id === 'admin' ? 'bg-amber-500' :
              role.id === 'police' ? 'bg-[#0EA5E9]' :
              role.id === 'operator' ? 'bg-[#10B981]' :
              role.id === 'supervisor' ? 'bg-indigo-500' :
              role.isSystem ? 'bg-slate-400' : 'bg-[#14B8A6]'
            }`} />

            <div>
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    {role.id === 'police' ? (
                      <div className="w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-[#0EA5E9] shrink-0">
                        <Siren size={14} />
                      </div>
                    ) : (role.id.includes('medic') || role.id.includes('ambulanc')) ? (
                      <div className="w-7 h-7 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[#E11D48] shrink-0">
                        <Ambulance size={14} />
                      </div>
                    ) : null}
                    <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">{role.name}</h3>
                    {role.isSystem ? (
                      <span className="text-[10px] font-medium bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border-strong)] px-2.5 py-0.5 rounded-full">
                        Sistema
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-sky-500/12 text-[#0EA5E9] border border-sky-500/25 px-2.5 py-0.5 rounded-full">
                        Personalizado
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                    id: <strong className="text-[#0D9488] dark:text-emerald-400 font-mono">{role.id}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-input)] px-2.5 py-1 rounded-full border border-[var(--border-strong)]">
                  <Users size={12} />
                  <span>{role.userCount || 0}</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4 min-h-[36px]">
                {role.description || 'Sin descripción asignada.'}
              </p>

              {/* Permissions tags */}
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map(permId => {
                  const permMeta = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
                  return (
                    <span
                      key={permId}
                      className="text-[10.5px] font-medium bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] px-2.5 py-0.5 rounded-full"
                    >
                      {permMeta ? permMeta.label : permId}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 mt-1">
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {role.permissions.length} permisos habilitados
              </span>

              {!role.isSystem && (
                <button
                  onClick={() => handleDeleteRole(role.id, role.name)}
                  title="Eliminar rol personalizado"
                  className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-[#E11D48] text-[#E11D48] hover:text-white border border-rose-500/25 flex items-center justify-center transition-colors p-0 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </LiquidGlassCard>
        ))}
      </div>

      {filteredRoles.length === 0 && !loading && (
        <LiquidGlassCard className="flex flex-col items-center justify-center p-12 text-[var(--text-muted)] gap-2">
          <ShieldAlert size={36} strokeWidth={1.3} />
          <span className="text-xs font-medium">No se encontraron roles coincidentes</span>
        </LiquidGlassCard>
      )}

      {/* Modal Crear Nuevo Rol */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <LiquidGlassCard strong className="w-full max-w-lg p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center text-[#0EA5E9]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Crear nuevo rol</h2>
                  <p className="text-[11px] text-[var(--text-muted)]">Registrar rol y matriz de privilegios en el servidor</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full glass-button flex items-center justify-center p-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="flex flex-col gap-4">
              <LiquidInput
                label="Nombre del rol *"
                type="text"
                required
                value={newRoleName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Policía de Cuadrante, Auditor Nocturno..."
              />

              <LiquidInput
                label="Identificador en base de datos (Slug)"
                hint="Slug único"
                type="text"
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
                placeholder="ej. police, supervisor_zona..."
                className="font-mono text-[#0D9488] dark:text-emerald-400"
              />

              <div>
                <label className="text-[13px] font-semibold text-[var(--text-primary)] block mb-1.5 px-1.5">
                  Descripción operacional
                </label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Responsabilidades tácticas, cuadrantes y alcance de este perfil..."
                  className="w-full liquid-input-chamber rounded-[18px] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)] outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[13px] font-semibold text-[var(--text-primary)] block mb-2 px-1.5">
                  Permisos asignados ({selectedPermissions.length} seleccionados)
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {AVAILABLE_PERMISSIONS.map(perm => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-center justify-between p-3 rounded-[18px] border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-500/12 border-emerald-500/40 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-input)] border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{perm.label}</span>
                          <span className="text-[10.5px] text-[var(--text-muted)]">{perm.desc}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isChecked ? 'bg-[#10B981] border-[#10B981] text-white' : 'border-[var(--border-strong)]'
                        }`}>
                          {isChecked && <Check size={12} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <LiquidPillButton
                  type="button"
                  variant="glass"
                  size="sm"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </LiquidPillButton>
                <LiquidPillButton
                  type="submit"
                  variant="obsidian"
                  size="sm"
                  disabled={submitting || !newRoleName.trim()}
                  loading={submitting}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Creando...
                    </>
                  ) : (
                    'Guardar rol'
                  )}
                </LiquidPillButton>
              </div>
            </form>
          </LiquidGlassCard>
        </div>
      )}
    </div>
  );
};

export default AdminRoles;
