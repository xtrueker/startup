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
      <div className="bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-[22px] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            {isAmbulance ? (
              <Ambulance size={15} className="text-rose-500" />
            ) : (
              <Siren size={15} className="text-[#0EA5E9]" />
            )}
            <span>{isAmbulance ? 'Ambulancia / Asistencia Médica' : 'Unidad y Patrulla Policial'}</span>
          </div>
          <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-mono">
            {stripEmojis(team.status)}
          </span>
        </div>

        {/* Ficha de la patrulla */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 liquid-input-chamber rounded-[18px]">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Nombre de Unidad</span>
            <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{stripEmojis(team.teamName)}</div>
            <div className="text-xs text-[var(--text-secondary)]">{stripEmojis(team.teamType)}</div>
          </div>

          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Placa del Móvil Principal</span>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-300 font-mono mt-0.5 flex items-center gap-1.5">
              <Car size={14} className="text-amber-500" />
              <span>{team.mainVehiclePlate}</span>
            </div>
            <div className="text-xs text-[var(--text-muted)]">{stripEmojis(team.assignedZone)}</div>
          </div>

          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Líder Responsable</span>
            <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 flex items-center gap-1.5">
              <User size={13} className="text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">@{team.leaderUsername}</span>
            </div>
            <div className="text-xs font-mono text-[var(--text-muted)]">ID: {team.leaderId}</div>
          </div>
        </div>

        {/* Dotación de personal del equipo */}
        <div className="space-y-2 mt-4">
          <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
            <Users size={14} className="text-emerald-500" />
            <span>Personal de Dotación ({team.members?.length || 0} efectivos)</span>
          </span>

          <div className="divide-y divide-[var(--border-subtle)] liquid-input-chamber rounded-[18px] overflow-hidden">
            {team.members?.map((member, mIdx) => (
              <div key={mIdx} className="p-3 flex items-center justify-between text-xs hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#0EA5E9]/12 border border-[#0EA5E9]/25 flex items-center justify-center font-semibold text-[11px] text-[#0EA5E9]">
                    {mIdx + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{stripEmojis(member.name)}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{stripEmojis(member.roleInTeam)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-[var(--text-secondary)]">CC: {member.identification}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/12 text-amber-700 dark:text-amber-300 font-medium border border-amber-500/25">
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

