import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { User, Player, Venue, Batch } from '../types';
import { Shield, Trash2, Users, Check, MapPin, Layers, Edit2, X, Clock, CheckCircle, XCircle, Bell, Database } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});

    // Approval state
    const [approvingUserId, setApprovingUserId] = useState<string | null>(null);
    const [approveForm, setApproveForm] = useState<Partial<User>>({});
    const [isApproving, setIsApproving] = useState(false);

    // Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const loadData = async () => {
        const allUsers = await StorageService.getUsers();
        setUsers(allUsers);
        setPlayers(StorageService.getPlayers());
        setVenues(StorageService.getVenues());
        setBatches(StorageService.getBatches());
    };

    useEffect(() => {
        loadData();
        window.addEventListener('academy_data_update', loadData);
        return () => window.removeEventListener('academy_data_update', loadData);
    }, []);

    // ── Split users by status ──────────────────────────────────────
    const pendingUsers = users.filter(u => u.role === 'pending');
    const rejectedUsers = users.filter(u => u.role === 'rejected');
    const activeUsers = users.filter(u => !['pending', 'rejected'].includes(u.role));

    // ── Edit (existing active users) ──────────────────────────────
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

    // ── Approve pending user ──────────────────────────────────────
    const handleApproveClick = (user: User) => {
        setApprovingUserId(user.id);
        setApproveForm({
            role: (user.requestedRole as any) || 'player',
            linkedPlayerId: '',
            assignedVenues: [],
            assignedBatches: []
        });
    };

    const handleConfirmApprove = async (userId: string) => {
        const userToApprove = users.find(u => u.id === userId);
        if (!userToApprove || !approveForm.role) return;
        setIsApproving(true);
        try {
            await updateDoc(doc(db, 'users', userId), {
                role: approveForm.role,
                linkedPlayerId: approveForm.role === 'player' ? (approveForm.linkedPlayerId || '') : '',
                assignedVenues: approveForm.role === 'coach' ? (approveForm.assignedVenues || []) : [],
                assignedBatches: approveForm.role === 'coach' ? (approveForm.assignedBatches || []) : [],
            });
            setApprovingUserId(null);
            setApproveForm({});
            await loadData();
        } catch (err: any) {
            alert('Failed to approve user: ' + err.message);
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async (userId: string) => {
        try {
            await updateDoc(doc(db, 'users', userId), { role: 'rejected' });
            await loadData();
        } catch (err: any) {
            alert('Failed to reject user: ' + err.message);
        }
    };

    const handleRestore = async (userId: string) => {
        try {
            await updateDoc(doc(db, 'users', userId), { role: 'pending' });
            await loadData();
        } catch (err: any) {
            alert('Failed to restore user: ' + err.message);
        }
    };

    // ── Delete ────────────────────────────────────────────────────
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
            console.error('Error deleting user:', err);
            alert(err.message);
        }
    };

    const toggleAssignment = (form: Partial<User>, setForm: React.Dispatch<React.SetStateAction<Partial<User>>>, type: 'venue' | 'batch', value: string) => {
        if (type === 'venue') {
            setForm(prev => ({
                ...prev,
                assignedVenues: prev.assignedVenues?.includes(value)
                    ? prev.assignedVenues.filter(v => v !== value)
                    : [...(prev.assignedVenues || []), value]
            }));
        } else {
            setForm(prev => ({
                ...prev,
                assignedBatches: prev.assignedBatches?.includes(value)
                    ? prev.assignedBatches.filter(b => b !== value)
                    : [...(prev.assignedBatches || []), value]
            }));
        }
    };

    // ── Profile-First Assignment Form ──────────────────────────────
    const renderAssignmentForm = (
        form: Partial<User>,
        setForm: React.Dispatch<React.SetStateAction<Partial<User>>>,
        userId: string,
        onSave: (id: string) => void,
        onCancel: () => void,
        saveLabel: string,
        isSaving: boolean
    ) => (
        <div className="mt-6 p-8 bg-brand-50 border border-brand-100 shadow-xl relative overflow-hidden rounded-3xl space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            
            <div className="space-y-4">
                <label className="block text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] italic">Select Access Trajectory</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Trajectory: Player */}
                    <button 
                        onClick={() => setForm({ ...form, role: 'player' })}
                        className={`p-6 rounded-2xl border text-left transition-all ${
                            form.role === 'player' 
                            ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-[0_0_20px_rgba(0,102,255,0.1)] scale-[1.02]' 
                            : 'bg-white border-brand-100 hover:bg-brand-50 text-brand-400 hover:text-brand-950'
                        }`}
                    >
                        <Users size={24} className={form.role === 'player' ? 'text-brand-950' : 'text-brand-200'} />
                        <h4 className="font-black uppercase tracking-tight mt-4 text-sm italic">Link to Player</h4>
                        <p className={`text-[10px] mt-1 font-medium ${form.role === 'player' ? 'text-brand-950/70' : 'text-brand-400'}`}>Parent or student accessing a specific profile</p>
                    </button>

                    {/* Trajectory: Coach */}
                    <button 
                        onClick={() => setForm({ ...form, role: 'coach' })}
                        className={`p-6 rounded-2xl border text-left transition-all ${
                            form.role === 'coach' 
                            ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-[0_0_20px_rgba(0,102,255,0.1)] scale-[1.02]' 
                            : 'bg-white border-brand-100 hover:bg-brand-50 text-brand-400 hover:text-brand-950'
                        }`}
                    >
                        <Shield size={24} className={form.role === 'coach' ? 'text-brand-950' : 'text-brand-200'} />
                        <h4 className="font-black uppercase tracking-tight mt-4 text-sm italic">Setup as Coach</h4>
                        <p className={`text-[10px] mt-1 font-medium ${form.role === 'coach' ? 'text-brand-950/70' : 'text-brand-400'}`}>Assign venues, batches, and operations access</p>
                    </button>

                    {/* Trajectory: Admin */}
                    <button 
                        onClick={() => setForm({ ...form, role: 'admin' })}
                        className={`p-6 rounded-2xl border text-left transition-all ${
                            form.role === 'admin' 
                            ? 'bg-brand-950 text-white border-brand-950 shadow-[0_0_20px_rgba(0,0,0,0.1)] scale-[1.02]' 
                            : 'bg-white border-brand-100 hover:bg-brand-50 text-brand-400 hover:text-brand-950'
                        }`}
                    >
                        <Database size={24} className={form.role === 'admin' ? 'text-white' : 'text-brand-200'} />
                        <h4 className="font-black uppercase tracking-tight mt-4 text-sm italic">Academy Admin</h4>
                        <p className={`text-[10px] mt-1 font-medium ${form.role === 'admin' ? 'text-white/70' : 'text-brand-400'}`}>Full access to system controls and finances</p>
                    </button>
                </div>
            </div>

            {/* Sub-configurations based on Trajectory */}
            <div className="min-h-[100px]">
                {form.role === 'player' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500 bg-white p-6 rounded-2xl border border-brand-100">
                        <label className="block text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] italic mb-4">Link Existing Profile</label>
                        <select
                            className="w-full bg-brand-50 border border-brand-100 rounded-xl p-4 text-brand-950 font-black italic text-[10px] outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer uppercase tracking-widest"
                            value={form.linkedPlayerId || ''}
                            onChange={e => setForm({ ...form, linkedPlayerId: e.target.value })}
                        >
                            <option value="" className="bg-white">-- SELECT PLAYER RECORD TO LINK --</option>
                            {players.map(p => (
                                <option key={p.id} value={p.id} className="bg-white">{p.fullName} ({p.memberId})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-brand-400 italic mt-2 font-bold uppercase tracking-widest">The user will only see data (evaluations, attendance) for this specific player.</p>
                    </div>
                )}

                {form.role === 'coach' && (
                    <div className="space-y-6 bg-white p-6 rounded-2xl border border-brand-100 animate-in fade-in slide-in-from-left-4 duration-500">
                        <label className="block text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] italic mb-2">Configure Coach Permissions</label>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] italic">
                                <MapPin size={14} className="text-brand-500" /> Authorized Venues
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {venues.map(v => (
                                    <button key={v.id} type="button"
                                        onClick={() => toggleAssignment(form, setForm, 'venue', v.name)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all uppercase tracking-widest italic ${
                                            form.assignedVenues?.includes(v.name)
                                            ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-lg scale-105'
                                            : 'bg-brand-50 text-brand-400 border-brand-100 hover:bg-brand-100'
                                        }`}>{v.name}</button>
                                ))}
                                {venues.length === 0 && <span className="text-[10px] text-brand-200 italic font-bold">No venues defined.</span>}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] italic">
                                <Layers size={14} className="text-brand-500" /> Authorized Batches
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {batches.map(b => (
                                    <button key={b.id} type="button"
                                        onClick={() => toggleAssignment(form, setForm, 'batch', b.name)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all uppercase tracking-widest italic ${
                                            form.assignedBatches?.includes(b.name)
                                            ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-lg scale-105'
                                            : 'bg-brand-50 text-brand-400 border-brand-100 hover:bg-brand-100'
                                        }`}>{b.name}</button>
                                ))}
                                {batches.length === 0 && <span className="text-[10px] text-brand-200 italic font-bold">No batches defined.</span>}
                            </div>
                        </div>
                    </div>
                )}

                {form.role === 'admin' && (
                    <div className="bg-white border border-brand-100 p-6 rounded-2xl flex items-center justify-center animate-in fade-in slide-in-from-left-4 duration-500">
                        <p className="text-[11px] text-brand-600 font-medium text-center">
                            <span className="block font-black text-brand-950 uppercase tracking-widest mb-1 italic">Administrative Privileges</span>
                            This user will have full read/write access to all academy data, finances, and settings.
                        </p>
                    </div>
                )}
                
                {/* Fallback for form mounted without initial selection */}
                {!form.role && (
                    <div className="h-full flex items-center justify-center border border-dashed border-brand-200 rounded-2xl bg-white">
                        <p className="text-[10px] font-black text-brand-200 uppercase tracking-widest italic">Awaiting Trajectory Selection</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-brand-100">
                <button
                    onClick={() => onSave(userId)}
                    disabled={isSaving || !form.role || (form.role === 'player' && !form.linkedPlayerId)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-brand-500 text-brand-950 rounded-xl font-black text-[12px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-500/10 italic"
                >
                    {isSaving ? <div className="w-4 h-4 border-2 border-brand-950/30 border-t-brand-950 rounded-full animate-spin" /> : <Shield size={16} />}
                    {saveLabel}
                </button>
                <button onClick={onCancel} className="px-6 py-4 bg-white text-brand-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-50 transition-all outline-none italic border border-brand-100">
                    Cancel
                </button>
            </div>
        </div>
    );

    // ── User row for active users ──────────────────────────────────
    const renderActiveUserRow = (user: User) => (
        <div key={user.id} className="p-8 hover:bg-brand-50 transition-all group border-b border-brand-100 last:border-0 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-3xl bg-brand-50 flex items-center justify-center text-xl font-black text-brand-500 overflow-hidden border-2 border-brand-100 group-hover:border-brand-500 transition-all shadow-xl">
                            {user.photoUrl ? (
                                <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
                            ) : user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center border border-white shadow-lg">
                            <Shield size={12} className="text-brand-950" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h4 className="font-black text-brand-950 italic text-xl uppercase tracking-tighter leading-none">{user.username}</h4>
                            <span className="text-[10px] font-black text-brand-500/40 uppercase tracking-widest font-mono">#{user.id.slice(-4)}</span>
                        </div>
                        {user.email && <p className="text-[10px] text-brand-400 font-bold mt-1 uppercase tracking-widest">{user.email}</p>}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border italic shadow-sm leading-none flex items-center h-6 ${
                                user.role === 'admin' ? 'bg-brand-950 text-white border-brand-950' :
                                user.role === 'coach' ? 'bg-brand-500/10 text-brand-950 border-brand-500/20' :
                                'bg-white text-brand-400 border-brand-100'
                            }`}>{user.role}</div>
                            {user.role === 'player' && user.linkedPlayerId && (
                                <div className="text-[10px] text-brand-400 font-black flex items-center gap-2 uppercase italic tracking-tighter">
                                    <Check size={14} className="text-brand-500" />
                                    Linked: <span className="text-brand-500">{players.find(p => p.id === user.linkedPlayerId)?.fullName || 'Unknown'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {editingUserId === user.id ? (
                        <>
                            <button onClick={() => handleSaveEdit(user.id)} className="w-12 h-12 flex items-center justify-center bg-brand-500 text-brand-950 rounded-2xl hover:brightness-110 transition-all shadow-xl active:scale-95 border border-brand-500/20" title="Save"><Check size={20} /></button>
                            <button onClick={handleCancelEdit} className="w-12 h-12 flex items-center justify-center bg-white text-brand-400 rounded-2xl hover:bg-brand-50 transition-all shadow-xl active:scale-95 border border-brand-100" title="Cancel"><X size={20} /></button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => handleEditClick(user)} className="w-12 h-12 flex items-center justify-center bg-white text-brand-200 rounded-2xl hover:text-brand-500 hover:border-brand-500 transition-all shadow-lg active:scale-95 border border-brand-100" title="Edit"><Edit2 size={20} /></button>
                            <button onClick={() => handleDeleteClick(user)} className="w-12 h-12 flex items-center justify-center bg-red-500/5 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95 border border-red-500/10" title="Delete"><Trash2 size={20} /></button>
                        </>
                    )}
                </div>
            </div>
            {editingUserId === user.id && renderAssignmentForm(editForm, setEditForm, user.id, handleSaveEdit, handleCancelEdit, 'Update Access Protocols', false)}
        </div>
    );

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 md:p-12 rounded-[2.5rem] border border-brand-100 shadow-xl shadow-brand-500/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12"><Users size={120} className="text-brand-500" /></div>
                <div className="relative z-10 space-y-2">
                    <h2 className="text-4xl md:text-5xl font-black italic text-brand-950 uppercase tracking-tighter leading-none flex items-center gap-4">
                        USER <span className="text-brand-500 font-black">MANAGEMENT</span>
                    </h2>
                    <p className="text-brand-400 font-black uppercase text-[10px] tracking-[0.4em] italic pt-2">Personnel Authorization // Access Protocol Control</p>
                </div>
            </div>

            {/* ── PENDING APPROVALS ─────────────────────────────────────── */}
            {pendingUsers.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-brand-950 uppercase italic tracking-[0.3em] flex items-center gap-3">
                                <Clock className="text-yellow-500" size={20} />
                                AWAITING_APPROVAL
                                <span className="bg-yellow-500/10 text-yellow-600 px-4 py-1 rounded-xl text-xs font-black ml-2 border border-yellow-500/20 shadow-sm flex items-center gap-1.5">
                                    <Bell size={11} className="animate-pulse" />{pendingUsers.length}
                                </span>
                            </h2>
                            <div className="h-1 w-32 bg-yellow-500/20 rounded-full" />
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-yellow-500/20 overflow-hidden shadow-xl shadow-yellow-500/5 divide-y divide-brand-100">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="p-8 hover:bg-yellow-500/5 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-3xl bg-brand-50 flex items-center justify-center text-xl font-black text-yellow-600 overflow-hidden border-2 border-yellow-500/20 shadow-lg">
                                                {user.photoUrl ? <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" /> : user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-500 rounded-lg flex items-center justify-center border border-white shadow-md">
                                                <Clock size={12} className="text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-brand-950 italic text-xl uppercase tracking-tighter leading-none">{user.username}</h4>
                                            {user.email && <p className="text-[10px] text-brand-400 font-bold mt-1 uppercase tracking-widest">{user.email}</p>}
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                <div className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border italic bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                                    Pending
                                                </div>
                                                {user.requestedRole && (
                                                    <div className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border bg-brand-50 text-brand-400 border-brand-100 italic">
                                                        Requested: {user.requestedRole}
                                                    </div>
                                                )}
                                                {user.requestReason && (
                                                    <p className="text-[10px] text-brand-400 italic font-bold uppercase tracking-tight">"{user.requestReason}"</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {approvingUserId === user.id ? (
                                            <>
                                                <button onClick={() => handleConfirmApprove(user.id)} disabled={isApproving} className="flex items-center gap-2 px-5 py-3 bg-brand-500 text-brand-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-xl italic">
                                                    {isApproving ? <div className="w-4 h-4 border-2 border-brand-950/30 border-t-brand-950 rounded-full animate-spin" /> : <CheckCircle size={16} />}
                                                    Confirm Access
                                                </button>
                                                <button onClick={() => setApprovingUserId(null)} className="w-10 h-10 flex items-center justify-center bg-white text-brand-400 rounded-xl hover:bg-brand-50 transition-all outline-none border border-brand-100"><X size={18} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleApproveClick(user)} className="flex items-center gap-2 px-5 py-3 bg-brand-50 text-brand-500 rounded-xl hover:bg-brand-500 hover:text-brand-950 transition-all font-black text-[10px] uppercase tracking-widest border border-brand-500/20 shadow-lg italic">
                                                    <CheckCircle size={16} /> Approve
                                                </button>
                                                <button onClick={() => handleReject(user.id)} className="flex items-center gap-2 px-5 py-3 bg-red-50/50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest border border-red-500/10 shadow-lg italic">
                                                    <XCircle size={16} /> Reject
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {approvingUserId === user.id && renderAssignmentForm(approveForm, setApproveForm, user.id, handleConfirmApprove, () => setApprovingUserId(null), 'Approve & Grant Access', isApproving)}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── ACTIVE USERS ──────────────────────────────────────────── */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-brand-950 uppercase italic tracking-[0.3em] flex items-center gap-3">
                            <Shield className="text-brand-500" size={20} />
                            ACTIVE_COMMAND_UNITS
                            <span className="bg-brand-950 text-white px-4 py-1 rounded-xl text-xs font-black ml-4 shadow-xl">{activeUsers.length}</span>
                        </h2>
                        <div className="h-1 w-32 bg-brand-500/20 rounded-full" />
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-brand-100 overflow-hidden shadow-xl shadow-brand-500/5 mt-6">
                    <div className="divide-y divide-brand-100">
                        {activeUsers.map(renderActiveUserRow)}
                        {activeUsers.length === 0 && (
                            <div className="p-24 text-center text-brand-200 font-black uppercase tracking-[0.4em] italic text-xs flex flex-col items-center justify-center gap-8">
                                <Shield size={80} className="opacity-10" />
                                No active command units found
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── REJECTED USERS ─────────────────────────────────────────── */}
            {rejectedUsers.length > 0 && (
                <section className="space-y-6">
                    <div className="px-2 space-y-1">
                        <h2 className="text-xl font-black text-brand-400 uppercase italic tracking-[0.3em] flex items-center gap-3">
                            <XCircle className="text-red-300" size={20} />
                            REJECTED_REQUESTS
                            <span className="bg-red-50 text-red-400/50 px-4 py-1 rounded-xl text-xs font-black ml-2 border border-red-100">{rejectedUsers.length}</span>
                        </h2>
                        <div className="h-1 w-32 bg-red-100 rounded-full" />
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-brand-100 overflow-hidden divide-y divide-brand-50 mt-6 shadow-xl shadow-brand-500/5">
                        {rejectedUsers.map(user => (
                            <div key={user.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-red-50/10 transition-all">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-base font-black text-brand-200 overflow-hidden border border-brand-100">
                                        {user.photoUrl ? <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover opacity-50" /> : user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-brand-950/40 italic uppercase tracking-tight">{user.username}</h4>
                                        {user.email && <p className="text-[10px] text-brand-400 font-bold mt-1 uppercase tracking-widest">{user.email}</p>}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => handleRestore(user.id)} className="flex items-center gap-2 px-5 py-3 bg-brand-50 text-brand-500 rounded-xl hover:bg-brand-500 hover:text-brand-950 transition-all font-black text-[10px] uppercase tracking-widest border border-brand-100 italic shadow-sm">
                                        <Clock size={16} /> Restore
                                    </button>
                                    <button onClick={() => handleDeleteClick(user)} className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest border border-red-100 italic shadow-sm">
                                        <Trash2 size={16} /> Purge
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

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
