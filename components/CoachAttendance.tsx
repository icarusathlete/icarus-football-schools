import React, { useState, useEffect } from 'react';
import { Users, Search, Download, CheckCircle, Calendar as CalendarIcon, Save, Zap, Filter, CheckCircle2, FileText, Edit3, ShieldCheck, ChevronDown, CheckCircle as CheckCircleIcon } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Player, AttendanceRecord, AttendanceStatus, ScheduleEvent } from '../types';

export const CoachAttendance: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, PRESENT, ABSENT
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
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
    setIsSubmitted(StorageService.isRollcallFinalized(date));

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
    let nextStatus = AttendanceStatus.PRESENT;
    setAttendance(prev => {
      const current = prev[playerId];
      nextStatus = current === AttendanceStatus.ABSENT ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
      
      // Auto-Sync Implementation
      const records: AttendanceRecord[] = players.map(p => ({
          id: Math.random().toString(36).substr(2, 9),
          playerId: p.id,
          date: date,
          status: p.id === playerId ? nextStatus : prev[p.id]
      }));
      StorageService.saveAttendanceBatch(records);
      
      return { ...prev, [playerId]: nextStatus };
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFinalize = async () => {
    await StorageService.finalizeRollcall(date);
    setIsSubmitted(true);
  };

  const handleEdit = async () => {
    await StorageService.unfinalizeRollcall(date);
    setIsSubmitted(false);
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
              <CalendarIcon size={32} className="text-brand-500 opacity-30" />
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
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><CheckCircleIcon size={80} className="text-red-950" /></div>
                  <div className="relative">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-3 italic">DECLINED RSVP</p>
                      <h3 className="text-5xl font-black text-brand-950 italic">{rsvps.declined.length}</h3>
                  </div>
                  <div className="w-18 h-18 rounded-[1.5rem] bg-red-500/10 text-red-600 border border-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircleIcon size={36} />
                  </div>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border border-brand-100 flex items-center justify-between group hover:border-brand-950 transition-all shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><CheckCircleIcon size={80} className="text-brand-950" /></div>
                  <div className="relative">
                      <p className="text-[10px] font-black text-brand-950 uppercase tracking-[0.3em] mb-3 italic">AWAITING SIGNAL</p>
                      <h3 className="text-5xl font-black text-brand-950 italic">{rsvps.pending.length}</h3>
                  </div>
                  <div className="w-18 h-18 rounded-[1.5rem] bg-brand-50 text-brand-950 border border-brand-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircleIcon size={36} />
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
            {/* Submitted / Summary State */}
            {isSubmitted ? (
                <div className="lg:col-span-12">
                    <div className="bg-white rounded-[4rem] border border-brand-100 shadow-3xl overflow-hidden p-12 md:p-20 relative animate-in zoom-in-95 duration-700">
                        <div className="absolute top-0 right-0 p-12 opacity-5"><ShieldCheck size={240} className="text-brand-950" /></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row gap-12 md:items-center justify-between">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-brand-500 rounded-[2rem] text-brand-950 shadow-2xl">
                                        <FileText size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-brand-950 italic uppercase tracking-tighter leading-none">Session Rollcall Secured</h3>
                                        <p className="text-brand-500 font-black uppercase text-xs tracking-widest mt-2 italic flex items-center gap-2">
                                            <CheckCircle2 size={14} /> Finalized & Uploaded to Command Hub
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-10">
                                    <div className="p-8 bg-brand-50 rounded-[2.5rem] border border-brand-100 shadow-sm group">
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic mb-2">Total Strength</p>
                                        <p className="text-5xl font-black text-brand-950 italic tracking-tighter">{players.length}</p>
                                    </div>
                                    <div className="p-8 bg-brand-500/10 rounded-[2.5rem] border border-brand-500/20 shadow-sm group">
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic mb-2">Authenticated Present</p>
                                        <p className="text-5xl font-black text-brand-950 italic tracking-tighter">
                                            {Object.values(attendance).filter(s => s === AttendanceStatus.PRESENT).length}
                                        </p>
                                    </div>
                                    <div className="p-8 bg-red-50 rounded-[2.5rem] border border-red-100 shadow-sm group">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest italic mb-2">Absence Log</p>
                                        <p className="text-5xl font-black text-red-950 italic tracking-tighter">
                                            {Object.values(attendance).filter(s => s === AttendanceStatus.ABSENT).length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <button 
                                    onClick={handleEdit}
                                    className="px-10 py-5 bg-brand-950 text-brand-500 rounded-3xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl flex items-center gap-3 italic border border-white/10"
                                >
                                    <Edit3 size={18} /> Modify Session Records
                                </button>
                                <button className="px-10 py-5 bg-brand-50 text-brand-950 rounded-3xl font-black text-xs uppercase tracking-widest opacity-40 cursor-not-allowed italic flex items-center gap-3 border border-brand-100">
                                    <Download size={18} /> Export Session Case File
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                {filteredPlayers.map(player => {
                    const styles = getStatusStyles(attendance[player.id]);
                    const isRsvpYes = scheduledEvent?.rsvps?.[player.id] === 'attending';
                    const isPresent = attendance[player.id] === AttendanceStatus.PRESENT;
                    
                    return (
                        <div 
                            key={player.id}
                            onClick={() => toggleStatus(player.id)}
                            className={`relative bg-white rounded-[2.5rem] border transition-all cursor-pointer group hover:shadow-2xl overflow-hidden p-8 ${isPresent ? 'border-brand-500 shadow-xl' : 'border-brand-100 hover:border-red-500/30'}`}
                        >
                            <div className="flex flex-col items-center text-center gap-6">
                                <div className="relative">
                                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center overflow-hidden border-2 transition-all shadow-xl ${isPresent ? 'bg-brand-950 border-brand-500' : 'bg-gray-100 border-gray-200 group-hover:border-red-500/20'}`}>
                                        <img src={player.photoUrl} className={`w-full h-full object-cover ${isPresent ? '' : 'grayscale opacity-50 transition-all'}`} />
                                    </div>
                                    {isRsvpYes && (
                                        <div className="absolute -bottom-2 -right-2 bg-brand-500 text-brand-950 p-2 rounded-xl border-2 border-white shadow-xl" title="RSVP Confirmed">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="space-y-1">
                                    <h4 className={`font-black text-lg uppercase italic tracking-tighter leading-none transition-colors ${isPresent ? 'text-brand-950' : 'text-gray-400 group-hover:text-red-950'}`}>{player.fullName}</h4>
                                    <p className="text-[10px] text-brand-500 font-black uppercase tracking-widest italic">{player.position}</p>
                                </div>
    
                                <div className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all italic border text-center shadow-sm ${styles.badge}`}>
                                    {styles.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
                </>
            )}
          </div>
          
          {filteredPlayers.length === 0 && (
              <div className="text-center py-24 bg-brand-900/50 border-2 border-dashed border-white/5 rounded-[3rem]">
                  <p className="text-brand-600 text-sm font-black uppercase tracking-widest italic">No matching personnel signals detected.</p>
              </div>
          )}
      </div>

      {/* Submit Button Block */}
      {!isSubmitted && (
          <div className="fixed bottom-10 right-10 z-50 animate-in slide-in-from-bottom-2 duration-700">
              <button 
                    onClick={handleFinalize}
                    className="flex items-center gap-4 px-14 py-7 bg-brand-950 text-brand-500 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all shadow-3xl hover:scale-105 active:scale-95 italic border border-white/10"
                >
                    <Save className="w-6 h-6" /> SUBMIT SQUAD ROLLCALL
                </button>
          </div>
      )}

      {/* Auto-Sync Indicator */}
      {saved && (
          <div className="fixed bottom-10 right-10 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
              <div className="bg-brand-950 text-brand-500 px-10 py-5 rounded-[2rem] border border-white/10 shadow-3xl font-black text-xs uppercase tracking-widest italic flex items-center gap-4">
                  <CheckCircle className="w-5 h-5" /> AUTO-SYNCED TO CLOUD
              </div>
          </div>
      )}
    </div>
  );
};
