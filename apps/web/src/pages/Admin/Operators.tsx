import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCog, 
  Plus, 
  Search, 
  ShieldCheck, 
  ArrowLeft, 
  Mail, 
  Phone, 
  IdCard, 
  Monitor, 
  Clock, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  Radio,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import api from '../../services/api';

export interface Operator {
  id: string;
  fullName: string;
  cedula: string;
  email: string;
  phone: string;
  consoleStation: string;
  shift: 'mañana' | 'tarde' | 'noche' | '24x48';
  specialty: 'cctv' | 'despacho' | 'tactico' | 'supervisor';
  status: 'en_servicio' | 'disponible' | 'en_descanso' | 'inactivo';
  zoneAssigned: string;
  createdAt: string;
}

const INITIAL_OPERATORS: Operator[] = [
  {
    id: 'op-001',
    fullName: 'Carlos Mendoza Rios',
    cedula: '1098234812',
    email: 'c.mendoza@centrodespacho.gov.co',
    phone: '+57 312 458 9012',
    consoleStation: 'Consola Alpha-01 (Mosaico CCTV)',
    shift: 'mañana',
    specialty: 'cctv',
    status: 'en_servicio',
    zoneAssigned: 'Sector Norte - Comuna 1 & 2',
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
  },
  {
    id: 'op-002',
    fullName: 'Valeria Gomez Peña',
    cedula: '1032489021',
    email: 'v.gomez@centrodespacho.gov.co',
    phone: '+57 320 891 2234',
    consoleStation: 'Consola Bravo-04 (Despacho 911)',
    shift: 'tarde',
    specialty: 'despacho',
    status: 'en_servicio',
    zoneAssigned: 'Sector Centro - Distrito Histórico',
    createdAt: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
  },
  {
    id: 'op-003',
    fullName: 'Julian Ramirez Silva',
    cedula: '1075632190',
    email: 'j.ramirez@centrodespacho.gov.co',
    phone: '+57 315 762 1098',
    consoleStation: 'Consola Delta-02 (Supervisión Táctica)',
    shift: 'noche',
    specialty: 'tactico',
    status: 'disponible',
    zoneAssigned: 'Sector Sur - Corredor Industrial',
    createdAt: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
  },
];

const LOCAL_STORAGE_KEY = 'admin_operators_list';

