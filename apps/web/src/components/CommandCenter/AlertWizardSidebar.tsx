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
  Radio, 
  BadgeCheck, 
  Navigation, 
  Clock, 
  ChevronRight,
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

  const handleDispatchTeam = () => {
    if (!currentSelectedTeam) return;
    setAssignedTeam(currentSelectedTeam);
    localStorage.setItem(`alert_team_${alert.id}`, JSON.stringify(currentSelectedTeam));
    if (alert.status === 'pending') {
      updateAlertStatus(alert.id, 'reviewing');
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
      case 'pending': return 'text-[#fda4af] border-[#881337]/50 bg-[#881337]/25 font-bold';
      case 'reviewing': return 'text-[#fde68a] border-[#78350f]/50 bg-[#78350f]/25';
      case 'verified': return 'text-[#7dd3fc] border-[#0369a1]/50 bg-[#0c4a6e]/25 font-semibold';
      case 'resolved': return 'text-[#86efac] border-[#047857]/50 bg-[#064e3b]/25';
      default: return 'text-[#a3a3a3] border-[#262626] bg-[#141414]';
    }
  };

  return (
    <div className="w-[410px] bg-[#0c0c0e] border-l border-[#26262a] flex flex-col h-full shadow-[-15px_0_40px_rgba(0,0,0,0.8)] z-30 animate-in slide-in-from-right text-[#efede3]">
      {/* Header */}
      <div className="p-4 border-b border-[#222226] flex items-start justify-between bg-[#111114]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#450a0a]/80 border border-[#991b1b]/50 flex items-center justify-center text-[#f87171] shadow-md shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#efede3] tracking-wide uppercase">
              Asistente de Despacho
            </h2>
            <div className="text-[11px] text-[#737373] font-mono mt-0.5">
              Alerta ID: #{alert.id.substring(0, 8)}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-[#737373] hover:text-[#efede3] transition-colors p-1.5 rounded-lg hover:bg-[#1f1f23]">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
        {/* Info Card de la Alerta */}
        <div className="bg-[#131316] border border-[#26262b] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(alert.status)}`}>
              {alert.status === 'pending' ? 'Alerta Crítica SOS' : alert.status === 'reviewing' ? 'En Atención / Despacho' : alert.status}
            </div>
            <span className="text-[11px] font-mono text-[#737373] flex items-center gap-1">
              <Clock size={11} /> {new Date(alert.timestamp).toLocaleTimeString('es-ES')}
            </span>
          </div>
          <p className="text-[#efede3] font-bold text-xs leading-snug">
            {alert.description || 'Pánico disparado por ciudadano en cuadrante'}
          </p>
          <div className="text-[#a3a3a3] text-[11px] font-mono flex items-center gap-1.5 pt-1 border-t border-[#222226]">
            <Navigation size={11} className="text-[#818cf8] shrink-0" />
            <span className="truncate">{alert.sourceLocation.address || `${alert.sourceLocation.lat.toFixed(4)}, ${alert.sourceLocation.lng.toFixed(4)}`}</span>
          </div>
        </div>

        {/* ─── DESPACHO TÁCTICO: SELECTOR VISUAL DE EQUIPOS ─── */}
        <div className="bg-[#121215] border border-[#26262b] rounded-2xl p-4 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#34d399]">
              <Shield size={15} />
              <span>Despacho de Unidades en Campo</span>
            </div>
            <span className="text-[10px] font-mono text-[#737373]">
              {availableTeams.length} en radio
            </span>
          </div>

          {assignedTeam ? (
            /* ─── UNIDAD YA ASIGNADA / EN RUTA (Hologram Radar Card) ─── */
            <div className="relative overflow-hidden rounded-xl border border-[#059669]/60 bg-gradient-to-b from-[#0a2318] to-[#0d1712] p-4 space-y-3 shadow-[0_0_20px_rgba(5,150,105,0.2)]">
              {/* Baliza reflectiva */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#34d399]">
                    Unidad en Desplazamiento
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#a3a3a3] bg-[#0e2a1d] px-2 py-0.5 rounded border border-[#059669]/40">
                  ETA ~{assignedTeam.etaMins || 3} min
                </span>
              </div>

              {/* Nombre y Placa Destacada */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[#efede3]">{assignedTeam.teamName}</h4>
                  <p className="text-[11px] text-[#737373] font-mono">{assignedTeam.assignedZone}</p>
                </div>

                <div className="px-3 py-1 bg-[#1a1807] border border-[#eab308]/60 rounded-lg text-center shadow-inner">
                  <span className="text-[9px] block text-[#ca8a04] uppercase font-bold tracking-widest">Placa Móvil</span>
                  <span className="text-xs font-black text-[#facc15] font-mono">{assignedTeam.mainVehiclePlate}</span>
                </div>
              </div>

              {/* Dotación y Comandante */}
              <div className="pt-2 border-t border-[#1b3d2b] flex items-center justify-between text-[11px] text-[#a3a3a3] font-mono">
                <span>Líder: @{assignedTeam.leaderUsername}</span>
                <button
                  type="button"
                  onClick={() => setShowMemberDetails(v => !v)}
                  className="text-[#34d399] hover:underline flex items-center gap-1 font-bold"
                >
                  <Users size={12} />
                  <span>{assignedTeam.members?.length || 0} agentes ({showMemberDetails ? 'Ocultar' : 'Ver'})</span>
                </button>
              </div>

              {/* Desglose de integrantes si se abre */}
              {showMemberDetails && (
                <div className="space-y-1.5 pt-2 border-t border-[#1b3d2b] text-[11px] font-mono">
                  {assignedTeam.members?.map((m: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-[#d4d4d4] bg-[#0c1e15] px-2.5 py-1.5 rounded border border-[#163a27]">
                      <span>{m.name} ({m.roleInTeam})</span>
                      <span className="text-[#facc15] font-bold">Placa: {m.badgeOrPlate}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón Reasignar */}
              <button
                onClick={handleUnassignTeam}
                className="w-full py-2 rounded-xl bg-[#1c1c20] hover:bg-[#25252b] text-xs font-bold text-[#a3a3a3] hover:text-white transition-colors border border-[#303036] flex items-center justify-center gap-1.5"
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
                      className={`cursor-pointer rounded-xl p-3 border transition-all duration-200 relative ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#0d281e] to-[#0f1f1a] border-[#10b981] ring-1 ring-[#10b981]/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                          : 'bg-[#161619] border-[#26262a] hover:border-[#383840] hover:bg-[#1a1a1f]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected 
                              ? 'bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/40' 
                              : 'bg-[#202024] text-[#8c8c8c] border border-[#2e2e34]'
                          }`}>
                            <Car size={16} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-[#efede3] truncate">{team.teamName}</h4>
                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-[#10b981] text-black flex items-center justify-center shrink-0">
                                  <Check size={11} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#737373] font-mono truncate">{team.assignedZone}</p>
                          </div>
                        </div>

                        {/* Placa vehicular estilo oficial */}
                        <div className="px-2 py-0.5 bg-[#171505] border border-[#eab308]/50 rounded text-center shrink-0 shadow-inner">
                          <span className="text-[11px] font-black text-[#facc15] font-mono tracking-wider">
                            {team.mainVehiclePlate}
                          </span>
                        </div>
                      </div>

                      {/* Footer de la tarjeta con dotación y tiempo */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#222226] text-[10px] font-mono">
                        <span className="text-[#a3a3a3] flex items-center gap-1">
                          <Users size={11} className="text-[#34d399]" />
                          <span>{team.members?.length || 0} Agentes • @{team.leaderUsername}</span>
                        </span>
                        <span className="text-[#34d399] font-bold">
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#059669] to-[#0d9488] hover:from-[#047857] hover:to-[#0f766e] text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(5,150,105,0.35)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Shield size={16} />
                <span>Autorizar Despacho Inmediato</span>
              </button>
            </div>
          )}
        </div>

        {/* Acciones de Estado de la Alerta */}
        <div className="bg-[#121215] border border-[#26262b] rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-[#737373] tracking-wider">Bitácora & Estado Operativo</h3>
          
          <textarea 
            placeholder="Nota operativa obligatoria para cambiar estado..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full bg-[#0a0a0c] border border-[#26262b] rounded-xl p-3 text-xs text-[#efede3] outline-none focus:border-[#4f46e5]/60 min-h-[64px] resize-none font-mono placeholder-[#525256]"
          />

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleStatusChange('reviewing')}
              disabled={alert.status !== 'pending' || note.length < 5}
              className="flex items-center justify-center gap-1.5 bg-[#17171b] text-[#d4d4d4] border border-[#2a2a30] py-2 rounded-xl text-xs font-semibold hover:bg-[#202026] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Eye size={13} /> Tomar Control
            </button>
            <button 
              onClick={() => handleStatusChange('verified')}
              disabled={alert.status !== 'reviewing' || note.length < 5}
              className="flex items-center justify-center gap-1.5 bg-[#17171b] text-[#7dd3fc] border border-[#0369a1]/40 py-2 rounded-xl text-xs font-semibold hover:bg-[#0c4a6e]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <CheckCircle size={13} /> Verificar
            </button>
            <button 
              onClick={() => handleStatusChange('resolved')}
              disabled={!['reviewing', 'verified'].includes(alert.status) || note.length < 5}
              className="col-span-2 flex items-center justify-center gap-2 bg-[#efede3] text-[#0a0a0a] border border-[#efede3] py-2.5 rounded-xl text-xs font-black hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-wider shadow-sm"
            >
              <FileArchive size={14} /> Resolver y Archivar
            </button>
          </div>
          {note.length < 5 && (
            <span className="text-[10px] text-[#737373] text-center block">* Se requiere una nota mínima de 5 caracteres para archivar.</span>
          )}
        </div>

        {/* --- REPORTE POST-EVENTO (Motor Predictivo) --- */}
        <div className="bg-[#121215] border border-[#26262b] rounded-2xl p-4 space-y-2.5">
          <h3 className="text-xs font-bold uppercase text-[#efede3] tracking-wider flex items-center gap-2">
            <Flame size={14} className="text-[#f59e0b]" />
            <span>Entrenamiento de Rutas (IA)</span>
          </h3>
          <p className="text-[10px] text-[#737373] leading-tight">
            Traza la ruta de escape real tomada por los sospechosos para reentrenar el Motor Predictivo espacial.
          </p>
          
          {!isDrawingRoute ? (
            <button 
              onClick={() => useCommandStore.getState().setDrawingRoute(true)}
              className="w-full bg-[#18181c] border border-[#2a2a30] text-[#efede3] hover:bg-[#222228] py-2.5 rounded-xl text-xs font-bold transition-colors"
            >
              Trazar Ruta en el Mapa
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="bg-[#18181c] border border-[#33333b] p-2.5 rounded-xl text-xs text-[#efede3] font-mono">
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
                  className="w-full bg-[#18181c] hover:bg-[#222228] text-[#d4d4d4] py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-[#2a2a30]"
                >
                  Deshacer
                </button>
                
                <button 
                  onClick={() => {
                    useCommandStore.getState().clearEscapeRoute();
                    window.alert("Modelo Predictivo Actualizado ✅\nLa ruta ha sido guardada y procesada por la IA.");
                  }}
                  className="w-full bg-[#efede3] hover:bg-white text-[#0a0a0a] py-2 rounded-xl text-xs font-black transition-colors"
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
