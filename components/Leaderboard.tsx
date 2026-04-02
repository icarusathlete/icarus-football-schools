
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, AcademySettings, Role } from '../types';
import { Trophy, Calendar, ChevronRight, Crown, TrendingUp, Minus, ArrowUp, ArrowDown, X, Shield, Award, Sparkles } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface LeaderboardProps {
    role?: Role;
}

// Helper for Form Badges (PL Style)
const FormBadge: React.FC<{ rating: number }> = ({ rating }) => {
    let color = 'bg-slate-400';
    let text = '-';
    
    if (rating >= 9) {
        color = 'bg-emerald-500';
        text = 'W'; // treating high rating as a "Win" equivalent for visual
    } else if (rating >= 7.5) {
        color = 'bg-blue-500';
        text = 'D';
    } else if (rating < 6) {
        color = 'bg-red-500';
        text = 'L';
    } else {
        color = 'bg-slate-400';
        text = '-';
    }

    return (
        <div 
            title={`Rating: ${rating}`} 
            className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-black text-white ${color} shadow-sm border border-white/20 cursor-help`}
        >
            {rating}
        </div>
    );
};

export const Leaderboard: React.FC<LeaderboardProps> = ({ role }) => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    
    // Potm Record { playerId, timestamp }
    const [potmData, setPotmData] = useState<{playerId: string, timestamp: number} | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());
    
    // State for FUT Card Modal
    const [viewingPlayer, setViewingPlayer] = useState<any | null>(null);

    // Delete State
    const [potmModalOpen, setPotmModalOpen] = useState(false);
    const [potmAction, setPotmAction] = useState<{playerId: string, playerName: string, month: string, monthName: string} | null>(null);

    useEffect(() => {
        loadData();
        const handleSettings = () => setSettings(StorageService.getSettings());
        
        // Update current time every minute to check for expiration
        const timer = setInterval(() => setCurrentTime(Date.now()), 60000);

        window.addEventListener('settingsChanged', handleSettings);
        window.addEventListener('academy_data_update', loadData);
        
        return () => {
            clearInterval(timer);
            window.removeEventListener('settingsChanged', handleSettings);
            window.removeEventListener('academy_data_update', loadData);
        }
    }, [month]); // Re-load when month changes to get month-specific POTM

    const loadData = () => {
        setPlayers(StorageService.getPlayers());
        setMatches(StorageService.getMatches());
        setPotmData(StorageService.getPOTM(month));
    };

    // --- Leaderboard Calculation (Moved Up) ---
    const monthName = new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const monthlyLeaderboard = players.map(player => {
        // Filter matches by selected month
        const playerMatches = matches.filter(m => 
            m.date.startsWith(month) && 
            m.playerStats.some(s => s.playerId === player.id)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

        const stats = playerMatches.reduce((acc, m) => {
            const s = m.playerStats.find(ps => ps.playerId === player.id);
            if (s) {
                acc.goals += s.goals;
                acc.assists += s.assists;
                acc.ratings.push(s.rating); // Store all ratings
                acc.points += s.rating; // Points = Sum of ratings (Simplified metric)
            }
            return acc;
        }, { goals: 0, assists: 0, ratings: [] as number[], points: 0 });

        const avgRating = stats.ratings.length 
            ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length 
            : 0;

        return {
            ...player,
            goals: stats.goals,
            assists: stats.assists,
            avgRating: parseFloat(avgRating.toFixed(1)),
            totalPoints: parseFloat(stats.points.toFixed(1)),
            matchCount: stats.ratings.length,
            recentForm: stats.ratings.slice(0, 5) // Last 5 ratings
        };
    }).filter(p => p.matchCount > 0) // Only show players who played
    .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.goals !== a.goals) return b.goals - a.goals; 
        return b.avgRating - a.avgRating;
    });

    const topThree = monthlyLeaderboard.slice(0, 3);

    // --- Handler ---
    const handleAwardPOTMClick = (e: React.MouseEvent, playerId: string, playerName: string) => {
        e.stopPropagation();
        setPotmAction({ playerId, playerName, month, monthName });
        setPotmModalOpen(true);
    };

    const confirmAwardPOTM = () => {
        if (potmAction) {
            // 1. Set Winner
            StorageService.setPOTM(potmAction.playerId, potmAction.month);
            
            // 2. Generate Automated Notice
            const winnerStats = monthlyLeaderboard.find(p => p.id === potmAction.playerId);
            if (winnerStats) {
                const noticeContent = `We are proud to announce the Player of the Month for ${potmAction.monthName}!
                
${potmAction.playerName} has shown exceptional performance and dedication on the field.

🏆 Performance Highlights:
• Matches Played: ${winnerStats.matchCount}
• Goals Scored: ${winnerStats.goals}
• Assists Provided: ${winnerStats.assists}
• Average Rating: ${winnerStats.avgRating}
• Total Points: ${winnerStats.totalPoints}

Congratulations on the well-deserved recognition! Keep pushing the limits.`;

                StorageService.addNotice({
                    title: `PLAYER OF THE MONTH: ${potmAction.playerName.toUpperCase()}`,
                    content: noticeContent,
                    priority: 'high',
                    author: 'Coaching Staff',
                    imageUrl: winnerStats.photoUrl // Automatically use player photo as poster
                });
            }

            loadData(); // Force immediate update
            setPotmModalOpen(false);
            setPotmAction(null);
        }
    };

    // Helper to check if glow should be active (within 24h of award)
    const isGlowing = (playerId: string) => {
        if (!potmData || potmData.playerId !== playerId) return false;
        const oneDay = 24 * 60 * 60 * 1000;
        return (currentTime - potmData.timestamp) < oneDay;
    };

    // Calculate OVR for FUT Card
    const calculateOvr = (p: typeof monthlyLeaderboard[0]) => {
        const base = 75; // Base rating
        const performanceBonus = (p.avgRating - 6) * 5; // +5 OVR per rating point above 6
        return Math.min(99, Math.round(base + performanceBonus));
    };

    return (
        <div className="space-y-10 pb-12 animate-in fade-in duration-500">
            <style>{`
                @keyframes shine {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .animate-shine-gold {
                    background: linear-gradient(
                        90deg,
                        #f59e0b 0%,
                        #fbbf24 20%,
                        #ffffff 50%,
                        #fbbf24 80%,
                        #f59e0b 100%
                    );
                    background-size: 200% auto;
                    background-clip: padding-box;
                    animation: shine 3s linear infinite;
                }
                .glow-border {
                    box-shadow: 0 0 20px rgba(251, 191, 36, 0.6), 0 0 60px rgba(251, 191, 36, 0.2);
                }
            `}</style>

            {/* FUT CARD MODAL */}
            {viewingPlayer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setViewingPlayer(null)}>
                    <div 
                        className="relative group cursor-default" 
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-cyan-500 rounded-[3rem] blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-1000 animate-pulse"></div>
                        
                        {/* The Card */}
                        <div className="relative w-80 h-[30rem] rounded-t-[2.5rem] rounded-b-[3.5rem] overflow-hidden border-[3px] border-cyan-300/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] transform transition-transform hover:scale-105 duration-500">
                            
                            {/* Background Layers */}
                            <div className="absolute inset-0 bg-slate-900"></div>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/80 via-slate-900/80 to-black/90"></div>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent"></div>
                            
                            {/* Inner Border Line (FUT style) */}
                            <div className="absolute inset-3 border border-white/10 rounded-t-[2rem] rounded-b-[3rem] pointer-events-none"></div>

                            {/* Top Section */}
                            <div className="relative z-10 p-6 flex items-start gap-4">
                                <div className="flex flex-col items-center">
                                    <span className="text-5xl font-black text-white leading-none font-[Orbitron] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                                        {calculateOvr(viewingPlayer)}
                                    </span>
                                    <span className="text-lg font-bold text-cyan-400 uppercase tracking-wider">{viewingPlayer.position.substring(0,3)}</span>
                                    
                                    {/* Divider */}
                                    <div className="w-8 h-0.5 bg-white/20 my-2"></div>
                                    
                                    {/* Club Logo */}
                                    <div className="w-8 h-8 opacity-90">
                                        {settings.logoUrl ? (
                                            <img src={settings.logoUrl} className="w-full h-full object-contain" />
                                        ) : (
                                            <Shield className="w-full h-full text-white" />
                                        )}
                                    </div>
                                </div>
                                
                                {/* Player Image */}
                                <div className="absolute right-0 top-8 w-48 h-48 -mr-4">
                                    <img 
                                        src={viewingPlayer.photoUrl} 
                                        className="w-full h-full object-cover drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] mask-image-gradient"
                                        style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
                                    />
                                </div>
                            </div>

                            {/* Name Section */}
                            <div className="relative z-10 mt-24 text-center">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight font-[Orbitron] drop-shadow-md truncate px-4">
                                    {viewingPlayer.fullName}
                                </h2>
                                <div className="w-1/2 mx-auto h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-2 opacity-50"></div>
                            </div>

                            {/* Stats Grid */}
                            <div className="relative z-10 px-8 mt-6">
                                <div className="grid grid-cols-2 gap-y-1 gap-x-6 text-white font-[Orbitron]">
                                    <div className="flex justify-between items-center group/stat">
                                        <span className="font-bold text-xl group-hover/stat:text-cyan-400 transition-colors">{viewingPlayer.matchCount}</span>
                                        <span className="text-xs font-bold text-cyan-200/70 tracking-widest uppercase">MAT</span>
                                    </div>
                                    <div className="flex justify-between items-center group/stat">
                                        <span className="font-bold text-xl group-hover/stat:text-cyan-400 transition-colors">{viewingPlayer.avgRating}</span>
                                        <span className="text-xs font-bold text-cyan-200/70 tracking-widest uppercase">RTG</span>
                                    </div>
                                    <div className="flex justify-between items-center group/stat">
                                        <span className="font-bold text-xl group-hover/stat:text-cyan-400 transition-colors">{viewingPlayer.goals}</span>
                                        <span className="text-xs font-bold text-cyan-200/70 tracking-widest uppercase">GOL</span>
                                    </div>
                                    <div className="flex justify-between items-center group/stat">
                                        <span className="font-bold text-xl group-hover/stat:text-cyan-400 transition-colors">{viewingPlayer.totalPoints}</span>
                                        <span className="text-xs font-bold text-cyan-200/70 tracking-widest uppercase">PTS</span>
                                    </div>
                                    <div className="flex justify-between items-center group/stat">
                                        <span className="font-bold text-xl group-hover/stat:text-cyan-400 transition-colors">{viewingPlayer.assists}</span>
                                        <span className="text-xs font-bold text-cyan-200/70 tracking-widest uppercase">AST</span>
                                    </div>
                                    <div className="flex justify-between items-center group/stat">
                                        <span className="font-bold text-xl group-hover/stat:text-cyan-400 transition-colors">{viewingPlayer.recentForm[0] || '-'}</span>
                                        <span className="text-xs font-bold text-cyan-200/70 tracking-widest uppercase">FRM</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Decoration */}
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-30">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mx-1"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mx-1"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mx-1"></div>
                            </div>
                            
                            {/* Close Button */}
                            <button 
                                onClick={() => setViewingPlayer(null)}
                                className="absolute top-4 right-4 z-20 p-2 bg-black/20 text-white/50 hover:text-white hover:bg-black/40 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header & Month Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-200 pb-6">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Orbitron' }}>
                        LEAGUE <span className="text-brand-500">STANDINGS</span>
                    </h2>
                    <p className="text-gray-500 font-medium mt-1">
                        Official player rankings for {monthName}
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <div className="px-4 py-2 bg-slate-50 rounded-lg font-bold text-sm text-slate-700 flex items-center gap-2 border border-slate-100">
                         <Calendar size={14} className="text-brand-500"/>
                         {monthName}
                    </div>
                    <div className="relative">
                        <input 
                            type="month" 
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        />
                        <div className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors pointer-events-none">
                            <ChevronRight size={16} className="rotate-90" />
                        </div>
                    </div>
                </div>
            </div>

            {monthlyLeaderboard.length > 0 ? (
                <>
                    {/* Featured Top 3 - Card Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 2nd Place */}
                        {topThree[1] && (
                            <div 
                                onClick={() => setViewingPlayer(topThree[1])}
                                className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col mt-4 md:mt-8 cursor-pointer hover:-translate-y-2 transition-transform duration-300 relative ${potmData?.playerId === topThree[1].id && isGlowing(topThree[1].id) ? 'ring-4 ring-yellow-400 glow-border' : ''}`}
                            >
                                <div className="bg-slate-100 p-4 border-b border-gray-200 flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Runner Up</span>
                                    <div className="w-8 h-8 bg-slate-300 text-white rounded-full flex items-center justify-center font-black text-sm shadow-inner">2</div>
                                </div>
                                <div className="p-6 flex flex-col items-center flex-1">
                                    <img src={topThree[1].photoUrl} className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 mb-4 shadow-sm" />
                                    <h3 className="font-bold text-gray-900 text-lg text-center leading-tight mb-1">{topThree[1].fullName}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">{topThree[1].position}</p>
                                    
                                    <div className="grid grid-cols-3 gap-4 w-full text-center mt-auto">
                                        <div><div className="text-xl font-black text-gray-800">{topThree[1].goals}</div><div className="text-[10px] text-gray-400 font-bold uppercase">G</div></div>
                                        <div><div className="text-xl font-black text-gray-800">{topThree[1].avgRating}</div><div className="text-[10px] text-gray-400 font-bold uppercase">Rtg</div></div>
                                        <div><div className="text-xl font-black text-brand-600">{topThree[1].totalPoints}</div><div className="text-[10px] text-gray-400 font-bold uppercase">Pts</div></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place - The Glowing Card */}
                        {topThree[0] && (
                            <div 
                                onClick={() => setViewingPlayer(topThree[0])}
                                className={`
                                    rounded-2xl shadow-xl border-2 overflow-hidden flex flex-col transform md:-translate-y-4 z-10 cursor-pointer hover:scale-105 transition-transform duration-300 relative
                                    ${potmData?.playerId === topThree[0].id && isGlowing(topThree[0].id)
                                        ? 'border-yellow-400 glow-border' 
                                        : 'bg-white border-brand-500 shadow-brand-900/10'
                                    }
                                `}
                            >
                                {/* Shimmer Overlay for POTM */}
                                {potmData?.playerId === topThree[0].id && isGlowing(topThree[0].id) && (
                                    <div className="absolute inset-0 z-0 animate-shine-gold opacity-20 pointer-events-none"></div>
                                )}

                                <div className={`${potmData?.playerId === topThree[0].id ? 'bg-amber-500 border-amber-600' : 'bg-brand-600 border-brand-700'} p-4 border-b flex justify-between items-center text-white transition-colors duration-500 relative z-10`}>
                                    <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        <Crown size={14} fill="currentColor" className={potmData?.playerId === topThree[0].id && isGlowing(topThree[0].id) ? 'animate-bounce' : ''} /> 
                                        {potmData?.playerId === topThree[0].id ? 'PLAYER OF THE MONTH' : 'Leader'}
                                    </span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg ${potmData?.playerId === topThree[0].id ? 'bg-white text-amber-600' : 'bg-white text-brand-700'}`}>1</div>
                                </div>
                                
                                <div className={`p-8 flex flex-col items-center flex-1 relative z-10 ${potmData?.playerId === topThree[0].id ? 'bg-amber-50/50' : 'bg-gradient-to-b from-white to-brand-50'}`}>
                                    <div className="relative">
                                        <div className={`absolute inset-0 rounded-full blur-xl opacity-50 ${potmData?.playerId === topThree[0].id && isGlowing(topThree[0].id) ? 'bg-amber-400 animate-pulse' : 'bg-brand-200'}`}></div>
                                        <img src={topThree[0].photoUrl} className="relative w-28 h-28 rounded-full object-cover border-4 border-white mb-6 shadow-xl" />
                                    </div>
                                    
                                    <h3 className="font-black text-gray-900 text-2xl text-center leading-tight mb-1 font-[Orbitron]">{topThree[0].fullName}</h3>
                                    
                                    {/* Award Button for Coaches (Visible for admins/coaches always, to allow re-selection or initial selection) */}
                                    {(role === 'admin' || role === 'coach') && (
                                        <button 
                                            onClick={(e) => handleAwardPOTMClick(e, topThree[0].id, topThree[0].fullName)}
                                            className="mt-2 mb-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 relative z-20"
                                        >
                                            <Award size={12} /> {potmData?.playerId === topThree[0].id ? 'Re-Announce Winner' : 'Announce Winner'}
                                        </button>
                                    )}

                                    {potmData?.playerId === topThree[0].id && (
                                        <div className="mt-2 mb-6 flex items-center gap-1 text-amber-600 text-[10px] font-black uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full border border-amber-200 shadow-sm relative z-10">
                                            <Sparkles size={10} /> Official Winner
                                        </div>
                                    )}

                                    {(!((role === 'admin' || role === 'coach')) && potmData?.playerId !== topThree[0].id) && (
                                        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-8 bg-brand-100 px-3 py-1 rounded-full">{topThree[0].position}</p>
                                    )}
                                    
                                    <div className="grid grid-cols-3 gap-6 w-full text-center mt-auto p-4 bg-white rounded-xl shadow-sm border border-gray-100 relative z-10">
                                        <div><div className="text-2xl font-black text-gray-900">{topThree[0].goals}</div><div className="text-[10px] text-gray-400 font-bold uppercase">Goals</div></div>
                                        <div><div className="text-2xl font-black text-gray-900">{topThree[0].avgRating}</div><div className="text-[10px] text-gray-400 font-bold uppercase">Avg Rtg</div></div>
                                        <div><div className="text-2xl font-black text-brand-600">{topThree[0].totalPoints}</div><div className="text-[10px] text-gray-400 font-bold uppercase">Points</div></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {topThree[2] && (
                            <div 
                                onClick={() => setViewingPlayer(topThree[2])}
                                className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col mt-4 md:mt-8 cursor-pointer hover:-translate-y-2 transition-transform duration-300 ${potmData?.playerId === topThree[2].id && isGlowing(topThree[2].id) ? 'ring-4 ring-yellow-400 glow-border' : ''}`}
                            >
                                <div className="bg-slate-100 p-4 border-b border-gray-200 flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Third Place</span>
                                    <div className="w-8 h-8 bg-orange-700/20 text-orange-800 rounded-full flex items-center justify-center font-black text-sm shadow-inner">3</div>
                                </div>
                                <div className="p-6 flex flex-col items-center flex-1">
                                    <img src={topThree[2].photoUrl} className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 mb-4 shadow-sm" />
                                    <h3 className="font-bold text-gray-900 text-lg text-center leading-tight mb-1">{topThree[2].fullName}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">{topThree[2].position}</p>
                                    
                                    <div className="grid grid-cols-3 gap-4 w-full text-center mt-auto">
                                        <div><div className="text-xl font-black text-gray-800">{topThree[2].goals}</div><div className="text-[10px] text-gray-400 font-bold uppercase">G</div></div>
                                        <div><div className="text-xl font-black text-gray-800">{topThree[2].avgRating}</div><div className="text-[10px] text-gray-400 font-bold uppercase">Rtg</div></div>
                                        <div><div className="text-xl font-black text-brand-600">{topThree[2].totalPoints}</div><div className="text-[10px] text-gray-400 font-bold uppercase">Pts</div></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Premier League Style Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-gray-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-4 w-16 text-center">Pos</th>
                                        <th className="px-4 py-4">Club & Player</th>
                                        <th className="px-4 py-4 text-center w-16">P</th>
                                        <th className="px-4 py-4 text-center w-16">G</th>
                                        <th className="px-4 py-4 text-center w-16">A</th>
                                        <th className="px-4 py-4 text-center hidden md:table-cell">Form Guide</th>
                                        <th className="px-4 py-4 text-center w-20">Avg</th>
                                        <th className="px-4 py-4 text-center w-20 bg-slate-100/50">Pts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {monthlyLeaderboard.map((p, idx) => {
                                        const rank = idx + 1;
                                        // Top 4 highlighting like CL spots
                                        const rankClass = rank === 1 ? 'border-l-4 border-l-brand-500' : 
                                                          rank <= 4 ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-transparent';
                                        const isWinner = potmData?.playerId === p.id;
                                        const shouldGlow = isWinner && isGlowing(p.id);

                                        return (
                                            <tr 
                                                key={p.id} 
                                                onClick={() => setViewingPlayer(p)}
                                                className={`group hover:bg-slate-50 transition-colors cursor-pointer ${rankClass} ${isWinner ? 'bg-amber-50/50' : ''}`}
                                            >
                                                <td className="px-4 py-4 text-center font-bold text-gray-600 relative">
                                                    {isWinner && (
                                                        <Crown size={12} className={`absolute top-2 left-1/2 -translate-x-1/2 text-amber-500 ${shouldGlow ? 'animate-bounce' : ''}`} />
                                                    )}
                                                    {rank}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`relative rounded-full p-0.5 ${isWinner && shouldGlow ? 'bg-gradient-to-tr from-amber-300 to-yellow-500 animate-spin-slow' : ''}`}>
                                                            <img src={p.photoUrl} className="w-8 h-8 rounded-full bg-gray-200 object-cover border border-gray-200 shadow-sm block" />
                                                        </div>
                                                        <div>
                                                            <div className={`font-bold leading-none transition-colors ${isWinner ? 'text-amber-700' : 'text-gray-900 group-hover:text-brand-600'}`}>{p.fullName}</div>
                                                            <div className="text-[10px] text-gray-400 font-medium uppercase mt-1 tracking-wide">{p.batch || 'Academy'} • {p.position}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center text-gray-600 font-medium">{p.matchCount}</td>
                                                <td className="px-4 py-4 text-center text-gray-600 font-medium">{p.goals}</td>
                                                <td className="px-4 py-4 text-center text-gray-600 font-medium">{p.assists}</td>
                                                <td className="px-4 py-4 hidden md:table-cell">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {p.recentForm.map((rating, i) => (
                                                            <FormBadge key={i} rating={rating} />
                                                        ))}
                                                        {/* Pad empty spots */}
                                                        {[...Array(5 - p.recentForm.length)].map((_, i) => (
                                                            <div key={`empty-${i}`} className="w-6 h-6 rounded bg-slate-100"></div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center font-bold text-gray-800">{p.avgRating}</td>
                                                <td className="px-4 py-4 text-center font-black text-gray-900 bg-slate-50 group-hover:bg-slate-100 transition-colors text-base">
                                                    {p.totalPoints}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {monthlyLeaderboard.length === 0 && (
                            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                                <Minus size={48} className="mb-2 opacity-20" />
                                <p className="font-medium">No standings data available for this month.</p>
                            </div>
                        )}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500 font-medium flex gap-6">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-500"></div> Champion</span>
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Champions League Qualification</span>
                            <span className="ml-auto">Click any row to view Player Card</span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-[2.5rem] p-20 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Trophy className="text-slate-300 w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 font-[Orbitron]">Season Not Started</h3>
                    <p className="text-gray-500 max-w-sm text-sm leading-relaxed">Match data for {monthName} has not been logged yet. Check back after the next game week!</p>
                </div>
            )}

            <ConfirmModal
                isOpen={potmModalOpen}
                onClose={() => {
                    setPotmModalOpen(false);
                    setPotmAction(null);
                }}
                onConfirm={confirmAwardPOTM}
                title="Award Player of the Month"
                message={`Officially announce ${potmAction?.playerName} as Player of the Month for ${potmAction?.monthName}? This will post a public notice and apply a shining effect.`}
                confirmText="Announce"
                type="danger"
            />
        </div>
    );
};
