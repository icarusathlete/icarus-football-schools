
import React, { useRef, useState, useEffect } from 'react';
import { Player, AcademySettings, PlayerEvaluation, AttendanceRecord, Match } from '../types';
import { Trophy, Star, Shield, Download, Loader2, Timer, Zap, Calendar, Gauge, Award, Target, Brain, Info, Footprints, Activity, Camera, Quote, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GeminiService } from '../services/geminiService';

interface EvaluationCardProps {
  player: Player;
  settings: AcademySettings;
  attendance?: AttendanceRecord[];
  matches?: Match[];
  onClose?: () => void;
  isCoach?: boolean;
}

// Custom Circular Gauge Component
const CircularGauge = ({ value, label, icon: Icon, color = '#2ae500' }: { value: number, label: string, icon: any, color?: string }) => {
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center group cursor-help">
            <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="6"
                        fill="transparent"
                    />
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke={color}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={circumference}
                        style={{ 
                            strokeDashoffset: offset, 
                            transition: 'stroke-dashoffset 1.5s ease-out',
                            filter: `drop-shadow(0 0 6px ${color})`
                        }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-white leading-none leading-none">{value}</span>
                </div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">{label}</span>
        </div>
    );
};

// Physical Engine Bar
const PhysicalBar = ({ value, label, max = 100, unit = '', inverse = false }: { value: number, label: string, max?: number, unit?: string, inverse?: boolean }) => {
    // For time trials, lower is better. Normalize for visualization.
    const percentage = inverse ? ((max - value) / max) * 100 : (value / max) * 100;
    
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</span>
                <span className="text-xs font-black text-cyan-400 italic">{value}{unit}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
                <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
            </div>
        </div>
    );
};

