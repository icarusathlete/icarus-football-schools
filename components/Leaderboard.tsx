import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, AcademySettings, Role } from '../types';
import {
    Trophy, Calendar, Crown, Shield, Award, Sparkles, Zap,
    Medal, Printer, Loader2, Star, X, Activity, Users, Target
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface LeaderboardProps { role?: Role; }

const PTS_TRAINING = 1;
const PTS_MATCH    = 5;
const LS_MOTM_KEY  = 'icarus_session_motm';

function getTrainingMvps(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(LS_MOTM_KEY) || '{}'); }
    catch { return {}; }
}

interface MvpEntry {
    id: string; fullName: string; photoUrl: string; position?: string;
    trainingMvps: number; matchMvps: number; totalPts: number;
}

type Tab = 'mvp' | 'stats';

// ── Rank badge colours ────────────────────────────────────────────
const RANK_STYLE: Record<number, { bg: string; text: string; ring: string; label: string }> = {
    0: { bg: 'bg-gradient-to-br from-amber-400 to-yellow-500', text: 'text-brand-950', ring: 'ring-amber-400/40', label: 'bg-amber-400 text-brand-950' },
    1: { bg: 'bg-gradient-to-br from-slate-300 to-slate-400',  text: 'text-white',      ring: 'ring-slate-400/30', label: 'bg-slate-300 text-brand-950' },
    2: { bg: 'bg-gradient-to-br from-amber-700 to-amber-900',  text: 'text-white',      ring: 'ring-amber-700/30', label: 'bg-amber-700 text-white' },
};

