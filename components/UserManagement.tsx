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
        <div className="mt-6 p-8 glass-card border-white/10 shadow-2xl relative overflow-hidden bg-brand-950/40 backdrop-blur-xl rounded-3xl space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            
            <div className="space-y-4">
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">Select Access Trajectory</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Trajectory: Player */}
                    <button 
                        onClick={() => setForm({ ...form, role: 'player' })}
                        className={`p-6 rounded-2xl border text-left transition-all ${
                            form.role === 'player' 
                            ? 'bg-brand-accent text-brand-950 border-brand-accent shadow-[0_0_20px_rgba(195,246,41,0.2)] scale-[1.02]' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/50 hover:text-white'
                        }`}
                    >
                        <Users size={24} className={form.role === 'player' ? 'text-brand-950' : 'text-white/30'} />
                        <h4 className="font-black uppercase tracking-tight mt-4 text-sm italic">Link to Player</h4>
                        <p className={`text-[10px] mt-1 font-medium ${form.role === 'player' ? 'text-brand-950/70' : 'text-white/30'}`}>Parent or student accessing a specific profile</p>
                    </button>

                    {/* Trajectory: Coach */}
                    <button 
                        onClick={() => setForm({ ...form, role: 'coach' })}
                        className={`p-6 rounded-2xl border text-left transition-all ${
                            form.role === 'coach' 
                            ? 'bg-brand-primary text-brand-950 border-brand-primary shadow-[0_0_20px_rgba(0,200,255,0.2)] scale-[1.02]' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/50 hover:text-white'
                        }`}
                    >
                        <Shield size={24} className={form.role === 'coach' ? 'text-brand-950' : 'text-white/30'} />
                        <h4 className="font-black uppercase tracking-tight mt-4 text-sm italic">Setup as Coach</h4>
                        <p className={`text-[10px] mt-1 font-medium ${form.role === 'coach' ? 'text-brand-950/70' : 'text-white/30'}`}>Assign venues, batches, and operations access</p>
                    </button>

                    {/* Trajectory: Admin */}
                    <button 
                        onClick={() => setForm({ ...form, role: 'admin' })}
                        className={`p-6 rounded-2xl border text-left transition-all ${
                            form.role === 'admin' 
                            ? 'bg-white text-brand-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-[1.02]' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/50 hover:text-white'
                        }`}
                    >
                        <Database size={24} className={form.role === 'admin' ? 'text-brand-950' : 'text-white/30'} />
                        <h4 className="font-black uppercase tracking-tight mt-4 text-sm italic">Academy Admin</h4>
                        <p className={`text-[10px] mt-1 font-medium ${form.role === 'admin' ? 'text-brand-950/70' : 'text-white/30'}`}>Full access to system controls and finances</p>
                    </button>
                </div>
            </div>

            {/* Sub-configurations based on Trajectory */}
            <div className="min-h-[100px]">
                {form.role === 'player' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500 bg-white/5 p-6 rounded-2xl border border-white/10">
                        <label className="block text-[10px] font-black text-brand-accent uppercase tracking-[0.3em] italic mb-4">Link Existing Profile</label>
                        <select
                            className="w-full bg-brand-950 border border-white/10 rounded-xl p-4 text-white font-black italic text-[10px] outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all cursor-pointer uppercase tracking-widest"
                            value={form.linkedPlayerId || ''}
                            onChange={e => setForm({ ...form, linkedPlayerId: e.target.value })}
                        >
                            <option value="" className="bg-brand-950">-- SELECT PLAYER RECORD TO LINK --</option>
                            {players.map(p => (
                                <option key={p.id} value={p.id} className="bg-brand-950">{p.fullName} ({p.memberId})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-white/30 italic mt-2 font-bold uppercase tracking-widest">The user will only see data (evaluations, attendance) for this specific player.</p>
                    </div>
                )}

                {form.role === 'coach' && (
                    <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-left-4 duration-500">
                        <label className="block text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] italic mb-2">Configure Coach Permissions</label>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">
                                <MapPin size={14} className="text-brand-primary" /> Authorized Venues
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {venues.map(v => (
                                    <button key={v.id} type="button"
                                        onClick={() => toggleAssignment(form, setForm, 'venue', v.name)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all uppercase tracking-widest italic ${
                                            form.assignedVenues?.includes(v.name)
                                            ? 'bg-brand-primary text-brand-950 border-brand-primary shadow-[0_0_15px_rgba(0,200,255,0.3)] scale-105'
                                            : 'bg-brand-950 text-white/40 border-white/10 hover:bg-white/10'
                                        }`}>{v.name}</button>
                                ))}
                                {venues.length === 0 && <span className="text-[10px] text-white/20 italic font-bold">No venues defined.</span>}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic">
                                <Layers size={14} className="text-brand-primary" /> Authorized Batches
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {batches.map(b => (
                                    <button key={b.id} type="button"
                                        onClick={() => toggleAssignment(form, setForm, 'batch', b.name)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all uppercase tracking-widest italic ${
                                            form.assignedBatches?.includes(b.name)
                                            ? 'bg-brand-primary text-brand-950 border-brand-primary shadow-[0_0_15px_rgba(0,200,255,0.3)] scale-105'
                                            : 'bg-brand-950 text-white/40 border-white/10 hover:bg-white/10'
                                        }`}>{b.name}</button>
                                ))}
                                {batches.length === 0 && <span className="text-[10px] text-white/20 italic font-bold">No batches defined.</span>}
                            </div>
                        </div>
                    </div>
                )}

                {form.role === 'admin' && (
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center justify-center animate-in fade-in slide-in-from-left-4 duration-500">
                        <p className="text-[11px] text-white/60 font-medium text-center">
                            <span className="block font-black text-white uppercase tracking-widest mb-1 italic">Administrative Privileges</span>
                            This user will have full read/write access to all academy data, finances, and settings.
                        </p>
                    </div>
                )}
                
                {/* Fallback for form mounted without initial selection */}
                {!form.role && (
                    <div className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Awaiting Trajectory Selection</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-white/10">
                <button
                    onClick={() => onSave(userId)}
                    disabled={isSaving || !form.role || (form.role === 'player' && !form.linkedPlayerId)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-brand-accent text-brand-950 rounded-xl font-black text-[12px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl italic"
                >
                    {isSaving ? <div className="w-4 h-4 border-2 border-brand-950/30 border-t-brand-950 rounded-full animate-spin" /> : <Shield size={16} />}
                    {saveLabel}
                </button>
                <button onClick={onCancel} className="px-6 py-4 bg-brand-950 text-white/60 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all outline-none italic border border-white/10">
                    Cancel
                </button>
            </div>
        </div>
    );

    // ── User row for active users ──────────────────────────────────
    const renderActiveUserRow = (user: User) => (
        <div key={user.id} className="p-8 hover:bg-brand-primary/5 transition-all group border-b border-white/5 last:border-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-3xl bg-brand-950 flex items-center justify-center text-xl font-black text-brand-primary overflow-hidden border-2 border-white/10 group-hover:border-brand-primary transition-all shadow-xl">
                            {user.photoUrl ? (
                                <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
                            ) : user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-primary rounded-lg flex items-center justify-center border border-white/10 shadow-lg">
                            <Shield size={12} className="text-brand-950" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h4 className="font-black text-white italic text-xl uppercase tracking-tighter leading-none">{user.username}</h4>
                            <span className="text-[10px] font-black text-brand-accent/40 uppercase tracking-widest font-mono">#{user.id.slice(-4)}</span>
                        </div>
                        {user.email && <p className="text-[10px] text-white/30 font-bold mt-1 uppercase tracking-widest">{user.email}</p>}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border italic shadow-sm ${
                                user.role === 'admin' ? 'bg-brand-950 text-brand-primary border-white/10' :
                                user.role === 'coach' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' :
                                'bg-white/5 text-white/60 border-white/10'
                            }`}>{user.role}</div>
                            {user.role === 'player' && user.linkedPlayerId && (
                                <div className="text-[10px] text-white/40 font-black flex items-center gap-2 uppercase italic tracking-tighter">
                                    <Check size={14} className="text-brand-accent" />
                                    Linked: <span className="text-brand-accent">{players.find(p => p.id === user.linkedPlayerId)?.fullName || 'Unknown'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {editingUserId === user.id ? (
                        <>
                            <button onClick={() => handleSaveEdit(user.id)} className="w-12 h-12 flex items-center justify-center bg-brand-primary text-brand-950 rounded-2xl hover:brightness-110 transition-all shadow-xl active:scale-95 border border-brand-primary/20" title="Save"><Check size={20} /></button>
                            <button onClick={handleCancelEdit} className="w-12 h-12 flex items-center justify-center bg-brand-950 text-white rounded-2xl hover:bg-white/5 transition-all shadow-xl active:scale-95 border border-white/10" title="Cancel"><X size={20} /></button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => handleEditClick(user)} className="w-12 h-12 flex items-center justify-center bg-brand-950 text-white/60 rounded-2xl hover:text-brand-primary transition-all shadow-xl active:scale-95 border border-white/10" title="Edit"><Edit2 size={20} /></button>
                            <button onClick={() => handleDeleteClick(user)} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-95 border border-red-500/20" title="Delete"><Trash2 size={20} /></button>
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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-brand-950/40 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12"><Users size={120} className="text-white" /></div>
                <div className="relative z-10 space-y-2">
                    <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none flex items-center gap-4">
                        USER <span className="text-brand-accent font-black">MANAGEMENT</span>
                    </h2>
                    <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em] italic pt-2">Personnel Authorization // Access Protocol Control</p>
                </div>
            </div>

            {/* ── PENDING APPROVALS ─────────────────────────────────────── */}
            {pendingUsers.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-4 px-2">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-white uppercase italic tracking-[0.3em] flex items-center gap-3">
                                <Clock className="text-yellow-400" size={20} />
                                AWAITING_APPROVAL
                                <span className="bg-yellow-400/20 text-yellow-400 px-4 py-1 rounded-xl text-xs font-black ml-2 border border-yellow-400/30 shadow-xl flex items-center gap-1.5">
                                    <Bell size={11} className="animate-pulse" />{pendingUsers.length}
                                </span>
                            </h2>
                            <div className="h-1 w-32 bg-yellow-400/30 rounded-full" />
                        </div>
                    </div>

                    <div className="bg-brand-950/40 backdrop-blur-xl rounded-[2.5rem] border border-yellow-400/20 overflow-hidden shadow-2xl divide-y divide-white/5 mt-6">
                        {pendingUsers.map(user => (
                            <div key={user.id} className="p-8 hover:bg-yellow-400/5 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-3xl bg-brand-950 flex items-center justify-center text-xl font-black text-yellow-400 overflow-hidden border-2 border-yellow-400/20 shadow-xl">
                                                {user.photoUrl ? <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" /> : user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-lg flex items-center justify-center border border-white/10 shadow-lg">
                                                <Clock size={12} className="text-brand-950" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white italic text-xl uppercase tracking-tighter leading-none">{user.username}</h4>
                                            {user.email && <p className="text-[10px] text-white/30 font-bold mt-1 uppercase tracking-widest">{user.email}</p>}
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                <div className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border italic bg-yellow-400/10 text-yellow-400 border-yellow-400/20">
                                                    Pending
                                                </div>
                                                {user.requestedRole && (
                                                    <div className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border bg-white/5 text-white/50 border-white/10 italic">
                                                        Requested: {user.requestedRole}
                                                    </div>
                                                )}
                                                {user.requestReason && (
                                                    <p className="text-[10px] text-white/30 italic font-bold uppercase tracking-tight">"{user.requestReason}"</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {approvingUserId === user.id ? (
                                            <>
                                                <button onClick={() => handleConfirmApprove(user.id)} disabled={isApproving} className="flex items-center gap-2 px-5 py-3 bg-brand-primary text-brand-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-xl italic">
                                                    {isApproving ? <div className="w-4 h-4 border-2 border-brand-950/30 border-t-brand-950 rounded-full animate-spin" /> : <CheckCircle size={16} />}
                                                    Confirm Access
                                                </button>
                                                <button onClick={() => setApprovingUserId(null)} className="w-10 h-10 flex items-center justify-center bg-brand-950 text-white/40 rounded-xl hover:bg-white/5 transition-all outline-none border border-white/10"><X size={18} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleApproveClick(user)} className="flex items-center gap-2 px-5 py-3 bg-brand-accent/10 text-brand-accent rounded-xl hover:bg-brand-accent hover:text-brand-950 transition-all font-black text-[10px] uppercase tracking-widest border border-brand-accent/20 shadow-xl italic">
                                                    <CheckCircle size={16} /> Approve
                                                </button>
                                                <button onClick={() => handleReject(user.id)} className="flex items-center gap-2 px-5 py-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest border border-red-500/20 shadow-xl italic">
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
            <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-[0.3em] flex items-center gap-3">
                            <Shield className="text-brand-primary" size={20} />
                            ACTIVE_COMMAND_UNITS
                            <span className="bg-brand-950 text-brand-primary px-4 py-1 rounded-xl text-xs font-black ml-4 border border-brand-primary/20 shadow-xl">{activeUsers.length}</span>
                        </h2>
                        <div className="h-1 w-32 bg-brand-primary/20 rounded-full" />
                    </div>
                </div>

                <div className="bg-brand-950/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl mt-6">
                    <div className="divide-y divide-white/5">
                        {activeUsers.map(renderActiveUserRow)}
                        {activeUsers.length === 0 && (
                            <div className="p-20 text-center text-white/10 font-black uppercase tracking-[0.4em] italic text-xs flex flex-col items-center justify-center gap-6">
                                <Shield size={64} className="opacity-5" />
                                No active command units found
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── REJECTED USERS ─────────────────────────────────────────── */}
            {rejectedUsers.length > 0 && (
                <section className="space-y-4">
                    <div className="px-2 space-y-1">
                        <h2 className="text-xl font-black text-white/40 uppercase italic tracking-[0.3em] flex items-center gap-3">
                            <XCircle className="text-red-400/50" size={20} />
                            REJECTED_REQUESTS
                            <span className="bg-red-500/10 text-red-400/50 px-4 py-1 rounded-xl text-xs font-black ml-2 border border-red-400/10">{rejectedUsers.length}</span>
                        </h2>
                        <div className="h-1 w-32 bg-red-400/10 rounded-full" />
                    </div>

                    <div className="bg-brand-950/40 backdrop-blur-xl rounded-[2.5rem] border border-red-500/10 overflow-hidden divide-y divide-white/5 mt-6">
                        {rejectedUsers.map(user => (
                            <div key={user.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-base font-black text-red-400/50 overflow-hidden border border-red-500/10">
                                        {user.photoUrl ? <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover opacity-50" /> : user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white/40 italic uppercase tracking-tight">{user.username}</h4>
                                        {user.email && <p className="text-[10px] text-white/20 font-bold mt-1 uppercase tracking-widest">{user.email}</p>}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => handleRestore(user.id)} className="flex items-center gap-2 px-4 py-2.5 bg-brand-950 text-white/40 rounded-xl hover:text-brand-primary transition-all font-black text-[10px] uppercase tracking-widest border border-white/5 italic">
                                        <Clock size={14} /> Restore
                                    </button>
                                    <button onClick={() => handleDeleteClick(user)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400/50 rounded-xl hover:bg-red-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest border border-red-500/10 italic">
                                        <Trash2 size={14} /> Purge
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
