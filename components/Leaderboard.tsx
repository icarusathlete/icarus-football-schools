import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, AcademySettings, Role } from '../types';
import { 
    Trophy, Calendar, ChevronRight, Crown, TrendingUp, 
    Minus, ArrowUp, ArrowDown, X, Shield, Award, Sparkles,
    Download, FileText, Star, Target, Zap, Activity,
    Medal, Share2, Printer, Loader2
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface LeaderboardProps {
    role?: Role;
}

const FormBadge: React.FC<{ rating: number }> = ({ rating }) => {
    let color = 'bg-brand-900 border-white/5';
    let text = '-';
    if (rating >= 8.5) { color = 'bg-lime/20 text-lime border-lime/30'; text = 'W'; }
    else if (rating >= 7) { color = 'bg-brand-500/20 text-brand-400 border-brand-500/30'; text = 'D'; }
    else if (rating < 6) { color = 'bg-red-500/20 text-red-400 border-red-500/30'; text = 'L'; }
    return (
        <div className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-black ${color} shadow-sm border`}>
            {rating}
        </div>
    );
};

export const Leaderboard: React.FC<LeaderboardProps> = ({ role }) => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    const [potmData, setPotmData] = useState<{playerId: string, timestamp: number} | null>(null);
    const [viewingPlayer, setViewingPlayer] = useState<any | null>(null);
    const [potmModalOpen, setPotmModalOpen] = useState(false);
    const [potmAction, setPotmAction] = useState<{playerId: string, playerName: string, month: string, monthName: string} | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const leaderboardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
        const handleSettings = () => setSettings(StorageService.getSettings());
        window.addEventListener('settingsChanged', handleSettings);
        window.addEventListener('academy_data_update', loadData);
        return () => {
            window.removeEventListener('settingsChanged', handleSettings);
            window.removeEventListener('academy_data_update', loadData);
        }
    }, [month]);

    const loadData = () => {
        setPlayers(StorageService.getPlayers());
        setMatches(StorageService.getMatches());
        setPotmData(StorageService.getPOTM(month));
    };

    const monthName = new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const monthlyLeaderboard = players.map(player => {
        const playerMatches = matches.filter(m => 
            m.date.startsWith(month) && m.playerStats.some(s => s.playerId === player.id)
        ).sort((a, b) => b.date.localeCompare(a.date));

        const stats = playerMatches.reduce((acc, m) => {
            const s = m.playerStats.find(ps => ps.playerId === player.id);
            if (s) {
                acc.goals += s.goals;
                acc.assists += s.assists;
                acc.ratings.push(s.rating);
                acc.points += s.rating;
            }
            return acc;
        }, { goals: 0, assists: 0, ratings: [] as number[], points: 0 });

        const avgRating = stats.ratings.length ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length : 0;

        return {
            ...player,
            goals: stats.goals,
            assists: stats.assists,
            avgRating: parseFloat(avgRating.toFixed(1)),
            totalPoints: parseFloat(stats.points.toFixed(1)),
            matchCount: stats.ratings.length,
            recentForm: stats.ratings.slice(0, 5)
        };
    }).filter(p => p.matchCount > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints || b.goals - a.goals || b.avgRating - a.avgRating);

    const topThree = monthlyLeaderboard.slice(0, 3);

    const exportToPDF = async () => {
        if (!leaderboardRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(leaderboardRef.current, {
                scale: 2,
                backgroundColor: '#050914',
                useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${settings.name}_Leaderboard_${month}.pdf`);
        } finally {
            setIsExporting(false);
        }
    };

    const confirmAwardPOTM = () => {
        if (potmAction) {
            StorageService.setPOTM(potmAction.playerId, potmAction.month);
            const winner = monthlyLeaderboard.find(p => p.id === potmAction.playerId);
            if (winner) {
                StorageService.addNotice({
                    title: `🏆 PLAYER OF THE MONTH: ${potmAction.playerName.toUpperCase()}`,
                    content: `${potmAction.playerName} has been voted Player of the Month for ${potmAction.monthName}! \n\nPerformance: ${winner.matchCount} Matches, ${winner.goals} Goals, ${winner.avgRating} Avg Rating.`,
                    priority: 'high',
                    author: 'Academy Staff',
                    imageUrl: winner.photoUrl
                });
            }
            loadData();
            setPotmModalOpen(false);
        }
    };

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-brand-500/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-brand-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Medal size={120} /></div>
                <div className="relative z-10">
                    <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">
                        ELITE <span className="text-brand-500">RANKINGS</span>
                    </h2>
                    <p className="text-brand-400 font-medium uppercase text-[10px] tracking-widest mt-1">Official performance leaderboard • {monthName}</p>
                </div>
                
                <div className="flex flex-wrap gap-3 relative z-10">
                    <div className="flex items-center gap-3 bg-brand-950 px-4 py-2 rounded-2xl border border-white/5">
                        <Calendar size={16} className="text-brand-500" />
                        <input 
                            type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                            className="bg-transparent text-white font-black text-xs outline-none cursor-pointer uppercase"
                        />
                    </div>
                    <button 
                        onClick={exportToPDF} disabled={isExporting}
                        className="bg-brand-500 text-brand-950 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-500/10"
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                        GENERATE REPORT
                    </button>
                </div>
            </div>

            <div ref={leaderboardRef} className="space-y-12">
                {monthlyLeaderboard.length > 0 ? (
                    <>
                        {/* Podium Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            {/* P2 */}
                            {topThree[1] && (
                                <div onClick={() => setViewingPlayer(topThree[1])} className="bg-brand-500/10 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-brand-500/30 flex flex-col items-center group cursor-pointer hover:border-brand-500/50 transition-all shadow-2xl order-2 md:order-1 min-h-[280px] md:h-[320px]">
                                    <div className="w-20 h-20 bg-brand-950 rounded-full border border-white/5 flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform">
                                        <img src={topThree[1].photoUrl} className="w-full h-full object-cover rounded-full" />
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-400 rounded-full flex items-center justify-center font-black text-white text-[10px] border-2 border-brand-800">2</div>
                                    </div>
                                    <h3 className="text-xl font-black text-white italic truncate w-full text-center">{topThree[1].fullName}</h3>
                                    <p className="text-[9px] font-bold text-brand-500 uppercase tracking-widest mt-1 mb-6">{topThree[1].position}</p>
                                    <div className="grid grid-cols-3 gap-4 w-full pt-6 border-t border-white/5">
                                        <div className="text-center"><p className="text-[8px] font-black text-brand-600 uppercase">GOL</p><p className="text-xl font-black text-white">{topThree[1].goals}</p></div>
                                        <div className="text-center"><p className="text-[8px] font-black text-brand-600 uppercase">RTG</p><p className="text-xl font-black text-white">{topThree[1].avgRating}</p></div>
                                        <div className="text-center"><p className="text-[8px] font-black text-brand-600 uppercase">PTS</p><p className="text-xl font-black text-brand-500">{topThree[1].totalPoints}</p></div>
                                    </div>
                                </div>
                            )}

                            {/* Champion - P1 */}
                            {topThree[0] && (
                                <div onClick={() => setViewingPlayer(topThree[0])} className="bg-brand-500/10 backdrop-blur-xl p-10 rounded-[3rem] border-2 border-brand-500/50 flex flex-col items-center group cursor-pointer hover:scale-[1.02] transition-all shadow-[0_0_50px_rgba(14,165,233,0.15)] order-1 md:order-2 h-[380px] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6 opacity-10"><Crown size={40} className="text-brand-500" /></div>
                                    <div className="w-28 h-28 bg-brand-950 rounded-full border-2 border-brand-500 flex items-center justify-center mb-8 relative group-hover:scale-110 transition-transform">
                                        <img src={topThree[0].photoUrl} className="w-full h-full object-cover rounded-full" />
                                        <div className="absolute -top-3 -right-3 w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center font-black text-brand-950 text-xs border-4 border-brand-800">1</div>
                                    </div>
                                    <h3 className="text-2xl font-black text-white italic truncate w-full text-center">{topThree[0].fullName}</h3>
                                    
                                    {(role === 'admin' || role === 'coach') && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setPotmAction({ playerId: topThree[0].id, playerName: topThree[0].fullName, month, monthName }); setPotmModalOpen(true); }}
                                            className="mt-3 bg-brand-500/10 text-brand-500 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-brand-500/20 hover:bg-brand-500 hover:text-brand-950 transition-all"
                                        >
                                            {potmData?.playerId === topThree[0].id ? 'AWARDEDPOTM' : 'AWARD POTM'}
                                        </button>
                                    )}

                                    {potmData?.playerId === topThree[0].id && <div className="mt-2 flex items-center gap-1 text-[8px] font-black bg-lime/20 text-lime px-3 py-1 rounded-full border border-lime/30"><Sparkles size={8} /> CHAMPION STATUS</div>}
                                    
                                    <div className="grid grid-cols-3 gap-6 w-full pt-8 mt-auto border-t border-white/5">
                                        <div className="text-center"><p className="text-[8px] font-black text-brand-600 uppercase">GOL</p><p className="text-2xl font-black text-white">{topThree[0].goals}</p></div>
                                        <div className="text-center"><p className="text-[8px] font-black text-brand-600 uppercase">RTG</p><p className="text-2xl font-black text-white">{topThree[0].avgRating}</p></div>
                                        <div className="text-center"><p className="text-[8px] font-black text-brand-600 uppercase">PTS</p><p className="text-2xl font-black text-brand-500">{topThree[0].totalPoints}</p></div>
                                    </div>
                                </div>
                            )}

                            {/* P3 */}
                            {topThree[2] && (
                                <div onClick={() => setViewingPlayer(topThree[2])} className="bg-brand-500/10 backdrop-blur-md p-8 rounded-[2.5rem] border border-brand-500/30 flex flex-col items-center group cursor-pointer hover:border-lime/50 transition-all shadow-2xl order-3 h-[320px]">
                                    <div className="w-20 h-20 bg-brand-950 rounded-full border border-white/5 flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform">
                                        <img src={topThree[2].photoUrl} className="w-full h-full object-cover rounded-full" />
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-lime rounded-full flex items-center justify-center font-black text-brand-950 text-[10px] border-2 border-brand-800">3</div>
                                    </div>
                                    <h3 className="text-xl font-black text-white italic truncate w-full text-center">{topThree[2].fullName}</h3>
                                    <p className="text-[9px] font-bold text-brand-500 uppercase tracking-widest mt-1 mb-6">{topThree[2].position}</p>
                                    <div className="grid grid-cols-3 gap-4 w-full pt-6 border-t border-white/5">
                                        <div className="text-center"><p className="text-[8px] font-black text-brand-600 uppercase">GOL</p><p className="text-xl font-black text-white">{topThree[2].goals}</p></div>
                                        <div className="text-center"><p className="text-[8px] font-black text-brand-600 uppercase">RTG</p><p className="text-xl font-black text-white">{topThree[2].avgRating}</p></div>
                                        <div className="text-center"><p className="text-[8px] font-black text-brand-600 uppercase">PTS</p><p className="text-xl font-black text-brand-500">{topThree[2].totalPoints}</p></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Professional League Table */}
                        <div className="bg-brand-500/10 backdrop-blur-xl rounded-[2.5rem] border border-brand-500/30 overflow-hidden shadow-2xl">
                             <div className="overflow-x-auto">
                                 <table className="w-full text-left border-collapse">
                                     <thead>
                                         <tr className="bg-brand-950/80 text-[9px] font-black text-brand-500 uppercase tracking-[0.2em] border-b border-brand-500/20 shadow-inner">
                                             <th className="px-4 md:px-8 py-5 w-16 text-center">RANK</th>
                                             <th className="px-4 md:px-8 py-5">PLAYER PROFILE</th>
                                             <th className="px-3 md:px-6 py-5 text-center w-12 md:w-16">P</th>
                                             <th className="px-3 md:px-6 py-5 text-center w-12 md:w-16">G</th>
                                             <th className="px-3 md:px-6 py-5 text-center w-12 md:w-16">A</th>
                                             <th className="px-3 md:px-6 py-5 text-center hidden lg:table-cell">FORM CORE</th>
                                             <th className="px-3 md:px-6 py-5 text-center w-16 md:w-20">AVG RTG</th>
                                             <th className="px-4 md:px-8 py-5 text-center w-20 md:w-24 bg-brand-950/80">TOTAL PTS</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-white/5">
                                         {monthlyLeaderboard.map((p, idx) => (
                                             <tr key={p.id} onClick={() => setViewingPlayer(p)} className="group hover:bg-brand-500/5 transition-colors cursor-pointer">
                                                 <td className="px-8 py-4 text-center">
                                                     <span className={`text-base font-black italic ${idx === 0 ? 'text-brand-500' : 'text-brand-400'}`}>{idx + 1}</span>
                                                 </td>
                                                 <td className="px-8 py-4">
                                                     <div className="flex items-center gap-4">
                                                         <img src={p.photoUrl} className="w-10 h-10 rounded-full bg-brand-950 object-cover border border-white/10 group-hover:border-brand-500/30" />
                                                         <div>
                                                             <p className="text-xs font-black text-white uppercase italic tracking-tight">{p.fullName}</p>
                                                             <p className="text-[8px] font-bold text-brand-600 uppercase tracking-widest">{p.position}</p>
                                                         </div>
                                                     </div>
                                                 </td>
                                                 <td className="px-6 py-4 text-center font-bold text-brand-400">{p.matchCount}</td>
                                                 <td className="px-6 py-4 text-center font-bold text-brand-400">{p.goals}</td>
                                                 <td className="px-6 py-4 text-center font-bold text-brand-400">{p.assists}</td>
                                                 <td className="px-6 py-4 hidden md:table-cell">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {p.recentForm.map((r, i) => <FormBadge key={i} rating={r} />)}
                                                    </div>
                                                 </td>
                                                 <td className="px-6 py-4 text-center font-black text-white">{p.avgRating}</td>
                                                 <td className={`px-8 py-4 text-center font-black text-lg bg-brand-950/20 group-hover:bg-brand-500/10 ${idx === 0 ? 'text-brand-500' : 'text-white'}`}>
                                                     {p.totalPoints}
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-brand-800/50 rounded-[3rem] p-32 border-2 border-dashed border-white/5 text-center flex flex-col items-center">
                        <Minus className="text-brand-800 w-16 h-16 mb-6" />
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Team Assignment <span className="text-red-900">Inactive</span></h3>
                        <p className="text-brand-500 mt-2 max-w-sm font-medium uppercase text-[10px] tracking-widest">No match telemetry detected for the selected period.</p>
                    </div>
                )}
            </div>

            {/* Same FUT MODAL from before, just Navy/Gold themed */}
            {viewingPlayer && (
                <div 
                    className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
                    onClick={() => setViewingPlayer(null)}
                >
                    <div className="relative cursor-default" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute inset-0 bg-brand-500/10 rounded-[3rem] blur-3xl opacity-50 animate-pulse"></div>
                        <div className="relative w-80 h-[30rem] rounded-t-[2.5rem] rounded-b-[3.5rem] bg-brand-900 border-[3px] border-brand-500/40 shadow-2xl overflow-hidden">
                             {/* Card Art */}
                             <div className="absolute inset-0 bg-[linear-gradient(135deg,_#0a0f20_0%,_#050814_100%)]"></div>
                             <div className="absolute top-0 right-0 p-8 opacity-5"><Shield size={200} /></div>
                             <div className="absolute inset-4 border border-white/5 rounded-t-[2rem] rounded-b-[3rem]"></div>
                             
                             <div className="relative z-10 p-8 flex items-start gap-4">
                                <div className="flex flex-col items-center">
                                    <span className="text-5xl font-black text-brand-500 italic leading-none">{Math.min(99, Math.round(75 + (viewingPlayer.avgRating - 6) * 5))}</span>
                                    <span className="text-[10px] font-black text-white/50 uppercase mt-2">{viewingPlayer.position}</span>
                                    <div className="w-6 h-0.5 bg-brand-500/50 my-3" />
                                    <div className="w-8 h-8 opacity-80">
                                        {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-brand-500" />}
                                    </div>
                                </div>
                                <img 
                                    src={viewingPlayer.photoUrl} 
                                    className="absolute right-0 top-10 w-48 h-48 object-cover drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]"
                                    style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
                                />
                             </div>

                             <div className="relative z-10 mt-24 text-center px-6">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter truncate">{viewingPlayer.fullName}</h2>
                                <div className="w-1/2 mx-auto h-0.5 bg-gradient-to-r from-transparent via-brand-500/50 to-transparent mt-2" />
                             </div>

                             <div className="relative z-10 grid grid-cols-2 gap-4 px-8 mt-8 text-center bg-brand-950/50 mx-6 py-4 rounded-3xl border border-white/5 font-mono">
                                <div><p className="text-[8px] text-brand-500 uppercase">MAT</p><p className="text-lg font-black text-white">{viewingPlayer.matchCount}</p></div>
                                <div><p className="text-[8px] text-brand-500 uppercase">RTG</p><p className="text-lg font-black text-white">{viewingPlayer.avgRating}</p></div>
                                <div><p className="text-[8px] text-brand-500 uppercase">GOL</p><p className="text-lg font-black text-white">{viewingPlayer.goals}</p></div>
                                <div><p className="text-[8px] text-brand-500 uppercase">PTS</p><p className="text-lg font-black text-brand-500">{viewingPlayer.totalPoints}</p></div>
                             </div>

                             <button 
                                onClick={() => setViewingPlayer(null)}
                                className="absolute top-4 right-4 p-2 text-brand-600 hover:text-white transition-colors"
                             >
                                <X size={20} />
                             </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={potmModalOpen} onCancel={() => setPotmModalOpen(false)}
                onConfirm={confirmAwardPOTM}
                title="Redline Protocol: POTM"
                message={`Authorize official communication for ${potmAction?.playerName} as Player of the Month? This signal will be broadcasted to all academy nodes.`}
                confirmText="DEPLOY SIGNAL"
                type="danger"
            />
        </div>
    );
};
