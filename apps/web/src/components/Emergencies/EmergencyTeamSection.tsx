import React from 'react';
import { Siren, Ambulance, Car, Users, User } from 'lucide-react';
import { stripEmojis, type AssignedTeamInfo } from './types';

interface EmergencyTeamSectionProps {
  team: AssignedTeamInfo;
}

export const EmergencyTeamSection: React.FC<EmergencyTeamSectionProps> = ({ team }) => {
  const isAmbulance = team.teamType?.toLowerCase().includes('ambulanc') || team.teamName?.toLowerCase().includes('ambulanc');

  return (
    <div className="space-y-4">
      <div className="bg-[#141416] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            {isAmbulance ? (
              <Ambulance size={15} className="text-rose-400" />
            ) : (
              <Siren size={15} className="text-sky-400" />
            )}
            <span>{isAmbulance ? 'Ambulancia / Asistencia Médica' : 'Unidad y Patrulla Policial'}</span>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 font-mono">
            {stripEmojis(team.status)}
          </span>
        </div>

        {/* Ficha de la patrulla */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#0f0f11] border border-zinc-800/70 rounded-xl">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Nombre de Unidad</span>
            <div className="text-sm font-semibold text-zinc-100 mt-0.5">{stripEmojis(team.teamName)}</div>
            <div className="text-xs text-zinc-400">{stripEmojis(team.teamType)}</div>
          </div>

          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Placa del Móvil Principal</span>
            <div className="text-sm font-bold text-amber-300 font-mono mt-0.5 flex items-center gap-1.5">
              <Car size={14} className="text-amber-400" />
              <span>{team.mainVehiclePlate}</span>
            </div>
            <div className="text-xs text-zinc-500">{stripEmojis(team.assignedZone)}</div>
          </div>

          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Líder Responsable</span>
            <div className="text-sm font-semibold text-zinc-100 mt-0.5 flex items-center gap-1.5">
              <User size={13} className="text-emerald-400" />
              <span className="text-emerald-300 font-medium">@{team.leaderUsername}</span>
            </div>
            <div className="text-xs font-mono text-zinc-500">ID: {team.leaderId}</div>
          </div>
        </div>

        {/* Dotación de personal del equipo */}
        <div className="space-y-2 mt-4">
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Users size={14} className="text-emerald-400" />
            <span>Personal de Dotación ({team.members?.length || 0} efectivos)</span>
          </span>

          <div className="divide-y divide-zinc-800/70 bg-[#0f0f11] border border-zinc-800/70 rounded-xl overflow-hidden">
            {team.members?.map((member, mIdx) => (
              <div key={mIdx} className="p-3 flex items-center justify-between text-xs hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center font-semibold text-[11px] text-emerald-400">
                    {mIdx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-200">{stripEmojis(member.name)}</div>
                    <div className="text-[11px] text-zinc-500">{stripEmojis(member.roleInTeam)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-zinc-400">CC: {member.identification}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/30 text-amber-300 font-medium border border-amber-800/40">
                    Placa: {member.badgeOrPlate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

