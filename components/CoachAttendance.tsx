import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, AttendanceRecord, User, AttendanceStatus } from '../types';
import { 
    Search, MapPin, Layers, Check, X, Calendar, 
    Save, Filter, Map, Users, ChevronRight, 
    Zap, Activity, Shield, Command, Radio
} from 'lucide-react';

export const CoachAttendance: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus | 'none'>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const user = StorageService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      const allVenues = StorageService.getVenues();
      const isAdmin = user.role === 'admin';
      
      // Safety: Ensure assignedVenues is an array for non-admins
      const assignedVenues = isAdmin ? allVenues : allVenues.filter(v => (user.assignedVenues || []).includes(v.name));
      setVenues(assignedVenues);
      if (assignedVenues.length > 0) setSelectedVenue(assignedVenues[0].name);

      const allBatches = StorageService.getBatches();
      // Safety: Ensure assignedBatches is an array for non-admins
      const assignedBatches = isAdmin ? allBatches : allBatches.filter(b => (user.assignedBatches || []).includes(b.name));
      setBatches(assignedBatches);
      if (assignedBatches.length > 0) setSelectedBatch(assignedBatches[0].name);
    }
  }, []);

  useEffect(() => {
    if (selectedVenue && selectedBatch) {
      const allPlayers = StorageService.getPlayers();
      const filtered = allPlayers.filter(p => p.venue === selectedVenue && p.batch === selectedBatch);
      setPlayers(filtered);
      
      const records = StorageService.getAttendance();
      const dayRecords = records.filter(r => r.date === selectedDate && r.venue === selectedVenue && r.batch === selectedBatch);
      
      const initialAttendance: Record<string, AttendanceStatus | 'none'> = {};
      filtered.forEach(p => {
        const record = dayRecords.find(r => r.playerId === p.id);
        // Safety: Handle both legacy lowercase and standard uppercase statuses
        let status: AttendanceStatus | 'none' = 'none';
        if (record) {
            const s = String(record.status).toUpperCase();
            if (s === 'PRESENT') status = AttendanceStatus.PRESENT;
            else if (s === 'ABSENT') status = AttendanceStatus.ABSENT;
        }
        initialAttendance[p.id] = status;
      });
      setAttendance(initialAttendance);
    }
  }, [selectedDate, selectedVenue, selectedBatch]);

  const toggleAttendance = (playerId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: prev[playerId] === status ? 'none' : status
    }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const recordsToSave: AttendanceRecord[] = players
        .filter(p => attendance[p.id] !== 'none')
        .map(p => ({
          id: `${p.id}-${selectedDate}`,
          playerId: p.id,
          playerName: p.fullName,
          date: selectedDate,
          status: attendance[p.id] as AttendanceStatus,
          venue: selectedVenue,
          batch: selectedBatch,
          markedBy: currentUser?.username || 'unknown',
          timestamp: Date.now()
        }));
      
      await StorageService.saveAttendanceBatch(recordsToSave);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPlayers = players.filter(p => 
    (p.memberId?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: players.length,
    present: Object.values(attendance).filter(s => s === AttendanceStatus.PRESENT).length,
    absent: Object.values(attendance).filter(s => s === AttendanceStatus.ABSENT).length,
    pending: players.length - Object.values(attendance).filter(s => s !== 'none').length
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-700 font-display">
      {/* Attendance Header */}
      <div className="bg-brand-500 p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Command size={140} className="text-white" /></div>
          
          <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-brand-950/10 w-fit rounded-full border border-black/5">
                  <Radio size={12} className="text-brand-950 animate-pulse" />
                  <p className="text-[9px] font-black text-brand-950 uppercase tracking-[0.4em]">Daily Attendance</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none mb-1">
                 Attendance <span className="text-brand-950 font-black">Sheet</span>
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-brand-900/60 font-black uppercase text-[10px] tracking-widest italic">
                  <span className="flex items-center gap-2 bg-brand-950/10 px-3 py-1 rounded-lg border border-black/5"><Calendar size={12}/> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  <span className="flex items-center gap-2 opacity-50"><Activity size={12}/> Status: Training in Progress</span>
              </div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-4 relative z-10 w-full md:w-auto">
              <div className="bg-white/40 p-4 rounded-3xl border border-white/20 backdrop-blur-xl flex-1 md:w-32 lg:w-40 text-center group hover:bg-white/60 transition-all shadow-lg shadow-black/5">
                  <p className="text-[9px] font-black text-brand-950/40 uppercase tracking-widest mb-1 group-hover:text-brand-950/60">PRESENT</p>
                  <p className="text-2xl font-black text-brand-950 italic leading-none">{stats.present}<span className="text-brand-950/20 text-xs ml-1">/{stats.total}</span></p>
              </div>
              <div className="bg-white/40 p-4 rounded-3xl border border-white/20 backdrop-blur-xl flex-1 md:w-32 lg:w-40 text-center group hover:bg-white/60 transition-all shadow-lg shadow-black/5">
                  <p className="text-[9px] font-black text-brand-950/40 uppercase tracking-widest mb-1 group-hover:text-red-500/60">ABSENT</p>
                  <p className="text-2xl font-black text-red-600 italic leading-none">{stats.absent}</p>
              </div>
          </div>
      </div>

      {/* Filters (Mobile Optimized) */}
      <div className="glass-card p-6 md:p-8 rounded-[2.5rem] flex flex-col xl:flex-row gap-6 relative z-10 border-white/5">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1 relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60 group-hover:text-white transition-colors z-10">
                      <MapPin size={18} />
                  </div>
                  <select 
                      value={selectedVenue}
                      onChange={(e) => setSelectedVenue(e.target.value)}
                      className="w-full pl-14 pr-10 py-5 bg-brand-500 border border-brand-500/20 rounded-2xl outline-none text-white font-black italic text-[10px] uppercase tracking-[0.2em] appearance-none cursor-pointer shadow-lg shadow-brand-500/10 hover:bg-brand-600 transition-all"
                  >
                      {venues.map(v => <option key={v.id} value={v.name} className="bg-brand-900 text-white">{v.name}</option>)}
                  </select>
              </div>

              <div className="flex-1 relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-950/40 group-hover:text-brand-950 transition-colors z-10">
                      <Layers size={18} />
                  </div>
                    <select 
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-full pl-14 pr-10 py-5 bg-brand-primary border border-brand-primary/20 rounded-2xl outline-none text-brand-950 font-black italic text-[10px] uppercase tracking-[0.2em] appearance-none cursor-pointer shadow-lg shadow-brand-primary/10 hover:bg-brand-primary/90 transition-all"
                    >
                      {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
              </div>
              
              <div className="relative group flex-[1.5]">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search players..." 
                    className="w-full pl-14 pr-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-brand-500 transition-all text-[10px] font-black text-slate-900 placeholder:text-slate-300 italic uppercase tracking-widest shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>
          
          <button 
              onClick={handleSave}
              disabled={isSaving || stats.pending === stats.total}
              className={`px-12 py-5 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl relative overflow-hidden group ${
                saveStatus === 'success' ? 'bg-emerald-500 text-white' : 
                saveStatus === 'error' ? 'bg-red-500 text-white' : 
                'bg-brand-500 text-white disabled:opacity-30 disabled:grayscale'
              }`}
          >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              {isSaving ? (
                <Zap className="animate-spin" size={18} />
              ) : saveStatus === 'success' ? (
                <Check size={18} />
              ) : (
                <Save size={18} />
              )}
              <span className="text-[10px] font-black uppercase tracking-[0.3em] italic relative z-10">
                {isSaving ? 'SAVING...' : saveStatus === 'success' ? 'SUCCESS' : 'SAVE ATTENDANCE'}
              </span>
          </button>
      </div>

      {/* Player List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-slide-up">
          {filteredPlayers.map(p => (
              <div key={p.id} className={`glass-card p-5 transition-all duration-500 relative group border-slate-100 hover:shadow-xl ${attendance[p.id] === AttendanceStatus.PRESENT ? 'ring-2 ring-brand-500/20 bg-brand-50/30' : attendance[p.id] === AttendanceStatus.ABSENT ? 'ring-2 ring-red-500/20 bg-red-50/30' : 'hover:bg-slate-50/50'}`}>
                  <div className="flex items-center gap-4 mb-5">
                      <div className="relative">
                          <img src={p.photoUrl} className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 group-hover:border-brand-500 transition-all shadow-md" />
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border-2 border-white shadow-xl transition-all scale-0 group-hover:scale-100 ${attendance[p.id] === AttendanceStatus.PRESENT ? 'bg-brand-500 text-white' : attendance[p.id] === AttendanceStatus.ABSENT ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                              <Shield size={10} />
                          </div>
                      </div>
                      <div className="min-w-0">
                          <h4 className="font-black text-slate-900 italic text-sm uppercase truncate leading-tight mb-1">{p.fullName || 'Unknown Player'}</h4>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.memberId || 'N/A'}</p>
                      </div>
                  </div>

                  {/* Present/Absent Toggle */}
                  <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200 overflow-hidden transition-all">
                      <button 
                          onClick={() => toggleAttendance(p.id, AttendanceStatus.PRESENT)}
                          className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-lg transition-all ${attendance[p.id] === AttendanceStatus.PRESENT ? 'bg-brand-500 text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          <Check size={12} className={attendance[p.id] === AttendanceStatus.PRESENT ? 'animate-bounce' : ''} />
                          <span className="text-[8px] font-black uppercase tracking-widest italic">PRESENT</span>
                      </button>
                      <button 
                          onClick={() => toggleAttendance(p.id, AttendanceStatus.ABSENT)}
                          className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-lg transition-all ${attendance[p.id] === AttendanceStatus.ABSENT ? 'bg-red-500 text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          <X size={12} className={attendance[p.id] === AttendanceStatus.ABSENT ? 'animate-pulse' : ''} />
                          <span className="text-[8px] font-black uppercase tracking-widest italic">ABSENT</span>
                      </button>
                  </div>

                  {/* Player Stats Line */}
                  <div className="mt-4 flex items-center justify-between px-1">
                      <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                              <div key={i} className={`w-3 h-1 rounded-full ${attendance[p.id] === AttendanceStatus.PRESENT ? 'bg-brand-500/40 animate-pulse' : 'bg-slate-200'}`} style={{ animationDelay: `${i*100}ms` }} />
                          ))}
                      </div>
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] italic">VENUE: {(p.venue || 'N/A').split(' ')[0]}</p>
                  </div>
              </div>
          ))}
      </div>

      {filteredPlayers.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center space-y-6 glass-card rounded-[3rem] border-dashed border-slate-200 animate-pulse">
              <Users size={64} className="text-slate-100" />
              <p className="text-xs font-black text-slate-300 uppercase tracking-[0.5em] italic">No Players Found in Selection</p>
          </div>
      )}
    </div>
  );
};
