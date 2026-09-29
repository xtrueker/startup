import React, { useState } from 'react';
import { 
  Siren, 
  X, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  CheckCircle2, 
  FileText, 
  Users, 
  Cctv, 
  Route, 
  Volume2 
} from 'lucide-react';
import type { Alert as ApiAlert } from '../../services/alerts';
import type { Camera } from '../../services/cameras';
import { 
  stripEmojis,
  type AssignedOperatorInfo, 
  type AssignedTeamInfo, 
  type RouteCameraCoverage 
} from './types';
import { EmergencySummarySection } from './EmergencySummarySection';
import { EmergencyTeamSection } from './EmergencyTeamSection';
import { EmergencyCamerasSection } from './EmergencyCamerasSection';
import { EmergencyRoutesSection } from './EmergencyRoutesSection';
import { EmergencyEvidenceSection } from './EmergencyEvidenceSection';

interface EmergencyDossierPanelProps {
  alert: ApiAlert;
  operator: AssignedOperatorInfo;
  team: AssignedTeamInfo;
  nearbyCameras: Array<Camera & { distanceMeters: number }>;
  routeCameras: RouteCameraCoverage[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  onResolve: (id: string) => void;
  onNavigateToDispatch: (id: string) => void;
}

export const EmergencyDossierPanel: React.FC<EmergencyDossierPanelProps> = ({
  alert,
  operator,
  team,
  nearbyCameras,
  routeCameras,
  isExpanded,
  onToggleExpand,
  onClose,
  onResolve,
  onNavigateToDispatch,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'team' | 'cameras' | 'routes' | 'evidence'>('summary');

  return (
    <div className="h-full flex flex-col bg-[#111113] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* Dossier Header */}
      <div className="p-4 border-b border-zinc-800 bg-[#161619] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-800/50 flex items-center justify-center text-red-400 shrink-0 shadow-sm">
            <Siren size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-zinc-100 truncate">
                Expediente #{alert.id.substring(0, 8)}
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-red-950/40 border border-red-800/50 text-red-300 font-mono">
                {stripEmojis(alert.type) || 'Emergencia'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono truncate">
              {stripEmojis(alert.location?.address) || 'Ubicación Georeferenciada'}
            </p>
          </div>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleExpand}
            title={isExpanded ? 'Vista Dividida' : 'Expandir Expediente'}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            onClick={onClose}
            title="Cerrar Expediente"
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Dossier Tabs */}
      <div className="flex items-center gap-1 px-4 pt-2 border-b border-zinc-800 bg-[#141416] overflow-x-auto shrink-0 custom-scrollbar">
        {[
          { key: 'summary', label: 'Resumen & Operador', Icon: FileText },
          { key: 'team', label: 'Equipos Asignados', Icon: Users },
          { key: 'cameras', label: `Cámaras Cercanas (${nearbyCameras.length})`, Icon: Cctv },
          { key: 'routes', label: `Cámaras en Rutas (${routeCameras.length})`, Icon: Route },
          { key: 'evidence', label: 'Evidencias & Audio', Icon: Volume2 },
        ].map(tab => {
          const TabIcon = tab.Icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-950/20 font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20'
              }`}
            >
              <TabIcon size={13} className={isActive ? 'text-blue-400' : 'text-zinc-500'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dossier Content */}
      <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
        {activeTab === 'summary' && (
          <EmergencySummarySection alert={alert} operator={operator} />
        )}
        {activeTab === 'team' && (
          <EmergencyTeamSection team={team} />
        )}
        {activeTab === 'cameras' && (
          <EmergencyCamerasSection cameras={nearbyCameras} />
        )}
        {activeTab === 'routes' && (
          <EmergencyRoutesSection routes={routeCameras} />
        )}
        {activeTab === 'evidence' && (
          <EmergencyEvidenceSection alert={alert} operator={operator} team={team} />
        )}
      </div>

      {/* Dossier Footer Actions */}
      <div className="p-4 border-t border-zinc-800 bg-[#141416] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <span className="text-xs font-mono text-zinc-500">
          ID Sistema: {alert.id}
        </span>

        <div className="flex items-center gap-2">
          {alert.status !== 'resolved' && (
            <button
              onClick={() => onResolve(alert.id)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Marcar como Resuelta</span>
            </button>
          )}

          <button
            onClick={() => onNavigateToDispatch(alert.id)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ExternalLink size={14} />
            <span>Ver en Central de Despacho</span>
          </button>
        </div>
      </div>
    </div>
  );
};

