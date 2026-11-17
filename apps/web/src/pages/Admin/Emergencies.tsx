import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Siren, 
  Search, 
  Clock, 
  ArrowLeft,
  MapPin, 
  RefreshCw, 
  Crosshair, 
  Skull, 
  Car, 
  Bomb, 
  Flame, 
  Filter, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { alertService } from '../../services/alerts';
import type { Alert as ApiAlert } from '../../services/alerts';
import { cameraService } from '../../services/cameras';
import type { Camera } from '../../services/cameras';
import { useCommandStore } from '../../stores/useCommandStore';
import type { EmergencyAlert } from '../../stores/useCommandStore';
import { exactRoutes } from '../../components/CommandCenter/exactRoutes';

import { EmergencyKPIBar } from '../../components/Emergencies/EmergencyKPIBar';
import { EmergencyDossierPanel } from '../../components/Emergencies/EmergencyDossierPanel';
import { stripEmojis } from '../../components/Emergencies/types';
import type { 
  AssignedOperatorInfo, 
  AssignedTeamInfo, 
  RouteCameraCoverage 
} from '../../components/Emergencies/types';
import {
  LiquidGlassCard,
  LiquidInput,
  LiquidPillButton,
  StatusPill,
} from '../../components/ui/LiquidPrimitives';

