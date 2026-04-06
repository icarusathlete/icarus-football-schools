import React, { useState, useCallback, memo, useRef, useMemo, useEffect } from 'react';
import { Player, AttendanceRecord, AttendanceStatus } from '../types';
import { StorageService } from '../services/storageService';
import { Users, Search, Calendar as CalendarIcon, CheckCircle2, ChevronDown, CheckCircle as CheckCircleIcon, X, Trophy } from 'lucide-react';

// ─── localStorage helpers ─────────────────────────────────────────
const LS_KEY = 'icarus_attendance';
const LS_MOTM_KEY = 'icarus_session_motm';

function lsWrite(record: AttendanceRecord) {
  try {
    const all: AttendanceRecord[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    const rest = all.filter(r => !(r.playerId === record.playerId && r.date === record.date));
    localStorage.setItem(LS_KEY, JSON.stringify([...rest, record]));
  } catch { /* silent */ }
}

function lsReadAll(playerIds: string[], date: string): Record<string, AttendanceStatus> {
  try {
    const all: AttendanceRecord[] = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    const map: Record<string, AttendanceStatus> = {};
    playerIds.forEach(id => {
      const r = all.find(r => r.playerId === id && r.date === date);
      map[id] = (r?.status as AttendanceStatus) ?? AttendanceStatus.ABSENT;
    });
    return map;
  } catch {
    const m: Record<string, AttendanceStatus> = {};
    playerIds.forEach(id => { m[id] = AttendanceStatus.ABSENT; });
    return m;
  }
}

function lsReadMotm(date: string): string | null {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_MOTM_KEY) || '{}');
    return stored[date] || null;
  } catch { return null; }
}

// Removed local lsWriteMotm as we use StorageService.setMOTM