export const EvaluationCard: React.FC<EvaluationCardProps> = ({ player, settings, attendance = [], matches = [], onClose, isCoach }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const evalData = player?.evaluation;
  
  useEffect(() => {
    if (evalData && !aiReport && player?.id) {
      handleGenerateAIReport();
    }
  }, [player?.id, evalData]);

  const handleGenerateAIReport = async () => {
    setIsLoadingAI(true);
    try {
      const report = await GeminiService.generateReportCard(player, attendance, matches);
      setAiReport(report);
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (!player || !evalData) return (
    <div className="p-12 text-center bg-brand-950/20 rounded-[2.5rem] border-2 border-dashed border-brand-500/20 shadow-2xl backdrop-blur-xl">
      <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-500/20">
        <Trophy className="w-10 h-10 text-brand-500/40" />
      </div>
      <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">Scout Report <span className="text-brand-500">Not Found</span></h3>
      <p className="text-white/40 text-sm mt-3 max-w-sm mx-auto font-medium">Finalize a player evaluation to generate this professional performance record.</p>
    </div>
  );

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
  };

  const handleDownloadPDF = async () => {
    const element = cardRef.current;
    if (!element) return;
    setIsGenerating(true);

    const originalStyle = element.style.width;
    element.style.width = '1200px';

    try {
        const canvas = await html2canvas(cardRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#040054',
            logging: false,
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const pdf = new jsPDF({
            orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [imgWidth, imgHeight]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        pdf.save(`${player?.fullName?.replace(/\s+/g, '_') || 'PLAYER'}_ICARUS_SCOUT_REPORT.pdf`);
    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Export failed. Large images might be causing an issue.");
    } finally {
        if (element) element.style.width = originalStyle;
        setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
        <div className="flex justify-end gap-3 px-4">
             {onClose && (
                <button 
                    onClick={onClose}
                    className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                    <X size={16}/> EXIT_REPORT
                </button>
             )}
             <button 
                onClick={handleGenerateAIReport}
                disabled={isLoadingAI}
                className="bg-white/5 border border-white/10 text-white px-6 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 group disabled:opacity-50"
            >
                {isLoadingAI ? <Loader2 className="animate-spin" size={16}/> : <Brain size={16} className="group-hover:text-cyan-400 transition-colors" />} 
                REFRESH ANALYTICS
            </button>
            <button 
                onClick={handleDownloadPDF} 
                disabled={isGenerating}
                className="bg-brand-500 text-brand-950 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-500/20 flex items-center gap-3 disabled:opacity-50 italic"
            >
                {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />} 
                DOWNLOAD PORTFOLIO
            </button>
        </div>

        {/* --- PROFESSIONAL SCOUT DOSSIER --- */}
        <div ref={cardRef} className="w-full max-w-[1200px] mx-auto bg-[#040054] text-white p-6 md:p-16 overflow-hidden relative select-none border border-white/10 rounded-3xl md:rounded-[4rem] shadow-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>
            
            {/* Ambient Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(204,255,0,0.08),transparent_60%)]" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-30" />
            
            {/* Watermark HUD */}
            <div className="absolute top-10 right-16 flex items-center gap-4 opacity-20 group">
                <div className="h-0.5 w-12 bg-white/20" />
                <div className="text-[9px] font-mono tracking-[0.6em] uppercase">SYSTEM_ENCODE_BETA_v5.0</div>
                <div className="h-0.5 w-4 bg-brand-500" />
            </div>

            {/* HEADER: Identity & Core Bio */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end mb-16 gap-10">
                <div className="flex items-center gap-8">
                     <div className="relative">
                        <div className="absolute inset-0 bg-brand-500 rounded-2xl blur-2xl opacity-10" />
                        <img 
                            src={player.photoUrl} 
                            className="w-32 h-32 rounded-3xl object-cover border-4 border-white/5 relative z-10 shadow-2xl"
                        />
                        <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-brand-500 text-brand-950 rounded-xl flex items-center justify-center border-4 border-[#040054] z-20">
                            <Star size={16} fill="currentColor" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-brand-500 italic rounded-md">ELITE PROSPECT</span>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] italic">#{player.memberId}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none text-white">
                            {player?.fullName?.split(' ')?.[0] || 'PLAYER'} <span className="text-brand-500">{player?.fullName?.split(' ')?.slice(1).join(' ') || ''}</span>
                        </h1>
                        <div className="flex gap-8">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">FIELD_POSITION</span>
                                <span className="text-sm font-black italic uppercase tracking-widest text-white/80">{player.position}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">AGE_GROUP</span>
                                <span className="text-sm font-black italic uppercase tracking-widest text-white/80">U-{calculateAge(player.dateOfBirth)} ACADEMY</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">HT / WT</span>
                                <span className="text-sm font-black italic uppercase tracking-widest text-white/80">{evalData?.height || '--'}CM / {evalData?.weight || '--'}KG</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.8em] mb-4 italic">COMPOSITE_SCORE</span>
                    <div className="flex items-start gap-4">
                        <div className="text-7xl md:text-9xl font-black italic leading-[0.85] tracking-tighter text-white font-mono" style={{ filter: 'drop-shadow(0 0 20px rgba(204,255,0,0.3))' }}>
                            {evalData.overallRating}
                        </div>
                        <div className="pt-2">
                             <span className="text-brand-500 font-black text-xl italic font-mono">/100</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN PERFORMANCE GRID: THE SYMMETRICAL CORE */}
            <div className="grid grid-cols-12 gap-12 relative z-10 items-center">
                
                {/* 1. LEFT: TECHNICAL DATA HUD (3 Cols) */}
                <div className="col-span-12 lg:col-span-3 space-y-12">
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-10">
                            <Shield size={16} className="text-brand-500" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-white italic">TECHNICAL_INDEX</h3>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-10">
                            <CircularGauge value={evalData?.metrics?.passing || 0} label="Passing" icon={Zap} color="#CCFF00" />
                            <CircularGauge value={evalData?.metrics?.shooting || 0} label="Shooting" icon={Target} color="#CCFF00" />
                            <CircularGauge value={evalData?.metrics?.juggling || 0} label="Control" icon={Footprints} color="#CCFF00" />
                            <CircularGauge value={evalData?.metrics?.weakFoot || 0} label="Weak Foot" icon={Activity} color="#CCFF00" />
                        </div>
                    </div>
                </div>

                {/* 2. CENTER: THE KINETIC HERO (6 Cols) */}
                <div className="col-span-12 lg:col-span-6 flex flex-col items-center justify-center relative min-h-[300px] md:min-h-[550px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(204,255,0,0.02),transparent_70%)] rounded-[4rem]" />
                    
                    {/* The Large Hero Action Image */}
                    {evalData.actionImageUrl ? (
                        <div className="relative w-full h-full flex items-center justify-center group/hero">
                            {/* Decorative Frame */}
                            <div className="absolute inset-0 border-x border-white/5 rounded-3xl md:rounded-[4rem] -z-10" />
                            
                            <img 
                                src={evalData.actionImageUrl} 
                                className="relative z-10 w-full md:w-[110%] h-auto md:h-[110%] object-contain object-bottom drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)] transition-all duration-1000 group-hover/hero:scale-[1.05]"
                                style={{ 
                                    maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
                                }}
                            />
                            
                            {/* Overlay UI Elements */}
                            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                                <div className="inline-flex items-center gap-3 bg-brand-500 text-brand-950 px-4 md:px-8 py-2 md:py-3 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.5em] italic shadow-2xl">
                                    <Camera size={14} /> KINETIC_CAPTURE_LIVE
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-8 opacity-5 border-2 border-dashed border-white/10 w-full h-[300px] md:h-[500px] rounded-3xl md:rounded-[4rem]">
                            <Camera size={80} strokeWidth={0.5} />
                            <span className="text-[10px] md:text-[14px] font-black uppercase tracking-[1em] md:tracking-[1.5em] italic">SIGNAL_LOST:UPLOAD_HERO_ASSET</span>
                        </div>
                    )}
                </div>

                {/* 3. RIGHT: PHYSICAL DATA HUD (3 Cols) */}
                <div className="col-span-12 lg:col-span-3 space-y-12">
                   <div className="relative">
                        <div className="flex items-center gap-3 mb-10 justify-end text-right">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-white italic">PHYSICAL_ENGINE</h3>
                            <Gauge size={16} className="text-brand-500" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-12">
                            <PhysicalBar value={evalData?.timeTrials?.speed || 7.0} label="SPRINT SPEED" unit="s" max={7.0} inverse />
                            <PhysicalBar value={evalData?.timeTrials?.agility || 24.0} label="AGILITY DRILL" unit="s" max={24.0} inverse />
                            <PhysicalBar value={evalData?.timeTrials?.dribbling || 28.0} label="DRIBBLING" unit="s" max={28.0} inverse />
                            <PhysicalBar value={evalData?.metrics?.beepTest || 0} label="STAMINA" max={100} />
                        </div>
                        
                        <div className="space-y-12">
                            {/* Level Progress */}
                            <div className="pt-10 border-t border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] italic">DEVELOPMENT_STAGE</span>
                                    <span className="text-xs font-black italic text-brand-500">LEVEL {Math.floor(evalData.level / 10)}</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1px]">
                                    <div className="h-full bg-brand-500 shadow-[0_0_20px_rgba(204,255,0,0.6)] transition-all duration-1000" style={{ width: `${evalData.level}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                {/* Qualitative Assessments: Coach & AI */}
                <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    {/* Coach Verdict - Elite Executive Assessment */}
                    <div className="bg-[#050066] p-8 md:p-12 rounded-3xl md:rounded-[3.5rem] border border-brand-500/30 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-700 pointer-events-none">
                            <Award size={140} />
                        </div>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-2 rounded-xl bg-brand-500/20 text-brand-500">
                                <Award size={18} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.5em] text-brand-500 italic">OFFICIAL_TECHNICAL_VERDICT</h4>
                        </div>
                        <div className="min-h-[160px] relative">
                            <div className="absolute -top-4 -left-2 text-brand-500/10"><Quote size={32} /></div>
                            {evalData.coachRemarks ? (
                                <p className="text-base md:text-xl font-medium italic text-white/90 leading-relaxed tracking-tight relative z-10" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                    {evalData.coachRemarks}
                                </p>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                                    <Info size={24} className="text-white/10" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20 italic">AWAITING_LEAD_COACH_INPUT</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em]">VALIDATION_STAMP</span>
                                <span className="text-[9px] font-bold text-brand-500/60 uppercase tracking-widest">{new Date(evalData.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
                            </div>
                            <div className="h-8 w-[1px] bg-white/10 mx-4" />
                            <div className="flex-1 text-right">
                                <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em]">AUTHORISING_OFFICER</span>
                                <span className="text-[10px] font-black text-white uppercase tracking-wider block">{evalData.coachName || 'ICARUS_DIRECTOR'}</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Verdict (Strategic Analytics) */}
                    <div className="bg-white/[0.03] p-8 md:p-12 rounded-3xl md:rounded-[3rem] border border-white/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform"><Brain size={120} /></div>
                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <Zap size={20} className="text-cyan-400" />
                            <h4 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] text-cyan-400/60 italic">AI_KINETIC_ANALYTICS</h4>
                        </div>
                        <div className="min-h-[140px]">
                            {isLoadingAI ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="animate-spin text-cyan-400" size={32} />
                                    <span className="text-[8px] font-black uppercase tracking-[0.6em] text-white/10">SYNCING_MATRIX...</span>
                                </div>
                            ) : (
                                <p className="text-base md:text-lg font-medium italic text-white/70 leading-relaxed">
                                    {aiReport || 'Performance stream awaiting synchronization.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Priority & Signature Area */}
                <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-4">
                    <div className="bg-white/[0.02] p-8 md:p-10 rounded-3xl md:rounded-[3rem] border border-white/10">
                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <Target size={20} className="text-brand-500" />
                            <h4 className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.5em] text-white/20 italic">STRATEGIC_DIRECTIVES</h4>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {evalData?.developmentAreas?.map(area => (
                                <span key={area} className="px-4 md:px-6 py-2 md:py-3 bg-brand-500/10 text-brand-500 border border-brand-500/20 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-xl italic flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500/40" />
                                    {area}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-4 md:px-6 py-4">
                         <div className="flex-1">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em] block mb-4 md:mb-6 italic">VALIDATION_SIGNAL</span>
                            {evalData.coachSignatureUrl ? (
                                <img src={evalData.coachSignatureUrl} className="h-16 md:h-20 object-contain brightness-200 invert-[0.9] opacity-90 mix-blend-screen scale-110 -ml-4" />
                            ) : (
                                <div className="h-16 md:h-20 flex items-center text-[10px] font-black italic text-white/10 uppercase tracking-[0.8em]">AWAITING_AUTH</div>
                            )}
                        </div>
                        <div className="text-right">
                             <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em] block mb-2 md:mb-3 italic">LEAD_INSTRUCTOR</div>
                            <div className="text-xl md:text-2xl font-black italic text-brand-500 uppercase tracking-tighter leading-none">{evalData.coachName}</div>
                            <div className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mt-3 md:mt-4 font-mono">{evalData.evaluationDate}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Metadata Wrapper */}
            <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40">
                <div className="flex items-center gap-8">
                    <img src="/logo-full.png" className="h-6 grayscale brightness-200" alt="Icarus" />
                    <div className="h-4 w-[1px] bg-white/20" />
                    <div className="text-[9px] font-black uppercase tracking-[0.6em]">ELITE_ACADEMY_SYSTEM_PROTOCOL</div>
                </div>
                <div className="flex gap-10">
                    <div className="text-[9px] font-black uppercase tracking-[0.6em]">EST. 2024</div>
                    <div className="text-[9px] font-black uppercase tracking-[0.6em]">REPORT_ID_{Math.floor(Math.random() * 900000 + 100000)}</div>
                </div>
            </div>

            {/* Final Background Grain Overlay */}
            <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
  );
};
