import React, { useState } from 'react';
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
  Trash2
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  isSystem: boolean;
  permissions: string[];
}

const DEFAULT_ROLES: Role[] = [
  {
    id: 'role-1',
    name: 'Super Administrador',
    description: 'Acceso total sin restricciones a configuración, operadores, cámaras y logs de auditoría.',
    userCount: 2,
    isSystem: true,
    permissions: ['all_access', 'cctv_admin', 'dispatch_master', 'users_write', 'kpi_reports', 'audit_logs'],
  },
  {
    id: 'role-2',
    name: 'Operador Táctico',
    description: 'Monitoreo de mapa en tiempo real, gestión y despacho de alertas y control de cámaras.',
    userCount: 8,
    isSystem: true,
    permissions: ['map_view', 'dispatch_master', 'cctv_view', 'audio_listen', 'alerts_manage'],
  },
  {
    id: 'role-3',
    name: 'Supervisor de Zona',
    description: 'Aprobación de resoluciones, reasignación de cuadrantes y visualización de métricas SLA.',
    userCount: 4,
    isSystem: false,
    permissions: ['map_view', 'cctv_view', 'kpi_reports', 'alerts_approve', 'sla_override'],
  },
  {
    id: 'role-4',
    name: 'Auditor de Seguridad',
    description: 'Acceso de solo lectura a incidentes resueltos, bitácoras operativas e indicadores KPI.',
    userCount: 1,
    isSystem: false,
    permissions: ['audit_logs', 'kpi_reports', 'history_read'],
  },
];

const AVAILABLE_PERMISSIONS = [
  { id: 'all_access', label: 'Acceso Total (Root)' },
  { id: 'map_view', label: 'Ver Mapa Táctico 3D/2D' },
  { id: 'dispatch_master', label: 'Despacho de Emergencias' },
  { id: 'alerts_manage', label: 'Modificar Estado de Alertas' },
  { id: 'cctv_view', label: 'Transmisión en Vivo Cámaras' },
  { id: 'cctv_admin', label: 'Agregar / Configurar Cámaras' },
  { id: 'users_write', label: 'Crear y Gestionar Usuarios' },
  { id: 'kpi_reports', label: 'Reportes y Métricas KPI' },
  { id: 'audit_logs', label: 'Registro de Auditoría' },
];

const AdminRoles: React.FC = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New role form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['map_view']);

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePermission = (permId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const newRole: Role = {
      id: `role-${Date.now()}`,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Rol personalizado del centro de mando.',
      userCount: 0,
      isSystem: false,
      permissions: selectedPermissions,
    };

    setRoles(prev => [newRole, ...prev]);
    setNewRoleName('');
    setNewRoleDesc('');
    setSelectedPermissions(['map_view']);
    setIsModalOpen(false);
  };

  const handleDeleteRole = (id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] p-8 gap-6 overflow-y-auto custom-scrollbar theme-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-[#404040] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-all mr-1 p-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[#171717] border border-[#2b2b2b] flex items-center justify-center">
            <ShieldCheck size={20} className="text-[#e5e5e5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#efede3] tracking-tight">Roles y Permisos</h1>
            <p className="text-xs text-[#737373] font-mono">Control de acceso y privilegios operacionales</p>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#222222] hover:bg-[#2a2a2a] border border-[#383838] hover:border-[#525252] text-[#efede3] px-4 py-2 rounded-lg text-sm font-bold transition-all p-0"
        >
          <Plus size={15} /> Nuevo Rol
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-4 flex items-center gap-3">
          <KeyRound size={20} className="text-[#a3a3a3]" />
          <div>
            <div className="text-xl font-black text-[#efede3]">{roles.length}</div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-mono">Roles Definidos</div>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-4 flex items-center gap-3">
          <Users size={20} className="text-[#a3a3a3]" />
          <div>
            <div className="text-xl font-black text-[#efede3]">
              {roles.reduce((acc, r) => acc + r.userCount, 0)}
            </div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-mono">Usuarios Asignados</div>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-4 flex items-center gap-3">
          <Lock size={20} className="text-[#a3a3a3]" />
          <div>
            <div className="text-xl font-black text-[#efede3]">{AVAILABLE_PERMISSIONS.length}</div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-mono">Privilegios de Sistema</div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar rol por nombre o descripción..."
          className="w-full bg-[#141414] border border-[#262626] focus:border-[#404040] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#d4d4d4] placeholder-[#525252] outline-none transition-colors"
        />
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-xl p-5 flex flex-col justify-between gap-4 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#efede3]">{role.name}</h3>
                  {role.isSystem ? (
                    <span className="text-[9px] font-mono uppercase bg-[#1f1f1f] text-[#a3a3a3] border border-[#333333] px-2 py-0.5 rounded font-bold">
                      Sistema
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase bg-[#171717] text-[#737373] border border-[#262626] px-2 py-0.5 rounded font-bold">
                      Personalizado
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#737373] font-mono">
                  <Users size={12} />
                  <span>{role.userCount} usuarios</span>
                </div>
              </div>

              <p className="text-xs text-[#8c8c8c] leading-relaxed mb-4">
                {role.description}
              </p>

              {/* Permissions tags */}
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map(permId => {
                  const permMeta = AVAILABLE_PERMISSIONS.find(p => p.id === permId);
                  return (
                    <span
                      key={permId}
                      className="text-[10px] font-mono bg-[#181818] border border-[#282828] text-[#d4d4d4] px-2 py-0.5 rounded"
                    >
                      {permMeta ? permMeta.label : permId}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-between border-t border-[#1e1e1e] pt-3 mt-1">
              <span className="text-[11px] font-mono text-[#525252]">
                {role.permissions.length} permisos habilitados
              </span>

              {!role.isSystem && (
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  title="Eliminar rol"
                  className="text-[#737373] hover:text-[#f87171] p-1.5 rounded hover:bg-[#1f1f1f] transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-[#525252] gap-2 border border-dashed border-[#262626] rounded-xl">
          <ShieldAlert size={36} strokeWidth={1} />
          <span className="text-xs font-mono">No se encontraron roles coincidentes</span>
        </div>
      )}

      {/* Modal Crear Nuevo Rol */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2b2b2b] rounded-2xl w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-[#e5e5e5]" />
                <h2 className="text-base font-bold text-[#efede3]">Crear Nuevo Rol</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#737373] hover:text-white p-1 rounded-lg hover:bg-[#202020] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1">
                  Nombre del Rol
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ej. Operador Nocturno"
                  className="w-full bg-[#1a1a1a] border border-[#2b2b2b] focus:border-[#4f46e5]/60 rounded-lg px-3 py-2 text-sm text-[#efede3] placeholder-[#525252] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Responsabilidades y alcance de este rol..."
                  className="w-full bg-[#1a1a1a] border border-[#2b2b2b] focus:border-[#4f46e5]/60 rounded-lg px-3 py-2 text-sm text-[#efede3] placeholder-[#525252] outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-2">
                  Permisos Asignados
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
                            ? 'bg-[#1e1e1e] border-[#3f3f46] text-[#efede3]'
                            : 'bg-[#161616] border-[#242424] text-[#737373] hover:text-[#a3a3a3]'
                        }`}
                      >
                        <span className="text-xs font-medium">{perm.label}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isChecked ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#3a3a3a]'
                        }`}>
                          {isChecked && <Check size={12} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[#a3a3a3] hover:text-white bg-[#1a1a1a] hover:bg-[#222222] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#262626] hover:bg-[#333333] border border-[#3f3f46] rounded-lg transition-colors"
                >
                  Guardar Rol
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
