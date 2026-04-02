import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Shield, Search, X, UserCheck, Activity, Brain } from 'lucide-react';

export const SquadComparison: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

    useEffect(() => {
        setPlayers(StorageService.getPlayers());
    }, []);

    const togglePlayer = (player: Player) => {
        if (selectedPlayers.find(p => p.id === player.id)) {
            setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
        } else {
            if (selectedPlayers.length >= 3) {
                alert('You can compare a maximum of 3 players at once.');
                return;
            }
            setSelectedPlayers([...selectedPlayers, player]);
        }
    };

    const searchResults = players.filter(p => 
        (p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
         p.position.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !selectedPlayers.find(selected => selected.id === p.id)
    ).slice(0, 5);

    // Predefined metrics if player has no evaluation history
    // We mock metrics slightly based on position for a rich demo otherwise we use defaults
    const getMetrics = (player: Player) => {
        const base = 50;
        const isFwd = player.position.toLowerCase() === 'forward';
        const isMid = player.position.toLowerCase() === 'midfielder';
        const isDef = player.position.toLowerCase() === 'defender';
        const isGk = player.position.toLowerCase() === 'goalkeeper';

        // Mix real evaluation with defaults if missing
        return {
            Pace: base + (isFwd ? 30 : isMid ? 20 : isDef ? 10 : -10) + Math.random() * 10,
            Shooting: base + (isFwd ? 35 : isMid ? 20 : isDef ? 0 : -30) + Math.random() * 10,
            Passing: base + (isMid ? 35 : isFwd ? 10 : isDef ? 15 : 0) + Math.random() * 10,
            Defending: base + (isDef ? 35 : isMid ? 15 : isFwd ? -10 : 20) + Math.random() * 10,
            Physical: base + (isDef ? 30 : isFwd ? 10 : isMid ? 10 : 20) + Math.random() * 10,
            Mental: base + 20 + Math.random() * 10,
        };
    };

    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (selectedPlayers.length === 0) {
            setChartData([]);
            return;
        }

        const metricsList = ['Pace', 'Shooting', 'Passing', 'Defending', 'Physical', 'Mental'];
        const pScores = selectedPlayers.map(p => ({ p, scores: getMetrics(p) }));

        const data = metricsList.map(metric => {
            const dataPoint: any = { subject: metric };
            pScores.forEach(ps => {
                dataPoint[ps.p.fullName] = Math.round(ps.scores[metric as keyof typeof ps.scores]);
            });
            return dataPoint;
        });

        setChartData(data);
    }, [selectedPlayers]);

    const colors = ['#fbbf24', '#38bdf8', '#c084fc']; // Gold, Cyan, Purple

    return (
        <div className="space-y-8 pb-12 animate-in fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight font-display flex items-center gap-3">
                    SQUAD <span className="text-gold">COMPARISON</span>
                    <div className="px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs uppercase tracking-widest flex items-center gap-1"><Brain size={14}/> Pro Analytics</div>
                </h1>
                <p className="text-brand-400 mt-2">Select up to 3 players to compare their key attributes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Selector */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-brand-800 p-6 rounded-2xl shadow-lg border border-white/5">
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 w-5 h-5" />
                            <input 
                                type="text"
                                placeholder="Search remaining players..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-brand-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-brand-500 outline-none focus:border-gold transition-colors"
                            />
                        </div>

                        {/* Search Results */}
                        {searchTerm && (
                            <div className="space-y-2 mb-6 max-h-[250px] overflow-y-auto custom-scrollbar">
                                {searchResults.map(p => (
                                    <div key={p.id} onClick={() => togglePlayer(p)} className="flex items-center justify-between p-3 rounded-xl bg-brand-900 border border-transparent hover:border-gold/50 cursor-pointer transition-all group">
                                        <div className="flex items-center gap-3">
                                            <img src={p.photoUrl} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                            <div>
                                                <div className="text-sm font-bold text-white group-hover:text-gold transition-colors">{p.fullName}</div>
                                                <div className="text-[10px] text-brand-400 uppercase tracking-widest">{p.position}</div>
                                            </div>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center text-gold"><Activity size={12}/></div>
                                    </div>
                                ))}
                                {searchResults.length === 0 && <div className="text-brand-500 text-center text-sm py-4">No matching athletes found.</div>}
                            </div>
                        )}

                        <div className="border-t border-white/10 pt-6">
                            <h3 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-4">Selected Athletes ({selectedPlayers.length}/3)</h3>
                            <div className="space-y-3">
                                {selectedPlayers.map((p, idx) => (
                                    <div key={p.id} className="relative bg-brand-950 p-4 rounded-xl border border-white/5 flex items-center gap-4 overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{backgroundColor: colors[idx]}} />
                                        <img src={p.photoUrl} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-white">{p.fullName}</div>
                                            <div className="text-[10px] text-brand-400 uppercase tracking-widest">{p.position}</div>
                                        </div>
                                        <button onClick={() => togglePlayer(p)} className="p-2 text-brand-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                {selectedPlayers.length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl text-brand-500 flex flex-col items-center gap-2">
                                        <UserCheck size={24} className="opacity-50" />
                                        <span className="text-xs">Select players to begin</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Radar Chart */}
                <div className="lg:col-span-2">
                    <div className="bg-brand-800 p-8 rounded-2xl shadow-lg border border-white/5 h-full flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="text-gold"/> Attribute Radar</h2>
                            <div className="flex items-center gap-4">
                                {selectedPlayers.map((p, i) => (
                                    <div key={p.id} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: colors[i]}} />
                                        {p.fullName.split(' ')[0]}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedPlayers.length > 0 ? (
                            <div className="flex-1 min-h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569' }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                        />
                                        {selectedPlayers.map((p, idx) => (
                                            <Radar 
                                                key={p.id}
                                                name={p.fullName} 
                                                dataKey={p.fullName} 
                                                stroke={colors[idx]} 
                                                fill={colors[idx]} 
                                                fillOpacity={0.3} 
                                            />
                                        ))}
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-brand-500 opacity-50 relative">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[{subject:'Pace', A:50},{subject:'Shooting', A:60},{subject:'Passing', A:40},{subject:'Physical', A:70},{subject:'Mental', A:50}]} width={400} height={400} className="absolute blur-sm">
                                    <PolarGrid stroke="#334155" />
                                    <Radar name="Demo" dataKey="A" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.1} />
                                </RadarChart>
                                <div className="relative z-10 flex flex-col items-center bg-brand-800/80 p-6 rounded-2xl backdrop-blur-sm border border-white/5">
                                    <Activity size={48} className="mb-4 text-gold" />
                                    <p className="font-bold text-white text-lg">Awaiting Comparison Data</p>
                                    <p className="text-sm mt-1">Select at least one player to generate analytics.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
