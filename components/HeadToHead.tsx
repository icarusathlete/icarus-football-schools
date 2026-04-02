import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Match, Player } from '../types';
import { 
    Search, Target, Trophy, TrendingUp, History, 
    ArrowRight, Activity, Users, Shield, Zap, Flame, 
    BarChart3, PieChart, Star, Swords
} from 'lucide-react';

export const HeadToHead: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [opponents, setOpponents] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const allMatches = StorageService.getMatches();
        setMatches(allMatches);
        setPlayers(StorageService.getPlayers());
        
        // Extract unique opponents
        const uniqueOpps = Array.from(new Set(allMatches.map(m => m.opponent))).sort();
        setOpponents(uniqueOpps);
    }, []);

    useEffect(() => {
        if (!selectedOpponent) {
            setStats(null);
            return;
        }

        const h2hMatches = matches.filter(m => m.opponent === selectedOpponent).sort((a,b) => b.date.localeCompare(a.date));
        const wins = h2hMatches.filter(m => m.result === 'W').length;
        const draws = h2hMatches.filter(m => m.result === 'D').length;
        const losses = h2hMatches.filter(m => m.result === 'L').length;
        const goalsFor = h2hMatches.reduce((sum, m) => sum + m.scoreFor, 0);
        const goalsAgainst = h2hMatches.reduce((sum, m) => sum + m.scoreAgainst, 0);

        // Calculate Goal Scorers vs this opponent
        const scorers: Record<string, number> = {};
        h2hMatches.forEach(m => {
            m.playerStats.forEach(ps => {
                if (ps.goals > 0) {
                    scorers[ps.playerId] = (scorers[ps.playerId] || 0) + ps.goals;
                }
            });
        });

        const topScorerId = Object.keys(scorers).reduce((a, b) => scorers[a] > scorers[b] ? a : b, '');
        const topScorer = players.find(p => p.id === topScorerId);

        setStats({
            matches: h2hMatches,
            wins, draws, losses,
            goalsFor, goalsAgainst,
            winRate: ((wins / h2hMatches.length) * 100).toFixed(1),
            topScorer: topScorer ? { ...topScorer, goals: scorers[topScorerId] } : null
        });
    }, [selectedOpponent, matches, players]);

    const filteredOpponents = opponents.filter(o => o.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase flex items-center gap-3">
                        H2H <span className="text-gold">ANALYTICS</span>
                        <Swords size={32} className="text-brand-600 opacity-50" />
                    </h2>
                    <p className="text-brand-400 font-medium mt-1">Deep-dive history against specific rivals.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search Rival Academy..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-brand-800 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-sm outline-none focus:border-gold transition-all shadow-xl"
                    />
                    
                    {searchTerm && !selectedOpponent && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-brand-800 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredOpponents.map(opp => (
                                <div 
                                    key={opp} 
                                    onClick={() => { setSelectedOpponent(opp); setSearchTerm(''); }}
                                    className="px-6 py-4 hover:bg-gold/10 hover:text-gold text-brand-400 font-black uppercase text-xs cursor-pointer transition-all border-b border-white/5 last:border-none"
                                >
                                    {opp}
                                </div>
                            ))}
                            {filteredOpponents.length === 0 && <div className="px-6 py-4 text-brand-600 text-xs italic">No rivalry history found.</div>}
                        </div>
                    )}
                </div>
            </div>

            {selectedOpponent ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Opponent Identity Card */}
                        <div className="bg-brand-800 rounded-3xl border border-white/5 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
                           <div className="absolute top-0 right-0 p-6 opacity-5"><Swords size={120} /></div>
                           <div className="w-24 h-24 bg-brand-950 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner mb-6">
                               <Shield size={48} className="text-brand-500" />
                           </div>
                           <h3 className="text-xs font-black text-gold uppercase tracking-[0.3em] mb-2">TARGET RIVAL</h3>
                           <h2 className="text-3xl font-black text-white italic truncate w-full">{selectedOpponent}</h2>
                           <button onClick={() => setSelectedOpponent(null)} className="mt-8 px-6 py-2 bg-brand-950 text-brand-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 hover:text-white transition-all">Change Opponent</button>
                        </div>

                        {/* Summary Stats */}
                        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'TOTAL MEETINGS', val: stats.matches.length, icon: History, color: 'text-brand-400' },
                                { label: 'WIN RATE', val: `${stats.winRate}%`, icon: Zap, color: 'text-gold' },
                                { label: 'GOALS FOR', val: stats.goalsFor, icon: TrendingUp, color: 'text-blue-400' },
                                { label: 'GOALS AGAINST', val: stats.goalsAgainst, icon: Target, color: 'text-red-400' },
                            ].map((s, idx) => (
                                <div key={idx} className="bg-brand-800 p-6 rounded-3xl border border-white/5 shadow-xl">
                                    <s.icon size={20} className={`${s.color} mb-3`} />
                                    <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{s.label}</p>
                                    <p className="text-3xl font-black text-white mt-1">{s.val}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Match History */}
                        <div className="lg:col-span-2 space-y-4">
                            <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <History size={14} className="text-gold" /> RECENT ENCOUNTERS
                            </h4>
                            <div className="space-y-4">
                                {stats.matches.map((m: Match) => (
                                    <div key={m.id} className="bg-brand-800 p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-gold/30 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <p className="text-xs font-black text-white italic">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                                <p className="text-[10px] font-bold text-brand-600 uppercase tracking-tight">{new Date(m.date).getFullYear()}</p>
                                            </div>
                                            <div className="h-8 w-px bg-white/5" />
                                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${m.result === 'W' ? 'bg-gold/10 text-gold' : m.result === 'L' ? 'bg-red-500/10 text-red-500' : 'bg-brand-400/10 text-brand-400'}`}>
                                                {m.result === 'W' ? 'REVENGE' : m.result === 'L' ? 'DEFEAT' : 'DRAW'}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className="font-mono text-3xl font-black flex items-center gap-3">
                                                <span className="text-white">{m.scoreFor}</span>
                                                <span className="text-brand-900">-</span>
                                                <span className="text-brand-400 opacity-50">{m.scoreAgainst}</span>
                                            </div>
                                            <ArrowRight size={18} className="text-brand-600 group-hover:text-gold group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Side Column: Top Performers */}
                        <div className="space-y-8">
                             <div>
                                <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Star size={14} className="text-gold" /> TOP EXECUTIONER
                                </h4>
                                {stats.topScorer ? (
                                    <div className="bg-brand-800 p-8 rounded-3xl border border-gold/20 relative overflow-hidden shadow-2xl flex flex-col items-center text-center">
                                        <div className="absolute top-0 right-0 p-4"><Flame size={40} className="text-gold opacity-10 animate-pulse" /></div>
                                        <div className="relative">
                                            <img src={stats.topScorer.photoUrl} className="w-24 h-24 rounded-full border-4 border-gold shadow-2xl object-cover mb-4" />
                                            <div className="absolute -bottom-2 right-0 bg-gold text-brand-950 px-3 py-1 rounded-full text-xs font-black shadow-lg">#{stats.topScorer.memberId.split('-')[1]}</div>
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{stats.topScorer.fullName}</h3>
                                        <p className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mt-1 mb-4">{stats.topScorer.position}</p>
                                        
                                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                                            <div className="bg-brand-950 p-4 rounded-2xl border border-white/5">
                                                <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">GOALS VK</p>
                                                <p className="text-2xl font-black text-gold">{stats.topScorer.goals}</p>
                                            </div>
                                            <div className="bg-brand-950 p-4 rounded-2xl border border-white/5">
                                                <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">THREAT</p>
                                                <p className="text-2xl font-black text-red-500">MAX</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-brand-800 p-8 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center">
                                        <Activity size={32} className="text-brand-600 mb-2 opacity-50" />
                                        <p className="text-xs font-bold text-brand-500 uppercase tracking-widest">No stats available</p>
                                    </div>
                                )}
                             </div>

                             <div>
                                <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <PieChart size={14} className="text-gold" /> TACTICAL RATIO
                                </h4>
                                <div className="bg-brand-800 p-6 rounded-3xl border border-white/5 space-y-4">
                                    {[
                                        { label: 'WINS', count: stats.wins, total: stats.matches.length, color: 'bg-gold' },
                                        { label: 'DRAWS', count: stats.draws, total: stats.matches.length, color: 'bg-brand-500' },
                                        { label: 'LOSSES', count: stats.losses, total: stats.matches.length, color: 'bg-red-900' },
                                    ].map((cat, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-brand-400">{cat.label}</span>
                                                <span className="text-white">{cat.count}</span>
                                            </div>
                                            <div className="h-2 w-full bg-brand-950 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${cat.color} transition-all duration-1000`} 
                                                    style={{ width: `${(cat.count / cat.total) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-brand-800/50 rounded-[3rem] p-24 border-2 border-dashed border-white/5 text-center flex flex-col items-center animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-brand-800 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-2xl mb-8 group overflow-hidden">
                         <Swords size={40} className="text-brand-500 group-hover:text-gold transition-colors duration-500" />
                         <div className="absolute w-2 h-12 bg-white/5 rotate-45 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Intelligence <span className="text-gold">Nexus</span></h3>
                    <p className="text-brand-500 mt-2 max-w-sm font-medium">Search for an opponent from your historical databases to generate a rivalry dossier.</p>
                    
                    <div className="mt-12 flex flex-wrap justify-center gap-3">
                        {opponents.slice(0, 5).map(opp => (
                            <button 
                                key={opp} onClick={() => setSelectedOpponent(opp)}
                                className="px-4 py-2 bg-brand-800 border border-white/10 rounded-xl text-[10px] font-black text-brand-400 uppercase tracking-widest hover:border-gold hover:text-gold transition-all"
                            >
                                {opp}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
