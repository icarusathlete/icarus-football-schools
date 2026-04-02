
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService } from '../services/storageService';
import { Player, PlayerEvaluation } from '../types';
import { Search, Save, X, Trash2, Shield, Activity, Target, Zap, Ruler, Weight, Timer, Plus, ChevronRight, Play, Square, RefreshCcw, SaveAll, Loader2 } from 'lucide-react';

// --- SUB-COMPONENTS FOR REAL-TIME TOOLS ---

// 1. Stopwatch Component for Timed Drills
const StopwatchTool: React.FC<{ 
    label: string; 
    value: number; 
    onChange: (val: number) => void;
}> = ({ label, value, onChange }) => {
    const [time, setTime] = useState(0); // in ms
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<any>(null);

    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => {
        if (isRunning) {
            clearInterval(intervalRef.current);
        } else {
            const startTime = Date.now() - time;
            intervalRef.current = setInterval(() => {
                setTime(Date.now() - startTime);
            }, 10);
        }
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        clearInterval(intervalRef.current);
        setIsRunning(false);
        setTime(0);
    };

    const applyTime = () => {
        const seconds = parseFloat((time / 1000).toFixed(1));
        onChange(seconds);
    };

    // Clean up
    useEffect(() => {
        return () => clearInterval(intervalRef.current);
    }, []);

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
             <div className="flex justify-between items-center">
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</label>
                 <span className="text-xs font-mono text-gray-400">Current: {value}s</span>
             </div>
             
             <div className="flex items-center gap-4 bg-white rounded-lg p-2 border border-gray-100 shadow-inner justify-between">
                 <div className="font-mono text-2xl font-black text-gray-800 tracking-wider w-24 text-center">
                     {formatTime(time)}<span className="text-xs text-gray-400 ml-1">s</span>
                 </div>
                 <div className="flex gap-1">
                     <button 
                        onClick={toggleTimer}
                        type="button"
                        className={`p-2 rounded-lg text-white transition-all ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                     >
                         {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                     </button>
                     <button 
                        onClick={resetTimer}
                        type="button"
                        className="p-2 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all"
                     >
                         <RefreshCcw size={16} />
                     </button>
                 </div>
             </div>
             <button 
                type="button"
                onClick={applyTime}
                className="w-full py-2 bg-brand-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-black transition-colors"
             >
                 Save Time
             </button>
        </div>
    );
};

// 2. Metric Tracker (20 point progress bar) for Counting Drills
const MetricTracker: React.FC<{
    label: string;
    value: number; // 0-100
    onChange: (val: number) => void;
    colorClass: string;
}> = ({ label, value, onChange, colorClass }) => {
    // Convert 0-100 scale to 0-20 scale for the UI
    const count = Math.round((value / 100) * 20);

    const handleClick = (index: number) => {
        // Index is 0-19. Clicking index 0 means 1 success.
        // If clicking the current level, toggle it off (reduce by 1)
        // Otherwise set to clicked level
        const newCount = index + 1 === count ? index : index + 1;
        
        // Convert back to 0-100 scale
        const newValue = Math.round((newCount / 20) * 100);
        onChange(newValue);
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</label>
                <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-gray-400">{count}/20</span>
                     <span className={`text-sm font-black ${colorClass.replace('bg-', 'text-')}`}>{value}</span>
                </div>
            </div>
            
            <div className="flex gap-1 h-8 select-none">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i}
                        onClick={() => handleClick(i)}
                        className={`
                            flex-1 rounded-sm cursor-pointer transition-all duration-200 hover:opacity-80
                            ${i < count ? colorClass : 'bg-gray-100 hover:bg-gray-200'}
                            ${i < count ? 'shadow-[0_0_8px_rgba(0,0,0,0.1)]' : ''}
                        `}
                    />
                ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-300 uppercase font-bold px-1">
                <span>0</span>
                <span>10</span>
                <span>20</span>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const EvaluationManager: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);

  // Fallback image constant
  const FALLBACK_IMAGE = "https://cdn-icons-png.flaticon.com/512/166/166344.png";

  // Form State
  const defaultEval: PlayerEvaluation = {
    level: 30,
    overallRating: 75,
    height: 140,
    weight: 35,
    metrics: {
      passing: 60,
      juggling: 60,
      shooting: 60,
      beepTest: 60,
      weakFoot: 60,
      longPass: 60,
    },
    timeTrials: {
      dribbling: 25.0,
      speed: 20.0,
      agility: 19.0,
    },
    developmentAreas: ['Dribbling', 'Passing'],
    coachName: 'Coach Admin',
    evaluationDate: new Date().toISOString().split('T')[0],
  };

  const [form, setForm] = useState<PlayerEvaluation>(defaultEval);

  const loadData = () => {
    setPlayers(StorageService.getPlayers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('academy_data_update', loadData);
    return () => window.removeEventListener('academy_data_update', loadData);
  }, []);

  // --- Draft Logic ---
  // Auto-save draft when form changes
  useEffect(() => {
    if (isEditing && selectedPlayerId) {
        const timeoutId = setTimeout(() => {
            StorageService.saveDraft(selectedPlayerId, form);
            setDraftSaved(true);
            setTimeout(() => setDraftSaved(false), 2000);
        }, 1000); // Debounce save by 1s
        
        return () => clearTimeout(timeoutId);
    }
  }, [form, isEditing, selectedPlayerId]);

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayerId(player.id);
    
    // Check for existing draft
    const draft = StorageService.getDraft(player.id);
    
    if (draft) {
        setForm(draft);
    } else {
        setForm(player.evaluation || { ...defaultEval, coachName: 'Coach Admin' });
    }
    
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedPlayerId) return;
    StorageService.saveEvaluation(selectedPlayerId, form);
    setIsEditing(false);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.developmentAreas.includes(tagInput.trim())) {
        setForm(prev => ({ ...prev, developmentAreas: [...prev.developmentAreas, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({ ...prev, developmentAreas: prev.developmentAreas.filter(tag => tag !== tagToRemove) }));
  };

  const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
  };

  const filteredPlayers = players.filter(p => 
    p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.memberId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPlayerName = players.find(p => p.id === selectedPlayerId)?.fullName;

  return (
    <div className="space-y-6">
      {!isEditing && (
        <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Scout Report Manager</h2>
                <p className="text-gray-500 text-sm">Create evaluations and generate scout cards</p>
                </div>
                <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search roster..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlayers.map(p => {
                    const hasDraft = StorageService.getDraft(p.id);
                    return (
                        <div 
                        key={p.id} 
                        onClick={() => handleSelectPlayer(p)}
                        className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-brand-500 cursor-pointer transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 flex items-center gap-4 group relative overflow-hidden"
                        >
                        {hasDraft && <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-bl-lg shadow-sm" title="Draft Saved"></div>}
                        
                        <img 
                            src={p.photoUrl || FALLBACK_IMAGE} 
                            onError={(e) => {e.currentTarget.src = FALLBACK_IMAGE}}
                            className="w-14 h-14 rounded-full bg-gray-100 border object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate group-hover:text-brand-600 transition-colors">{p.fullName}</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{p.memberId}</p>
                                {hasDraft && <span className="text-[8px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full uppercase">Draft</span>}
                            </div>
                            {p.evaluation ? (
                            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block border border-green-100">Report Ready</span>
                            ) : (
                            <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block border border-gray-100">Pending</span>
                            )}
                        </div>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-500" />
                        </div>
                    );
                })}
                {filteredPlayers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400">
                        No players match your search.
                    </div>
                )}
            </div>
        </>
      )}

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            {selectedPlayerName}
                            <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider">Evaluation</span>
                            {draftSaved && (
                                <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium animate-in fade-in slide-in-from-left-2">
                                    <SaveAll size={10} /> Saved to draft
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-4">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overall Score</span>
                            <span className={`text-2xl font-black ${getScoreColor(form.overallRating)}`}>{form.overallRating}</span>
                        </div>
                        <div className="relative w-16 h-16 flex items-center justify-center">
                             {/* Circular Progress Placeholder - CSS Conic Gradient */}
                             <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                             <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent border-l-transparent -rotate-45"></div>
                             <Shield size={24} className="text-gray-800" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        
                        {/* LEFT COLUMN: Physical & Metrics */}
                        <div className="lg:col-span-5 space-y-8">
                            {/* Anthropometry */}
                            <section>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Activity size={16} className="text-brand-500" /> Anthropometry
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600 ml-1">Height</label>
                                        <div className="relative group">
                                            <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-brand-500 transition-colors" />
                                            <input 
                                                type="number" 
                                                className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                                value={form.height}
                                                onChange={e => setForm({...form, height: parseInt(e.target.value)})}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">cm</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600 ml-1">Weight</label>
                                        <div className="relative group">
                                            <Weight className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-brand-500 transition-colors" />
                                            <input 
                                                type="number" 
                                                className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                                value={form.weight}
                                                onChange={e => setForm({...form, weight: parseInt(e.target.value)})}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">kg</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Performance Tests - NOW WITH STOPWATCH */}
                            <section>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Zap size={16} className="text-yellow-500" /> Time Trials
                                </h4>
                                <div className="space-y-4">
                                    <StopwatchTool 
                                        label="100m Sprint" 
                                        value={form.timeTrials.speed} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, speed: val}})} 
                                    />
                                    <StopwatchTool 
                                        label="Agility Shuttle" 
                                        value={form.timeTrials.agility} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, agility: val}})} 
                                    />
                                    <StopwatchTool 
                                        label="Dribbling Course" 
                                        value={form.timeTrials.dribbling} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, dribbling: val}})} 
                                    />
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Technical & Development */}
                        <div className="lg:col-span-7 space-y-8">
                            {/* Technical Assessment - NOW WITH 20pt TRACKER */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Target size={16} className="text-blue-500" /> Technical Drills (20 Attempts)
                                    </h4>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Score / 100</span>
                                </div>
                                
                                <div className="space-y-6 bg-white rounded-2xl p-2">
                                    <MetricTracker 
                                        label="Passing Accuracy" 
                                        value={form.metrics.passing} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, passing: val}})} 
                                        colorClass="bg-green-500"
                                    />
                                    <MetricTracker 
                                        label="Shooting / Finishing" 
                                        value={form.metrics.shooting} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, shooting: val}})} 
                                        colorClass="bg-blue-500"
                                    />
                                    <MetricTracker 
                                        label="Ball Control / Juggling" 
                                        value={form.metrics.juggling} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, juggling: val}})} 
                                        colorClass="bg-purple-500"
                                    />
                                    <MetricTracker 
                                        label="Weak Foot Usage" 
                                        value={form.metrics.weakFoot} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, weakFoot: val}})} 
                                        colorClass="bg-orange-500"
                                    />
                                    <MetricTracker 
                                        label="Long Pass" 
                                        value={form.metrics.longPass} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, longPass: val}})} 
                                        colorClass="bg-cyan-500"
                                    />
                                    
                                    {/* Manual Beep Test Entry (as it's not a 20 rep drill usually) */}
                                    <div className="pt-4 border-t border-gray-100">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 block">Stamina / Beep Test Level (Normalized 0-100)</label>
                                        <input 
                                            type="range" 
                                            min="0" max="99"
                                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            value={form.metrics.beepTest}
                                            onChange={e => setForm({...form, metrics: {...form.metrics, beepTest: parseInt(e.target.value)}})}
                                        />
                                        <div className="flex justify-between text-xs text-gray-400 font-bold mt-1">
                                            <span>Low</span>
                                            <span className="text-gray-900 text-lg">{form.metrics.beepTest}</span>
                                            <span>Elite</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="h-px bg-gray-100 my-6" />

                            {/* Development Areas */}
                            <section>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Activity size={16} className="text-purple-500" /> Development Focus
                                </h4>
                                
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input 
                                            type="text" 
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all placeholder:text-gray-400"
                                            placeholder="Type an area to improve and press Enter..."
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                        />
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                                        {form.developmentAreas.map((area, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-bold animate-in zoom-in duration-200">
                                                {area}
                                                <button onClick={() => removeTag(area)} className="hover:text-red-900 transition-colors">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        {form.developmentAreas.length === 0 && (
                                            <span className="text-xs text-gray-400 italic py-1.5">No development areas tagged yet.</span>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="px-8 py-5 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex gap-6 w-full md:w-auto">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Evaluator</label>
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b border-gray-300 py-1 text-sm font-bold text-gray-700 focus:border-gray-900 outline-none" 
                                value={form.coachName} 
                                onChange={e => setForm({...form, coachName: e.target.value})} 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</label>
                            <input 
                                type="date" 
                                className="w-full bg-transparent border-b border-gray-300 py-1 text-sm font-bold text-gray-700 focus:border-gray-900 outline-none" 
                                value={form.evaluationDate} 
                                onChange={e => setForm({...form, evaluationDate: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => setIsEditing(false)} 
                            className="flex-1 md:flex-none px-6 py-3 text-gray-500 font-bold hover:bg-gray-200 hover:text-gray-700 rounded-xl transition-colors text-sm"
                        >
                            Save Draft & Close
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="flex-1 md:flex-none px-8 py-3 bg-brand-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <Save size={16} />
                            Submit Evaluation
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