// Helper de distancia Haversine (en metros)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const AdminEmergencies: React.FC = () => {
  const navigate = useNavigate();
  const { activeAlerts, focusMapOnAlert, updateAlertStatus } = useCommandStore();

  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [allCameras, setAllCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewing' | 'resolved'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Emergencia activa seleccionada (para la consola Split-View)
  const [selectedAlert, setSelectedAlert] = useState<ApiAlert | null>(null);
  const [isDossierExpanded, setIsDossierExpanded] = useState(false);

  // Cargar emergencias y cámaras desde la API
  const fetchEmergenciesAndCameras = async () => {
    setLoading(true);
    try {
      const [alertsData, camerasData] = await Promise.all([
        alertService.getAlerts().catch(() => []),
        cameraService.getCameras().catch(() => [])
      ]);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setAllCameras(Array.isArray(camerasData) ? camerasData : []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergenciesAndCameras();
  }, []);

  // Combinar alertas de la API con alertas en memoria del store
  const combinedAlerts = useMemo(() => {
    const listMap = new Map<string, ApiAlert>();
    
    // Alertas de la API
    alerts.forEach(a => listMap.set(a.id, a));

    // Incorporar del store si no existen
    Object.values(activeAlerts).forEach((stAlert: EmergencyAlert) => {
      if (!listMap.has(stAlert.id)) {
        listMap.set(stAlert.id, {
          id: stAlert.id,
          type: stAlert.type || stAlert.description || 'Pánico',
          status: stAlert.status || 'pending',
          location: {
            latitude: stAlert.sourceLocation?.lat || 4.6097,
            longitude: stAlert.sourceLocation?.lng || -74.0817,
            address: stAlert.sourceLocation?.address || 'Ubicación GPS en vivo'
          },
          description: stAlert.description || 'Alerta disparada en tiempo real',
          createdAt: stAlert.timestamp || new Date().toISOString()
        });
      }
    });

    return Array.from(listMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [alerts, activeAlerts]);

  // Si la lista cambia y la alerta seleccionada fue resuelta o eliminada, actualizar referencia
  useEffect(() => {
    if (selectedAlert) {
      const found = combinedAlerts.find(a => a.id === selectedAlert.id);
      if (found) {
        setSelectedAlert(found);
      }
    }
  }, [combinedAlerts]);

  // Clasificación de tipo
  const getAlertTypeKey = (alert: ApiAlert): string => {
    const raw = (alert.type || alert.description || '').toLowerCase();
    if (raw.includes('homicidio') || raw.includes('asesinato') || raw.includes('muerte')) return 'homicidio';
    if (raw.includes('atentado') || raw.includes('explosivo') || raw.includes('bomba')) return 'atentado';
    if (raw.includes('accidente') || raw.includes('choque') || raw.includes('colision')) return 'accidente';
    if (raw.includes('fuego') || raw.includes('incendio') || raw.includes('fire')) return 'incendio';
    if (raw.includes('robo') || raw.includes('hurto') || raw.includes('asalto')) return 'robo';
    return 'panico';
  };

  const getTypeMeta = (alert: ApiAlert) => {
    const key = getAlertTypeKey(alert);
    switch (key) {
      case 'homicidio':
        return { Icon: Skull, label: 'Homicidio', iconColor: 'text-rose-600 dark:text-rose-400', badgeClass: 'bg-rose-500/12 border-rose-500/25 text-rose-700 dark:text-rose-300' };
      case 'atentado':
        return { Icon: Bomb, label: 'Atentado', iconColor: 'text-red-600 dark:text-red-400', badgeClass: 'bg-red-500/12 border-red-500/25 text-red-700 dark:text-red-300' };
      case 'accidente':
        return { Icon: Car, label: 'Accidente', iconColor: 'text-amber-600 dark:text-amber-400', badgeClass: 'bg-amber-500/12 border-amber-500/25 text-amber-700 dark:text-amber-300' };
      case 'incendio':
        return { Icon: Flame, label: 'Incendio', iconColor: 'text-orange-600 dark:text-orange-400', badgeClass: 'bg-orange-500/12 border-orange-500/25 text-orange-700 dark:text-orange-300' };
      case 'robo':
        return { Icon: Crosshair, label: 'Robo', iconColor: 'text-yellow-600 dark:text-yellow-400', badgeClass: 'bg-yellow-500/12 border-yellow-500/25 text-yellow-700 dark:text-yellow-300' };
      default:
        return { Icon: Siren, label: 'Emergencia', iconColor: 'text-rose-600 dark:text-rose-400', badgeClass: 'bg-rose-500/12 border-rose-500/25 text-rose-700 dark:text-rose-300' };
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Hace unos seg';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  // Filtros
  const filteredAlerts = combinedAlerts.filter(a => {
    const matchesSearch = 
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      (a.type || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.location?.address || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') {
      const s = (a.status || '').toLowerCase();
      if (s === 'resolved' || s === 'resuelto' || s === 'reviewing' || s === 'en_revision' || s === 'escalated') return false;
    }
    if (statusFilter === 'reviewing') {
      const s = (a.status || '').toLowerCase();
      if (s !== 'reviewing' && s !== 'en_revision' && s !== 'escalated') return false;
    }
    if (statusFilter === 'resolved') {
      const s = (a.status || '').toLowerCase();
      if (s !== 'resolved' && s !== 'resuelto') return false;
    }

    if (typeFilter !== 'all' && getAlertTypeKey(a) !== typeFilter) {
      return false;
    }

    return true;
  });

  // Métricas
  const pendingCount = combinedAlerts.filter(a => {
    const s = (a.status || '').toLowerCase();
    return s !== 'resolved' && s !== 'resuelto' && s !== 'reviewing' && s !== 'en_revision' && s !== 'escalated';
  }).length;

  const reviewingCount = combinedAlerts.filter(a => {
    const s = (a.status || '').toLowerCase();
    return s === 'reviewing' || s === 'en_revision' || s === 'escalated';
  }).length;

  const resolvedCount = combinedAlerts.filter(a => {
    const s = (a.status || '').toLowerCase();
    return s === 'resolved' || s === 'resuelto';
  }).length;

  const handleInspectOnMap = (alertId: string) => {
    focusMapOnAlert(alertId);
    navigate('/command-center');
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await alertService.deleteAlert(id);
      updateAlertStatus(id, 'resolved');
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
      if (selectedAlert?.id === id) {
        setSelectedAlert(prev => prev ? { ...prev, status: 'resolved' } : null);
      }
    } catch (err) {
      console.error('Error al resolver alerta:', err);
    }
  };

  // -------------------------------------------------------------
  // RELACIONES DETALLADAS PARA LA EMERGENCIA SELECCIONADA
  // -------------------------------------------------------------
  const alertLat = selectedAlert?.location?.latitude || 4.6097;
  const alertLng = selectedAlert?.location?.longitude || -74.0817;

  // Cámaras cercanas a la emergencia
  const nearbyEmergencyCameras = useMemo(() => {
    if (!selectedAlert) return [];
    return allCameras
      .map(cam => {
        const dist = getDistanceMeters(alertLat, alertLng, cam.location.latitude, cam.location.longitude);
        return { ...cam, distanceMeters: dist };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 6);
  }, [selectedAlert, allCameras, alertLat, alertLng]);

  // Rutas y cámaras en corredores
  const routesAndCameras: RouteCameraCoverage[] = useMemo(() => {
    if (!selectedAlert) return [];
    const candidateRoutes = exactRoutes.slice(0, 3);

    return candidateRoutes.map((route, rIndex) => {
      const routeCameras = allCameras
        .map(cam => {
          let minD = Infinity;
          route.path.forEach(pt => {
            const d = getDistanceMeters(cam.location.latitude, cam.location.longitude, pt[1], pt[0]);
            if (d < minD) minD = d;
          });
          return { ...cam, distanceToRoute: minD };
        })
        .filter(c => c.distanceToRoute <= 600)
        .sort((a, b) => a.distanceToRoute - b.distanceToRoute)
        .slice(0, 4);

      return {
        routeName: `Ruta de Escape / Eje ${route.name || `Corredor #${rIndex + 1}`}`,
        riskLevel: route.risk >= 0.8 ? 'Crítico (Alto Tránsito Sospechoso)' : 'Moderado',
        waypointsCount: route.path.length,
        cameras: routeCameras,
      };
    });
  }, [selectedAlert, allCameras]);

  // Operador asignado
  const assignedOperator: AssignedOperatorInfo = useMemo(() => {
    try {
      const savedOps = localStorage.getItem('admin_operators_list');
      if (savedOps) {
        const parsed = JSON.parse(savedOps);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const idx = (selectedAlert?.id.charCodeAt(0) || 0) % parsed.length;
          return parsed[idx];
        }
      }
    } catch {}
    return {
      fullName: 'Carlos Mendoza Rios',
      cedula: '1098234812',
      email: 'c.mendoza@centrodespacho.gov.co',
      consoleStation: 'Consola Bravo-04 (Despacho 911)',
      shift: 'Turno Mañana (06:00 - 14:00)',
      specialty: 'Despacho & Alertas 911',
      status: 'En Servicio'
    };
  }, [selectedAlert]);

  // Equipo asignado
  const assignedTeam: AssignedTeamInfo = useMemo(() => {
    try {
      const savedTeams = localStorage.getItem('admin_teams_list');
      if (savedTeams) {
        const parsed = JSON.parse(savedTeams);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const idx = (selectedAlert?.id.charCodeAt(selectedAlert.id.length - 1) || 0) % parsed.length;
          return parsed[idx];
        }
      }
    } catch {}
    return {
      teamName: 'Unidad de Respuesta Alfa-12',
      teamType: 'Patrulla Vehicular',
      mainVehiclePlate: 'POL-492',
      leaderUsername: 'cmdte_rodriguez',
      leaderId: '79845123',
      leaderEmail: 'h.rodriguez@policia.gov.co',
      assignedZone: 'Sector Norte - Cuadrante 3',
      status: 'En Atención de Incidente',
      members: [
        { name: 'Sgto. Hector Rodriguez', identification: '79845123', badgeOrPlate: 'PL-8831', roleInTeam: 'Comandante de Escuadra' },
        { name: 'Patrullero David Arias', identification: '1023458901', badgeOrPlate: 'PL-9942', roleInTeam: 'Conductor Táctico' },
        { name: 'Agente Sofia Castro', identification: '1074829103', badgeOrPlate: 'PL-7721', roleInTeam: 'Primer Respondiente / Paramédico' }
      ]
    };
  }, [selectedAlert]);

  return (
    <div className="flex flex-col h-full bg-transparent text-[var(--text-primary)] p-5 lg:p-7 gap-5 overflow-hidden theme-transition">
      
      {/* Header Superior Floating Liquid Glass */}
      <LiquidGlassCard strong className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-10 h-10 rounded-full glass-button flex items-center justify-center shrink-0 p-0 cursor-pointer"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-rose-500/12 border border-rose-500/25 flex items-center justify-center shrink-0 text-[#E11D48] dark:text-rose-400">
            <Siren size={21} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Consola de gestión de emergencias
              </h1>
              <StatusPill
                label={pendingCount > 0 ? `${pendingCount} pendientes` : 'Control activo'}
                tone={pendingCount > 0 ? 'crimson' : 'emerald'}
                pulsing={pendingCount > 0}
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Monitoreo, trazabilidad forense y despacho en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchEmergenciesAndCameras}
            disabled={loading}
            title="Actualizar emergencias"
            className="w-9 h-9 rounded-full glass-button flex items-center justify-center p-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#0EA5E9]' : ''} />
          </button>
          <LiquidPillButton
            variant="obsidian"
            size="sm"
            onClick={() => navigate('/command-center')}
          >
            <ShieldAlert size={14} />
            <span>Central de despacho</span>
          </LiquidPillButton>
        </div>
      </LiquidGlassCard>

      {/* KPI Ribbon */}
      <EmergencyKPIBar
        total={combinedAlerts.length}
        pending={pendingCount}
        reviewing={reviewingCount}
        resolved={resolvedCount}
        statusFilter={statusFilter}
        onSelectFilter={setStatusFilter}
      />

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
        <div className="flex-1">
          <LiquidInput
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, tipo de delito, dirección o descripción..."
            leftIcon={<Search size={15} />}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="liquid-input-chamber rounded-full px-4 py-2.5 text-xs text-[var(--text-secondary)] flex items-center gap-2">
            <Filter size={13} className="text-[#0EA5E9]" />
            <span className="font-semibold">Tipo:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] font-semibold outline-none cursor-pointer"
            >
              <option value="all">Todos los tipos</option>
              <option value="panico">Botón de Pánico</option>
              <option value="robo">Robo / Hurto</option>
              <option value="homicidio">Homicidio</option>
              <option value="atentado">Atentado</option>
              <option value="accidente">Accidente de Tránsito</option>
              <option value="incendio">Incendio</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÁREA PRINCIPAL SPLIT-VIEW CONSOLA (SIN MODAL) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        
        {/* PANEL IZQUIERDO: LISTA DE EMERGENCIAS (Se adapta si hay una seleccionada) */}
        {(!selectedAlert || !isDossierExpanded) && (
          <div 
            className={`relative flex flex-col liquid-glass-strong rounded-[26px] overflow-hidden transition-all duration-300 ${
              selectedAlert ? 'w-full lg:w-[38%] shrink-0' : 'flex-1 min-w-0'
            }`}
          >
            <div className="pointer-events-none absolute top-0 left-[8%] right-[8%] h-[1.5px] bg-[var(--specular-rim)] opacity-90" />
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]/60 shrink-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--text-secondary)]">
                <Siren size={14} className="text-rose-500" />
                <span>Bitácora ({filteredAlerts.length})</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {selectedAlert ? '1 Seleccionada' : 'Selecciona para inspeccionar'}
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-[var(--text-muted)] p-12">
                <RefreshCw size={22} className="animate-spin text-[#0EA5E9]" />
                <span className="text-xs font-mono">Cargando emergencias...</span>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-[var(--text-muted)] gap-3 p-8">
                <Siren size={28} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                <p className="text-xs text-[var(--text-muted)]">Sin incidentes con estos filtros</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] overflow-y-auto custom-scrollbar flex-1">
                {filteredAlerts.map((alert) => {
                  const meta = getTypeMeta(alert);
                  const TypeIcon = meta.Icon;
                  const isResolved = alert.status === 'resolved' || alert.status === 'resuelto';
                  const isSelected = selectedAlert?.id === alert.id;

                  return (
                    <div
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-[#0EA5E9]/12 border-l-4 border-l-[#0EA5E9]' 
                          : isResolved 
                          ? 'hover:bg-[var(--bg-elevated)] opacity-65 border-l-4 border-l-emerald-500/60' 
                          : 'hover:bg-[var(--bg-elevated)] border-l-4 border-l-rose-500/75'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center shrink-0 mt-0.5 ${meta.iconColor}`}>
                          <TypeIcon size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border font-mono ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                            <span className="text-[11px] font-mono text-[var(--text-muted)]">
                              #{alert.id.substring(0, 6)}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] ml-auto font-mono flex items-center gap-1">
                              <Clock size={10} /> {formatTimeAgo(alert.createdAt)}
                            </span>
                          </div>

                          <h3 className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {stripEmojis(alert.description) || 'Alerta de Emergencia'}
                          </h3>

                          <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] font-mono truncate mt-0.5">
                            <MapPin size={11} className="text-[#0EA5E9] shrink-0" />
                            <span className="truncate">
                              {stripEmojis(alert.location?.address) || `${alert.location?.latitude?.toFixed(4)}, ${alert.location?.longitude?.toFixed(4)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelected ? (
                          <span className="w-2 h-2 rounded-full bg-[#0EA5E9] shadow-sm" />
                        ) : (
                          <ChevronRight size={14} className="text-[var(--text-muted)]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PANEL DERECHO: CONSOLA INTEGRADA DEL EXPEDIENTE (NO MODAL) */}
        {selectedAlert && (
          <div className="flex-1 min-w-0 h-full animate-fadeIn">
            <EmergencyDossierPanel
              alert={selectedAlert}
              operator={assignedOperator}
              team={assignedTeam}
              nearbyCameras={nearbyEmergencyCameras}
              routeCameras={routesAndCameras}
              isExpanded={isDossierExpanded}
              onToggleExpand={() => setIsDossierExpanded(v => !v)}
              onClose={() => {
                setSelectedAlert(null);
                setIsDossierExpanded(false);
              }}
              onResolve={handleResolveAlert}
              onNavigateToDispatch={handleInspectOnMap}
            />
          </div>
        )}

        {/* Si no hay emergencia seleccionada y estamos en pantalla ancha: placeholder táctico */}
        {!selectedAlert && (
          <div className="relative hidden lg:flex w-[260px] xl:w-[290px] shrink-0 flex-col items-center justify-center liquid-glass-strong rounded-[26px] p-6 text-center gap-3">
            <div className="pointer-events-none absolute top-0 left-[12%] right-[12%] h-[1.5px] bg-[var(--specular-rim)] opacity-90" />
            <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--text-secondary)]">
              <Siren size={22} strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Consola de Inspección
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
              Selecciona cualquier emergencia de la bitácora izquierda para abrir su expediente: cámaras perimetrales, rutas tácticas, patrulla y operador enlazado.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminEmergencies;

