import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Save, Users, CheckCircle2, ChevronDown, Search, Filter, Zap } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Player, AttendanceRecord, AttendanceStatus, ScheduleEvent } from '../types';

export const CoachAttendance: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, PRESENT, ABSENT
  
  // RSVP State
  const [scheduledEvent, setScheduledEvent] = useState<ScheduleEvent | undefined>(undefined);
  const [rsvps, setRsvps] = useState<{attending: Player[], declined: Player[], pending: Player[]}>({ attending: [], declined: [], pending: [] });

  const loadData = () => {
    // Load players
    const allPlayers = StorageService.getPlayers();
    setPlayers(allPlayers);

    // Load existing attendance for this date
    const existingRecords = StorageService.getDailyAttendance(date);
    const initialStatus: Record<string, AttendanceStatus> = {};
    
    // Default to PRESENT for all if no record exists, otherwise load record
    allPlayers.forEach(p => {
        const record = existingRecords.find(r => r.playerId === p.id);
        initialStatus[p.id] = record ? record.status : AttendanceStatus.PRESENT;
    });
    
    setAttendance(initialStatus);

    // Load Schedule Event for this date to check RSVPs
    const schedule = StorageService.getSchedule();
    const event = schedule.find(e => e.date === date);
    setScheduledEvent(event);

    if (event) {
        const attending: Player[] = [];
        const declined: Player[] = [];
        const pending: Player[] = [];

        allPlayers.forEach(p => {
            const status = event.rsvps?.[p.id];
            if (status === 'attending') attending.push(p);
            else if (status === 'declined') declined.push(p);
            else pending.push(p);
        });

        setRsvps({ attending, declined, pending });
    } else {
        setRsvps({ attending: [], declined: [], pending: [] });
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, [date]);

  const toggleStatus = (playerId: string) => {
    setAttendance(prev => {
      const current = prev[playerId];
      // Binary toggle: If not Absent, make Absent. If Absent, make Present.
      const nextStatus = current === AttendanceStatus.ABSENT ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
      return { ...prev, [playerId]: nextStatus };
    });
    setSaved(false);
  };

  const saveAttendance = () => {
    const records: AttendanceRecord[] = players.map(p => ({
        id: Math.random().toString(36).substr(2, 9),
        playerId: p.id,
        date: date,
        status: attendance[p.id]
    }));
    
    StorageService.saveAttendanceBatch(records);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getStatusStyles = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT: 
      case AttendanceStatus.LATE:
        return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'PRESENT' };
      case AttendanceStatus.ABSENT: 
      case AttendanceStatus.EXCUSED:
        return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', badge: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'ABSENT' };
      default: return { bg: 'bg-brand-900', border: 'border-white/5', text: 'text-brand-400', badge: 'bg-brand-800 text-brand-400 border-white/5', label: 'UNKNOWN' };
    }
  };

  const filteredPlayers = players.filter(p => {
      if (filter === 'ALL') return true;
      return attendance[p.id] === filter;
  });

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              SESSION <span className="text-brand-500">ATTENDANCE</span>
              <Calendar size={32} className="text-brand-500 opacity-50" />
          </h1>
          <p className="text-brand-400 font-medium mt-1 tracking-tight">Active duty deployment logging and RSVP verification.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-brand-800 p-2 rounded-2xl border border-white/10 shadow-xl">
             <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]); }} className="p-3 bg-brand-950 hover:bg-brand-500 hover:text-brand-950 rounded-xl text-brand-500 transition-all shadow-lg active:scale-95">
                 <ChevronDown className="rotate-90 w-5 h-5" />
             </button>
             <div className="px-6 text-center">
                  <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1 italic">Tactical Date</p>
                  <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm font-black text-white w-32 cursor-pointer text-center"
                  />
             </div>
             <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }} className="p-3 bg-brand-950 hover:bg-brand-500 hover:text-brand-950 rounded-xl text-brand-500 transition-all shadow-lg active:scale-95">
                 <ChevronDown className="-rotate-90 w-5 h-5" />
             </button>
        </div>
      </div>

      {/* Stats Cluster */}
      {scheduledEvent ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-brand-800 p-10 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><CheckCircle2 size={80} /></div>
                  <div className="relative">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-3 italic">Confirmed RSVP</p>
                      <h3 className="text-5xl font-black text-white italic">{rsvps.attending.length}</h3>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={32} />
                  </div>
              </div>
              <div className="bg-brand-800 p-10 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-red-500/30 transition-all shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><XCircle size={80} /></div>
                  <div className="relative">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-3 italic">Declined RSVP</p>
                      <h3 className="text-5xl font-black text-white italic">{rsvps.declined.length}</h3>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <XCircle size={32} />
                  </div>
              </div>
              <div className="bg-brand-800 p-10 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-brand-500/30 transition-all shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><AlertCircle size={80} /></div>
                  <div className="relative">
                      <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] mb-3 italic">Awaiting Response</p>
                      <h3 className="text-5xl font-black text-white italic">{rsvps.pending.length}</h3>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertCircle size={32} />
                  </div>
              </div>
          </div>
      ) : (
          <div className="bg-brand-950 p-6 rounded-[2rem] border border-brand-500/10 flex items-center gap-4 text-brand-400 text-sm shadow-xl italic font-medium">
              <div className="p-3 bg-brand-500/10 rounded-xl text-brand-500"><Zap size={20} /></div>
              <span>No scheduled engagement detected. Attendance logging configured for ad-hoc session protocol.</span>
          </div>
      )}

      {/* Roster Area */}
      <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
              <h3 className="font-black text-white text-xl uppercase italic tracking-tighter flex items-center gap-3">
                  <Users size={24} className="text-brand-500" />
                  SQUAD ROSTER <span className="text-brand-500/20">({filteredPlayers.length})</span>
              </h3>
              <div className="flex bg-brand-800 p-1.5 rounded-2xl border border-white/5">
                  {['ALL', 'PRESENT', 'ABSENT'].map(f => (
                      <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-[10px] font-black px-6 py-2.5 rounded-xl uppercase tracking-widest transition-all italic ${filter === f ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' : 'text-brand-500 hover:text-white'}`}
                      >
                          {f}
                      </button>
                  ))}
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlayers.map(player => {
                const styles = getStatusStyles(attendance[player.id]);
                const isRsvpYes = scheduledEvent?.rsvps?.[player.id] === 'attending';
                
                return (
                    <div 
                        key={player.id}
                        onClick={() => toggleStatus(player.id)}
                        className="relative bg-brand-800 rounded-[2rem] border border-white/5 transition-all cursor-pointer group hover:border-white/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        <div className="p-6 flex items-center gap-5">
                            <div className="relative">
                                <img src={player.photoUrl} className="w-16 h-16 rounded-full object-cover bg-brand-950 border-2 border-white/10 group-hover:border-brand-500/50 transition-colors" />
                                {isRsvpYes && (
                                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-brand-950 p-1 rounded-full border-2 border-brand-800 shadow-xl" title="RSVP Confirmed">
                                        <CheckCircle2 size={12} />
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-white text-sm uppercase italic tracking-tight truncate">{player.fullName}</h4>
                                <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest mt-1">{player.position}</p>
                            </div>

                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all italic border ${styles.badge}`}>
                                {styles.label}
                            </div>
                        </div>

                        {/* Interactive Overlay */}
                        <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-6 text-center border border-white/10">
                            <Zap size={24} className="text-brand-500 mb-3 animate-pulse" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">
                                TOGGLE LOG STATUS
                            </span>
                        </div>
                    </div>
                );
            })}
          </div>
          
          {filteredPlayers.length === 0 && (
              <div className="text-center py-24 bg-brand-900/50 border-2 border-dashed border-white/5 rounded-[3rem]">
                  <p className="text-brand-600 text-sm font-black uppercase tracking-widest italic">No matching personnel signals detected.</p>
              </div>
          )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-10 right-10 z-50">
          <button 
                onClick={saveAttendance}
                className={`flex items-center gap-4 px-10 py-5 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95 group italic font-display ${saved ? 'bg-emerald-500 text-brand-950' : 'bg-brand-500 text-brand-950 hover:bg-brand-400 hover:scale-[1.02]'}`}
            >
                {saved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                {saved ? 'DATA STORED' : 'EXECUTE LOG SYNC'}
            </button>
      </div>
    </div>
  );
};