// ─── Toggle button (iOS Sliding Style) ────────────────────────────
// ─── Toggle button (Icarus Pro Pulse Style) ────────────────────────────
const ToggleButton = ({ isPresent, onClick }: { isPresent: boolean; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) => (
  <button 
    type="button" 
    onClick={onClick} 
    aria-label={isPresent ? 'Mark absent' : 'Mark present'}
    className={`relative flex items-center w-14 h-7 rounded-lg p-1 border transition-all duration-500 overflow-hidden group/toggle ${
      isPresent 
        ? 'border-brand-500/50 bg-brand-500/10 shadow-[0_0_15px_rgba(0,255,200,0.1)]' 
        : 'border-white/5 bg-white/5'
    }`}
  >
    <div className={`absolute inset-0 transition-opacity duration-500 ${isPresent ? 'opacity-100 bg-gradient-to-r from-brand-500/20 to-transparent' : 'opacity-0'}`} />
    <div className={`relative z-10 w-full flex items-center justify-between px-1`}>
        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isPresent ? 'bg-brand-500 shadow-[0_0_8px_rgba(0,255,200,0.8)]' : 'bg-white/10'}`} />
        <span className={`text-[7px] font-black uppercase tracking-widest transition-all duration-500 ${isPresent ? 'text-brand-500' : 'text-white/20'}`}>
            {isPresent ? 'ACTIVE' : 'OFF'}
        </span>
    </div>
    {/* Sliding indicator */}
    <div className={`absolute bottom-0 left-0 h-0.5 bg-brand-500 transition-all duration-500 ${isPresent ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
  </button>
);

// ─── Player card (Pocket View v20 — Compact Mode) ──────────────────
// ─── Player card (Icarus Pro Pocket View) ──────────────────
const PlayerCard = memo(function PlayerCard({
  player, date, initialStatus, isMotm, onStatusChange, onSelectMotm,
}: {
  player: Player;
  date: string;
  initialStatus: AttendanceStatus;
  isMotm: boolean;
  onStatusChange: (playerId: string, status: AttendanceStatus) => void;
  onSelectMotm: (playerId: string) => void;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus, date]);

  const handleToggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); e.preventDefault();
    const nextStatus = status === AttendanceStatus.PRESENT ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
    setStatus(nextStatus);
    onStatusChange(player.id, nextStatus);
  }, [player.id, status, onStatusChange]);

  const handleMotm = useCallback((e: React.MouseEvent<HTMLObjectElement>) => {
    e.stopPropagation(); e.preventDefault();
    onSelectMotm(player.id);
  }, [player.id, onSelectMotm]);

  const isPresent = status === AttendanceStatus.PRESENT;

  return (
    <div className={`relative glass-card p-3 flex flex-col items-center gap-3 transition-all duration-500 group/card ${
      isMotm ? 'ring-2 ring-brand-500 shadow-[0_0_25px_rgba(0,255,200,0.15)] bg-brand-500/5' : 
      isPresent ? 'border-brand-500/30' : 
      'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
    }`}>
      {/* Selection Glow */}
      {isPresent && <div className="absolute inset-0 bg-brand-500/5 animate-pulse rounded-[1.5rem]" />}

      <div className="relative">
        <div 
          onClick={() => onSelectMotm(player.id)}
          className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-500 cursor-pointer ${
          isMotm ? 'border-brand-500 scale-110 shadow-[0_0_15px_rgba(0,255,200,0.3)]' : 
          isPresent ? 'border-brand-500/50' : 
          'border-white/10'
        }`}>
          <img 
            src={player.photoUrl} 
            alt={player.fullName} 
            className={`w-full h-full object-cover transition-all duration-700 ${isPresent || isMotm ? 'scale-100' : 'scale-110'}`} 
          />
        </div>
        {/* MVP Badge */}
        {isMotm && (
          <div className="absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-brand-500 text-brand-950 flex items-center justify-center shadow-2xl animate-bounce-subtle">
            <Trophy size={14} strokeWidth={3} />
          </div>
        )}
      </div>

      <div className="text-center w-full min-w-0 relative z-10">
        <h4 className={`font-display font-black text-[10px] uppercase italic tracking-tight truncate leading-none ${
          isMotm ? 'text-brand-500' : 
          isPresent ? 'text-white' : 
          'text-white/40'
        }`}>
          {player.fullName.split(' ')[0]}
        </h4>
        <div className="h-0.5 w-4 bg-brand-500/20 mx-auto mt-1.5 rounded-full transition-all group-hover/card:w-8" />
      </div>

      <div className="relative z-10 transform scale-90">
        <ToggleButton isPresent={isPresent} onClick={handleToggle} />
      </div>
    </div>
  );
},
(prev, next) =>
  prev.player.id === next.player.id &&
  prev.date === next.date &&
  prev.initialStatus === next.initialStatus &&
  prev.isMotm === next.isMotm &&
  prev.onStatusChange === next.onStatusChange &&
  prev.onSelectMotm === next.onSelectMotm
);

// ─── Main component ───────────────────────────────────────────────
export const CoachAttendance: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [players, setPlayers] = useState<Player[]>(() => StorageService.getPlayers());
  const [liveStatuses, setLiveStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    lsReadAll(StorageService.getPlayers().map(p => p.id), todayStr)
  );
  const [motmId, setMotmId] = useState<string | null>(() => {
    const data = StorageService.getMOTM(todayStr);
    return data?.playerId || null;
  });

  const [filter, setFilter] = useState('ALL');
  const [venueFilter, setVenueFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rsvps, setRsvps] = useState<{ attending: Player[]; declined: Player[]; pending: Player[] }>({ attending: [], declined: [], pending: [] });
  const recentToggles = useRef<Record<string, number>>({});

  // Reload on date change
  useEffect(() => {
    const ps = StorageService.getPlayers();
    setPlayers(ps);
    setLiveStatuses(lsReadAll(ps.map(p => p.id), date));
    const motm = StorageService.getMOTM(date);
    setMotmId(motm?.playerId || null);
    recentToggles.current = {};
    const event = StorageService.getSchedule().find(e => e.date === date);
    if (event) {
      const a: Player[] = [], d: Player[] = [], pend: Player[] = [];
      ps.forEach(p => { const s = event.rsvps?.[p.id]; if (s === 'attending') a.push(p); else if (s === 'declined') d.push(p); else pend.push(p); });
      setRsvps({ attending: a, declined: d, pending: pend });
    } else { setRsvps({ attending: [], declined: [], pending: [] }); }
  }, [date]);

  // Firestore sync — Targeted Patching Logic
  useEffect(() => {
    const handler = () => {
      const ps = StorageService.getPlayers();
      setPlayers(ps);
      const fromStorage = lsReadAll(ps.map(p => p.id), date);
      const now = Date.now();

      setLiveStatuses(prev => {
        let hasChanged = false;
        const next = { ...prev };
        
        ps.forEach(p => {
          const storageStatus = fromStorage[p.id] || AttendanceStatus.ABSENT;
          const currentStatus = prev[p.id];
          
          // Protection window: Ignore incoming sync if we recently toggled this player (5s guard)
          const lastToggleTime = recentToggles.current[p.id] || 0;
          if (now - lastToggleTime >= 5000) {
            if (storageStatus !== currentStatus) {
              next[p.id] = storageStatus;
              hasChanged = true;
            }
          }
        });

        return hasChanged ? next : prev;
      });
    };
    window.addEventListener('academy_data_update', handler);
    return () => window.removeEventListener('academy_data_update', handler);
  }, [date]);

  // Attendance toggle — Decentralized Handler
  const onStatusChange = useCallback(async (playerId: string, status: AttendanceStatus) => {
    // 1. Mark as pending locally (timestamp)
    recentToggles.current[playerId] = Date.now();
    
    // 2. Update UI instantly
    setLiveStatuses(prev => ({ ...prev, [playerId]: status }));
    
    // 3. Update localStorage optimistically
    const record: AttendanceRecord = { id: `${date}_${playerId}`, playerId, date, status };
    lsWrite(record);
    
    // 4. Persistence to Firestore
    try {
      await StorageService.saveAttendanceBatch([record]);
    } catch (error) {
      console.error("Attendance save failed:", error);
      // Optional: revert local state on failure
    }
  }, [date]);

  const onSelectMotm = useCallback(async (playerId: string) => {
    const next = motmId === playerId ? null : playerId;
    setMotmId(next);
    await StorageService.setMOTM(next || '', date);
  }, [date, motmId]);

  const presentCount = useMemo(() =>
    Object.values(liveStatuses).filter(s => s === AttendanceStatus.PRESENT).length,
    [liveStatuses]
  );

  const motmPlayer = useMemo(() =>
    motmId ? players.find(p => p.id === motmId) || null : null,
    [motmId, players]
  );

  const filteredPlayers = useMemo(() =>
    players.filter(p => {
      const s = liveStatuses[p.id] ?? AttendanceStatus.ABSENT;
      return (
        (filter === 'ALL' || (filter === 'PRESENT' && s === AttendanceStatus.PRESENT) || (filter === 'ABSENT' && s === AttendanceStatus.ABSENT)) &&
        (venueFilter === 'all' || p.venue === venueFilter) &&
        (batchFilter === 'all' || p.batch === batchFilter) &&
        (!searchQuery || p.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }),
    [players, liveStatuses, filter, venueFilter, batchFilter, searchQuery]
  );

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      {/* Header - Icarus Pro Hero */}
      <div className="relative group overflow-hidden rounded-[2.5rem] bg-brand-900 p-8 md:p-12 border border-white/10 shadow-2xl transition-all duration-500 hover:border-brand-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(0,255,200,0.05),transparent_50%)]" />
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-125 group-hover:rotate-0 duration-700">
            <Users size={200} className="text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-lime/10 rounded-full border border-lime/20 text-[8px] font-black uppercase tracking-[0.3em] text-lime animate-pulse">Operational Roster</div>
              <div className="w-1.5 h-1.5 rounded-full bg-lime shadow-[0_0_8px_rgba(195,246,41,0.5)]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-black italic tracking-tighter text-white uppercase leading-none">
              DEPLOYMENT <span className="premium-gradient-text">LOG</span>
            </h2>
            <p className="font-black mt-3 uppercase text-[10px] tracking-[0.35em] text-brand-500/60 italic max-w-md leading-relaxed">
              Real-time synchronization and personnel management for peak performance tracking.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]); }} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl hover:bg-brand-500 hover:text-brand-950 transition-all border border-white/5 text-white/40"><ChevronDown className="rotate-90 w-4 h-4" strokeWidth={3} /></button>
            <div className="px-6 text-center">
              <p className="text-[8px] font-black text-brand-500/60 uppercase tracking-widest mb-1 italic">ACTIVE WINDOW</p>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none outline-none text-sm font-display font-black text-white w-32 cursor-pointer text-center uppercase" />
            </div>
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl hover:bg-brand-500 hover:text-brand-950 transition-all border border-white/5 text-white/40"><ChevronDown className="-rotate-90 w-4 h-4" strokeWidth={3} /></button>
          </div>
        </div>
      </div>

      {/* Stats Modules - Icarus Pro High Density */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-slide-up">
        {/* Present Card */}
        <div className="glass-card p-8 group transition-all duration-500 hover:ring-1 hover:ring-brand-500/30">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-brand-500/5 rounded-xl flex items-center justify-center border border-brand-500/10 transition-transform group-hover:rotate-12">
              <CheckCircle2 size={24} className="text-brand-500" />
            </div>
            <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest opacity-40">Personnel</span>
          </div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 italic">PRESENT</p>
          <h3 className="text-5xl font-display font-black text-white italic tracking-tighter">{presentCount}</h3>
        </div>

        {/* Absent Card */}
        <div className="glass-card p-8 group transition-all duration-500 hover:ring-1 hover:ring-red-500/30">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-red-500/5 rounded-xl flex items-center justify-center border border-red-500/10 transition-transform group-hover:-rotate-12">
              <X size={24} className="text-red-500" />
            </div>
            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest opacity-40">Gap</span>
          </div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 italic">ABSENT</p>
          <h3 className="text-5xl font-display font-black text-white italic tracking-tighter">{players.length - presentCount}</h3>
        </div>

        {/* Total Card */}
        <div className="glass-card p-8 group transition-all duration-500 hover:ring-1 hover:ring-white/20">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 transition-transform group-hover:scale-110">
              <Users size={24} className="text-white/40" />
            </div>
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest opacity-20">Capacity</span>
          </div>
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 italic">TOTAL SQUAD</p>
          <h3 className="text-5xl font-display font-black text-white italic tracking-tighter">{players.length}</h3>
        </div>

        {/* MVP Spotlight */}
        <div className={`relative glass-card p-8 group transition-all duration-700 overflow-hidden ${motmPlayer ? 'ring-2 ring-brand-500/50' : ''}`}>
          {motmPlayer ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent animate-pulse" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-brand-500 text-brand-950 rounded-xl flex items-center justify-center shadow-xl shadow-brand-500/20">
                    <Trophy size={24} strokeWidth={3} />
                  </div>
                  <div className="px-3 py-1 bg-brand-500/20 rounded-full border border-brand-500/30 text-[8px] font-black text-brand-500 uppercase tracking-widest">MVP ASSIGNED</div>
                </div>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 italic">SESSION LEAD</p>
                <h3 className="text-2xl font-display font-black text-white italic truncate uppercase leading-tight">{motmPlayer.fullName.split(' ')[0]}</h3>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col justify-center items-center opacity-20 border-dashed border-2 border-white/5 rounded-2xl border-white/10">
              <Trophy size={32} className="text-white mb-3" strokeWidth={1} />
              <span className="text-[10px] font-black uppercase tracking-widest">NO MVP SELECTED</span>
            </div>
          )}
        </div>
      </div>

      {/* RSVP Integration - Subtle Glass Bars */}
      {(rsvps.attending.length + rsvps.declined.length + rsvps.pending.length > 0) && (
        <div className="grid grid-cols-3 gap-6 animate-fade-in">
          <div className="glass-card bg-emerald-500/5 p-5 border-emerald-500/20 flex flex-col items-center justify-center gap-1 group hover:bg-emerald-500/10 transition-colors">
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic opacity-60">CONFIRMED</span>
            <span className="text-3xl font-display font-black text-emerald-500 group-hover:scale-110 transition-transform">{rsvps.attending.length}</span>
          </div>
          <div className="glass-card bg-rose-500/5 p-5 border-rose-500/20 flex flex-col items-center justify-center gap-1 group hover:bg-rose-500/10 transition-colors">
            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest italic opacity-60">DECLINED</span>
            <span className="text-3xl font-display font-black text-rose-500 group-hover:scale-110 transition-transform">{rsvps.declined.length}</span>
          </div>
          <div className="glass-card bg-white/5 p-5 border-white/10 flex flex-col items-center justify-center gap-1 group hover:bg-white/10 transition-colors">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">PENDING</span>
            <span className="text-3xl font-display font-black text-white/60 group-hover:scale-110 transition-transform">{rsvps.pending.length}</span>
          </div>
        </div>
      )}

      {/* Roster Controls */}
      <div className="space-y-6">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-end justify-between gap-6">
          <div>
            <h3 className="font-display font-black text-white text-2xl italic uppercase tracking-tight flex items-center gap-4">
              <Users size={28} className="text-brand-500" />OPERATIONAL <span className="premium-gradient-text">ROSTER</span>
            </h3>
            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mt-2 italic ml-11">Total Unit Census: {filteredPlayers.length} Active Personnel</p>
          </div>
          
          <div className="flex-1 flex flex-wrap lg:flex-nowrap items-center gap-4 bg-brand-950/50 backdrop-blur-3xl p-3 rounded-2xl border border-white/5 shadow-2xl min-w-0">
            <div className="relative flex-1 min-w-[200px] group">
              <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-500 group-focus-within:scale-110 transition-transform" />
              <input type="text" placeholder="IDENTITY FILTER…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-xl py-4 pl-14 pr-6 text-[10px] font-black text-white uppercase italic tracking-[0.2em] outline-none focus:border-brand-500/50 placeholder:text-white/10 transition-all font-display" />
            </div>
            
            <div className="flex gap-2">
                <div className="relative">
                    <select value={venueFilter} onChange={e => setVenueFilter(e.target.value)} className="bg-white/5 border border-white/5 rounded-xl py-4 px-6 text-[10px] font-black text-white uppercase italic tracking-widest outline-none cursor-pointer appearance-none pr-12 focus:border-brand-500/50 transition-all hover:bg-white/10">
                      <option value="all">SQUARE DEPOT</option>
                      {[...new Set(players.map(p => p.venue))].filter(Boolean).map(v => <option key={v as string} value={v as string} className="bg-brand-900">{String(v).toUpperCase()}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-500 opacity-50" size={14} />
                </div>
                
                <div className="relative">
                    <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className="bg-white/5 border border-white/5 rounded-xl py-4 px-6 text-[10px] font-black text-white uppercase italic tracking-widest outline-none cursor-pointer appearance-none pr-12 focus:border-brand-500/50 transition-all hover:bg-white/10">
                      <option value="all">OPS BATCH</option>
                      {[...new Set(players.map(p => p.batch))].filter(Boolean).map(b => <option key={b as string} value={b as string} className="bg-brand-900">{String(b).toUpperCase()}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-500 opacity-50" size={14} />
                </div>
            </div>

            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shrink-0 shadow-inner">
              {['ALL', 'PRESENT', 'ABSENT'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`text-[9px] font-black px-6 py-3 rounded-lg uppercase tracking-[0.2em] transition-all duration-300 italic ${filter === f ? 'bg-brand-500 text-brand-950 shadow-xl shadow-brand-500/20' : 'text-white/20 hover:text-white hover:bg-white/5'}`}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Players Grid - Pocket View Design */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 pb-20 animate-fade-in">
          {filteredPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              date={date}
              initialStatus={liveStatuses[player.id] ?? AttendanceStatus.ABSENT}
              isMotm={motmId === player.id}
              onStatusChange={onStatusChange}
              onSelectMotm={onSelectMotm}
            />
          ))}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-24 glass-card border-dashed">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search size={32} className="text-white/10" />
             </div>
             <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] italic drop-shadow-sm">No personnel match current filters</p>
          </div>
        )}
      </div>
    </div>
  );
};
