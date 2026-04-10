
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
        <div className="glass-card border border-white/5 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
             <div className="flex justify-between items-center">
                 <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">{label}</label>
                 <span className="text-[9px] font-black text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20 italic">Previous Score: {value}s</span>
             </div>
             
             <div className="flex items-center gap-6 bg-brand-950 rounded-2xl p-5 shadow-2xl justify-between border border-white/5 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-brand-primary opacity-0 group-hover:opacity-[0.02] transition-opacity" />
                 <div className="font-mono text-4xl font-black text-white tracking-tighter w-32 text-center italic" style={{ fontFamily: 'Orbitron' }}>
                     {formatTime(time)}<span className="text-xs text-brand-primary ml-1">s</span>
                 </div>
                 <div className="flex gap-3 relative z-10">
                     <button 
                        onClick={toggleTimer}
                        type="button"
                        className={`w-14 h-14 rounded-2xl text-brand-secondary transition-all flex items-center justify-center hover:scale-105 active:scale-90 ${isRunning ? 'bg-red-500 shadow-xl shadow-red-500/20' : 'bg-brand-primary shadow-xl shadow-brand-primary/20'}`}
                     >
                         {isRunning ? <Square size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                     </button>
                     <button 
                        onClick={resetTimer}
                        type="button"
                        className="w-14 h-14 rounded-2xl bg-white/5 text-white/20 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center border border-white/5"
                     >
                         <RefreshCcw size={22} />
                     </button>
                 </div>
             </div>
             <button 
                type="button"
                onClick={applyTime}
                className="w-full py-4 bg-brand-950 text-brand-primary text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-brand-primary hover:text-brand-secondary transition-all shadow-xl italic border border-brand-primary/20"
             >
                 CONFIRM TIME
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
        const newCount = index + 1 === count ? index : index + 1;
        const newValue = Math.round((newCount / 20) * 100);
        onChange(newValue);
    };

    const isPrimary = colorClass.includes('brand-primary') || colorClass.includes('brand-500');

    return (
        <div className="space-y-4 group/metric">
            <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic group-hover/metric:text-brand-primary transition-colors">{label}</label>
                <div className="flex items-center gap-3">
                     <span className="text-[9px] font-black text-white/10 font-mono tracking-widest">{count}/20 RATING</span>
                     <span className={`text-lg font-black italic tracking-tighter ${isPrimary ? 'text-brand-primary' : 'text-lime-400'}`}>{value}%</span>
                </div>
            </div>
            
            <div className="flex gap-1.5 h-6 select-none relative">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i}
                        onClick={() => handleClick(i)}
                        className={`
                            flex-1 rounded-[2px] cursor-pointer transition-all duration-300 hover:scale-y-125
                             ${i < count 
                                ? (isPrimary ? 'bg-brand-primary shadow-[0_0_10px_rgba(0,200,255,0.3)]' : 'bg-lime-400 shadow-[0_0_10px_rgba(191,255,0,0.3)]') 
                                : 'bg-white/[0.03] border border-white/5 hover:bg-white/10'}
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
    <div className="space-y-10 pb-20">
      {!isEditing && (
        <>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-brand-900 p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Shield size={120} className="text-white" /></div>
                
                <div className="relative z-10 space-y-2">
                    <h2 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter leading-none">PLAYER <span className="text-[#CCFF00] font-black">EVALUATIONS</span></h2>
                    <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.4em] italic">Academy Performance Hub // Technical Assessment</p>
                </div>

                <div className="relative w-full md:w-96 z-10">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" strokeWidth={3} />
                    <input 
                        type="text" 
                        placeholder="SEARCH PLAYER..." 
                        className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/5 rounded-[2rem] outline-none focus:ring-4 focus:ring-brand-primary/20 transition-all text-xs font-black uppercase tracking-[0.3em] text-white placeholder:text-white/20 shadow-2xl italic font-mono"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredPlayers.map(p => {
                    const hasDraft = StorageService.getDraft(p.id);
                    return (
                        <div 
                            key={p.id} 
                            onClick={() => handleSelectPlayer(p)}
                            className="bg-brand-900/50 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/5 hover:border-brand-primary/50 cursor-pointer transition-all duration-500 shadow-2xl hover:-translate-y-2 flex flex-col gap-6 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity -mr-8 -mt-8 rotate-12">
                                <Zap size={120} className="text-brand-primary" />
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-brand-primary rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                                    <img 
                                        src={p.photoUrl || FALLBACK_IMAGE} 
                                        onError={(e) => {e.currentTarget.src = FALLBACK_IMAGE}}
                                        className="w-16 h-16 rounded-full bg-brand-950 border-2 border-white/10 object-cover relative z-10 transition-transform duration-500 group-hover:scale-110" 
                                    />
                                    {hasDraft && <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-brand-950 flex items-center justify-center z-20 animate-bounce shadow-lg"><Save size={10} className="text-brand-950" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-black text-white truncate group-hover:text-brand-primary transition-colors uppercase italic tracking-tighter leading-none">{p.fullName}</h3>
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mt-2 font-mono italic">#{p.memberId}</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                                {p.evaluation ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic mb-1">OVERALL_RATING</span>
                                            <span className="text-2xl font-black text-brand-primary italic tracking-tighter font-mono" style={{ fontFamily: 'Orbitron' }}>{p.evaluation.overallRating}<span className="text-[10px] ml-1 opacity-40">/100</span></span>
                                        </div>
                                        <div className="bg-brand-primary/10 text-brand-primary px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] border border-brand-primary/20 italic">READY</div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-white/10 uppercase tracking-widest italic">AWAITING_EVALUATION</span>
                                        <div className="bg-white/5 text-white/20 px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] border border-white/5 italic">PENDING</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filteredPlayers.length === 0 && (
                    <div className="col-span-full py-32 text-center glass-card border-dashed">
                        <Loader2 className="w-12 h-12 text-white/5 mx-auto mb-6 animate-spin" />
                        <h3 className="text-2xl font-black text-white/10 uppercase tracking-widest italic">No Data Signal</h3>
                        <p className="text-[10px] font-black text-white/5 uppercase tracking-widest mt-2 italic">Search parameters returned zero results.</p>
                    </div>
                )}
            </div>
        </>
      )}

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-950/80 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="bg-brand-950 w-full max-w-6xl h-[92vh] rounded-[4rem] shadow-[0_0_100px_rgba(0,200,255,0.15)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-700 border border-white/10 uppercase tracking-tight">
                
                {/* Header */}
                <div className="px-12 py-10 border-b border-white/5 flex justify-between items-center bg-brand-950 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-brand-primary opacity-[0.02] animate-pulse" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-2">
                            <span className="px-4 py-1 bg-brand-primary text-brand-secondary rounded-lg text-[9px] font-black uppercase tracking-[0.4em] italic shadow-lg">Academy Intelligence</span>
                            {draftSaved && (
                                <span className="flex items-center gap-2 text-[9px] text-green-400 font-black uppercase italic animate-pulse">
                                    <SaveAll size={12} /> Saving Data...
                                </span>
                            )}
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter flex items-center gap-4">
                            {selectedPlayerName}
                            <span className="text-brand-primary opacity-20">//</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-12 relative z-10">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic mb-1">Academy Index</span>
                            <div className="flex items-end gap-2">
                                <span className="text-[10px] text-brand-primary font-bold mb-2 italic">RATING_</span>
                                <span className={`text-6xl font-black italic font-mono leading-none tracking-tighter ${getScoreColor(form.overallRating).replace('text-', 'text-')}`} style={{ fontFamily: 'Orbitron' }}>{form.overallRating}</span>
                            </div>
                        </div>
                        <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center shadow-2xl border border-brand-primary/20 rotate-3 group-hover:rotate-12 transition-transform duration-500">
                             <Target size={36} className="text-brand-primary" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar-dark bg-brand-950">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                        
                        {/* LEFT COLUMN: Physical & Metrics */}
                        <div className="lg:col-span-5 space-y-12">
                            {/* Anthropometry */}
                            <section className="glass-card p-10 rounded-[2.5rem] border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.02] -mr-8 -mt-8"><Activity size={120} className="text-white" /></div>
                                <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.4em] flex items-center gap-3 mb-10 italic">
                                    <Zap size={18} strokeWidth={3} /> PHYSICAL METRICS
                                </h4>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-1 italic">Height</label>
                                        <div className="relative group">
                                            <Ruler className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 group-focus-within:text-brand-primary transition-colors" />
                                            <input 
                                                type="number" 
                                                className="w-full pl-14 pr-16 py-5 bg-white/[0.03] border border-white/5 rounded-2xl text-lg font-black text-white focus:border-brand-primary/50 outline-none transition-all italic font-mono"
                                                value={form.height}
                                                onChange={e => setForm({...form, height: parseInt(e.target.value)})}
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/10 uppercase tracking-widest italic">CM</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] ml-1 italic">Weight</label>
                                        <div className="relative group">
                                            <Weight className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 group-focus-within:text-brand-primary transition-colors" />
                                            <input 
                                                type="number" 
                                                className="w-full pl-14 pr-16 py-5 bg-white/[0.03] border border-white/5 rounded-2xl text-lg font-black text-white focus:border-brand-primary/50 outline-none transition-all italic font-mono"
                                                value={form.weight}
                                                onChange={e => setForm({...form, weight: parseInt(e.target.value)})}
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/10 uppercase tracking-widest italic">KG</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Performance Tests - STOPWATCH */}
                            <section className="space-y-6">
                                <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.4em] flex items-center gap-3 mb-8 italic pl-1">
                                    <Timer size={18} strokeWidth={3} /> TIME TRIALS
                                </h4>
                                <div className="space-y-6">
                                    <StopwatchTool 
                                        label="Sprint Speed" 
                                        value={form.timeTrials.speed} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, speed: val}})} 
                                    />
                                    <StopwatchTool 
                                        label="Agility Drill" 
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
                        <div className="lg:col-span-7 space-y-12">
                            {/* Technical Assessment - 20pt TRACKER */}
                            <section className="glass-card p-12 rounded-[3.5rem] border-white/5 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none -mr-10 -mt-10"><Target size={220} className="text-white" /></div>
                                <div className="flex justify-between items-center mb-12">
                                    <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.4em] flex items-center gap-4 italic">
                                        <Activity size={18} strokeWidth={3} /> TECHNICAL SKILLS
                                    </h4>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] italic mb-1 opacity-40">System Accuracy</span>
                                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest italic font-mono">1.0_PRO_SENSORS</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-10">
                                    <MetricTracker 
                                        label="Passing Accuracy" 
                                        value={form.metrics.passing} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, passing: val}})} 
                                        colorClass="bg-brand-primary"
                                    />
                                    <MetricTracker 
                                        label="Shooting & Finishing" 
                                        value={form.metrics.shooting} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, shooting: val}})} 
                                        colorClass="bg-brand-primary"
                                    />
                                    <MetricTracker 
                                        label="Ball Control" 
                                        value={form.metrics.juggling} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, juggling: val}})} 
                                        colorClass="bg-brand-primary"
                                    />
                                    <MetricTracker 
                                        label="Weak Foot Ability" 
                                        value={form.metrics.weakFoot} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, weakFoot: val}})} 
                                        colorClass="bg-lime-400"
                                    />
                                    
                                    {/* Endurance Range */}
                                    <div className="pt-10 border-t border-white/5">
                                        <div className="flex justify-between items-end mb-6">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic group-hover/metric:text-brand-primary transition-colors">VO2 MAX / ENDURANCE</label>
                                            <div className="flex items-end gap-2">
                                                <span className="text-2xl font-black text-white font-mono italic" style={{ fontFamily: 'Orbitron' }}>{form.metrics.beepTest}<span className="text-[10px] ml-1 opacity-20">SCORE</span></span>
                                            </div>
                                        </div>
                                        <div className="relative py-4">
                                            <div className="absolute inset-x-0 h-1 bg-white/5 rounded-full" />
                                            <input 
                                                type="range" 
                                                min="0" max="100"
                                                className="absolute inset-x-0 h-1 bg-transparent rounded-lg appearance-none cursor-pointer accent-brand-primary z-10"
                                                value={form.metrics.beepTest}
                                                onChange={e => setForm({...form, metrics: {...form.metrics, beepTest: parseInt(e.target.value)}})}
                                            />
                                            <div 
                                                className="absolute h-1 bg-brand-primary rounded-full shadow-[0_0_15px_rgba(0,200,255,0.5)]" 
                                                style={{ width: `${form.metrics.beepTest}%` }} 
                                            />
                                        </div>
                                        <div className="flex justify-between text-[8px] text-white/10 font-black uppercase mt-4 italic tracking-[0.4em]">
                                            <span>Baseline_Stat</span>
                                            <span>Target_Elite</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Development Areas */}
                            <section className="glass-card p-10 rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-hidden">
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-primary/5 rounded-full blur-[60px] pointer-events-none" />
                                <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.4em] flex items-center gap-3 mb-10 italic">
                                    <Plus size={18} strokeWidth={3} /> DEVELOPMENT AREAS
                                </h4>
                                
                                <div className="space-y-8">
                                    <div className="relative group/input">
                                        <Plus className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 group-focus-within/input:text-brand-primary transition-colors" />
                                        <input 
                                            type="text" 
                                            className="w-full pl-14 pr-8 py-5 bg-white/[0.03] border border-white/5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white focus:border-brand-primary/50 outline-none transition-all placeholder:text-white/10 italic"
                                            placeholder="ADD DEVELOPMENT AREA..."
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                        />
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-3 min-h-[60px]">
                                        {form.developmentAreas.map((area, idx) => (
                                            <span key={idx} className="group/tag inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-brand-950 text-white text-[9px] font-black uppercase tracking-[0.3em] border border-white/10 hover:border-brand-primary transition-all italic shadow-xl">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary group-hover/tag:animate-ping" />
                                                {area}
                                                <button onClick={() => removeTag(area)} className="text-white/20 hover:text-red-500 transition-colors ml-2">
                                                    <X size={14} strokeWidth={4} />
                                                </button>
                                            </span>
                                        ))}
                                        {form.developmentAreas.length === 0 && (
                                            <div className="w-full flex items-center justify-center p-8 border border-dashed border-white/5 rounded-2xl text-[9px] font-black text-white/5 uppercase tracking-[0.3em] italic">No active objectives</div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="px-12 py-10 bg-brand-950 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 shrink-0">
                    <div className="flex gap-12 w-full md:w-auto">
                        <div className="flex-1">
                            <label className="block text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-3 italic">Authored By</label>
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b-2 border-white/5 py-2 text-sm font-black text-white focus:border-brand-primary outline-none italic tracking-widest uppercase" 
                                value={form.coachName} 
                                onChange={e => setForm({...form, coachName: e.target.value})} 
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-3 italic">Timestamp</label>
                            <input 
                                type="date" 
                                className="w-full bg-transparent border-b-2 border-white/5 py-2 text-sm font-black text-white focus:border-brand-primary outline-none italic tracking-widest uppercase" 
                                value={form.evaluationDate} 
                                onChange={e => setForm({...form, evaluationDate: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="flex gap-6 w-full md:w-auto">
                        <button 
                            onClick={() => setIsEditing(false)} 
                            className="flex-1 md:flex-none px-12 py-5 text-white/20 font-black hover:text-white rounded-2xl transition-all text-[10px] uppercase tracking-[0.3em] italic"
                        >
                            Cancel Evaluation
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="flex-1 md:flex-none px-14 py-5 bg-brand-primary text-brand-secondary font-black rounded-2xl shadow-[0_20px_50px_rgba(0,200,255,0.2)] hover:scale-[1.02] transform transition-all text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 italic active:scale-95"
                        >
                            <Save size={20} strokeWidth={3} />
                            SAVE EVALUATION
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
