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

function lsWriteMotm(date: string, playerId: string | null) {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_MOTM_KEY) || '{}');
    if (playerId) stored[date] = playerId; else delete stored[date];
    localStorage.setItem(LS_MOTM_KEY, JSON.stringify(stored));
  } catch { /* silent */ }
}

// ─── Toggle button (iOS Sliding Style) ────────────────────────────
const ToggleButton = ({ isPresent, onClick }: { isPresent: boolean; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) => (
  <button type="button" onClick={onClick} aria-label={isPresent ? 'Mark absent' : 'Mark present'}
    className={`relative flex items-center w-12 h-6 rounded-full p-0.5 border overflow-hidden flex-shrink-0 cursor-pointer select-none transition-all duration-500 hover:scale-105 active:scale-95 ${isPresent ? 'border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.2)]'}`}>
    <span className={`absolute inset-0 transition-opacity duration-500 ${isPresent ? 'bg-emerald-500' : 'bg-rose-500'}`} />
    <span className={`relative z-10 w-4.5 h-4.5 rounded-full bg-white flex-shrink-0 flex items-center justify-center shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isPresent ? 'translate-x-6' : 'translate-x-0'}`}>
      {isPresent ? <CheckCircleIcon size={10} className="text-emerald-500" /> : <X size={10} className="text-rose-500" />}
    </span>
  </button>
);

// ─── Player card (Pocket View v20 — Compact Mode) ──────────────────
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
  // Decentralized state — EACH card owns its own status
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus);

  // Sync with prop when date or initialStatus changes (e.g. from parent/firestore)
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus, date]);

  const handleToggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); e.preventDefault();
    const nextStatus = status === AttendanceStatus.PRESENT ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
    
    // 1. Immediate UI update
    setStatus(nextStatus);
    
    // 2. Background persistence (Sync with Roster & Stats)
    onStatusChange(player.id, nextStatus);
  }, [player.id, status, onStatusChange]);

  const handleMotm = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); e.preventDefault();
    onSelectMotm(player.id);
  }, [player.id, onSelectMotm]);

  const isPresent = status === AttendanceStatus.PRESENT;

  return (
    <div className={`relative bg-white rounded-3xl border p-2 flex flex-col items-center gap-2 transition-all duration-300 ${
      isMotm ? 'border-amber-400 shadow-[0_4px_16px_rgba(251,191,36,0.3)]' : 
      isPresent ? 'border-emerald-300/60 shadow-[0_4px_12px_rgba(16,185,129,0.15)]' : 
      'border-brand-50'
    }`}>

      {/* MOTM crown ribbon (subtle indicator) */}
      {isMotm && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl bg-amber-400" />
      )}

      <div className="relative mt-0.5">
        <div 
          onClick={handleMotm} // Allow toggling MOTM by clicking photo too for convenience
          className={`w-14 h-14 rounded-2xl overflow-hidden border transition-all duration-500 cursor-pointer ${
          isMotm ? 'border-amber-400 scale-105 shadow-md' : 
          isPresent ? 'border-emerald-500' : 
          'border-brand-100 opacity-60'
        }`}>
          <img 
            src={player.photoUrl} 
            alt={player.fullName} 
            className={`w-full h-full object-cover transition-all duration-500 ${isPresent || isMotm ? 'grayscale-0 opacity-100' : 'grayscale opacity-50'}`} 
          />
        </div>
        {/* MVP Trophy Indicator */}
        {isMotm && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow-sm">
            <Trophy size={9} className="fill-white text-white" />
          </div>
        )}
      </div>

      <div className="text-center w-full min-w-0">
        <h4 className={`font-black text-[9px] uppercase italic tracking-tighter truncate leading-tight ${
          isMotm ? 'text-amber-600' : 
          isPresent ? 'text-emerald-700' : 
          'text-brand-950 opacity-70'
        }`}>
          {player.fullName.split(' ')[0]}
        </h4>
      </div>

      <ToggleButton isPresent={isPresent} onClick={handleToggle} />
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
  const [motmId, setMotmId] = useState<string | null>(() => lsReadMotm(todayStr));

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
    setMotmId(lsReadMotm(date));
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
          const storageStatus = fromStorage[p.id];
          const currentStatus = prev[p.id];
          
          // Only sync if: 
          // 1. Not toggled in last 3s
          // 2. Storage value differs from current local value
          if (now - (recentToggles.current[p.id] || 0) >= 3000) {
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
  const onStatusChange = useCallback((playerId: string, status: AttendanceStatus) => {
    // 1. Notify parent of stat change (functional update for safety)
    setLiveStatuses(prev => ({ ...prev, [playerId]: status }));
    
    // 2. Persistence Layer
    const record: AttendanceRecord = { id: `${date}_${playerId}`, playerId, date, status };
    lsWrite(record);
    StorageService.saveAttendanceBatch([record]);
  }, [date]);

  // MOTM selection — only one at a time, click same to deselect
  const onSelectMotm = useCallback((playerId: string) => {
    setMotmId(prev => {
      const next = prev === playerId ? null : playerId;
      lsWriteMotm(date, next);
      return next;
    });
  }, [date]);

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
    <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-brand-950 italic uppercase tracking-tighter flex items-center gap-4">
            DEPLOYMENT <span className="text-brand-500">LOG</span>
            <CalendarIcon size={30} className="text-brand-500 opacity-20" />
          </h1>
          <p className="text-brand-500 font-black uppercase text-[10px] tracking-[0.3em] mt-3 italic">Session Attendance · Live Sync</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-[2.5rem] border border-brand-100 shadow-xl">
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]); }} className="w-11 h-11 flex items-center justify-center bg-brand-50 rounded-full hover:bg-brand-950 hover:text-brand-500 transition-all active:scale-95"><ChevronDown className="rotate-90 w-4 h-4" /></button>
          <div className="px-4 text-center">
            <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest mb-1 italic">SESSION DATE</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none outline-none text-sm font-black text-brand-950 w-28 cursor-pointer text-center font-mono italic" />
          </div>
          <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]); }} className="w-11 h-11 flex items-center justify-center bg-brand-50 rounded-full hover:bg-brand-950 hover:text-brand-500 transition-all active:scale-95"><ChevronDown className="-rotate-90 w-4 h-4" /></button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Present */}
        <div className="bg-white p-6 rounded-[2rem] border border-brand-100 flex items-center justify-between shadow-md hover:border-emerald-400 transition-all">
          <div><p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-2 italic">PRESENT</p><h3 className="text-4xl font-black text-brand-950 italic">{presentCount}</h3></div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center"><CheckCircle2 size={24} /></div>
        </div>
        {/* Absent */}
        <div className="bg-white p-6 rounded-[2rem] border border-brand-100 flex items-center justify-between shadow-md hover:border-rose-400 transition-all">
          <div><p className="text-[9px] font-black text-rose-600 uppercase tracking-[0.3em] mb-2 italic">ABSENT</p><h3 className="text-4xl font-black text-brand-950 italic">{players.length - presentCount}</h3></div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center"><X size={24} /></div>
        </div>
        {/* Total */}
        <div className="bg-white p-6 rounded-[2rem] border border-brand-100 flex items-center justify-between shadow-md hover:border-brand-400 transition-all">
          <div><p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.3em] mb-2 italic">TOTAL</p><h3 className="text-4xl font-black text-brand-950 italic">{players.length}</h3></div>
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 border border-brand-100 flex items-center justify-center"><Users size={24} /></div>
        </div>

        {/* MVP Spotlight — 4th stat card, lights up when MOTM is selected */}
        <div className={`relative p-6 rounded-[2rem] border-2 flex items-center justify-between shadow-md transition-all duration-500 overflow-hidden ${motmPlayer ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-[0_4px_24px_-4px_rgba(251,191,36,0.4)]' : 'bg-white border-brand-100'}`}>
          {/* Background glow when active */}
          {motmPlayer && <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-yellow-300/5 pointer-events-none" />}
          <div className="relative min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.3em] italic">MAN OF THE MATCH</p>
            </div>
            {motmPlayer ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-lg font-black text-amber-800 italic uppercase tracking-tight truncate leading-tight">{motmPlayer.fullName.split(' ')[0]}</p>
                <span className="inline-flex items-center gap-1 mt-1 bg-amber-400 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                  <Trophy size={8} className="fill-white" /> MVP
                </span>
              </div>
            ) : (
              <p className="text-sm font-black text-brand-300 italic">Not selected</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${motmPlayer ? 'bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.6)] text-white animate-pulse' : 'bg-brand-50 text-brand-300 border border-brand-100'}`}>
            <Trophy size={22} className={motmPlayer ? 'fill-white' : ''} />
          </div>
        </div>
      </div>

      {/* RSVP row */}
      {(rsvps.attending.length + rsvps.declined.length + rsvps.pending.length > 0) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-center"><p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest italic mb-1">CONFIRMED</p><p className="text-2xl font-black text-emerald-800 italic">{rsvps.attending.length}</p></div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-center"><p className="text-[9px] font-black text-rose-700 uppercase tracking-widest italic mb-1">DECLINED</p><p className="text-2xl font-black text-rose-800 italic">{rsvps.declined.length}</p></div>
          <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100 text-center"><p className="text-[9px] font-black text-brand-600 uppercase tracking-widest italic mb-1">PENDING</p><p className="text-2xl font-black text-brand-800 italic">{rsvps.pending.length}</p></div>
        </div>
      )}

      {/* Roster */}
      <div className="space-y-5">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          <h3 className="font-black text-brand-950 text-xl uppercase italic tracking-tighter flex items-center gap-3 shrink-0">
            <Users size={22} className="text-brand-500" />SQUAD <span className="text-brand-500">ROSTER</span>
          </h3>
          <div className="flex-1 flex flex-wrap lg:flex-nowrap items-center gap-3 bg-white p-2 rounded-[2rem] border border-brand-100 shadow-lg min-w-0">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-400" />
              <input type="text" placeholder="Search personnel…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-brand-50 border border-brand-100 rounded-xl py-3 pl-12 pr-5 text-[10px] font-black uppercase italic tracking-widest outline-none focus:border-brand-500" />
            </div>
            <select value={venueFilter} onChange={e => setVenueFilter(e.target.value)} className="bg-brand-50 border border-brand-100 rounded-xl py-3 px-5 text-[10px] font-black uppercase italic tracking-widest outline-none cursor-pointer appearance-none">
              <option value="all">ALL VENUES</option>
              {[...new Set(players.map(p => p.venue))].filter(Boolean).map(v => <option key={v as string} value={v as string}>{(v as string).toUpperCase()}</option>)}
            </select>
            <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className="bg-brand-50 border border-brand-100 rounded-xl py-3 px-5 text-[10px] font-black uppercase italic tracking-widest outline-none cursor-pointer appearance-none">
              <option value="all">ALL BATCHES</option>
              {[...new Set(players.map(p => p.batch))].filter(Boolean).map(b => <option key={b as string} value={b as string}>{(b as string).toUpperCase()}</option>)}
            </select>
            <div className="flex bg-brand-50 p-1 rounded-xl border border-brand-100 shrink-0">
              {['ALL', 'PRESENT', 'ABSENT'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`text-[9px] font-black px-5 py-2.5 rounded-lg uppercase tracking-[0.2em] transition-all italic ${filter === f ? 'bg-brand-950 text-brand-500 shadow-lg' : 'text-brand-400 hover:text-brand-950'}`}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 pb-10">
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
          <div className="text-center py-20 border-2 border-dashed border-brand-100 rounded-[2rem]">
            <p className="text-brand-400 text-sm font-black uppercase tracking-widest italic">No personnel match the current filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
