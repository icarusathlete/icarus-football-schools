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
    <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-brand-500 p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10"><Users size={160} className="text-white" /></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter leading-none">
             SQUAD <span className="text-brand-950">MANAGEMENT</span>
          </h2>
          <p className="text-white/80 font-black uppercase text-[10px] tracking-[0.3em] mt-3 italic">Academy Roster & Staff Administration</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full lg:w-auto">
            <div className="flex bg-brand-950 p-1.5 rounded-[1.5rem] border border-white/10 shadow-2xl flex-1 lg:flex-initial">
                <button 
                    onClick={() => setActiveTab('players')}
                    className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all italic flex-1 lg:flex-initial ${activeTab === 'players' ? 'bg-white text-brand-950 shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                    Athlete Roster
                </button>
                <button 
                    onClick={() => setActiveTab('coaches')}
                    className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all italic flex-1 lg:flex-initial ${activeTab === 'coaches' ? 'bg-white text-brand-950 shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                    Coaching Staff
                </button>
            </div>
            
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-[2rem] shadow-xl border border-brand-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-300 group-focus-within:text-brand-950 transition-colors w-5 h-5" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab === 'players' ? 'athletes' : 'staff members'}...`} 
                className="w-full pl-14 pr-6 py-4 bg-brand-50/30 border border-brand-100 rounded-[1.25rem] outline-none focus:border-brand-500 transition-all text-xs font-black text-brand-950 placeholder:text-brand-300 italic"
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
          <div className="bg-white rounded-[3rem] border border-brand-100 overflow-hidden shadow-2xl animate-in fade-in">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-brand-50/50 border-y border-brand-100">
                          <tr className="font-display italic">
                              <th className="px-10 py-8 text-[12px] font-black text-brand-950 uppercase tracking-[0.2em] leading-none">Athlete Profile</th>
                              <th className="px-10 py-8 text-[12px] font-black text-brand-950 uppercase tracking-[0.2em] leading-none">Expertise & Contact</th>
                              <th className="px-10 py-8 text-[12px] font-black text-brand-950 uppercase tracking-[0.2em] leading-none">Sector Alignment</th>
                              <th className="px-10 py-8 text-[12px] font-black text-brand-950 uppercase tracking-[0.2em] leading-none text-right">Operations</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-50">
                          {filteredPlayers.map(p => (
                              <tr key={p.id} className="hover:bg-brand-50 transition-all duration-300 group border-b border-brand-50 last:border-0 hover:shadow-inner">
                                  <td className="px-10 py-8">
                                      <div className="flex items-center gap-6">
                                          <div className="relative group/avatar">
                                              <img 
                                                src={p.photoUrl} 
                                                className="w-18 h-18 rounded-3xl bg-brand-50 object-cover border-2 border-brand-500/20 shadow-lg group-hover:scale-105 transition-transform" 
                                              />
                                              <div className="absolute -bottom-2 -right-2 bg-brand-950 text-white p-1.5 rounded-xl border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <Shield size={10} />
                                              </div>
                                          </div>
                                          <div>
                                              <div className="font-black text-brand-950 italic text-lg uppercase tracking-tight leading-none mb-2 hover:text-brand-500 transition-colors cursor-default">{p.fullName}</div>
                                              <div className="inline-flex px-2 py-0.5 rounded-md bg-brand-50 text-[10px] font-black text-brand-500 uppercase tracking-widest border border-brand-100">{p.memberId}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-10 py-8">
                                      <div className="flex flex-col gap-4">
                                          <div className="flex items-center gap-3 text-[11px] font-black text-brand-950 uppercase tracking-widest italic drop-shadow-sm">
                                              <div className="w-2 h-2 rounded-full bg-brand-500" />
                                              {p.position}
                                          </div>
                                          <div className="flex items-center gap-3 text-[11px] font-black text-brand-950/60 tracking-widest uppercase italic">
                                               <Phone size={14} className="text-brand-500/70" /> 
                                               {p.contactNumber}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-10 py-8">
                                      <div className="flex flex-col gap-2">
                                          {p.venue && (
                                              <div className="flex items-center gap-2 text-[10px] font-black text-brand-950/70 uppercase tracking-tighter italic">
                                                  <MapPin size={12} className="text-brand-500" />
                                                  {p.venue}
                                              </div>
                                          )}
                                          {p.batch && (
                                              <div className="flex items-center gap-2 text-[10px] font-black text-brand-500 uppercase tracking-tighter italic">
                                                  <Zap size={12} className="text-brand-500/50" />
                                                  {p.batch}
                                              </div>
                                          )}
                                      </div>
                                  </td>
                                  <td className="px-10 py-8 text-right">
                                      <div className="flex items-center justify-end gap-3 transition-all">
                                          <button 
                                               onClick={() => setViewingPerformance(p)} 
                                               className="w-12 h-12 flex items-center justify-center bg-brand-50 text-brand-950 border border-brand-100 hover:bg-brand-950 hover:text-brand-500 rounded-2xl transition-all shadow-md group/btn"
                                               title="View Performance"
                                          >
                                              <Activity size={18} className="group-hover/btn:scale-110 transition-transform" />
                                          </button>
                                          <button 
                                               onClick={() => openEditModal(p, 'player')} 
                                               className="w-12 h-12 flex items-center justify-center bg-brand-50 text-brand-950 border border-brand-100 hover:bg-brand-950 hover:text-white rounded-2xl transition-all shadow-md group/btn"
                                               title="Edit Record"
                                          >
                                              <Edit2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                                          </button>
                                          <button 
                                               onClick={() => handleSecureDelete(p, 'player')} 
                                               className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-700 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-md group/btn"
                                               title="Delete Athlete"
                                          >
                                              <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                                          </button>
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
                  <div className="p-12 border-b border-white/5 flex justify-between items-center bg-brand-950/50"><h3 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Update <span className="text-brand-500">Profile</span></h3><button onClick={() => setEditingPlayer(null)} className="p-4 bg-brand-800 rounded-2xl text-brand-600 hover:text-white"><X size={28} /></button></div>
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
      

      <ConfirmModal isOpen={deleteModalOpen} title={`Revoke Personnel ${itemToDelete?.type}`} message={`Permanently remove officer/operative records? This operation is irreversible.`} onConfirm={confirmDelete} onCancel={() => {setDeleteModalOpen(false); setItemToDelete(null);}} requireTypeToConfirm="delete" />

    </div>
  );
};
