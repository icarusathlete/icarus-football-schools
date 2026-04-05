import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, ScheduleEvent } from '../types';
import { 
    PlusCircle, Calendar, Trophy, ChevronDown, Save, X, Youtube, 
    PlayCircle, Filter, MonitorPlay, FileJson, UploadCloud, 
    AlertCircle, Check, Users, Shirt, Activity, Clock, 
    MessageSquare, Award, PieChart, TrendingUp, History,
    Flame, Zap, Target, MapPin, Shield
} from 'lucide-react';

export const MatchManager: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
    const [settings, setSettings] = useState(StorageService.getSettings());
    const [activeTab, setActiveTab] = useState<'results' | 'fixtures'>('results');

    // Time helper
    const getRelativeTime = (dateStr: string) => {
        const target = new Date(dateStr);
        const today = new Date();
        today.setHours(0,0,0,0);
        target.setHours(0,0,0,0);
        const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `In ${diffDays} days`;
        return target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // New Match Form State
    const [newMatch, setNewMatch] = useState({
        date: new Date().toISOString().split('T')[0],
        opponent: '',
        result: 'W' as 'W' | 'L' | 'D',
        scoreFor: 0,
        scoreAgainst: 0,
        highlightsUrl: '',
        scheduledEventId: '',
        isLive: false,
        report: '',
        playerOfTheMatchId: '',
        possession: 50,
        shotsOnTarget: 0
    });
    
    const [starters, setStarters] = useState<Set<string>>(new Set());
    const [playerStats, setPlayerStats] = useState<Record<string, { goals: number, assists: number, rating: number }>>({});

    const loadData = () => {
        const sortedMatches = StorageService.getMatches().sort((a,b) => b.date.localeCompare(a.date));
        setMatches(sortedMatches);
        const allPlayers = StorageService.getPlayers();
        setPlayers(allPlayers);
        setScheduleEvents(StorageService.getSchedule().filter(e => e.type === 'match'));
        
        if (allPlayers.length > 0 && Object.keys(playerStats).length === 0) {
             const initialStats: any = {};
             allPlayers.forEach(p => { initialStats[p.id] = { goals: 0, assists: 0, rating: 6 }; });
             setPlayerStats(initialStats);
        }
    };

    useEffect(() => {
        loadData();
        const handleSettingsChange = () => setSettings(StorageService.getSettings());
        window.addEventListener('settingsChanged', handleSettingsChange);
        window.addEventListener('academy_data_update', loadData);
        return () => {
            window.removeEventListener('settingsChanged', handleSettingsChange);
            window.removeEventListener('academy_data_update', loadData);
        };
    }, []);

    const handleScheduleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const eventId = e.target.value;
        if (eventId) {
            const event = scheduleEvents.find(ev => ev.id === eventId);
            if (event) {
                let opp = event.title;
                if (opp.toLowerCase().includes(' vs ')) opp = opp.split(' vs ')[1];
                else if (opp.toLowerCase().includes('match against')) opp = opp.split('match against')[1];
                setNewMatch({ ...newMatch, scheduledEventId: eventId, date: event.date, opponent: opp.trim() });
            }
        } else {
            setNewMatch({ ...newMatch, scheduledEventId: '', date: new Date().toISOString().split('T')[0], opponent: '' });
        }
    };

    const toggleStarter = (playerId: string) => {
        setStarters(prev => {
            const next = new Set(prev);
            if (next.has(playerId)) next.delete(playerId);
            else next.add(playerId);
            return next;
        });
    };

    const handleSaveMatch = async () => {
        const statsArray = players.map(p => ({
            playerId: p.id,
            goals: playerStats[p.id]?.goals || 0,
            assists: playerStats[p.id]?.assists || 0,
            rating: playerStats[p.id]?.rating || 6,
            minutesPlayed: 0,
            isStarter: starters.has(p.id)
        }));
        const matchToSave = {
            ...newMatch,
            playerStats: statsArray,
            result: newMatch.scoreFor > newMatch.scoreAgainst ? 'W' : newMatch.scoreFor < newMatch.scoreAgainst ? 'L' : 'D'
        };
        const saved = await StorageService.addMatch(matchToSave);
        if (newMatch.isLive && saved) setActiveMatchId(saved.id);
        setShowForm(false);
        resetForm();
    };

    const resetForm = () => {
        setNewMatch({ 
            date: new Date().toISOString().split('T')[0], opponent: '', result: 'W', 
            scoreFor: 0, scoreAgainst: 0, highlightsUrl: '', scheduledEventId: '',
            isLive: false, report: '', playerOfTheMatchId: '', possession: 50, shotsOnTarget: 0
        });
        setStarters(new Set());
        const resetStats: any = {};
        players.forEach(p => { resetStats[p.id] = { goals: 0, assists: 0, rating: 6 }; });
        setPlayerStats(resetStats);
    };

    const updateLiveMatch = async (updatedMatch: Match) => {
        await StorageService.updateMatch(updatedMatch);
    };

    const finalizeMatch = async (match: Match) => {
        const finalized = { ...match, isLive: false };
        await StorageService.updateMatch(finalized);
        setActiveMatchId(null);
    };

    const getYouTubeEmbedUrl = (url: string | undefined) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0` : null;
    };

    const activeMatch = matches.find(m => m.id === activeMatchId);

    return (
        <div className="space-y-10 pb-32 animate-in fade-in duration-700 font-display">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-brand-500 p-10 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><Trophy size={160} className="text-white" /></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none flex items-center gap-4">
                        MATCH <span className="text-brand-950">CENTER</span>
                        {matches.some(m => m.isLive) && (
                            <span className="flex h-4 w-4 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                            </span>
                        )}
                    </h1>
                    <p className="text-white/80 font-black uppercase text-[10px] tracking-[0.4em] mt-3 italic">Academy Fixtures & Results Portal</p>
                </div>
                <button onClick={() => setShowForm(true)} className="relative z-10 bg-white text-brand-950 px-10 py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all font-black text-xs uppercase tracking-[0.2em] italic">
                    <PlusCircle size={20} />
                    ADD RECORD
                </button>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Played', val: matches.length, icon: History, color: 'text-brand-950' },
                    { label: 'Wins', val: matches.filter(m => m.result === 'W').length, icon: Trophy, color: 'text-brand-950' },
                    { label: 'Draws', val: matches.filter(m => m.result === 'D').length, icon: Activity, color: 'text-brand-950' },
                    { label: 'Losses', val: matches.filter(m => m.result === 'L').length, icon: Target, color: 'text-red-900' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-brand-100 flex items-center justify-between shadow-xl transition-all hover:scale-105 group overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.22em] mb-2 italic drop-shadow-sm">{stat.label}</p>
                            <p className="text-4xl font-black italic text-brand-950">{stat.val}</p>
                        </div>
                        <stat.icon className={`w-14 h-14 ${stat.color} opacity-10 absolute -right-2 top-1/2 -translate-y-1/2 group-hover:opacity-20 transition-opacity`} />
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500/20 group-hover:bg-brand-500 transition-colors" />
                    </div>
                ))}
            </div>

            {/* Live Match Overlay */}
            {activeMatch && (
                <div className="bg-brand-800 rounded-[3rem] border border-brand-500/30 shadow-3xl shadow-brand-500/10 overflow-hidden animate-in slide-in-from-bottom-12 duration-1000">
                    <div className="bg-brand-950/80 px-8 py-4 flex justify-between items-center text-white border-b border-white/5">
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-red-500 italic">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            DEPLOYMENT CONSOLE ACTIVE
                        </div>
                        <button onClick={() => setActiveMatchId(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X size={20}/></button>
                    </div>

                    <div className="p-12">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
                            <div className="flex items-center gap-12 lg:gap-24">
                                <div className="text-center group">
                                    <div className="w-24 h-24 bg-brand-950 rounded-full flex items-center justify-center mb-5 border-2 border-white/10 group-hover:border-brand-500/50 transition-all shadow-2xl relative overflow-hidden">
                                        <div className="absolute inset-0 bg-brand-500 opacity-5" />
                                        <Shirt size={48} className="text-brand-500 relative z-10" />
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest">{settings.name}</h4>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col items-center gap-4">
                                        <button onClick={() => updateLiveMatch({ ...activeMatch, scoreFor: activeMatch.scoreFor + 1 })} className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center hover:bg-brand-500 hover:text-brand-950 transition-all border border-brand-500/20 shadow-xl"><TrendingUp size={24} /></button>
                                        <div className="text-8xl font-black text-white italic font-display leading-none">{activeMatch.scoreFor}</div>
                                        <button onClick={() => updateLiveMatch({ ...activeMatch, scoreFor: Math.max(0, activeMatch.scoreFor - 1) })} className="text-brand-600 hover:text-white transition-colors"><ChevronDown size={28} /></button>
                                    </div>
                                    <div className="text-5xl font-black text-brand-800 italic">:</div>
                                    <div className="flex flex-col items-center gap-4">
                                        <button onClick={() => updateLiveMatch({ ...activeMatch, scoreAgainst: activeMatch.scoreAgainst + 1 })} className="w-14 h-14 rounded-2xl bg-white/5 text-white flex items-center justify-center hover:bg-white hover:text-brand-950 transition-all border border-white/10 shadow-xl"><TrendingUp size={24} /></button>
                                        <div className="text-8xl font-black text-white italic font-display leading-none">{activeMatch.scoreAgainst}</div>
                                        <button onClick={() => updateLiveMatch({ ...activeMatch, scoreAgainst: Math.max(0, activeMatch.scoreAgainst - 1) })} className="text-brand-600 hover:text-white transition-colors"><ChevronDown size={28} /></button>
                                    </div>
                                </div>

                                <div className="text-center group">
                                    <div className="w-24 h-24 bg-brand-950 rounded-full flex items-center justify-center mb-5 border-2 border-white/10 group-hover:border-red-500/50 transition-all shadow-2xl relative overflow-hidden">
                                        <div className="absolute inset-0 bg-red-500 opacity-5" />
                                        <Shield size={48} className="text-brand-700 relative z-10" />
                                    </div>
                                    <h4 className="text-sm font-black text-brand-400 uppercase italic tracking-widest">{activeMatch.opponent}</h4>
                                </div>
                            </div>

                            <div className="flex-1 w-full lg:w-auto h-full space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-brand-950/50 p-6 rounded-3xl border border-white/5 shadow-inner">
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-4 italic">Zone Possession</p>
                                        <div className="flex items-center gap-4">
                                            <input type="range" className="flex-1 accent-brand-500" min="0" max="100" value={activeMatch.possession || 50} onChange={(e) => updateLiveMatch({ ...activeMatch, possession: parseInt(e.target.value) })} />
                                            <span className="text-2xl font-black text-white italic">{activeMatch.possession || 50}%</span>
                                        </div>
                                    </div>
                                    <div className="bg-brand-950/50 p-6 rounded-3xl border border-white/5 shadow-inner">
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-4 italic">Precision Strikes</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-3xl font-black text-white italic">{activeMatch.shotsOnTarget || 0}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => updateLiveMatch({...activeMatch, shotsOnTarget: Math.max(0, (activeMatch.shotsOnTarget || 0) - 1)})} className="p-2.5 rounded-xl bg-white/5 text-brand-600 hover:text-white transition-all"><X size={14}/></button>
                                                <button onClick={() => updateLiveMatch({...activeMatch, shotsOnTarget: (activeMatch.shotsOnTarget || 0) + 1})} className="p-2.5 rounded-xl bg-brand-500/20 text-brand-500 hover:bg-brand-500 hover:text-brand-950 transition-all shadow-lg"><TrendingUp size={14}/></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => finalizeMatch(activeMatch)} className="w-full py-5 bg-brand-500 text-brand-950 rounded-2xl font-black uppercase tracking-[0.3em] text-xs border border-brand-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 shadow-2xl italic font-display"><Check size={20} /> SYNCHRONIZE & FINALIZE DATA</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Selection */}
            <div className="bg-brand-950 p-1.5 rounded-[2rem] border border-white/10 flex w-fit shadow-2xl">
                {['results', 'fixtures'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-12 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3 italic ${activeTab === tab ? 'bg-white text-brand-950 shadow-xl' : 'text-white/40 hover:text-white'}`}>
                        {tab === 'results' ? <History size={16} /> : <Calendar size={16} />}
                        {tab === 'results' ? 'Match Results' : 'Upcoming Fixtures'}
                    </button>
                ))}
            </div>

            {/* Data Stream */}
            <div className="space-y-6">
                <div className="flex items-center gap-6">
                    <span className="text-[11px] font-black text-brand-950 uppercase tracking-[0.4em] italic whitespace-nowrap">{activeTab === 'results' ? 'OPERATIONAL DATA STREAM' : 'PENDING ENGAGEMENTS'}</span>
                    <div className="h-[2px] bg-brand-500/20 w-full rounded-full" />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {activeTab === 'results' ? (
                        matches.map(m => (
                            <div key={m.id} className="group relative bg-white rounded-[2.5rem] border border-brand-100 hover:border-brand-500 transition-all duration-300 overflow-hidden p-8 lg:p-12 shadow-xl hover:-translate-y-1">
                                <div className={`absolute left-0 top-0 bottom-0 w-2 ${m.isLive ? 'bg-red-600 animate-pulse' : m.result === 'W' ? 'bg-brand-500' : m.result === 'L' ? 'bg-red-900' : 'bg-brand-950'}`} />
                                <div className="flex flex-col lg:flex-row items-center gap-12">
                                    <div className="flex flex-col items-center lg:items-start min-w-[140px] border-r border-brand-50 pr-10">
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] mb-2 italic">SEASON {new Date(m.date).getFullYear()}</p>
                                        <div className="text-3xl font-black text-brand-950 italic uppercase tracking-tighter leading-none mb-3">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                        <div className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.3em] italic border ${m.result === 'W' ? 'bg-brand-500/10 text-brand-500 border-brand-500/20' : m.result === 'L' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 'bg-brand-950/10 text-brand-950 border-brand-950/20'}`}>{m.result === 'W' ? 'WIN' : m.result === 'L' ? 'LOSS' : 'DRAW'}</div>
                                    </div>
                                    <div className="flex-1 flex flex-col md:flex-row items-center justify-between w-full gap-8">
                                        <div className="flex-1 text-center md:text-right space-y-2">
                                            <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] italic leading-none">PRIMARY ASSET</p>
                                            <h3 className="text-2xl font-black text-brand-950 italic uppercase tracking-tight leading-none truncate">{settings.name}</h3>
                                        </div>
                                        <div className="bg-brand-950 px-6 md:px-10 py-4 md:py-6 rounded-[2rem] border border-white/10 font-mono text-4xl md:text-6xl font-black text-white shadow-2xl flex items-center gap-6 md:gap-10 relative overflow-hidden group/score">
                                            <div className="absolute inset-0 bg-brand-500/5 group-hover/score:bg-brand-500/10 transition-colors" />
                                            <span className={m.result === 'W' ? 'text-brand-500 italic drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'text-white'}>{m.scoreFor}</span>
                                            <span className="text-white/20 text-4xl">:</span>
                                            <span className="text-white/60">{m.scoreAgainst}</span>
                                        </div>
                                        <div className="flex-1 text-center md:text-left space-y-2">
                                            <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] italic leading-none">TARGET FORCE</p>
                                            <h3 className="text-2xl font-black text-brand-950 italic uppercase tracking-tight opacity-40 group-hover:opacity-100 transition-opacity leading-none truncate leading-none">{m.opponent}</h3>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        {m.highlightsUrl && (
                                            <button 
                                                onClick={() => setSelectedVideo(getYouTubeEmbedUrl(m.highlightsUrl))} 
                                                className="w-14 h-14 flex items-center justify-center bg-brand-500 text-brand-950 rounded-2xl hover:bg-brand-950 hover:text-brand-500 transition-all shadow-xl active:scale-95 border border-brand-500/20 group/btn"
                                                title="Watch Highlights"
                                            >
                                                <Youtube size={24} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setActiveMatchId(m.id)} 
                                            className="w-14 h-14 flex items-center justify-center bg-brand-50 text-brand-950 border border-brand-100 hover:bg-brand-950 hover:text-white rounded-2xl transition-all shadow-xl active:scale-95 group/btn"
                                            title="View Tactical Report"
                                        >
                                            <MonitorPlay size={24} className="group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        scheduleEvents.sort((a,b) => a.date.localeCompare(b.date)).map(ev => (
                            <div key={ev.id} className="bg-brand-500/10 backdrop-blur-xl rounded-[2.5rem] border border-brand-500/30 p-10 flex flex-col lg:flex-row items-center justify-between hover:border-brand-500/50 transition-all group relative overflow-hidden shadow-2xl">
                                <div className="flex items-center gap-10">
                                    <div className="w-20 h-20 bg-brand-950 rounded-3xl flex flex-col items-center justify-center border border-white/10 group-hover:border-brand-500 transition-all shadow-inner">
                                        <p className="text-[11px] font-black text-brand-600 uppercase italic leading-none mb-1">{new Date(ev.date).toLocaleDateString(undefined, { month: 'short' })}</p>
                                        <p className="text-3xl font-black text-white italic leading-none">{new Date(ev.date).getDate()}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-4 mb-3">
                                            <span className="px-3 py-1.5 bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-brand-500/20 italic">{getRelativeTime(ev.date)}</span>
                                            <div className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-widest italic"><Clock size={14} /> {ev.time}</div>
                                        </div>
                                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter group-hover:text-brand-500 transition-all">{ev.title}</h3>
                                        <div className="flex items-center gap-3 text-brand-600 font-bold text-xs mt-2 italic"><MapPin size={14} /> {ev.location}</div>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    let opp = ev.title;
                                    if (opp.toLowerCase().includes(' vs ')) opp = opp.split(' vs ')[1];
                                    setNewMatch({ ...newMatch, scheduledEventId: ev.id, date: ev.date, opponent: opp.trim(), isLive: true });
                                    setShowForm(true);
                                }} className="mt-8 lg:mt-0 w-full lg:w-auto px-10 py-5 bg-brand-500 text-brand-950 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-xl shadow-brand-500/10 hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-3 italic"><Zap size={18} fill="currentColor" /> INITIALIZE DEPLOYMENT</button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[100] bg-brand-950/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in duration-500">
                    <div className="bg-brand-900 w-full max-w-4xl max-h-[90vh] rounded-[4rem] shadow-3xl border border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="flex justify-between items-center px-12 py-10 border-b border-white/5 bg-brand-950/50">
                            <div>
                                <h3 className="font-black text-3xl text-white italic uppercase tracking-tighter">Prepare <span className="text-brand-500">Engagement</span></h3>
                                <p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.4em] mt-2 italic">Tactical Objective Parameters</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-4 bg-brand-800 hover:bg-brand-700 rounded-2xl text-brand-600 hover:text-white transition-all shadow-xl"><X size={28} /></button>
                        </div>
                        <div className="overflow-y-auto px-12 py-12 space-y-12 flex-1 custom-scrollbar">
                            <div className="flex items-center justify-between p-8 bg-brand-800 rounded-[2.5rem] border border-white/5 hover:border-brand-500/30 transition-all cursor-pointer shadow-inner" onClick={() => setNewMatch({...newMatch, isLive: !newMatch.isLive})}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${newMatch.isLive ? 'bg-red-600 shadow-xl shadow-red-600/30 scale-105' : 'bg-brand-950 border border-white/10'}`}><Zap size={28} className={newMatch.isLive ? 'text-white' : 'text-brand-800'} fill={newMatch.isLive ? 'white' : 'transparent'} /></div>
                                    <div className="space-y-1"><p className="text-lg font-black text-white italic tracking-tight uppercase">REAL-TIME TELEMETRY</p><p className="text-[11px] text-brand-600 font-bold uppercase tracking-widest">Activate live score command and tactical monitoring</p></div>
                                </div>
                                <div className={`w-16 h-9 rounded-full p-1.5 transition-all flex items-center ${newMatch.isLive ? 'bg-red-600' : 'bg-brand-950 border border-white/10'}`}><div className={`h-6 w-6 rounded-full bg-white shadow-2xl transition-all transform ${newMatch.isLive ? 'translate-x-7' : 'translate-x-0'}`} /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3"><label className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic ml-1">Schedule Sync</label><select className="w-full bg-brand-950 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-500 transition-all appearance-none" value={newMatch.scheduledEventId} onChange={handleScheduleSelect}><option value="">-- Manual Objective --</option>{scheduleEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}</select></div>
                                <div className="space-y-3"><label className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic ml-1">Engagement Date</label><input type="date" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="w-full bg-brand-950 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-500 transition-all font-mono" /></div>
                                <div className="md:col-span-2 space-y-3"><label className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic ml-1">Target Opponent</label><input type="text" placeholder="OMEGA FORCE 1" value={newMatch.opponent} onChange={e => setNewMatch({...newMatch, opponent: e.target.value})} className="w-full bg-brand-950 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-500 transition-all tracking-widest" /></div>
                            </div>
                            <section className="space-y-6">
                                <div className="flex justify-between items-center"><h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.4em] italic flex items-center gap-3"><Shirt size={16} /> OPERATIONAL SQUAD (11)</h4><span className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all ${starters.size === 11 ? 'bg-brand-500 text-brand-950 shadow-lg' : 'bg-brand-800 text-brand-700'}`}>{starters.size} / 11 SELECTED</span></div>
                                <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 bg-brand-950/30 p-4 sm:p-6 rounded-[2.5rem] border border-white/5 shadow-inner max-h-[350px] overflow-y-auto custom-scrollbar">
                                    {players.map(p => (
                                        <div key={p.id} onClick={() => toggleStarter(p.id)} className={`cursor-pointer p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex items-center gap-2 sm:gap-4 ${starters.has(p.id) ? 'bg-brand-500/10 border-brand-500 shadow-xl' : 'bg-brand-900 border-white/5'}`}>
                                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md sm:rounded-lg border-2 flex items-center justify-center transition-all ${starters.has(p.id) ? 'bg-brand-500 border-brand-500' : 'border-brand-800'}`}>{starters.has(p.id) && <Check size={12} className="text-brand-950" strokeWidth={4} />}</div>
                                            <span className={`text-[9px] sm:text-[10px] font-black uppercase italic tracking-tight truncate ${starters.has(p.id) ? 'text-brand-500' : 'text-white/70 group-hover:text-white transition-colors'}`}>{p.fullName}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        <div className="px-6 md:px-12 py-6 md:py-10 border-t border-white/5 bg-brand-950/50 flex flex-col sm:flex-row gap-4 sm:gap-6"><button onClick={() => setShowForm(false)} className="w-full sm:w-auto px-10 py-5 text-brand-700 font-black hover:text-white transition-all text-[10px] sm:text-xs uppercase tracking-[0.3em] italic">Abort Engagement</button><button onClick={handleSaveMatch} className={`flex-1 py-5 font-black rounded-3xl shadow-3xl transition-all flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.4em] italic ${newMatch.isLive ? 'bg-red-600 text-white shadow-red-600/20' : 'bg-brand-500 text-brand-950 shadow-brand-500/20'}`}><Save size={18} /> {newMatch.isLive ? 'DEEP SCAN DEPLOYMENT' : 'STORE TACTICAL DATA'}</button></div>
                    </div>
                </div>
            )}

            {/* Video Player Overlay */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-brand-950/98 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-6xl aspect-video bg-black rounded-[4rem] overflow-hidden shadow-3xl border border-white/10 relative">
                        <button onClick={() => setSelectedVideo(null)} className="absolute top-8 right-8 z-10 p-4 bg-brand-950/80 text-white rounded-2xl hover:bg-brand-500 hover:text-brand-950 transition-all shadow-2xl border border-white/10"><X size={24}/></button>
                        <iframe src={selectedVideo} className="w-full h-full" title="Engagement Tape" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                </div>
            )}
        </div>
    );
};
