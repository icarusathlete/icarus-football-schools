
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Venue, Batch, User } from '../types';
import { Search, Edit2, Trash2, Save, X, User as UserIcon, Phone, MapPin, Layers, Map, Filter, Camera, Shield, Check, Key } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

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
  const [editingCoach, setEditingCoach] = useState<User | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{item: Player | User, type: 'player' | 'coach'} | null>(null);

  useEffect(() => {
    loadData();
    window.addEventListener('icarus_data_update', loadData);
    return () => window.removeEventListener('icarus_data_update', loadData);
  }, []);

  useEffect(() => {
    filterData();
  }, [players, coaches, searchTerm, filterVenue, filterBatch, activeTab]);

  const loadData = () => {
    setPlayers(StorageService.getPlayers());
    // Filter users to get only coaches
    const allUsers = StorageService.getUsers();
    setCoaches(allUsers.filter(u => u.role === 'coach'));
    
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
            result = result.filter(c => c.assignedVenues?.includes(filterVenue));
        }
        if (filterBatch !== 'ALL') {
            result = result.filter(c => c.assignedBatches?.includes(filterBatch));
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
          setEditingPlayer(null);
          setPreviewUrl(null);
      }
  };

  const saveCoachChanges = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingCoach) {
          StorageService.updateUser(editingCoach);
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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Orbitron' }}>
             SQUAD <span className="text-icarus-500">MANAGER</span>
          </h2>
          <p className="text-gray-500 font-medium text-sm">Update profiles, assign batches, and manage roster.</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            <button 
                onClick={() => setActiveTab('players')}
                className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'players' 
                    ? 'bg-icarus-900 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
            >
                Athletes
            </button>
            <button 
                onClick={() => setActiveTab('coaches')}
                className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'coaches' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
            >
                Coaching Staff
            </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab === 'players' ? 'players' : 'coaches'}...`} 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-icarus-500 transition-all text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <div className="relative group min-w-[140px]">
                  <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select 
                    className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-icarus-500 transition-all text-sm font-bold text-gray-600 appearance-none cursor-pointer"
                    value={filterVenue}
                    onChange={(e) => setFilterVenue(e.target.value)}
                  >
                      <option value="ALL">All Venues</option>
                      {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 w-3 h-3" />
              </div>
              <div className="relative group min-w-[140px]">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select 
                    className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-icarus-500 transition-all text-sm font-bold text-gray-600 appearance-none cursor-pointer"
                    value={filterBatch}
                    onChange={(e) => setFilterBatch(e.target.value)}
                  >
                      <option value="ALL">All Batches</option>
                      {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 w-3 h-3" />
              </div>
          </div>
      </div>

      {/* --- PLAYERS TABLE --- */}
      {activeTab === 'players' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Athlete</th>
                              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Details</th>
                              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Assignment</th>
                              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredPlayers.map(p => (
                              <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-4">
                                          <img src={p.photoUrl} className="w-10 h-10 rounded-xl bg-gray-200 object-cover border border-gray-200" />
                                          <div>
                                              <div className="font-bold text-gray-900">{p.fullName}</div>
                                              <div className="text-[10px] font-mono text-gray-400">{p.memberId}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2 text-xs text-gray-600">
                                              <UserIcon size={12} className="text-gray-400" /> {p.position}
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-gray-600">
                                              <Phone size={12} className="text-gray-400" /> {p.contactNumber}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1">
                                          {p.venue && (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 w-fit">
                                                  <Map size={10} /> {p.venue}
                                              </span>
                                          )}
                                          {p.batch && (
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-100 w-fit">
                                                  <Layers size={10} /> {p.batch}
                                              </span>
                                          )}
                                          {!p.venue && !p.batch && <span className="text-xs text-gray-400 italic">Unassigned</span>}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => openEditModal(p, 'player')}
                                            className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-icarus-600 hover:border-icarus-500 rounded-lg transition-all shadow-sm"
                                            title="Edit Profile"
                                          >
                                              <Edit2 size={16} />
                                          </button>
                                          <button 
                                            onClick={() => handleSecureDelete(p, 'player')}
                                            className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-500 rounded-lg transition-all shadow-sm"
                                            title="Delete Player"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredPlayers.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="text-center py-12 text-gray-400">
                                      No players found matching your filters.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- COACHES TABLE --- */}
      {activeTab === 'coaches' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
              <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-blue-50/50 border-b border-gray-200">
                          <tr>
                              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Staff Member</th>
                              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Access Scope</th>
                              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredCoaches.map(c => (
                              <tr key={c.id} className="hover:bg-blue-50/20 transition-colors group">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-4">
                                          <img 
                                            src={c.photoUrl || `https://ui-avatars.com/api/?name=${c.username}&background=0c4a6e&color=fff`} 
                                            className="w-10 h-10 rounded-full bg-gray-200 object-cover border border-gray-200" 
                                          />
                                          <div>
                                              <div className="font-bold text-gray-900">{c.username}</div>
                                              <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md w-fit mt-0.5">Head Coach</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-col gap-2">
                                          <div className="flex flex-wrap gap-1">
                                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1">Venues:</span>
                                              {c.assignedVenues && c.assignedVenues.length > 0 ? (
                                                  c.assignedVenues.map(v => (
                                                      <span key={v} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-bold text-gray-600">{v}</span>
                                                  ))
                                              ) : (
                                                  <span className="text-[10px] text-gray-400 italic">None</span>
                                              )}
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1">Batches:</span>
                                              {c.assignedBatches && c.assignedBatches.length > 0 ? (
                                                  c.assignedBatches.map(b => (
                                                      <span key={b} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-bold text-gray-600">{b}</span>
                                                  ))
                                              ) : (
                                                  <span className="text-[10px] text-gray-400 italic">None</span>
                                              )}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => openEditModal(c, 'coach')}
                                            className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-500 rounded-lg transition-all shadow-sm"
                                            title="Edit Staff"
                                          >
                                              <Edit2 size={16} />
                                          </button>
                                          <button 
                                            onClick={() => handleSecureDelete(c, 'coach')}
                                            className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-500 rounded-lg transition-all shadow-sm"
                                            title="Remove Staff"
                                          >
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredCoaches.length === 0 && (
                              <tr>
                                  <td colSpan={3} className="text-center py-12 text-gray-400">
                                      No coaches found.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-900">Edit Profile: {editingPlayer.fullName}</h3>
                      <button onClick={() => setEditingPlayer(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <form onSubmit={savePlayerChanges} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      <div className="flex flex-col items-center mb-8">
                          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-md">
                                  <img src={previewUrl || editingPlayer.photoUrl} className="w-full h-full object-cover" />
                              </div>
                              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="text-white" size={24} />
                              </div>
                              <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handlePhotoChange}
                              />
                          </div>
                          <p className="text-xs text-gray-400 mt-2 font-medium">Click to update photo</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Full Name</label>
                              <input 
                                required
                                type="text" 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-bold"
                                value={editingPlayer.fullName}
                                onChange={e => setEditingPlayer({...editingPlayer, fullName: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date of Birth</label>
                              <input 
                                required
                                type="date" 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium"
                                value={editingPlayer.dateOfBirth}
                                onChange={e => setEditingPlayer({...editingPlayer, dateOfBirth: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Position</label>
                              <select 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium bg-white"
                                value={editingPlayer.position}
                                onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value})}
                              >
                                  {['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'TBD'].map(pos => (
                                      <option key={pos} value={pos}>{pos}</option>
                                  ))}
                              </select>
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Contact Number</label>
                              <input 
                                type="tel" 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium"
                                value={editingPlayer.contactNumber}
                                onChange={e => setEditingPlayer({...editingPlayer, contactNumber: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Parent Name</label>
                              <input 
                                type="text" 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium"
                                value={editingPlayer.parentName}
                                onChange={e => setEditingPlayer({...editingPlayer, parentName: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Address</label>
                              <input 
                                type="text" 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium"
                                value={editingPlayer.address || ''}
                                onChange={e => setEditingPlayer({...editingPlayer, address: e.target.value})}
                              />
                          </div>

                          <div className="md:col-span-2 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Assigned Venue</label>
                                  <div className="relative">
                                      <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                      <select 
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium bg-white"
                                        value={editingPlayer.venue || ''}
                                        onChange={e => setEditingPlayer({...editingPlayer, venue: e.target.value})}
                                      >
                                          <option value="">Select Venue...</option>
                                          {venues.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Assigned Batch</label>
                                  <div className="relative">
                                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                      <select 
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-icarus-500 outline-none text-sm font-medium bg-white"
                                        value={editingPlayer.batch || ''}
                                        onChange={e => setEditingPlayer({...editingPlayer, batch: e.target.value})}
                                      >
                                          <option value="">Select Batch...</option>
                                          {batches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                      </select>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </form>

                  <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                      <button 
                        type="button" 
                        onClick={() => setEditingPlayer(null)}
                        className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors text-sm"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={savePlayerChanges}
                        className="px-8 py-3 bg-icarus-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all text-sm uppercase tracking-wider flex items-center gap-2"
                      >
                          <Save size={16} />
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Coach Modal */}
      {editingCoach && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <Shield className="text-blue-600" size={20} />
                          <h3 className="font-bold text-lg text-gray-900">Edit Staff Profile</h3>
                      </div>
                      <button onClick={() => setEditingCoach(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <form onSubmit={saveCoachChanges} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      <div className="flex flex-col items-center mb-8">
                          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-md">
                                  <img src={previewUrl || editingCoach.photoUrl || `https://ui-avatars.com/api/?name=${editingCoach.username}&background=0c4a6e&color=fff`} className="w-full h-full object-cover" />
                              </div>
                              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="text-white" size={24} />
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

                      <div className="space-y-6">
                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Username / Name</label>
                              <div className="relative">
                                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input 
                                    required
                                    type="text" 
                                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                                    value={editingCoach.username}
                                    onChange={e => setEditingCoach({...editingCoach, username: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Password</label>
                              <div className="relative">
                                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input 
                                    required
                                    type="text" 
                                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                    value={editingCoach.password}
                                    onChange={e => setEditingCoach({...editingCoach, password: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="pt-4 border-t border-gray-100 space-y-4">
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                      <MapPin size={12} /> Venue Access
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                      {venues.map(v => (
                                          <button
                                              key={v.id}
                                              type="button"
                                              onClick={() => toggleCoachAssignment('venue', v.name)}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                                                  editingCoach.assignedVenues?.includes(v.name)
                                                  ? 'bg-blue-600 text-white border-blue-600'
                                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                              }`}
                                          >
                                              {v.name}
                                              {editingCoach.assignedVenues?.includes(v.name) && <Check size={10} />}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                      <Layers size={12} /> Batch Access
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                      {batches.map(b => (
                                          <button
                                              key={b.id}
                                              type="button"
                                              onClick={() => toggleCoachAssignment('batch', b.name)}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                                                  editingCoach.assignedBatches?.includes(b.name)
                                                  ? 'bg-purple-600 text-white border-purple-600'
                                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
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

                  <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                      <button 
                        type="button" 
                        onClick={() => setEditingCoach(null)}
                        className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors text-sm"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={saveCoachChanges}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all text-sm uppercase tracking-wider flex items-center gap-2"
                      >
                          <Save size={16} />
                          Update Staff
                      </button>
                  </div>
              </div>
          </div>
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
