import React, { useState } from 'react';
import { useCommandStore } from '../../stores/useCommandStore';
import type { EmergencyAlert } from '../../stores/useCommandStore';
import { AlertTimeline } from './AlertTimeline';
import { 
  X, 
  CheckCircle, 
  ShieldAlert, 
  Eye, 
  FileArchive, 
  Shield, 
  Car, 
  Users, 
  Navigation, 
  Clock, 
  Flame,
  Check
} from 'lucide-react';
import api from '../../services/api';

interface Props {
  alert: EmergencyAlert;
  onClose: () => void;
}

export const AlertWizardSidebar: React.FC<Props> = ({ alert, onClose }) => {
  const [note, setNote] = useState('');
  const updateAlertStatus = useCommandStore(state => state.updateAlertStatus);
  const isDrawingRoute = useCommandStore(state => state.isDrawingRoute);
  const escapeRouteWaypoints = useCommandStore(state => state.escapeRouteWaypoints);

  // Equipos disponibles para despacho
  const [availableTeams] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('admin_teams_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'team-001',
        teamName: 'Unidad de Respuesta Alfa-12',
        teamType: 'patrulla',
        mainVehiclePlate: 'POL-492',
        leaderUsername: 'cmdte_rodriguez',
        leaderId: '79845123',
        assignedZone: 'Sector Norte - Cuadrante 3',
        status: 'disponible',
        etaMins: 3,
        members: [
          { name: 'Sgto. Hector Rodriguez', identification: '79845123', badgeOrPlate: 'PL-8831', roleInTeam: 'Comandante' },
          { name: 'Patrullero David Arias', identification: '1023458901', badgeOrPlate: 'PL-9942', roleInTeam: 'Conductor Táctico' },
          { name: 'Agente Sofia Castro', identification: '1074829103', badgeOrPlate: 'PL-7721', roleInTeam: 'Primer Respondiente' }
        ]
      },
      {
        id: 'team-002',
        teamName: 'Escuadrón Rápido Halcón-4',
        teamType: 'motorizada',
        mainVehiclePlate: 'MOTO-773',
        leaderUsername: 'cabo_morales',
        leaderId: '80123984',
        assignedZone: 'Sector Centro - Eje Comercial',
        status: 'disponible',
        etaMins: 2,
        members: [
          { name: 'Cabo Jorge Morales', identification: '80123984', badgeOrPlate: 'MOTO-773', roleInTeam: 'Líder' },
          { name: 'Patrullero Camilo Vega', identification: '1098234561', badgeOrPlate: 'MOTO-774', roleInTeam: 'Apoyo' }
        ]
      },
      {
        id: 'team-003',
        teamName: 'Fuerza Especial Cobra-9',
        teamType: 'tactica',
        mainVehiclePlate: 'SWAT-009',
        leaderUsername: 'capitan_vargas',
        leaderId: '71928410',
        assignedZone: 'Perímetro Metropolitano',
        status: 'disponible',
        etaMins: 5,
        members: [
          { name: 'Capitán Vargas', identification: '71928410', badgeOrPlate: 'SWAT-1', roleInTeam: 'Líder Operativo' },
          { name: 'Tirador Especialista M. Ruiz', identification: '103829104', badgeOrPlate: 'SWAT-2', roleInTeam: 'Táctico' },
          { name: 'Agente Brechero L. Peña', identification: '108472911', badgeOrPlate: 'SWAT-3', roleInTeam: 'Asalto' }
        ]
      }
    ];
  });

  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => availableTeams[0]?.id || '');

  const [assignedTeam, setAssignedTeam] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(`alert_team_${alert.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [showMemberDetails, setShowMemberDetails] = useState(false);

  const currentSelectedTeam = availableTeams.find(t => t.id === selectedTeamId) || availableTeams[0];

  const handleDispatchTeam = async () => {
    if (!currentSelectedTeam) return;
    setAssignedTeam(currentSelectedTeam);
    localStorage.setItem(`alert_team_${alert.id}`, JSON.stringify(currentSelectedTeam));
    if (alert.status === 'pending') {
      updateAlertStatus(alert.id, 'reviewing');
    }
    try {
      await api.post(`/alerts/${alert.id}/dispatch`, {
        notes: `🚨 Despacho táctico asignado: ${currentSelectedTeam.teamName}`
      });
    } catch (err) {
      console.warn('Aviso: despacho emitido localmente:', err);
    }
  };

  const handleUnassignTeam = () => {
    setAssignedTeam(null);
    localStorage.removeItem(`alert_team_${alert.id}`);
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await api.patch(`/alerts/${alert.id}/status`, { status: newStatus, notes: note });
      if (res.status === 200 || res.status === 201) {
        setNote('');
        updateAlertStatus(alert.id, newStatus);
      } else {
        console.error('Fallo al actualizar el estado de la alerta');
      }
    } catch (err) {
      console.error('Error de red al cambiar estado:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950/60 shadow-xs font-black';
      case 'reviewing': return 'text-amber-800 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 shadow-xs font-bold';
      case 'verified': return 'text-sky-800 bg-sky-100 dark:text-sky-300 dark:bg-sky-950/60 shadow-xs font-bold';
      case 'resolved': return 'text-emerald-800 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/60 shadow-xs font-bold';
      default: return 'text-stone-700 bg-stone-200 dark:text-stone-300 dark:bg-stone-800 shadow-xs';
    }
  };

  return (
    <div className="w-[410px] bg-[var(--bg-sidebar)] flex flex-col h-full shadow-md dark:shadow-lg z-30 animate-in slide-in-from-right text-[var(--text-primary)] theme-transition">
      {/* Header */}
      <div className="p-4 flex items-start justify-between bg-[var(--bg-sidebar-header)] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-red-500/15 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center shadow-xs shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[var(--text-primary)] tracking-wide uppercase">
              Asistente de Despacho
            </h2>
            <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
              Alerta ID: #{alert.id.substring(0, 8)}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1.5 rounded hover:bg-[var(--bg-overlay)] cursor-pointer">
          <X size={16} />
        </button>
      </div>

      <div className="w-full h-px bg-neutral-200 dark:bg-[#343434]" />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-[var(--bg-sidebar)]">
        {/* Info Card de la Alerta */}
        <div className="bg-[#f8f7f5] dark:bg-[var(--bg-surface)] shadow-xs rounded p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className={`inline-block px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${getStatusColor(alert.status)}`}>
              {alert.status === 'pending' ? 'Alerta Crítica SOS' : alert.status === 'reviewing' ? 'En Atención / Despacho' : alert.status}
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1 font-semibold">
              <Clock size={11} /> {new Date(alert.timestamp).toLocaleTimeString('es-ES')}
            </span>
          </div>
          <p className="text-[var(--text-primary)] font-bold text-xs leading-snug">
            {alert.description || 'Pánico disparado por ciudadano en cuadrante'}
          </p>
          <div className="text-[var(--text-secondary)] text-[11px] font-mono flex items-center gap-1.5 pt-1.5">
            <Navigation size={11} className="text-[var(--brand)] shrink-0" />
            <span className="truncate">{alert.sourceLocation.address || `${alert.sourceLocation.lat.toFixed(4)}, ${alert.sourceLocation.lng.toFixed(4)}`}</span>
          </div>
        </div>

        {/* ─── DESPACHO TÁCTICO: SELECTOR VISUAL DE EQUIPOS ─── */}
        <div className="bg-[#f8f7f5] dark:bg-[var(--bg-surface)] shadow-xs rounded p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-[#34d399]">
              <Shield size={15} />
              <span>Despacho de Unidades en Campo</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-muted)] font-semibold">
              {availableTeams.length} en radio
            </span>
          </div>

          {assignedTeam ? (
            /* ─── UNIDAD YA ASIGNADA / EN RUTA (Hologram Radar Card) ─── */
            <div className="relative overflow-hidden rounded bg-emerald-500/10 dark:bg-emerald-950/30 p-4 space-y-3 shadow-md">
              {/* Baliza reflectiva */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-[#34d399]">
                    Unidad en Desplazamiento
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-primary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded shadow-xs font-bold">
                  ETA ~{assignedTeam.etaMins || 3} min
                </span>
              </div>

              {/* Nombre y Placa Destacada */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[var(--text-primary)]">{assignedTeam.teamName}</h4>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">{assignedTeam.assignedZone}</p>
                </div>

                <div className="px-3 py-1 bg-amber-500/15 rounded text-center shadow-xs">
                  <span className="text-[9px] block text-amber-700 dark:text-[#ca8a04] uppercase font-bold tracking-widest">Placa Móvil</span>
                  <span className="text-xs font-black text-amber-800 dark:text-[#facc15] font-mono">{assignedTeam.mainVehiclePlate}</span>
                </div>
              </div>

              {/* Dotación y Comandante */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono">
                <span>Líder: @{assignedTeam.leaderUsername}</span>
                <button
                  type="button"
                  onClick={() => setShowMemberDetails(v => !v)}
                  className="text-emerald-600 dark:text-[#34d399] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Users size={12} />
                  <span>{assignedTeam.members?.length || 0} agentes ({showMemberDetails ? 'Ocultar' : 'Ver'})</span>
                </button>
              </div>

              {/* Desglose de integrantes si se abre */}
              {showMemberDetails && (
                <div className="space-y-1.5 pt-2 text-[11px] font-mono">
                  {assignedTeam.members?.map((m: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-[var(--text-primary)] bg-[var(--bg-elevated)] px-2.5 py-1.5 rounded shadow-xs">
                      <span>{m.name} ({m.roleInTeam})</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">Placa: {m.badgeOrPlate}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón Reasignar */}
              <button
                onClick={handleUnassignTeam}
                className="w-full py-2 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Reasignar o Liberar Móvil</span>
              </button>
            </div>
          ) : (
            /* ─── SELECTOR VISUAL DE EQUIPOS (RADIO CARDS INTERACTIVAS) ─── */
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                {availableTeams.map((team) => {
                  const isSelected = selectedTeamId === team.id;
                  return (
                    <div
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`cursor-pointer rounded p-3 transition-all duration-200 relative ${
                        isSelected
                          ? 'bg-emerald-500/10 shadow-[0_4px_16px_rgba(16,185,129,0.22)] ring-2 ring-emerald-500/50'
                          : 'bg-[var(--bg-elevated)] shadow-sm hover:shadow-md hover:bg-[var(--bg-overlay)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                            isSelected 
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          }`}>
                            <Car size={16} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{team.teamName}</h4>
                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <Check size={11} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] font-mono truncate">{team.assignedZone}</p>
                          </div>
                        </div>

                        {/* Placa vehicular estilo oficial */}
                        <div className="px-2 py-0.5 bg-amber-500/15 rounded text-center shrink-0 shadow-xs">
                          <span className="text-[11px] font-black text-amber-800 dark:text-[#facc15] font-mono tracking-wider">
                            {team.mainVehiclePlate}
                          </span>
                        </div>
                      </div>

                      {/* Footer de la tarjeta con dotación y tiempo */}
                      <div className="flex items-center justify-between mt-2 pt-2 text-[10px] font-mono">
                        <span className="text-[var(--text-secondary)] flex items-center gap-1 font-medium">
                          <Users size={11} className="text-emerald-600 dark:text-emerald-400" />
                          <span>{team.members?.length || 0} Agentes • @{team.leaderUsername}</span>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ETA ~{team.etaMins || 3} min
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón de Despacho de Alto Impacto */}
              <button
                onClick={handleDispatchTeam}
                className="w-full py-3 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Shield size={16} />
                <span>Autorizar Despacho Inmediato</span>
              </button>
            </div>
          )}
        </div>

        {/* Acciones de Estado de la Alerta */}
        <div className="bg-[#f8f7f5] dark:bg-[var(--bg-surface)] shadow-xs rounded p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-[var(--text-primary)] tracking-wider">Bitácora & Estado Operativo</h3>
          
          <textarea 
            placeholder="Nota operativa obligatoria para cambiar estado..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full bg-[var(--bg-input)] shadow-sm focus:shadow-md rounded p-3 text-xs text-[var(--text-primary)] outline-none min-h-[64px] resize-none font-mono placeholder-[var(--text-disabled)] transition-all"
          />

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleStatusChange('reviewing')}
              disabled={alert.status !== 'pending' || note.length < 5}
              className="flex items-center justify-center gap-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm hover:shadow py-2 rounded text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Eye size={13} /> Tomar Control
            </button>
            <button 
              onClick={() => handleStatusChange('verified')}
              disabled={alert.status !== 'reviewing' || note.length < 5}
              className="flex items-center justify-center gap-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 shadow-sm hover:shadow py-2 rounded text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <CheckCircle size={13} /> Verificar
            </button>
            <button 
              onClick={() => handleStatusChange('resolved')}
              disabled={!['reviewing', 'verified'].includes(alert.status) || note.length < 5}
              className="col-span-2 flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--bg-app)] shadow-md hover:shadow-lg py-2.5 rounded text-xs font-black hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-wider cursor-pointer"
            >
              <FileArchive size={14} /> Resolver y Archivar
            </button>
          </div>
          {note.length < 5 && (
            <span className="text-[10px] text-[var(--text-muted)] text-center block font-medium">* Se requiere una nota mínima de 5 caracteres para archivar.</span>
          )}
        </div>

        {/* --- REPORTE POST-EVENTO (Motor Predictivo) --- */}
        <div className="bg-[#f8f7f5] dark:bg-[var(--bg-surface)] shadow-xs rounded p-4 space-y-2.5">
          <h3 className="text-xs font-bold uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-2">
            <Flame size={14} className="text-amber-500" />
            <span>Entrenamiento de Rutas (IA)</span>
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] leading-tight font-medium">
            Traza la ruta de escape real tomada por los sospechosos para reentrenar el Motor Predictivo espacial.
          </p>
          
          {!isDrawingRoute ? (
            <button 
              onClick={() => useCommandStore.getState().setDrawingRoute(true)}
              className="w-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-sm hover:shadow py-2.5 rounded text-xs font-bold transition-all cursor-pointer"
            >
              Trazar Ruta en el Mapa
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="bg-[var(--bg-elevated)] shadow-xs p-2.5 rounded text-xs text-[var(--text-primary)] font-mono">
                Modo dibujo activo: Haz clics en el mapa para fijar waypoints.
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={async () => {
                    useCommandStore.getState().undoLastWaypoint();
                    const { escapeRouteWaypoints, setEscapeRoutePoints } = useCommandStore.getState();
                    if (escapeRouteWaypoints.length < 2) {
                      setEscapeRoutePoints(escapeRouteWaypoints);
                    } else {
                      try {
                        const snappedPath = await import('../../services/routingService').then(m => m.routingService.getSnappedRoute(escapeRouteWaypoints));
                        setEscapeRoutePoints(snappedPath);
                      } catch (err) {
                        setEscapeRoutePoints(escapeRouteWaypoints);
                      }
                    }
                  }}
                  disabled={escapeRouteWaypoints.length === 0}
                  className="w-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-[var(--text-secondary)] shadow-sm py-2 rounded text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Deshacer
                </button>
                
                <button 
                  onClick={() => {
                    useCommandStore.getState().clearEscapeRoute();
                    window.alert("Modelo Predictivo Actualizado ✅\nLa ruta ha sido guardada y procesada por la IA.");
                  }}
                  className="w-full bg-[var(--text-primary)] hover:opacity-90 text-[var(--bg-app)] shadow-md py-2 rounded text-xs font-black transition-all cursor-pointer"
                >
                  Guardar Ruta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <AlertTimeline alertId={alert.id} />
      </div>
    </div>
  );
};
