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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-brand-800 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03]"><Shield size={160} className="text-white" /></div>
                <div className="relative z-10">
                    <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter leading-none">
                        ACCESS <span className="text-brand-500">CONTROL</span>
                    </h2>
                    <p className="text-brand-500 font-black uppercase text-[10px] tracking-[0.3em] mt-3 italic">Autonomous Security & Staff Authorization Protocol</p>
                </div>
            </div>

            <div className="bg-brand-950 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl shadow-inner">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-brand-950/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl border border-brand-500/20 shadow-lg">
                            <Users size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Verified Command Units</h3>
                    </div>
                    <span className="px-4 py-1.5 bg-brand-900 border border-white/10 rounded-xl text-[10px] font-black text-brand-500 uppercase tracking-widest shadow-2xl italic">
                        {users.length} SECURED
                    </span>
                </div>
                
                <div className="divide-y divide-gray-100">
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
                                            <h4 className="font-black text-brand-950 italic text-xl uppercase tracking-tighter leading-none">{user.username}</h4>
                                            <span className="text-[10px] font-black text-brand-500/40 uppercase tracking-widest font-mono">#{user.id.slice(-4)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border italic shadow-sm ${
                                                user.role === 'admin' ? 'bg-brand-950 text-brand-500 border-white/10' :
                                                user.role === 'coach' ? 'bg-brand-500/10 text-brand-950 border-brand-500/20' :
                                                'bg-brand-50 text-brand-600 border-brand-100'
                                            }`}>
                                                {user.role}
                                            </div>
                                            {user.role === 'player' && user?.linkedPlayerId && (
                                                <div className="text-[10px] text-brand-950 font-black flex items-center gap-2 uppercase italic tracking-tighter opacity-60">
                                                    <Check size={14} className="text-brand-500" />
                                                    Linked: <span className="text-brand-500">{players.find(p => p.id === user?.linkedPlayerId)?.fullName || 'Unknown'}</span>
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
                                                className="w-12 h-12 flex items-center justify-center bg-brand-50 text-brand-950 rounded-2xl hover:bg-brand-950 hover:text-white transition-all shadow-xl active:scale-95 border border-brand-100 group/btn"
                                                title="Cancel"
                                            >
                                                <X size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleEditClick(user)} 
                                                className="w-12 h-12 flex items-center justify-center bg-brand-50 text-brand-950 rounded-2xl hover:bg-brand-950 hover:text-brand-500 transition-all shadow-xl active:scale-95 border border-brand-100 group/btn"
                                                title="Modify Permissions"
                                            >
                                                <Edit2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(user)} 
                                                className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-600 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95 border border-red-100 group/btn"
                                                title="Revoke Credentials"
                                            >
                                                <Trash2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Edit Form Inline */}
                            {editingUserId === user.id && (
                                <div className="mt-6 p-6 bg-white border border-blue-100 rounded-xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Role</label>
                                            <select 
                                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium bg-white"
                                                value={editForm.role}
                                                onChange={e => setEditForm({...editForm, role: e.target.value as any})}
                                            >
                                                <option value="player">Student (Player Portal)</option>
                                                <option value="coach">Coach (Team Manager)</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </div>

                                        {editForm.role === 'player' && (
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Link to Player Profile</label>
                                                <select 
                                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium bg-white"
                                                    value={editForm.linkedPlayerId}
                                                    onChange={e => setEditForm({...editForm, linkedPlayerId: e.target.value})}
                                                >
                                                    <option value="">Select a player...</option>
                                                    {players.map(p => (
                                                        <option key={p.id} value={p.id}>{p.fullName} ({p.memberId})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {editForm.role === 'coach' && (
                                        <div className="space-y-4 pt-4 border-t border-gray-100">
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                    <MapPin size={14} /> Assign Venues
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {venues.map(v => (
                                                        <button
                                                            key={v.id}
                                                            type="button"
                                                            onClick={() => toggleAssignment('venue', v.name)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                                editForm.assignedVenues?.includes(v.name)
                                                                ? 'bg-brand-900 text-white border-brand-900'
                                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {v.name}
                                                        </button>
                                                    ))}
                                                    {venues.length === 0 && <span className="text-xs text-gray-400 italic">No venues defined.</span>}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                                    <Layers size={14} /> Assign Batches
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {batches.map(b => (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            onClick={() => toggleAssignment('batch', b.name)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                                editForm.assignedBatches?.includes(b.name)
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {b.name}
                                                        </button>
                                                    ))}
                                                    {batches.length === 0 && <span className="text-xs text-gray-400 italic">No batches defined.</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {users.length === 0 && (
                        <div className="p-12 text-center text-gray-400 font-medium">
                            No users found. Users will appear here when they sign in.
                        </div>
                    )}
                </div>
            </div>

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
