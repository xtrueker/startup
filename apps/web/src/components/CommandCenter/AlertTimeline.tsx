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
    <div className="flex flex-col gap-3 mt-4 border-t border-slate-700/50 pt-4">
      <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Línea de Tiempo</h3>
      <div className="relative border-l border-slate-700 ml-2 pl-4 flex flex-col gap-4">
        {events.map((ev) => (
          <div key={ev.id} className="relative mb-2">
             <div className="absolute -left-[21px] bg-slate-900 rounded-full p-1 border border-slate-600 shadow-md">
               {ev.event_type === 'creada' ? <Clock size={10} className="text-indigo-400" /> : <FileText size={10} className="text-slate-400" />}
             </div>
             <div className="text-xs text-slate-300 p-2 bg-slate-800/40 rounded border border-slate-700/50 shadow-inner">
               <span className="font-bold text-slate-200">{ev.new_status ? ev.new_status.toUpperCase() : ev.event_type.toUpperCase()}</span> 
               <span className="text-slate-500"> - hace unos minutos: </span>
               <span className="italic text-indigo-300">'{ev.notes}'</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
