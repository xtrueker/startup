import React from 'react';
import { Route, Layers, Camera as CameraIcon } from 'lucide-react';
import { stripEmojis, type RouteCameraCoverage } from './types';

interface EmergencyRoutesSectionProps {
  routes: RouteCameraCoverage[];
}

export const EmergencyRoutesSection: React.FC<EmergencyRoutesSectionProps> = ({ routes }) => {
  return (
    <div className="space-y-4">
      <div className="text-xs text-amber-400 font-mono flex items-center gap-2">
        <Route size={14} className="text-amber-400" />
        <span>Cámaras en corredores tácticos y posibles trayectorias</span>
      </div>

      <div className="space-y-3">
        {routes.map((routeGroup, rIdx) => (
          <div key={rIdx} className="bg-[#141416] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
              <div>
                <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <Layers size={13} className="text-amber-400" />
                  <span>{stripEmojis(routeGroup.routeName)}</span>
                </h4>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Puntos de control: {routeGroup.waypointsCount} coordenadas evaluadas en el trazado
                </p>
              </div>
              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 w-max font-mono">
                {stripEmojis(routeGroup.riskLevel)}
              </span>
            </div>

            {/* Cámaras a lo largo de esta ruta */}
            <div className="space-y-2">
              <span className="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider">
                Cámaras de vigilancia en el trayecto ({routeGroup.cameras.length}):
              </span>

              {routeGroup.cameras.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">
                  No hay cámaras registradas en el eje de este corredor.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {routeGroup.cameras.map((cam) => (
                    <div key={cam.id} className="p-2.5 rounded-lg bg-[#0f0f11] border border-zinc-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CameraIcon size={14} className="text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-zinc-200">{stripEmojis(cam.name)}</div>
                          <div className="text-[10px] text-zinc-500 truncate max-w-[170px]">
                            {stripEmojis(cam.location?.address)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-800/40 shrink-0">
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

