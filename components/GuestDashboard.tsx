import React, { useState, useEffect } from 'react';
import { Clock, Trophy, CalendarDays, Megaphone, ShieldOff, LogOut, ChevronRight, Sparkles, Mail } from 'lucide-react';
import { User, Announcement, ScheduleEvent } from '../types';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface GuestDashboardProps {
    user: User;
    onLogout: () => void;
}

export const GuestDashboard: React.FC<GuestDashboardProps> = ({ user, onLogout }) => {
    const [notices, setNotices] = useState<Announcement[]>([]);
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const isRejected = user.role === 'rejected';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [noticesSnap, scheduleSnap] = await Promise.all([
                    getDocs(query(collection(db, 'notices'), orderBy('date', 'desc'), limit(3))),
                    getDocs(query(collection(db, 'schedule'), orderBy('date', 'asc'), limit(4))),
                ]);

                const noticeData = noticesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Announcement[];
                const scheduleData = scheduleSnap.docs
                    .map(d => ({ id: d.id, ...d.data() })) as ScheduleEvent[];

                // Only show upcoming events
                const today = new Date().toISOString().split('T')[0];
                const upcoming = scheduleData.filter(e => e.date >= today);

                setNotices(noticeData);
                setEvents(upcoming);
            } catch (e) {
                console.warn('Could not load guest data:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const eventTypeStyle: Record<string, string> = {
        training: 'bg-brand-500/10 text-brand-500 border-brand-500/20',
        match: 'bg-[#C3F629]/10 text-[#8ab51a] border-[#C3F629]/20',
        social: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };

    const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700 font-display">

            {/* ── Status Banner ────────────────────────────────────────── */}
            {isRejected ? (
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-red-950/30 border border-red-500/20 p-6 md:p-8 rounded-[2rem]">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/20">
                        <ShieldOff size={22} className="text-red-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-white uppercase tracking-tight text-sm">Access Denied</h3>
                        <p className="text-white/40 text-[11px] font-bold mt-1 leading-relaxed">
                            Your access request was not approved. Contact the academy admin for more information.
                        </p>
                    </div>
                    <a
                        href="mailto:negidevender19@gmail.com"
                        className="flex items-center gap-2 px-5 py-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest border border-red-500/20 shrink-0"
                    >
                        <Mail size={14} /> Contact Admin
                    </a>
                </div>
            ) : (
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-yellow-500/5 border border-yellow-400/20 p-6 md:p-8 rounded-[2rem]">
                    <div className="relative w-12 h-12 shrink-0">
                        <div className="absolute inset-0 bg-yellow-400/20 rounded-2xl animate-ping" />
                        <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center border border-yellow-400/20 relative">
                            <Clock size={22} className="text-yellow-400" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-white uppercase tracking-tight text-sm">Access Pending</h3>
                        <p className="text-white/40 text-[11px] font-bold mt-1 leading-relaxed">
                            You're in as a guest. An admin will link your profile to unlock your full dashboard — no action needed from your side.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-5 py-3 bg-yellow-400/10 text-yellow-400 rounded-xl font-black text-[10px] uppercase tracking-widest border border-yellow-400/20 shrink-0">
                        <Sparkles size={14} /> Guest Access
                    </div>
                </div>
            )}

            {/* ── Profile Card ─────────────────────────────────────────── */}
            <div className="bg-brand-900 rounded-[2.5rem] border border-white/5 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-8 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                    <Trophy size={120} className="text-white" />
                </div>
                <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 border-brand-500/20 shadow-xl shrink-0">
                    {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-brand-800 flex items-center justify-center text-3xl font-black text-brand-500">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="flex-1 relative z-10">
                    <div className="flex items-center gap-4 flex-wrap mb-2">
                        <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none" style={{ fontFamily: 'Space Grotesk' }}>
                            {user.username}
                        </h2>
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${isRejected ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20'}`}>
                            {isRejected ? 'Rejected' : 'Guest'}
                        </span>
                    </div>
                    <p className="text-white/30 text-[11px] font-bold tracking-widest uppercase">{user.email}</p>
                    {user.requestedRole && (
                        <p className="text-brand-500/60 text-[10px] font-bold mt-2 uppercase tracking-widest">
                            Requested role: <span className="text-brand-500">{user.requestedRole}</span>
                        </p>
                    )}
                </div>
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-5 py-3 bg-white/5 text-white/30 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all font-black text-[10px] uppercase tracking-widest border border-white/5 shrink-0"
                >
                    <LogOut size={14} /> Sign Out
                </button>
            </div>

            {/* ── Content Grid ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Latest Notices */}
                <div className="bg-brand-950 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center border border-brand-500/20">
                            <Megaphone size={18} className="text-brand-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-white uppercase tracking-tight text-sm italic">Academy Notices</h3>
                            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest mt-0.5">Read-only · Latest 3</p>
                        </div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {loading && [1, 2, 3].map(i => (
                            <div key={i} className="p-6 space-y-2">
                                <div className="h-3 bg-brand-900 rounded-lg w-3/4 animate-pulse" />
                                <div className="h-2 bg-brand-900/50 rounded-lg w-1/2 animate-pulse" />
                            </div>
                        ))}
                        {!loading && notices.length === 0 && (
                            <div className="p-12 text-center text-white/20 text-[10px] font-black uppercase tracking-widest">No notices yet</div>
                        )}
                        {!loading && notices.map(notice => (
                            <div key={notice.id} className="p-6 hover:bg-white/[0.02] transition-all">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            {notice.priority === 'high' && (
                                                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-red-500/20">Urgent</span>
                                            )}
                                            <h4 className="font-black text-white text-sm uppercase tracking-tight leading-tight">{notice.title}</h4>
                                        </div>
                                        <p className="text-white/40 text-[11px] font-medium leading-relaxed line-clamp-2">{notice.content}</p>
                                    </div>
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest shrink-0 mt-1">{formatDate(notice.date)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Schedule */}
                <div className="bg-brand-950 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#C3F629]/10 rounded-xl flex items-center justify-center border border-[#C3F629]/20">
                            <CalendarDays size={18} className="text-[#C3F629]" />
                        </div>
                        <div>
                            <h3 className="font-black text-white uppercase tracking-tight text-sm italic">Upcoming Events</h3>
                            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest mt-0.5">Read-only · Academy Schedule</p>
                        </div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {loading && [1, 2, 3].map(i => (
                            <div key={i} className="p-6 space-y-2">
                                <div className="h-3 bg-brand-900 rounded-lg w-2/3 animate-pulse" />
                                <div className="h-2 bg-brand-900/50 rounded-lg w-1/3 animate-pulse" />
                            </div>
                        ))}
                        {!loading && events.length === 0 && (
                            <div className="p-12 text-center text-white/20 text-[10px] font-black uppercase tracking-widest">No upcoming events</div>
                        )}
                        {!loading && events.map(event => (
                            <div key={event.id} className="p-6 hover:bg-white/[0.02] transition-all">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center w-12 shrink-0">
                                            <div className="text-xl font-black text-white leading-none">{new Date(event.date + 'T00:00:00').getDate()}</div>
                                            <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">{new Date(event.date + 'T00:00:00').toLocaleString('en-IN', { month: 'short' })}</div>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-sm uppercase tracking-tight leading-tight">{event.title}</h4>
                                            <p className="text-white/30 text-[10px] font-bold mt-1">{event.location} · {event.time}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shrink-0 ${eventTypeStyle[event.type] || 'bg-white/5 text-white/40 border-white/10'}`}>
                                        {event.type}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── What Happens Next ────────────────────────────────────── */}
            {!isRejected && (
                <div className="bg-brand-900 rounded-[2.5rem] border border-white/5 p-8 md:p-10 shadow-2xl">
                    <h3 className="font-black text-white uppercase tracking-tight text-sm italic mb-8 flex items-center gap-3">
                        <ChevronRight size={18} className="text-brand-500" /> What Happens Next?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { step: '01', title: 'Admin Reviews', desc: 'The academy admin will see your sign-in request in the User Management panel.' },
                            { step: '02', title: 'Profile Linked', desc: 'Your account will be linked to your player or coach profile in the system.' },
                            { step: '03', title: 'Auto-Unlock', desc: 'Your dashboard will automatically upgrade — no refresh or action needed.' },
                        ].map(item => (
                            <div key={item.step} className="flex gap-5">
                                <div className="text-4xl font-black text-white/5 leading-none shrink-0 pt-1" style={{ fontFamily: 'Space Grotesk' }}>{item.step}</div>
                                <div>
                                    <h4 className="font-black text-white uppercase tracking-tight text-sm">{item.title}</h4>
                                    <p className="text-white/40 text-[11px] font-medium leading-relaxed mt-2">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
