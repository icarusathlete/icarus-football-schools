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
        return { bg: 'bg-brand-500/10', border: 'border-brand-500/20', text: 'text-brand-600', badge: 'bg-brand-500 text-brand-950 border-brand-500/20', label: 'PRESENT' };
      case AttendanceStatus.ABSENT: 
      case AttendanceStatus.EXCUSED:
        return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-600', badge: 'bg-red-600 text-white border-red-600/20', label: 'ABSENT' };
      default: return { bg: 'bg-brand-50', border: 'border-brand-100', text: 'text-brand-400', badge: 'bg-brand-950 text-brand-500 border-white/5', label: 'UNKNOWN' };
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
          <h1 className="text-4xl font-black text-brand-950 italic uppercase tracking-tighter flex items-center gap-4">
              DEPLOYMENT <span className="text-brand-500">LOG</span>
              <Calendar size={32} className="text-brand-500 opacity-30" />
          </h1>
          <p className="text-brand-500 font-black uppercase text-[10px] tracking-[0.3em] mt-3 italic">Autonomous Session Verification & RSVP Intelligence</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-brand-100 shadow-xl overflow-hidden group">
             <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]); }} className="w-12 h-12 flex items-center justify-center bg-brand-50 text-brand-950 hover:bg-brand-950 hover:text-brand-500 rounded-2xl transition-all shadow-sm active:scale-95 group/btn">
                 <ChevronDown className="rotate-90 w-5 h-5 group-hover/btn:scale-110 transition-transform" />
             </button>
             <div className="px-6 text-center">
                  <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1 italic">ARCHIVE DATE</p>
                  <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm font-black text-brand-950 w-32 cursor-pointer text-center font-mono italic"
                  />
             </div>
             <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }} className="w-12 h-12 flex items-center justify-center bg-brand-50 text-brand-950 hover:bg-brand-950 hover:text-brand-500 rounded-2xl transition-all shadow-sm active:scale-95 group/btn">
                 <ChevronDown className="-rotate-90 w-5 h-5 group-hover/btn:scale-110 transition-transform" />
             </button>
        </div>
      </div>

      {/* Stats Cluster */}
      {scheduledEvent ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-10 rounded-[3rem] border border-brand-100 flex items-center justify-between group hover:border-brand-500 transition-all shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><CheckCircle2 size={80} className="text-brand-950" /></div>
                  <div className="relative">
                      <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] mb-3 italic">CONFIRMED DEPLOY</p>
                      <h3 className="text-5xl font-black text-brand-950 italic">{rsvps.attending.length}</h3>
                  </div>
                  <div className="w-18 h-18 rounded-[1.5rem] bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={36} />
                  </div>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border border-brand-100 flex items-center justify-between group hover:border-red-500 transition-all shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><XCircle size={80} className="text-red-950" /></div>
                  <div className="relative">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-3 italic">DECLINED RSVP</p>
                      <h3 className="text-5xl font-black text-brand-950 italic">{rsvps.declined.length}</h3>
                  </div>
                  <div className="w-18 h-18 rounded-[1.5rem] bg-red-500/10 text-red-600 border border-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <XCircle size={36} />
                  </div>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border border-brand-100 flex items-center justify-between group hover:border-brand-950 transition-all shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><AlertCircle size={80} className="text-brand-950" /></div>
                  <div className="relative">
                      <p className="text-[10px] font-black text-brand-950 uppercase tracking-[0.3em] mb-3 italic">AWAITING SIGNAL</p>
                      <h3 className="text-5xl font-black text-brand-950 italic">{rsvps.pending.length}</h3>
                  </div>
                  <div className="w-18 h-18 rounded-[1.5rem] bg-brand-50 text-brand-950 border border-brand-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertCircle size={36} />
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
              <h3 className="font-black text-brand-950 text-2xl uppercase italic tracking-tighter flex items-center gap-4 leading-none">
                  <Users size={28} className="text-brand-500" />
                  SQUAD <span className="text-brand-500">ROSTER</span>
              </h3>
              <div className="flex bg-brand-50 p-1.5 rounded-[1.5rem] border border-brand-100">
                  {['ALL', 'PRESENT', 'ABSENT'].map(f => (
                      <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-[11px] font-black px-8 py-3 rounded-xl uppercase tracking-[0.2em] transition-all italic leading-none ${filter === f ? 'bg-brand-950 text-brand-500 shadow-xl' : 'text-brand-400 hover:text-brand-950'}`}
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
                        className="relative bg-white rounded-[2.5rem] border border-brand-100 transition-all cursor-pointer group hover:border-brand-500 hover:shadow-2xl overflow-hidden p-8"
                    >
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-3xl bg-brand-950 flex items-center justify-center overflow-hidden border-2 border-brand-500/20 group-hover:border-brand-500 transition-all shadow-xl">
                                    <img src={player.photoUrl} className="w-full h-full object-cover" />
                                </div>
                                {isRsvpYes && (
                                    <div className="absolute -bottom-2 -right-2 bg-brand-500 text-brand-950 p-2 rounded-xl border-2 border-white shadow-xl" title="RSVP Confirmed">
                                        <CheckCircle2 size={16} />
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-1">
                                <h4 className="font-black text-brand-950 text-lg uppercase italic tracking-tighter leading-none">{player.fullName}</h4>
                                <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest italic">{player.position}</p>
                            </div>
 
                            <div className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all italic border text-center shadow-sm ${styles.badge}`}>
                                {styles.label}
                            </div>
                        </div>
 
                        {/* Interactive Overlay */}
                        <div className="absolute inset-0 bg-brand-950/95 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-8 text-center">
                            <Zap size={32} className="text-brand-500 mb-4 animate-bounce" />
                            <span className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic leading-tight">
                                INVOKE STATUS<br/>TRANSFORMATION
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
                className={`flex items-center gap-4 px-12 py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all shadow-3xl active:scale-95 group italic font-display border-2 ${saved ? 'bg-brand-950 text-brand-500 border-white/10' : 'bg-brand-500 text-brand-950 border-brand-500/20 hover:bg-brand-950 hover:text-brand-500 hover:border-white/10'}`}
            >
                {saved ? <CheckCircle className="w-6 h-6" /> : <Save className="w-6 h-6" />}
                {saved ? 'DATA SECURED' : 'SYNC SQUAD LOG'}
            </button>
      </div>
    </div>
  );
};
