import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, AttendanceRecord, User, AttendanceStatus } from '../types';
import { 
    Search, MapPin, Layers, Check, X, Calendar, 
    Save, Filter, Map, Users, ChevronRight, 
    Zap, Activity, Shield, Command, Radio,
    Trophy, Lock, RotateCcw
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
  const [motmId, setMotmId] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isFinalizing, setIsFinalizing] = useState(false);

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

  const loadSessionData = () => {
    if (selectedVenue && selectedBatch) {
      const allPlayers = StorageService.getPlayers();
      const filtered = allPlayers.filter(p => p.venue === selectedVenue && p.batch === selectedBatch);
      setPlayers(filtered);
      
      const records = StorageService.getAttendance();
      const dayRecords = records.filter(r => r.date === selectedDate && r.venue === selectedVenue && r.batch === selectedBatch);
      
      const initialAttendance: Record<string, AttendanceStatus | 'none'> = {};
      filtered.forEach(p => {
        const record = dayRecords.find(r => r.playerId === p.id);
        let status: AttendanceStatus | 'none' = 'none';
        if (record) {
            const s = String(record.status).toUpperCase();
            if (s === 'PRESENT') status = AttendanceStatus.PRESENT;
            else if (s === 'ABSENT') status = AttendanceStatus.ABSENT;
        }
        initialAttendance[p.id] = status;
      });
      setAttendance(initialAttendance);

      // Load MOTM and Finalization status
      const motm = StorageService.getMOTM(selectedDate, selectedVenue, selectedBatch);
      setMotmId(motm?.playerId || null);
      
      const finalized = StorageService.isRollcallFinalized(selectedDate, selectedVenue, selectedBatch);
      setIsFinalized(finalized);
    }
  };

  useEffect(() => {
    loadSessionData();
    window.addEventListener('academy_data_update', loadSessionData);
    return () => window.removeEventListener('academy_data_update', loadSessionData);
  }, [selectedDate, selectedVenue, selectedBatch]);

  const toggleAttendance = (playerId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: prev[playerId] === status ? 'none' : status
    }));
    setSaveStatus('idle');
  };

  const toggleMOTM = async (playerId: string) => {
    if (isFinalized) return;
    const newMotmId = motmId === playerId ? null : playerId;
    setMotmId(newMotmId);
    
    // Auto-save MOTM to storage
    if (newMotmId) {
        await StorageService.setMOTM(newMotmId, selectedDate, selectedVenue, selectedBatch);
    } else {
        // If unselecting, we currently don't have a direct 'removeMOTM' but we can pass null if supported 
        // or just leave it. In this implementation, setMOTM with another player overwrites.
        // For simplicity, we'll just set it to empty in the UI if unselected.
        // If we really want to delete from Firebase, we'd need a deleteDoc call.
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm("Finalize this session? This will lock attendance and MOTM selection.")) return;
    setIsFinalizing(true);
    try {
        await StorageService.finalizeRollcall(selectedDate, selectedVenue, selectedBatch);
        setIsFinalized(true);
    } catch (error) {
        console.error("Finalization failed", error);
    } finally {
        setIsFinalizing(false);
    }
  };

  const handleUnfinalize = async () => {
    if (currentUser?.role !== 'admin') {
        alert("Only administrators can unfinalize sessions.");
        return;
    }
    if (!window.confirm("Admin: Unfinalize this session?")) return;
    try {
        await StorageService.unfinalizeRollcall(selectedDate, selectedVenue, selectedBatch);
        setIsFinalized(false);
    } catch (error) {
        console.error("Unfinalization failed", error);
    }
  };

  const handleSave = async () => {
    if (isFinalized) return;
    setIsSaving(true);
    try {
      const recordsToSave: AttendanceRecord[] = players
        .filter(p => attendance[p.id] !== 'none')
        .map(p => ({
          id: `${p.id}-${selectedDate}-${selectedVenue.replace(/\s+/g, '_')}-${selectedBatch.replace(/\s+/g, '_')}`,
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
        <div className="space-y-8 pb-32">
            {/* ══════════════════════════════════════════════
                HERO HEADER — high-impact visual identity
            ══════════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-brand-900 p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12"><Calendar size={120} className="text-white" /></div>
                
                <div className="relative z-10 space-y-2">
                    <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                        SESSION <span className="text-[#CCFF00]">ATTENDANCE</span>
                    </h2>
                    <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em] italic">Real-time metrics // Performance sync</p>
                    
                    <div className="flex items-center gap-4 pt-4 text-[11px] font-black uppercase tracking-widest text-white/60">
                        <span className="flex items-center gap-2 text-[#CCFF00] bg-[#CCFF00]/10 px-4 py-2 rounded-full border border-[#CCFF00]/20"><Radio size={12} className="animate-pulse"/> {selectedDate}</span>
                        <span className="flex items-center gap-2"><MapPin size={12}/> {selectedVenue}</span>
                        <span className="flex items-center gap-2"><Layers size={12}/> {selectedBatch}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:flex gap-4 relative z-10 w-full lg:w-auto">
                        <div className="glass-card p-6 rounded-[2rem] border border-white/5 md:w-32 lg:w-40 text-center group hover:bg-white/10 transition-all shadow-xl">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 group-hover:text-[#CCFF00]">PRESENT</p>
                            <p className="text-3xl font-black text-white italic leading-none">{stats.present}<span className="text-white/20 text-xs ml-1">/{stats.total}</span></p>
                        </div>
                        <div className="glass-card p-6 rounded-[2rem] border border-white/5 md:w-32 lg:w-40 text-center group hover:bg-white/10 transition-all shadow-xl">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 group-hover:text-red-500/60">ABSENT</p>
                            <p className="text-3xl font-black text-red-500 italic leading-none">{stats.absent}</p>
                        </div>
                        {isFinalized && (
                            <div className="bg-brand-primary/20 p-6 rounded-[2rem] border border-brand-primary/30 backdrop-blur-xl flex items-center justify-center gap-2 px-8 shadow-lg shadow-brand-primary/10 h-full">
                                <Lock size={18} className="text-brand-primary" />
                                <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">FINALIZED</span>
                            </div>
                        )}
                    </div>
            </div>

            {/* ══════════════════════════════════════════════
                SECTION DIVIDER — Configuration
            ══════════════════════════════════════════════ */}
            <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-brand-950 uppercase italic tracking-[0.3em] flex items-center gap-3">
                        <Filter className="text-brand-primary" size={20} /> 
                        SESSION_CONFIGURATION_PROTOCOL
                    </h2>
                    <div className="h-1 w-32 bg-brand-primary/20 rounded-full" />
                </div>
            </div>

            {/* Control Panel / Filters */}
            <div className="bg-brand-950 p-6 md:p-8 rounded-[2.5rem] border border-white/5 flex flex-col xl:flex-row gap-6 relative z-10 shadow-2xl">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <div className="flex-1 relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60 group-hover:text-white transition-colors z-10">
                            <MapPin size={18} />
                        </div>
                        <select 
                            value={selectedVenue}
                            onChange={(e) => setSelectedVenue(e.target.value)}
                            className="w-full pl-14 pr-10 py-5 bg-brand-900 border border-white/10 rounded-2xl outline-none text-white font-black italic text-[10px] uppercase tracking-[0.2em] appearance-none cursor-pointer shadow-xl hover:bg-brand-800 transition-all"
                        >
                            {venues.map(v => <option key={v.id} value={v.name} className="bg-brand-900 text-white">{v.name}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-secondary/60 group-hover:text-brand-secondary transition-colors z-10">
                            <Layers size={18} />
                        </div>
                          <select 
                              value={selectedBatch}
                              onChange={(e) => setSelectedBatch(e.target.value)}
                              className="w-full pl-14 pr-10 py-5 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl outline-none text-brand-primary font-black italic text-[10px] uppercase tracking-[0.2em] appearance-none cursor-pointer shadow-xl hover:bg-brand-primary/20 transition-all"
                          >
                            <option value="" className="bg-brand-secondary text-brand-primary">ALL BATCHES</option>
                            {batches.map(b => <option key={b.id} value={b.name} className="bg-brand-secondary text-brand-primary">{b.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="relative group flex-[1.5]">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-white/40 transition-colors w-4 h-4" />
                        <input 
                          type="text" 
                          placeholder="Search personnel..." 
                          className="w-full pl-14 pr-8 py-5 bg-brand-900/50 border border-white/5 rounded-2xl outline-none focus:border-brand-primary transition-all text-[10px] font-black text-white placeholder:text-white/20 italic uppercase tracking-widest shadow-inner"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex gap-3">
                  {!isFinalized ? (
                      <button 
                          onClick={handleFinalize}
                          disabled={isFinalizing || stats.pending > 0}
                          className="px-8 py-5 bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-30"
                      >
                          {isFinalizing ? <Zap className="animate-spin" size={18} /> : <Check size={18} />}
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">FINALIZE SESSION</span>
                      </button>
                  ) : (
                      currentUser?.role === 'admin' && (
                          <button 
                              onClick={handleUnfinalize}
                              className="px-8 py-5 bg-brand-900 border border-white/10 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-800 transition-all active:scale-95 shadow-xl"
                          >
                              <RotateCcw size={18} />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">UNFINALIZE</span>
                          </button>
                      )
                  )}

                  <button 
                      onClick={handleSave}
                      disabled={isSaving || stats.pending === stats.total || isFinalized}
                      className={`px-12 py-5 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl relative overflow-hidden group ${
                          isFinalized ? 'bg-brand-900 text-white/20 cursor-not-allowed' :
                          saveStatus === 'success' ? 'bg-emerald-500 text-white' : 
                          saveStatus === 'error' ? 'bg-red-500 text-white' : 
                          'bg-brand-primary/5 border border-brand-primary/40 text-brand-primary hover:bg-brand-primary/20 disabled:opacity-40 shadow-[0_0_20px_rgba(0,200,255,0.05)]'
                      }`}
                  >
                      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      {isSaving ? (
                          <Zap className="animate-spin" size={18} />
                      ) : saveStatus === 'success' ? (
                          <Check size={18} />
                      ) : isFinalized ? (
                          <Lock size={18} />
                      ) : (
                          <Save size={18} />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] italic relative z-10">
                          {isSaving ? 'SAVING...' : saveStatus === 'success' ? 'SUCCESS' : isFinalized ? 'LOCKED' : 'SAVE CHANGES'}
                      </span>
                  </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                ROSTER MATRIX — the core listing section
            ══════════════════════════════════════════════ */}
            <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-brand-950 uppercase italic tracking-[0.3em] flex items-center gap-3">
                        <Users className="text-brand-primary" size={20} /> 
                        ACTIVE_ROSTER_MATRIX
                    </h2>
                    <div className="h-1 w-32 bg-brand-primary/20 rounded-full" />
                </div>
                <div className="hidden md:flex items-center gap-4">
                    <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest italic">{players.length} PERSONNEL_LOADED</span>
                    <div className="h-px w-24 bg-brand-100" />
                </div>
            </div>

            {players.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center p-12 text-center space-y-6 bg-white rounded-[2.5rem] border border-brand-100 shadow-xl">
                    <div className="w-24 h-24 bg-brand-50 rounded-3xl flex items-center justify-center text-brand-200">
                        <Users size={48} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-brand-950 uppercase italic tracking-tight">Empty_Roster_Detected</h3>
                        <p className="text-brand-400 text-sm max-w-sm font-medium">No players found assigned to <b>{selectedVenue}</b> in the <b>{selectedBatch}</b>. Please verify player profiles or adjust filters.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {players
                      .filter(p => !searchTerm || p.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((player) => (
                        <div key={player.id} className={`glass-card p-6 rounded-[2rem] transition-all duration-500 relative group border border-brand-100 hover:shadow-2xl ${attendance[player.id] === AttendanceStatus.PRESENT ? 'ring-2 ring-brand-primary/20 bg-brand-primary/5' : attendance[player.id] === AttendanceStatus.ABSENT ? 'ring-2 ring-red-500/20 bg-red-50/30' : 'hover:bg-brand-50'}`}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative">
                                    <img src={player.photoUrl} alt={player.fullName} className="w-16 h-16 rounded-2xl object-cover bg-brand-50 border border-brand-100 group-hover:border-brand-primary transition-all shadow-md" />
                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white shadow-xl transition-all scale-0 group-hover:scale-100 ${attendance[player.id] === AttendanceStatus.PRESENT ? 'bg-brand-primary text-brand-950' : attendance[player.id] === AttendanceStatus.ABSENT ? 'bg-red-500 text-white' : 'bg-brand-950 text-white'}`}>
                                        <Shield size={12} />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="font-black text-brand-950 italic text-sm uppercase truncate leading-tight">{player.fullName}</h4>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleMOTM(player.id); }}
                                            className={`transition-all duration-300 ${motmId === player.id ? 'text-amber-500 scale-125 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-slate-200 hover:text-amber-400'} ${isFinalized ? 'cursor-not-allowed' : 'active:scale-90'}`}
                                        >
                                            <Trophy size={20} fill={motmId === player.id ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                    <p className="text-[9px] font-black text-brand-400 uppercase tracking-widest mt-1">{player.memberId}</p>
                                </div>
                            </div>

                            <div className={`flex bg-brand-50 rounded-2xl p-1.5 border border-brand-100 transition-all ${isFinalized ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                <button 
                                    onClick={() => toggleAttendance(player.id, AttendanceStatus.PRESENT)}
                                    className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-xl transition-all ${attendance[player.id] === AttendanceStatus.PRESENT ? 'bg-brand-primary text-brand-950 shadow-lg' : 'text-brand-400 hover:text-brand-950 hover:bg-white'}`}
                                >
                                    <Check size={14} className={attendance[player.id] === AttendanceStatus.PRESENT ? 'animate-bounce' : ''} />
                                    <span className="text-[9px] font-black uppercase tracking-widest italic">PRESENT</span>
                                </button>
                                <button 
                                    onClick={() => toggleAttendance(player.id, AttendanceStatus.ABSENT)}
                                    className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-xl transition-all ${attendance[player.id] === AttendanceStatus.ABSENT ? 'bg-red-500 text-white shadow-lg' : 'text-brand-400 hover:text-red-500 hover:bg-white'}`}
                                >
                                    <X size={14} className={attendance[player.id] === AttendanceStatus.ABSENT ? 'animate-pulse' : ''} />
                                    <span className="text-[9px] font-black uppercase tracking-widest italic">ABSENT</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

