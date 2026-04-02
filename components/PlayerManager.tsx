
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, User } from '../types';
import { Search, Edit2, Trash2, Save, X, User as UserIcon, Phone, MapPin, Layers, Map, Filter, Camera, Shield, Check, Key, Activity, Users, History } from 'lucide-react';
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

  // Delete State
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
    // Filter users to get only coaches (case-insensitive role check)
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
        // Filter logic for coaches assignments (if they have ANY of the selected venue/batch)
        if (filterVenue !== 'ALL') {
            result = result.filter(c => c.assignedVenues?.some(v => v === filterVenue));
        }
        if (filterBatch !== 'ALL') {
            result = result.filter(c => c.assignedBatches?.some(b => b === filterBatch));
        }
        setFilteredCoaches(result);
    }
  };

  // --- Deletion Logic ---
  const handleSecureDelete = (item: Player | User, type: 'player' | 'coach') => {
      setItemToDelete({ item, type });
      setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!itemToDelete) return;
      const { item, type } = itemToDelete;
      
      try {
          if (type === 'player') {
              await StorageService.deletePlayer(item.id);
          } else {
              await StorageService.deleteUser(item.id);
          }
          loadData();
          setDeleteModalOpen(false);
          setItemToDelete(null);
      } catch (error: any) {
          console.error("Error deleting:", error);
          alert(`Failed to delete: ${error.message}`);
      }
  };

  // --- Edit Logic ---
  const openEditModal = (item: Player | User, type: 'player' | 'coach') => {
      setPreviewUrl(item.photoUrl || null);
      if (type === 'player') {
          setEditingPlayer({ ...item as Player });
      } else {
          setEditingCoach({ ...item as User });
      }
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

  // Helper for Coach Assignments
  const toggleCoachAssignment = (type: 'venue' | 'batch', value: string) => {
      if (!editingCoach) return;
      
      if (type === 'venue') {
          const current = editingCoach.assignedVenues || [];
          const updated = current.includes(value) 
              ? current.filter(v => v !== value) 
              : [...current, value];
          setEditingCoach({ ...editingCoach, assignedVenues: updated });
      } else {
          const current = editingCoach.assignedBatches || [];
          const updated = current.includes(value) 
              ? current.filter(b => b !== value) 
              : [...current, value];
          setEditingCoach({ ...editingCoach, assignedBatches: updated });
      }
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-brand-800 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Users size={120} className="text-white" /></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter" style={{ fontFamily: 'Orbitron' }}>
             SQUAD <span className="text-brand-500">INTELLIGENCE</span>
          </h2>
          <p className="text-white/40 font-black uppercase text-[10px] tracking-widest mt-1">Official Roster • Personnel Lifecycle Management</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-brand-950 p-1 rounded-2xl border border-white/10 relative z-10 shadow-inner">
            <button 
                onClick={() => setActiveTab('players')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'players' 
                    ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' 
                    : 'text-brand-500 hover:text-white'
                }`}
            >
                Athletes
            </button>
            <button 
                onClick={() => setActiveTab('coaches')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === 'coaches' 
                    ? 'bg-brand-500 text-brand-950 shadow-lg shadow-brand-500/20' 
                    : 'text-brand-500 hover:text-white'
                }`}
            >
                Staff
            </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-brand-800 p-4 rounded-3xl shadow-2xl border border-white/5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 group-focus-within:text-gold transition-colors w-4 h-4" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab === 'players' ? 'athlete nomenclature' : 'staff protocols'}...`} 
                className="w-full pl-11 pr-4 py-3 bg-brand-950/50 border border-white/5 rounded-2xl outline-none focus:border-gold transition-all text-xs font-bold text-white placeholder:text-brand-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <div className="relative group min-w-[140px]">
                  <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 w-3.5 h-3.5" />
                  <select 
                    className="w-full pl-10 pr-8 py-3 bg-brand-950/50 border border-white/5 rounded-2xl outline-none focus:border-gold transition-all text-[10px] font-black text-brand-400 uppercase tracking-widest appearance-none cursor-pointer"
                    value={filterVenue}
                    onChange={(e) => setFilterVenue(e.target.value)}
                  >
                      <option value="ALL">All Venues</option>
                      {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-700 w-3 h-3" />
              </div>
              <div className="relative group min-w-[140px]">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 w-3.5 h-3.5" />
                  <select 
                    className="w-full pl-10 pr-8 py-3 bg-brand-950/50 border border-white/5 rounded-2xl outline-none focus:border-gold transition-all text-[10px] font-black text-brand-400 uppercase tracking-widest appearance-none cursor-pointer"
                    value={filterBatch}
                    onChange={(e) => setFilterBatch(e.target.value)}
                  >
                      <option value="ALL">All Batches</option>
                      {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-700 w-3 h-3" />
              </div>
          </div>
      </div>

      {/* --- PLAYERS TABLE --- */}
      {activeTab === 'players' && (
          <div className="bg-brand-800 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl animate-in fade-in">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-brand-950/50 border-b border-white/5">
                          <tr>
                              <th className="px-8 py-5 text-[9px] font-black text-brand-500 uppercase tracking-widest">Athlete Profile</th>
                              <th className="px-8 py-5 text-[9px] font-black text-brand-500 uppercase tracking-widest">Operational Data</th>
                              <th className="px-8 py-5 text-[9px] font-black text-brand-500 uppercase tracking-widest">Deployment</th>
                              <th className="px-8 py-5 text-[9px] font-black text-brand-500 uppercase tracking-widest text-right">Overrides</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {filteredPlayers.map(p => (
                              <tr key={p.id} className="hover:bg-gold/5 transition-colors group">
                                  <td className="px-8 py-5">
                                      <div className="flex items-center gap-4">
                                          <img src={p.photoUrl} className="w-12 h-12 rounded-2xl bg-brand-950 object-cover border border-white/5 group-hover:border-gold/30 transition-all" />
                                          <div>
                                              <div className="font-black text-white italic text-sm uppercase tracking-tight">{p.fullName}</div>
                                              <div className="text-[9px] font-black text-brand-600 uppercase tracking-widest mt-0.5">{p.memberId}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="flex flex-col gap-1.5">
                                          <div className="flex items-center gap-2 text-[10px] font-black text-brand-400 uppercase tracking-widest">
                                              <UserIcon size={12} className="text-gold" /> {p.position}
                                          </div>
                                          <div className="flex items-center gap-2 text-[10px] font-bold text-brand-500 tracking-wider">
                                              <Phone size={12} className="text-brand-600" /> {p.contactNumber}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-8 py-5">
                                      <div className="flex flex-col gap-2">
                                          {p.venue && (
                                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-500/20 w-fit">
                                                  <Map size={10} /> {p.venue}
                                              </span>
                                          )}
                                          {p.batch && (
                                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-widest border border-purple-500/20 w-fit">
                                                  <Layers size={10} /> {p.batch}
                                              </span>
                                          )}
                                          {!p.venue && !p.batch && <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest italic">Standby Status</span>}
                                      </div>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                          <button 
                                            onClick={() => setViewingPerformance(p)}
                                            className="p-3 bg-brand-950/50 border border-white/5 text-brand-400 hover:text-gold hover:border-gold/30 rounded-xl transition-all"
                                            title="Performance Analytics"
                                          >
                                              <Activity size={16} />
                                          </button>
                                          <button 
                                            onClick={() => openEditModal(p, 'player')}
                                            className="p-3 bg-brand-950/50 border border-white/5 text-brand-400 hover:text-white hover:border-white/20 rounded-xl transition-all"
                                            title="Update dossier"
                                          >
                                              <Edit2 size={16} />
                                          </button>
                                          <button 
                                            onClick={() => handleSecureDelete(p, 'player')}
                                            className="p-3 bg-brand-950/50 border border-white/5 text-brand-400 hover:text-red-500 hover:border-red-500/30 rounded-xl transition-all"
                                            title="Terminate Record"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredPlayers.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="text-center py-20">
                                      <div className="flex flex-col items-center opacity-20">
                                          <Search size={48} className="text-white mb-4" />
                                          <p className="text-xs font-black text-white uppercase tracking-widest">Null Query Result</p>
                                      </div>
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- STAFF DOSSIERS --- */}
      {activeTab === 'coaches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {filteredCoaches.map(c => (
                  <div key={c.id} className="bg-brand-900 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl group hover:border-blue-500/30 transition-all hover:-translate-y-1 relative">
                      <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Shield size={80} className="text-blue-500" /></div>
                      
                      <div className="p-8">
                          <div className="flex items-start gap-5">
                              <div className="relative">
                                  <div className="absolute inset-0 bg-blue-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <img 
                                      src={c.photoUrl || `https://ui-avatars.com/api/?name=${c.username}&background=0c4a6e&color=fff`} 
                                      className="w-20 h-20 rounded-[2rem] bg-brand-950 object-cover border-2 border-white/5 group-hover:border-blue-400/50 transition-all relative z-10" 
                                  />
                              </div>
                              <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <h4 className="font-black text-white italic text-lg uppercase tracking-tight leading-tight mb-1">{c.username}</h4>
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                                              <Shield size={10} /> Senior Tactical Coach
                                          </span>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div className="mt-8 space-y-6">
                              <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-[9px] font-black text-brand-500 uppercase tracking-widest">
                                      <MapPin size={12} className="text-blue-500" /> Assigned Sectors
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {c.assignedVenues && c.assignedVenues.length > 0 ? (
                                          c.assignedVenues.map(v => (
                                              <span key={v} className="px-3 py-1 bg-brand-950 border border-white/10 rounded-lg text-[9px] font-black text-brand-300 uppercase tracking-widest">{v}</span>
                                          ))
                                      ) : (
                                          <span className="text-[9px] text-brand-700 italic font-medium uppercase">No Active Assets</span>
                                      )}
                                  </div>
                              </div>

                              <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-[9px] font-black text-brand-500 uppercase tracking-widest">
                                      <Layers size={12} className="text-blue-500" /> Division Control
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {c.assignedBatches && c.assignedBatches.length > 0 ? (
                                          c.assignedBatches.map(b => (
                                              <span key={b} className="px-3 py-1 bg-brand-950 border border-white/10 rounded-lg text-[9px] font-black text-brand-300 uppercase tracking-widest">{b}</span>
                                          ))
                                      ) : (
                                          <span className="text-[9px] text-brand-700 italic font-medium uppercase">Pending Assignment</span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-brand-950/50 px-8 py-5 border-t border-white/5 flex gap-3">
                          <button 
                              onClick={() => openEditModal(c, 'coach')}
                              className="flex-1 py-3 bg-brand-800 border border-white/5 text-brand-400 hover:text-white hover:border-blue-400/50 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                              <Edit2 size={12} /> Update Credentials
                          </button>
                          <button 
                              onClick={() => handleSecureDelete(c, 'coach')}
                              className="px-4 py-3 bg-red-950/10 border border-red-950/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                          >
                              <Trash2 size={12} />
                          </button>
                      </div>
                  </div>
              ))}
              
              {filteredCoaches.length === 0 && (
                  <div className="col-span-full text-center py-32 bg-brand-900 rounded-[3rem] border border-white/5 border-dashed">
                      <Users size={64} className="mx-auto mb-6 text-brand-800" />
                      <p className="text-xs font-black text-brand-600 uppercase tracking-[0.4em]">No staff personnel detected in this sector.</p>
                  </div>
              )}
          </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-brand-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
                  <div className="bg-brand-950/50 px-10 py-6 border-b border-white/5 flex justify-between items-center relative">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-30" />
                      <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">Refine <span className="text-gold">Dossier</span>: {editingPlayer.fullName}</h3>
                      <button onClick={() => setEditingPlayer(null)} className="p-3 hover:bg-white/10 rounded-full text-brand-500 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <form onSubmit={savePlayerChanges} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                      <div className="flex flex-col items-center">
                          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white/5 shadow-2xl group-hover:border-gold/30 transition-all">
                                  <img src={previewUrl || editingPlayer.photoUrl} className="w-full h-full object-cover" />
                              </div>
                              <div className="absolute inset-0 bg-brand-950/60 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="text-gold" size={32} />
                              </div>
                              <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handlePhotoChange}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Student Designation</label>
                              <input 
                                required
                                type="text" 
                                className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-gold outline-none font-bold text-white shadow-inner"
                                value={editingPlayer.fullName}
                                onChange={e => setEditingPlayer({...editingPlayer, fullName: e.target.value})}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Lifecycle Origin (DOB)</label>
                              <input 
                                required
                                type="date" 
                                className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-gold outline-none font-bold text-white shadow-inner"
                                value={editingPlayer.dateOfBirth}
                                onChange={e => setEditingPlayer({...editingPlayer, dateOfBirth: e.target.value})}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Tactical Position</label>
                              <select 
                                className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-gold outline-none font-bold text-white shadow-inner appearance-none"
                                value={editingPlayer.position}
                                onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value})}
                              >
                                  {['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'TBD'].map(pos => (
                                      <option key={pos} value={pos}>{pos}</option>
                                  ))}
                              </select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Comms Frequency</label>
                              <input 
                                type="tel" 
                                className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-gold outline-none font-bold text-white shadow-inner"
                                value={editingPlayer.contactNumber}
                                onChange={e => setEditingPlayer({...editingPlayer, contactNumber: e.target.value})}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Guardian Liaison</label>
                              <input 
                                type="text" 
                                className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-gold outline-none font-bold text-white shadow-inner"
                                value={editingPlayer.parentName}
                                onChange={e => setEditingPlayer({...editingPlayer, parentName: e.target.value})}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Geospatial Address</label>
                              <input 
                                type="text" 
                                className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-gold outline-none font-bold text-white shadow-inner"
                                value={editingPlayer.address || ''}
                                onChange={e => setEditingPlayer({...editingPlayer, address: e.target.value})}
                              />
                          </div>

                          <div className="md:col-span-2 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Map size={12} className="text-gold" /> Operational Zone</label>
                                  <select 
                                    className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-gold outline-none font-bold text-white shadow-inner appearance-none"
                                    value={editingPlayer.venue || ''}
                                    onChange={e => setEditingPlayer({...editingPlayer, venue: e.target.value})}
                                  >
                                      <option value="">Select Venue...</option>
                                      {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                  </select>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Layers size={12} className="text-gold" /> Deployment Batch</label>
                                  <select 
                                    className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-gold outline-none font-bold text-white shadow-inner appearance-none"
                                    value={editingPlayer.batch || ''}
                                    onChange={e => setEditingPlayer({...editingPlayer, batch: e.target.value})}
                                  >
                                      <option value="">Select Batch...</option>
                                      {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>
                  </form>

                  <div className="p-8 border-t border-white/5 bg-brand-950/50 flex gap-4">
                      <button 
                        type="button" 
                        onClick={() => setEditingPlayer(null)}
                        className="flex-1 py-4 text-brand-500 font-black hover:text-white rounded-2xl transition-all text-[10px] uppercase tracking-widest"
                      >
                          Abort
                      </button>
                      <button 
                        onClick={savePlayerChanges}
                        className="flex-1 py-4 bg-gold text-brand-950 font-black rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"
                      >
                          <Save size={18} /> Update Data
                      </button>
                  </div>
              </div>
          </div>
      )}      {/* Edit Coach Modal */}
      {editingCoach && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-brand-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10">
                  <div className="bg-brand-950/50 px-10 py-6 border-b border-white/5 flex justify-between items-center relative">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30" />
                      <div className="flex items-center gap-3">
                          <Shield className="text-blue-400" size={24} />
                          <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">Refine <span className="text-blue-400">Credentials</span>: {editingCoach.username}</h3>
                      </div>
                      <button onClick={() => setEditingCoach(null)} className="p-3 hover:bg-white/10 rounded-full text-brand-500 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <form onSubmit={saveCoachChanges} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                      <div className="flex flex-col items-center">
                          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/5 shadow-2xl group-hover:border-blue-400/30 transition-all">
                                  <img 
                                    src={previewUrl || editingCoach.photoUrl || `https://ui-avatars.com/api/?name=${editingCoach.username}&background=0c4a6e&color=fff`} 
                                    className="w-full h-full object-cover" 
                                  />
                              </div>
                              <div className="absolute inset-0 bg-brand-950/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="text-blue-400" size={32} />
                              </div>
                              <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handlePhotoChange}
                              />
                          </div>
                      </div>

                      <div className="space-y-8">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">Staff Username / Name</label>
                              <div className="relative group">
                                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600 group-focus-within:text-blue-400 w-4 h-4" />
                                  <input 
                                    required
                                    type="text" 
                                    className="w-full pl-11 pr-4 py-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-blue-400 outline-none font-bold text-white shadow-inner"
                                    value={editingCoach.username}
                                    onChange={e => setEditingCoach({...editingCoach, username: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1 text-red-400">Secure Access Protocol (Password)</label>
                              <div className="relative group">
                                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600 group-focus-within:text-red-400 w-4 h-4" />
                                  <input 
                                    required
                                    type="text" 
                                    className="w-full pl-11 pr-4 py-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-red-400 outline-none font-bold text-white shadow-inner"
                                    value={editingCoach.password}
                                    onChange={e => setEditingCoach({...editingCoach, password: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="pt-8 border-t border-white/5 space-y-10">
                              <div className="space-y-4">
                                  <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                      <MapPin size={12} className="text-blue-400" /> Operational Scopes (Venues)
                                  </label>
                                  <div className="flex flex-wrap gap-3">
                                      {venues.map(v => (
                                          <button
                                              key={v.id}
                                              type="button"
                                              onClick={() => toggleCoachAssignment('venue', v.name)}
                                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                                                  editingCoach.assignedVenues?.includes(v.name)
                                                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                                                  : 'bg-brand-950/50 text-brand-600 border-white/5 hover:border-white/20'
                                              }`}
                                          >
                                              {v.name}
                                              {editingCoach.assignedVenues?.includes(v.name) && <Check size={10} />}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                      <Layers size={12} className="text-purple-400" /> Tactical Divisions (Batches)
                                  </label>
                                  <div className="flex flex-wrap gap-3">
                                      {batches.map(b => (
                                          <button
                                              key={b.id}
                                              type="button"
                                              onClick={() => toggleCoachAssignment('batch', b.name)}
                                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                                                  editingCoach.assignedBatches?.includes(b.name)
                                                  ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-600/20'
                                                  : 'bg-brand-950/50 text-brand-600 border-white/5 hover:border-white/20'
                                              }`}
                                          >
                                              {b.name}
                                              {editingCoach.assignedBatches?.includes(b.name) && <Check size={10} />}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </form>

                  <div className="p-8 border-t border-white/5 bg-brand-950/50 flex gap-4">
                      <button 
                        type="button" 
                        onClick={() => setEditingCoach(null)}
                        className="flex-1 py-4 text-brand-500 font-black hover:text-white rounded-2xl transition-all text-[10px] uppercase tracking-widest"
                      >
                          Abort
                      </button>
                      <button 
                        onClick={saveCoachChanges}
                        className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"
                      >
                          <Save size={18} /> Update Staff Records
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Player Performance Modal */}
      {viewingPerformance && (
          <PlayerPerformanceModal 
              player={viewingPerformance} 
              onCancel={() => setViewingPerformance(null)}
              onUpdate={(updatedPlayer) => {
                  setPlayers(StorageService.getPlayers());
                  setViewingPerformance(updatedPlayer);
              }}
          />
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Delete ${itemToDelete?.type === 'player' ? 'Player' : 'Coach'}`}
        message={`Are you sure you want to permanently delete "${itemToDelete ? (itemToDelete.type === 'player' ? (itemToDelete.item as Player).fullName : (itemToDelete.item as User).username) : ''}"? This action cannot be undone.`}
        requireTypeToConfirm="delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />
    </div>
  );
};
