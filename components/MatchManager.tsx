import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, ScheduleEvent, MatchEvent } from '../types';
import { 
    PlusCircle, Calendar, Trophy, ChevronDown, Save, X, Youtube, 
    PlayCircle, Filter, MonitorPlay, FileJson, UploadCloud, 
    AlertCircle, Check, Users, Shirt, Activity, Clock, 
    MessageSquare, Award, PieChart, TrendingUp, History,
    Flame, Zap, Target, MapPin, Shield, Trash2, RefreshCw, ArrowRight
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
    
    // Live Match Timer State
    const [matchTime, setMatchTime] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    
    // Goal Entry Modal State
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showCardModal, setShowCardModal] = useState<{type: 'yellow_card' | 'red_card'} | null>(null);
    const [showSubModal, setShowSubModal] = useState(false);
    const [selectedGoalScorer, setSelectedGoalScorer] = useState('');
    const [selectedAssistant, setSelectedAssistant] = useState('');
    const [selectedCardPlayer, setSelectedCardPlayer] = useState('');
    const [selectedSubOut, setSelectedSubOut] = useState('');
    const [selectedSubIn, setSelectedSubIn] = useState('');
    
    // Console Tabs
    // Console State
    const [consoleTab, setConsoleTab] = useState<'tactical' | 'performance'>('tactical');
    const [selectedMatchDetails, setSelectedMatchDetails] = useState<Match | null>(null);

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
    }, [playerStats, players]);

    // Match Timer Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setMatchTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    // Sync timer state with active match if it changes externally
    useEffect(() => {
        const match = matches.find(m => m.id === activeMatchId);
        if (match && match.isLive) {
            if (match.timerState) {
                setMatchTime(match.timerState.currentTime || 0);
                setIsTimerRunning(match.timerState.isRunning || false);
            }
        } else {
            setMatchTime(0);
            setIsTimerRunning(false);
        }
    }, [activeMatchId]);

    const formatMatchTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleTimer = async () => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match) return;

        const newRunning = !isTimerRunning;
        setIsTimerRunning(newRunning);
        
        const updatedMatch = {
            ...match,
            timerState: {
                currentTime: matchTime,
                isRunning: newRunning
            }
        };
        await StorageService.updateMatch(updatedMatch);
    };

    const handleAddGoal = () => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match || !selectedGoalScorer) return;
        const newEvent: MatchEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'goal',
            minute: Math.floor(matchTime / 60) + 1,
            playerId: selectedGoalScorer,
            assistantId: selectedAssistant || undefined
        };
        const updatedEvents = [...(match.events || []), newEvent];
        const updatedStats = match.playerStats.map(ps => {
            if (ps.playerId === selectedGoalScorer) return { ...ps, goals: (ps.goals || 0) + 1 };
            if (ps.playerId === selectedAssistant) return { ...ps, assists: (ps.assists || 0) + 1 };
            return ps;
        });
        updateLiveMatch({ ...match, scoreFor: (match.scoreFor || 0) + 1, events: updatedEvents, playerStats: updatedStats });
        setShowGoalModal(false); setSelectedGoalScorer(''); setSelectedAssistant('');
    };

    const handleAddCard = (type: 'yellow_card' | 'red_card') => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match || !selectedCardPlayer) return;
        const newEvent: MatchEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            minute: Math.floor(matchTime / 60) + 1,
            playerId: selectedCardPlayer
        };
        updateLiveMatch({ ...match, events: [...(match.events || []), newEvent] });
        setShowCardModal(null); setSelectedCardPlayer('');
    };

    const handleAddSub = () => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match || !selectedSubOut || !selectedSubIn) return;
        const newEvent: MatchEvent = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'substitution',
            minute: Math.floor(matchTime / 60) + 1,
            playerId: selectedSubOut,
            subOutId: selectedSubOut,
            subInId: selectedSubIn
        };
        updateLiveMatch({ ...match, events: [...(match.events || []), newEvent] });
        setShowSubModal(false); setSelectedSubOut(''); setSelectedSubIn('');
    };

    const updatePlayerPerformance = async (playerId: string, updates: { rating?: number, isMOTM?: boolean }) => {
        const match = matches.find(m => m.id === activeMatchId);
        if (!match) return;

        const updatedMatch = {
            ...match,
            playerOfTheMatchId: updates.isMOTM ? playerId : (match.playerOfTheMatchId === playerId ? '' : match.playerOfTheMatchId),
            playerStats: match.playerStats.map(ps => {
                if (ps.playerId === playerId) {
                    return {
                        ...ps,
                        rating: updates.rating !== undefined ? updates.rating : ps.rating
                    };
                }
                return ps;
            })
        };

        await StorageService.updateMatch(updatedMatch);
        loadData();
    };

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
        } as any;
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
        loadData();
    };

    const finalizeMatch = async (match: Match) => {
        const finalized = { ...match, isLive: false };
        await StorageService.updateMatch(finalized);
        setActiveMatchId(null);
        loadData();
    };

    const handleDeleteMatch = async (id: string) => {
        if (confirm('Delete this match record?')) {
            await StorageService.deleteMatch(id);
            loadData();
        }
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
            {/* Header */}
            <div className="glass-card p-10 md:p-14 rounded-[3.5rem] border border-white/20 shadow-[0_20px_50px_rgba(13,27,138,0.3)] relative overflow-hidden group ring-1 ring-white/10">
                <div className="green-light-bar" />
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none select-none group-hover:opacity-[0.1] transition-opacity duration-700">
                    <Activity size={320} className="text-white -mr-16 -mt-16" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
                        <div className="space-y-4">
                            <h1 className="text-5xl sm:text-7xl font-black italic text-white uppercase tracking-tighter leading-none">
                                MATCH <span className="premium-gradient-text">CENTER</span>
                            </h1>
                            <div className="flex items-center gap-4">
                                <span className="w-12 h-[1px] bg-brand-accent/40"></span>
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.5em] italic">
                                    OPERATIONAL FIXTURES · PERFORMANCE MONITORING
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowForm(!showForm)}
                            className={`px-10 py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 italic flex items-center gap-3 shadow-2xl ${showForm ? 'bg-white/10 text-white' : 'bg-brand-accent text-brand-950 hover:scale-[1.05]'}`}
                        >
                            {showForm ? <X size={14} /> : <Zap size={14} />} {showForm ? 'CLOSE BRIEFING' : 'NEW MATCH DEPLOYMENT'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Matches', value: matches.length, icon: <Activity size={18} />, color: '#C3F629' },
                    { label: 'Upcoming', value: scheduleEvents.length, icon: <Zap size={18} />, color: '#60a5fa' },
                    { label: 'Avg Rating', value: '7.8', icon: <Target size={18} />, color: '#f59e0b' },
                    { label: 'Live nodes', value: matches.filter(m => m.isLive).length, icon: <Activity size={18} />, color: '#C3F629', pulse: matches.some(m => m.isLive) }
                ].map((k, i) => (
                    <div key={i} className="glass-card p-8 rounded-[2.5rem] group hover:bg-white/10 hover:border-white/30 transition-all duration-500 shadow-xl relative overflow-hidden">
                        {k.pulse && <div className="green-light-bar" />}
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <div style={{ color: k.color }}>{k.icon}</div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic mb-4">{k.label}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-black italic leading-none tracking-tighter text-white group-hover:text-brand-accent transition-colors duration-500">{k.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Live Match Console */}
            {activeMatch && (
                <div className="fixed inset-0 z-[100] lg:relative lg:inset-auto glass-card lg:rounded-[3.5rem] border-0 lg:border border-brand-accent/30 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-1000 bg-brand-950 lg:bg-transparent">
                    <div className="green-light-bar lg:block hidden" />
                    <div className="bg-white/5 px-6 lg:px-8 py-4 flex justify-between items-center border-b border-white/10 sticky top-0 z-20 backdrop-blur-md">
                        <div className="flex items-center gap-2 lg:gap-3 text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] text-red-500 italic">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            LIVE CONSOLE
                        </div>
                        <div className="flex items-center gap-4">
                            {settings.logoUrl ? (
                                <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 lg:w-10 lg:h-10 object-contain rounded-lg" />
                            ) : (
                                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-brand-accent/20 rounded-lg flex items-center justify-center">
                                    <Shirt size={16} className="text-brand-accent" />
                                </div>
                            )}
                            <h2 className="text-[10px] lg:text-xs font-black text-white uppercase tracking-widest hidden sm:block">{settings.name}</h2>
                        </div>
                        <button onClick={() => setActiveMatchId(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40"><X size={20}/></button>
                    </div>

                    <div className="p-6 lg:p-14 h-[calc(100vh-64px)] lg:h-auto overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-10 lg:gap-14 max-w-4xl mx-auto">
                            {/* Score & Timer Row */}
                            <div className="flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-20 border-b border-white/5 pb-8 lg:pb-12">
                                {/* Home Team */}
                                <div className="flex md:flex-col items-center gap-4 group w-full md:w-auto px-4 md:px-0">
                                    <div className="w-12 h-12 lg:w-20 lg:h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:border-brand-accent/50 transition-all shadow-2xl order-1 md:order-1">
                                        <Shirt size={24} className="text-brand-accent lg:hidden" />
                                        <Shirt size={40} className="text-brand-accent hidden lg:block" />
                                    </div>
                                    <h4 className="text-[10px] lg:text-xs font-black text-white uppercase italic tracking-widest order-2 md:order-2">{settings.name}</h4>
                                </div>

                                {/* Score/Time Unit */}
                                <div className="flex items-center gap-6 lg:gap-10 w-full justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="text-6xl lg:text-8xl font-black text-white italic leading-none tracking-tighter">{activeMatch.scoreFor || 0}</div>
                                        <button onClick={() => updateLiveMatch({ ...activeMatch, scoreFor: Math.max(0, (activeMatch.scoreFor || 0) - 1) })} className="text-white/10 hover:text-white transition-colors"><ChevronDown size={20} /></button>
                                    </div>

                                    <div className="bg-black/40 px-6 lg:px-8 py-4 lg:py-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center gap-3 min-w-[140px] lg:min-w-[180px]">
                                        <div className="text-3xl lg:text-4xl font-mono font-black text-brand-accent tabular-nums tracking-tighter">{formatMatchTime(matchTime)}</div>
                                        <button onClick={toggleTimer} className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all ${isTimerRunning ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-brand-accent text-brand-950 shadow-glow'}`}>
                                            {isTimerRunning ? 'PAUSE' : matchTime === 0 ? 'START' : 'RESUME'}
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center gap-2">
                                        <div className="text-6xl lg:text-8xl font-black text-white/40 italic leading-none tracking-tighter">{activeMatch.scoreAgainst || 0}</div>
                                        <button onClick={() => updateLiveMatch({ ...activeMatch, scoreAgainst: Math.max(0, (activeMatch.scoreAgainst || 0) - 1) })} className="text-white/10 hover:text-white transition-colors"><ChevronDown size={20} /></button>
                                    </div>
                                </div>

                                {/* Away Team */}
                                <div className="flex md:flex-col items-center gap-4 group w-full md:w-auto px-4 md:px-0 justify-end md:justify-center">
                                    <h4 className="text-[10px] lg:text-xs font-black text-white/40 uppercase italic tracking-widest order-1 md:order-2">{activeMatch.opponent}</h4>
                                    <div className="w-12 h-12 lg:w-20 lg:h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-all shadow-2xl order-2 md:order-1">
                                        <Shield size={24} className="text-white/10 lg:hidden" />
                                        <Shield size={40} className="text-white/10 hidden lg:block" />
                                    </div>
                                </div>
                            </div>

                            {/* Unified Action Row */}
                            <div className="flex flex-row flex-wrap lg:flex-nowrap items-center justify-center gap-3 lg:gap-4 px-2">
                                <button onClick={() => setShowGoalModal(true)} className="flex-1 flex items-center justify-center gap-2 bg-brand-accent/10 hover:bg-brand-accent hover:text-brand-950 text-brand-accent py-4 rounded-2xl border border-brand-accent/20 transition-all shadow-glow group min-w-[120px]">
                                    <PlusCircle size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest italic">GOAL</span>
                                </button>
                                <button onClick={() => setShowCardModal({type: 'yellow_card'})} className="flex-1 flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-500 py-4 rounded-2xl border border-amber-500/20 transition-all group min-w-[120px]">
                                    <div className="w-2.5 h-3.5 bg-amber-500 rounded-sm group-hover:bg-white" />
                                    <span className="text-[10px] font-black uppercase tracking-widest italic">YELLOW</span>
                                </button>
                                <button onClick={() => setShowCardModal({type: 'red_card'})} className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 py-4 rounded-2xl border border-red-500/20 transition-all group min-w-[120px]">
                                    <div className="w-2.5 h-3.5 bg-red-500 rounded-sm group-hover:bg-white" />
                                    <span className="text-[10px] font-black uppercase tracking-widest italic">RED</span>
                                </button>
                                <button onClick={() => setShowSubModal(true)} className="flex-1 flex items-center justify-center gap-2 bg-brand-primary/10 hover:bg-brand-primary hover:text-brand-950 text-brand-primary py-4 rounded-2xl border border-brand-primary/20 transition-all group min-w-[120px]">
                                    <RefreshCw size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest italic">SUB</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* MOTM & Feed Column */}
                                <div className="space-y-8">
                                    {/* MOTM Nomination */}
                                    <div className="glass-card p-6 lg:p-8 rounded-[2rem] border border-white/5 bg-black/40">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Trophy size={18} className="text-brand-accent" />
                                            <p className="text-[10px] font-black text-white uppercase tracking-[0.2rem] italic">MAN OF THE MATCH</p>
                                        </div>
                                        <select 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white text-xs font-bold appearance-none cursor-pointer focus:border-brand-accent/50 outline-none"
                                            value={activeMatch.playerOfTheMatchId || ''}
                                            onChange={(e) => updatePlayerPerformance(e.target.value, { isMOTM: true })}
                                        >
                                            <option value="">-- NOMINATE PLAYER --</option>
                                            {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                        </select>
                                        {activeMatch.playerOfTheMatchId && (
                                            <p className="mt-4 text-[9px] font-black text-brand-accent uppercase tracking-widest italic text-center">
                                                ★ {players.find(p => p.id === activeMatch.playerOfTheMatchId)?.fullName} NOMINATED
                                            </p>
                                        )}
                                    </div>

                                    {/* Timeline */}
                                    <div className="bg-black/40 rounded-[2rem] border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                                        <div className="px-6 py-4 bg-white/5 border-b border-white/5 text-[9px] font-black text-white/40 uppercase tracking-[0.3em] italic flex items-center gap-3">
                                            <Activity size={14} className="text-brand-accent" /> TIMELINE
                                        </div>
                                        <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar space-y-3">
                                            {activeMatch.events && activeMatch.events.length > 0 ? (
                                                activeMatch.events.sort((a,b) => b.minute - a.minute).map(event => (
                                                    <div key={event.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black italic ${
                                                                event.type === 'goal' ? 'bg-brand-accent text-brand-950 shadow-glow' : 
                                                                event.type === 'yellow_card' ? 'bg-amber-500 text-white' : 
                                                                event.type === 'red_card' ? 'bg-red-500 text-white' : 
                                                                'bg-brand-primary text-brand-950'
                                                            }`}>{event.minute}'</div>
                                                            <div>
                                                                <div className="text-[10px] font-black text-white uppercase italic tracking-tight">
                                                                    {players.find(p => p.id === event.playerId)?.fullName}
                                                                    <span className={`ml-2 ${
                                                                        event.type === 'goal' ? 'text-brand-accent' : 
                                                                        event.type === 'yellow_card' ? 'text-amber-500' : 
                                                                        event.type === 'red_card' ? 'text-red-500' : 
                                                                        'text-brand-primary'
                                                                    }`}>
                                                                        {event.type.split('_').join(' ')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="opacity-20">
                                                            {event.type === 'goal' && <Award size={14} />}
                                                            {event.type === 'substitution' && <RefreshCw size={14} />}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest italic text-center py-10">No events recorded</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side - Summary or Quick Stats if needed, for now just keeping it balanced */}
                                <div className="space-y-6">
                                    <div className="glass-card p-10 rounded-[3rem] border border-brand-accent/10 bg-brand-accent/5 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                                        <div className="w-20 h-20 bg-brand-accent/10 rounded-full flex items-center justify-center">
                                            <Check size={40} className="text-brand-accent" />
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">READY TO ARCHIVE?</h4>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest italic">All tactical data will be synced across the academy network.</p>
                                        </div>
                                        <button onClick={() => finalizeMatch(activeMatch)} className="w-full py-6 bg-brand-accent text-brand-950 rounded-2xl font-black uppercase tracking-[0.4em] text-xs shadow-glow hover:scale-[1.02] active:scale-95 transition-all italic border border-brand-accent/20">FINALIZE MATCH DATA</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Tabs */}
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="bg-white/5 p-2 rounded-[2.5rem] border border-white/10 flex w-fit shadow-2xl backdrop-blur-xl">
                        {['results', 'fixtures'].map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3 italic ${activeTab === tab ? 'bg-brand-accent text-brand-950 shadow-glow' : 'text-white/40 hover:text-white/60'}`}>
                                {tab === 'results' ? <History size={16} /> : <Calendar size={16} />}
                                {tab === 'results' ? 'MATCH RESULTS' : 'UPCOMING FIXTURES'}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 max-w-md space-y-2">
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-[0.3em] flex items-center gap-3">
                            {activeTab === 'results' ? <History className="text-brand-accent" size={24} /> : <Calendar className="text-brand-accent" size={24} />}
                            {activeTab === 'results' ? 'MATCH HISTORY' : 'FIXTURE PIPELINE'}
                        </h2>
                        <div className="h-[2px] w-32 bg-brand-accent/40 rounded-full" />
                    </div>
                </div>

                {/* List Container */}
                <div className="grid grid-cols-1 gap-6">
                    {activeTab === 'results' ? (
                        matches.length === 0 ? (
                            <div className="glass-card p-20 rounded-[3rem] border border-white/5 text-center flex flex-col items-center gap-6">
                                <Trophy size={60} className="text-white/5" />
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] italic">No strategic records found</p>
                            </div>
                        ) : (
                            matches.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                                <div 
                                    key={m.id} 
                                    onClick={() => setSelectedMatchDetails(m)}
                                    className="glass-card p-4 lg:p-6 rounded-2xl lg:rounded-[2rem] border border-white/5 hover:border-brand-accent/30 transition-all duration-300 group cursor-pointer flex flex-col lg:flex-row items-center justify-between gap-6"
                                >
                                    <div className="flex items-center gap-6 lg:gap-10 w-full lg:w-auto">
                                        <div className="flex flex-col items-center min-w-[70px] lg:min-w-[90px] border-r border-white/5 pr-6">
                                            <p className="text-[7px] font-black text-brand-accent uppercase tracking-widest italic mb-1">{m.date.split('-')[0]}</p>
                                            <div className="text-lg lg:text-xl font-black text-white italic uppercase tracking-tighter leading-none">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                        </div>
                                        
                                        <div className="flex-1 flex items-center gap-4 lg:gap-8">
                                            <div className="text-right">
                                                <h4 className="text-[9px] font-black text-white/60 uppercase tracking-tight truncate max-w-[100px] lg:max-w-none">{settings.name}</h4>
                                            </div>
                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-mono font-black italic shadow-2xl flex items-center gap-3 ${m.result === 'W' ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20' : m.result === 'L' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                                                <span>{m.scoreFor}</span>
                                                <span className="opacity-20">:</span>
                                                <span>{m.scoreAgainst}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-[9px] font-black text-white/30 uppercase tracking-tight truncate max-w-[100px] lg:max-w-none group-hover:text-white/60 transition-colors">{m.opponent}</h4>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                                        {m.highlightsUrl && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedVideo(getYouTubeEmbedUrl(m.highlightsUrl)); }} 
                                                className="h-10 px-4 flex items-center justify-center bg-white/5 text-brand-accent border border-white/10 rounded-xl hover:bg-brand-accent hover:text-brand-950 transition-all group/btn"
                                            >
                                                <Youtube size={16} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setActiveMatchId(m.id); }} 
                                            className="h-10 px-4 flex items-center justify-center bg-white/5 text-white/40 border border-white/5 rounded-xl hover:bg-brand-accent hover:text-brand-950 transition-all group/btn text-[8px] font-black uppercase tracking-widest italic"
                                        >
                                            <MonitorPlay size={16} className="mr-2" /> RE-OPEN
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteMatch(m.id); }}
                                            className="h-10 px-4 flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        scheduleEvents.sort((a,b) => a.date.localeCompare(b.date)).map(ev => (
                            <div key={ev.id} className="glass-card p-8 rounded-[2.5rem] border border-white/10 flex flex-col lg:flex-row items-center justify-between group relative overflow-hidden gap-8 transition-all hover:border-brand-accent/30">
                                <div className="flex items-center gap-10">
                                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex flex-col items-center justify-center border border-white/10 group-hover:border-brand-accent transition-all">
                                        <p className="text-[10px] font-black text-brand-accent uppercase italic leading-none mb-1">{new Date(ev.date).toLocaleDateString(undefined, { month: 'short' })}</p>
                                        <p className="text-3xl font-black text-white italic leading-none">{new Date(ev.date).getDate()}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-4 mb-3">
                                            <span className="px-3 py-1.5 bg-brand-accent text-brand-950 text-[9px] font-black uppercase tracking-widest rounded-lg italic">{getRelativeTime(ev.date)}</span>
                                            <div className="flex items-center gap-2 text-white/40 font-black text-[9px] uppercase tracking-widest italic"><Clock size={14} /> {ev.time}</div>
                                        </div>
                                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter group-hover:text-brand-accent transition-all">{ev.title}</h3>
                                        <div className="flex items-center gap-3 text-white/20 font-bold text-xs mt-2 italic"><MapPin size={14} /> {ev.location}</div>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    let opp = ev.title;
                                    if (opp.toLowerCase().includes(' vs ')) opp = opp.split(' vs ')[1];
                                    setNewMatch({ ...newMatch, scheduledEventId: ev.id, date: ev.date, opponent: (opp || '').trim(), isLive: true });
                                    setShowForm(true);
                                }} className="px-10 py-5 bg-white text-brand-950 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-glow hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-3 italic"><Zap size={18} fill="currentColor" /> START MATCH</button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Match Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-10 bg-brand-950/90 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-brand-900/40 rounded-[3.5rem] border border-white/10 shadow-3xl overflow-hidden relative my-auto">
                        <div className="green-light-bar" />
                        <div className="px-8 sm:px-14 py-8 sm:py-12 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">NEW_MATCH_DEPLOYMENT</h3>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] mt-2 italic">STRATEGIC PARAMETER SETUP</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white"><X size={24} /></button>
                        </div>

                        <div className="p-8 sm:p-14 space-y-12">
                            <div className="flex items-center justify-between p-6 rounded-[2rem] bg-black/40 border border-white/5">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest italic leading-none">LIVE TRACKING</p>
                                        <p className="text-[9px] font-bold text-white/30 uppercase mt-1">ENABLE REAL-TIME STATS UPDATES</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setNewMatch({...newMatch, isLive: !newMatch.isLive})}
                                    className={`w-16 h-8 rounded-full p-1.5 transition-all flex items-center ${newMatch.isLive ? 'bg-red-500' : 'bg-white/10'}`}
                                >
                                    <div className={`h-5 w-5 rounded-full bg-white transition-all transform ${newMatch.isLive ? 'translate-x-8' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">SCHEDULE SYNC</label>
                                    <select 
                                        className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all appearance-none"
                                        value={newMatch.scheduledEventId}
                                        onChange={handleScheduleSelect}
                                    >
                                        <option value="">-- MANUAL ENTRY --</option>
                                        {scheduleEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">MATCH DATE</label>
                                    <input 
                                        type="date" 
                                        value={newMatch.date} 
                                        onChange={e => setNewMatch({...newMatch, date: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-4">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">OPPONENT IDENTITY</label>
                                    <input 
                                        type="text" 
                                        placeholder="TARGET TEAM NAME..." 
                                        value={newMatch.opponent} 
                                        onChange={e => setNewMatch({...newMatch, opponent: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all tracking-widest placeholder:text-white/10"
                                    />
                                </div>
                            </div>

                            <section className="space-y-8">
                                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic flex items-center gap-3">
                                        <Shirt size={18} className="text-brand-accent" /> TACTICAL DEPLOYMENT (11)
                                    </h4>
                                    <span className={`text-[10px] font-black px-6 py-2 rounded-xl transition-all ${starters.size === 11 ? 'bg-brand-accent text-brand-950 shadow-glow' : 'bg-white/5 text-white/40'}`}>
                                        {starters.size} / 11 NOMINATED
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                                    {players.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => toggleStarter(p.id)}
                                            className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-center gap-4 group ${starters.has(p.id) ? 'bg-brand-accent/10 border-brand-accent' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${starters.has(p.id) ? 'bg-brand-accent border-brand-accent' : 'border-white/10 group-hover:border-white/30'}`}>
                                                {starters.has(p.id) && <Check size={12} className="text-brand-950" strokeWidth={4} />}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase italic tracking-tight truncate ${starters.has(p.id) ? 'text-brand-accent' : 'text-white/40 group-hover:text-white'}`}>
                                                {p.fullName}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                <button onClick={() => setShowForm(false)} className="px-10 py-6 text-white/40 font-black hover:text-white hover:bg-white/5 transition-all text-[10px] uppercase tracking-[0.3em] italic rounded-2xl">ABORT OPERATION</button>
                                <button 
                                    onClick={handleSaveMatch}
                                    className={`flex-1 py-6 font-black rounded-2xl transition-all flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.3em] italic ${newMatch.isLive ? 'bg-red-500 text-white shadow-2xl' : 'bg-brand-accent text-brand-950 shadow-glow'}`}
                                >
                                    <Save size={20} /> {newMatch.isLive ? 'COMMENCE LIVE TRACKING' : 'ARCHIVE MATCH DATA'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Goal Entry Modal */}
            {showGoalModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-brand-950/90 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-brand-900/40 rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden relative">
                        <div className="green-light-bar" />
                        <div className="px-10 py-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">RECORD_GOAL_EVENT</h3>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mt-2 italic">MATCH_TIME: {formatMatchTime(matchTime)}</p>
                            </div>
                            <button onClick={() => setShowGoalModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40"><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">SELECT_SCORER</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all appearance-none"
                                    value={selectedGoalScorer}
                                    onChange={e => setSelectedGoalScorer(e.target.value)}
                                >
                                    <option value="">-- SELECT PLAYER --</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic ml-1">SELECT_ASSISTANT (OPTIONAL)</label>
                                <select 
                                    className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-white font-black italic text-sm outline-none focus:border-brand-accent transition-all appearance-none"
                                    value={selectedAssistant}
                                    onChange={e => setSelectedAssistant(e.target.value)}
                                >
                                    <option value="">-- NO ASSIST --</option>
                                    {players.filter(p => p.id !== selectedGoalScorer).map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>

                            <button 
                                onClick={handleAddGoal}
                                disabled={!selectedGoalScorer}
                                className="w-full py-6 bg-brand-accent text-brand-950 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 italic disabled:opacity-30 disabled:hover:scale-100"
                            >
                                <Award size={20} /> CONFIRM GOAL DATA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Player Overlay */}
            {selectedVideo && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-8 bg-brand-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-6xl aspect-video bg-black rounded-[4rem] overflow-hidden shadow-[0_0_100px_rgba(0,200,255,0.2)] border border-white/10 relative">
                        <button onClick={() => setSelectedVideo(null)} className="absolute top-10 right-10 z-10 p-5 bg-brand-950/80 text-white rounded-[2rem] hover:bg-brand-accent hover:text-brand-950 transition-all shadow-2xl border border-white/10">
                            <X size={32}/>
                        </button>
                        <iframe src={selectedVideo} className="w-full h-full" title="Match Highlights" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                </div>
            )}
            {/* Card Modal */}
            {showCardModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-md">
                    <div className="glass-card w-full max-w-md p-8 rounded-[2.5rem] border border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">LOG {showCardModal.type === 'yellow_card' ? 'YELLOW' : 'RED'} CARD</h3>
                            <button onClick={() => setShowCardModal(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40"><X size={24}/></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 block italic">PLAYER CITED</label>
                                <select 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm font-bold appearance-none cursor-pointer focus:border-brand-accent/50 outline-none"
                                    value={selectedCardPlayer}
                                    onChange={(e) => setSelectedCardPlayer(e.target.value)}
                                >
                                    <option value="">SELECT PLAYER</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>
                            <button 
                                onClick={() => handleAddCard(showCardModal.type)}
                                disabled={!selectedCardPlayer}
                                className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all italic ${selectedCardPlayer ? (showCardModal.type === 'yellow_card' ? 'bg-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]') : 'bg-white/5 text-white/20 border border-white/5'}`}
                            >
                                CONFIRM DISCIPLINARY EVENT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Substitution Modal */}
            {showSubModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-brand-950/90 backdrop-blur-md">
                    <div className="glass-card w-full max-w-md p-8 rounded-[2.5rem] border border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">TACTICAL SUBSTITUTION</h3>
                            <button onClick={() => setShowSubModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40"><X size={24}/></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[9px] font-black text-red-400 uppercase tracking-[0.3em] mb-3 block italic">PLAYER OUT</label>
                                <select 
                                    className="w-full bg-white/5 border border-red-500/20 rounded-2xl px-6 py-4 text-white text-sm font-bold appearance-none focus:border-red-500/50 outline-none"
                                    value={selectedSubOut}
                                    onChange={(e) => setSelectedSubOut(e.target.value)}
                                >
                                    <option value="">SELECT PLAYER</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-center"><RefreshCw className="text-white/10" size={24} /></div>
                            <div>
                                <label className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3 block italic">PLAYER IN</label>
                                <select 
                                    className="w-full bg-white/5 border border-emerald-500/20 rounded-2xl px-6 py-4 text-white text-sm font-bold appearance-none focus:border-emerald-500/50 outline-none"
                                    value={selectedSubIn}
                                    onChange={(e) => setSelectedSubIn(e.target.value)}
                                >
                                    <option value="">SELECT PLAYER</option>
                                    {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                </select>
                            </div>
                            <button 
                                onClick={handleAddSub}
                                disabled={!selectedSubOut || !selectedSubIn}
                                className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all italic ${selectedSubOut && selectedSubIn ? 'bg-brand-primary text-brand-950 shadow-glow' : 'bg-white/5 text-white/20 border border-white/5'}`}
                            >
                                EXECUTE SUBSTITUTION
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Match Highlights Detail Modal */}
            {selectedMatchDetails && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 lg:p-10 bg-brand-950/95 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="w-full max-w-2xl bg-brand-900/60 rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden relative flex flex-col max-h-[90vh]">
                        <div className="green-light-bar" />
                        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">TACTICAL BREAKDOWN</h3>
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mt-1 italic">
                                        {new Date(selectedMatchDetails.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMatchDetails(null)} className="p-3 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white"><X size={20} /></button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                            {/* Score Overview */}
                            <div className="flex items-center justify-center gap-12 py-6 border-b border-white/5">
                                <div className="text-center">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2 italic">HOME</p>
                                    <h4 className="text-lg font-black text-white italic uppercase tracking-tight">{settings.name}</h4>
                                </div>
                                <div className="text-5xl font-black text-brand-accent italic flex items-center gap-4">
                                    <span>{selectedMatchDetails.scoreFor}</span>
                                    <span className="text-white/10 text-3xl">:</span>
                                    <span className="text-white/40">{selectedMatchDetails.scoreAgainst}</span>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2 italic">AWAY</p>
                                    <h4 className="text-lg font-black text-white/40 italic uppercase tracking-tight">{selectedMatchDetails.opponent}</h4>
                                </div>
                            </div>

                            {/* Timeline Feed */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Zap size={14} className="text-brand-accent" />
                                    <p className="text-[10px] font-black text-white uppercase tracking-[0.3rem] italic">MATCH HIGHLIGHTS</p>
                                </div>
                                <div className="space-y-3">
                                    {selectedMatchDetails.events && selectedMatchDetails.events.length > 0 ? (
                                        selectedMatchDetails.events.sort((a,b) => a.minute - b.minute).map(event => (
                                            <div key={event.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black italic shrink-0 ${
                                                    event.type === 'goal' ? 'bg-brand-accent text-brand-950 shadow-glow' : 
                                                    event.type === 'yellow_card' ? 'bg-amber-500 text-white' : 
                                                    event.type === 'red_card' ? 'bg-red-500 text-white' : 
                                                    'bg-brand-primary text-brand-950'
                                                }`}>{event.minute}'</div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[10px] font-black text-white uppercase italic tracking-tight">
                                                            {players.find(p => p.id === event.playerId)?.fullName}
                                                            <span className={`ml-2 ${
                                                                event.type === 'goal' ? 'text-brand-accent' : 
                                                                event.type === 'yellow_card' ? 'text-amber-500' : 
                                                                event.type === 'red_card' ? 'text-red-500' : 
                                                                'text-brand-primary'
                                                            }`}>
                                                                {event.type.split('_').join(' ')}
                                                            </span>
                                                        </p>
                                                        {event.type === 'goal' && <Award size={14} className="text-brand-accent" />}
                                                    </div>
                                                    {event.type === 'substitution' && (
                                                        <div className="flex items-center gap-2 mt-1 text-[8px] font-bold text-white/30 uppercase italic">
                                                            <span className="text-red-400/60">OUT: {players.find(p => p.id === event.subOutId)?.fullName}</span>
                                                            <ArrowRight size={8} />
                                                            <span className="text-emerald-400/60">IN: {players.find(p => p.id === event.subInId)?.fullName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest italic text-center py-10 border border-white/5 rounded-2xl">No events archived for this match</p>
                                    )}
                                </div>
                            </div>

                            {/* MOTM if available */}
                            {selectedMatchDetails.playerOfTheMatchId && (
                                <div className="bg-brand-accent/5 p-6 rounded-[2rem] border border-brand-accent/20 flex flex-col items-center gap-4">
                                    <Trophy size={24} className="text-brand-accent" />
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1 italic">MAN OF THE MATCH</p>
                                        <h4 className="text-xl font-black text-brand-accent italic uppercase tracking-tighter">
                                            {players.find(p => p.id === selectedMatchDetails.playerOfTheMatchId)?.fullName}
                                        </h4>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-white/5 bg-black/20">
                            <button 
                                onClick={() => setSelectedMatchDetails(null)}
                                className="w-full py-5 bg-white/5 text-white/60 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] border border-white/10 hover:bg-white/10 transition-all italic"
                            >
                                CLOSE BREAKDOWN
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
