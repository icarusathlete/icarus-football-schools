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

// ─── Digital Sliding Switch (Digital Stadium Elite) ──────────────────
const DigitalSwitch = ({ isPresent, onClick }: { isPresent: boolean; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) => (
  <button 
    type="button" 
    onClick={onClick} 
    className={`relative group flex items-center w-12 h-6 rounded-full transition-all duration-300 ${
      isPresent ? 'bg-lime' : 'bg-white/10'
    }`}
  >
    <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isPresent ? 'opacity-100 shadow-[0_0_15px_rgba(195,246,41,0.5)]' : 'opacity-0'}`} />
    <div className={`absolute left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 transform ${
      isPresent ? 'translate-x-6' : 'translate-x-0'
    } shadow-lg`} />
  </button>
);

// ─── Player Card (Athlete Profile v2) ──────────────────
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

  const isPresent = status === AttendanceStatus.PRESENT;

  return (
    <div className={`relative flex flex-col p-4 glass-card bg-white/5 gap-4 overflow-hidden border-none group/card ${
      isMotm ? 'ring-1 ring-lime/50 shadow-lime-glow' : ''
    }`}>
      {/* Dynamic Status Glow */}
      <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 pointer-events-none ${
        isPresent ? 'from-lime/10 to-transparent opacity-100' : 'opacity-0'
      }`} />

      <div className="flex gap-4 items-start relative z-10">
        {/* Photo Container */}
        <div 
          onClick={handleToggle}
          className={`shrink-0 w-16 h-20 bg-white/10 rounded overflow-hidden cursor-pointer transition-all duration-500 ${
            isPresent ? 'ring-2 ring-lime shadow-lg' : 'grayscale opacity-70'
          }`}
        >
          <img 
            src={player.photoUrl} 
            alt={player.fullName} 
            className="w-full h-full object-cover" 
          />
        </div>

        {/* Identity Details */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[7px] font-bold text-white/40 uppercase tracking-[0.2em] font-display">PNL-{player.id.slice(-4).toUpperCase()}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onSelectMotm(player.id); }}
              className={`transition-all duration-300 hover:scale-125 ${isMotm ? 'text-lime drop-shadow-[0_0_8px_rgba(195,246,41,0.5)]' : 'text-white/10 hover:text-white/30'}`}
              title="Toggle Session MVP"
            >
              <Trophy size={14} />
            </button>
          </div>
          <h4 className={`font-display font-bold text-[11px] uppercase tracking-tighter truncate leading-tight transition-colors ${
            isPresent ? 'text-white' : 'text-white/50'
          }`}>
            {player.fullName}
          </h4>
          <p className="text-[8px] text-white/30 font-bold uppercase mt-1 italic tracking-widest">{player.batch || 'UNIT 01'}</p>
        </div>
      </div>

      {/* Control Surface */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-white/5">
        <span className={`text-[8px] font-bold tracking-widest transition-colors ${isPresent ? 'text-lime' : 'text-white/20'}`}>
          {isPresent ? 'OPERATIONAL' : 'OFFLINE'}
        </span>
        <DigitalSwitch isPresent={isPresent} onClick={handleToggle} />
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
    <div className="space-y-12 pb-32 animate-in fade-in duration-700">
      {/* Asymmetrical Header - Digital Stadium Elite */}
      <div className="relative pt-12 overflow-visible">
        {/* Overlapping Background Geometry */}
        <div className="absolute top-0 -left-8 w-1/2 h-full bg-surface-bright -skew-x-12 opacity-50 z-0" />
        <div className="absolute top-8 left-0 w-3/4 h-24 bg-gradient-to-r from-lime/5 to-transparent blur-3xl z-0" />

        <div className="relative z-10 px-4 md:px-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-0.5 bg-lime" />
            <span className="font-display font-bold text-[10px] text-lime uppercase tracking-[0.4em]">Operational Unit Overview</span>
          </div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
            <div>
              <h2 className="text-6xl md:text-7xl font-display font-bold tracking-tight text-white uppercase leading-[0.85] italic">
                OPERATIONAL<br />
                <span className="text-lime">ROSTER</span>
              </h2>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded border border-white/10">
                  <div className="w-2 h-2 bg-lime animate-pulse rounded-full" />
                  <span className="text-[8px] font-bold text-white/60 tracking-widest uppercase">Live Connection</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded border border-white/10">
                  <CalendarIcon size={10} className="text-white/40" />
                  <span className="text-[8px] font-bold text-white/60 tracking-widest uppercase leading-none">{new Date(date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Date Selector HUD */}
            <div className="flex items-center gap-2 p-1.5 bg-white/5 backdrop-blur-3xl rounded-lg border border-white/10">
              <button 
                onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]); }} 
                className="w-10 h-10 flex items-center justify-center bg-white/5 rounded hover:bg-white/10 transition-all text-white/40"
              >
                <ChevronDown className="rotate-90 w-4 h-4" />
              </button>
              <div className="px-4 text-center">
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="bg-transparent border-none outline-none text-sm font-display font-bold text-white w-32 cursor-pointer text-center uppercase" 
                />
              </div>
              <button 
                onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }} 
                className="w-10 h-10 flex items-center justify-center bg-white/5 rounded hover:bg-white/10 transition-all text-white/40"
              >
                <ChevronDown className="-rotate-90 w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics - Tonal Surfaces */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
        {/* Present Card */}
        <div className="relative p-6 bg-white/5 rounded-lg group transition-all duration-500 hover:bg-white/10">
          <div className="flex justify-between items-start mb-6">
            <div className="w-8 h-8 flex items-center justify-center text-lime">
              <CheckCircle2 size={24} />
            </div>
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">In Field</span>
          </div>
          <h3 className="text-4xl font-display font-bold text-white tracking-tighter">{presentCount}</h3>
          <p className="text-[8px] font-bold text-lime mt-1 uppercase tracking-widest">PRESENT PERSONNEL</p>
        </div>

        {/* Absent Card */}
        <div className="relative p-6 bg-white/5 rounded-lg group transition-all duration-500 hover:bg-white/10">
          <div className="flex justify-between items-start mb-6">
            <div className="w-8 h-8 flex items-center justify-center text-rose-500">
              <X size={24} />
            </div>
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Offline</span>
          </div>
          <h3 className="text-4xl font-display font-bold text-white tracking-tighter">{players.length - presentCount}</h3>
          <p className="text-[8px] font-bold text-rose-500/60 mt-1 uppercase tracking-widest">MISSING UNITS</p>
        </div>

        {/* Total Card */}
        <div className="relative p-6 bg-white/5 rounded-lg group transition-all duration-500 hover:bg-white/10">
          <div className="flex justify-between items-start mb-6">
            <div className="w-8 h-8 flex items-center justify-center text-white/20">
              <Users size={24} />
            </div>
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Capacity</span>
          </div>
          <h3 className="text-4xl font-display font-bold text-white tracking-tighter">{players.length}</h3>
          <p className="text-[8px] font-bold text-white/30 mt-1 uppercase tracking-widest">TOTAL ROSTER</p>
        </div>

        {/* MVP Spotlight */}
        <div className={`relative p-6 rounded-lg transition-all duration-700 ${
          motmPlayer ? 'bg-gradient-to-br from-lime/20 to-surface-bright ring-1 ring-lime/30' : 'bg-white/5 border border-dashed border-white/10'
        }`}>
          {motmPlayer ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <Trophy size={20} className="text-lime" />
                <span className="text-[8px] font-black text-lime uppercase tracking-widest">MVP ACTIVE</span>
              </div>
              <h3 className="text-xl font-display font-bold text-white tracking-tight uppercase truncate">{motmPlayer.fullName.split(' ')[0]}</h3>
              <p className="text-[8px] font-bold text-white/40 mt-1 uppercase tracking-widest">SESSION LEAD</p>
            </>
          ) : (
            <div className="h-full flex flex-col justify-center items-center opacity-20">
              <span className="text-[8px] font-black uppercase tracking-widest">Assignment Pending</span>
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

      {/* Roster Controls - HUD Filter Strip */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 flex items-center justify-center bg-white/10 rounded rotate-45 border border-white/10">
            <Search size={14} className="-rotate-45 text-lime" />
          </div>
          <h3 className="font-display font-bold text-white text-lg tracking-tight uppercase italic">IDENTITY <span className="text-lime">FILTER</span></h3>
        </div>
        
        <div className="flex-1 flex flex-wrap lg:flex-nowrap items-center gap-2 max-w-4xl">
          <div className="relative flex-1 min-w-[200px]">
            <input 
              type="text" 
              placeholder="GENETIC_SCANR (Search)..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded px-6 py-3 text-[10px] font-bold text-white uppercase tracking-widest italic outline-none focus:bg-white/10 focus:ring-1 focus:ring-lime transition-all" 
            />
          </div>
          
          <div className="flex bg-white/5 p-1 rounded border border-white/10">
            {['ALL', 'PRESENT', 'ABSENT'].map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`text-[8px] font-bold px-5 py-2 rounded uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-lime text-black font-extrabold active-selection' : 'text-white/40 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative group">
            <select 
              value={venueFilter} 
              onChange={e => setVenueFilter(e.target.value)} 
              className="bg-white/5 border border-white/10 rounded py-3 px-6 text-[9px] font-bold text-white/60 uppercase tracking-widest outline-none cursor-pointer appearance-none pr-10 hover:bg-white/10 transition-all font-display"
            >
              <option value="all">SQUARE_DEPOT (All Venues)</option>
              {[...new Set(players.map(p => p.venue))].filter(Boolean).map(v => <option key={v as string} value={v as string} className="bg-surface-high">{String(v).toUpperCase()}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20" size={12} />
          </div>
        </div>
      </div>

        {/* Roster Grid - Tactical Athlete Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xxl:grid-cols-6 gap-2 pb-20 animate-fade-in">
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
  );
};
