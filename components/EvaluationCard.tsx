import React, { useRef, useState, useEffect } from 'react';
import { Player, AcademySettings, PlayerEvaluation, AttendanceRecord, Match } from '../types';
import { Shield, Download, Loader2, Award, X, Camera, RefreshCcw, Edit2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GeminiService } from '../services/geminiService';
import { StorageService } from '../services/storageService';

interface EvaluationCardProps {
  player: Player;
  settings: AcademySettings;
  attendance?: AttendanceRecord[];
  matches?: Match[];
  onClose?: () => void;
  isCoach?: boolean;
}

// Format date strictly according to professional standards
const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return 'UNKNOWN';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
};

const getFirstName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(' ');
};

const getLastName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    if (parts.length === 1) return '';
    return parts[parts.length - 1];
};

const toTitleCase = (str: string) => {
    return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

// V4 Progress Bar for stats
// For time-based metrics (inverse=true): lower time = better = more fill.
// fill% = (max - value) / max * 100, clamped 0-100.
const V4ProgressBar = ({ label, value, max = 100, inverse = false, unit = '', color = '#C8FF00' }: { label: string, value: number, max?: number, inverse?: boolean, unit?: string, color?: string }) => {
    const percentage = inverse
        ? Math.max(0, Math.min(100, ((max - value) / max) * 100))
        : Math.max(0, Math.min(100, (value / max) * 100));

    return (
        <div className="flex items-center justify-between mb-[10px]">
            <span className="text-[9px] uppercase text-white font-medium truncate pr-2 max-w-[45%] leading-tight">{label}</span>
            <div className="flex items-center gap-3 flex-1 justify-end">
                <div className="h-[5px] w-[120px] bg-white/[0.08] rounded-[2px] overflow-hidden">
                    <div className="h-full rounded-[2px]" style={{ width: `${percentage}%`, backgroundColor: color }} />
                </div>
                <span className="text-[11px] font-bold text-white w-[32px] text-right">{value}{unit}</span>
            </div>
        </div>
    );
};

export const EvaluationCard: React.FC<EvaluationCardProps> = ({ player, settings, attendance = [], matches = [], onClose, isCoach }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(player?.evaluation?.aiReport || null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [editedRemarks, setEditedRemarks] = useState<string>(player?.evaluation?.coachRemarks || player?.evaluation?.aiReport || '');
  const evalData = player?.evaluation;
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (wrapperRef.current) {
        const containerWidth = wrapperRef.current.clientWidth;
        const newScale = Math.min(1, containerWidth / 1600);
        setScale(newScale);
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);
  
  useEffect(() => {
    if (evalData?.aiReport) {
      setAiReport(evalData.aiReport);
      if (!editedRemarks) setEditedRemarks(evalData.coachRemarks || evalData.aiReport || '');
    } else if (evalData && !aiReport && player?.id && !isLoadingAI) {
      handleGenerateAIReport();
    }
  }, [player?.id, evalData?.aiReport]);

  const handleGenerateAIReport = async (manual = false) => {
    if (isLoadingAI) return;
    setIsLoadingAI(true);
    try {
      const report = await GeminiService.generateReportCard(player, attendance, matches);
      setAiReport(report);
      
      if (manual || !player.evaluation?.coachRemarks) {
        setEditedRemarks(report);
      }

      if (player.evaluation) {
        const updatedPlayer: Player = {
          ...player,
          evaluation: { ...player.evaluation, aiReport: report }
        };
        await StorageService.updatePlayer(updatedPlayer);
        window.dispatchEvent(new CustomEvent('academy_data_update'));
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSaveRemarks = async () => {
    if (!player.evaluation) return;
    
    try {
      const updatedPlayer: Player = {
        ...player,
        evaluation: { 
          ...player.evaluation, 
          coachRemarks: editedRemarks 
        }
      };
      await StorageService.updatePlayer(updatedPlayer);
      setIsEditingRemarks(false);
      window.dispatchEvent(new CustomEvent('academy_data_update'));
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleDownloadPDF = async () => {
    const element = cardRef.current;
    if (!element) return;
    setIsGenerating(true);

    try {
        const canvas = await html2canvas(element, {
            scale: 3, 
            useCORS: true,
            backgroundColor: '#060D1F',
            logging: false,
            width: 1600,
            height: 1000,
            windowWidth: 1600,
            windowHeight: 1000,
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.querySelector('[data-report-container="true"]') as HTMLElement;
                if (clonedElement) {
                    clonedElement.style.transform = 'none';
                    clonedElement.style.position = 'relative';
                    clonedElement.style.margin = '0';
                    clonedElement.style.border = 'none';
                    
                    const elements = clonedElement.querySelectorAll('*');
                    elements.forEach((el) => {
                        (el as HTMLElement).style.opacity = '1';
                    });
                }
            }
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [1600, 1000],
            hotfixes: ['px_scaling']
        });

        pdf.addImage(imgData, 'PNG', 0, 0, 1600, 1000);
        pdf.save(`${player?.fullName?.replace(/\s+/g, '_')}_SCOUT_DOSSIER.pdf`);
    } catch (error) {
        console.error("PDF Generation failed:", error);
    } finally {
        setIsGenerating(false);
    }
  };

  if (!player || !evalData) return null;

  return (
    <div className="space-y-6">
        {/* Controls Header (Not part of PDF) */}
        <div className="flex justify-between items-center bg-[#07102A]/80 backdrop-blur-2xl p-6 rounded-[1.5rem] border border-white/10 shadow-2xl">
            <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <Shield className="text-[#C8FF00]" size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Premium Dossier Render</h2>
                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Export Management</p>
                </div>
            </div>
            <div className="flex gap-4">
                {isCoach && (
                    <button onClick={() => handleGenerateAIReport(true)} disabled={isLoadingAI} className="bg-white/5 text-white/70 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 hover:bg-white/10 transition-all border border-white/5">
                        {isLoadingAI ? <Loader2 className="animate-spin" size={16}/> : <RefreshCcw size={16} />} REGENERATE AI
                    </button>
                )}
                {isCoach && (
                    <button 
                        onClick={() => setIsEditingRemarks(!isEditingRemarks)} 
                        className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all border ${isEditingRemarks ? 'bg-white text-black border-white' : 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10'}`}
                    >
                        {isEditingRemarks ? <X size={16}/> : <Edit2 size={16} />} 
                        {isEditingRemarks ? 'CANCEL EDIT' : 'EDIT VERDICT'}
                    </button>
                )}
                <button onClick={handleDownloadPDF} disabled={isGenerating} className="bg-[#C8FF00] text-[#050E25] px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-3 hover:opacity-90 transition-all shadow-lg">
                    {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Download size={18}/>} EXPORT PDF
                </button>
                {onClose && (
                    <button onClick={onClose} className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all ml-2">
                        <X size={24} />
                    </button>
                )}
            </div>
        </div>

        {/* --- THE DOSSIER (1600x1000 LANDSCAPE AREA) --- */}
        <div ref={wrapperRef} className="w-full flex justify-center overflow-hidden rounded-[1.5rem] bg-[#060D1F] border border-white/10" style={{ height: `${1000 * scale}px` }}>
            <div style={{ width: `${1600 * scale}px`, height: `${1000 * scale}px`, position: 'relative' }}>
                <style>
                    {`
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Oswald:wght@400;500;600;700&display=swap');
                        .v4-dossier {
                            font-family: 'Inter', sans-serif;
                            background-color: #060D1F;
                        }
                        .v4-noise {
                            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                            opacity: 0.04;
                            mix-blend-mode: overlay;
                        }
                        .v4-pitch-lines {
                            background-image: url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' viewBox='0 0 100 65' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='100' height='65' fill='none' stroke='white' stroke-width='0.5'/%3E%3Cline x1='50' y1='0' x2='50' y2='65' stroke='white' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='32.5' r='9.15' fill='none' stroke='white' stroke-width='0.5'/%3E%3Crect x='0' y='13.84' width='16.5' height='37.32' fill='none' stroke='white' stroke-width='0.5'/%3E%3Crect x='83.5' y='13.84' width='16.5' height='37.32' fill='none' stroke='white' stroke-width='0.5'/%3E%3Crect x='0' y='24.84' width='5.5' height='15.32' fill='none' stroke='white' stroke-width='0.5'/%3E%3Crect x='94.5' y='24.84' width='5.5' height='15.32' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E");
                            background-repeat: no-repeat;
                            background-size: cover;
                        }
                    `}
                </style>
                <div 
                    ref={cardRef} 
                    data-report-container="true"
                    className="w-[1600px] min-w-[1600px] h-[1000px] v4-dossier overflow-hidden relative"
                    style={{ 
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                >
                    {/* LAYER 1: Base color applied via v4-dossier class */}

                    {/* LAYER 2: Pitch texture — 11% opacity, clearly visible as design element */}
                    <div className="absolute w-[60%] h-[80%] bottom-[-10%] right-[-10%] v4-pitch-lines opacity-[0.11] pointer-events-none z-[1]" style={{ transform: 'rotate(12deg)' }} />

                    {/* LAYER 3: Atmospheric lighting */}
                    {/* Lime bloom — wider + brighter so player stands in a pool of light */}
                    <div className="absolute w-[1000px] h-[1000px] rounded-full pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle, rgba(200,255,0,0.18) 0%, transparent 65%)', top: '45%', left: '38%', transform: 'translate(-50%, -50%)' }} />
                    {/* Cyan bloom — right data panel */}
                    <div className="absolute w-[600px] h-[600px] rounded-full pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle, rgba(0,100,255,0.08) 0%, transparent 70%)', top: '20%', left: '85%', transform: 'translate(-50%, -50%)' }} />
                    {/* Motion streak — kinetic energy line at 58% height */}
                    <div className="absolute pointer-events-none z-[1]" style={{ top: '58%', left: '20%', width: '45%', height: '4px', background: 'linear-gradient(90deg, transparent 0%, rgba(200,255,0,0.12) 30%, rgba(200,255,0,0.12) 70%, transparent 100%)' }} />

                    {/* LAYER 4: Vignette */}
                    <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.7) 120%)' }} />

                    {/* LAYER 5: Grain */}
                    <div className="absolute inset-0 v4-noise pointer-events-none z-[1]" />

                    {/* DIAGONAL ACCENT (Z: 2) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[2]">
                        <line x1="15%" y1="85%" x2="45%" y2="100%" stroke="#C8FF00" strokeWidth="3" />
                    </svg>

                    {/* DEAD ZONE 1 — Radar chart + stat pills (left mid, Z:8) */}
                    {(() => {
                        const cx = 90, cy = 90, r = 72;
                        const attrs = [
                            { label: 'PASS', value: evalData.metrics?.passing || 0 },
                            { label: 'SHOOT', value: evalData.metrics?.shooting || 0 },
                            { label: 'CTRL', value: evalData.metrics?.juggling || 0 },
                            { label: 'WEAK', value: evalData.metrics?.weakFoot || 0 },
                            { label: 'TAC', value: Math.round((evalData.metrics?.passing || 0) * 0.9) },
                        ];
                        const n = attrs.length;
                        // Pentagon: angle starts from top (-90deg)
                        const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
                        const pt = (i: number, radius: number) => ({
                            x: cx + radius * Math.cos(angle(i)),
                            y: cy + radius * Math.sin(angle(i)),
                        });
                        // Outer pentagon grid rings
                        const rings = [0.25, 0.5, 0.75, 1.0];
                        const outerPts = attrs.map((_, i) => pt(i, r));
                        const outerPath = outerPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
                        // Data polygon
                        const dataPts = attrs.map((a, i) => pt(i, (a.value / 100) * r));
                        const dataPath = dataPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
                        const accuracy = evalData.metrics?.passing || 0;
                        const power = evalData.metrics?.shooting || 0;
                        return (
                            <div className="absolute z-[8] pointer-events-none" style={{ left: '3%', top: '220px' }}>
                                <svg width="180" height="180" viewBox="0 0 180 180">
                                    {/* Grid rings */}
                                    {rings.map((ring, ri) => {
                                        const rPts = attrs.map((_, i) => pt(i, r * ring));
                                        const rPath = rPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
                                        return <path key={ri} d={rPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
                                    })}
                                    {/* Axis lines */}
                                    {attrs.map((_, i) => {
                                        const p = pt(i, r);
                                        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
                                    })}
                                    {/* Outer pentagon */}
                                    <path d={outerPath} fill="none" stroke="rgba(200,255,0,0.3)" strokeWidth="1.5" />
                                    {/* Data fill */}
                                    <path d={dataPath} fill="rgba(200,255,0,0.08)" stroke="#C8FF00" strokeWidth="1.5" />
                                    {/* Data dots */}
                                    {dataPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#C8FF00" />)}
                                    {/* Labels */}
                                    {attrs.map((a, i) => {
                                        const lp = pt(i, r + 14);
                                        return (
                                            <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                                                style={{ fontSize: '7px', fill: 'rgba(255,255,255,0.7)', fontFamily: 'Inter,sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {a.label}
                                            </text>
                                        );
                                    })}
                                </svg>
                                {/* Stat pills */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Inter,sans-serif' }}>ACCURACY</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', fontFamily: 'Inter,sans-serif' }}>{accuracy}%</span>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Inter,sans-serif' }}>POWER</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'white', fontFamily: 'Inter,sans-serif' }}>{power}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* DEAD ZONE 3 — Vertical watermark on right margin (Z:2) */}
                    <div className="absolute pointer-events-none z-[2]" style={{
                        right: '0.5%', top: '50%', transform: 'translateY(-50%) rotate(90deg)',
                        transformOrigin: 'center center',
                        whiteSpace: 'nowrap',
                        fontSize: '9px', letterSpacing: '0.15em',
                        color: 'rgba(255,255,255,0.06)',
                        textTransform: 'uppercase',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                    }}>ICARUS FOOTBALL SCHOOLS</div>

                    {/* COMPOSITE RATING TEXT (Z: 9) */}
                    <div className="absolute top-[80px] left-1/2 -translate-x-1/2 flex flex-col items-center z-[9]">
                        <span className="text-[9px] tracking-[0.2em] text-white/40 uppercase">COMPOSITE RATING</span>
                        <span className="text-[96px] font-bold text-[#C8FF00] leading-none mt-2">{evalData.overallRating}</span>
                        <div className="w-[80px] h-[1px] bg-[#C8FF00] mt-4" />
                    </div>

                    {/* FLOATING NAME TEXT (Z: 8) */}
                    <div className="absolute top-[90px] left-[3%] flex flex-col z-[8]">
                        <span className="text-[28px] text-white font-normal leading-tight tracking-wide">{toTitleCase(getFirstName(player.fullName))}</span>
                        <span className="text-[52px] text-white font-bold leading-none tracking-wide">{toTitleCase(getLastName(player.fullName))}</span>
                        <div className="flex items-center gap-3 mt-4">
                            <span className="px-3 py-1 bg-[#C8FF00] text-[#050E25] text-[10px] font-bold uppercase rounded-sm">{player.position || 'TBD'}</span>
                            <span className="text-[10px] text-white/40 font-mono tracking-wider">DOB: {formatDate(player.dateOfBirth)}</span>
                        </div>
                    </div>

                    {/* GLASS DATA PANEL (Z: 7) */}
                    <div className="absolute right-[2%] top-[80px] w-[28%] bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] rounded-[16px] p-[24px] flex flex-col gap-[20px] z-[7]">
                        {/* Technical Profile */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-[16px] h-[2px] bg-[#C8FF00]" />
                                <span className="text-[8px] tracking-[0.1em] uppercase text-white/35">TECHNICAL PROFILE</span>
                            </div>
                            <div className="flex flex-col">
                                <V4ProgressBar label="PASSING ACCURACY" value={evalData.metrics?.passing || 0} />
                                <V4ProgressBar label="SHOOTING" value={evalData.metrics?.shooting || 0} />
                                <V4ProgressBar label="TECHNICAL CONTROL" value={evalData.metrics?.juggling || 0} />
                                <V4ProgressBar label="WEAK FOOT" value={evalData.metrics?.weakFoot || 0} />
                                <V4ProgressBar label="FIRST TOUCH" value={Math.round(((evalData.metrics?.passing||0) + (evalData.metrics?.juggling||0))/2)} />
                                <V4ProgressBar label="TACTICAL AWARENESS" value={Math.round((evalData.metrics?.passing||0) * 0.9)} />
                            </div>
                        </div>
                        <div className="h-[1px] w-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
                        
                        {/* Physical Metrics */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-[16px] h-[2px] bg-[#00D4FF]" />
                                <span className="text-[8px] tracking-[0.1em] uppercase text-white/35">PHYSICAL METRICS</span>
                            </div>
                            <div className="flex flex-col">
                                <V4ProgressBar label="SPRINT SPEED" value={evalData.timeTrials?.speed || 0} max={35} inverse unit="s" color="#00D4FF" />
                                <V4ProgressBar label="AGILITY" value={evalData.timeTrials?.agility || 0} max={30} inverse unit="s" color="#00D4FF" />
                                <V4ProgressBar label="DRIBBLING" value={evalData.timeTrials?.dribbling || 0} max={40} inverse unit="s" color="#00D4FF" />
                                <V4ProgressBar label="ENDURANCE" value={evalData.metrics?.beepTest || 0} max={100} unit="" color="#00D4FF" />
                            </div>
                        </div>
                        <div className="h-[1px] w-full" style={{ background: 'rgba(255,255,255,0.1)' }} />

                        {/* Development Priorities */}
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-[16px] h-[2px] bg-[#C8FF00]" />
                                <span className="text-[8px] tracking-[0.1em] uppercase text-white/35">TECHNICAL DEVELOPMENT PRIORITIES</span>
                            </div>
                            <ul className="flex flex-col gap-3 mb-5">
                                {(evalData.developmentAreas?.length ? evalData.developmentAreas : ['Requires tactical maturation', 'Positional discipline']).slice(0, 3).map((area, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-[#C8FF00] text-[11px] leading-tight mt-[1px]">▸</span>
                                        <span className="text-[11px] text-white leading-tight">{area}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex flex-col">
                                <span className="text-[8px] tracking-[0.1em] uppercase text-white/35 flex items-center gap-2 mb-2">
                                    PROGRESSION LEVEL <span className="text-[#C8FF00] font-bold text-[9px] ml-1">LEVEL 3 / 5</span>
                                </span>
                                <div className="flex gap-[4px] w-[140px]">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className={`h-[4px] flex-1 rounded-[1px] ${i <= 3 ? 'bg-[#C8FF00]' : 'bg-white/[0.1]'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="h-[1px] w-full" style={{ background: 'rgba(255,255,255,0.1)' }} />

                        {/* Evaluator's Assessment */}
                        <div className="bg-black/20 rounded-[8px] p-[12px] flex flex-col border border-white/[0.04] mt-auto" style={{ minHeight: '120px' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-[16px] h-[2px] bg-[#00D4FF]" />
                                <span className="text-[8px] text-[#00D4FF] uppercase tracking-[0.1em] font-semibold">EVALUATOR'S ASSESSMENT</span>
                            </div>
                            <div className="text-[11px] italic leading-relaxed flex-1 overflow-hidden" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                {isEditingRemarks ? (
                                    <div className="space-y-3 h-full flex flex-col">
                                        <textarea 
                                            className="w-full flex-1 bg-black/30 border border-white/20 rounded-lg p-2 text-[11px] text-white/90 focus:border-[#C8FF00] outline-none resize-none transition-all"
                                            value={editedRemarks}
                                            onChange={(e) => setEditedRemarks(e.target.value)}
                                            placeholder="Enter professional assessment..."
                                        />
                                        <button 
                                            onClick={handleSaveRemarks}
                                            className="w-full py-2 bg-[#C8FF00] text-[#050E25] rounded-lg text-[10px] font-bold uppercase hover:bg-white transition-all"
                                        >
                                            Save Assessment
                                        </button>
                                    </div>
                                ) : evalData.coachRemarks ? (
                                    <span>{evalData.coachRemarks}</span>
                                ) : (
                                    <span style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>No assessment recorded for this evaluation.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* HEADER BAR (Z: 6) */}
                    <div className="absolute top-0 left-0 right-0 h-[56px] bg-black/40 backdrop-blur-[8px] border-b border-[#C8FF00]/30 px-8 flex justify-between items-center z-[6]">
                        <div className="flex items-center gap-4">
                            <Shield className="text-white h-[24px] w-[24px]" />
                            <div className="w-[1px] h-[24px] bg-[#C8FF00]" />
                            <span className="text-[10px] text-white tracking-[0.1em] uppercase">ICARUS FOOTBALL SCHOOLS</span>
                            <span className="text-[10px] text-white/40">·</span>
                            <span className="text-[10px] text-white/40 tracking-[0.1em] uppercase">PLAYER SCOUTING REPORT</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] text-white/35 font-mono tracking-widest">DOCUMENT REF: ICR-{player.memberId || '0000'}-{new Date().getFullYear()}</span>
                            <div className="px-3 py-1 bg-[#8B0000] rounded-full shadow-[0_0_8px_rgba(139,0,0,0.5)]">
                                <span className="text-[8px] text-white font-bold uppercase tracking-widest">CONFIDENTIAL</span>
                            </div>
                        </div>
                    </div>

                    {/* BIO STRIP BAR (Z: 5) */}
                    <div className="absolute bottom-0 left-0 right-0 h-[52px] bg-black/50 backdrop-blur-[8px] border-t border-[#C8FF00]/20 px-8 flex justify-between items-center z-[5]">
                        <div className="flex items-center gap-5">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">HT:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{evalData.height || '--'}CM</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">WT:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{evalData.weight || '--'}KG</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">DATE OF BIRTH:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{formatDate(player.dateOfBirth)}</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">ACADEMY:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{settings.name || 'ICARUS FOOTBALL SCHOOLS'}</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">BATCH:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{player.dateOfBirth ? `U-${new Date().getFullYear() - new Date(player.dateOfBirth).getFullYear()}` : 'U-12'}</span>
                            </div>
                            <span className="text-[#C8FF00] text-[10px]">·</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">LOCATION:</span>
                                <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">GAUR CITY, NOIDA</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-white/35 tracking-[0.1em] uppercase">ASSESSING COACH:</span>
                            <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{evalData.coachName || 'STAFF'}</span>
                            <span className="text-[#C8FF00] text-[10px] mx-1">·</span>
                            <span className="text-[9px] text-white tracking-[0.1em] uppercase font-bold">{formatDate(evalData.evaluationDate || new Date())}</span>
                        </div>
                    </div>

                    {/* PLAYER PHOTO (Z: 4) */}
                    <div className="absolute left-[22%] bottom-[20px] h-[85%] z-[4] pointer-events-none flex justify-center items-end">
                        {/* Ground reflection spotlight */}
                        <div className="absolute bottom-[0] left-1/2 -translate-x-1/2 w-[400px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(200,255,0,0.15) 0%, transparent 50%)', transform: 'scaleY(0.25) translateY(150%)' }} />
                        {player.actionPhotoUrl || player.scoutPhoto || evalData.actionPhotoUrl || evalData.actionImageUrl ? (
                            <img src={player.actionPhotoUrl || player.scoutPhoto || evalData.actionPhotoUrl || evalData.actionImageUrl} className="h-full object-contain object-bottom relative z-10 drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]" />
                        ) : (
                            <div className="h-[60%] flex flex-col items-center justify-center text-white/20 mb-[20%]">
                                <Camera size={64} className="mb-4" />
                                <span className="text-[8px] tracking-[0.1em] uppercase text-white/35">NO ACTION PHOTO</span>
                            </div>
                        )}
                    </div>

                    {/* FIFA CARD (Z: 3) */}
                    <div 
                        className="absolute left-[3%] bottom-[5%] w-[260px] h-[390px] bg-black/20 backdrop-blur-[4px] border-[1.5px] border-[#C8FF00]/60 rounded-[16px] overflow-hidden flex flex-col items-center shadow-[0_0_32px_rgba(200,255,0,0.3)] z-[3]"
                    >
                        {/* Top 40% */}
                        <div className="w-full h-[45%] relative flex flex-col px-[14px] pt-[14px] z-10">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[68px] font-bold text-[#C8FF00] font-mono leading-none">{evalData.overallRating}</span>
                                    <span className="text-[12px] font-bold text-[#C8FF00] uppercase mt-1">{player.position || 'TBD'}</span>
                                </div>
                                <Shield className="text-white h-[22px] w-[22px] absolute top-[14px] right-[14px]" />
                            </div>
                        </div>

                        {/* Middle Profile Photo */}
                        <div className="w-full h-[45%] absolute top-[30%] left-0">
                            <img src={player.headshotUrl || player.photoUrl || '/default-avatar.png'} className="w-full h-full object-cover object-top filter contrast-125" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        </div>

                        {/* Bottom 25% */}
                        <div className="w-full absolute bottom-0 left-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end items-center px-3 pb-3 pt-6">
                            <span className="text-[13px] font-bold text-white uppercase text-center leading-tight line-clamp-1">{player.fullName}</span>
                            
                            <div className="grid grid-cols-4 gap-1 w-full mt-2">
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] uppercase text-white/50">PAC</span>
                                    <span className="text-[11px] font-bold text-white">{Math.max(0, evalData.timeTrials?.speed ? Math.round((35 - evalData.timeTrials.speed) / 35 * 99) : 0)}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] uppercase text-white/50">DRI</span>
                                    <span className="text-[11px] font-bold text-white">{Math.max(0, evalData.metrics?.juggling || 0)}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] uppercase text-white/50">SHO</span>
                                    <span className="text-[11px] font-bold text-white">{Math.max(0, evalData.metrics?.shooting || 0)}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[7px] uppercase text-white/50">DEF</span>
                                    <span className="text-[11px] font-bold text-white">{Math.max(0, evalData.metrics?.passing || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default EvaluationCard;
