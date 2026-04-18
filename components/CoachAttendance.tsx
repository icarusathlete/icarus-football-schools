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
      <div className="glass-card p-8 md:p-12 relative overflow-hidden group">
        {/* Tactical Scan Line overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="w-full h-[2px] bg-brand-400 absolute top-0 shadow-[0_0_15px_rgba(0,200,255,0.8)] animate-scan" />
        </div>
        
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12">
          <Calendar size={140} className="text-brand-500/20" />
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-300 italic opacity-80">Icarus // Attendance Protocol</p>
              <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                SESSION <span className="text-brand-400">ROLLCALL</span>
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-2 text-brand-400 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                <Radio size={10} className="animate-pulse text-brand-500"/> {selectedDate}
              </span>
              {selectedVenue && (
                <span className="flex items-center gap-2 text-brand-400 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                  <MapPin size={10} className="text-brand-500"/> {selectedVenue}
                </span>
              )}
              {selectedBatch && (
                <span className="flex items-center gap-2 text-brand-400 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                  <Layers size={10} className="text-brand-500"/> {selectedBatch}
                </span>
              )}
            </div>
          </div>

          {/* KPI Stats - Tactical Grid */}
          <div className="grid grid-cols-2 sm:flex gap-4 w-full lg:w-auto">
            <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-center min-w-[110px] transition-all hover:bg-white/10 hover:border-brand-500/30 group/stat">
              <p className="text-[9px] font-black text-brand-300 uppercase tracking-widest mb-2 opacity-60">Present</p>
              <p className="text-3xl font-black text-emerald-400 italic leading-none group-hover:scale-110 transition-transform">{stats.present}</p>
              <p className="text-[8px] text-white/30 font-black mt-2">ACTIVE SQUAD</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-center min-w-[110px] transition-all hover:bg-white/10 hover:border-red-500/30 group/stat">
              <p className="text-[9px] font-black text-brand-300 uppercase tracking-widest mb-2 opacity-60">Absent</p>
              <p className="text-3xl font-black text-red-400 italic leading-none group-hover:scale-110 transition-transform">{stats.absent}</p>
              <p className="text-[8px] text-white/30 font-black mt-2">FLAGGED</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-center min-w-[110px] transition-all hover:bg-white/10 hover:border-brand-400/30 group/stat relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-brand-500/10 blur-xl" />
              <p className="text-[9px] font-black text-brand-300 uppercase tracking-widest mb-2 opacity-60">Tactical %</p>
              <div className="flex items-baseline justify-center gap-0.5">
                  <p className="text-3xl font-black text-brand-400 italic leading-none group-hover:scale-110 transition-transform">{presentPct}</p>
                  <span className="text-sm font-black text-brand-300/40 italic">%</span>
              </div>
              <p className="text-[8px] text-white/30 font-black mt-2">EFFICIENCY</p>
            </div>

            {isFinalized && (
              <div className="bg-emerald-500/20 backdrop-blur-xl p-5 rounded-2xl border border-emerald-500/30 flex flex-col items-center justify-center gap-1 min-w-[110px]">
                <Lock size={18} className="text-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">LOCKED</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════
          SESSION CONFIGURATION
      ═══════════════════════════════ */}
      <div className="flex items-center gap-3 px-2">
        <Filter size={16} className="text-brand-500" />
        <h2 className="text-xs font-black text-brand-950/40 uppercase italic tracking-[0.3em]">Session Configuration</h2>
        <div className="h-px flex-1 bg-brand-100" />
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-brand-100 flex flex-col xl:flex-row gap-6 shadow-2xl shadow-brand-500/10">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">

          {/* Date */}
          <div className="relative group flex-1">
            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-300 w-4 h-4 group-hover:text-brand-500 transition-colors pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none text-brand-950 font-black text-[11px] uppercase tracking-widest cursor-pointer hover:border-brand-500/30 transition-all focus:bg-white focus:ring-4 focus:ring-brand-500/5"
            />
          </div>

          {/* Venue */}
          <div className="relative group flex-1">
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-300 w-4 h-4 group-hover:text-brand-500 transition-colors z-10 pointer-events-none" />
            <select
              value={selectedVenue}
              onChange={e => setSelectedVenue(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none text-brand-950 font-black text-[11px] uppercase tracking-widest appearance-none cursor-pointer hover:border-brand-500/30 transition-all focus:bg-white focus:ring-4 focus:ring-brand-500/5"
            >
              {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>

          {/* Batch */}
          <div className="relative group flex-1">
            <Layers className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-300 w-4 h-4 group-hover:text-brand-500 transition-colors z-10 pointer-events-none" />
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-brand-50/50 border border-brand-100 rounded-2xl outline-none text-brand-950 font-black text-[11px] uppercase tracking-widest appearance-none cursor-pointer hover:border-brand-500/30 transition-all focus:bg-white focus:ring-4 focus:ring-brand-500/5"
            >
              {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          {/* Search */}
          <div className="relative group flex-[1.5]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-300 group-hover:text-brand-500 transition-colors w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search athlete matrix..."
              className="w-full pl-12 pr-5 py-4 bg-brand-50/30 border border-brand-100 rounded-2xl outline-none text-brand-950 placeholder:text-brand-200 font-bold text-[11px] uppercase tracking-widest focus:bg-white focus:border-brand-500/40 focus:ring-4 focus:ring-brand-500/5 transition-all"
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
              <span className="text-[10px] font-black uppercase tracking-[0.2em] italic whitespace-nowrap">Finalize Session</span>
            </button>
          ) : (
            currentUser?.role === 'admin' && (
              <button
                onClick={handleUnfinalize}
                className="px-6 py-4 bg-white border border-brand-100 text-brand-400 rounded-2xl flex items-center gap-3 hover:bg-brand-50 hover:text-brand-950 transition-all active:scale-95 shadow-sm"
              >
                <RotateCcw size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] italic whitespace-nowrap">Unlock Protocols</span>
              </button>
            )
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || isFinalized}
            className={`px-8 py-4 rounded-2xl flex items-center gap-3 transition-all active:scale-95 shadow-xl relative overflow-hidden group ${
              isFinalized ? 'bg-brand-50 text-brand-200 cursor-not-allowed border border-brand-100' :
              saveStatus === 'success' ? 'bg-brand-950 text-white shadow-brand-950/20' :
              saveStatus === 'error' ? 'bg-red-500 text-white' :
              'bg-brand-500 text-brand-950 hover:shadow-brand-500/40 hover:-translate-y-0.5 disabled:opacity-40'
            }`}
          >
            {/* Shimmer Effect */}
            {!isSaving && !isFinalized && saveStatus === 'idle' && (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
            )}
            
            {isSaving ? <Zap className="animate-spin" size={16} /> :
             saveStatus === 'success' ? <Check size={16} /> :
             isFinalized ? <Lock size={16} /> :
             <Save size={16} />}
            <span className="text-[10px] font-black uppercase tracking-[0.3em] italic relative z-10 whitespace-nowrap">
              {isSaving ? 'Synchronizing...' : saveStatus === 'success' ? 'Synchronized!' : isFinalized ? 'Protocol Locked' : 'Commit Protocol'}
            </span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════
          ROSTER MATRIX
      ═══════════════════════════════ */}
      <div className="flex items-center gap-3 px-2">
        <Users size={16} className="text-brand-500" />
        <h2 className="text-xs font-black text-brand-950/40 uppercase italic tracking-[0.3em]">Active Roster Matrix</h2>
        <div className="h-px flex-1 bg-brand-100" />
      </div>

      {players.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center p-12 text-center space-y-6 bg-brand-50 rounded-[2.5rem] border border-brand-100">
          <div className="w-20 h-20 bg-white shadow-xl rounded-3xl flex items-center justify-center text-brand-100 border border-brand-100">
            <Users size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-brand-950 uppercase italic tracking-tight">No Players linked</h3>
            <p className="text-brand-400 text-sm max-w-sm font-medium">
              No players are assigned to <b className="text-brand-950">{selectedVenue}</b> in batch <b className="text-brand-950">{selectedBatch}</b>. Verify player profiles or adjust filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedCategories.map(category => (
            <div key={category} className="space-y-5">

              {/* Category Header */}
              <div className="flex items-center gap-4 px-1">
                <div className="bg-brand-950 text-white px-5 py-2 rounded-xl text-[10px] font-black italic tracking-[0.25em] flex items-center gap-2 shadow-lg">
                  {category}
                  <span className="text-brand-500 ml-1">[{groupedPlayers[category].length}]</span>
                </div>
                <div className="h-px flex-1 bg-brand-100" />
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
                      className={`glass-card p-5 !rounded-[2.5rem] relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 
                        ${isPresent 
                          ? '!border-emerald-500/30 hover:!border-emerald-500/50' 
                          : isAbsent 
                          ? '!border-red-500/30 hover:!border-red-500/50' 
                          : 'hover:!border-brand-400/40 focus-within:!border-brand-400/40 border-white/10'
                        }`}
                    >
                      {/* ── LED status dot (top-right) ── */}
                      <div className="absolute top-4 right-4 z-10">
                        <div className={`relative w-2.5 h-2.5 rounded-full 
                          ${isPresent 
                            ? 'bg-emerald-500 shadow-[0_0_7px_3px_rgba(16,185,129,0.5)] animate-pulse' 
                            : isAbsent 
                            ? 'bg-red-500 shadow-[0_0_7_px_3px_rgba(239,68,68,0.5)] animate-pulse' 
                            : 'bg-white/20 shadow-none'
                          }`}
                        >
                          <div className="absolute top-[2px] left-[2px] w-[4px] h-[4px] rounded-full bg-white/70" />
                        </div>
                      </div>

                      <div className="flex items-start gap-4 mb-5">
                        <div className="relative shrink-0">
                          <img 
                            src={player.photoUrl} 
                            className={`w-14 h-14 rounded-2xl bg-brand-950 object-cover border-2 shadow-xl transition-all duration-300 
                              ${isPresent ? 'border-emerald-500/50' : isAbsent ? 'border-red-500/50' : 'border-white/10 group-hover:border-brand-400/30'}`} 
                          />
                          {isPresent && <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-brand-950 p-0.5 rounded-full shadow-glow-sm"><Check size={10} strokeWidth={4} /></div>}
                          {isAbsent && <div className="absolute -bottom-1 -right-1 bg-red-500 text-white p-0.5 rounded-full shadow-glow-sm"><X size={10} strokeWidth={4} /></div>}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-black text-white italic truncate text-sm uppercase leading-tight group-hover:text-brand-400 transition-colors">
                              {player.fullName.split(' ')[0]}<br/>{player.fullName.split(' ').slice(1).join(' ')}
                            </h3>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleMOTM(player.id); }}
                              className={`transition-all duration-300 p-1.5 rounded-lg shrink-0
                                ${isMotm ? 'text-amber-500 scale-110 bg-amber-500/10 shadow-glow-sm' : 'text-white/10 hover:text-amber-500 hover:bg-white/5'}
                                ${isFinalized ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'}`}
                            >
                              <Trophy size={16} fill={isMotm ? "currentColor" : "none"} />
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/[0.03] rounded border border-white/5">
                              <span className="text-[8px] font-black text-white/40 uppercase italic tracking-tighter">#{player.memberId}</span>
                            </div>
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-400/10 rounded border border-brand-400/20">
                              <span className="text-[8px] font-black text-brand-400 uppercase italic tracking-tighter">{player.position || 'TBD'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tactical Attendance Toggle */}
                      <div className={`flex gap-2 mt-2 transition-all duration-300 ${isFinalized ? 'opacity-40 pointer-events-none' : ''}`}>
                        <button
                          onClick={() => toggleAttendance(player.id, AttendanceStatus.PRESENT)}
                          className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-xl transition-all duration-300 border
                            ${isPresent 
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-glow-sm' 
                              : 'bg-white/[0.03] border-white/10 text-white/20 hover:bg-white/5 hover:border-emerald-500/30 hover:text-emerald-500/60'
                            }`}
                        >
                          <Check size={14} strokeWidth={4} />
                          <span className="text-[9px] font-black uppercase tracking-widest italic">PRE</span>
                        </button>
                        
                        <button
                          onClick={() => toggleAttendance(player.id, AttendanceStatus.ABSENT)}
                          className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-xl transition-all duration-300 border
                            ${isAbsent 
                              ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-glow-sm' 
                              : 'bg-white/[0.03] border-white/10 text-white/20 hover:bg-white/5 hover:border-red-500/30 hover:text-red-500/60'
                            }`}
                        >
                          <X size={14} strokeWidth={4} />
                          <span className="text-[9px] font-black uppercase tracking-widest italic">ABS</span>
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
