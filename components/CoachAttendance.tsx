import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, AttendanceRecord, User, AttendanceStatus } from '../types';
import { 
    Search, MapPin, Layers, Check, X, Calendar, 
    Save, Filter, Users, Zap, Trophy, Lock, RotateCcw, Radio
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
      
      const assignedVenues = isAdmin ? allVenues : allVenues.filter(v => (user.assignedVenues || []).includes(v.name));
      setVenues(assignedVenues);
      if (assignedVenues.length > 0) setSelectedVenue(assignedVenues[0].name);

      const allBatches = StorageService.getBatches();
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

      const motm = StorageService.getMOTM(selectedDate, selectedVenue, selectedBatch);
      setMotmId(motm?.playerId || null);
      
      const finalized = StorageService.isRollcallFinalized(selectedDate, selectedVenue, selectedBatch);
      setIsFinalized(finalized);
    }
  };

  // Load session data when filters change (date/venue/batch).
  // We intentionally do NOT subscribe to 'academy_data_update' here because
  // that event fires on every storage write (including MOTM saves) and would
  // reset the in-memory attendance state, wiping unsaved coaching work.
  useEffect(() => {
    loadSessionData();
  }, [selectedDate, selectedVenue, selectedBatch]);

  const toggleAttendance = (playerId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: prev[playerId] === status ? 'none' : status
    }));
    setSaveStatus('idle');
  };

  const toggleMOTM = (playerId: string) => {
    if (isFinalized) return;
    const newMotmId = motmId === playerId ? null : playerId;
    // Update local state immediately — no await, no reload
    setMotmId(newMotmId);
    // Persist in the background without blocking or resetting state
    if (newMotmId) {
      StorageService.setMOTM(newMotmId, selectedDate, selectedVenue, selectedBatch)
        .catch(err => console.error('Failed to save MOTM:', err));
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

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getAgeCategory = (dob: string) => {
    const age = calculateAge(dob);
    if (age <= 8) return 'U-8';
    if (age <= 10) return 'U-10';
    if (age <= 12) return 'U-12';
    return 'OTHERS';
  };

  const groupedPlayers = filteredPlayers.reduce((acc, player) => {
    const category = getAgeCategory(player.dateOfBirth);
    if (!acc[category]) acc[category] = [];
    acc[category].push(player);
    return acc;
  }, {} as Record<string, Player[]>);

  const categoryOrder = ['U-12', 'U-10', 'U-8', 'OTHERS'];
  const sortedCategories = Object.keys(groupedPlayers).sort((a, b) => 
    categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  const stats = {
    total: players.length,
    present: Object.values(attendance).filter(s => s === AttendanceStatus.PRESENT).length,
    absent: Object.values(attendance).filter(s => s === AttendanceStatus.ABSENT).length,
    pending: players.length - Object.values(attendance).filter(s => s !== 'none').length
  };

  const presentPct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="space-y-8 pb-32">

      {/* ═══════════════════════════════
          HERO HEADER
      ═══════════════════════════════ */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-brand-900 p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12">
          <Calendar size={140} className="text-white" />
        </div>

        <div className="relative z-10 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 italic">Icarus // Attendance Protocol</p>
          <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
            SESSION <span className="text-[#CCFF00]">ROLLCALL</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 pt-4 text-[10px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-2 text-[#CCFF00] bg-[#CCFF00]/10 px-4 py-2 rounded-full border border-[#CCFF00]/20">
              <Radio size={10} className="animate-pulse"/> {selectedDate}
            </span>
            {selectedVenue && (
              <span className="flex items-center gap-2 text-white/60 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <MapPin size={10}/> {selectedVenue}
              </span>
            )}
            {selectedBatch && (
              <span className="flex items-center gap-2 text-white/60 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Layers size={10}/> {selectedBatch}
              </span>
            )}
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 sm:flex gap-4 relative z-10 w-full lg:w-auto">
          <div className="bg-brand-950/80 backdrop-blur-xl p-5 rounded-[1.75rem] border border-white/5 text-center min-w-[100px]">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Present</p>
            <p className="text-3xl font-black text-emerald-400 italic leading-none">{stats.present}</p>
            <p className="text-[8px] text-white/30 font-black mt-1">of {stats.total}</p>
          </div>
          <div className="bg-brand-950/80 backdrop-blur-xl p-5 rounded-[1.75rem] border border-white/5 text-center min-w-[100px]">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Absent</p>
            <p className="text-3xl font-black text-red-400 italic leading-none">{stats.absent}</p>
            <p className="text-[8px] text-white/30 font-black mt-1">flagged</p>
          </div>
          <div className="bg-brand-950/80 backdrop-blur-xl p-5 rounded-[1.75rem] border border-white/5 text-center min-w-[100px]">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Rate</p>
            <p className="text-3xl font-black text-[#CCFF00] italic leading-none">{presentPct}<span className="text-lg">%</span></p>
            <p className="text-[8px] text-white/30 font-black mt-1">attendance</p>
          </div>
          {isFinalized && (
            <div className="bg-emerald-500/10 p-5 rounded-[1.75rem] border border-emerald-500/20 flex items-center justify-center gap-2 min-w-[100px]">
              <Lock size={16} className="text-emerald-400" />
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Locked</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════
          SESSION CONFIGURATION
      ═══════════════════════════════ */}
      <div className="flex items-center gap-3 px-2">
        <Filter size={16} className="text-[#CCFF00]" />
        <h2 className="text-xs font-black text-white/60 uppercase italic tracking-[0.3em]">Session Configuration</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>

      <div className="bg-brand-950 p-6 md:p-8 rounded-[2.5rem] border border-white/5 flex flex-col xl:flex-row gap-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">

          {/* Date */}
          <div className="relative group flex-1">
            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4 group-hover:text-[#CCFF00] transition-colors" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-brand-900 border border-white/10 rounded-2xl outline-none text-white font-black text-[11px] uppercase tracking-widest cursor-pointer hover:border-white/20 transition-all focus:border-[#CCFF00]/40"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Venue */}
          <div className="relative group flex-1">
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4 group-hover:text-[#CCFF00] transition-colors z-10 pointer-events-none" />
            <select
              value={selectedVenue}
              onChange={e => setSelectedVenue(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-brand-900 border border-white/10 rounded-2xl outline-none text-white font-black text-[11px] uppercase tracking-widest appearance-none cursor-pointer hover:border-white/20 transition-all focus:border-[#CCFF00]/40"
            >
              {venues.map(v => <option key={v.id} value={v.name} className="bg-brand-900">{v.name}</option>)}
            </select>
          </div>

          {/* Batch */}
          <div className="relative group flex-1">
            <Layers className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4 group-hover:text-[#CCFF00] transition-colors z-10 pointer-events-none" />
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-brand-900 border border-white/10 rounded-2xl outline-none text-white font-black text-[11px] uppercase tracking-widest appearance-none cursor-pointer hover:border-white/20 transition-all focus:border-[#CCFF00]/40"
            >
              {batches.map(b => <option key={b.id} value={b.name} className="bg-brand-900">{b.name}</option>)}
            </select>
          </div>

          {/* Search */}
          <div className="relative group flex-[1.5]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-hover:text-white/50 transition-colors w-4 h-4" />
            <input
              type="text"
              placeholder="Search player..."
              className="w-full pl-12 pr-5 py-4 bg-brand-900/50 border border-white/5 rounded-2xl outline-none text-white placeholder:text-white/30 font-black text-[11px] uppercase tracking-widest focus:border-[#CCFF00]/40 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 shrink-0">
          {!isFinalized ? (
            <button
              onClick={handleFinalize}
              disabled={isFinalizing || stats.pending > 0}
              className="px-6 py-4 bg-emerald-500 text-white rounded-2xl flex items-center gap-3 hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isFinalizing ? <Zap className="animate-spin" size={16} /> : <Check size={16} />}
              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic whitespace-nowrap">Finalize</span>
            </button>
          ) : (
            currentUser?.role === 'admin' && (
              <button
                onClick={handleUnfinalize}
                className="px-6 py-4 bg-brand-900 border border-white/10 text-white/70 rounded-2xl flex items-center gap-3 hover:bg-brand-800 hover:text-white transition-all active:scale-95"
              >
                <RotateCcw size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] italic whitespace-nowrap">Unlock</span>
              </button>
            )
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || isFinalized}
            className={`px-8 py-4 rounded-2xl flex items-center gap-3 transition-all active:scale-95 shadow-xl relative overflow-hidden group ${
              isFinalized ? 'bg-brand-900 text-white/20 cursor-not-allowed border border-white/5' :
              saveStatus === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
              saveStatus === 'error' ? 'bg-red-500 text-white' :
              'bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-[#CCFF00] hover:bg-[#CCFF00]/20 disabled:opacity-40'
            }`}
          >
            <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            {isSaving ? <Zap className="animate-spin" size={16} /> :
             saveStatus === 'success' ? <Check size={16} /> :
             isFinalized ? <Lock size={16} /> :
             <Save size={16} />}
            <span className="text-[10px] font-black uppercase tracking-[0.3em] italic relative z-10 whitespace-nowrap">
              {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : isFinalized ? 'Locked' : 'Save'}
            </span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════
          ROSTER MATRIX
      ═══════════════════════════════ */}
      <div className="flex items-center gap-3 px-2">
        <Users size={16} className="text-[#CCFF00]" />
        <h2 className="text-xs font-black text-white/60 uppercase italic tracking-[0.3em]">Active Roster Matrix</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>

      {players.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center p-12 text-center space-y-6 bg-brand-900 rounded-[2.5rem] border border-white/5">
          <div className="w-20 h-20 bg-brand-950 rounded-3xl flex items-center justify-center text-white/10 border border-white/5">
            <Users size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">No Players Found</h3>
            <p className="text-white/40 text-sm max-w-sm font-medium">
              No players are assigned to <b className="text-white/60">{selectedVenue}</b> in batch <b className="text-white/60">{selectedBatch}</b>. Verify player profiles or adjust filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedCategories.map(category => (
            <div key={category} className="space-y-5">

              {/* Category Header */}
              <div className="flex items-center gap-4 px-1">
                <div className="bg-brand-950 text-white border border-white/10 px-5 py-2 rounded-xl text-[10px] font-black italic tracking-[0.25em] flex items-center gap-2">
                  {category}
                  <span className="text-[#CCFF00]/60 ml-1">[{groupedPlayers[category].length}]</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>

              {/* Player Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {groupedPlayers[category].map((player) => {
                  const isPresent = attendance[player.id] === AttendanceStatus.PRESENT;
                  const isAbsent = attendance[player.id] === AttendanceStatus.ABSENT;
                  const isMotm = motmId === player.id;

                  return (
                    <div
                      key={player.id}
                      className={`relative p-3 md:p-4 rounded-[1.5rem] border transition-all duration-300 group
                        ${isPresent
                          ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20'
                          : isAbsent
                          ? 'bg-red-500/10 border-red-500/30 ring-1 ring-red-500/20'
                          : 'bg-brand-900 border-white/5 hover:border-white/15 hover:bg-brand-800/60'
                        }`}
                    >
                      {/* Photo & MOTM */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="relative">
                          <img
                            src={player.photoUrl}
                            alt={player.fullName}
                            className="w-10 h-10 md:w-11 md:h-11 rounded-xl object-cover bg-brand-800 border border-white/10"
                          />
                          {attendance[player.id] !== 'none' && (
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-brand-900 shadow
                              ${isPresent ? 'bg-emerald-500' : 'bg-red-500'}`}>
                              {isPresent ? <Check size={8} className="text-white" /> : <X size={8} className="text-white" />}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMOTM(player.id); }}
                          className={`transition-all duration-200 p-1 rounded-lg
                            ${isMotm ? 'text-amber-400 scale-110 bg-amber-400/10' : 'text-white/20 hover:text-amber-400 hover:bg-amber-400/10'}
                            ${isFinalized ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'}`}
                        >
                          <Trophy size={15} fill={isMotm ? "currentColor" : "none"} />
                        </button>
                      </div>

                      {/* Player Info */}
                      <div className="mb-3 min-h-[36px]">
                        <h4 className="font-black text-white italic text-[10px] md:text-[11px] uppercase truncate leading-tight">
                          {player.fullName}
                        </h4>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-0.5">
                          #{player.memberId}
                        </p>
                      </div>

                      {/* Attendance Toggle */}
                      <div className={`flex bg-brand-950/60 rounded-xl p-0.5 border border-white/5 transition-all
                        ${isFinalized ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                        <button
                          onClick={() => toggleAttendance(player.id, AttendanceStatus.PRESENT)}
                          className={`flex-1 py-1.5 flex items-center justify-center rounded-lg transition-all
                            ${isPresent ? 'bg-emerald-500 text-white shadow-md scale-[1.03]' : 'text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => toggleAttendance(player.id, AttendanceStatus.ABSENT)}
                          className={`flex-1 py-1.5 flex items-center justify-center rounded-lg transition-all
                            ${isAbsent ? 'bg-red-500 text-white shadow-md scale-[1.03]' : 'text-white/30 hover:text-red-400 hover:bg-red-500/10'}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
