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
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  Radio,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { operatorService } from '../../services/operators';
import type { Operator } from '../../services/operators';
import {
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  StatusPill,
} from '../../components/ui/LiquidPrimitives';

const AdminOperators: React.FC = () => {
  const navigate = useNavigate();

  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Cargar operadores desde la API
  const fetchOperators = async () => {
    setLoading(true);
    try {
      const data = await operatorService.getOperators();
      setOperators(data);
    } catch (err) {
      console.error('Error cargando operadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();
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
      await operatorService.createOperator({
        fullName: formFullName.trim(),
        cedula: formCedula.trim(),
        email: formEmail.trim(),
        password: formPassword,
        phone: formPhone.trim() || undefined,
        consoleStation: formConsole,
        shift: formShift,
        specialty: formSpecialty,
        status: 'en_servicio',
        zoneAssigned: formZone,
      });

      await fetchOperators();
      handleCloseModal();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Error al crear el operador.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOperator = async (op: Operator) => {
    const confirmDelete = window.confirm(`¿Seguro que deseas dar de baja al operador "${op.fullName}"?`);
    if (!confirmDelete) return;
    try {
      await operatorService.deleteOperator(op.id);
      setOperators(prev => prev.filter(o => o.id !== op.id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'No se pudo dar de baja al operador.');
    }
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
        return { label: 'Turno Mañana (06:00 - 14:00)', cls: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25' };
      case 'tarde':
        return { label: 'Turno Tarde (14:00 - 22:00)', cls: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25' };
      case 'noche':
        return { label: 'Turno Noche (22:00 - 06:00)', cls: 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25' };
      default:
        return { label: 'Guardia 24x48', cls: 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] border-[var(--border-strong)]' };
    }
  };

  const getSpecialtyBadge = (spec: string) => {
    switch (spec) {
      case 'cctv':
        return { label: 'Operador CCTV y mosaicos', color: 'text-[#0EA5E9]' };
      case 'despacho':
        return { label: 'Despacho y alertas 911', color: 'text-[#E11D48]' };
      case 'tactico':
        return { label: 'Seguimiento táctico GPS', color: 'text-[#0D9488] dark:text-emerald-400' };
      default:
        return { label: 'Supervisor de sala', color: 'text-[#D97706] dark:text-amber-400' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_servicio':
        return { label: 'En servicio', dot: 'bg-[#10B981]', text: 'text-[#0D9488] dark:text-emerald-400' };
      case 'disponible':
        return { label: 'Disponible', dot: 'bg-[#0EA5E9]', text: 'text-[#0EA5E9]' };
      case 'en_descanso':
        return { label: 'En descanso', dot: 'bg-[#D97706]', text: 'text-[#D97706] dark:text-amber-400' };
      default:
        return { label: 'Inactivo', dot: 'bg-[var(--text-muted)]', text: 'text-[var(--text-muted)]' };
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
            <UserCog size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Operadores de monitoreo
              </h1>
              <StatusPill label={`${operators.length} registrados`} tone="aqua" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Personal certificado para vigilancia CCTV y despacho de emergencias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOperators}
            disabled={loading}
            title="Actualizar"
            className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#0EA5E9]' : ''} />
          </button>
          <LiquidPillButton variant="obsidian" size="sm" onClick={handleOpenModal}>
            <Plus size={15} />
            <span>Nuevo operador</span>
          </LiquidPillButton>
        </div>
      </LiquidGlassCard>

      {/* Stats Quick Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 shrink-0">
        <LiquidGlassCard strong className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{operators.length}</div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Total operadores</div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center text-[#0EA5E9]">
            <UserCog size={17} />
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard strong className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#0D9488] dark:text-emerald-400 tabular-nums">
              {operators.filter(o => o.status === 'en_servicio').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">En servicio activo</div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center text-[#0D9488] dark:text-emerald-400">
            <Radio size={17} />
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard strong className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#0EA5E9] tabular-nums">
              {operators.filter(o => o.specialty === 'cctv').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Monitoreo CCTV</div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-sky-500/12 border border-sky-500/25 flex items-center justify-center text-[#0EA5E9]">
            <Monitor size={17} />
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard strong className="p-4 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#E11D48] tabular-nums">
              {operators.filter(o => o.specialty === 'despacho').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Consolas despacho</div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-rose-500/12 border border-rose-500/25 flex items-center justify-center text-[#E11D48]">
            <ShieldCheck size={17} />
          </div>
        </LiquidGlassCard>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
        <div className="flex-1">
          <LiquidInput
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula, correo o consola de monitoreo..."
            leftIcon={<Search size={15} />}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="liquid-input-chamber rounded-full px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="all">Todos los turnos</option>
            <option value="mañana">Turno Mañana</option>
            <option value="tarde">Turno Tarde</option>
            <option value="noche">Turno Noche</option>
            <option value="24x48">Turno 24x48</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="liquid-input-chamber rounded-full px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="en_servicio">En servicio</option>
            <option value="disponible">Disponible</option>
            <option value="en_descanso">En descanso</option>
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 pb-6">
        {filteredOperators.length === 0 ? (
          <LiquidGlassCard className="flex flex-col items-center justify-center p-12 text-center gap-3">
            <UserCog size={40} className="text-[var(--text-muted)] opacity-60" />
            <p className="text-sm font-bold text-[var(--text-primary)]">No se encontraron operadores</p>
            <p className="text-xs text-[var(--text-secondary)]">Intenta ajustar el término de búsqueda o crea uno nuevo.</p>
          </LiquidGlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOperators.map((op) => {
              const shiftBadge = getShiftBadge(op.shift);
              const specBadge = getSpecialtyBadge(op.specialty);
              const statusBadge = getStatusBadge(op.status);

              return (
                <LiquidGlassCard
                  key={op.id}
                  strong
                  className="p-5 flex flex-col justify-between gap-4 transition-all hover:-translate-y-0.5 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--pill-primary-bg)] text-[var(--pill-primary-text)] flex items-center justify-center font-bold text-base shadow-sm">
                          {op.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${statusBadge.dot} border-2 border-white dark:border-[#0F141C]`} />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
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
                      className="w-8 h-8 rounded-full bg-rose-500/10 hover:bg-[#E11D48] text-[#E11D48] hover:text-white border border-rose-500/25 flex items-center justify-center transition-colors p-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Consola & Zona */}
                  <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[18px] p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] font-semibold">
                      <Monitor size={14} className="text-[#0EA5E9] shrink-0" />
                      <span className="truncate">{op.consoleStation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11.5px] text-[var(--text-secondary)]">
                      <Radio size={13} className="text-[#10B981] shrink-0" />
                      <span className="truncate">{op.zoneAssigned}</span>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-1.5 text-xs text-[var(--text-secondary)] font-mono">
                    <div className="flex items-center gap-2">
                      <IdCard size={13} className="text-[var(--text-muted)]" />
                      <span>CC: {op.cedula}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={13} className="text-[var(--text-muted)]" />
                      <span className="truncate">{op.email}</span>
                    </div>
                    {op.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-[var(--text-muted)]" />
                        <span>{op.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Turno badge footer */}
                  <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <span className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full border ${shiftBadge.cls}`}>
                      {shiftBadge.label}
                    </span>
                    <span className={`text-[11px] font-bold shrink-0 ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                </LiquidGlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Creación de Operador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
          <LiquidGlassCard strong className="w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--accent-bg)] border border-[var(--accent-border)] flex items-center justify-center text-[#0EA5E9]">
                  <UserCog size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    Nuevo operador de monitoreo
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Credenciales y asignación a consolas tácticas
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

            <form onSubmit={handleCreateOperator} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {formError && (
                <div className="p-3.5 rounded-[18px] bg-rose-500/12 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  <AlertCircle size={15} className="shrink-0 text-[#E11D48]" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LiquidInput
                  label="Nombre completo *"
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Ej. Andrés Camilo Torres"
                />

                <LiquidInput
                  label="Cédula / Documento *"
                  type="text"
                  required
                  value={formCedula}
                  onChange={(e) => setFormCedula(e.target.value)}
                  placeholder="Ej. 1020304050"
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LiquidInput
                  label="Correo electrónico *"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="operador@despacho.gov.co"
                />

                <LiquidInput
                  label="Teléfono móvil"
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  className="font-mono"
                />
              </div>

              <LiquidInput
                label="Contraseña inicial de acceso *"
                hint="Mínimo 6 caracteres"
                type={showPassword ? 'text' : 'password'}
                required
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Contraseña de inicio de sesión"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-[var(--text-primary)] px-1.5 block">
                    Puesto / Consola asignada
                  </label>
                  <select
                    value={formConsole}
                    onChange={(e) => setFormConsole(e.target.value)}
                    className="w-full liquid-input-chamber rounded-full px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none cursor-pointer"
                  >
                    <option value="Consola Alpha-01 (Mosaico CCTV)">Consola Alpha-01 (Mosaico CCTV)</option>
                    <option value="Consola Alpha-02 (Mosaico CCTV)">Consola Alpha-02 (Mosaico CCTV)</option>
                    <option value="Consola Bravo-04 (Despacho 911)">Consola Bravo-04 (Despacho 911)</option>
                    <option value="Consola Delta-02 (Supervisión Táctica)">Consola Delta-02 (Supervisión Táctica)</option>
                    <option value="Consola Móvil Cuadrante">Consola Móvil Cuadrante</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-[var(--text-primary)] px-1.5 block">
                    Especialidad operativa
                  </label>
                  <select
                    value={formSpecialty}
                    onChange={(e: any) => setFormSpecialty(e.target.value)}
                    className="w-full liquid-input-chamber rounded-full px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none cursor-pointer"
                  >
                    <option value="cctv">Vigilancia & Mosaico CCTV</option>
                    <option value="despacho">Recepción & Despacho 911</option>
                    <option value="tactico">Seguimiento Táctico & GPS</option>
                    <option value="supervisor">Supervisor de Turno</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-[var(--text-primary)] px-1.5 block">
                    Turno de guardia
                  </label>
                  <select
                    value={formShift}
                    onChange={(e: any) => setFormShift(e.target.value)}
                    className="w-full liquid-input-chamber rounded-full px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none cursor-pointer"
                  >
                    <option value="mañana">Mañana (06:00 - 14:00)</option>
                    <option value="tarde">Tarde (14:00 - 22:00)</option>
                    <option value="noche">Noche (22:00 - 06:00)</option>
                    <option value="24x48">Rotativo 24x48</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-[var(--text-primary)] px-1.5 block">
                    Sector / Cuadrante asignado
                  </label>
                  <select
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    className="w-full liquid-input-chamber rounded-full px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none cursor-pointer"
                  >
                    <option value="Sector Norte - Comuna 1 & 2">Sector Norte - Comuna 1 & 2</option>
                    <option value="Sector Centro - Distrito Histórico">Sector Centro - Distrito Histórico</option>
                    <option value="Sector Sur - Corredor Industrial">Sector Sur - Corredor Industrial</option>
                    <option value="Sector Oriente - Vía Perimetral">Sector Oriente - Vía Perimetral</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
                <LiquidPillButton type="button" variant="glass" size="sm" onClick={handleCloseModal}>
                  Cancelar
                </LiquidPillButton>
                <LiquidPillButton type="submit" variant="obsidian" size="sm" loading={isSubmitting}>
                  <Check size={14} />
                  <span>{isSubmitting ? 'Registrando...' : 'Registrar operador'}</span>
                </LiquidPillButton>
              </div>
            </form>
          </LiquidGlassCard>
        </div>
      )}
    </div>
  );
};

export default AdminOperators;
