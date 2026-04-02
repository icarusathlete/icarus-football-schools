import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, ScheduleEvent } from '../types';
import { 
    PlusCircle, Calendar, Trophy, ChevronDown, Save, X, Youtube, 
    PlayCircle, Filter, MonitorPlay, FileJson, UploadCloud, 
    AlertCircle, Check, Users, Shirt, Activity, Clock, 
    MessageSquare, Award, PieChart, TrendingUp, History,
    Flame, Zap, Target, MapPin
} from 'lucide-react';

export const MatchManager: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
    
    // JSON Import State
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [importStatus, setImportStatus] = useState<{msg: string, type: 'success' | 'error' | 'neutral'}>({ msg: '', type: 'neutral' });
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
    
    // Starters Logic: Set of player IDs
    const [starters, setStarters] = useState<Set<string>>(new Set());
    const [playerStats, setPlayerStats] = useState<Record<string, { goals: number, assists: number, rating: number }>>({});

    const loadData = () => {
        const sortedMatches = StorageService.getMatches().sort((a,b) => b.date.localeCompare(a.date));
        setMatches(sortedMatches);
        const allPlayers = StorageService.getPlayers();
        setPlayers(allPlayers);
        setScheduleEvents(StorageService.getSchedule().filter(e => e.type === 'match'));
        
        // Check for live match
        const live = sortedMatches.find(m => m.isLive);
        if (live && !activeMatchId) {
            // Uncomment if you want to auto-open live match dashboard
            // setActiveMatchId(live.id);
        }

        // Init stats if empty
        if (allPlayers.length > 0 && Object.keys(playerStats).length === 0) {
             const initialStats: any = {};
             allPlayers.forEach(p => {
                 initialStats[p.id] = { goals: 0, assists: 0, rating: 6 };
             });
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
        
        if (newMatch.isLive && saved) {
            setActiveMatchId(saved.id);
        }

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
        setJsonInput('');
        setShowJsonImport(false);
    };

    const updateStat = (pid: string, field: string, val: number) => {
        setPlayerStats(prev => ({
            ...prev,
            [pid]: { ...prev[pid], [field]: val }
        }));
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
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase flex items-center gap-3">
                        MATCH <span className="text-gold">CENTER</span>
                        {matches.some(m => m.isLive) && (
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </h1>
                    <p className="text-brand-400 font-medium mt-1">Live tracking, post-match analysis & seasonality.</p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setShowForm(true)}
                        className="flex-1 md:flex-none bg-gold text-brand-950 px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-gold/20 hover:scale-105 active:scale-95 transition-all font-black text-xs uppercase tracking-widest"
                    >
                        <PlusCircle size={18} />
                        CREATE FIXTURE
                    </button>
                </div>
            </div>

            {/* Dashboard Stats Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Played', val: matches.length, icon: History, color: 'text-brand-400' },
                    { label: 'Wins', val: matches.filter(m => m.result === 'W').length, icon: Trophy, color: 'text-gold' },
                    { label: 'Draws', val: matches.filter(m => m.result === 'D').length, icon: Activity, color: 'text-blue-400' },
                    { label: 'Losses', val: matches.filter(m => m.result === 'L').length, icon: Target, color: 'text-red-400' },
                ].map((stat, i) => (
                    <div key={i} className="bg-brand-800 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">{stat.label}</p>
                            <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                        </div>
                        <stat.icon className={`w-8 h-8 ${stat.color} opacity-20`} />
                    </div>
                ))}
            </div>

            {/* Live Matches / Active Selection */}
            {activeMatch && (
                <div className="bg-brand-800 rounded-3xl border border-gold/30 shadow-2xl shadow-gold/10 overflow-hidden animate-in slide-in-from-bottom-8">
                    <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-3 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            LIVE MATCH CONSOLE
                        </div>
                        <button onClick={() => setActiveMatchId(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={18}/></button>
                    </div>

                    <div className="p-8">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                            {/* Score Display */}
                            <div className="flex items-center gap-8 md:gap-16">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-brand-900 rounded-2xl flex items-center justify-center mb-3 border border-white/10">
                                        <Shirt size={40} className="text-gold" />
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase">{settings.name}</h4>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <button 
                                            onClick={() => updateLiveMatch({ ...activeMatch, scoreFor: activeMatch.scoreFor + 1 })}
                                            className="w-12 h-12 rounded-full bg-gold/10 text-gold flex items-center justify-center hover:bg-gold hover:text-brand-950 transition-all border border-gold/20"
                                        >
                                            <TrendingUp size={20} />
                                        </button>
                                        <div className="text-6xl font-black text-white font-mono">{activeMatch.scoreFor}</div>
                                        <button 
                                            onClick={() => updateLiveMatch({ ...activeMatch, scoreFor: Math.max(0, activeMatch.scoreFor - 1) })}
                                            className="text-brand-500 hover:text-white transition-colors"
                                        >
                                            <ChevronDown size={24} />
                                        </button>
                                    </div>
                                    <div className="text-4xl font-black text-brand-600">:</div>
                                    <div className="flex flex-col items-center gap-2">
                                        <button 
                                            onClick={() => updateLiveMatch({ ...activeMatch, scoreAgainst: activeMatch.scoreAgainst + 1 })}
                                            className="w-12 h-12 rounded-full bg-white/5 text-white flex items-center justify-center hover:bg-white hover:text-brand-950 transition-all border border-white/10"
                                        >
                                            <TrendingUp size={20} />
                                        </button>
                                        <div className="text-6xl font-black text-white font-mono">{activeMatch.scoreAgainst}</div>
                                        <button 
                                            onClick={() => updateLiveMatch({ ...activeMatch, scoreAgainst: Math.max(0, activeMatch.scoreAgainst - 1) })}
                                            className="text-brand-500 hover:text-white transition-colors"
                                        >
                                            <ChevronDown size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <div className="w-20 h-20 bg-brand-900 rounded-2xl flex items-center justify-center mb-3 border border-white/10">
                                        <Users size={40} className="text-brand-400" />
                                    </div>
                                    <h4 className="text-sm font-black text-brand-400 uppercase">{activeMatch.opponent}</h4>
                                </div>
                            </div>

                            {/* Live Actions & Stats */}
                            <div className="flex-1 w-full lg:w-auto h-full space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-brand-900/50 p-4 rounded-2xl border border-white/5">
                                        <p className="text-[10px] font-bold text-brand-500 uppercase mb-2">Possession</p>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="range" className="flex-1 accent-gold" min="0" max="100" 
                                                value={activeMatch.possession || 50}
                                                onChange={(e) => updateLiveMatch({ ...activeMatch, possession: parseInt(e.target.value) })}
                                            />
                                            <span className="text-lg font-black text-white">{activeMatch.possession || 50}%</span>
                                        </div>
                                    </div>
                                    <div className="bg-brand-900/50 p-4 rounded-2xl border border-white/5">
                                        <p className="text-[10px] font-bold text-brand-500 uppercase mb-2">Shots on Target</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-2xl font-black text-white">{activeMatch.shotsOnTarget || 0}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => updateLiveMatch({...activeMatch, shotsOnTarget: Math.max(0, (activeMatch.shotsOnTarget || 0) - 1)})} className="p-2 rounded bg-white/5 hover:bg-white/10 text-white"><X size={12}/></button>
                                                <button onClick={() => updateLiveMatch({...activeMatch, shotsOnTarget: (activeMatch.shotsOnTarget || 0) + 1})} className="p-2 rounded bg-gold/20 hover:bg-gold text-brand-950 transition-colors"><TrendingUp size={12}/></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => finalizeMatch(activeMatch)}
                                    className="w-full py-4 bg-brand-950 text-gold rounded-2xl font-black uppercase tracking-widest text-sm border border-gold/30 hover:bg-gold hover:text-brand-950 transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={20} /> FINALIZE & SYNC DATA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Toggle Tabs */}
            <div className="relative flex p-1.5 bg-brand-800 rounded-2xl w-full md:w-fit border border-white/5 overflow-hidden">
                <div 
                    className="absolute top-1.5 bottom-1.5 bg-gold rounded-xl transition-all duration-300 ease-out z-0"
                    style={{ 
                        left: activeTab === 'results' ? '0.375rem' : 'calc(50% + 0.1875rem)',
                        width: 'calc(50% - 0.5625rem)'
                    }}
                />
                <button 
                    onClick={() => setActiveTab('results')}
                    className={`relative z-10 flex-1 md:px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${activeTab === 'results' ? 'text-brand-950' : 'text-brand-500 hover:text-white'}`}
                >
                    <History size={14} />
                    Results
                </button>
                <button 
                    onClick={() => setActiveTab('fixtures')}
                    className={`relative z-10 flex-1 md:px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${activeTab === 'fixtures' ? 'text-brand-950' : 'text-brand-500 hover:text-white'}`}
                >
                    <Calendar size={14} />
                    Fixtures
                </button>
            </div>

            {/* Previous Matches Stream */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 text-brand-400 text-xs font-black uppercase tracking-widest">
                    <span>{activeTab === 'results' ? 'Recent Fixtures' : 'Upcoming Deployments'}</span>
                    <div className="h-px bg-white/5 flex-1" />
                    <Filter size={14} className="hover:text-gold cursor-pointer" />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {activeTab === 'results' ? (
                        matches.map(m => (
                            <div key={m.id} className="group relative bg-brand-800 rounded-2xl border border-white/5 hover:border-white/10 hover:shadow-2xl hover:shadow-black transition-all overflow-hidden p-6 md:p-8">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.isLive ? 'bg-red-500' : m.result === 'W' ? 'bg-gold shadow-[2px_0_10px_rgba(251,191,36,0.5)]' : m.result === 'L' ? 'bg-red-900' : 'bg-brand-500'}`} />

                                <div className="flex flex-col md:flex-row items-center gap-10">
                                    {/* Date Column */}
                                    <div className="flex flex-col items-center md:items-start min-w-[100px]">
                                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">{new Date(m.date).getFullYear()}</p>
                                        <div className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">
                                            {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                        {m.isLive ? (
                                            <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded animate-pulse tracking-widest uppercase">Live Now</span>
                                        ) : (
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${m.result === 'W' ? 'text-gold' : m.result === 'L' ? 'text-red-500' : 'text-brand-400'}`}>
                                                {m.result === 'W' ? 'VICTORY' : m.result === 'L' ? 'DEFEAT' : 'STALEMATE'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Score Dossier */}
                                    <div className="flex-1 flex items-center justify-between w-full py-6 md:py-0 border-y md:border-none border-white/5">
                                        <div className="flex-1 text-right pr-6 space-y-1">
                                            <p className="text-[9px] font-black text-brand-600 uppercase tracking-[0.2em]">HOME (ACADEMY)</p>
                                            <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tight">{settings.name}</h3>
                                        </div>
                                        
                                        <div className="bg-brand-950 px-6 py-4 rounded-[1.25rem] border border-white/10 font-mono text-4xl font-black text-white shadow-2xl flex items-center gap-6 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-white text-brand-950 px-3 py-1 rounded-full text-xs font-black shadow-lg" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }}></div>
                                            <span className={m.isLive ? 'text-white' : m.result === 'W' ? 'text-gold' : 'text-white'}>{m.scoreFor}</span>
                                            <span className="text-brand-800 opacity-30">:</span>
                                            <span className="text-brand-400">{m.scoreAgainst}</span>
                                        </div>

                                        <div className="flex-1 text-left pl-6 space-y-1">
                                            <p className="text-[9px] font-black text-brand-600 uppercase tracking-[0.2em]">AWAY (OPPONENT)</p>
                                            <h3 className="text-xl md:text-2xl font-black text-brand-400 italic uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">{m.opponent}</h3>
                                        </div>
                                    </div>

                                    {/* Action Hub */}
                                    <div className="flex items-center gap-4">
                                        <div className="hidden lg:flex flex-col items-end pr-6 border-r border-white/5 space-y-1">
                                            <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest leading-none">Scout Index</p>
                                            <p className="text-lg font-black text-white italic leading-none">{(m.playerStats.reduce((s, p) => s + p.rating, 0) / (m.playerStats.length || 1)).toFixed(1)} <span className="text-brand-700 text-xs">AVG</span></p>
                                        </div>
                                        <div className="flex gap-2">
                                            {m.isLive ? (
                                                <button onClick={() => setActiveMatchId(m.id)} className="bg-red-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold hover:text-brand-950 transition-all shadow-lg active:scale-95">Live Console</button>
                                            ) : (
                                                <>
                                                    {m.highlightsUrl && (
                                                        <button onClick={() => setSelectedVideo(getYouTubeEmbedUrl(m.highlightsUrl))} className="p-3.5 bg-brand-900 border border-white/10 text-gold rounded-xl hover:bg-gold hover:text-brand-950 transition-all shadow-lg active:scale-90"><PlayCircle size={20} /></button>
                                                    )}
                                                    <button onClick={() => setActiveMatchId(m.id)} className="p-3.5 bg-brand-900 border border-white/10 text-white rounded-xl hover:border-gold/50 transition-all active:scale-90 opacity-40 hover:opacity-100"><MessageSquare size={20} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        scheduleEvents.sort((a,b) => a.date.localeCompare(b.date)).map(ev => {
                            const isSoon = Math.abs(new Date(ev.date).getTime() - new Date().getTime()) < (7 * 24 * 60 * 60 * 1000);
                            return (
                                <div key={ev.id} className="bg-brand-800 rounded-3xl border border-white/5 p-8 flex flex-col md:flex-row items-center justify-between hover:border-gold/20 transition-all group relative overflow-hidden">
                                     {isSoon && <div className="absolute top-0 right-0 px-4 py-1 bg-gold text-brand-950 text-[8px] font-black uppercase tracking-[0.2em] rounded-bl-xl shadow-lg">Deployment Imminent</div>}
                                    
                                    <div className="flex items-center gap-8">
                                        <div className="w-16 h-16 bg-brand-950 rounded-[1.25rem] flex flex-col items-center justify-center border border-white/5 group-hover:border-gold/20 transition-colors">
                                            <p className="text-[10px] font-black text-brand-500 uppercase tracking-tighter">{new Date(ev.date).toLocaleDateString(undefined, { month: 'short' })}</p>
                                            <p className="text-2xl font-black text-white leading-none">{new Date(ev.date).getDate()}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="px-2.5 py-1 bg-white/5 text-brand-300 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/5">{getRelativeTime(ev.date)}</span>
                                                <div className="flex items-center gap-1.5 text-brand-600 font-black text-[10px] uppercase tracking-widest"><Clock size={12} /> {ev.time}</div>
                                            </div>
                                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tight group-hover:text-gold transition-colors">{ev.title}</h3>
                                            <div className="flex items-center gap-2 text-brand-500 font-medium text-xs mt-1.5"><MapPin size={12} className="text-brand-700" /> {ev.location}</div>
                                        </div>
                                    </div>
                                    <div className="mt-6 md:mt-0 flex flex-col items-end gap-3 w-full md:w-auto">
                                        <button 
                                            onClick={() => {
                                                let opp = ev.title;
                                                if (opp.toLowerCase().includes(' vs ')) opp = opp.split(' vs ')[1];
                                                else if (opp.toLowerCase().includes('against')) opp = opp.split('against')[1];
                                                setNewMatch({ ...newMatch, scheduledEventId: ev.id, date: ev.date, opponent: opp.trim(), isLive: true });
                                                setShowForm(true);
                                            }}
                                            className={`w-full md:w-auto px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${isSoon ? 'bg-gold text-brand-950 shadow-xl shadow-gold/20 hover:scale-[1.03]' : 'bg-brand-900 border border-white/10 text-brand-400 opacity-60 hover:opacity-100 hover:border-gold/30'}`}
                                        >
                                            <Zap size={14} fill="currentColor" /> {isSoon ? 'GO LIVE NOW' : 'MANUAL PREPARATION'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {activeTab === 'results' && matches.length === 0 && (
                     <div className="bg-brand-800 rounded-3xl p-20 text-center border-2 border-dashed border-white/5">
                        <Activity className="w-16 h-16 text-brand-500 mx-auto mb-6 opacity-20" />
                        <h3 className="text-xl font-bold text-white">Awaiting Season Kickoff</h3>
                        <p className="text-brand-500 mt-2 max-w-sm mx-auto text-sm">No matches recorded yet. Create fixtures and log results to see season-long analytics here.</p>
                     </div>
                )}
                
                {activeTab === 'fixtures' && scheduleEvents.length === 0 && (
                     <div className="bg-brand-800 rounded-3xl p-20 text-center border-2 border-dashed border-white/5">
                        <Calendar className="w-16 h-16 text-brand-500 mx-auto mb-6 opacity-20" />
                        <h3 className="text-xl font-bold text-white">Clear Schedule</h3>
                        <p className="text-brand-500 mt-2 max-w-sm mx-auto text-sm">No upcoming matches found in the academy schedule. Plan your fixtures in the Schedule tab.</p>
                     </div>
                )}
            </div>

            {/* Match Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-brand-900 w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[95vh] rounded-[2rem] shadow-2xl border border-white/10 flex flex-col overflow-hidden relative">
                        {/* Static gold lines aesthetic */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-30" />
                        
                        <div className="flex justify-between items-center px-10 py-6 border-b border-white/5">
                            <div>
                                <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">Create <span className="text-gold">Fixture</span></h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-1 w-1 rounded-full bg-gold animate-pulse" />
                                    <p className="text-[10px] text-brand-400 font-bold uppercase tracking-[0.2em]">Live Tracking Enabled</p>
                                </div>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors text-brand-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="overflow-y-auto px-10 py-8 space-y-10 flex-1 custom-scrollbar">
                            {/* Live Toggle */}
                            <div className="flex items-center justify-between p-6 bg-brand-800 rounded-3xl border border-white/5 group hover:border-gold/30 transition-all cursor-pointer" onClick={() => setNewMatch({...newMatch, isLive: !newMatch.isLive})}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${newMatch.isLive ? 'bg-red-600 shadow-lg shadow-red-600/30' : 'bg-brand-900 border border-white/10'}`}>
                                        <Zap size={20} className={newMatch.isLive ? 'text-white' : 'text-brand-400'} fill={newMatch.isLive ? 'white' : 'transparent'} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">TRACK LIVE</p>
                                        <p className="text-xs text-brand-500 font-medium">Enable real-time score console during the match</p>
                                    </div>
                                </div>
                                <div className={`w-14 h-8 rounded-full p-1 transition-all ${newMatch.isLive ? 'bg-red-600' : 'bg-brand-900 border border-white/10'}`}>
                                    <div className={`h-6 w-6 rounded-full bg-white shadow-md transition-all transform ${newMatch.isLive ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>

                            <section>
                                <h4 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                                    <Target size={14} className="text-gold" /> FIXTURE DETAILS
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-12 gap-5 p-6 bg-brand-800/50 rounded-3xl border border-white/5">
                                    <div className="col-span-2 md:col-span-12">
                                        <label className="text-[10px] font-bold text-brand-500 mb-2 block uppercase tracking-widest">Link Schedule</label>
                                        <select 
                                            value={newMatch.scheduledEventId} onChange={handleScheduleSelect} 
                                            className="w-full bg-brand-950 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-gold transition-all font-bold text-sm"
                                        >
                                            <option value="">-- Manual Entry --</option>
                                            {scheduleEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title} ({new Date(ev.date).toLocaleDateString()})</option>)}
                                        </select>
                                    </div>

                                    <div className="col-span-2 md:col-span-4">
                                        <label className="text-[10px] font-bold text-brand-500 mb-2 block uppercase tracking-widest">Date</label>
                                        <input type="date" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="w-full bg-brand-950 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-gold transition-all font-bold text-sm" />
                                    </div>
                                    <div className="col-span-2 md:col-span-8">
                                        <label className="text-[10px] font-bold text-brand-500 mb-2 block uppercase tracking-widest">Opponent Name</label>
                                        <input type="text" placeholder="e.g. United Academy" value={newMatch.opponent} onChange={e => setNewMatch({...newMatch, opponent: e.target.value})} className="w-full bg-brand-950 border border-white/10 p-3.5 rounded-xl text-white outline-none focus:border-gold transition-all font-bold text-sm" />
                                    </div>

                                    {!newMatch.isLive && (
                                        <>
                                            <div className="col-span-1 md:col-span-6">
                                                <label className="text-[10px] font-bold text-brand-500 mb-2 block uppercase tracking-widest">Final Score (For)</label>
                                                <input type="number" value={newMatch.scoreFor} onChange={e => setNewMatch({...newMatch, scoreFor: parseInt(e.target.value)})} className="w-full bg-brand-950 border border-white/10 p-4 rounded-xl text-gold outline-none focus:border-gold text-2xl font-mono font-black" />
                                            </div>
                                            <div className="col-span-1 md:col-span-6">
                                                <label className="text-[10px] font-bold text-brand-500 mb-2 block uppercase tracking-widest">Final Score (Against)</label>
                                                <input type="number" value={newMatch.scoreAgainst} onChange={e => setNewMatch({...newMatch, scoreAgainst: parseInt(e.target.value)})} className="w-full bg-brand-950 border border-white/10 p-4 rounded-xl text-white/50 outline-none focus:border-gold text-2xl font-mono font-black" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </section>

                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.25em] flex items-center gap-2">
                                        <Shirt size={14} className="text-gold" /> STARTING SQUAD
                                    </h4>
                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full ${starters.size === 11 ? 'bg-gold text-brand-950' : 'bg-brand-800 text-brand-400 border border-white/5'}`}>
                                        {starters.size} / 11 SELECTED
                                    </span>
                                </div>
                                <div className="bg-brand-950/30 p-6 rounded-3xl border border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {players.map(p => (
                                            <div 
                                                key={p.id} onClick={() => toggleStarter(p.id)}
                                                className={`cursor-pointer p-3 rounded-xl border flex items-center gap-3 transition-all ${starters.has(p.id) ? 'bg-gold/10 border-gold shadow-lg shadow-gold/5' : 'bg-brand-900 border-white/5 hover:border-white/20'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${starters.has(p.id) ? 'bg-gold border-gold' : 'border-brand-600'}`}>
                                                    {starters.has(p.id) && <Check size={10} strokeWidth={4} className="text-brand-950" />}
                                                </div>
                                                <span className={`text-xs font-black truncate ${starters.has(p.id) ? 'text-gold' : 'text-brand-400'}`}>{p.fullName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {!newMatch.isLive && (
                                <section className="animate-in slide-in-from-top-4">
                                    <h4 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                                        <MessageSquare size={14} className="text-gold" /> POST-MATCH REPORT
                                    </h4>
                                    <div className="space-y-4">
                                        <textarea 
                                            placeholder="Sum up the team's performance, tactical successes, and areas for improvement..."
                                            value={newMatch.report}
                                            onChange={(e) => setNewMatch({...newMatch, report: e.target.value})}
                                            className="w-full bg-brand-800 border border-white/10 p-5 rounded-3xl text-white outline-none focus:border-gold transition-all min-h-[150px] text-sm font-medium leading-relaxed"
                                        />
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-brand-800 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                                                <Award className="text-gold w-6 h-6" strokeWidth={1} />
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-bold text-brand-500 uppercase mb-1">Player of the Match</p>
                                                    <select 
                                                        value={newMatch.playerOfTheMatchId} 
                                                        onChange={(e) => setNewMatch({...newMatch, playerOfTheMatchId: e.target.value})}
                                                        className="w-full bg-transparent text-white font-bold outline-none text-sm appearance-none"
                                                    >
                                                        <option value="">Select Athlete...</option>
                                                        {Array.from(starters).map(id => {
                                                            const p = players.find(player => player.id === id);
                                                            return p ? <option key={p.id} value={p.id}>{p.fullName}</option> : null;
                                                        })}
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-brand-800 p-4 rounded-2xl border border-white/5">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-[9px] font-bold text-brand-500 uppercase">Possession Control</p>
                                                    <span className="text-xs font-black text-white">{newMatch.possession}%</span>
                                                </div>
                                                <input type="range" className="w-full accent-gold" value={newMatch.possession} onChange={(e) => setNewMatch({...newMatch, possession: parseInt(e.target.value)})} />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="px-10 py-6 border-t border-white/5 bg-brand-950/50 flex gap-4">
                            <button onClick={() => setShowForm(false)} className="px-8 py-4 text-brand-500 font-bold hover:text-white rounded-2xl transition-colors text-sm uppercase tracking-widest">Discard</button>
                            <button 
                                onClick={handleSaveMatch}
                                className={`flex-1 py-4 font-black rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 transform active:scale-95 text-sm uppercase tracking-[0.2em] ${newMatch.isLive ? 'bg-red-600 text-white shadow-red-600/20' : 'bg-gold text-brand-950 shadow-gold/20'}`}
                            >
                                <Save size={18} /> {newMatch.isLive ? 'COMMENCE TRACKING' : 'STORE RECORDS'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Player Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in">
                    <div className="w-full max-w-5xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
                        <button onClick={() => setSelectedVideo(null)} className="absolute top-6 right-6 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-gold hover:text-brand-950 transition-all"><X size={20}/></button>
                        <div className="aspect-video w-full bg-black">
                            <iframe src={selectedVideo} className="w-full h-full" title="Highlights" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
