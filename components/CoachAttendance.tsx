
import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Save, Users, CheckCircle2, ChevronDown, Search, Filter } from 'lucide-react';
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
    // Simplified logic primarily for Present/Absent, keeping legacy support for display
    switch (status) {
      case AttendanceStatus.PRESENT: 
      case AttendanceStatus.LATE: // Treating legacy Late as Present visually in list
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700', label: 'PRESENT' };
      case AttendanceStatus.ABSENT: 
      case AttendanceStatus.EXCUSED: // Treating legacy Excused as Absent visually
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700', label: 'ABSENT' };
      default: return { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100', label: 'UNKNOWN' };
    }
  };

  const filteredPlayers = players.filter(p => {
      if (filter === 'ALL') return true;
      return attendance[p.id] === filter;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Breadcrumb / Title */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Orbitron' }}>
            SESSION <span className="text-brand-500">ATTENDANCE</span>
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium mt-1">
            <span>Dashboard</span>
            <span className="text-gray-300">/</span>
            <span>Attendance Manager</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto bg-gray-50 p-1.5 rounded-xl border border-gray-200">
           <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-gray-600 transition-all shadow-sm">
               <ChevronDown className="rotate-90 w-5 h-5" />
           </button>
           <div className="relative">
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 w-32 text-center cursor-pointer"
                />
           </div>
           <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-gray-600 transition-all shadow-sm">
               <ChevronDown className="-rotate-90 w-5 h-5" />
           </button>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
            <button 
                onClick={saveAttendance}
                className={`flex-1 md:flex-none flex items-center justify-center px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 ${saved ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-brand-900 text-white hover:bg-black shadow-brand-900/20'}`}
            >
                {saved ? <CheckCircle className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {saved ? 'Saved' : 'Save Roll'}
            </button>
        </div>
      </div>

      {/* Session Forecast Cards */}
      {scheduledEvent ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-green-200 transition-all">
                  <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Confirmed</p>
                      <h3 className="text-4xl font-black text-gray-900">{rsvps.attending.length}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={24} />
                  </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-red-200 transition-all">
                  <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Declined</p>
                      <h3 className="text-4xl font-black text-gray-900">{rsvps.declined.length}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <XCircle size={24} />
                  </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-yellow-200 transition-all">
                  <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">No Response</p>
                      <h3 className="text-4xl font-black text-gray-900">{rsvps.pending.length}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertCircle size={24} />
                  </div>
              </div>
          </div>
      ) : (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3 text-blue-700 text-sm">
              <AlertCircle size={18} />
              <span className="font-medium">No event scheduled for this date. Attendance is being recorded for an ad-hoc session.</span>
          </div>
      )}

      {/* Roster & Filter */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <Users size={20} className="text-brand-500" />
                  Player Roster
              </h3>
              <div className="flex gap-2">
                  {['ALL', 'PRESENT', 'ABSENT'].map(f => (
                      <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${filter === f ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                      >
                          {f}
                      </button>
                  ))}
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlayers.map(player => {
                const styles = getStatusStyles(attendance[player.id]);
                const isRsvpYes = scheduledEvent?.rsvps?.[player.id] === 'attending';
                
                return (
                    <div 
                        key={player.id}
                        onClick={() => toggleStatus(player.id)}
                        className={`
                            relative bg-white rounded-xl border-2 transition-all cursor-pointer group hover:shadow-md
                            ${styles.border}
                        `}
                    >
                        {/* Status Strip */}
                        <div className={`h-1.5 w-full rounded-t-lg ${styles.bg.replace('bg-', 'bg-').replace('50', '400')}`} />
                        
                        <div className="p-4 flex items-center gap-4">
                            <div className="relative">
                                <img src={player.photoUrl} className="w-12 h-12 rounded-full object-cover bg-gray-100 border border-gray-100" />
                                {isRsvpYes && (
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-0.5 rounded-full border-2 border-white" title="RSVP Confirmed">
                                        <CheckCircle size={10} />
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 text-sm truncate">{player.fullName}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{player.position}</p>
                            </div>

                            <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider min-w-[70px] text-center ${styles.badge}`}>
                                {styles.label}
                            </div>
                        </div>

                        {/* Hover Prompt */}
                        <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                            <span className="bg-white shadow-sm px-3 py-1.5 rounded-full text-xs font-bold text-gray-700 scale-90 group-hover:scale-100 transition-transform">
                                Tap to toggle
                            </span>
                        </div>
                    </div>
                );
            })}
          </div>
          
          {filteredPlayers.length === 0 && (
              <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl">
                  <p className="text-gray-400 text-sm font-medium">No players found with this filter.</p>
              </div>
          )}
      </div>
    </div>
  );
};
