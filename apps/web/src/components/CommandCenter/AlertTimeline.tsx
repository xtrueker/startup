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
    <div className="flex flex-col gap-3 mt-4 border-t border-zinc-800 pt-4">
      <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Línea de Tiempo</h3>
      <div className="relative border-l border-zinc-800 ml-2 pl-4 flex flex-col gap-4">
        {events.map((ev) => (
          <div key={ev.id} className="relative mb-2">
             <div className="absolute -left-[21px] bg-black rounded-full p-1 border border-zinc-700 shadow-md">
               {ev.event_type === 'creada' ? <Clock size={10} className="text-white" /> : <FileText size={10} className="text-zinc-400" />}
             </div>
             <div className="text-xs text-zinc-300 p-2 bg-zinc-950 rounded border border-zinc-800 shadow-inner">
               <span className="font-bold text-white">{ev.new_status ? ev.new_status.toUpperCase() : ev.event_type.toUpperCase()}</span> 
               <span className="text-zinc-500"> - hace unos minutos: </span>
               <span className="italic text-zinc-300">'{ev.notes}'</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
