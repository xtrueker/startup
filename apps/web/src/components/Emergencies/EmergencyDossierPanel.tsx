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
import { LiquidGlassCard, LiquidPillButton } from '../ui/LiquidPrimitives';

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
    <LiquidGlassCard strong className="h-full flex flex-col rounded-[26px] overflow-hidden transition-all text-[var(--text-primary)]">
      {/* Dossier Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-rose-500/12 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-sm">
            <Siren size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">
                Expediente #{alert.id.substring(0, 8)}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-rose-500/12 border border-rose-500/25 text-rose-600 dark:text-rose-400 font-mono">
                {stripEmojis(alert.type) || 'Emergencia'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] font-mono truncate">
              {stripEmojis(alert.location?.address) || 'Ubicación Georeferenciada'}
            </p>
          </div>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onToggleExpand}
            title={isExpanded ? 'Vista Dividida' : 'Expandir Expediente'}
            className="glass-button w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            onClick={onClose}
            title="Cerrar Expediente"
            className="glass-button w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Dossier Tabs */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-input)] overflow-x-auto shrink-0 custom-scrollbar">
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'liquid-pill-obsidian shadow-sm'
                  : 'glass-button text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <TabIcon size={13} />
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
      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <span className="text-xs font-mono text-[var(--text-muted)]">
          ID Sistema: {alert.id}
        </span>

        <div className="flex items-center gap-2">
          {alert.status !== 'resolved' && (
            <LiquidPillButton
              variant="aqua"
              size="sm"
              onClick={() => onResolve(alert.id)}
              className="!bg-emerald-500/15 !border-emerald-500/35 !text-emerald-700 dark:!text-emerald-300 hover:!bg-emerald-500/25"
            >
              <CheckCircle2 size={14} />
              <span>Marcar como Resuelta</span>
            </LiquidPillButton>
          )}

          <LiquidPillButton
            variant="obsidian"
            size="sm"
            onClick={() => onNavigateToDispatch(alert.id)}
          >
            <ExternalLink size={14} />
            <span>Ver en Central de Despacho</span>
          </LiquidPillButton>
        </div>
      </div>
    </LiquidGlassCard>
  );
};