const AdminOperators: React.FC = () => {
  const navigate = useNavigate();

  const [operators, setOperators] = useState<Operator[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_OPERATORS;
    } catch {
      return INITIAL_OPERATORS;
    }
  });

  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [formFullName, setFormFullName] = useState('');
  const [formCedula, setFormCedula] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConsole, setFormConsole] = useState('Consola Alpha-01 (Mosaico CCTV)');
  const [formShift, setFormShift] = useState<'mañana' | 'tarde' | 'noche' | '24x48'>('mañana');
  const [formSpecialty, setFormSpecialty] = useState<'cctv' | 'despacho' | 'tactico' | 'supervisor'>('cctv');
  const [formZone, setFormZone] = useState('Sector Centro - Distrito Histórico');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(operators));
  }, [operators]);

  // Cargar operadores remotos de la API si existen
  useEffect(() => {
    const fetchApiOperators = async () => {
      try {
        const res = await api.get('/users?role=operator');
        if (res.data?.data && Array.isArray(res.data.data)) {
          const apiUsers = res.data.data;
          setOperators(prev => {
            const combined = [...prev];
            apiUsers.forEach((u: any) => {
              if (!combined.some(o => o.email.toLowerCase() === u.email.toLowerCase() || o.cedula === u.cedula)) {
                combined.push({
                  id: u.id,
                  fullName: u.fullName || 'Operador del Sistema',
                  cedula: u.cedula || 'N/A',
                  email: u.email,
                  phone: u.phone || '+57 300 000 0000',
                  consoleStation: 'Consola Principal',
                  shift: 'mañana',
                  specialty: 'cctv',
                  status: 'en_servicio',
                  zoneAssigned: 'Sector General',
                  createdAt: u.createdAt || new Date().toISOString(),
                });
              }
            });
            return combined;
          });
        }
      } catch (err) {
        // En caso de que no tenga permisos de listado o el endpoint requiera supervisor
        console.log('Utilizando listado persistido de operadores.');
      }
    };
    fetchApiOperators();
  }, []);

  const resetForm = () => {
    setFormFullName('');
    setFormCedula('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormConsole('Consola Alpha-01 (Mosaico CCTV)');
    setFormShift('mañana');
    setFormSpecialty('cctv');
    setFormZone('Sector Centro - Distrito Histórico');
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

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formFullName.trim()) {
      setFormError('El nombre completo del operador es requerido.');
      return;
    }
    if (!formCedula.trim()) {
      setFormError('El documento de identidad / cédula es obligatorio.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Ingrese un correo institucional válido.');
      return;
    }
    if (!formPassword || formPassword.length < 6) {
      setFormError('La contraseña inicial debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Intentar registrar el usuario en el backend si está activo
      try {
        await api.post('/auth/register', {
          fullName: formFullName.trim(),
          cedula: formCedula.trim(),
          email: formEmail.trim(),
          password: formPassword,
          phone: formPhone.trim(),
          role: 'operator'
        });
      } catch (apiErr) {
        // Si el registro devuelve que ya existe o no permite rol directo, continuamos registrándolo en la consola táctica
        console.warn('Registro API complementado en consola local:', apiErr);
      }

      const newOp: Operator = {
        id: `op-${Date.now()}`,
        fullName: formFullName.trim(),
        cedula: formCedula.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || '+57 300 000 0000',
        consoleStation: formConsole,
        shift: formShift,
        specialty: formSpecialty,
        status: 'en_servicio',
        zoneAssigned: formZone,
        createdAt: new Date().toISOString(),
      };

      setOperators(prev => [newOp, ...prev]);
      handleCloseModal();
    } catch (err: any) {
      setFormError(err.message || 'Error al crear el operador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOperator = (op: Operator) => {
    const confirmDelete = window.confirm(`¿Seguro que deseas dar de baja al operador "${op.fullName}"?`);
    if (!confirmDelete) return;
    setOperators(prev => prev.filter(o => o.id !== op.id));
  };

  const filteredOperators = operators.filter(op => {
    const matchesSearch = 
      op.fullName.toLowerCase().includes(search.toLowerCase()) ||
      op.cedula.includes(search) ||
      op.email.toLowerCase().includes(search.toLowerCase()) ||
      op.consoleStation.toLowerCase().includes(search.toLowerCase()) ||
      op.zoneAssigned.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (shiftFilter !== 'all' && op.shift !== shiftFilter) return false;
    if (statusFilter !== 'all' && op.status !== statusFilter) return false;

    return true;
  });

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'mañana':
        return { label: 'Turno Mañana (06:00 - 14:00)', bg: 'bg-[#0369a1]/30', text: 'text-[#38bdf8]', border: 'border-[#0284c7]/40' };
      case 'tarde':
        return { label: 'Turno Tarde (14:00 - 22:00)', bg: 'bg-[#d97706]/20', text: 'text-[#fbbf24]', border: 'border-[#d97706]/40' };
      case 'noche':
        return { label: 'Turno Noche (22:00 - 06:00)', bg: 'bg-[#4338ca]/30', text: 'text-[#a5b4fc]', border: 'border-[#4f46e5]/40' };
      default:
        return { label: 'Guardia 24x48', bg: 'bg-[#374151]/40', text: 'text-[#e5e7eb]', border: 'border-[#4b5563]/50' };
    }
  };

  const getSpecialtyBadge = (spec: string) => {
    switch (spec) {
      case 'cctv':
        return { label: 'Operador CCTV & Mosaicos', color: 'text-[#38bdf8]' };
      case 'despacho':
        return { label: 'Despacho & Alertas 911', color: 'text-[#fb7185]' };
      case 'tactico':
        return { label: 'Seguimiento Táctico GPS', color: 'text-[#34d399]' };
      default:
        return { label: 'Supervisor de Sala', color: 'text-[#fbbf24]' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_servicio':
        return { label: 'En Servicio (Online)', dot: 'bg-[#10b981]', text: 'text-[#34d399]' };
      case 'disponible':
        return { label: 'Disponible', dot: 'bg-[#38bdf8]', text: 'text-[#38bdf8]' };
      case 'en_descanso':
        return { label: 'En Descanso', dot: 'bg-[#fbbf24]', text: 'text-[#fbbf24]' };
      default:
        return { label: 'Inactivo', dot: 'bg-[#6b7280]', text: 'text-[#9ca3af]' };
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-[#f5f5f5] p-6 lg:p-8 gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] hover:border-[#404040] flex items-center justify-center text-[#a1a1aa] hover:text-white transition-all mr-1 p-0 shrink-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-[#1e1b4b]/60 border border-[#4f46e5]/40 flex items-center justify-center shrink-0">
            <UserCog size={20} className="text-[#818cf8]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#efede3] tracking-tight">Operadores de Monitoreo</h1>
            <p className="text-xs text-[#737373] font-mono">
              Personal certificado para vigilancia, CCTV y despacho de emergencias
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] shrink-0"
        >
          <Plus size={16} />
          <span>Nuevo Operador</span>
        </button>
      </div>

      {/* Stats Quick Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-[#efede3]">{operators.length}</div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-bold">Total Operadores</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#1a1a2e] border border-[#2e2e50] flex items-center justify-center text-[#818cf8]">
            <UserCog size={16} />
          </div>
        </div>

        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-[#34d399]">
              {operators.filter(o => o.status === 'en_servicio').length}
            </div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-bold">En Servicio Activo</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#064e3b]/40 border border-[#065f46]/40 flex items-center justify-center text-[#34d399]">
            <Radio size={16} />
          </div>
        </div>

        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-[#38bdf8]">
              {operators.filter(o => o.specialty === 'cctv').length}
            </div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-bold">Monitoreo CCTV</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#0c1a2e] border border-[#1e40af]/40 flex items-center justify-center text-[#38bdf8]">
            <Monitor size={16} />
          </div>
        </div>

        <div className="bg-[#121212] border border-[#222222] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-[#fb7185]">
              {operators.filter(o => o.specialty === 'despacho').length}
            </div>
            <div className="text-[10px] text-[#737373] uppercase tracking-wider font-bold">Consolas Despacho</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#450a0a]/40 border border-[#991b1b]/40 flex items-center justify-center text-[#fb7185]">
            <ShieldCheck size={16} />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#525252]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula, correo o consola de monitoreo..."
            className="w-full bg-[#121212] border border-[#222222] focus:border-[#4f46e5]/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Turno */}
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="bg-[#121212] border border-[#222222] text-[#d4d4d4] rounded-xl px-3 py-2 text-xs outline-none cursor-pointer hover:border-[#333333]"
          >
            <option value="all">Todos los Turnos</option>
            <option value="mañana">Turno Mañana</option>
            <option value="tarde">Turno Tarde</option>
            <option value="noche">Turno Noche</option>
            <option value="24x48">Turno 24x48</option>
          </select>

          {/* Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#121212] border border-[#222222] text-[#d4d4d4] rounded-xl px-3 py-2 text-xs outline-none cursor-pointer hover:border-[#333333]"
          >
            <option value="all">Todos los Estados</option>
            <option value="en_servicio">En Servicio</option>
            <option value="disponible">Disponible</option>
            <option value="en_descanso">En Descanso</option>
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1">
        {filteredOperators.length === 0 ? (
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl flex flex-col items-center justify-center p-12 text-[#404040] gap-3">
            <UserCog size={42} strokeWidth={1} />
            <p className="text-sm font-bold text-[#737373]">No se encontraron operadores</p>
            <p className="text-xs text-[#525252]">Intenta ajustar el término de búsqueda o crea uno nuevo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOperators.map((op) => {
              const shiftBadge = getShiftBadge(op.shift);
              const specBadge = getSpecialtyBadge(op.specialty);
              const statusBadge = getStatusBadge(op.status);

              return (
                <div
                  key={op.id}
                  className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-xl group"
                >
                  {/* Top: Avatar & Name */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#262626] to-[#171717] border border-[#333333] flex items-center justify-center font-black text-white text-base shadow-md">
                          {op.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${statusBadge.dot} border-2 border-[#121212]`} />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-[#efede3] group-hover:text-white transition-colors">
                          {op.fullName}
                        </h3>
                        <p className={`text-xs font-semibold ${specBadge.color}`}>
                          {specBadge.label}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteOperator(op)}
                      title="Dar de baja operador"
                      className="text-[#525252] hover:text-[#ef4444] p-1.5 rounded-lg hover:bg-[#1f1f1f] transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Consola & Zona */}
                  <div className="bg-[#181818] border border-[#262626] rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#efede3] font-semibold">
                      <Monitor size={14} className="text-[#818cf8] shrink-0" />
                      <span className="truncate">{op.consoleStation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3]">
                      <Radio size={13} className="text-[#34d399] shrink-0" />
                      <span className="truncate">{op.zoneAssigned}</span>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1.5 text-xs text-[#8c8c8c] font-mono">
                    <div className="flex items-center gap-2">
                      <IdCard size={13} className="text-[#525252]" />
                      <span>CC: {op.cedula}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={13} className="text-[#525252]" />
                      <span className="truncate">{op.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-[#525252]" />
                      <span>{op.phone}</span>
                    </div>
                  </div>

                  {/* Turno badge footer */}
                  <div className="pt-2 border-t border-[#1c1c1c] flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${shiftBadge.bg} ${shiftBadge.text} ${shiftBadge.border}`}>
                      {shiftBadge.label}
                    </span>
                    <span className={`text-[11px] font-bold ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Creación de Operador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121212] border border-[#2b2b2b] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#222222] flex items-center justify-between bg-[#161616]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1e1b4b]/80 border border-[#4f46e5]/40 flex items-center justify-center text-[#818cf8]">
                  <UserCog size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#efede3]">
                    Crear Nuevo Operador de Monitoreo
                  </h2>
                  <p className="text-xs text-[#737373] font-mono">
                    Credenciales y asignación a consolas tácticas
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
            <form onSubmit={handleCreateOperator} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {formError && (
                <div className="p-3 rounded-xl bg-[#450a0a]/60 border border-[#991b1b]/60 flex items-center gap-2 text-xs text-[#fca5a5]">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nombre y Cédula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="Ej. Andrés Camilo Torres"
                    className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#4f46e5] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                    Cédula / Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCedula}
                    onChange={(e) => setFormCedula(e.target.value)}
                    placeholder="Ej. 1020304050"
                    className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#4f46e5] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Correo y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="operador@despacho.gov.co"
                    className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#4f46e5] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                    Teléfono Móvil
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+57 300 123 4567"
                    className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#4f46e5] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Contraseña inicial */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider flex items-center justify-between">
                  <span>Contraseña Inicial de Acceso *</span>
                  <span className="text-[10px] text-[#737373] normal-case">Mínimo 6 caracteres</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Contraseña de inicio de sesión"
                    className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#4f46e5] rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-[#e5e5e5] placeholder-[#525252] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#e5e5e5] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Consola y Especialidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                    Puesto / Consola Asignada
                  </label>
                  <select
                    value={formConsole}
                    onChange={(e) => setFormConsole(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#4f46e5] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] outline-none transition-colors cursor-pointer"
                  >
                    <option value="Consola Alpha-01 (Mosaico CCTV)">Consola Alpha-01 (Mosaico CCTV)</option>
                    <option value="Consola Alpha-02 (Mosaico CCTV)">Consola Alpha-02 (Mosaico CCTV)</option>
                    <option value="Consola Bravo-04 (Despacho 911)">Consola Bravo-04 (Despacho 911)</option>
                    <option value="Consola Delta-02 (Supervisión Táctica)">Consola Delta-02 (Supervisión Táctica)</option>
                    <option value="Consola Móvil Cuadrante">Consola Móvil Cuadrante</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                    Especialidad Operativa
                  </label>
                  <select
                    value={formSpecialty}
                    onChange={(e: any) => setFormSpecialty(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#4f46e5] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] outline-none transition-colors cursor-pointer"
                  >
                    <option value="cctv">Vigilancia & Mosaico CCTV</option>
                    <option value="despacho">Recepción & Despacho 911</option>
                    <option value="tactico">Seguimiento Táctico & GPS</option>
                    <option value="supervisor">Supervisor de Turno</option>
                  </select>
                </div>
              </div>

              {/* Turno y Zona */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                    Turno de Guardia
                  </label>
                  <select
                    value={formShift}
                    onChange={(e: any) => setFormShift(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#4f46e5] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] outline-none transition-colors cursor-pointer"
                  >
                    <option value="mañana">Mañana (06:00 - 14:00)</option>
                    <option value="tarde">Tarde (14:00 - 22:00)</option>
                    <option value="noche">Noche (22:00 - 06:00)</option>
                    <option value="24x48">Rotativo 24x48</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#d4d4d4] uppercase tracking-wider">
                    Sector / Cuadrante Asignado
                  </label>
                  <select
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#4f46e5] rounded-xl px-3.5 py-2.5 text-sm text-[#e5e5e5] outline-none transition-colors cursor-pointer"
                  >
                    <option value="Sector Norte - Comuna 1 & 2">Sector Norte - Comuna 1 & 2</option>
                    <option value="Sector Centro - Distrito Histórico">Sector Centro - Distrito Histórico</option>
                    <option value="Sector Sur - Corredor Industrial">Sector Sur - Corredor Industrial</option>
                    <option value="Sector Oriente - Vía Perimetral">Sector Oriente - Vía Perimetral</option>
                  </select>
                </div>
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
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{isSubmitting ? 'Registrando...' : 'Registrar Operador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOperators;
