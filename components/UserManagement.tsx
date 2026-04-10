import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { User, Player, Venue, Batch } from '../types';
import { Shield, Trash2, Users, Check, MapPin, Layers, Edit2, X } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});

    // Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const loadData = () => {
        setUsers(StorageService.getUsers());
        setPlayers(StorageService.getPlayers());
        setVenues(StorageService.getVenues());
        setBatches(StorageService.getBatches());
    };

    useEffect(() => {
        loadData();
        window.addEventListener('academy_data_update', loadData);
        return () => window.removeEventListener('academy_data_update', loadData);
    }, []);

    const handleEditClick = (user: User) => {
        setEditingUserId(user.id);
        setEditForm({
            role: user.role,
            linkedPlayerId: user.linkedPlayerId || '',
            assignedVenues: user.assignedVenues || [],
            assignedBatches: user.assignedBatches || []
        });
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setEditForm({});
    };

    const handleSaveEdit = async (userId: string) => {
        const userToUpdate = users.find(u => u.id === userId);
        if (!userToUpdate) return;

        const updatedUser: User = {
            ...userToUpdate,
            role: editForm.role as User['role'],
            linkedPlayerId: editForm.role === 'player' ? editForm.linkedPlayerId : '',
            assignedVenues: editForm.role === 'coach' ? editForm.assignedVenues : [],
            assignedBatches: editForm.role === 'coach' ? editForm.assignedBatches : []
        };

        try {
            await StorageService.updateUser(updatedUser);
            setEditingUserId(null);
            setEditForm({});
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await StorageService.deleteUser(userToDelete.id);
            setDeleteModalOpen(false);
            setUserToDelete(null);
        } catch (err: any) {
            console.error("Error deleting user:", err);
            alert(err.message);
        }
    };

    const toggleAssignment = (type: 'venue' | 'batch', value: string) => {
        if (type === 'venue') {
            setEditForm(prev => ({
                ...prev,
                assignedVenues: prev.assignedVenues?.includes(value)
                    ? prev.assignedVenues.filter(v => v !== value)
                    : [...(prev.assignedVenues || []), value]
            }));
        } else {
            setEditForm(prev => ({
                ...prev,
                assignedBatches: prev.assignedBatches?.includes(value)
                    ? prev.assignedBatches.filter(b => b !== value)
                    : [...(prev.assignedBatches || []), value]
            }));
        }
    };

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">
            {/* Unified Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-brand-900 p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12"><Users size={120} className="text-white" /></div>
                <div className="relative z-10 space-y-2">
                    <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none flex items-center gap-4">
                        USER <span className="text-[#CCFF00] font-black">MANAGEMENT</span>
                    </h2>
                    <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em] italic">Personnel Authorization // Access Protocol Control</p>
                </div>
            </div>

            {/* Active Users Section with Standard Bar Divider */}
            <section className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-[0.3em] flex items-center gap-3">
                            <Shield className="text-brand-primary" size={20} /> 
                            ACTIVE_COMMAND_UNITS
                            <span className="bg-brand-950 text-brand-primary px-4 py-1 rounded-xl text-xs font-black ml-4 border border-brand-primary/20 shadow-xl">{users.length}</span>
                        </h2>
                        <div className="h-1 w-32 bg-brand-primary/20 rounded-full" />
                    </div>
                </div>

                <div className="bg-brand-950 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    {/* List Content */}
                
                <div className="divide-y divide-white/5">
                    {users.map(user => (
                        <div key={user.id} className="p-8 hover:bg-brand-500/5 transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className="relative group/avatar">
                                        <div className="w-18 h-18 rounded-3xl bg-brand-950 flex items-center justify-center text-xl font-black text-brand-500 overflow-hidden border-2 border-brand-500/20 group-hover:border-brand-500 transition-all shadow-xl">
                                            {user.photoUrl ? (
                                                <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
                                            ) : (
                                                user.username.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center border border-white/10 shadow-lg">
                                            <Shield size={12} className="text-brand-950" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-black text-white italic text-xl uppercase tracking-tighter leading-none">{user.username}</h4>
                                            <span className="text-[10px] font-black text-lime/40 uppercase tracking-widest font-mono">#{user.id.slice(-4)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border italic shadow-sm ${
                                                user.role === 'admin' ? 'bg-brand-950 text-brand-500 border-white/10' :
                                                user.role === 'coach' ? 'bg-brand-500/10 text-brand-950 border-brand-500/20' :
                                                'bg-white/5 text-white/60 border-white/10'
                                            }`}>
                                                {user.role}
                                            </div>
                                            {user.role === 'player' && user?.linkedPlayerId && (
                                                <div className="text-[10px] text-white/40 font-black flex items-center gap-2 uppercase italic tracking-tighter">
                                                    <Check size={14} className="text-lime" />
                                                    Linked: <span className="text-lime">{players.find(p => p.id === user?.linkedPlayerId)?.fullName || 'Unknown'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {editingUserId === user.id ? (
                                        <>
                                            <button 
                                                onClick={() => handleSaveEdit(user.id)} 
                                                className="w-12 h-12 flex items-center justify-center bg-brand-500 text-brand-950 rounded-2xl hover:bg-brand-950 hover:text-brand-500 transition-all shadow-xl active:scale-95 border border-brand-500/20 group/btn"
                                                title="Save Changes"
                                            >
                                                <Check size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                            <button 
                                                onClick={handleCancelEdit} 
                                                className="w-12 h-12 flex items-center justify-center bg-brand-900 text-white rounded-2xl hover:bg-brand-950 hover:text-white transition-all shadow-xl active:scale-95 border border-white/5 group/btn"
                                                title="Cancel"
                                            >
                                                <X size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleEditClick(user)} 
                                                className="w-12 h-12 flex items-center justify-center bg-brand-900 text-white rounded-2xl hover:bg-brand-950 hover:text-brand-500 transition-all shadow-xl active:scale-95 border border-white/5 group/btn"
                                                title="Edit User"
                                            >
                                                <Edit2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(user)} 
                                                className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95 border border-red-500/20 group/btn"
                                                title="Delete User"
                                            >
                                                <Trash2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Edit Form Inline */}
                            {editingUserId === user.id && (
                                <div className="mt-6 p-8 glass-card border-white/10 shadow-2xl relative overflow-hidden group/form bg-white/5 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">User Role</label>
                                            <select 
                                                className="w-full bg-brand-950/50 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-lime/50 transition-all cursor-pointer uppercase text-xs"
                                                value={editForm.role}
                                                onChange={e => setEditForm({...editForm, role: e.target.value as any})}
                                            >
                                                <option value="player" className="bg-brand-950">Player</option>
                                                <option value="coach" className="bg-brand-950">Coach</option>
                                                <option value="admin" className="bg-brand-950">Administrator</option>
                                            </select>
                                        </div>

                                        {editForm.role === 'player' && (
                                            <div className="space-y-3 animate-in zoom-in-95 duration-500">
                                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">Link Player Profile</label>
                                                <select 
                                                    className="w-full bg-brand-950/50 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-lime/50 transition-all cursor-pointer uppercase text-xs"
                                                    value={editForm.linkedPlayerId}
                                                    onChange={e => setEditForm({...editForm, linkedPlayerId: e.target.value})}
                                                >
                                                    <option value="" className="bg-brand-950">Select profile to link...</option>
                                                    {players.map(p => (
                                                        <option key={p.id} value={p.id} className="bg-brand-950">{p.fullName} ({p.memberId})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {editForm.role === 'coach' && (
                                        <div className="space-y-6 pt-6 border-t border-white/5 animate-in slide-in-from-bottom-4 duration-500">
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">
                                                    <MapPin size={14} className="text-brand-500" /> Assigned Venues
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {venues.map(v => (
                                                        <button
                                                            key={v.id}
                                                            type="button"
                                                            onClick={() => toggleAssignment('venue', v.name)}
                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all uppercase tracking-widest ${
                                                                editForm.assignedVenues?.includes(v.name)
                                                                ? 'bg-lime text-brand-950 border-lime shadow-[0_0_15px_rgba(195,246,41,0.3)] scale-105'
                                                                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {v.name}
                                                        </button>
                                                    ))}
                                                    {venues.length === 0 && <span className="text-[10px] text-white/20 italic">No venues defined.</span>}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">
                                                    <Layers size={14} className="text-brand-500" /> Assigned Batches
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {batches.map(b => (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            onClick={() => toggleAssignment('batch', b.name)}
                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all uppercase tracking-widest ${
                                                                editForm.assignedBatches?.includes(b.name)
                                                                ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-[0_0_15px_rgba(0,200,255,0.3)] scale-105'
                                                                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {b.name}
                                                        </button>
                                                    ))}
                                                    {batches.length === 0 && <span className="text-[10px] text-white/20 italic">No batches defined.</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {users.length === 0 && (
                        <div className="p-20 text-center text-white/10 font-black uppercase tracking-[0.4em] italic text-xs flex flex-col items-center justify-center gap-6">
                            <Shield size={64} className="opacity-5" />
                            No users found
                        </div>
                    )}
                    </div>
                </div>
            </section>

            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Delete User"
                message={`Are you sure you want to permanently delete user "${userToDelete?.username}"? This action cannot be undone.`}
                requireTypeToConfirm="delete"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setUserToDelete(null);
                }}
            />
        </div>
    );
};
