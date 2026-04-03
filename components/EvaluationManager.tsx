
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
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-6 flex flex-col gap-4 shadow-sm">
             <div className="flex justify-between items-center">
                 <label className="text-[10px] font-black text-brand-300 uppercase tracking-[0.2em]">{label}</label>
                 <span className="text-[10px] font-black text-brand-500 bg-brand-500/10 px-2 py-1 rounded-md">Current: {value}s</span>
             </div>
             
             <div className="flex items-center gap-6 bg-brand-950 rounded-2xl p-4 shadow-2xl justify-between border border-white/5">
                 <div className="font-mono text-3xl font-black text-white tracking-tighter w-32 text-center italic">
                     {formatTime(time)}<span className="text-xs text-brand-500 ml-1">s</span>
                 </div>
                 <div className="flex gap-2">
                     <button 
                        onClick={toggleTimer}
                        type="button"
                        className={`w-12 h-12 rounded-xl text-white transition-all flex items-center justify-center ${isRunning ? 'bg-red-500 shadow-lg shadow-red-500/20' : 'bg-brand-500 shadow-lg shadow-brand-500/20'}`}
                     >
                         {isRunning ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                     </button>
                     <button 
                        onClick={resetTimer}
                        type="button"
                        className="w-12 h-12 rounded-xl bg-white/10 text-brand-300 hover:text-white hover:bg-white/20 transition-all flex items-center justify-center"
                     >
                         <RefreshCcw size={20} />
                     </button>
                 </div>
             </div>
             <button 
                type="button"
                onClick={applyTime}
                className="w-full py-3 bg-brand-500 text-brand-950 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg italic"
             >
                 RECORD TIME
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
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-brand-950 uppercase tracking-[0.2em]">{label}</label>
                <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-brand-300">{count}/20</span>
                     <span className={`text-sm font-black italic ${colorClass.replace('bg-', 'text-')}`}>{value}%</span>
                </div>
            </div>
            
            <div className="flex gap-1.5 h-6 select-none">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i}
                        onClick={() => handleClick(i)}
                        className={`
                            flex-1 rounded-[2px] cursor-pointer transition-all duration-300 hover:scale-y-110
                            ${i < count ? colorClass : 'bg-brand-50 hover:bg-brand-100'}
                            ${i < count ? 'shadow-sm' : 'border border-brand-100/50'}
                        `}
                    />
                ))}
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
            <div className="bg-brand-500 p-8 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><Shield size={120} className="text-white" /></div>
                <div className="relative z-10 text-white">
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter">SCOUT <span className="text-brand-950">REPORTS</span></h2>
                    <p className="font-black mt-1 uppercase text-[10px] tracking-[0.3em] opacity-80 italic">Academy Performance & Talent Assessment</p>
                </div>
                <div className="relative w-full md:w-80 z-10">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
                    <input 
                        type="text" 
                        placeholder="Search roster..." 
                        className="w-full pl-12 pr-6 py-4 bg-white border border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-white/20 transition-all text-xs font-black uppercase tracking-widest text-brand-950 placeholder:text-brand-200 shadow-xl"
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
                        className="bg-white p-6 rounded-[2rem] border border-brand-100 hover:border-brand-500 cursor-pointer transition-all shadow-xl hover:-translate-y-1 flex items-center gap-5 group relative overflow-hidden"
                        >
                        {hasDraft && <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-bl-lg shadow-sm" title="Draft Saved"></div>}
                        
                        <img 
                            src={p.photoUrl || FALLBACK_IMAGE} 
                            onError={(e) => {e.currentTarget.src = FALLBACK_IMAGE}}
                            className="w-14 h-14 rounded-full bg-gray-100 border object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black text-brand-950 truncate group-hover:text-brand-500 transition-colors uppercase italic">{p.fullName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] font-black text-brand-200 uppercase tracking-widest">{p.memberId}</p>
                                {hasDraft && <span className="text-[8px] font-black bg-yellow-400 text-brand-950 px-2 py-0.5 rounded-full uppercase italic">Draft</span>}
                            </div>
                            {p.evaluation ? (
                            <span className="text-[9px] font-black bg-brand-50 text-brand-500 px-3 py-1 rounded-full uppercase mt-3 inline-block border border-brand-100 italic tracking-wider">Report Ready</span>
                            ) : (
                            <span className="text-[9px] font-black bg-brand-50 text-brand-100 px-3 py-1 rounded-full uppercase mt-3 inline-block border border-brand-100 italic tracking-wider">Pending Audit</span>
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
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-brand-100">
                
                {/* Header */}
                <div className="px-10 py-8 border-b border-brand-100 flex justify-between items-center bg-brand-50">
                    <div>
                        <h2 className="text-3xl font-black text-brand-950 italic tracking-tighter flex items-center gap-3 uppercase">
                            {selectedPlayerName}
                            <span className="px-3 py-1 bg-brand-500 text-brand-950 rounded-lg text-[10px] font-black uppercase tracking-widest italic">Scout Report</span>
                            {draftSaved && (
                                <span className="flex items-center gap-1 text-[10px] text-brand-300 font-black uppercase italic animate-in fade-in slide-in-from-left-2">
                                    <SaveAll size={10} /> Auto-Saved
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest italic">Overall Score</span>
                            <span className={`text-4xl font-black italic ${getScoreColor(form.overallRating).replace('text-', 'text-')}`}>{form.overallRating}</span>
                        </div>
                        <div className="w-16 h-16 bg-brand-950 rounded-2xl flex items-center justify-center shadow-xl border border-white/10">
                             <Shield size={32} className="text-brand-500" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        
                        {/* LEFT COLUMN: Physical & Metrics */}
                        <div className="lg:col-span-5 space-y-8">
                            {/* Anthropometry */}
                            <section>
                                <h4 className="text-[10px] font-black text-brand-300 uppercase tracking-[0.3em] flex items-center gap-2 mb-6 italic">
                                    <Activity size={16} className="text-brand-500" /> PHYSICAL PROFILE
                                </h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-brand-950 uppercase tracking-widest ml-1">Height</label>
                                        <div className="relative group">
                                            <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-200 w-4 h-4 group-focus-within:text-brand-500 transition-colors" />
                                            <input 
                                                type="number" 
                                                className="w-full pl-12 pr-14 py-4 bg-brand-50 border border-brand-100 rounded-2xl text-sm font-black text-brand-950 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-sm"
                                                value={form.height}
                                                onChange={e => setForm({...form, height: parseInt(e.target.value)})}
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-brand-200 uppercase">cm</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-brand-950 uppercase tracking-widest ml-1">Weight</label>
                                        <div className="relative group">
                                            <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-200 w-4 h-4 group-focus-within:text-brand-500 transition-colors" />
                                            <input 
                                                type="number" 
                                                className="w-full pl-12 pr-14 py-4 bg-brand-50 border border-brand-100 rounded-2xl text-sm font-black text-brand-950 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-sm"
                                                value={form.weight}
                                                onChange={e => setForm({...form, weight: parseInt(e.target.value)})}
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-brand-200 uppercase">kg</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Performance Tests - NOW WITH STOPWATCH */}
                            <section>
                                <h4 className="text-[10px] font-black text-brand-300 uppercase tracking-[0.3em] flex items-center gap-2 mb-6 italic">
                                    <Zap size={16} className="text-brand-500" /> CALIBRATED TIME TRIALS
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
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-[10px] font-black text-brand-300 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                                        <Target size={16} className="text-brand-500" /> TECHNICAL PROFICIENCY (DRILLS)
                                    </h4>
                                    <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest italic">Ratio / 100</span>
                                </div>
                                
                                <div className="space-y-8 bg-brand-50 p-8 rounded-3xl border border-brand-100 shadow-inner">
                                    <MetricTracker 
                                        label="Passing Accuracy" 
                                        value={form.metrics.passing} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, passing: val}})} 
                                        colorClass="bg-brand-500"
                                    />
                                    <MetricTracker 
                                        label="Shooting / Finishing" 
                                        value={form.metrics.shooting} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, shooting: val}})} 
                                        colorClass="bg-brand-500"
                                    />
                                    <MetricTracker 
                                        label="Ball Control / Juggling" 
                                        value={form.metrics.juggling} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, juggling: val}})} 
                                        colorClass="bg-brand-500"
                                    />
                                    <MetricTracker 
                                        label="Weak Foot Usage" 
                                        value={form.metrics.weakFoot} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, weakFoot: val}})} 
                                        colorClass="bg-brand-500"
                                    />
                                    <MetricTracker 
                                        label="Long Pass Precision" 
                                        value={form.metrics.longPass} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, longPass: val}})} 
                                        colorClass="bg-brand-500"
                                    />
                                    
                                    {/* Manual Beep Test Entry */}
                                    <div className="pt-6 border-t border-brand-100">
                                        <label className="text-[10px] font-black text-brand-950 uppercase tracking-[0.2em] mb-4 block">Endurance Level (Beep Test Equivalent)</label>
                                        <input 
                                            type="range" 
                                            min="0" max="100"
                                            className="w-full h-1.5 bg-brand-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                            value={form.metrics.beepTest}
                                            onChange={e => setForm({...form, metrics: {...form.metrics, beepTest: parseInt(e.target.value)}})}
                                        />
                                        <div className="flex justify-between text-[10px] text-brand-300 font-black uppercase mt-3 italic tracking-widest">
                                            <span>Baseline</span>
                                            <span className="text-brand-500 text-2xl italic">{form.metrics.beepTest}%</span>
                                            <span>Elite</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="h-[2px] bg-brand-50 my-8" />

                            {/* Development Areas */}
                            <section>
                                <h4 className="text-[10px] font-black text-brand-300 uppercase tracking-[0.3em] flex items-center gap-2 mb-6 italic">
                                    <Activity size={16} className="text-brand-500" /> TACTICAL IMPROVEMENT AREAS
                                </h4>
                                
                                <div className="space-y-6">
                                    <div className="relative group">
                                        <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-200 w-4 h-4 group-focus-within:text-brand-500 transition-colors" />
                                        <input 
                                            type="text" 
                                            className="w-full pl-12 pr-6 py-4 bg-brand-50 border border-brand-100 rounded-2xl text-sm font-black uppercase tracking-widest text-brand-950 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all placeholder:text-brand-200 shadow-sm"
                                            placeholder="Type area and press Enter..."
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                        />
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 min-h-[48px]">
                                        {form.developmentAreas.map((area, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-950 text-white text-[10px] font-black uppercase tracking-widest animate-in zoom-in duration-200 border border-white/10 italic">
                                                {area}
                                                <button onClick={() => removeTag(area)} className="text-brand-500 hover:text-white transition-colors">
                                                    <X size={12} strokeWidth={3} />
                                                </button>
                                            </span>
                                        ))}
                                        {form.developmentAreas.length === 0 && (
                                            <span className="text-[10px] text-brand-200 font-black uppercase tracking-[0.2em] py-2 italic opacity-50">No improvement protocols tagged.</span>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="px-10 py-8 bg-brand-50 border-t border-brand-100 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex gap-10 w-full md:w-auto">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-brand-300 uppercase tracking-widest mb-1 italic">Chief Scout</label>
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b border-brand-200 py-1 text-sm font-black text-brand-950 focus:border-brand-500 outline-none" 
                                value={form.coachName} 
                                onChange={e => setForm({...form, coachName: e.target.value})} 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-brand-300 uppercase tracking-widest mb-1 italic">Audit Date</label>
                            <input 
                                type="date" 
                                className="w-full bg-transparent border-b border-brand-200 py-1 text-sm font-black text-brand-950 focus:border-brand-500 outline-none" 
                                value={form.evaluationDate} 
                                onChange={e => setForm({...form, evaluationDate: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => setIsEditing(false)} 
                            className="flex-1 md:flex-none px-8 py-4 text-brand-300 font-black hover:text-brand-950 rounded-2xl transition-all text-[10px] uppercase tracking-[0.2em] italic"
                        >
                            Draft Only
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="flex-1 md:flex-none px-10 py-4 bg-brand-500 text-brand-950 font-black rounded-2xl shadow-xl hover:scale-[1.02] transform transition-all text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 italic"
                        >
                            <Save size={18} />
                            AUTHORIZE REPORT
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
