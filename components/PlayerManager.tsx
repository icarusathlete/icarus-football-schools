import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, User } from '../types';
import { 
    Search, Edit2, Trash2, Save, X, User as UserIcon, 
    Phone, MapPin, Layers, Map, Filter, Camera, 
    Shield, Check, Key, Activity, Users, History, 
    Zap, ChevronRight, MoreVertical, Target,
    Database, CheckCircle2, Download
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { PlayerPerformanceModal } from './PlayerPerformanceModal';

// ─── Design Helpers (Elite Standard) ──────────────────────────────────────────

function ageGroup(dob: string) {
  if (!dob) return 'U12';
  const a = new Date().getFullYear() - new Date(dob).getFullYear();
  if (a <= 8) return 'U8';
  if (a <= 10) return 'U10';
  return 'U12';
}

function initials(name: string) {
  const p = name.trim().split(' ');
  return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
}

function nameColor(name: string) {
  const palette = ['#CCFF00', '#60a5fa', '#f59e0b', '#4ade80', '#a78bfa', '#f87171', '#22d3ee'];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

export const PlayerManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'players' | 'coaches'>('players');

  // Helper classes for consistent styling
  const getInputClass = (type?: string) => `w-full p-6 bg-white/5 border border-white/10 rounded-2xl text-[13px] font-black text-white italic outline-none focus:border-brand-accent/40 focus:bg-white/10 transition-all placeholder:text-white/20 uppercase tracking-[0.1em] shadow-inner ${type === 'newItem' ? 'h-[60px]' : ''}`;
  const getSelectClass = () => "w-full p-6 bg-white/5 border border-white/10 rounded-2xl text-[13px] font-black text-white italic outline-none focus:border-brand-accent/40 focus:bg-white/10 transition-all appearance-none uppercase tracking-[0.1em] cursor-pointer";

  
  const [players, setPlayers] = useState<Player[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [filteredCoaches, setFilteredCoaches] = useState<User[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVenue, setFilterVenue] = useState('ALL');
  const [filterBatch, setFilterBatch] = useState('ALL');

  // Edit State
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingPerformance, setViewingPerformance] = useState<Player | null>(null);
  const [editingCoach, setEditingCoach] = useState<User | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{item: Player | User, type: 'player' | 'coach'} | null>(null);

  // Stats for Hero Grid
  const [stats, setStats] = useState({
    totalPlayers: 0,
    newThisMonth: 0,
    activeCoaches: 0,
    venuesCount: 0
  });

  useEffect(() => {
    loadData();
    
    // Listen for data updates from other components
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, []);

  useEffect(() => {
    filterData();
  }, [players, coaches, searchTerm, filterVenue, filterBatch, activeTab]);

  const loadData = async () => {
    const allPlayers = StorageService.getPlayers();
    setPlayers(allPlayers);
    const allUsers = await StorageService.getUsers();
    const activeStaff = allUsers.filter(u => u.role?.toLowerCase() === 'coach');
    setCoaches(activeStaff);
    const currentVenues = StorageService.getVenues();
    setVenues(currentVenues);
    setBatches(StorageService.getBatches());

    // Calculate Hero Stats
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const newJoiners = allPlayers.filter(p => (p.registeredAt || '').startsWith(thisMonth)).length;

    setStats({
        totalPlayers: allPlayers.length,
        newThisMonth: newJoiners,
        activeCoaches: activeStaff.length,
        venuesCount: currentVenues.length
    });
  };

  const filterData = () => {
    const lower = searchTerm.toLowerCase();

    if (activeTab === 'players') {
        let result = players;
        if (searchTerm) {
            result = result.filter(p => 
                p.fullName.toLowerCase().includes(lower) || 
                p.memberId.toLowerCase().includes(lower)
            );
        }
        if (filterVenue !== 'ALL') result = result.filter(p => p.venue === filterVenue);
        if (filterBatch !== 'ALL') result = result.filter(p => p.batch === filterBatch);
        setFilteredPlayers(result);
    } else {
        let result = [...coaches];
        
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(c => 
                (c.fullName?.toLowerCase().includes(lower)) ||
                (c.username?.toLowerCase().includes(lower)) ||
                (c.email?.toLowerCase().includes(lower))
            );
        }
        
        if (filterVenue !== 'ALL') {
            result = result.filter(c => c.assignedVenues?.includes(filterVenue));
        }
        
        if (filterBatch !== 'ALL') {
            result = result.filter(c => c.assignedBatches?.includes(filterBatch));
        }
        
        // Prioritize Abhishek Begal
        const prioritized = [...result].sort((a, b) => {
            const nameA = (a.fullName || a.username || '').toLowerCase();
            const nameB = (b.fullName || b.username || '').toLowerCase();
            
            const isAAbhishek = nameA.includes('abhishek') && nameA.includes('begal');
            const isBAbhishek = nameB.includes('abhishek') && nameB.includes('begal');
            
            if (isAAbhishek && !isBAbhishek) return -1;
            if (!isAAbhishek && isBAbhishek) return 1;
            
            return nameA.localeCompare(nameB);
        });
        
        setFilteredCoaches(prioritized);
    }
};

  const handleSecureDelete = (item: Player | User, type: 'player' | 'coach') => {
      setItemToDelete({ item, type });
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!itemToDelete) return;
      const { item, type } = itemToDelete;
      try {
          if (type === 'player') await StorageService.deletePlayer(item.id);
          else await StorageService.deleteUser(item.id);
          loadData();
          setDeleteModalOpen(false);
          setItemToDelete(null);
      } catch (error: any) { alert(`Failed to delete: ${error.message}`); }
  };

  const openEditModal = (item: Player | User, type: 'player' | 'coach') => {
      setPreviewUrl(item.photoUrl || null);
      if (type === 'player') setEditingPlayer({ ...item as Player });
      else setEditingCoach({ ...item as User });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setPreviewUrl(reader.result as string);
              if (editingPlayer) setEditingPlayer({ ...editingPlayer, photoUrl: reader.result as string });
              if (editingCoach) setEditingCoach({ ...editingCoach, photoUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  const savePlayerChanges = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingPlayer) {
          StorageService.updatePlayer(editingPlayer);
          loadData();
          setEditingPlayer(null);
          setPreviewUrl(null);
      }
  };

  const saveCoachChanges = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingCoach) {
          StorageService.updateUser(editingCoach);
          loadData();
          setEditingCoach(null);
          setPreviewUrl(null);
      }
  };

  const toggleCoachAssignment = (type: 'venue' | 'batch', value: string) => {
      if (!editingCoach) return;
      if (type === 'venue') {
          const current = editingCoach.assignedVenues || [];
          const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
          setEditingCoach({ ...editingCoach, assignedVenues: updated });
      } else {
          const current = editingCoach.assignedBatches || [];
          const updated = current.includes(value) ? current.filter(b => b !== value) : [...current, value];
          setEditingCoach({ ...editingCoach, assignedBatches: updated });
      }
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-700 font-display">
      {/* Functional Header */}
      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      {/* ── Hero Section ───────────────────────────────────────────────────── */}
      <div className="glass-card p-8 md:p-12 rounded-[3.5rem] border border-white/20 shadow-[0_20px_50px_rgba(13,27,138,0.3)] relative overflow-hidden group ring-1 ring-white/10">
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none select-none group-hover:opacity-[0.1] transition-opacity duration-700">
          <Users size={320} className="text-white -mr-16 -mt-16" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10 mb-12">
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl font-black italic text-white uppercase tracking-tighter leading-none">
                SQUAD <span className="premium-gradient-text">MANAGEMENT</span>
              </h1>
              <div className="flex items-center gap-4">
                  <span className="w-12 h-[1px] bg-brand-accent/40"></span>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.5em] italic">
                      ACADEMY ROSTER · PERSONNEL COORDINATION
                  </p>
              </div>
            </div>

            <div className="flex gap-1.5 bg-black/30 p-2 rounded-[2rem] border border-white/10 backdrop-blur-2xl shadow-inner">
                <button 
                    onClick={() => setActiveTab('players')}
                    className={`px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 italic flex items-center gap-3 ${activeTab === 'players' ? 'bg-brand-accent text-brand-950 shadow-[0_15px_40px_rgba(195,246,41,0.3)] scale-[1.02]' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                >
                    <Users size={14} /> PLAYERS
                </button>
                <button 
                    onClick={() => setActiveTab('coaches')}
                    className={`px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 italic flex items-center gap-3 ${activeTab === 'coaches' ? 'bg-white/10 text-white shadow-[0_15px_40px_rgba(255,255,255,0.1)] scale-[1.02]' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                >
                    <Shield size={14} /> COMMAND STAFF
                </button>
            </div>
          </div>

          {/* KPI Grid Integration */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Roster', value: stats.totalPlayers, sub: 'Active Assets', icon: <Users size={16} />, color: '#CCFF00' },
              { label: 'New Joiners', value: stats.newThisMonth, sub: 'This Month', icon: <Zap size={16} />, color: stats.newThisMonth > 0 ? '#4ade80' : 'rgba(255,255,255,0.4)' },
              { label: 'Command staff', value: stats.activeCoaches, sub: 'Active Personnel', icon: <Shield size={16} />, color: '#60a5fa' },
              { label: 'OPERATIONAL SECTORS', value: stats.venuesCount, sub: 'Active Venues', icon: <MapPin size={16} />, color: '#f59e0b' }
            ].map((k, i) => (
              <div key={i} className="bg-black/40 border border-white/[0.08] p-6 rounded-[2rem] group/kpi hover:bg-black/60 hover:border-white/20 transition-all duration-500 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.25em] italic">{k.label}</p>
                  <div style={{ color: k.color }} className="opacity-60 group-hover/kpi:opacity-100 transition-opacity translate-x-1 -translate-y-1">
                    {k.icon}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black italic leading-none tracking-tighter text-white group-hover/kpi:text-brand-accent transition-colors duration-500">{k.value}</p>
                </div>
                <p className="text-[10px] font-black italic text-white/20 mt-3 uppercase tracking-widest">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Strategic Filters ────────────────────────────────────────────────── */}
      <div className="glass-card p-4 rounded-[2.5rem] border border-white/10 backdrop-blur-xl flex flex-col lg:flex-row gap-4 items-center shadow-2xl relative overflow-hidden ring-1 ring-white/5 mx-1">
          <div className="absolute top-0 left-0 w-64 h-64 bg-brand-accent/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative flex-1 w-full group/input">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-brand-accent group-hover/input:text-white/40 transition-all w-4 h-4" />
              <input 
                type="text" 
                placeholder={`ENTER ASSET IDENTIFIER OR NAME...`} 
                className="w-full pl-14 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-[12px] font-black text-white italic outline-none focus:border-brand-accent/40 focus:bg-white/10 transition-all placeholder:text-white/15 uppercase tracking-[0.15em]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {[
                { label: 'Sectors', icon: MapPin, val: filterVenue, set: setFilterVenue, opts: venues, color: 'text-brand-accent' },
                { label: 'Divisions', icon: Layers, val: filterBatch, set: setFilterBatch, opts: batches, color: 'text-brand-primary' }
              ].map((f, i) => (
                  <div key={i} className="relative group/select min-w-[180px]">
                      <f.icon size={12} className={`absolute left-5 top-1/2 -translate-y-1/2 text-white/25 group-hover/select:${f.color} transition-colors duration-500 z-10`} />
                      <select 
                        className="w-full pl-11 pr-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-white italic outline-none focus:border-brand-accent/40 focus:bg-white/10 transition-all appearance-none uppercase tracking-[0.1em] cursor-pointer"
                        value={f.val}
                        onChange={(e) => f.set(e.target.value)}
                      >
                          <option value="ALL" className="bg-brand-950">ALL {f.label.toUpperCase()}</option>
                          {f.opts.map(v => <option key={v.id} value={v.name} className="bg-brand-950">{v.name}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/15 group-hover/select:text-white/40 transition-all">
                          <ChevronRight size={12} className="rotate-90" />
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* ── Player Roster ──────────────────────────────────────────────────── */}
      {activeTab === 'players' && (
        <div className="space-y-6">
          {/* Desktop Matrix */}
          <div className="hidden md:block overflow-hidden rounded-[2.5rem] border border-white/10 glass-card shadow-2xl ring-1 ring-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.05] bg-black/20">
                  {['PLAYER PROFILE', 'UID', 'AGE GROUP', 'SECTOR / DIVISION', 'COMMANDER / CONTACT', 'ACTIONS'].map((h, i) => (
                    <th key={i} className={`px-8 py-6 text-[9px] font-black text-white/40 uppercase tracking-[0.25em] italic ${i === 5 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredPlayers.length > 0 ? filteredPlayers.map((player) => (
                    <tr key={player.id} className="group hover:bg-white/[0.04] transition-all duration-300">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500"
                            style={{ background: nameColor(player.fullName || 'P'), color: '#000' }}>
                            {initials(player.fullName || 'P')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-white uppercase tracking-tight italic truncate">{player.fullName || 'UNKNOWN PLAYER'}</p>
                            <p className="text-[9px] font-bold text-brand-accent uppercase tracking-[0.15em] mt-1 flex items-center gap-1.5 opacity-60">
                                <Activity size={10} /> {player.playerRole || 'SQUAD'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                          <span className="text-[10px] font-mono font-bold text-white/30 tracking-[0.2em] uppercase bg-black/30 px-2.5 py-1 rounded-lg border border-white/[0.05]">
                              {player.id.slice(0, 8)}
                          </span>
                      </td>
                      <td className="px-8 py-5">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20">
                            <span className="text-[10px] font-black text-brand-primary uppercase italic">{ageGroup(player.dateOfBirth)}</span>
                          </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 group/venue">
                                <MapPin size={10} className="text-brand-accent/60" />
                                <span className="text-[11px] font-black text-white/80 uppercase italic tracking-wider">{player.venue}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Layers size={10} className="text-brand-primary/60" />
                                <span className="text-[10px] font-bold text-white/40 uppercase italic tracking-widest">{player.batch}</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[11px] font-black text-white/80 uppercase italic leading-none">{player.parentFirstName} {player.parentLastName}</p>
                        <div className="flex items-center gap-2 mt-2 opacity-40">
                            <Phone size={10} />
                            <p className="text-[10px] font-bold tracking-widest">{player.contactNumber}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                          <div className="flex items-center justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                              <button 
                                onClick={() => setViewingPerformance(player)}
                                className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-brand-accent hover:bg-brand-accent/10 hover:border-brand-accent/30 flex items-center justify-center transition-all shadow-xl"
                                title="Performance Metrics"
                              >
                                  <Target size={16} />
                              </button>
                              <button 
                                onClick={() => openEditModal(player, 'player')}
                                className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 flex items-center justify-center transition-all shadow-xl"
                                title="Edit Profile"
                              >
                                  <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleSecureDelete(player, 'player')}
                                className="w-10 h-10 bg-red-500/5 border border-red-500/10 rounded-xl text-red-500/20 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center transition-all shadow-xl"
                                title="Terminate Record"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </td>
                    </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-40 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-10">
                        <Users size={64} className="text-white" />
                        <p className="text-sm font-black uppercase tracking-[0.5em] text-white italic">NO SQUAD PERSONNEL DETECTED</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Force Units */}
          <div className="md:hidden space-y-5">
            {filteredPlayers.map((player) => (
                <div key={player.id} className="glass-card p-7 rounded-[2.5rem] border border-white/20 relative overflow-hidden group shadow-2xl">
                  <div className="absolute -top-10 -right-10 opacity-[0.05] pointer-events-none select-none group-hover:opacity-[0.1] transition-opacity duration-700">
                    <Users size={160} className="text-white" />
                  </div>
                  
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-accent to-green-500 flex items-center justify-center text-brand-950 text-xl font-black italic shadow-[0_10px_25px_rgba(195,246,41,0.3)]">
                          {(player.fullName || 'P')[0]}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{player.fullName || 'UNKNOWN PLAYER'}</h3>
                          <p className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em] italic mt-2 opacity-90 flex items-center gap-1.5">
                              <Activity size={10} /> {player.playerRole || 'SQUAD'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl">
                          <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.1em]">{player.id.slice(0, 8)}</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {[
                      { l: 'SECTOR', v: player.venue, c: 'text-white', i: MapPin },
                      { l: 'DIVISION', v: player.batch, c: 'text-brand-primary', i: Layers },
                      { l: 'COMMANDER', v: player.parentFirstName, c: 'text-white/80', i: UserIcon },
                      { l: 'FREQUENCY', v: player.contactNumber, c: 'text-white/40', i: Phone }
                    ].map((item, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <item.i size={10} className="text-white/20" />
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{item.l}</p>
                        </div>
                        <p className={`text-[11px] font-black uppercase italic truncate ${item.c}`}>{item.v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                      <button 
                        onClick={() => setViewingPerformance(player)}
                        className="flex-1 py-4 bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-white/50 uppercase tracking-[0.2em] italic hover:bg-brand-accent/20 hover:text-brand-accent transition-all"
                      >
                          METRICS
                      </button>
                      <button 
                        onClick={() => openEditModal(player, 'player')}
                        className="flex-1 py-4 bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-white/50 uppercase tracking-[0.2em] italic hover:bg-white/20 hover:text-white transition-all"
                      >
                          MODIFY
                      </button>
                      <button 
                         onClick={() => handleSecureDelete(player, 'player')}
                         className="px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500/60 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                      >
                          <Trash2 size={16} />
                      </button>
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Coaching Staff ────────────────────────────────────────────────── */}
      {activeTab === 'coaches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCoaches.length > 0 ? filteredCoaches.map((coach) => (
            <div key={coach.id} className="glass-card rounded-[3rem] border border-white/20 overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 shadow-xl relative">
              <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none select-none group-hover:opacity-[0.1] transition-opacity duration-700">
                <Shield size={180} className="text-white" />
              </div>
              
              <div className="p-10 relative z-10 flex flex-col h-full">
                <div className="flex flex-col items-center text-center mb-10">
                  <div className="relative mb-6">
                      <div className="absolute -inset-1 bg-gradient-to-br from-brand-accent to-green-500 rounded-[2.5rem] opacity-20 blur-sm group-hover:opacity-40 transition-opacity"></div>
                      <div className="w-24 h-24 rounded-[2.2rem] bg-brand-900 border-2 border-white/20 flex items-center justify-center text-brand-950 text-4xl font-black italic relative z-10 overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent to-green-400"></div>
                        <span className="relative z-10">{coach.username?.[0] || 'C'}</span>
                      </div>
                      <div className="absolute -bottom-2 right-0 w-8 h-8 rounded-full bg-brand-950 border-2 border-brand-accent flex items-center justify-center text-brand-accent shadow-lg animate-pulse">
                          <Zap size={12} fill="currentColor" />
                      </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none mb-3 group-hover:text-brand-accent transition-colors">{coach.username}</h3>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/20 border border-brand-primary/30">
                      <Shield size={10} className="text-brand-primary" />
                      <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] italic">{coach.role || 'COMMANDER'}</span>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="space-y-3">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] italic text-white/40 px-1">
                          <span>SECTOR ASSIGNMENTS</span>
                          <MapPin size={10} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {coach.assignedVenues && coach.assignedVenues.length > 0 ? coach.assignedVenues.map(v => (
                            <span key={v} className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold text-white/80 uppercase italic tracking-wider">
                              {v}
                            </span>
                          )) : (
                            <span className="text-[10px] font-bold text-white/20 italic p-2 border border-white/10 border-dashed rounded-xl w-full text-center uppercase tracking-widest">No Sectors Assigned</span>
                          )}
                      </div>
                  </div>
                  
                  <div className="space-y-3">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] italic text-white/40 px-1">
                          <span>DIVISION OPERATIONS</span>
                          <Layers size={10} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                          {coach.assignedBatches && coach.assignedBatches.length > 0 ? coach.assignedBatches.map(b => (
                            <span key={b} className="px-4 py-2 bg-brand-accent/20 border border-brand-accent/30 rounded-xl text-[10px] font-bold text-brand-accent uppercase italic tracking-wider">
                              {b}
                            </span>
                          )) : (
                            <span className="text-[10px] font-bold text-white/20 italic p-2 border border-white/10 border-dashed rounded-xl w-full text-center uppercase tracking-widest">No Divisions Active</span>
                          )}
                      </div>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/10 flex gap-4">
                   <button 
                    onClick={() => openEditModal(coach, 'coach')} 
                    className="flex-1 py-4 rounded-[1.5rem] bg-white/10 border border-white/10 text-[10px] font-black text-white/60 uppercase tracking-[0.2em] italic hover:bg-white/20 hover:border-white/20 hover:text-white transition-all"
                   >
                      RECALIBRATE
                   </button>
                   <button 
                    onClick={() => handleSecureDelete(coach, 'coach')} 
                    className="px-6 py-4 bg-red-500/10 border border-red-500/20 text-red-500/60 rounded-[1.5rem] hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-xl"
                   >
                      <Trash2 size={16} />
                   </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-40 text-center">
               <div className="flex flex-col items-center gap-6 opacity-20">
                  <Shield size={80} className="text-white" />
                  <p className="text-sm font-black uppercase tracking-[0.5em] text-white italic">NO COMMAND PERSONNEL DETECTED</p>
                </div>
            </div>
          )}
        </div>
      )}

      {/* --- SYSTEM MODALS ── */}
      {editingPlayer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
              <div className="absolute inset-0 bg-[#050714]/80 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => setEditingPlayer(null)}></div>
              <div className="w-full max-w-2xl glass-card rounded-[3rem] border border-white/20 shadow-[0_40px_100px_rgba(13,27,138,0.5)] overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-in zoom-in slide-in-from-bottom-5 duration-500">
                  <div className="p-8 md:p-10 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                      <div>
                        <h3 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">DATA <span className="premium-gradient-text">RECALIBRATION</span></h3>
                        <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2"><Zap size={10} className="text-brand-accent" /> PLAYER PROFILE MODIFICATION UNIT</p>
                      </div>
                      <button onClick={() => setEditingPlayer(null)} className="w-14 h-14 bg-white/10 rounded-2xl text-white/60 hover:text-brand-accent hover:bg-brand-accent/10 flex items-center justify-center border border-white/10 hover:border-brand-accent/20 transition-all duration-300 group">
                          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                      </button>
                  </div>
                  
                  <form onSubmit={savePlayerChanges} className="p-8 md:p-12 space-y-10 overflow-y-auto custom-scrollbar text-left flex-1">
                      <div className="flex justify-center">
                          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <div className="absolute -inset-2 bg-gradient-to-br from-brand-accent to-brand-primary rounded-[3rem] opacity-20 group-hover:opacity-40 transition-opacity blur-xl"></div>
                              <div className="relative w-40 h-40 rounded-[2.5rem] overflow-hidden border-4 border-white/20 z-10">
                                  <img src={previewUrl || editingPlayer.photoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                  <div className="absolute inset-0 bg-brand-950/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                      <Camera className="text-brand-accent" size={36} />
                                      <span className="text-[10px] font-black text-white uppercase mt-2 italic">UPLOAD IMAGE</span>
                                  </div>
                              </div>
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                          {[
                            { label: 'UNIT IDENTIFICATION (UID)', val: editingPlayer.memberId, readOnly: true },
                            { label: 'ASSET DESIGNATION', val: editingPlayer.fullName, key: 'fullName', type: 'text' },
                            { label: 'OPERATIONAL SECTOR', val: editingPlayer.venue, key: 'venue', type: 'select', opts: venues },
                            { label: 'TACTICAL DIVISION', val: editingPlayer.batch, key: 'batch', type: 'select', opts: batches },
                            { label: 'COMBAT POSITION', val: editingPlayer.position, key: 'position', type: 'select', opts: ['Forward','Midfielder','Defender','Goalkeeper','TBD'] },
                            { label: 'COMMS FREQUENCY', val: editingPlayer.contactNumber, key: 'contactNumber', type: 'text' },
                            { label: 'DIGITAL ADDRESS', val: editingPlayer.email || '', key: 'email', type: 'email' },
                            { label: 'GENESIS DATE (DOB)', val: editingPlayer.dateOfBirth, key: 'dateOfBirth', type: 'date' },
                            { label: 'PRIME GUARDIAN', val: editingPlayer.parentName, key: 'parentName', type: 'text' }
                          ].map((field, idx) => (
                            <div key={idx} className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] italic ml-1">{field.label}</label>
                                {field.type === 'select' ? (
                                  <div className="relative group">
                                    <select 
                                      className={getSelectClass()}
                                      value={field.val}
                                      onChange={e => setEditingPlayer({...editingPlayer, [field.key]: e.target.value})}
                                    >
                                      <option value="" className="bg-brand-950">UNASSIGNED</option>
                                      {field.opts.map((opt:any) => <option key={typeof opt === 'string' ? opt : opt.id} value={typeof opt === 'string' ? opt : opt.name} className="bg-brand-950">{typeof opt === 'string' ? opt : opt.name}</option>)}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 group-hover:text-brand-accent transition-colors">
                                        <ChevronRight className="rotate-90" size={16} />
                                    </div>
                                  </div>
                                ) : (
                                  <input 
                                    type={field.type}
                                    readOnly={field.readOnly}
                                    placeholder={`ENTER ${field.label.split('(')[0].trim()}`}
                                    className={`${getInputClass()} ${field.readOnly ? 'opacity-40 cursor-not-allowed bg-transparent' : ''}`}
                                    value={field.val}
                                    onChange={e => !field.readOnly && setEditingPlayer({...editingPlayer, [field.key]: e.target.value})}
                                  />
                                )}
                            </div>
                          ))}
                          <div className="space-y-3 md:col-span-2">
                              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] italic ml-1">HQ RESIDENCY (ADDRESS)</label>
                              <textarea 
                                className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl text-[13px] font-black text-white italic outline-none focus:border-brand-accent/40 focus:bg-white/10 transition-all min-h-[100px] uppercase tracking-widest placeholder:text-white/20" 
                                placeholder="ENTER FULL GEO-LOCATION DATA"
                                value={editingPlayer.address || ''} 
                                onChange={e => setEditingPlayer({...editingPlayer, address: e.target.value})} 
                              />
                          </div>
                      </div>
                  </form>
                  
                  <div className="p-8 md:p-10 border-t border-white/10 bg-white/5 shrink-0">
                      <button onClick={savePlayerChanges} className="w-full py-6 bg-gradient-to-r from-brand-accent to-green-400 text-brand-950 font-black rounded-2xl uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(195,246,41,0.2)] hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(195,246,41,0.3)] active:scale-[0.98] transition-all duration-300 text-xs italic">SYNC OPERATIONAL DATA</button>
                  </div>
              </div>
          </div>
      )}

      {editingCoach && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
               <div className="absolute inset-0 bg-[#050714]/80 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => setEditingCoach(null)}></div>
               <div className="w-full max-w-2xl glass-card rounded-[3rem] border border-white/20 shadow-[0_40px_100px_rgba(13,27,138,0.5)] overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-in zoom-in slide-in-from-bottom-5 duration-500">
                  <div className="p-8 md:p-10 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent shadow-glow">
                           <Shield size={28} />
                        </div>
                        <div>
                          <h3 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter leading-none">COMMANDER <span className="premium-gradient-text">RECORDS</span></h3>
                          <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em] mt-2 italic">OFFICIAL CREDENTIALS MANAGEMENT</p>
                        </div>
                      </div>
                      <button onClick={() => setEditingCoach(null)} className="w-14 h-14 bg-white/10 rounded-2xl text-white/60 hover:text-brand-accent hover:bg-brand-accent/10 flex items-center justify-center border border-white/10 hover:border-brand-accent/20 transition-all duration-300 group">
                          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                      </button>
                  </div>

                  <form onSubmit={saveCoachChanges} className="p-8 md:p-12 space-y-12 overflow-y-auto custom-scrollbar text-left flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] italic ml-1">LOGIN IDENTIFIER</label>
                           <input required className={getInputClass()} value={editingCoach.username} onChange={e => setEditingCoach({...editingCoach, username: e.target.value})} />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-red-500/50 uppercase tracking-[0.25em] italic ml-1">SECURITY ACCESS SHA (PASSWORD)</label>
                           <input required className="w-full p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-white font-mono text-xs outline-none focus:border-red-500/40 transition-all" value={editingCoach.password} onChange={e => setEditingCoach({...editingCoach, password: e.target.value})} />
                        </div>
                      </div>

                      <div className="space-y-12">
                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                              <label className="text-[11px] font-black text-white/80 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                  <MapPin size={18} className="text-brand-accent" /> SECTOR ASSIGNMENTS
                              </label>
                              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.1em]">{editingCoach.assignedVenues?.length || 0} ACTIVE</span>
                           </div>
                           <div className="flex flex-wrap gap-3">
                              {venues.map(v => (
                                <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic border-2 transition-all duration-300 ${editingCoach.assignedVenues?.includes(v.name) ? 'bg-brand-accent text-brand-950 border-brand-accent shadow-[0_15px_30px_rgba(195,246,41,0.2)] scale-[1.05]' : 'bg-white/10 text-white/40 border-white/10 hover:border-white/20'}`}>{v.name}</button>
                              ))}
                           </div>
                        </div>

                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                              <label className="text-[11px] font-black text-white/80 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                  <Layers size={18} className="text-brand-accent" /> DIVISION OPERATIONS
                              </label>
                              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.1em]">{editingCoach.assignedBatches?.length || 0} ACTIVE</span>
                           </div>
                           <div className="flex flex-wrap gap-3">
                              {batches.map(b => (
                                <button key={b.id} type="button" onClick={() => toggleCoachAssignment('batch', b.name)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic border-2 transition-all duration-300 ${editingCoach.assignedBatches?.includes(b.name) ? 'bg-brand-primary text-white border-brand-primary shadow-[0_15px_30px_rgba(59,130,246,0.2)] scale-[1.05]' : 'bg-white/10 text-white/40 border-white/10 hover:border-white/20'}`}>{b.name}</button>
                              ))}
                           </div>
                        </div>
                      </div>
                  </form>

                  <div className="p-8 md:p-10 border-t border-white/10 bg-white/5 shrink-0">
                    <button onClick={saveCoachChanges} className="w-full py-6 bg-gradient-to-r from-brand-accent to-green-400 text-brand-950 font-black rounded-2xl uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(195,246,41,0.2)] hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(195,246,41,0.3)] active:scale-[0.98] transition-all duration-300 text-xs italic">SYNC COMMANDER CREDENTIALS</button>
                  </div>
               </div>
           </div>
      )}

      {viewingPerformance && <PlayerPerformanceModal player={viewingPerformance} onCancel={() => setViewingPerformance(null)} onUpdate={() => loadData()} />}
      
      <ConfirmModal isOpen={deleteModalOpen} title={`DELETE PLAYER`} message={`Are you sure you want to permanently delete this player? This action cannot be undone.`} onConfirm={confirmDelete} onCancel={() => {setDeleteModalOpen(false); setItemToDelete(null);}} requireTypeToConfirm="delete" />
    </div>
  );
};
