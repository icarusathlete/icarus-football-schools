
import React, { useRef, useState } from 'react';
import { Player, AcademySettings, PlayerEvaluation } from '../types';
import { Trophy, Star, TrendingUp, TrendingDown, Activity, Target, Shield, Download, Loader2, PlayCircle, Timer, Zap, Ruler, Weight, Calendar, Gauge } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface EvaluationCardProps {
  player: Player;
  settings: AcademySettings;
  stats?: {
      goals: number;
      assists: number;
      matches: number;
      rating: number;
      attendanceRate?: number;
      starts?: number; // Added Starts count
  }
}

export const EvaluationCard: React.FC<EvaluationCardProps> = ({ player, settings, stats = { goals: 0, assists: 0, matches: 0, rating: 0, attendanceRate: 0, starts: 0 } }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const evalData = player.evaluation;
  
  if (!evalData) return (
    <div className="p-12 text-center bg-brand-900 rounded-[2.5rem] border-2 border-dashed border-white/10 shadow-2xl">
      <div className="w-20 h-20 bg-brand-950 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-inner">
        <Trophy className="w-10 h-10 text-brand-700" />
      </div>
      <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">No Scouting <span className="text-brand-500">Log Detected</span></h3>
      <p className="text-brand-500 text-sm mt-3 max-w-sm mx-auto font-medium italic opacity-70">Tactical evaluation protocol required for this operative before a performance dossier can be generated.</p>
    </div>
  );

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
        const canvas = await html2canvas(cardRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#030712', // Match Cosmic Navy
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

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${player.fullName.replace(/\s+/g, '_')}_Scout_Report.pdf`);
    } catch (error) {
        console.error("PDF Generation failed:", error);
        alert("Could not generate PDF. Please ensure all images are loaded.");
    } finally {
        setIsGenerating(false);
    }
  };

  // Helper Component: Cyber Progress Bar
  const CyberProgressBar = ({ value, label, color = 'bg-brand-500' }: { value: number, label: string, color?: string }) => (
      <div className="relative pt-1 group">
          <div className="flex justify-between items-end mb-1.5">
              <span className="text-[10px] font-black text-brand-500/60 uppercase tracking-[0.2em] group-hover:text-brand-500 transition-colors italic">{label}</span>
              <span className={`text-sm font-black italic text-white`}>{value}</span>
          </div>
          <div className="h-2.5 w-full bg-brand-950 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className={`h-full ${color} shadow-[0_0_15px_currentColor] relative rounded-full transition-all duration-1000`} 
                style={{ width: `${value}%` }} 
              >
                  <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/20"></div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex justify-end">
            <button 
                onClick={handleDownloadPDF} 
                disabled={isGenerating}
                className="bg-brand-500 text-brand-950 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand-500/20 flex items-center gap-3 disabled:opacity-50 italic"
            >
                {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />} 
                EXPORT PERFORMANCE DOSSIER
            </button>
        </div>

        {/* --- MAIN REPORT CANVAS --- */}
        <div ref={cardRef} className="max-w-6xl mx-auto font-display bg-brand-950 rounded-[4rem] overflow-hidden border border-white/5 shadow-3xl relative select-none p-16">
            
            {/* Background Textures */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_70%)] opacity-50" />
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] -z-10" />
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-[150px] -z-10 translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime/5 rounded-full blur-[100px] -z-10 -translate-x-1/3 translate-y-1/3" />

            {/* Header Line */}
            <div className="flex justify-between items-end border-b border-white/5 pb-12 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <Activity size={28} className="text-brand-500 animate-pulse" />
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.5em] italic">DEEP TELEMETRY ANALYSIS</span>
                    </div>
                    <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
                        SCOUTING <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">DOSSIER</span>
                    </h1>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] mb-2 italic">PROTOCOL IDENTIFIER</div>
                    <div className="font-mono text-2xl text-brand-500 font-black tracking-widest">{player.memberId}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
                
                {/* LEFT COLUMN: FUT CARD */}
                <div className="lg:col-span-5 flex flex-col items-center">
                    {/* THE FUT CARD */}
                    <div className="relative w-full max-w-[380px] aspect-[2/3] rounded-t-[3rem] rounded-b-[4rem] overflow-hidden border-[4px] border-cyan-300/50 shadow-[0_0_80px_rgba(6,182,212,0.15)] bg-slate-900 transform hover:scale-[1.01] transition-transform duration-500">
                        {/* Card Layers */}
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-950 via-slate-900 to-black"></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent"></div>
                        
                        {/* Inner Line */}
                        <div className="absolute inset-3 border border-white/10 rounded-t-[2.5rem] rounded-b-[3.5rem] pointer-events-none"></div>

                        {/* Top Info */}
                        <div className="relative z-10 p-8 flex items-start justify-between">
                            <div className="flex flex-col items-center mt-2">
                                <span className="text-6xl font-black text-white leading-none italic font-display drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                                    {evalData.overallRating}
                                </span>
                                <span className="text-xl font-black text-brand-500 uppercase tracking-widest mt-2 italic">{player.position.substring(0,3)}</span>
                                <div className="w-12 h-1 bg-brand-500/20 my-6"></div>
                                <div className="w-12 h-12">
                                    {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain rounded-full shadow-2xl" /> : <Shield className="w-full h-full text-white" />}
                                </div>
                            </div>
                            
                            {/* Bigger Player Image Area */}
                            <div className="absolute right-[-20px] top-[20px] w-64 h-64 z-0 pointer-events-none">
                                <img 
                                    src={player.photoUrl} 
                                    className="w-full h-full object-cover drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)] mask-image-gradient scale-110"
                                    style={{ maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }}
                                />
                            </div>
                        </div>

                        {/* Name */}
                        <div className="relative z-10 mt-36 text-center px-4">
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic font-display drop-shadow-lg truncate">
                                {player.fullName}
                            </h2>
                            <div className="w-2/3 mx-auto h-[3px] bg-gradient-to-r from-transparent via-brand-500/50 to-transparent mt-4"></div>
                        </div>

                        {/* Card Stats Grid */}
                        <div className="relative z-10 px-8 mt-10">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-white font-display italic">
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{evalData.metrics.passing}</span>
                                    <span className="text-xs font-bold text-brand-500/60 tracking-[0.2em] group-hover/stat:text-brand-500 transition-colors">PAS</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{evalData.metrics.shooting}</span>
                                    <span className="text-xs font-bold text-brand-500/60 tracking-[0.2em] group-hover/stat:text-brand-500 transition-colors">SHO</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{evalData.metrics.juggling}</span>
                                    <span className="text-xs font-bold text-brand-500/60 tracking-[0.2em] group-hover/stat:text-brand-500 transition-colors">DRI</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.rating}</span>
                                    <span className="text-xs font-bold text-brand-500/60 tracking-[0.2em] group-hover/stat:text-brand-500 transition-colors">RTG</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.matches}</span>
                                    <span className="text-xs font-bold text-brand-500/60 tracking-[0.2em] group-hover/stat:text-brand-500 transition-colors">MAT</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.starts || 0}</span>
                                    <span className="text-xs font-bold text-brand-500/60 tracking-[0.2em] group-hover/stat:text-brand-500 transition-colors">XI</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.goals}</span>
                                    <span className="text-xs font-bold text-brand-500/60 tracking-[0.2em] group-hover/stat:text-brand-500 transition-colors">GOL</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.assists}</span>
                                    <span className="text-xs font-bold text-brand-500/60 tracking-[0.2em] group-hover/stat:text-brand-500 transition-colors">AST</span>
                                </div>
                            </div>
                        </div>

                        {/* Card Bottom Deco */}
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 opacity-60">
                            <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_10px_#0ea5e9]"></div>
                            <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_10px_#0ea5e9]"></div>
                            <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_10px_#0ea5e9]"></div>
                        </div>
                    </div>

                    {/* Metadata under card */}
                    <div className="mt-10 text-center">
                        <div className="inline-flex items-center gap-4 bg-brand-900 border border-white/5 px-8 py-4 rounded-3xl shadow-3xl italic">
                            <Calendar size={18} className="text-brand-500" />
                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">{new Date(evalData.evaluationDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: REPORT DATA */}
                <div className="lg:col-span-7 flex flex-col gap-10 justify-center">
                    
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Technical DNA */}
                        <div className="bg-brand-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                <Target size={120} className="text-white" />
                            </div>
                            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-10 flex items-center gap-4 border-b border-white/5 pb-5 italic">
                                <Target size={18} className="text-brand-500" /> TACTICAL DNA
                            </h3>
                            <div className="space-y-8 relative z-10">
                                <CyberProgressBar label="Strategic Vision" value={evalData.metrics.passing} color="bg-brand-500" />
                                <CyberProgressBar label="Strike Precision" value={evalData.metrics.shooting} color="bg-blue-500" />
                                <CyberProgressBar label="Ball Dominion" value={evalData.metrics.juggling} color="bg-purple-500" />
                                <CyberProgressBar label="Alternate Linkage" value={evalData.metrics.weakFoot} color="bg-orange-500" />
                                <CyberProgressBar label="Long Range Comms" value={evalData.metrics.longPass} color="bg-lime" />
                            </div>
                        </div>

                        {/* Physical Engine */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-brand-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl flex-1 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                    <Zap size={120} className="text-white" />
                                </div>
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-10 flex items-center gap-4 border-b border-white/5 pb-5 italic">
                                    <Zap size={18} className="text-lime" /> PHYSICAL ENGINE
                                </h3>
                                <div className="space-y-5 relative z-10">
                                    <div className="flex items-center justify-between p-5 bg-brand-950 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-brand-900 rounded-xl text-brand-600 shadow-xl"><Timer size={18} /></div>
                                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic">100m PACE</span>
                                        </div>
                                        <span className="text-2xl font-black text-white italic">{evalData.timeTrials.speed}<span className="text-xs text-brand-700 ml-1">S</span></span>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-brand-950 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-brand-900 rounded-xl text-brand-600 shadow-xl"><Gauge size={18} /></div>
                                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic">AGILITY</span>
                                        </div>
                                        <span className="text-2xl font-black text-white italic">{evalData.timeTrials.agility}<span className="text-xs text-brand-700 ml-1">S</span></span>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-brand-950 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-brand-900 rounded-xl text-brand-600 shadow-xl"><PlayCircle size={18} /></div>
                                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest italic">DRIBBLING</span>
                                        </div>
                                        <span className="text-2xl font-black text-white italic">{evalData.timeTrials.dribbling}<span className="text-xs text-brand-700 ml-1">S</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Anthropometry Mini */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-brand-900 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center shadow-inner group hover:border-brand-500/30 transition-all">
                                    <Ruler size={20} className="text-brand-600 mb-3 group-hover:text-brand-500 transition-colors" />
                                    <span className="text-2xl font-black text-white italic">{evalData.height} <span className="text-xs text-brand-700 ml-1 uppercase">CM</span></span>
                                </div>
                                <div className="bg-brand-900 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center shadow-inner group hover:border-brand-500/30 transition-all">
                                    <Weight size={20} className="text-brand-600 mb-3 group-hover:text-brand-500 transition-colors" />
                                    <span className="text-2xl font-black text-white italic">{evalData.weight} <span className="text-xs text-brand-700 ml-1 uppercase">KG</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analyst Notes */}
                    <div className="bg-brand-900 border border-white/5 p-12 rounded-[3.5rem] relative overflow-hidden mt-auto shadow-3xl">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                            <Shield size={160} className="text-white" />
                        </div>
                        <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.5em] mb-8 flex items-center gap-4 italic border-b border-white/5 pb-5">
                            <Shield size={18} /> OPERATIONAL FOCUS AREAS
                        </h3>
                        <div className="flex flex-wrap gap-4 relative z-10 mb-12">
                            {evalData.developmentAreas.map(area => (
                                <span key={area} className="px-6 py-3 bg-brand-950 text-brand-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-brand-500/20 shadow-xl italic transition-all hover:border-brand-500/50">
                                    {area}
                                </span>
                            ))}
                            {evalData.developmentAreas.length === 0 && <span className="text-xs text-brand-700 italic font-medium">No strategic focuses tagged by command staff.</span>}
                        </div>
                        
                        <div className="pt-8 border-t border-white/5 flex justify-between items-end">
                            <div className="text-[10px] text-brand-700 font-black italic uppercase tracking-widest max-w-[240px]">
                                "Performance telemetry verified against Summer 2026 academy standards."
                            </div>
                            <div className="text-right">
                                <div className="text-3xl text-brand-500 opacity-60 italic pr-6" style={{ fontFamily: 'Orbitron' }}>{evalData.coachName}</div>
                                <div className="h-px w-48 bg-brand-700 mt-4 mb-2 ml-auto opacity-30"></div>
                                <div className="text-[10px] font-black text-brand-700 uppercase tracking-[0.3em] italic">COMMAND SIGN-OFF</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
