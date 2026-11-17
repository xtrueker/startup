import React, { useEffect, useState } from 'react';
import { Clock, FileText } from 'lucide-react';

export interface AlertEvent {
  id: string;
  event_type: string;
  previous_status: string;
  new_status: string;
  notes: string;
  created_at: string;
}

export const AlertTimeline: React.FC<{ alertId: string }> = ({ alertId }) => {
  const [events, setEvents] = useState<AlertEvent[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { default: api } = await import('../../services/api');
        const res = await api.get(`/alerts/${alertId}/events`);
        if (res.data.success && res.data.data.length > 0) {
          setEvents(res.data.data);
        } else {
          // Fallback if no events yet
          setEvents([
            { id: 'initial', event_type: 'creada', previous_status: '', new_status: 'pending', notes: 'Alerta reportada por ciudadano', created_at: new Date().toISOString() },
          ]);
        }
      } catch (err) {
        console.error('Error fetching timeline events', err);
      }
    };
    fetchEvents();
  }, [alertId]);

  return (
    <div className="flex flex-col gap-3 mt-2 border-t border-[var(--border-subtle)] pt-4">
      <h3 className="text-xs font-bold text-[var(--text-primary)] tracking-tight">Línea de tiempo</h3>
      <div className="relative border-l border-[var(--border-strong)] ml-2.5 pl-4 flex flex-col gap-3">
        {events.map((ev) => (
          <div key={ev.id} className="relative">
             <div className="absolute -left-[22px] bg-[var(--bg-elevated)] rounded-full p-1 border border-[var(--border-strong)] shadow-xs">
               {ev.event_type === 'creada' ? <Clock size={10} className="text-[#0EA5E9]" /> : <FileText size={10} className="text-[var(--text-muted)]" />}
             </div>
             <div className="text-xs text-[var(--text-secondary)] p-3 bg-[var(--bg-input)] rounded-[16px] border border-[var(--border-strong)]">
               <span className="font-bold text-[var(--text-primary)]">{ev.new_status ? ev.new_status.toUpperCase() : ev.event_type.toUpperCase()}</span> 
               <span className="text-[var(--text-muted)]"> · hace unos minutos: </span>
               <span className="italic text-[var(--text-secondary)]">'{ev.notes}'</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
