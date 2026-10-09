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

  // Cargar roles desde el backend
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

  // Autogenerar slug si el usuario escribe el nombre
  const handleNameChange = (val: string) => {
    setNewRoleName(val);
    if (!newRoleId || newRoleId === generateSlug(newRoleName)) {
      setNewRoleId(generateSlug(val));
    }
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

      // Limpiar formulario y cerrar
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
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] p-6 md:p-8 gap-6 overflow-y-auto custom-scrollbar theme-transition">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all mr-1 p-0 shadow-xs"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shadow-xs">
            <ShieldCheck size={20} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Roles y Permisos</h1>
            <p className="text-xs text-[var(--text-muted)] font-mono">Control de acceso y privilegios operacionales</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRoles}
            disabled={loading}
            title="Sincronizar con el servidor"
            className="w-9 h-9 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all p-0 shadow-xs"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => {
              setErrorMsg(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={16} /> Nuevo Rol
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <Sparkles size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <KeyRound size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-[var(--text-primary)]">{roles.length}</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">Roles Configurados</div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-[var(--text-primary)]">
              {roles.reduce((acc, r) => acc + (r.userCount || 0), 0)}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">Usuarios Asignados</div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Lock size={20} />
          </div>
          <div>
            <div className="text-xl font-black text-[var(--text-primary)]">{AVAILABLE_PERMISSIONS.length}</div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">Privilegios del Sistema</div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar rol por nombre, clave o alcance de permisos..."
          className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-[var(--border-strong)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors shadow-xs"
        />
      </div>

      {/* Loading Skeleton */}
      {loading && roles.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xs hover:shadow-md relative overflow-hidden group"
          >
            {/* Top Indicator bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              role.id === 'admin' ? 'bg-amber-500' :
              role.id === 'police' ? 'bg-blue-500' :
              role.id === 'operator' ? 'bg-emerald-500' :
              role.id === 'supervisor' ? 'bg-purple-500' :
              role.isSystem ? 'bg-neutral-500' : 'bg-cyan-500'
            }`} />

            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    {role.id === 'police' ? (
                      <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0" title="Fuerza Policial">
                        <Siren size={13} />
                      </div>
                    ) : (role.id.includes('medic') || role.id.includes('ambulanc')) ? (
                      <div className="w-6 h-6 rounded bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0" title="Cuerpo Médico / Ambulancia">
                        <Ambulance size={13} />
                      </div>
                    ) : null}
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{role.name}</h3>
                    {role.isSystem ? (
                      <span className="text-[9px] font-mono uppercase bg-neutral-800 text-neutral-300 border border-neutral-700 px-2 py-0.5 rounded font-bold">
                        Sistema
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono uppercase bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded font-bold">
                        Personalizado
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] tracking-wider">
                    id: <strong className="text-emerald-400 font-mono">{role.id}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-elevated)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)]">
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
                      className="text-[10px] font-mono bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] px-2 py-0.5 rounded shadow-xs"
                    >
                      {permMeta ? permMeta.label : permId}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 mt-1">
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {role.permissions.length} permisos habilitados
              </span>

              {!role.isSystem && (
                <button
                  onClick={() => handleDeleteRole(role.id, role.name)}
                  title="Eliminar rol personalizado"
                  className="text-neutral-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRoles.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center p-12 text-[var(--text-muted)] gap-2 border border-dashed border-[var(--border-subtle)] rounded-xl">
          <ShieldAlert size={36} strokeWidth={1} />
          <span className="text-xs font-mono">No se encontraron roles coincidentes</span>
        </div>
      )}

      {/* Modal Crear Nuevo Rol */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Crear Nuevo Rol</h2>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">Registrar rol y matriz de privilegios en el backend</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                  Nombre del Rol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej. Policía de Cuadrante, Auditor Nocturno..."
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                  Identificador / Clave en Base de Datos (Slug)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    placeholder="ej. police, supervisor_zona, operador..."
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] focus:border-emerald-500 rounded-lg pl-3 pr-20 py-2 text-sm font-mono text-emerald-400 placeholder-[var(--text-muted)] outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--text-muted)]">
                    slug único
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Esta clave identifica el rol en JWT y endpoints del sistema (ej: 'police', 'admin').
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                  Descripción Operacional
                </label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Responsabilidades tácticas, cuadrantes y alcance de este perfil..."
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
                  Permisos Asignados ({selectedPermissions.length} seleccionados)
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {AVAILABLE_PERMISSIONS.map(perm => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-app)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{perm.label}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">{perm.desc}</span>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border-subtle)]'
                        }`}>
                          {isChecked && <Check size={12} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newRoleName.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Creando...
                    </>
                  ) : (
                    'Guardar Rol'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoles;
