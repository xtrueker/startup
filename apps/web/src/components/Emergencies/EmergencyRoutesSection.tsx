import React from 'react';
import { Route, Layers, Camera as CameraIcon } from 'lucide-react';
import { stripEmojis, type RouteCameraCoverage } from './types';

interface EmergencyRoutesSectionProps {
  routes: RouteCameraCoverage[];
}

export const EmergencyRoutesSection: React.FC<EmergencyRoutesSectionProps> = ({ routes }) => {
  return (
    <div className="space-y-4">
      <div className="text-xs text-amber-600 dark:text-amber-400 font-mono flex items-center gap-2 font-semibold">
        <Route size={14} className="text-amber-500" />
        <span>Cámaras en corredores tácticos y posibles trayectorias</span>
      </div>

      <div className="space-y-3">
        {routes.map((routeGroup, rIdx) => (
          <div key={rIdx} className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[22px] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Layers size={13} className="text-amber-500" />
                  <span>{stripEmojis(routeGroup.routeName)}</span>
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  Puntos de control: {routeGroup.waypointsCount} coordenadas evaluadas en el trazado
                </p>
              </div>
              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-amber-500/12 border border-amber-500/25 text-amber-700 dark:text-amber-300 w-max font-mono">
                {stripEmojis(routeGroup.riskLevel)}
              </span>
            </div>

            {/* Cámaras a lo largo de esta ruta */}
            <div className="space-y-2">
              <span className="text-[11px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">
                Cámaras de vigilancia en el trayecto ({routeGroup.cameras.length}):
              </span>

              {routeGroup.cameras.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic">
                  No hay cámaras registradas en el eje de este corredor.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {routeGroup.cameras.map((cam) => (
                    <div key={cam.id} className="p-2.5 rounded-[16px] liquid-input-chamber flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CameraIcon size={14} className="text-[#0EA5E9] shrink-0" />
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">{stripEmojis(cam.name)}</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[170px]">
                            {stripEmojis(cam.location?.address)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/12 px-2.5 py-0.5 rounded-full border border-amber-500/25 shrink-0">
                        a {cam.distanceToRoute}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

