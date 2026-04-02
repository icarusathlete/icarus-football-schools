import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, User } from '../types';
import { Search, Edit2, Trash2, Save, X, User as UserIcon, Phone, MapPin, Layers, Map, Filter, Camera, Shield, Check, Key, Activity, Users, History, Zap } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { PlayerPerformanceModal } from './PlayerPerformanceModal';
import Papa from 'papaparse';

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

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{current: number, total: number} | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportProgress({ current: 0, total: 0 });
      Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
              const rows = results.data as any[];
              setImportProgress({ current: 0, total: rows.length });
              
              for (let i = 0; i < rows.length; i++) {
                  const row = rows[i];
                  const player: Omit<Player, 'id' | 'memberId' | 'registeredAt'> = {
                      fullName: row['Player Name'] || 'Unknown Athlete',
                      parentName: row['Billed To Name'] || 'Unknown Parent',
                      contactNumber: row['Phone Number'] || 'N/A',
                      address: row['Address'] || '',
                      venue: row['Training Location'] || 'ICARUS CENTER',
                      batch: row['Program'] || 'General Training',
                      photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(row['Player Name'])}&background=0c4a6e&color=fff`,
                      position: 'TBD',
                      dateOfBirth: '2015-01-01', // Default standard
                      email: row['Email'] || '',
                      notes: `Head Coach: ${row['Head Coach'] || 'N/A'}\nTraining Days: ${row['Days'] || 'N/A'}\nFees Ending: ${row['Fees Ending'] || 'N/A'}`
                  };

                  try {
                      await StorageService.addPlayer(player);
                      setImportProgress(prev => prev ? { ...prev, current: i + 1 } : null);
                  } catch (err) {
                      console.error("Batch ingestion error:", err);
                  }
              }
              
              setTimeout(() => {
                  setImportProgress(null);
                  setIsImportModalOpen(false);
                  loadData();
              }, 1500);
          }
      });
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-brand-500/10 backdrop-blur-xl p-10 rounded-[3rem] border border-brand-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03]"><Users size={160} className="text-white" /></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter leading-none">
             SQUAD <span className="text-brand-500">INTELLIGENCE</span>
          </h2>
          <p className="text-brand-500 font-black uppercase text-[10px] tracking-[0.3em] mt-3 italic">Personnel Lifecycle Management Module</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full lg:w-auto">
            <div className="flex bg-brand-950 p-1.5 rounded-[1.5rem] border border-white/10 shadow-2xl flex-1 lg:flex-initial">
                <button 
                    onClick={() => setActiveTab('players')}
                    className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all italic flex-1 lg:flex-initial ${activeTab === 'players' ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' : 'text-brand-500 hover:text-white'}`}
                >
                    Athlete Roster
                </button>
                <button 
                    onClick={() => setActiveTab('coaches')}
                    className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all italic flex-1 lg:flex-initial ${activeTab === 'coaches' ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' : 'text-brand-500 hover:text-white'}`}
                >
                    Command Staff
                </button>
            </div>
            
            <button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-brand-500/10 text-brand-500 px-6 py-3.5 rounded-[1.5rem] border border-brand-500/30 font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-brand-500 hover:text-brand-950 transition-all shadow-xl italic"
            >
                <Zap size={16} />
                Bulk Import
            </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-brand-500/10 backdrop-blur-xl p-4 rounded-[2rem] shadow-2xl border border-brand-500/30 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-500 group-focus-within:text-white transition-colors w-5 h-5" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab === 'players' ? 'athlete nomenclatures' : 'staff protocols'}...`} 
                className="w-full pl-14 pr-6 py-4 bg-brand-950 border border-white/10 rounded-[1.25rem] outline-none focus:border-brand-500 transition-all text-xs font-black text-white placeholder:text-brand-700 italic"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
              {['Sectors', 'Divisions'].map((label, i) => (
                  <div key={label} className="relative group min-w-[160px]">
                      {i === 0 ? <Map className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 w-4 h-4" /> : <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 w-4 h-4" />}
                      <select 
                        className="w-full pl-12 pr-10 py-4 bg-brand-950 border border-white/10 rounded-[1.25rem] outline-none focus:border-brand-500 transition-all text-[10px] font-black text-brand-500 uppercase tracking-widest appearance-none cursor-pointer italic"
                        value={i === 0 ? filterVenue : filterBatch}
                        onChange={(e) => i === 0 ? setFilterVenue(e.target.value) : setFilterBatch(e.target.value)}
                      >
                          <option value="ALL">All {label}</option>
                          {(i === 0 ? venues : batches).map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                      </select>
                      <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-800 w-4 h-4" />
                  </div>
              ))}
          </div>
      </div>

      {/* --- PLAYERS LIST --- */}
      {activeTab === 'players' && (
          <div className="bg-brand-500/10 backdrop-blur-xl rounded-[3rem] border border-brand-500/30 overflow-hidden shadow-2xl animate-in fade-in active-tab-id">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-brand-950 border-b border-white/5">
                          <tr className="font-display italic">
                              <th className="px-10 py-6 text-[10px] font-black text-brand-600 uppercase tracking-[0.3em]">Operative Profile</th>
                              <th className="px-10 py-6 text-[10px] font-black text-brand-600 uppercase tracking-[0.3em]">Operational Data</th>
                              <th className="px-10 py-6 text-[10px] font-black text-brand-600 uppercase tracking-[0.3em]">Deployment Status</th>
                              <th className="px-10 py-6 text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] text-right">System Overrides</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredPlayers.map(p => (
                              <tr key={p.id} className="hover:bg-brand-500/5 transition-all group">
                                  <td className="px-10 py-6">
                                      <div className="flex items-center gap-6">
                                          <img src={p.photoUrl} className="w-16 h-16 rounded-full bg-brand-950 object-cover border-2 border-white/10 group-hover:border-brand-500/50 transition-all shadow-xl" />
                                          <div>
                                              <div className="font-black text-white italic text-base uppercase tracking-tight leading-none mb-2">{p.fullName}</div>
                                              <div className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{p.memberId}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-10 py-6">
                                      <div className="flex flex-col gap-2.5">
                                          <div className="flex items-center gap-3 text-[10px] font-black text-brand-400 uppercase tracking-widest italic"><UserIcon size={14} className="text-brand-500" /> {p.position}</div>
                                          <div className="flex items-center gap-3 text-[10px] font-black text-brand-600 tracking-widest uppercase italic"><Phone size={14} className="text-brand-500" /> {p.contactNumber}</div>
                                      </div>
                                  </td>
                                  <td className="px-10 py-6">
                                      <div className="flex flex-wrap gap-2">
                                          {p.venue && <span className="px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-widest border border-brand-500/20 italic">{p.venue}</span>}
                                          {p.batch && <span className="px-3 py-1.5 rounded-lg bg-brand-950 text-brand-400 text-[10px] font-black uppercase tracking-widest border border-white/10 italic">{p.batch}</span>}
                                      </div>
                                  </td>
                                  <td className="px-10 py-6 text-right">
                                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                          <button onClick={() => setViewingPerformance(p)} className="p-3.5 bg-brand-950 border border-white/10 text-brand-500 hover:text-white hover:bg-brand-500 rounded-xl transition-all shadow-xl"><Activity size={18} /></button>
                                          <button onClick={() => openEditModal(p, 'player')} className="p-3.5 bg-brand-950 border border-white/10 text-brand-400 hover:text-white hover:bg-brand-800 rounded-xl transition-all shadow-xl"><Edit2 size={18} /></button>
                                          <button onClick={() => handleSecureDelete(p, 'player')} className="p-3.5 bg-brand-950 border border-red-500/20 text-brand-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shadow-xl"><Trash2 size={18} /></button>
                                      </div>
                                  </td>
                               </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- STAFF LIST --- */}
      {activeTab === 'coaches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {filteredCoaches.map(c => (
                  <div key={c.id} className="bg-brand-500/10 backdrop-blur-xl rounded-[3rem] border border-brand-500/30 overflow-hidden shadow-2xl group hover:border-brand-500/50 transition-all relative">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none"><Shield size={100} className="text-brand-500" /></div>
                      <div className="p-10">
                          <div className="flex items-center gap-6 mb-10">
                              <img src={c.photoUrl || `https://ui-avatars.com/api/?name=${c.username}&background=0c4a6e&color=fff`} className="w-20 h-20 rounded-full bg-brand-950 object-cover border-2 border-white/10 group-hover:border-brand-500/50 transition-all shadow-2xl" />
                              <div>
                                  <h4 className="font-black text-white italic text-xl uppercase tracking-tighter leading-none mb-2">{c.username}</h4>
                                  <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 text-[9px] font-black uppercase tracking-[0.2em] border border-brand-500/20 italic">COMMAND OFFICER</span>
                              </div>
                          </div>
                          <div className="space-y-6">
                              <div className="space-y-3"><div className="text-[10px] font-black text-brand-600 uppercase tracking-widest italic flex items-center gap-2"><MapPin size={14} className="text-brand-500" /> Operational Sectors</div><div className="flex flex-wrap gap-2">{c.assignedVenues?.map(v => <span key={v} className="px-3 py-1.5 bg-brand-950 rounded-lg text-[10px] font-black text-brand-400 border border-white/10 uppercase italic">{v}</span>)}</div></div>
                              <div className="space-y-3"><div className="text-[10px] font-black text-brand-600 uppercase tracking-widest italic flex items-center gap-2"><Layers size={14} className="text-brand-500" /> Tactical Divisions</div><div className="flex flex-wrap gap-2">{c.assignedBatches?.map(b => <span key={b} className="px-3 py-1.5 bg-brand-950 rounded-lg text-[10px] font-black text-brand-400 border border-white/10 uppercase italic">{b}</span>)}</div></div>
                          </div>
                      </div>
                      <div className="bg-brand-950/50 p-6 border-t border-white/5 flex gap-3">
                          <button onClick={() => openEditModal(c, 'coach')} className="flex-1 py-3.5 bg-brand-900 border border-white/10 text-brand-500 hover:text-white rounded-[1.25rem] transition-all font-black text-[10px] uppercase tracking-widest italic">Update Creds</button>
                          <button onClick={() => handleSecureDelete(c, 'coach')} className="p-3.5 text-brand-700 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Edit Modals & Confirm Modals */}
      {editingPlayer && (
          <div className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in">
              <div className="bg-brand-900 w-full max-w-3xl rounded-[4rem] border border-white/10 shadow-3xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-12 border-b border-white/5 flex justify-between items-center bg-brand-950/50"><h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Update <span className="text-brand-500">Dossier</span></h3><button onClick={() => setEditingPlayer(null)} className="p-4 bg-brand-800 rounded-2xl text-brand-600 hover:text-white"><X size={28} /></button></div>
                  <form onSubmit={savePlayerChanges} className="p-12 space-y-12 h-[60vh] overflow-y-auto custom-scrollbar">
                      <div className="flex flex-col items-center mb-10"><div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}><img src={previewUrl || editingPlayer.photoUrl} className="w-40 h-40 rounded-full object-cover border-4 border-white/10 transition-all group-hover:border-brand-500" /><div className="absolute inset-0 bg-brand-950/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-brand-500" size={32} /></div><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoChange} /></div></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-2"><label className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic ml-1">Asset Nomenclature</label><input required className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-500" value={editingPlayer.fullName} onChange={e => setEditingPlayer({...editingPlayer, fullName: e.target.value})} /></div>
                          <div className="space-y-2"><label className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic ml-1">Assigned Role</label><select className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl text-white font-black italic text-sm outline-none appearance-none focus:border-brand-500" value={editingPlayer.position} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value as any})}>{['Forward','Midfielder','Defender','Goalkeeper','TBD'].map(p=> <option key={p} value={p}>{p}</option>)}</select></div>
                      </div>
                  </form>
                  <div className="p-12 border-t border-white/5 bg-brand-950/50 flex gap-4"><button type="submit" onClick={savePlayerChanges} className="flex-1 py-6 bg-brand-500 text-brand-950 font-black rounded-3xl uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs italic">Sync Roster Data</button></div>
              </div>
          </div>
      )}

      {editingCoach && (
           <div className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in">
              <div className="bg-brand-900 w-full max-w-3xl rounded-[4rem] border border-white/10 shadow-3xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-12 border-b border-white/5 flex justify-between items-center bg-brand-950/50"><div className="flex items-center gap-4 text-brand-500"><Shield size={32} /><h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Officer <span className="text-brand-500">Clearance</span></h3></div><button onClick={() => setEditingCoach(null)} className="p-4 bg-brand-800 rounded-2xl text-brand-600 hover:text-white"><X size={28} /></button></div>
                  <form onSubmit={saveCoachChanges} className="p-12 space-y-12 h-[60vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-2"><label className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic">Username</label><input required className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl text-white font-black italic text-sm" value={editingCoach.username} onChange={e => setEditingCoach({...editingCoach, username: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">Encrypted Key</label><input required className="w-full p-4 bg-brand-800 border border-red-500/20 rounded-2xl text-white font-mono text-sm" value={editingCoach.password} onChange={e => setEditingCoach({...editingCoach, password: e.target.value})} /></div>
                      </div>
                      <div className="space-y-8">
                        <div className="space-y-4"><label className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2 italic"><MapPin size={18} /> Sectors Control</label><div className="flex flex-wrap gap-3">{venues.map(v => <button key={v.id} type="button" onClick={() => toggleCoachAssignment('venue', v.name)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${editingCoach.assignedVenues?.includes(v.name) ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-xl' : 'bg-brand-950 text-brand-700 border-white/5'}`}>{v.name}</button>)}</div></div>
                        <div className="space-y-4"><label className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2 italic"><Layers size={18} /> Divisions Control</label><div className="flex flex-wrap gap-3">{batches.map(b => <button key={b.id} type="button" onClick={() => toggleCoachAssignment('batch', b.name)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${editingCoach.assignedBatches?.includes(b.name) ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-xl' : 'bg-brand-950 text-brand-700 border-white/5'}`}>{b.name}</button>)}</div></div>
                      </div>
                  </form>
                  <div className="p-12 border-t border-white/5 bg-brand-950/50"><button onClick={saveCoachChanges} className="w-full py-6 bg-brand-500 text-brand-950 font-black rounded-3xl uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-all text-xs italic">Authorize Roster Access</button></div>
              </div>
          </div>
      )}

      {viewingPerformance && <PlayerPerformanceModal player={viewingPerformance} onCancel={() => setViewingPerformance(null)} onUpdate={() => loadData()} />}
      
      {/* Bulk Import Modal */}
      {isImportModalOpen && (
          <div className="fixed inset-0 z-[150] bg-brand-950/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in">
              <div className="bg-brand-500/10 backdrop-blur-xl w-full max-w-xl rounded-[4rem] border border-brand-500/30 shadow-3xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-12 border-b border-white/5 flex justify-between items-center bg-brand-950/50">
                      <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">DATA <span className="text-brand-500">INGESTION</span></h3>
                      <button onClick={() => setIsImportModalOpen(false)} className="p-4 bg-brand-800/50 rounded-2xl text-brand-600 hover:text-white"><X size={28} /></button>
                  </div>
                  
                  <div className="p-12 space-y-10 text-center">
                      <div className="w-24 h-24 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-brand-500/20 shadow-[0_0_50px_rgba(14,165,233,0.15)]">
                          <History size={40} className="text-brand-500 animate-pulse" />
                      </div>
                      
                      <div>
                          <p className="text-white font-black italic text-lg uppercase tracking-tight">Synchronize Local Datastore</p>
                          <p className="text-brand-600 text-[10px] font-black uppercase tracking-widest mt-2">Target: Gaur City Roster Intelligence</p>
                      </div>

                      {importProgress ? (
                          <div className="space-y-6">
                              <div className="h-2 w-full bg-brand-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                  <div 
                                    className="h-full bg-brand-500 transition-all duration-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]" 
                                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                  />
                              </div>
                              <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] italic">
                                  Indexing Records: {importProgress.current} / {importProgress.total} Complete
                              </p>
                          </div>
                      ) : (
                          <div className="space-y-8">
                              <div 
                                onClick={() => importFileInputRef.current?.click()}
                                className="border-2 border-dashed border-brand-500/20 rounded-[2.5rem] p-12 cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group shadow-inner"
                              >
                                  <div className="text-brand-700 group-hover:text-brand-500 transition-colors">
                                      <Search size={48} className="mx-auto mb-6 opacity-30" />
                                      <p className="text-xs font-black uppercase tracking-widest leading-none mb-2">Select CSV Manifest</p>
                                      <p className="text-[9px] font-bold opacity-50 italic uppercase tracking-widest">Supports .csv standard data packets</p>
                                  </div>
                                  <input type="file" ref={importFileInputRef} className="hidden" accept=".csv" onChange={handleBulkImport} />
                              </div>
                              <button onClick={() => setIsImportModalOpen(false)} className="text-[10px] font-black text-brand-600 hover:text-white uppercase tracking-[0.3em] italic transition-colors">Abort Ingestion Sequence</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      <ConfirmModal isOpen={deleteModalOpen} title={`Revoke Personnel ${itemToDelete?.type}`} message={`Permanently remove officer/operative records? This operation is irreversible.`} onConfirm={confirmDelete} onCancel={() => {setDeleteModalOpen(false); setItemToDelete(null);}} requireTypeToConfirm="delete" />

    </div>
  );
};
