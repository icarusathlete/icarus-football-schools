
import React, { useRef, useState } from 'react';
import { Player, AcademySettings, PlayerEvaluation } from '../types';
import { Trophy, Star, TrendingUp, TrendingDown, Activity, Target, Shield, Download, Loader2, PlayCircle, Timer, Zap, Ruler, Weight, Calendar } from 'lucide-react';
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
    <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-sm">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Trophy className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-800">No Scout Report Available</h3>
      <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">A coach needs to complete a performance evaluation for this player before a report card can be generated.</p>
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
            backgroundColor: '#020617', // Match slate-950 background
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
  const CyberProgressBar = ({ value, label, color = 'bg-cyan-500' }: { value: number, label: string, color?: string }) => (
      <div className="relative pt-1 group">
          <div className="flex justify-between items-end mb-1.5">
              <span className="text-[10px] font-bold text-cyan-200/60 uppercase tracking-[0.2em] group-hover:text-cyan-200 transition-colors">{label}</span>
              <span className={`text-sm font-mono font-bold text-white`}>{value}</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-sm overflow-hidden border border-white/5 relative">
              <div 
                className={`h-full ${color} shadow-[0_0_15px_currentColor] relative`} 
                style={{ width: `${value}%` }} 
              >
                  <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50"></div>
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
                className="bg-cyan-500 text-slate-950 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-cyan-400 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
                {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />} 
                Download Report PDF
            </button>
        </div>

        {/* --- MAIN REPORT CANVAS --- */}
        <div ref={cardRef} className="max-w-6xl mx-auto font-sans bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl relative select-none p-12">
            
            {/* Background Textures */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 -z-20" />
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] -z-10" />
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[120px] -z-10 translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] -z-10 -translate-x-1/3 translate-y-1/3" />

            {/* Header Line */}
            <div className="flex justify-between items-end border-b border-slate-800/50 pb-8 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Activity size={24} className="text-cyan-500" />
                        <span className="text-xs font-black text-cyan-500 uppercase tracking-[0.3em]">Official Analysis</span>
                    </div>
                    <h1 className="text-5xl font-black text-white italic tracking-tighter" style={{ fontFamily: 'Orbitron' }}>
                        SCOUTING <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">REPORT</span>
                    </h1>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Generated ID</div>
                    <div className="font-mono text-xl text-cyan-300 font-bold">{player.memberId}</div>
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
                                <span className="text-6xl font-black text-white leading-none font-[Orbitron] drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                                    {evalData.overallRating}
                                </span>
                                <span className="text-xl font-bold text-cyan-400 uppercase tracking-wider mt-1">{player.position.substring(0,3)}</span>
                                <div className="w-10 h-0.5 bg-white/20 my-4"></div>
                                <div className="w-10 h-10 opacity-90">
                                    {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain" /> : <Shield className="w-full h-full text-white" />}
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
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight font-[Orbitron] drop-shadow-lg truncate">
                                {player.fullName}
                            </h2>
                            <div className="w-1/2 mx-auto h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-4 opacity-60"></div>
                        </div>

                        {/* Card Stats Grid */}
                        <div className="relative z-10 px-8 mt-8">
                            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-white font-[Orbitron]">
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{evalData.metrics.passing}</span>
                                    <span className="text-xs font-bold text-cyan-200/60 tracking-widest uppercase group-hover/stat:text-cyan-400 transition-colors">PAS</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{evalData.metrics.shooting}</span>
                                    <span className="text-xs font-bold text-cyan-200/60 tracking-widest uppercase group-hover/stat:text-cyan-400 transition-colors">SHO</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{evalData.metrics.juggling}</span>
                                    <span className="text-xs font-bold text-cyan-200/60 tracking-widest uppercase group-hover/stat:text-cyan-400 transition-colors">DRI</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.rating}</span>
                                    <span className="text-xs font-bold text-cyan-200/60 tracking-widest uppercase group-hover/stat:text-cyan-400 transition-colors">RTG</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.matches}</span>
                                    <span className="text-xs font-bold text-cyan-200/60 tracking-widest uppercase group-hover/stat:text-cyan-400 transition-colors">MAT</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.starts || 0}</span>
                                    <span className="text-xs font-bold text-cyan-200/60 tracking-widest uppercase group-hover/stat:text-cyan-400 transition-colors">XI</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.goals}</span>
                                    <span className="text-xs font-bold text-cyan-200/60 tracking-widest uppercase group-hover/stat:text-cyan-400 transition-colors">GOL</span>
                                </div>
                                <div className="flex justify-between items-center group/stat border-b border-white/5 pb-1">
                                    <span className="font-bold text-xl">{stats.assists}</span>
                                    <span className="text-xs font-bold text-cyan-200/60 tracking-widest uppercase group-hover/stat:text-cyan-400 transition-colors">AST</span>
                                </div>
                            </div>
                        </div>

                        {/* Card Bottom Deco */}
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center opacity-40 gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_currentColor]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_currentColor]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_currentColor]"></div>
                        </div>
                    </div>

                    {/* Metadata under card */}
                    <div className="mt-8 text-center">
                        <div className="inline-flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-6 py-3 rounded-2xl backdrop-blur-sm shadow-inner">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{new Date(evalData.evaluationDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: REPORT DATA */}
                <div className="lg:col-span-7 flex flex-col gap-10 justify-center">
                    
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Technical DNA */}
                        <div className="bg-slate-900/40 border border-slate-800/60 p-8 rounded-[2rem] backdrop-blur-md relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Target size={80} className="text-white" />
                            </div>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2 border-b border-white/5 pb-3">
                                <Target size={16} className="text-cyan-400" /> Technical DNA
                            </h3>
                            <div className="space-y-6 relative z-10">
                                <CyberProgressBar label="Passing & Vision" value={evalData.metrics.passing} color="bg-cyan-500" />
                                <CyberProgressBar label="Finishing" value={evalData.metrics.shooting} color="bg-blue-500" />
                                <CyberProgressBar label="Ball Control" value={evalData.metrics.juggling} color="bg-purple-500" />
                                <CyberProgressBar label="Weak Foot" value={evalData.metrics.weakFoot} color="bg-orange-500" />
                                <CyberProgressBar label="Aerial / Long Pass" value={evalData.metrics.longPass} color="bg-emerald-500" />
                            </div>
                        </div>

                        {/* Physical Engine */}
                        <div className="flex flex-col gap-6">
                            <div className="bg-slate-900/40 border border-slate-800/60 p-8 rounded-[2rem] backdrop-blur-md flex-1 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Zap size={80} className="text-white" />
                                </div>
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2 border-b border-white/5 pb-3">
                                    <Zap size={16} className="text-yellow-400" /> Physical Engine
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-900 rounded-lg text-slate-400"><Timer size={16} /></div>
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">100m Pace</span>
                                        </div>
                                        <span className="text-xl font-mono font-black text-white">{evalData.timeTrials.speed}<span className="text-sm text-slate-500 ml-1">s</span></span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-900 rounded-lg text-slate-400"><Activity size={16} /></div>
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Agility</span>
                                        </div>
                                        <span className="text-xl font-mono font-black text-white">{evalData.timeTrials.agility}<span className="text-sm text-slate-500 ml-1">s</span></span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5 shadow-inner">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-900 rounded-lg text-slate-400"><PlayCircle size={16} /></div>
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Dribble</span>
                                        </div>
                                        <span className="text-xl font-mono font-black text-white">{evalData.timeTrials.dribbling}<span className="text-sm text-slate-500 ml-1">s</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Anthropometry Mini */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl flex flex-col items-center justify-center">
                                    <Ruler size={16} className="text-slate-500 mb-2" />
                                    <span className="text-xl font-black text-white">{evalData.height} <span className="text-xs text-slate-500">cm</span></span>
                                </div>
                                <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl flex flex-col items-center justify-center">
                                    <Weight size={16} className="text-slate-500 mb-2" />
                                    <span className="text-xl font-black text-white">{evalData.weight} <span className="text-xs text-slate-500">kg</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analyst Notes */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-8 rounded-[2rem] relative overflow-hidden mt-auto shadow-lg">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Shield size={100} className="text-white" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Shield size={12} /> Development Focus Areas
                        </h3>
                        <div className="flex flex-wrap gap-3 relative z-10 mb-8">
                            {evalData.developmentAreas.map(area => (
                                <span key={area} className="px-5 py-2.5 bg-slate-800/80 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-xl border border-cyan-900/30 shadow-sm backdrop-blur-md">
                                    {area}
                                </span>
                            ))}
                            {evalData.developmentAreas.length === 0 && <span className="text-xs text-slate-600 italic">No specific areas tagged by coaching staff.</span>}
                        </div>
                        
                        <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                            <div className="text-xs text-slate-600 font-medium italic">
                                "Performance metrics are evaluated based on academy standards."
                            </div>
                            <div className="text-right">
                                <div className="font-calendary text-2xl text-slate-500 opacity-80 italic pr-4" style={{ fontFamily: 'cursive' }}>{evalData.coachName}</div>
                                <div className="h-px w-40 bg-slate-700 mt-2 mb-1 ml-auto"></div>
                                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Head Coach Signature</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
