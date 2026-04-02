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
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Access Control & Staff Management</h2>
            <p className="text-sm text-gray-500">Users are automatically added when they sign in with Google. You can assign roles and link player profiles below.</p>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                            <Users size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800">System Users</h3>
                    </div>
                    <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-500 shadow-sm">
                        {users.length} Active
                    </span>
                </div>
                
                <div className="divide-y divide-gray-100">
                    {users.map(user => (
                        <div key={user.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 overflow-hidden border border-gray-200">
                                        {user.photoUrl ? (
                                            <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
                                        ) : (
                                            user.username.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-900">{user.username}</h4>
                                            {user.role === 'admin' && <Shield size={14} className="text-brand-500" />}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                user.role === 'admin' ? 'bg-brand-100 text-brand-700' :
                                                user.role === 'coach' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {user.role}
                                            </span>
                                            {user.role === 'player' && user.linkedPlayerId && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Check size={12} className="text-green-500" />
                                                    Linked: {players.find(p => p.id === user.linkedPlayerId)?.fullName || 'Unknown'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {editingUserId === user.id ? (
                                        <>
                                            <button onClick={() => handleSaveEdit(user.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                                                <Check size={18} />
                                            </button>
                                            <button onClick={handleCancelEdit} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Cancel">
                                                <X size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleEditClick(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Role">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDeleteClick(user)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Revoke Access">
                                                <Trash2 size={18} />
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
