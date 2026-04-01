
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Player, Match, ScheduleEvent } from '../types';
import { PlusCircle, Calendar, Trophy, ChevronDown, Save, X, Youtube, PlayCircle, Filter, MonitorPlay, FileJson, UploadCloud, AlertCircle, Check, Users, Shirt } from 'lucide-react';

export const MatchManager: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    
    // JSON Import State
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [importStatus, setImportStatus] = useState<{msg: string, type: 'success' | 'error' | 'neutral'}>({ msg: '', type: 'neutral' });

    // New Match Form State
    const [newMatch, setNewMatch] = useState({
        date: new Date().toISOString().split('T')[0],
        opponent: '',
        result: 'W' as 'W' | 'L' | 'D',
        scoreFor: 0,
        scoreAgainst: 0,
        highlightsUrl: '',
        scheduledEventId: ''
    });
    
    // Starters Logic: Set of player IDs
    const [starters, setStarters] = useState<Set<string>>(new Set());
    
    const [playerStats, setPlayerStats] = useState<Record<string, { goals: number, assists: number, rating: number }>>({});

    const loadData = () => {
        setMatches(StorageService.getMatches().sort((a,b) => b.date.localeCompare(a.date)));
        const allPlayers = StorageService.getPlayers();
        setPlayers(allPlayers);
        setScheduleEvents(StorageService.getSchedule().filter(e => e.type === 'match'));
        
        // Init stats state
        if (Object.keys(playerStats).length === 0) {
             const initialStats: any = {};
             allPlayers.forEach(p => {
                 initialStats[p.id] = { goals: 0, assists: 0, rating: 6 }; // Default rating 6
             });
             setPlayerStats(initialStats);
        }
    };

    useEffect(() => {
        loadData();
        window.addEventListener('icarus_data_update', loadData);
        return () => window.removeEventListener('icarus_data_update', loadData);
    }, []);

    const handleScheduleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const eventId = e.target.value;
        if (eventId) {
            const event = scheduleEvents.find(ev => ev.id === eventId);
            if (event) {
                // Determine opponent from title if possible (e.g., "Match vs Opponent")
                let opp = event.title;
                if (opp.toLowerCase().includes(' vs ')) {
                    opp = opp.split(' vs ')[1];
                } else if (opp.toLowerCase().includes('match against')) {
                    opp = opp.split('match against')[1];
                }
                
                setNewMatch({
                    ...newMatch,
                    scheduledEventId: eventId,
                    date: event.date,
                    opponent: opp.trim()
                });
            }
        } else {
            setNewMatch({
                ...newMatch,
                scheduledEventId: '',
                date: new Date().toISOString().split('T')[0],
                opponent: ''
            });
        }
    };

    const toggleStarter = (playerId: string) => {
        setStarters(prev => {
            const next = new Set(prev);
            if (next.has(playerId)) {
                next.delete(playerId);
            } else {
                next.add(playerId);
            }
            return next;
        });
    };

    const handleSaveMatch = () => {
        const statsArray = players.map(p => ({
            playerId: p.id,
            goals: playerStats[p.id]?.goals || 0,
            assists: playerStats[p.id]?.assists || 0,
            rating: playerStats[p.id]?.rating || 6,
            minutesPlayed: 0,
            isStarter: starters.has(p.id)
        }));

        StorageService.addMatch({
            ...newMatch,
            playerStats: statsArray
        });

        setShowForm(false);
        // Reset form
        setNewMatch({ date: new Date().toISOString().split('T')[0], opponent: '', result: 'W', scoreFor: 0, scoreAgainst: 0, highlightsUrl: '', scheduledEventId: '' });
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

    const processJsonStats = () => {
        try {
            const data = JSON.parse(jsonInput);
            if (!Array.isArray(data)) throw new Error("JSON must be an array of player objects.");

            let matchedCount = 0;
            const updatedStats = { ...playerStats };

            data.forEach((item: any) => {
                const player = players.find(p => p.fullName.toLowerCase().trim() === item.name?.toLowerCase().trim());
                if (player) {
                    updatedStats[player.id] = {
                        goals: typeof item.goals === 'number' ? item.goals : (updatedStats[player.id]?.goals || 0),
                        assists: typeof item.assists === 'number' ? item.assists : (updatedStats[player.id]?.assists || 0),
                        rating: typeof item.rating === 'number' ? item.rating : (updatedStats[player.id]?.rating || 6)
                    };
                    matchedCount++;
                }
            });

            setPlayerStats(updatedStats);
            setImportStatus({ msg: `Success! Matched ${matchedCount} players from JSON.`, type: 'success' });
            setTimeout(() => {
                setShowJsonImport(false);
                setImportStatus({ msg: '', type: 'neutral' });
            }, 2000);

        } catch (e) {
            setImportStatus({ msg: "Invalid JSON format. Check syntax.", type: 'error' });
        }
    };

    const getYouTubeEmbedUrl = (url: string | undefined) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0` : null;
    };

    const formEmbedPreview = getYouTubeEmbedUrl(newMatch.highlightsUrl);

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div>
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Orbitron' }}>
                            MATCH <span className="text-icarus-500">CENTRE</span>
                        </h1>
                        <p className="text-gray-500 text-sm font-medium">Results, statistics and match reports</p>
                    </div>
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className="bg-icarus-900 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-black shadow-lg shadow-icarus-900/20 active:scale-95 transition-all font-bold text-sm uppercase tracking-wider"
                    >
                        <PlusCircle size={18} />
                        <span>Log Result</span>
                    </button>
                </div>

                {/* Filters (Visual Only) */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                        <Filter size={14} /> Season: 2024/25 <ChevronDown size={14} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                        Competition: All <ChevronDown size={14} />
                    </button>
                </div>
            </div>

            {/* Match List */}
            <div className="space-y-4">
                {matches.map(m => (
                    <div key={m.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col md:flex-row relative">
                        {/* Result Stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 md:w-2 ${m.result === 'W' ? 'bg-green-500' : m.result === 'L' ? 'bg-red-500' : 'bg-gray-400'}`} />

                        {/* Content Container */}
                        <div className="flex-1 p-5 md:pl-8 flex flex-col md:flex-row items-center gap-6">
                            
                            {/* Date & Meta */}
                            <div className="w-full md:w-32 flex flex-row md:flex-col justify-between md:justify-center items-center md:items-start">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mb-1 ${m.result === 'W' ? 'bg-green-100 text-green-700' : m.result === 'L' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {m.result === 'W' ? 'VICTORY' : m.result === 'L' ? 'DEFEAT' : 'DRAW'}
                                </span>
                                <div className="text-gray-900 font-bold text-sm">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                <div className="text-gray-400 text-xs font-medium hidden md:block">League Match</div>
                            </div>

                            {/* Scoreline */}
                            <div className="flex-1 flex items-center justify-center gap-6 w-full py-4 md:py-0 border-y md:border-y-0 border-gray-50 bg-gray-50/50 md:bg-transparent rounded-xl md:rounded-none">
                                <div className="text-right flex-1">
                                    <h3 className="font-black text-gray-800 text-lg md:text-xl uppercase tracking-tight">Icarus FS</h3>
                                </div>
                                <div className="px-4 py-2 bg-gray-900 text-white rounded-lg font-mono font-bold text-xl md:text-2xl shadow-lg">
                                    {m.scoreFor} - {m.scoreAgainst}
                                </div>
                                <div className="text-left flex-1">
                                    <h3 className="font-bold text-gray-500 text-lg md:text-xl uppercase tracking-tight">{m.opponent}</h3>
                                </div>
                            </div>

                            {/* Stats & Actions */}
                            <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-6 pl-0 md:pl-6 md:border-l border-gray-100">
                                <div className="flex gap-4">
                                    <div className="text-center">
                                        <div className="text-xs font-bold text-gray-400 uppercase">Goals</div>
                                        <div className="text-lg font-black text-gray-800 leading-none">{m.playerStats.reduce((sum, s) => sum + s.goals, 0)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-bold text-gray-400 uppercase">Avg Rtg</div>
                                        <div className="text-lg font-black text-gray-800 leading-none">{(m.playerStats.reduce((sum, s) => sum + s.rating, 0) / (m.playerStats.length || 1)).toFixed(1)}</div>
                                    </div>
                                </div>

                                {m.highlightsUrl ? (
                                    <button 
                                        onClick={() => setSelectedVideo(getYouTubeEmbedUrl(m.highlightsUrl))}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                                    >
                                        <PlayCircle size={16} /> <span className="hidden lg:inline">Highlights</span>
                                    </button>
                                ) : (
                                    <div className="px-4 py-2 text-gray-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                                        <MonitorPlay size={16} /> <span className="hidden lg:inline">No Video</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                
                {matches.length === 0 && (
                     <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
                         <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trophy className="w-8 h-8 text-gray-300" />
                         </div>
                         <h3 className="text-xl font-bold text-gray-800">No Matches Recorded</h3>
                         <p className="text-gray-400 mt-2 max-w-sm mx-auto">Start logging your season results to see statistics and performance data here.</p>
                     </div>
                )}
            </div>

            {/* Video Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl relative">
                        <button 
                            onClick={() => setSelectedVideo(null)} 
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-white hover:text-black transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="aspect-video w-full">
                             <iframe 
                                src={selectedVideo} 
                                className="w-full h-full" 
                                title="Highlights"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen 
                             />
                        </div>
                    </div>
                </div>
            )}

            {/* Match Logging Form (Modal) */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        {/* Form Header */}
                        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-xl text-gray-800">New Match Record</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Season 2024/25</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-8 space-y-8 flex-1 custom-scrollbar">
                            {/* Match Details Section */}
                            <section>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Calendar size={14} /> Fixture Details
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-12 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    
                                    {/* Link to Schedule */}
                                    <div className="col-span-2 md:col-span-12">
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Link to Scheduled Match (Optional)</label>
                                        <select 
                                            value={newMatch.scheduledEventId} 
                                            onChange={handleScheduleSelect} 
                                            className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-icarus-500 outline-none font-medium text-sm bg-white"
                                        >
                                            <option value="">-- Manual Entry --</option>
                                            {scheduleEvents.map(ev => (
                                                <option key={ev.id} value={ev.id}>
                                                    {ev.title} ({new Date(ev.date).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-2 md:col-span-3">
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Date</label>
                                        <input type="date" value={newMatch.date} onChange={e => setNewMatch({...newMatch, date: e.target.value})} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-icarus-500 outline-none font-medium text-sm" />
                                    </div>
                                    <div className="col-span-2 md:col-span-5">
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Opponent</label>
                                        <input type="text" placeholder="e.g. Titans FC" value={newMatch.opponent} onChange={e => setNewMatch({...newMatch, opponent: e.target.value})} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-icarus-500 outline-none font-medium text-sm" />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">For</label>
                                        <input type="number" value={newMatch.scoreFor} onChange={e => setNewMatch({...newMatch, scoreFor: parseInt(e.target.value)})} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-icarus-500 outline-none font-black text-center text-lg" />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Against</label>
                                        <input type="number" value={newMatch.scoreAgainst} onChange={e => setNewMatch({...newMatch, scoreAgainst: parseInt(e.target.value)})} className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-icarus-500 outline-none font-black text-center text-lg" />
                                    </div>
                                    
                                    <div className="col-span-2 md:col-span-12 pt-2 border-t border-gray-200 mt-2">
                                        <label className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                                            <Youtube size={14} className="text-red-500" /> YouTube Highlights URL
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="https://youtu.be/..." 
                                            value={newMatch.highlightsUrl} 
                                            onChange={e => setNewMatch({...newMatch, highlightsUrl: e.target.value})} 
                                            className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" 
                                        />
                                        {formEmbedPreview && (
                                            <div className="mt-3 rounded-lg overflow-hidden aspect-video bg-black w-64 shadow-md">
                                                <iframe src={formEmbedPreview} className="w-full h-full" title="Preview" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Starting Lineup Selection Section */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Shirt size={14} /> Starting Lineup Selection
                                    </h4>
                                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${starters.size === 11 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {starters.size} / 11 Selected
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 max-h-48 overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {players.map(p => (
                                            <div 
                                                key={p.id}
                                                onClick={() => toggleStarter(p.id)}
                                                className={`
                                                    cursor-pointer p-2 rounded-lg border flex items-center gap-2 transition-all text-xs font-bold
                                                    ${starters.has(p.id) 
                                                        ? 'bg-green-50 border-green-300 text-green-800 shadow-sm' 
                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                                    }
                                                `}
                                            >
                                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${starters.has(p.id) ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300'}`}>
                                                    {starters.has(p.id) && <Check size={8} className="text-white" strokeWidth={4} />}
                                                </div>
                                                <span className="truncate">{p.fullName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Player Stats Section */}
                            <section>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Trophy size={14} /> Player Ratings & Stats
                                    </h4>
                                    
                                    {/* JSON Import Toggle */}
                                    <button 
                                        onClick={() => setShowJsonImport(!showJsonImport)}
                                        className="text-xs font-bold text-icarus-600 bg-icarus-50 px-3 py-1.5 rounded-lg hover:bg-icarus-100 transition-colors flex items-center gap-2"
                                    >
                                        <FileJson size={14} />
                                        Import from AI Analysis
                                    </button>
                                </div>

                                {/* JSON Import Area */}
                                {showJsonImport && (
                                    <div className="mb-6 p-4 bg-gray-50 border-2 border-dashed border-icarus-200 rounded-xl animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Paste JSON Data</label>
                                            <button onClick={() => setShowJsonImport(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                                        </div>
                                        <textarea 
                                            className="w-full h-32 p-3 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-icarus-500 outline-none bg-white"
                                            placeholder='[ { "name": "Player Name", "goals": 1, "assists": 0, "rating": 8.5 }, ... ]'
                                            value={jsonInput}
                                            onChange={(e) => setJsonInput(e.target.value)}
                                        />
                                        <div className="flex justify-between items-center mt-3">
                                            <span className={`text-xs font-bold ${importStatus.type === 'success' ? 'text-green-600' : importStatus.type === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                                                {importStatus.msg}
                                            </span>
                                            <button 
                                                onClick={processJsonStats}
                                                className="bg-icarus-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black flex items-center gap-2"
                                            >
                                                <UploadCloud size={14} /> Auto-Fill Stats
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {players.map(p => {
                                        const isStarting = starters.has(p.id);
                                        return (
                                            <div key={p.id} className={`bg-white p-3 rounded-xl border flex items-center justify-between hover:border-icarus-500 transition-colors shadow-sm ${isStarting ? 'border-green-200 bg-green-50/20' : 'border-gray-200'}`}>
                                                <div className="flex items-center gap-3 w-1/3">
                                                    <div className="relative">
                                                        <img src={p.photoUrl} className="w-8 h-8 rounded-full bg-gray-100 object-cover" />
                                                        {isStarting && (
                                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" title="Starter" />
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-sm text-gray-900 truncate">{p.fullName}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex flex-col items-center">
                                                        <label className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">G</label>
                                                        <input type="number" min="0" className="w-10 p-1 text-center text-sm font-bold border rounded bg-gray-50" value={playerStats[p.id]?.goals} onChange={(e) => updateStat(p.id, 'goals', parseInt(e.target.value))} />
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <label className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">A</label>
                                                        <input type="number" min="0" className="w-10 p-1 text-center text-sm font-bold border rounded bg-gray-50" value={playerStats[p.id]?.assists} onChange={(e) => updateStat(p.id, 'assists', parseInt(e.target.value))} />
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <label className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Rtg</label>
                                                        <input type="number" min="1" max="10" step="0.1" className="w-12 p-1 text-center text-sm font-bold border border-icarus-200 rounded bg-icarus-50 text-icarus-700" value={playerStats[p.id]?.rating} onChange={(e) => updateStat(p.id, 'rating', parseFloat(e.target.value))} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
                            <button onClick={() => setShowForm(false)} className="px-6 py-3 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-colors text-sm">Cancel</button>
                            <button onClick={handleSaveMatch} className="px-8 py-3 bg-icarus-900 text-white font-bold rounded-xl shadow-lg hover:bg-black flex items-center justify-center gap-2 transform active:scale-95 transition-all text-sm uppercase tracking-wider">
                                <Save size={16} /> Save Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
