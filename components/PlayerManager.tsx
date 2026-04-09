import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, User } from '../types';
import { 
    Search, Edit2, Trash2, Save, X, User as UserIcon, 
    Phone, MapPin, Layers, Map, Filter, Camera, 
    Shield, Check, Key, Activity, Users, History, 
    Zap, ChevronRight, MoreVertical, Target
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { PlayerPerformanceModal } from './PlayerPerformanceModal';

export const PlayerManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'players' | 'coaches'>('players');
  
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

  useEffect(() => {
    loadData();
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, []);

  useEffect(() => {
    filterData();
  }, [players, coaches, searchTerm, filterVenue, filterBatch, activeTab]);

  const loadData = () => {
    setPlayers(StorageService.getPlayers());
    const allUsers = StorageService.getUsers();
    setCoaches(allUsers.filter(u => u.role?.toLowerCase() === 'coach'));
    setVenues(StorageService.getVenues());
    setBatches(StorageService.getBatches());
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
        let result = coaches;
        if (searchTerm) {
            result = result.filter(c => c.username.toLowerCase().includes(lower));
        }
        if (filterVenue !== 'ALL') {
            result = result.filter(c => c.assignedVenues?.some(v => v === filterVenue));
        }
        if (filterBatch !== 'ALL') {
            result = result.filter(c => c.assignedBatches?.some(b => b === filterBatch));
        }
        setFilteredCoaches(result);
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-brand-900 p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Users size={120} className="text-white" /></div>
        <div className="relative z-10 space-y-2">
          <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none">
             Squad <span className="text-brand-primary font-black">Management</span>
          </h2>
        </div>
        
        <div className="flex bg-brand-950/80 p-2 rounded-[1.5rem] border border-white/10 shadow-2xl relative z-10 w-full lg:w-auto backdrop-blur-sm">
            <button 
                onClick={() => setActiveTab('players')}
                className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all italic flex-1 lg:flex-initial border border-transparent ${activeTab === 'players' ? 'bg-brand-primary text-brand-950 shadow-[0_0_20px_rgba(204,255,0,0.4)] scale-[1.02] border-brand-primary/20' : 'text-white hover:text-brand-primary bg-white/5 hover:bg-white/10'}`}
            >
                PLAYERS
            </button>
            <button 
                onClick={() => setActiveTab('coaches')}
                className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all italic flex-1 lg:flex-initial border border-transparent ${activeTab === 'coaches' ? 'bg-brand-primary text-brand-950 shadow-[0_0_20px_rgba(204,255,0,0.4)] scale-[1.02] border-brand-primary/20' : 'text-white hover:text-brand-primary bg-white/5 hover:bg-white/10'}`}
            >
                COACHES
            </button>
        </div>
      </div>

      {/* Mobile-Optimised Toolbar */}
      <div className="glass-card p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 bg-white border-slate-100 shadow-sm">
          <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors w-5 h-5" />
              <input 
                type="text" 
                placeholder={`Search players & coaches...`} 
                className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.25rem] outline-none focus:border-brand-primary transition-all text-[11px] font-black text-slate-900 placeholder:text-slate-400 italic uppercase tracking-widest shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              {['Locations', 'Batches'].map((label, i) => (
                  <div key={label} className="relative group min-w-[180px]">
                      {i === 0 ? <Map className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-500 w-4 h-4" /> : <Layers className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-500 w-4 h-4" />}
                      <select 
                        className="w-full pl-14 pr-12 py-5 bg-slate-50 border border-slate-200 rounded-[1.25rem] outline-none focus:border-brand-primary transition-all text-[10px] font-black text-slate-900 uppercase tracking-widest appearance-none cursor-pointer italic shadow-inner"
                        value={i === 0 ? filterVenue : filterBatch}
                        onChange={(e) => i === 0 ? setFilterVenue(e.target.value) : setFilterBatch(e.target.value)}
                      >
                          <option value="ALL">ALL {label.toUpperCase()}</option>
                          {(i === 0 ? venues : batches).map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                      </select>
                      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 rotate-90" />
                  </div>
              ))}
          </div>
      </div>

      {/* --- PLAYERS VIEW --- */}
      {activeTab === 'players' && (
          <div className="space-y-6">
              {/* Desktop Table View (LG+) */}
              <div className="hidden lg:block glass-card overflow-hidden bg-white border-slate-100 shadow-sm">
                  <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="italic">
                              <th className="px-10 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Player Details</th>
                              <th className="px-10 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Position & Contact</th>
                              <th className="px-10 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Venue & Batch</th>
                              <th className="px-10 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredPlayers.map(p => (
                              <tr key={p.id} className="hover:bg-slate-50/80 transition-all duration-300 group">
                                  <td className="px-10 py-8">
                                      <div className="flex items-center gap-6">
                                          <div className="relative">
                                              <img src={p.photoUrl} className="w-20 h-20 rounded-[1.5rem] bg-slate-100 object-cover border-2 border-slate-200 group-hover:border-brand-500 transition-all shadow-md" />
                                              {p.position === 'Goalkeeper' && <Shield size={14} className="absolute -top-2 -right-2 text-brand-500 animate-pulse" />}
                                          </div>
                                          <div>
                                              <div className="font-black text-slate-900 italic text-lg uppercase tracking-tight mb-1">{p.fullName}</div>
                                              <div className="inline-flex px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[9px] font-black text-brand-500 uppercase tracking-[0.2em]">{p.memberId}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-10 py-8">
                                      <div className="space-y-3">
                                          <div className="flex items-center gap-2 text-[10px] font-black text-brand-500 uppercase tracking-widest italic bg-brand-50 px-4 py-1.5 rounded-full border border-brand-100 w-fit">
                                              <Target size={12} /> {p.position === 'TBD' ? 'POSITION' : p.position}
                                          </div>
                                          <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase italic flex items-center gap-2"><Phone size={12}/> {p.contactNumber}</div>
                                      </div>
                                  </td>
                                  <td className="px-10 py-8">
                                      <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase italic"><MapPin size={12} className="text-brand-500" /> {p.venue}</div>
                                          <div className="flex items-center gap-2 text-[10px] font-black text-brand-500 uppercase italic"><Zap size={12} className="text-brand-500/40" /> {p.batch}</div>
                                      </div>
                                  </td>
                                  <td className="px-10 py-8 text-right">
                                      <div className="flex items-center justify-end gap-3">
                                          {[
                                              { icon: Activity, label: 'PERFORMANCE', color: 'bg-brand-500 text-white shadow-brand-500/20', action: () => setViewingPerformance(p) },
                                              { icon: Edit2, label: 'MODIFY', color: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-brand-500 shadow-sm', action: () => openEditModal(p, 'player') },
                                              { icon: Trash2, label: 'DELETE', color: 'bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white shadow-sm', action: () => handleSecureDelete(p, 'player') }
                                          ].map((btn, i) => (
                                              <button key={i} onClick={btn.action} className={`w-12 h-12 flex items-center justify-center rounded-2xl border border-transparent transition-all hover:scale-110 active:scale-95 shadow-md ${btn.color}`} title={btn.label}>
                                                  <btn.icon size={18} />
                                              </button>
                                          ))}
                                      </div>
                                  </td>
                               </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {/* Mobile Card Layout (<LG) */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredPlayers.map(p => (
                      <div key={p.id} className="glass-card p-6 flex flex-col gap-6 relative overflow-hidden group border-slate-100 bg-white shadow-sm">
                          <div className="flex justify-between items-start">
                               <div className="flex gap-5 items-center">
                                    <img src={p.photoUrl} className="w-16 h-16 rounded-2xl bg-slate-50 object-cover border border-slate-200 group-hover:border-brand-500 transition-all shadow-md" />
                                    <div>
                                        <h4 className="font-black text-slate-900 italic text-base uppercase tracking-tight mb-1">{p.fullName}</h4>
                                        <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest">{p.memberId}</p>
                                    </div>
                               </div>
                               <button className="text-slate-400 p-2 hover:text-slate-900 transition-colors"><MoreVertical size={20} /></button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                               <div className="space-y-1">
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">POSITION</p>
                                   <p className="text-[10px] font-black text-brand-500 uppercase italic">{p.position}</p>
                               </div>
                               <div className="space-y-1 text-right">
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">VENUE</p>
                                   <p className="text-[10px] font-black text-slate-900 uppercase italic">{p.venue}</p>
                               </div>
                          </div>

                          <div className="flex gap-3">
                              <button onClick={() => setViewingPerformance(p)} className="flex-1 py-4 bg-brand-500 text-white font-black rounded-xl text-[9px] uppercase tracking-[0.2em] italic shadow-lg active:scale-95 transition-all">PERFORMANCE</button>
                              <button onClick={() => openEditModal(p, 'player')} className="px-5 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 hover:text-brand-500 transition-all"><Edit2 size={16}/></button>
                              <button onClick={() => handleSecureDelete(p, 'player')} className="px-5 py-4 bg-red-50 border border-red-100 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- COACHES STAFF VIEW --- */}
      {activeTab === 'coaches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-slide-up">
              {filteredCoaches.map(c => (
                  <div key={c.id} className="glass-card p-10 border-slate-100 bg-white hover:border-brand-500/20 relative group shadow-sm">
                      <div className="flex items-center gap-6 mb-10">
                          <div className="relative">
                              <img src={c.photoUrl || `https://ui-avatars.com/api/?name=${c.username}&background=0D1B8A&color=00C8FF`} className="w-24 h-24 rounded-full bg-slate-50 object-cover border-4 border-slate-100 shadow-2xl" />
                              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white">
                                  <Shield size={20} />
                              </div>
                          </div>
                          <div>
                              <h4 className="font-black text-slate-900 italic text-2xl uppercase tracking-tighter leading-none mb-2">{c.username}</h4>
                              <span className="px-4 py-1.5 rounded-full bg-brand-500/10 text-brand-500 text-[9px] font-black uppercase tracking-[0.3em] border border-brand-500/20 italic">COACH</span>
                          </div>
                      </div>
                      
                      <div className="space-y-8 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-8">
                          <div className="space-y-4">
                              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest italic">
                                  <span className="text-slate-400">ASSIGNED VENUES</span>
                                  <Map size={14} className="text-brand-500/40" />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  {c.assignedVenues?.map(v => <span key={v} className="px-4 py-2 bg-white rounded-xl text-[10px] font-black text-brand-500 border border-slate-200 uppercase italic shadow-sm">{v}</span>)}
                              </div>
                          </div>
                          <div className="space-y-4">
                              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest italic">
                                  <span className="text-slate-400">ASSIGNED BATCHES</span>
                                  <Layers size={14} className="text-brand-500/40" />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  {c.assignedBatches?.map(b => <span key={b} className="px-4 py-2 bg-white rounded-xl text-[10px] font-black text-brand-500 border border-slate-200 uppercase italic shadow-sm">{b}</span>)}
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-4">
                          <button onClick={() => openEditModal(c, 'coach')} className="flex-1 py-5 bg-white border border-slate-200 text-slate-700 hover:bg-brand-500 hover:text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.3em] italic shadow-lg">EDIT ACCOUNT</button>
                          <button onClick={() => handleSecureDelete(c, 'coach')} className="p-5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-100 shadow-md"><Trash2 size={24} /></button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* --- SYSTEM MODALS --- */}
      {editingPlayer && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-300">
              <div className="glass-card w-full max-w-2xl bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-3xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] md:max-h-[90vh]">
                  <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-brand-50/50 shrink-0">
                      <h3 className="text-xl md:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Update <span className="text-brand-500">Player Profile</span></h3>
                      <button onClick={() => setEditingPlayer(null)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl text-slate-300 hover:text-slate-900 flex items-center justify-center border border-slate-200 transition-all shadow-sm"><X size={20} /></button>
                  </div>
                  <form onSubmit={savePlayerChanges} className="p-6 md:p-10 space-y-6 md:space-y-10 overflow-y-auto custom-scrollbar-light text-left flex-1">
                      <div className="flex justify-center">
                          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <img src={previewUrl || editingPlayer.photoUrl} className="w-36 h-36 rounded-[2rem] object-cover border-4 border-slate-100 group-hover:border-brand-500 transition-all shadow-xl" />
                              <div className="absolute inset-0 bg-brand-950/60 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={32} /></div>
                              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} />
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Member ID</label>
                              <input readOnly className="w-full p-5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-black italic text-sm outline-none cursor-not-allowed" value={editingPlayer.memberId} />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Full Name</label>
                              <input required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner" value={editingPlayer.fullName} onChange={e => setEditingPlayer({...editingPlayer, fullName: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Sector (Venue)</label>
                              <select className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner" value={editingPlayer.venue} onChange={e => setEditingPlayer({...editingPlayer, venue: e.target.value})}>
                                  <option value="">SELECT SECTOR</option>
                                  {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Division (Batch)</label>
                              <select className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner" value={editingPlayer.batch} onChange={e => setEditingPlayer({...editingPlayer, batch: e.target.value})}>
                                  <option value="">SELECT DIVISION</option>
                                  {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                              </select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Player Position</label>
                              <select className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none appearance-none focus:border-brand-500 transition-all shadow-inner" value={editingPlayer.position} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value as any})}>
                                  {['Forward','Midfielder','Defender','Goalkeeper','POSITION'].map(p=> <option key={p} value={p}>{p}</option>)}
                              </select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Contact Number</label>
                              <input required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner" value={editingPlayer.contactNumber} onChange={e => setEditingPlayer({...editingPlayer, contactNumber: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Email Address</label>
                              <input type="email" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner" value={editingPlayer.email || ''} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Date of Birth</label>
                              <input type="date" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner" value={editingPlayer.dateOfBirth} onChange={e => setEditingPlayer({...editingPlayer, dateOfBirth: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Parent Name</label>
                              <input required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner" value={editingPlayer.parentName} onChange={e => setEditingPlayer({...editingPlayer, parentName: e.target.value})} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Address</label>
                              <textarea className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner min-h-[100px]" value={editingPlayer.address || ''} onChange={e => setEditingPlayer({...editingPlayer, address: e.target.value})} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Notes / Internal Details</label>
                              <textarea className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner min-h-[100px]" value={editingPlayer.notes || ''} onChange={e => setEditingPlayer({...editingPlayer, notes: e.target.value})} />
                          </div>
                      </div>
                  </form>
                  <div className="p-6 md:p-10 border-t border-slate-100 bg-white shrink-0">
                      <button onClick={savePlayerChanges} className="w-full py-6 bg-brand-500 text-white font-black rounded-2xl uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xs italic">SAVE PLAYER PROFILE</button>
                  </div>
              </div>
          </div>
      )}

      {editingCoach && (
           <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-300">
              <div className="glass-card w-full max-w-2xl bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-3xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] md:max-h-[90vh]">
                  <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-brand-50/50 shrink-0">
                      <div className="flex items-center gap-4 text-brand-500"><Shield size={24} className="md:w-7 md:h-7" /><h3 className="text-xl md:text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Edit Coach <span className="text-brand-500">Account</span></h3></div>
                      <button onClick={() => setEditingCoach(null)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl text-slate-300 hover:text-slate-900 flex items-center justify-center border border-slate-200 transition-all shadow-sm"><X size={20} /></button>
                  </div>
                  <form onSubmit={saveCoachChanges} className="p-6 md:p-10 space-y-6 md:space-y-10 overflow-y-auto custom-scrollbar-light text-left flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Username</label><input required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black italic text-sm outline-none focus:border-brand-500 transition-all shadow-inner" value={editingCoach.username} onChange={e => setEditingCoach({...editingCoach, username: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">Set Password</label><input required className="w-full p-5 bg-slate-50 border border-red-500/20 rounded-2xl text-slate-900 font-mono text-sm outline-none focus:border-red-500 transition-all shadow-inner" value={editingCoach.password} onChange={e => setEditingCoach({...editingCoach, password: e.target.value})} /></div>
                      </div>
                      <div className="space-y-8">
                        <div className="space-y-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic"><MapPin size={18} /> ASSIGNED VENUES</label><div className="flex flex-wrap gap-2">{venues.map(v => <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${editingCoach.assignedVenues?.includes(v.name) ? 'bg-brand-500 text-white border-brand-500 shadow-lg scale-[1.05]' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{v.name}</button>)}</div></div>
                        <div className="space-y-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic"><Layers size={18} /> ASSIGNED BATCHES</label><div className="flex flex-wrap gap-2">{batches.map(b => <button key={b.id} type="button" onClick={() => toggleCoachAssignment('batch', b.name)} className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${editingCoach.assignedBatches?.includes(b.name) ? 'bg-brand-500 text-white border-brand-500 shadow-lg scale-[1.05]' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{b.name}</button>)}</div></div>
                      </div>
                  </form>
                  <div className="p-6 md:p-10 border-t border-slate-100 bg-white shrink-0"><button onClick={saveCoachChanges} className="w-full py-6 bg-brand-500 text-white font-black rounded-2xl uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] transition-all text-xs italic">SAVE COACH ACCOUNT</button></div>
              </div>
          </div>
      )}

      {viewingPerformance && <PlayerPerformanceModal player={viewingPerformance} onCancel={() => setViewingPerformance(null)} onUpdate={() => loadData()} />}
      
      <ConfirmModal isOpen={deleteModalOpen} title={`DELETE PLAYER`} message={`Are you sure you want to permanently delete this player? This action cannot be undone.`} onConfirm={confirmDelete} onCancel={() => {setDeleteModalOpen(false); setItemToDelete(null);}} requireTypeToConfirm="delete" />
    </div>
  );
};
