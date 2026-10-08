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
        return { Icon: Skull, label: 'Homicidio', iconColor: 'text-rose-400', badgeClass: 'bg-rose-950/40 border-rose-800/50 text-rose-300' };
      case 'atentado':
        return { Icon: Bomb, label: 'Atentado', iconColor: 'text-red-400', badgeClass: 'bg-red-950/40 border-red-800/50 text-red-300' };
      case 'accidente':
        return { Icon: Car, label: 'Accidente', iconColor: 'text-amber-400', badgeClass: 'bg-amber-950/40 border-amber-800/50 text-amber-300' };
      case 'incendio':
        return { Icon: Flame, label: 'Incendio', iconColor: 'text-orange-400', badgeClass: 'bg-orange-950/40 border-orange-800/50 text-orange-300' };
      case 'robo':
        return { Icon: Crosshair, label: 'Robo', iconColor: 'text-yellow-400', badgeClass: 'bg-yellow-950/40 border-yellow-800/50 text-yellow-300' };
      default:
        return { Icon: Siren, label: 'Emergencia', iconColor: 'text-rose-400', badgeClass: 'bg-rose-950/40 border-rose-800/50 text-rose-300' };
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
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] p-5 lg:p-7 gap-5 overflow-hidden theme-transition">
      
      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/command-center')}
            title="Volver al Centro de Mando"
            className="w-9 h-9 rounded-xl bg-[#141416] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors mr-1 p-0 shrink-0 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-800/50 flex items-center justify-center shrink-0 text-red-400 shadow-sm">
            <Siren size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Consola de Gestión de Emergencias</h1>
            <p className="text-xs text-zinc-500 font-mono">
              Monitoreo, trazabilidad forense y despacho en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchEmergenciesAndCameras}
            disabled={loading}
            className="flex items-center gap-2 bg-[#141416] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-zinc-400' : 'text-zinc-400'} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => navigate('/command-center')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <ShieldAlert size={14} />
            <span>Central de Despacho</span>
          </button>
        </div>
      </div>

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
      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, tipo de delito, dirección o descripción..."
            className="w-full bg-[#121214] border border-[#222226] focus:border-blue-500/60 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#121214] border border-[#222226] rounded-xl px-3 py-1.5 text-xs text-zinc-400">
            <Filter size={13} className="text-blue-400" />
            <span className="font-medium">Tipo:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#18181b] text-zinc-200">Todos los tipos</option>
              <option value="panico" className="bg-[#18181b] text-zinc-200">Botón de Pánico</option>
              <option value="robo" className="bg-[#18181b] text-zinc-200">Robo / Hurto</option>
              <option value="homicidio" className="bg-[#18181b] text-zinc-200">Homicidio</option>
              <option value="atentado" className="bg-[#18181b] text-zinc-200">Atentado</option>
              <option value="accidente" className="bg-[#18181b] text-zinc-200">Accidente de Tránsito</option>
              <option value="incendio" className="bg-[#18181b] text-zinc-200">Incendio</option>
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
            className={`flex flex-col bg-[#111113] border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl ${
              selectedAlert ? 'w-full lg:w-[38%] shrink-0' : 'flex-1 min-w-0'
            }`}
          >
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-[#141416] shrink-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-zinc-400">
                <Siren size={14} className="text-red-400" />
                <span>Bitácora ({filteredAlerts.length})</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {selectedAlert ? '1 Seleccionada' : 'Selecciona para inspeccionar'}
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-zinc-500 p-12">
                <RefreshCw size={22} className="animate-spin text-blue-400" />
                <span className="text-xs font-mono">Cargando emergencias...</span>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-zinc-500 gap-3 p-8">
                <Siren size={28} strokeWidth={1.5} className="text-zinc-600" />
                <p className="text-xs text-zinc-500">Sin incidentes con estos filtros</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80 overflow-y-auto custom-scrollbar flex-1">
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
                          ? 'bg-blue-950/25 border-l-2 border-l-blue-500 ring-1 ring-blue-500/20 shadow-sm' 
                          : isResolved 
                          ? 'hover:bg-[#151517] opacity-60 border-l-2 border-l-emerald-500/50' 
                          : 'hover:bg-[#151517] border-l-2 border-l-rose-500/60'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center shrink-0 mt-0.5 ${meta.iconColor}`}>
                          <TypeIcon size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded border font-mono ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500">
                              #{alert.id.substring(0, 6)}
                            </span>
                            <span className="text-[10px] text-zinc-500 ml-auto font-mono flex items-center gap-1">
                              <Clock size={10} /> {formatTimeAgo(alert.createdAt)}
                            </span>
                          </div>

                          <h3 className="text-xs font-semibold text-zinc-200 truncate">
                            {stripEmojis(alert.description) || 'Alerta de Emergencia'}
                          </h3>

                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                            <MapPin size={11} className="text-sky-400 shrink-0" />
                            <span className="truncate">
                              {stripEmojis(alert.location?.address) || `${alert.location?.latitude?.toFixed(4)}, ${alert.location?.longitude?.toFixed(4)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelected ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm" />
                        ) : (
                          <ChevronRight size={14} className="text-zinc-600" />
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
          <div className="hidden lg:flex w-[260px] xl:w-[290px] shrink-0 flex-col items-center justify-center bg-[#111113] border border-zinc-800 rounded-2xl p-6 text-center gap-3 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
              <Siren size={22} strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">
              Consola de Inspección
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
              Selecciona cualquier emergencia de la bitácora izquierda para abrir su expediente: cámaras perimetrales, rutas tácticas, patrulla y operador enlazado.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminEmergencies;