export const Leaderboard: React.FC<LeaderboardProps> = ({ role }) => {
    const [tab, setTab] = useState<Tab>('mvp');
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    const [potmData, setPotmData] = useState<{ playerId: string; timestamp: number } | null>(null);
    const [potmModalOpen, setPotmModalOpen] = useState(false);
    const [potmAction, setPotmAction] = useState<{ playerId: string; playerName: string; month: string; monthName: string } | null>(null);
    const [viewingEntry, setViewingEntry] = useState<MvpEntry | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const loadData = () => {
        setPlayers(StorageService.getPlayers());
        setMatches(StorageService.getMatches());
        setPotmData(StorageService.getPOTM(month));
    };
    useEffect(() => {
        loadData();
        const onSettings = () => setSettings(StorageService.getSettings());
        window.addEventListener('settingsChanged', onSettings);
        window.addEventListener('academy_data_update', loadData);
        return () => { window.removeEventListener('settingsChanged', onSettings); window.removeEventListener('academy_data_update', loadData); };
    }, [month]);

    const monthName = new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const mvpLeaderboard: MvpEntry[] = useMemo(() => {
        const mvps = getTrainingMvps();
        return players.map(p => {
            const tCount = Object.entries(mvps).filter(([date, pid]) => pid === p.id && date.startsWith(month)).length;
            const mCount = matches.filter(m => m.date.startsWith(month) && m.playerOfTheMatchId === p.id).length;
            return { id: p.id, fullName: p.fullName, photoUrl: p.photoUrl, position: p.position, trainingMvps: tCount, matchMvps: mCount, totalPts: tCount * PTS_TRAINING + mCount * PTS_MATCH };
        }).filter(e => e.totalPts > 0).sort((a, b) => b.totalPts - a.totalPts || b.matchMvps - a.matchMvps || b.trainingMvps - a.trainingMvps);
    }, [players, matches, month]);

    const statsLeaderboard = useMemo(() => players.map(p => {
        const pm = matches.filter(m => m.date.startsWith(month) && m.playerStats.some(s => s.playerId === p.id))
            .sort((a, b) => b.date.localeCompare(a.date));
        const agg = pm.reduce((acc, m) => {
            const s = m.playerStats.find(ps => ps.playerId === p.id);
            if (s) { acc.goals += s.goals; acc.assists += s.assists; acc.ratings.push(s.rating); acc.points += s.rating; }
            return acc;
        }, { goals: 0, assists: 0, ratings: [] as number[], points: 0 });
        const avg = agg.ratings.length ? agg.ratings.reduce((a, b) => a + b, 0) / agg.ratings.length : 0;
        return { ...p, goals: agg.goals, assists: agg.assists, avgRating: parseFloat(avg.toFixed(1)), totalPoints: parseFloat(agg.points.toFixed(1)), matchCount: agg.ratings.length };
    }).filter(p => p.matchCount > 0).sort((a, b) => b.totalPoints - a.totalPoints || b.goals - a.goals), [players, matches, month]);

    const confirmAwardPotm = () => {
        if (!potmAction) return;
        StorageService.setPOTM(potmAction.playerId, potmAction.month);
        const w = mvpLeaderboard.find(p => p.id === potmAction.playerId);
        if (w) StorageService.addNotice({ title: `🏆 PLAYER OF THE MONTH: ${potmAction.playerName.toUpperCase()}`, content: `${potmAction.playerName} has been awarded Player of the Month for ${potmAction.monthName}!\n\n${w.trainingMvps} Session MVP${w.trainingMvps !== 1 ? 's' : ''} + ${w.matchMvps} Match MVP${w.matchMvps !== 1 ? 's' : ''} = ${w.totalPts} points.`, priority: 'high', author: 'Academy Staff', imageUrl: w.photoUrl });
        loadData(); setPotmModalOpen(false);
    };

    const exportToPDF = async () => {
        if (!printRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
            pdf.save(`${settings.name}_Leaderboard_${month}.pdf`);
        } finally { setIsExporting(false); }
    };

    const leader = mvpLeaderboard[0];
    const top3   = mvpLeaderboard.slice(0, 3);

    return (
        <div className="space-y-6 pb-32 font-display">

            {/* ══════════════════════════════════════════════
                HERO HEADER — dark, dramatic, high contrast
            ══════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-brand-950 shadow-2xl">
                {/* Mesh gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,_rgba(251,191,36,0.18),_transparent)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_10%_100%,_rgba(14,165,233,0.12),_transparent)]" />
                <div className="absolute top-0 right-0 p-10 opacity-[0.04]"><Medal size={180} /></div>

                <div className="relative z-10 p-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/30">
                                    <Trophy size={20} className="text-brand-950 fill-brand-950" />
                                </div>
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.4em]">MONTHLY POINTS RACE</span>
                            </div>
                            <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                                ELITE <span className="text-amber-400">LEADERBOARD</span>
                            </h1>
                            <p className="text-brand-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">{monthName}</p>

                            {leader && (
                                <div className="mt-4 inline-flex items-center gap-2 bg-amber-400/15 border border-amber-400/30 px-4 py-2 rounded-full backdrop-blur-sm">
                                    <Crown size={12} className="text-amber-400 fill-amber-400" />
                                    <span className="text-[11px] font-black text-amber-300 uppercase tracking-widest">Leading: {leader.fullName} · {leader.totalPts} pts</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3 shrink-0">
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-sm">
                                <Calendar size={14} className="text-brand-400" />
                                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                                    className="bg-transparent text-white font-black text-sm outline-none cursor-pointer w-28" />
                            </div>
                            <button onClick={exportToPDF} disabled={isExporting}
                                className="flex items-center gap-2 bg-amber-400 text-brand-950 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-300 active:scale-95 transition-all shadow-lg shadow-amber-400/25">
                                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Report
                            </button>
                        </div>
                    </div>

                    {/* Tab switcher */}
                    <div className="mt-6 flex gap-1 bg-white/5 border border-white/10 p-1 rounded-2xl w-fit">
                        <button onClick={() => setTab('mvp')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${tab === 'mvp' ? 'bg-amber-400 text-brand-950 shadow-lg' : 'text-brand-400 hover:text-white'}`}>
                            <Trophy size={12} /> MVP Points
                        </button>
                        <button onClick={() => setTab('stats')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${tab === 'stats' ? 'bg-brand-500 text-white shadow-lg' : 'text-brand-400 hover:text-white'}`}>
                            <Activity size={12} /> Match Stats
                        </button>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                MVP LADDER TAB
            ══════════════════════════════════════════════ */}
            {tab === 'mvp' && (
                <div ref={printRef} className="space-y-6 animate-in fade-in duration-400">

                    {/* Points legend */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-[1.5rem] border border-brand-100 p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-11 h-11 rounded-2xl bg-brand-500/10 flex items-center justify-center shrink-0"><Zap size={18} className="text-brand-500" /></div>
                            <div><p className="text-[8px] font-black text-brand-400 uppercase tracking-widest">Session MVP</p><p className="text-xl font-black text-brand-950">{PTS_TRAINING} <span className="text-sm font-bold text-brand-400">pt</span></p></div>
                        </div>
                        <div className="bg-white rounded-[1.5rem] border border-amber-200 p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-11 h-11 rounded-2xl bg-amber-400/15 flex items-center justify-center shrink-0"><Trophy size={18} className="text-amber-500 fill-amber-500" /></div>
                            <div><p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Match MVP</p><p className="text-xl font-black text-brand-950">{PTS_MATCH} <span className="text-sm font-bold text-brand-400">pts</span></p></div>
                        </div>
                        <div className="bg-white rounded-[1.5rem] border border-brand-100 p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0"><Users size={18} className="text-emerald-500" /></div>
                            <div><p className="text-[8px] font-black text-brand-400 uppercase tracking-widest">On Board</p><p className="text-xl font-black text-brand-950">{mvpLeaderboard.length}</p></div>
                        </div>
                        <div className="bg-white rounded-[1.5rem] border border-brand-100 p-5 flex items-center gap-4 shadow-sm">
                            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0"><Target size={18} className="text-rose-500" /></div>
                            <div><p className="text-[8px] font-black text-brand-400 uppercase tracking-widest">Total MVPs</p><p className="text-xl font-black text-brand-950">{mvpLeaderboard.reduce((s, e) => s + e.trainingMvps + e.matchMvps, 0)}</p></div>
                        </div>
                    </div>

                    {mvpLeaderboard.length > 0 ? (<>

                        {/* ─── PODIUM ─── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                            {/* P2 */}
                            <div className="order-2 md:order-1">
                                {top3[1] && (
                                    <div onClick={() => setViewingEntry(top3[1])}
                                        className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col items-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg group min-h-[280px]">
                                        <div className="relative mb-4">
                                            <div className="w-[4.5rem] h-[4.5rem] rounded-full overflow-hidden border-[3px] border-slate-300 shadow-xl group-hover:scale-110 transition-transform">
                                                <img src={top3[1].photoUrl} alt={top3[1].fullName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-[11px] font-black text-white border-2 border-white">2</div>
                                        </div>
                                        <p className="font-black text-slate-900 text-base italic uppercase tracking-tight text-center truncate w-full">{top3[1].fullName}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-4">{top3[1].position || 'PLAYER'}</p>
                                        <div className="w-full grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 mt-auto">
                                            <div className="text-center"><p className="text-[8px] font-black text-slate-300 uppercase mb-1">SESSION</p><p className="font-black text-slate-900 text-lg">{top3[1].trainingMvps}</p></div>
                                            <div className="text-center"><p className="text-[8px] font-black text-slate-300 uppercase mb-1">MATCH</p><p className="font-black text-slate-900 text-lg">{top3[1].matchMvps}</p></div>
                                            <div className="text-center"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">PTS</p><p className="font-black text-brand-500 text-xl">{top3[1].totalPts}</p></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* P1 — champion */}
                            <div className="order-1 md:order-2">
                                {top3[0] && (
                                    <div onClick={() => setViewingEntry(top3[0])}
                                        className="relative bg-white rounded-[2rem] border-2 border-amber-400 p-8 flex flex-col items-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-[0_20px_50px_rgba(251,191,36,0.15)] group min-h-[340px] overflow-hidden">
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,_rgba(251,191,36,0.08),_transparent)] pointer-events-none" />
                                        {/* Top crown bar */}
                                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                                        <div className="relative mb-4 mt-2">
                                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.3)] group-hover:scale-110 transition-transform">
                                                <img src={top3[0].photoUrl} alt={top3[0].fullName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-brand-950 border-[3px] border-white shadow-lg">
                                                <Crown size={16} className="fill-brand-950" />
                                            </div>
                                        </div>
                                        <p className="font-black text-slate-900 text-xl italic uppercase tracking-tighter text-center truncate w-full">{top3[0].fullName}</p>
                                        <p className="text-[8px] font-bold text-brand-500 uppercase tracking-widest mt-1">{top3[0].position || 'PLAYER'}</p>
                                        {potmData?.playerId === top3[0].id && (
                                            <div className="mt-3 flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-600 text-[9px] font-black px-3 py-1.5 rounded-full">
                                                <Sparkles size={10} /> PLAYER OF THE MONTH
                                            </div>
                                        )}
                                        {(role === 'admin' || role === 'coach') && potmData?.playerId !== top3[0].id && (
                                            <button onClick={e => { e.stopPropagation(); setPotmAction({ playerId: top3[0].id, playerName: top3[0].fullName, month, monthName }); setPotmModalOpen(true); }}
                                                className="mt-3 bg-amber-400 text-brand-950 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20">
                                                Award POTM
                                            </button>
                                        )}
                                        <div className="w-full grid grid-cols-3 gap-3 pt-5 border-t border-slate-100 mt-auto">
                                            <div className="text-center"><p className="text-[8px] font-black text-slate-300 uppercase mb-1">SESSION</p><p className="font-black text-slate-900 text-xl">{top3[0].trainingMvps}</p></div>
                                            <div className="text-center"><p className="text-[8px] font-black text-slate-300 uppercase mb-1">MATCH</p><p className="font-black text-slate-900 text-xl">{top3[0].matchMvps}</p></div>
                                            <div className="text-center"><p className="text-[8px] font-black text-amber-500 uppercase mb-1">PTS</p><p className="font-black text-amber-500 text-2xl">{top3[0].totalPts}</p></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* P3 */}
                            <div className="order-3">
                                {top3[2] && (
                                    <div onClick={() => setViewingEntry(top3[2])}
                                        className="bg-white rounded-[2rem] border border-amber-800/10 p-6 flex flex-col items-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg group min-h-[260px]">
                                        <div className="relative mb-4">
                                            <div className="w-[4.5rem] h-[4.5rem] rounded-full overflow-hidden border-[3px] border-amber-700/30 shadow-xl group-hover:scale-110 transition-transform">
                                                <img src={top3[2].photoUrl} alt={top3[2].fullName} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-[11px] font-black text-white border-2 border-white">3</div>
                                        </div>
                                        <p className="font-black text-slate-900 text-base italic uppercase tracking-tight text-center truncate w-full">{top3[2].fullName}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-4">{top3[2].position || 'PLAYER'}</p>
                                        <div className="w-full grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 mt-auto">
                                            <div className="text-center"><p className="text-[8px] font-black text-slate-300 uppercase mb-1">SESSION</p><p className="font-black text-slate-900 text-lg">{top3[2].trainingMvps}</p></div>
                                            <div className="text-center"><p className="text-[8px] font-black text-slate-300 uppercase mb-1">MATCH</p><p className="font-black text-slate-900 text-lg">{top3[2].matchMvps}</p></div>
                                            <div className="text-center"><p className="text-[8px] font-black text-amber-700 uppercase mb-1">PTS</p><p className="font-black text-amber-600 text-xl">{top3[2].totalPts}</p></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── FULL RANKINGS TABLE ─── */}
                        <div className="bg-white rounded-[2rem] border border-brand-100 shadow-md overflow-hidden">
                            <div className="px-6 py-5 border-b border-brand-100 flex items-center justify-between bg-brand-50/50">
                                <h3 className="font-black text-brand-950 italic uppercase tracking-tight flex items-center gap-2 text-lg">
                                    <Star size={18} className="text-amber-500 fill-amber-500" /> Full Rankings
                                </h3>
                                <p className="text-[9px] font-bold text-brand-400 uppercase tracking-widest">Click any row to view detail</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] font-black text-brand-400 uppercase tracking-[0.2em] border-b border-brand-100 bg-brand-50/30">
                                            <th className="px-6 py-4 text-center w-16">Rank</th>
                                            <th className="px-6 py-4">Player</th>
                                            <th className="px-4 py-4 text-center">
                                                <span className="flex flex-col items-center gap-0.5">Session<span className="text-brand-500 font-black">×{PTS_TRAINING}pt</span></span>
                                            </th>
                                            <th className="px-4 py-4 text-center">
                                                <span className="flex flex-col items-center gap-0.5">Match<span className="text-amber-500 font-black">×{PTS_MATCH}pts</span></span>
                                            </th>
                                            <th className="px-6 py-4 text-center bg-amber-50">
                                                <span className="text-amber-600">Total Pts</span>
                                            </th>
                                            {(role === 'admin' || role === 'coach') && <th className="px-6 py-4 text-center">POTM</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-100">
                                        {mvpLeaderboard.map((entry, idx) => (
                                            <tr key={entry.id} onClick={() => setViewingEntry(entry)}
                                                className={`group cursor-pointer transition-colors ${idx === 0 ? 'bg-amber-50/60 hover:bg-amber-50' : 'bg-white hover:bg-brand-50/50'}`}>
                                                <td className="px-6 py-4 text-center">
                                                    {idx < 3
                                                        ? <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-[11px] font-black ${RANK_STYLE[idx].label}`}>{idx + 1}</span>
                                                        : <span className="text-brand-400 font-black text-sm">{idx + 1}</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={entry.photoUrl} alt={entry.fullName} className="w-10 h-10 rounded-full object-cover border-2 border-brand-100 group-hover:border-brand-300 transition-colors" />
                                                        <div>
                                                            <p className="text-sm font-black text-brand-950 italic uppercase tracking-tight">{entry.fullName}</p>
                                                            <p className="text-[8px] font-bold text-brand-400 uppercase tracking-widest">{entry.position || '—'}</p>
                                                        </div>
                                                        {potmData?.playerId === entry.id && (
                                                            <span className="ml-1 flex items-center gap-1 bg-amber-100 text-amber-700 text-[8px] font-black px-2.5 py-1 rounded-full border border-amber-200">
                                                                <Trophy size={9} className="fill-amber-500 text-amber-500" /> POTM
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex flex-col items-center">
                                                        <span className="text-xl font-black text-brand-950">{entry.trainingMvps}</span>
                                                        <span className="text-[8px] text-brand-400">{entry.trainingMvps * PTS_TRAINING} pt</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="inline-flex flex-col items-center">
                                                        <span className="text-xl font-black text-brand-950">{entry.matchMvps}</span>
                                                        <span className="text-[8px] text-brand-400">{entry.matchMvps * PTS_MATCH} pts</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center bg-amber-50/60">
                                                    <span className={`text-2xl font-black ${idx === 0 ? 'text-amber-500' : 'text-brand-950'}`}>{entry.totalPts}</span>
                                                </td>
                                                {(role === 'admin' || role === 'coach') && (
                                                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                        {potmData?.playerId === entry.id
                                                            ? <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1 justify-center"><Trophy size={10} className="fill-amber-500" /> Awarded</span>
                                                            : <button onClick={() => { setPotmAction({ playerId: entry.id, playerName: entry.fullName, month, monthName }); setPotmModalOpen(true); }}
                                                                className="bg-brand-950 text-brand-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-brand-800 hover:bg-amber-400 hover:text-brand-950 hover:border-amber-400 transition-all active:scale-95">
                                                                Award
                                                            </button>
                                                        }
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </>) : (
                        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-brand-200 p-24 text-center flex flex-col items-center">
                            <div className="w-20 h-20 rounded-3xl bg-brand-50 flex items-center justify-center mb-6"><Trophy size={36} className="text-brand-200" /></div>
                            <h3 className="text-2xl font-black text-brand-950 italic uppercase">No MVP Awards Yet</h3>
                            <p className="text-brand-400 mt-2 text-[10px] font-bold uppercase tracking-widest max-w-sm">Award session MVPs from the Attendance page and match MVPs from Match Centre to build the leaderboard.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                MATCH STATS TAB
            ══════════════════════════════════════════════ */}
            {tab === 'stats' && (
                <div className="animate-in fade-in duration-400">
                    {statsLeaderboard.length > 0 ? (
                        <div className="bg-white rounded-[2rem] border border-brand-100 shadow-md overflow-hidden">
                            <div className="px-6 py-5 border-b border-brand-100 bg-brand-50/50 flex items-center gap-3">
                                <Activity size={18} className="text-brand-500" />
                                <h3 className="font-black text-brand-950 italic uppercase tracking-tight text-lg">Match Performance · {monthName}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[9px] font-black text-brand-400 uppercase tracking-[0.2em] border-b border-brand-100 bg-brand-50/30">
                                            <th className="px-6 py-4 text-center w-16">Rank</th>
                                            <th className="px-6 py-4">Player</th>
                                            <th className="px-4 py-4 text-center">MP</th>
                                            <th className="px-4 py-4 text-center">Goals</th>
                                            <th className="px-4 py-4 text-center">Assists</th>
                                            <th className="px-4 py-4 text-center">Avg Rtg</th>
                                            <th className="px-6 py-4 text-center bg-brand-50">Total Pts</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-100">
                                        {statsLeaderboard.map((p, idx) => (
                                            <tr key={p.id} className={`group transition-colors ${idx === 0 ? 'bg-brand-500/5 hover:bg-brand-500/10' : 'bg-white hover:bg-brand-50/50'}`}>
                                                <td className="px-6 py-4 text-center">
                                                    {idx < 3
                                                        ? <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-[11px] font-black ${RANK_STYLE[idx].label}`}>{idx + 1}</span>
                                                        : <span className="text-brand-400 font-black text-sm">{idx + 1}</span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={p.photoUrl} alt={p.fullName} className="w-10 h-10 rounded-full object-cover border-2 border-brand-100" />
                                                        <div>
                                                            <p className="text-sm font-black text-brand-950 italic uppercase tracking-tight">{p.fullName}</p>
                                                            <p className="text-[8px] font-bold text-brand-400 uppercase tracking-widest">{p.position || '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center font-black text-brand-950">{p.matchCount}</td>
                                                <td className="px-4 py-4 text-center font-black text-brand-950">{p.goals}</td>
                                                <td className="px-4 py-4 text-center font-black text-brand-950">{p.assists}</td>
                                                <td className="px-4 py-4 text-center font-black text-brand-950">{p.avgRating}</td>
                                                <td className={`px-6 py-4 text-center font-black text-2xl bg-brand-50/60 ${idx === 0 ? 'text-brand-500' : 'text-brand-950'}`}>{p.totalPoints}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-brand-200 p-24 text-center flex flex-col items-center">
                            <div className="w-20 h-20 rounded-3xl bg-brand-50 flex items-center justify-center mb-6"><Activity size={36} className="text-brand-200" /></div>
                            <h3 className="text-2xl font-black text-brand-950 italic uppercase">No Match Data</h3>
                            <p className="text-brand-400 mt-2 text-[10px] font-bold uppercase tracking-widest">No match telemetry for the selected period.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                PLAYER DETAIL MODAL
            ══════════════════════════════════════════════ */}
            {viewingEntry && (
                <div className="fixed inset-0 z-[100] bg-brand-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingEntry(null)}>
                    <div className="relative w-80 bg-white rounded-[2.5rem] border border-brand-100 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Gold header strip */}
                        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
                        <button onClick={() => setViewingEntry(null)} className="absolute top-4 right-4 text-brand-300 hover:text-brand-950 transition-colors z-10"><X size={20} /></button>

                        <div className="p-8 flex flex-col items-center gap-5">
                            <div className="relative">
                                <img src={viewingEntry.photoUrl} alt={viewingEntry.fullName} className="w-24 h-24 rounded-2xl object-cover border-2 border-brand-100" />
                                <div className="absolute -top-3 -right-3 w-9 h-9 bg-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/30">
                                    <Trophy size={16} className="text-brand-950 fill-brand-950" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-brand-950 italic uppercase">{viewingEntry.fullName}</h3>
                                <p className="text-[9px] font-bold text-brand-400 uppercase tracking-widest mt-1">{viewingEntry.position || 'PLAYER'}</p>
                            </div>
                            <div className="w-full grid grid-cols-3 gap-3">
                                <div className="bg-brand-50 rounded-2xl p-4 text-center border border-brand-100">
                                    <p className="text-[8px] font-black text-brand-400 uppercase mb-1">SESSION</p>
                                    <p className="text-2xl font-black text-brand-950">{viewingEntry.trainingMvps}</p>
                                    <p className="text-[8px] text-brand-400">×{PTS_TRAINING} pt</p>
                                </div>
                                <div className="bg-brand-50 rounded-2xl p-4 text-center border border-brand-100">
                                    <p className="text-[8px] font-black text-brand-400 uppercase mb-1">MATCH</p>
                                    <p className="text-2xl font-black text-brand-950">{viewingEntry.matchMvps}</p>
                                    <p className="text-[8px] text-brand-400">×{PTS_MATCH} pts</p>
                                </div>
                                <div className="bg-amber-50 rounded-2xl p-4 text-center border border-amber-200">
                                    <p className="text-[8px] font-black text-amber-600 uppercase mb-1">TOTAL</p>
                                    <p className="text-2xl font-black text-amber-600">{viewingEntry.totalPts}</p>
                                    <p className="text-[8px] text-amber-400">pts</p>
                                </div>
                            </div>
                            {(role === 'admin' || role === 'coach') && potmData?.playerId !== viewingEntry.id && (
                                <button onClick={() => { setViewingEntry(null); setPotmAction({ playerId: viewingEntry.id, playerName: viewingEntry.fullName, month, monthName }); setPotmModalOpen(true); }}
                                    className="w-full bg-brand-950 text-amber-400 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-400 hover:text-brand-950 active:scale-95 transition-all">
                                    <Crown size={14} /> Award Player of the Month
                                </button>
                            )}
                            {potmData?.playerId === viewingEntry.id && (
                                <div className="w-full bg-amber-50 border border-amber-200 py-3 rounded-2xl text-center">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center justify-center gap-2"><Sparkles size={12} /> Player of the Month</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={potmModalOpen} onCancel={() => setPotmModalOpen(false)} onConfirm={confirmAwardPotm}
                title="Award Player of the Month"
                message={`Officially award ${potmAction?.playerName} as Player of the Month for ${potmAction?.monthName}? An announcement will be posted to the academy board.`}
                confirmText="AWARD POTM" type="danger"
            />
        </div>
    );
};
