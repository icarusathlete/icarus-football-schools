import React, { useState } from 'react';
import { Clock, ShieldOff, Trophy, LogOut, ChevronRight, CheckCircle2, Users, Flag } from 'lucide-react';
import { User } from '../types';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface PendingApprovalProps {
    user: User;
    onLogout: () => void;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ user, onLogout }) => {
    const [requestedRole, setRequestedRole] = useState<'coach' | 'player' | ''>('');
    const [requestReason, setRequestReason] = useState('');
    const [submitted, setSubmitted] = useState(!!user.requestedRole); // Already submitted if we have a saved role
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!requestedRole) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, 'users', user.id), {
                requestedRole,
                requestReason: requestReason.trim() || null,
            });
            setSubmitted(true);
        } catch (err) {
            console.error('Failed to submit role request:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isRejected = user.role === 'rejected';

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#00054e] font-display">
            
            {/* Background layers */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            <div className={`absolute top-0 right-0 -mt-32 -mr-32 w-[700px] h-[700px] rounded-full blur-[180px] animate-pulse-slow ${isRejected ? 'bg-red-500/10' : 'bg-brand-500/10'}`} />
            <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-[500px] h-[500px] bg-[#C3F629]/5 rounded-full blur-[140px]" />

            {/* Logo */}
            <div className="mb-10 text-center relative z-10">
                <div className="w-20 h-20 bg-white rounded-[1.5rem] inline-flex items-center justify-center border-4 border-white/10 mb-5 shadow-2xl">
                    <Trophy className="w-10 h-10 text-brand-500" />
                </div>
                <p className="text-brand-500 uppercase tracking-[0.6em] text-[9px] font-black italic">Icarus Football Schools</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] overflow-hidden relative z-10 border border-white/10 p-1.5">
                <div className="bg-slate-50/50 p-10 md:p-12 rounded-[2.8rem] border border-white/40">

                    {/* Avatar */}
                    <div className="flex flex-col items-center mb-8">
                        <div className={`w-20 h-20 rounded-[1.5rem] overflow-hidden border-4 mb-4 shadow-xl ${isRejected ? 'border-red-200' : 'border-brand-500/20'}`}>
                            {user.photoUrl ? (
                                <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-brand-50 flex items-center justify-center text-3xl font-black text-brand-500">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <h3 className="text-xl font-black text-brand-950 italic uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                            {user.username}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">{user.email}</p>
                    </div>

                    {/* ─── REJECTED STATE ─── */}
                    {isRejected && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-red-50 rounded-[1.2rem] flex items-center justify-center mx-auto border border-red-100">
                                <ShieldOff className="w-8 h-8 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-brand-950 uppercase tracking-tight italic mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                                    Access <span className="text-red-500">Denied</span>
                                </h2>
                                <div className="h-1 w-12 bg-red-400 rounded-full mx-auto mb-4" />
                                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                                    Your access request was not approved. Please contact the academy admin directly for more information.
                                </p>
                            </div>
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                                    Contact: negidevender19@gmail.com
                                </p>
                            </div>
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-600 font-black text-xs uppercase tracking-widest"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    )}

                    {/* ─── PENDING - SUBMITTED STATE ─── */}
                    {!isRejected && submitted && (
                        <div className="text-center space-y-6">
                            <div className="relative w-16 h-16 mx-auto">
                                <div className="absolute inset-0 bg-brand-500/10 rounded-[1.2rem] animate-ping" />
                                <div className="w-16 h-16 bg-brand-50 rounded-[1.2rem] flex items-center justify-center border border-brand-100 relative">
                                    <Clock className="w-8 h-8 text-brand-500" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-brand-950 uppercase tracking-tight italic mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                                    Request <span className="text-brand-500">Submitted</span>
                                </h2>
                                <div className="h-1 w-12 bg-brand-500 rounded-full mx-auto mb-4" />
                                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                                    Your access request is pending review. You'll be automatically let in the moment an admin approves your profile — no refresh needed.
                                </p>
                            </div>
                            <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4 flex items-center gap-3">
                                <CheckCircle2 size={16} className="text-brand-500 shrink-0" />
                                <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest text-left">
                                    Requested as: {user.requestedRole || requestedRole}
                                </p>
                            </div>
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all text-slate-600 font-black text-xs uppercase tracking-widest"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    )}

                    {/* ─── PENDING - ROLE REQUEST FORM ─── */}
                    {!isRejected && !submitted && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-2xl font-black text-brand-950 uppercase tracking-tight italic mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                                    Request <span className="text-brand-500">Access</span>
                                </h2>
                                <div className="h-1 w-12 bg-brand-500 rounded-full mx-auto mb-3" />
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                                    Tell us your role at the academy. An admin will review and approve your request.
                                </p>
                            </div>

                            {/* Role selector */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setRequestedRole('coach')}
                                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all text-center ${
                                        requestedRole === 'coach'
                                        ? 'border-brand-500 bg-brand-50 shadow-[0_0_20px_rgba(0,200,255,0.15)]'
                                        : 'border-slate-200 bg-white hover:border-brand-200'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${requestedRole === 'coach' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <Flag size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-950">Coach</span>
                                    <span className="text-[9px] text-slate-400 font-bold leading-tight">I coach players at the academy</span>
                                </button>
                                <button
                                    onClick={() => setRequestedRole('player')}
                                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all text-center ${
                                        requestedRole === 'player'
                                        ? 'border-[#C3F629] bg-lime-50 shadow-[0_0_20px_rgba(195,246,41,0.2)]'
                                        : 'border-slate-200 bg-white hover:border-lime-200'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${requestedRole === 'player' ? 'bg-[#C3F629] text-brand-950' : 'bg-slate-100 text-slate-400'}`}>
                                        <Users size={20} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-950">Player / Parent</span>
                                    <span className="text-[9px] text-slate-400 font-bold leading-tight">I'm enrolled or a guardian</span>
                                </button>
                            </div>

                            {/* Optional note */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Note for the admin <span className="font-medium normal-case">(optional)</span></label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. I'm the U12 coach at Saket venue..."
                                    value={requestReason}
                                    onChange={e => setRequestReason(e.target.value)}
                                    className="w-full bg-white border-2 border-slate-200 focus:border-brand-400 rounded-2xl p-4 text-brand-950 text-sm font-medium outline-none transition-all resize-none placeholder:text-slate-300"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!requestedRole || isSubmitting}
                                className="w-full bg-brand-950 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:bg-brand-900 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none uppercase tracking-[0.2em] text-xs italic"
                            >
                                {isSubmitting ? (
                                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>Submit Request <ChevronRight size={16} /></>
                                )}
                            </button>

                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                <LogOut size={14} /> Sign Out
                            </button>
                        </div>
                    )}

                </div>
            </div>

            <p className="mt-8 text-white/20 text-[9px] font-black uppercase tracking-[0.5em] italic relative z-10">
                © 2026 Icarus Football Schools • Elite Portal Control
            </p>
        </div>
    );
};
