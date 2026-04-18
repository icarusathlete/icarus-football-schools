
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StorageService } from '../services/storageService';
import { Player, PlayerEvaluation } from '../types';
import { Search, Save, X, Trash2, Shield, Activity, Target, Zap, Ruler, Weight, Timer, Plus, ChevronRight, Play, Square, RefreshCcw, SaveAll, Loader2, Camera } from 'lucide-react';

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
        <div className="glass-card border border-white/20 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-brand-primary opacity-[0.05]" />
             <div className="flex justify-between items-center relative z-10">
                 <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] italic">{label}</label>
                 <span className="text-[8px] font-black text-brand-accent bg-brand-accent/10 px-4 py-1.5 rounded-full border border-brand-accent/20 italic tracking-widest">PREVIOUS: {value}s</span>
             </div>
             
             <div className="flex items-center gap-8 bg-white/10 rounded-[2rem] p-6 shadow-inner justify-between border border-white/10 relative group/timer">
                 <div className="font-mono text-5xl font-black text-white tracking-tighter w-40 text-center italic" style={{ fontFamily: 'Orbitron' }}>
                     {formatTime(time)}<span className="text-xs text-brand-accent ml-2 uppercase opacity-50">sec</span>
                 </div>
                 <div className="flex gap-4 relative z-10">
                     <button 
                        onClick={toggleTimer}
                        type="button"
                        className={`w-16 h-16 rounded-2xl text-brand-950 transition-all flex items-center justify-center hover:scale-105 active:scale-95 shadow-2xl ${isRunning ? 'bg-red-500 shadow-red-500/20 text-white' : 'bg-brand-accent shadow-brand-accent/20'}`}
                     >
                         {isRunning ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                     </button>
                     <button 
                        onClick={resetTimer}
                        type="button"
                        className="w-16 h-16 rounded-2xl bg-white/10 text-white/40 hover:text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/10"
                     >
                         <RefreshCcw size={24} />
                     </button>
                 </div>
             </div>
             <button 
                type="button"
                onClick={applyTime}
                className="w-full py-5 bg-white/20 text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-2xl hover:bg-white/30 transition-all shadow-xl italic border border-white/10"
             >
                 APPLY TO PROFILE
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
        <div className="space-y-5 group/metric bg-white/5 p-6 rounded-[2rem] border border-white/10 hover:border-brand-accent/20 transition-all">
            <div className="flex justify-between items-end">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] italic group-hover/metric:text-brand-accent transition-colors">{label}</label>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isPrimary ? 'bg-brand-accent shadow-[0_0_8px_currentColor]' : 'bg-lime-400 shadow-[0_0_8px_currentColor]'}`} />
                        <span className="text-[8px] font-black text-white/30 font-mono tracking-widest uppercase">{count}/20 ACCURACY</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                     <span className={`text-3xl font-black italic tracking-tighter ${isPrimary ? 'text-brand-accent' : 'text-lime-400'} font-mono`} style={{ fontFamily: 'Orbitron' }}>{value}<span className="text-[10px] ml-1 opacity-40">%</span></span>
                </div>
            </div>
            
            <div className="flex gap-1.5 h-6 select-none relative">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i} 
                        onClick={() => handleClick(i)}
                        className={`
                            flex-1 rounded-[1.5px] cursor-pointer transition-all duration-300 hover:scale-y-125
                             ${i < count 
                                ? (isPrimary ? 'bg-brand-accent shadow-[0_0_12px_rgba(195,246,41,0.4)]' : 'bg-lime-400 shadow-[0_0_12px_rgba(191,255,0,0.4)]') 
                                : 'bg-white/10 border border-white/5 hover:bg-white/20'}
                        `}
                    />
                ))}
            </div>
        </div>
    );
};
// 3. Professional Physical Metric Input (Height/Weight)
const PhysicalMetricInput: React.FC<{
    label: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    min?: number;
    max?: number;
    onChange: (val: number) => void;
}> = ({ label, value, unit, icon, min = 0, max = 300, onChange }) => {
    const handleIncrement = () => {
        if (value < max) onChange(value + 1);
    };

    const handleDecrement = () => {
        if (value > min) onChange(value - 1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            onChange(Math.max(min, Math.min(max, val)));
        } else if (e.target.value === '') {
            onChange(0);
        }
    };

    return (
        <div className="space-y-4 group/phys">
            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] ml-1 italic group-hover/phys:text-brand-accent transition-colors">{label}</label>
            <div className="relative flex items-center gap-4">
                <div className="relative flex-1 group/input">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within/input:text-brand-accent transition-colors">
                        {icon}
                    </div>
                    <input 
                        type="number" 
                        className="w-full pl-14 pr-16 py-6 bg-white/5 border border-white/10 rounded-2xl text-2xl font-black text-white focus:border-brand-accent/50 outline-none transition-all italic font-mono shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={value || ''}
                        onChange={handleInputChange}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/30 uppercase tracking-widest italic font-mono">{unit}</span>
                </div>
                <div className="flex flex-col gap-2">
                    <button 
                        type="button"
                        onClick={handleIncrement}
                        className="p-3 bg-white/10 hover:bg-brand-accent hover:text-brand-950 text-white/60 rounded-xl border border-white/10 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                    <button 
                        type="button"
                        onClick={handleDecrement}
                        className="p-3 bg-white/10 hover:bg-red-500 hover:text-white text-white/60 rounded-xl border border-white/10 transition-all shadow-lg active:scale-95"
                    >
                        <X size={20} strokeWidth={3} className="rotate-45" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- RATING LOGIC HELPER ---
const calculateOverallRating = (evaluation: PlayerEvaluation): number => {
    if (!evaluation) return 0;

    // 1. Technical Metrics (0-100 each)
    const metricsScores = Object.values(evaluation.metrics || {});
    const avgTechnical = metricsScores.length > 0 
        ? metricsScores.reduce((a, b) => a + b, 0) / metricsScores.length 
        : 0;

    // 2. Physical Time Trials (Lower is better, normalize to 0-100)
    // Baselines (Targeting typical 10-15 year old ranges)
    const tt = evaluation.timeTrials || { speed: 7.0, agility: 24.0, dribbling: 28.0 };
    const speedScore = Math.max(0, Math.min(100, ( (7.0 - (tt.speed || 7.0)) / (7.0 - 4.2) ) * 100));
    const agilityScore = Math.max(0, Math.min(100, ( (24.0 - (tt.agility || 24.0)) / (24.0 - 16.0) ) * 100));
    const dribblingScore = Math.max(0, Math.min(100, ( (28.0 - (tt.dribbling || 28.0)) / (28.0 - 14.0) ) * 100));

    const avgPhysical = (speedScore + agilityScore + dribblingScore) / 3;

    // 3. Weighting
    // Technical counts for 70%, Physical for 30%
    const finalRating = (avgTechnical * 0.7) + (avgPhysical * 0.3);

    return Math.round(finalRating || 0);
};

// --- MAIN COMPONENT ---

export const EvaluationManager: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    actionImageUrl: '',
    coachSignatureUrl: '',
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

  // Auto-calculate rating when form changes
  useEffect(() => {
    const newRating = calculateOverallRating(form);
    if (newRating !== form.overallRating) {
        setForm(prev => ({ ...prev, overallRating: newRating }));
    }

    if (isEditing && selectedPlayerId) {
        const timeoutId = setTimeout(() => {
            StorageService.saveDraft(selectedPlayerId, form);
            setDraftSaved(true);
            setTimeout(() => setDraftSaved(false), 2000);
        }, 1000); // Debounce save by 1s
        
        return () => clearTimeout(timeoutId);
    }
  }, [form.metrics, form.timeTrials, isEditing, selectedPlayerId]);

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

  const handleDeleteEvaluation = async (playerId: string) => {
    setIsDeleting(true);
    try {
        await StorageService.deleteEvaluation(playerId);
        setShowDeleteConfirm(null);
    } catch (err) {
        console.error("Delete failed", err);
    } finally {
        setIsDeleting(false);
    }
  };

  const resetForm = () => {
      setForm({ ...defaultEval, coachName: 'Coach Admin' });
      setShowResetConfirm(false);
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

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleActionPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1000, 0.6); // Slightly higher for action photo
        setForm(prev => ({ ...prev, actionImageUrl: compressed }));
      } catch (err) {
        console.error("Compression failed", err);
      }
    }
  };

  const handleSignatureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 0.5); // Smaller for signature
        setForm(prev => ({ ...prev, coachSignatureUrl: compressed }));
      } catch (err) {
        console.error("Compression failed", err);
      }
    }
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
    <>
    <div className="space-y-10 pb-20">
      {!isEditing && (
        <>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 glass-card p-10 md:p-14 rounded-[3rem] border border-white/20 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-hover:scale-110 group-hover:opacity-[0.1] transition-all duration-1000">
                    <Shield size={180} className="text-white" />
                </div>
                
                <div className="relative z-10 space-y-4">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-brand-accent/20 border border-brand-accent/30 mb-2">
                        <Activity size={12} className="text-brand-950" />
                        <span className="text-[10px] font-black text-brand-950 uppercase tracking-[0.2em] italic">PERFORMANCE SENSORS ACTIVE</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black italic text-white uppercase tracking-tighter leading-none">PLAYER <span className="premium-gradient-text">EVALUATIONS</span></h2>
                    <p className="text-white/60 font-black uppercase text-[10px] tracking-[0.4em] italic flex items-center gap-3">
                        <Zap size={14} className="text-brand-accent" /> Academy Performance Hub // Technical Assessment
                    </p>
                </div>

                <div className="relative w-full md:w-[28rem] z-10">
                    <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input 
                        type="text" 
                        placeholder="SCAN SQUAD DATA..." 
                        className="w-full pl-16 pr-8 py-6 bg-white/10 border border-white/10 rounded-[2rem] outline-none focus:bg-white/20 focus:border-white/20 transition-all text-xs font-black uppercase tracking-[0.3em] text-white placeholder:text-white/20 shadow-2xl italic"
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
                            className="glass-card p-10 rounded-[3rem] border border-white/20 hover:border-brand-accent/40 cursor-pointer transition-all duration-500 shadow-xl hover:-translate-y-2 hover:scale-[1.02] flex flex-col gap-8 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity -mr-8 -mt-8 rotate-12">
                                <Zap size={120} className="text-white" />
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="absolute inset-x-0 -bottom-2 h-4 bg-brand-accent/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-20 h-20 rounded-[2rem] bg-brand-950 border-2 border-white/20 overflow-hidden relative z-10 transition-transform duration-500 group-hover:scale-105">
                                        <img 
                                            src={p.photoUrl || FALLBACK_IMAGE} 
                                            onError={(e) => {e.currentTarget.src = FALLBACK_IMAGE}}
                                            className="w-full h-full object-cover" 
                                        />
                                    </div>
                                    {hasDraft && <div className="absolute -top-2 -right-2 w-7 h-7 bg-brand-accent rounded-full border-4 border-brand-900 flex items-center justify-center z-20 shadow-lg"><Save size={12} className="text-brand-950" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-2xl font-black text-white truncate group-hover:text-brand-accent transition-colors uppercase italic tracking-tighter leading-none mb-2">{p.fullName}</h3>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 border border-white/10">
                                        <Shield size={10} className="text-white/40" />
                                        <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] italic">#{p.memberId}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/10 flex flex-col gap-6">
                                {p.evaluation ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic mb-1">DATA_INDEX</span>
                                            <span className="text-4xl font-black text-brand-accent italic tracking-tighter font-mono" style={{ fontFamily: 'Orbitron' }}>{p.evaluation.overallRating}<span className="text-xs ml-1 opacity-40 font-bold">/100</span></span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteConfirm(p.id);
                                                }}
                                                className="w-12 h-12 bg-red-500/10 text-red-500/60 hover:text-white hover:bg-red-500 rounded-2xl transition-all border border-red-500/20 flex items-center justify-center shadow-lg"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic mb-1">DATA_INDEX</span>
                                            <span className="text-4xl font-black text-white/20 italic tracking-tighter font-mono" style={{ fontFamily: 'Orbitron' }}>--<span className="text-xs ml-1 opacity-40 font-bold">/100</span></span>
                                        </div>
                                        <div className="bg-white/10 text-white/40 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] border border-white/10 italic">AWAITING</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filteredPlayers.length === 0 && (
                    <div className="col-span-full py-48 text-center glass-card rounded-[4rem] border-dashed border-white/20">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-white/5 mb-8">
                            <Activity size={48} className="text-white/10" />
                        </div>
                        <h3 className="text-3xl font-black text-white/10 uppercase tracking-[0.4em] italic leading-tight">NO SIGNAL <br/> RETRIEVED</h3>
                        <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.5em] mt-6 italic">RECALIBRATE SEARCH PARAMETERS</p>
                    </div>
                )}
            </div>
        </>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-slate-900/40 backdrop-blur-3xl animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-7xl h-full rounded-[4rem] shadow-[0_40px_120px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-700 border border-brand-100 uppercase tracking-tight">
                
                {/* Header */}
                <div className="px-16 py-12 border-b border-brand-50 flex justify-between items-center bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-50 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 flex items-center gap-10">
                        <img 
                            src={players.find(p => p.id === selectedPlayerId)?.photoUrl || FALLBACK_IMAGE} 
                            className="w-24 h-24 rounded-[2rem] border-4 border-white shadow-2xl object-cover" 
                        />
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <span className="px-4 py-1 bg-brand-500 text-brand-secondary rounded-lg text-[9px] font-black uppercase tracking-[0.4em] italic shadow-lg shadow-brand-500/20">LIVE_METRICS_FEED</span>
                                {draftSaved && (
                                    <span className="flex items-center gap-2 text-[9px] text-brand-500 font-black uppercase italic animate-pulse">
                                        <SaveAll size={12} /> Syncing Matrix...
                                    </span>
                                )}
                            </div>
                            <h2 className="text-5xl font-black text-brand-950 italic tracking-tighter flex items-center gap-4">
                                {selectedPlayerName}
                                <span className="text-brand-500 opacity-20">//</span>
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-16 relative z-10">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-brand-950/20 uppercase tracking-[0.4em] italic mb-2">PERFORMANCE_INDEX</span>
                            <div className="flex items-end gap-3">
                                <span className="text-[10px] text-brand-500 font-bold mb-3 italic">RATING_</span>
                                <span className={`text-7xl font-black italic font-mono leading-none tracking-tighter text-brand-950`} style={{ fontFamily: 'Orbitron' }}>{form.overallRating}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-16 custom-scrollbar-light bg-slate-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                        
                        {/* LEFT COLUMN: Physical & Metrics */}
                        <div className="lg:col-span-5 space-y-16">
                            {/* Anthropometry */}
                            <section className="bg-brand-950 p-12 rounded-[3.5rem] border border-white/5 relative overflow-hidden shadow-2xl group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-brand-primary/20 transition-colors" />
                                <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.5em] flex items-center gap-4 mb-12 italic relative z-10">
                                    <div className="w-8 h-8 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary"><Zap size={18} strokeWidth={3} /></div>
                                    PHYSICAL ENGINE
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                    <PhysicalMetricInput 
                                        label="V_HEIGHT"
                                        value={form.height}
                                        unit="CM"
                                        icon={<Ruler size={20} />}
                                        min={50}
                                        max={250}
                                        onChange={(val) => setForm({...form, height: val})}
                                    />
                                    <PhysicalMetricInput 
                                        label="V_WEIGHT"
                                        value={form.weight}
                                        unit="KG"
                                        icon={<Weight size={20} />}
                                        min={10}
                                        max={150}
                                        onChange={(val) => setForm({...form, weight: val})}
                                    />
                                </div>
                            </section>

                            {/* Performance Tests - STOPWATCH */}
                            <section className="space-y-10">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[11px] font-black text-brand-950 uppercase tracking-[0.5em] flex items-center gap-4 italic">
                                        <div className="w-8 h-8 rounded-xl bg-brand-950/10 flex items-center justify-center text-brand-950"><Timer size={18} strokeWidth={3} /></div>
                                        TIME TRIALS
                                    </h4>
                                    <span className="text-[8px] font-black text-brand-950/30 uppercase tracking-[0.4em] italic font-mono">REALTIME_SENSORS_ACTIVE</span>
                                </div>
                                <div className="space-y-8">
                                    <StopwatchTool 
                                        label="TACTICAL SPRINT [30M]" 
                                        value={form.timeTrials.speed} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, speed: val}})} 
                                    />
                                    <StopwatchTool 
                                        label="ILLINOIS AGILITY TEST" 
                                        value={form.timeTrials.agility} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, agility: val}})} 
                                    />
                                    <StopwatchTool 
                                        label="DRIBBLING GAUNTLET" 
                                        value={form.timeTrials.dribbling} 
                                        onChange={(val) => setForm({...form, timeTrials: {...form.timeTrials, dribbling: val}})} 
                                    />
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Technical & Development */}
                        <div className="lg:col-span-7 space-y-16">
                            {/* Technical Assessment - 20pt TRACKER */}
                            <section className="bg-brand-950 p-16 rounded-[4rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[120px] -mr-[300px] -mt-[300px] group-hover:bg-brand-primary/15 transition-colors" />
                                <div className="flex justify-between items-center mb-16 relative z-10">
                                    <h4 className="text-[12px] font-black text-brand-primary uppercase tracking-[0.6em] flex items-center gap-5 italic">
                                        <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary shadow-lg shadow-brand-primary/10"><Activity size={20} strokeWidth={3} /></div>
                                        TECHNICAL DATA ANALYSIS
                                    </h4>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em] italic mb-1 opacity-40 font-mono">SENSORY_PRECISION</span>
                                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest italic font-mono bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">V_1.0_PRO</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-8 relative z-10">
                                    <MetricTracker 
                                        label="Passing Precision" 
                                        value={form.metrics.passing} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, passing: val}})} 
                                        colorClass="bg-brand-primary"
                                    />
                                    <MetricTracker 
                                        label="Ball Manipulation" 
                                        value={form.metrics.juggling} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, juggling: val}})} 
                                        colorClass="bg-brand-primary"
                                    />
                                    <MetricTracker 
                                        label="Attack & Finish" 
                                        value={form.metrics.shooting} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, shooting: val}})} 
                                        colorClass="bg-brand-primary"
                                    />
                                    <MetricTracker 
                                        label="Dual Foot Mastery" 
                                        value={form.metrics.weakFoot} 
                                        onChange={(val) => setForm({...form, metrics: {...form.metrics, weakFoot: val}})} 
                                        colorClass="bg-lime-400"
                                    />
                                    
                                    {/* Endurance Range */}
                                    <div className="pt-12 border-t border-white/5 space-y-8">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] italic group-hover/metric:text-brand-primary transition-colors">VO2_MAX_ENDURANCE [BEEP TEST]</label>
                                                <div className="text-[8px] font-black text-brand-primary/40 italic uppercase tracking-widest">Aerobic capacity verification</div>
                                            </div>
                                            <div className="flex items-end gap-3">
                                                <span className="text-4xl font-black text-white font-mono italic tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{form.metrics.beepTest}<span className="text-[12px] ml-2 opacity-30 uppercase">Score</span></span>
                                            </div>
                                        </div>
                                        <div className="relative py-6">
                                            <div className="absolute inset-x-0 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ width: '200%' }} />
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="100"
                                                className="absolute inset-x-0 h-2 bg-transparent rounded-lg appearance-none cursor-pointer accent-brand-primary z-20"
                                                value={form.metrics.beepTest}
                                                onChange={e => setForm({...form, metrics: {...form.metrics, beepTest: parseInt(e.target.value)}})}
                                            />
                                            <div 
                                                className="absolute h-2 bg-brand-primary rounded-full shadow-[0_0_25px_rgba(0,200,255,0.6)] z-10 transition-all duration-500" 
                                                style={{ width: `${form.metrics.beepTest}%` }} 
                                            />
                                        </div>
                                        <div className="flex justify-between text-[8px] text-white/20 font-black uppercase italic tracking-[0.4em] font-mono">
                                            <span>BASELINE_SIGNAL</span>
                                            <span>MAX_PERFORMANCE</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Development Areas */}
                            <section className="bg-brand-950 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-brand-primary/20 transition-colors" />
                                <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-[0.5em] flex items-center gap-4 mb-12 italic relative z-10">
                                    <div className="w-8 h-8 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary"><Plus size={18} strokeWidth={3} /></div>
                                    STRATEGIC OBJECTIVES
                                </h4>
                                
                                <div className="space-y-10 relative z-10">
                                    <div className="relative group/input">
                                        <Plus className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4 group-focus-within/input:text-brand-primary transition-colors" />
                                        <input 
                                            type="text" 
                                            className="w-full pl-14 pr-8 py-6 bg-white/[0.03] border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-white focus:border-brand-primary/50 outline-none transition-all placeholder:text-white/10 italic font-mono shadow-inner"
                                            placeholder="SCAN & ADD NEW OBJECTIVE..."
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                        />
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-4 min-h-[80px]">
                                        {form.developmentAreas.map((area, idx) => (
                                            <span key={idx} className="group/tag inline-flex items-center gap-4 px-6 py-4 rounded-xl bg-black/40 text-white text-[9px] font-black uppercase tracking-[0.4em] border border-white/10 hover:border-brand-primary/40 transition-all italic shadow-2xl hover:-translate-y-1">
                                                <div className="w-2 h-2 rounded-full bg-brand-primary group-hover/tag:animate-ping shadow-[0_0_10px_rgba(0,200,255,0.6)]" />
                                                {area}
                                                <button onClick={() => removeTag(area)} className="text-white/20 hover:text-red-500 transition-colors ml-3">
                                                    <X size={16} strokeWidth={4} />
                                                </button>
                                            </span>
                                        ))}
                                        {form.developmentAreas.length === 0 && (
                                            <div className="w-full h-24 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl text-[9px] font-black text-white/5 uppercase tracking-[0.4em] italic gap-3">
                                                <Target size={24} className="opacity-10" />
                                                Awaiting strategic directive
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* media & verification */}
                            <section className="bg-white/40 p-12 rounded-[3.5rem] border border-brand-100 shadow-xl relative overflow-hidden group">
                                <h4 className="text-[11px] font-black text-brand-950 uppercase tracking-[0.5em] flex items-center gap-4 mb-10 italic relative z-10">
                                    <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500"><Camera size={18} strokeWidth={3} /></div>
                                    MEDIA & VERIFICATION
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black text-brand-950/30 uppercase tracking-[0.4em] italic block">PERFORMANCE_ACTION_SHOT</label>
                                        <div className="relative group/upload h-48 rounded-3xl overflow-hidden border-2 border-dashed border-brand-200 hover:border-brand-500 transition-all bg-brand-50/50">
                                            {form.actionImageUrl ? (
                                                <>
                                                    <img src={form.actionImageUrl} className="w-full h-full object-cover" />
                                                    <button 
                                                        onClick={() => setForm({...form, actionImageUrl: ''})}
                                                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/upload:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                                    <Camera className="text-brand-300" size={32} />
                                                    <span className="text-[8px] font-black text-brand-400 uppercase tracking-widest italic">UPLOAD_KID_PLAYING</span>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={handleActionPhotoChange}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black text-brand-950/30 uppercase tracking-[0.4em] italic block">HEAD_COACH_SIGNATURE</label>
                                        <div className="relative group/upload h-48 rounded-3xl overflow-hidden border-2 border-dashed border-brand-200 hover:border-brand-500 transition-all bg-brand-50/50">
                                            {form.coachSignatureUrl ? (
                                                <>
                                                    <img src={form.coachSignatureUrl} className="w-full h-full object-contain p-4" />
                                                    <button 
                                                        onClick={() => setForm({...form, coachSignatureUrl: ''})}
                                                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/upload:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                                    <Plus className="text-brand-300" size={32} />
                                                    <span className="text-[8px] font-black text-brand-400 uppercase tracking-widest italic">UPLOAD_OFFICIAL_SIGNATURE</span>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={handleSignatureChange}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="px-16 py-12 bg-white border-t border-brand-50 flex flex-col md:flex-row justify-between items-center gap-10 shrink-0 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -z-10 translate-y-1/2 -translate-x-1/2" />
                    <div className="flex gap-16 w-full md:w-auto relative z-10">
                        <div className="min-w-[240px]">
                            <label className="block text-[9px] font-black text-brand-950/20 uppercase tracking-[0.5em] mb-4 italic">VERIFIED_BY_COACH</label>
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b-2 border-brand-100 py-3 text-lg font-black text-brand-950 focus:border-brand-500 outline-none italic tracking-tight uppercase transition-colors" 
                                value={form.coachName} 
                                onChange={e => setForm({...form, coachName: e.target.value})} 
                            />
                        </div>
                        <div className="min-w-[180px]">
                            <label className="block text-[9px] font-black text-brand-950/20 uppercase tracking-[0.5em] mb-4 italic">SYSTEM_TIMESTAMP</label>
                            <input 
                                type="date" 
                                className="w-full bg-transparent border-b-2 border-brand-100 py-3 text-lg font-black text-brand-950 focus:border-brand-500 outline-none italic tracking-tight uppercase transition-colors" 
                                value={form.evaluationDate} 
                                onChange={e => setForm({...form, evaluationDate: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="flex gap-8 w-full md:w-auto relative z-10">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowResetConfirm(true);
                            }}
                            className="flex-1 md:flex-none px-10 py-6 bg-white border border-brand-100 text-brand-950/40 hover:text-brand-950 font-black rounded-2xl transition-all text-[10px] uppercase tracking-[0.4em] italic flex items-center gap-3 group/reset"
                        >
                            <RefreshCcw size={16} className="group-hover/reset:rotate-180 transition-transform duration-500" />
                            RESET_FORM
                        </button>
                        <button 
                            onClick={() => setIsEditing(false)} 
                            className="flex-1 md:flex-none px-12 py-6 text-brand-950/30 font-black hover:text-brand-950 rounded-2xl transition-all text-[10px] uppercase tracking-[0.4em] italic font-mono"
                        >
                            DISCARD_CHANGES
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="flex-1 md:flex-none px-16 py-6 bg-brand-950 text-white font-black rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:scale-[1.02] transform transition-all text-[10px] uppercase tracking-[0.5em] flex items-center justify-center gap-5 italic active:scale-95 group"
                        >
                            <Save size={20} strokeWidth={3} className="text-brand-primary group-hover:rotate-12 transition-transform" />
                            UPLOAD_DATA_CENTRAL
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>

    {/* MODALS & OVERLAYS */}
    {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 text-left">
            <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-xl" onClick={() => setShowDeleteConfirm(null)} />
            <div className="relative w-full max-w-md bg-white border border-brand-100/50 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mb-8 border border-red-100">
                        <Trash2 size={32} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-brand-950 italic uppercase tracking-tighter mb-4">DELETE_REPORT?</h3>
                    <p className="text-sm text-brand-950/50 leading-relaxed mb-10">
                        This will clear the active metrics and images. Past history remains unless you choose to wipe all.
                    </p>

                    <div className="flex flex-col gap-4 w-full">
                        <button 
                            onClick={() => handleDeleteEvaluation(showDeleteConfirm)}
                            disabled={isDeleting}
                            className="w-full py-5 bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] italic hover:bg-red-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            CONFIRM_DELETE
                        </button>
                        
                        <button 
                            onClick={async () => {
                                setIsDeleting(true);
                                await StorageService.clearEvaluationHistory(showDeleteConfirm);
                                await handleDeleteEvaluation(showDeleteConfirm);
                                setShowDeleteConfirm(null);
                            }}
                            disabled={isDeleting}
                            className="w-full py-5 bg-white border border-red-100 text-red-500 font-black rounded-2xl uppercase tracking-widest text-[10px] italic hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
                        >
                            WIPE_ENTIRE_HISTORY
                        </button>

                        <button 
                            onClick={() => setShowDeleteConfirm(null)}
                            className="w-full py-5 text-brand-950/30 font-black uppercase tracking-widest text-[10px] italic hover:text-brand-950 transition-all"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}

    {showResetConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 text-left">
            <div className="absolute inset-0 bg-brand-950/80 backdrop-blur-xl" onClick={() => setShowResetConfirm(false)} />
            <div className="relative w-full max-w-md bg-white border border-brand-100/50 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary" />
                
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary mb-8 border border-brand-primary/20">
                        <RefreshCcw size={32} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-brand-950 italic uppercase tracking-tighter mb-4">RESET_FORM?</h3>
                    <p className="text-sm text-brand-950/50 leading-relaxed mb-10">
                        Clear all current fields and images? This cannot be undone.
                    </p>

                    <div className="flex flex-col gap-4 w-full">
                        <button 
                            onClick={resetForm}
                            className="w-full py-5 bg-brand-950 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] italic hover:bg-black transition-all active:scale-95"
                        >
                            YES_START_FRESH
                        </button>
                        
                        <button 
                            onClick={() => setShowResetConfirm(false)}
                            className="w-full py-5 text-brand-950/30 font-black uppercase tracking-widest text-[10px] italic hover:text-brand-950 transition-all"
                        >
                            NO_KEEP_DATA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default EvaluationManager;
