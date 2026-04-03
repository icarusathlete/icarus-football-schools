
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
      starts?: number;
  }
}

export const EvaluationCard: React.FC<EvaluationCardProps> = ({ player, settings, stats = { goals: 0, assists: 0, matches: 0, rating: 0, attendanceRate: 0, starts: 0 } }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const evalData = player.evaluation;
  
  if (!evalData) return (
    <div className="p-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-brand-100 shadow-2xl">
      <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-100 shadow-inner">
        <Trophy className="w-10 h-10 text-brand-300" />
      </div>
      <h3 className="text-2xl font-black text-brand-950 italic uppercase tracking-tight">No Scout <span className="text-brand-500">Report Found</span></h3>
      <p className="text-brand-500 text-sm mt-3 max-w-sm mx-auto font-medium italic opacity-70">A formal player evaluation is required to generate this performance record.</p>
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
            backgroundColor: '#FFFFFF',
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

  const CyberProgressBar = ({ value, label, color = 'bg-brand-500' }: { value: number, label: string, color?: string }) => (
      <div className="relative pt-1 group">
          <div className="flex justify-between items-end mb-1.5">
              <span className="text-[10px] font-black text-brand-950 uppercase tracking-[0.2em] group-hover:text-brand-500 transition-colors italic">{label}</span>
              <span className={`text-sm font-black italic text-brand-950`}>{value}</span>
          </div>
          <div className="h-2.5 w-full bg-brand-50 rounded-full overflow-hidden border border-brand-100 relative">
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
        <div className="flex justify-end">
            <button 
                onClick={handleDownloadPDF} 
                disabled={isGenerating}
                className="bg-brand-500 text-brand-950 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-500/20 flex items-center gap-3 disabled:opacity-50 italic"
            >
                {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />} 
                EXPORT PERFORMANCE RECORD
            </button>
        </div>

        <div ref={cardRef} className="max-w-6xl mx-auto font-display bg-white rounded-[4rem] overflow-hidden border border-brand-100 shadow-3xl relative select-none p-16">
            
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,200,255,0.05),transparent_70%)] opacity-50" />
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-[150px] -z-10 translate-x-1/3 -translate-y-1/3" />

            <div className="flex justify-between items-end border-b border-brand-100 pb-12 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <Activity size={28} className="text-brand-500" />
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.5em] italic">MEMBER PERFORMANCE ANALYSIS</span>
                    </div>
                    <h1 className="text-6xl font-black text-brand-950 italic tracking-tighter uppercase leading-none">
                        SCOUT <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">REPORT</span>
                    </h1>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black text-brand-950 uppercase tracking-[0.3em] mb-2 italic">MEMBER IDENTIFIER</div>
                    <div className="text-2xl text-brand-500 font-black tracking-widest leading-none">{player.memberId}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
                
                <div className="lg:col-span-4 flex flex-col items-center">
                    <div className="relative w-full aspect-[2/3] rounded-[3rem] overflow-hidden border-[6px] border-brand-500 shadow-2xl bg-brand-500 transform hover:scale-[1.01] transition-transform duration-500">
                        <div className="absolute inset-0 bg-gradient-to-b from-brand-400 via-brand-500 to-brand-600"></div>
                        <div className="absolute inset-3 border-2 border-white/20 rounded-[2.5rem] pointer-events-none"></div>

                        <div className="relative z-10 p-8 flex items-start justify-between">
                            <div className="flex flex-col items-center mt-2">
                                <span className="text-7xl font-black text-brand-950 leading-none italic drop-shadow-sm">
                                    {evalData.overallRating}
                                </span>
                                <span className="text-xl font-black text-white uppercase tracking-widest mt-2 italic">{player.position.substring(0,3)}</span>
                                <div className="w-12 h-1 bg-white/20 my-6"></div>
                                <div className="w-12 h-12">
                                    {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain rounded-full brightness-0 invert" /> : <Shield className="w-full h-full text-white" />}
                                </div>
                            </div>
                            
                            <div className="absolute right-[-40px] top-[40px] w-72 h-72 z-0 pointer-events-none">
                                <img 
                                    src={player.photoUrl} 
                                    className="w-full h-full object-cover scale-110"
                                    style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
                                />
                            </div>
                        </div>

                        <div className="relative z-10 mt-44 text-center px-4">
                            <h2 className="text-3xl font-black text-brand-950 uppercase tracking-tighter italic truncate">
                                {player.fullName}
                            </h2>
                            <div className="w-2/3 mx-auto h-[2px] bg-brand-950/20 mt-4"></div>
                        </div>

                        <div className="relative z-10 px-8 mt-10">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-brand-950 italic">
                                <div className="flex justify-between items-center border-b border-brand-950/10 pb-1">
                                    <span className="font-black text-xl">{evalData.metrics.passing}</span>
                                    <span className="text-[10px] font-black opacity-60">PAS</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-brand-950/10 pb-1">
                                    <span className="font-black text-xl">{evalData.metrics.shooting}</span>
                                    <span className="text-[10px] font-black opacity-60">SHO</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-brand-950/10 pb-1">
                                    <span className="font-black text-xl">{evalData.metrics.juggling}</span>
                                    <span className="text-[10px] font-black opacity-60">DRI</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-brand-950/10 pb-1">
                                    <span className="font-black text-xl">{stats.rating}</span>
                                    <span className="text-[10px] font-black opacity-60">RTG</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <div className="inline-flex items-center gap-4 bg-brand-50 border border-brand-100 px-8 py-4 rounded-3xl shadow-xl italic">
                            <Calendar size={18} className="text-brand-500" />
                            <span className="text-[10px] font-black text-brand-950 uppercase tracking-[0.3em]">{new Date(evalData.evaluationDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-brand-50 border border-brand-100 p-10 rounded-[3rem] shadow-xl relative overflow-hidden group">
                            <h3 className="text-[10px] font-black text-brand-950 uppercase tracking-[0.4em] mb-10 flex items-center gap-4 border-b border-brand-100 pb-5 italic">
                                <Target size={18} className="text-brand-500" /> TECHNICAL METRICS
                            </h3>
                            <div className="space-y-8 relative z-10">
                                <CyberProgressBar label="Passing Accuracy" value={evalData.metrics.passing} color="bg-brand-500" />
                                <CyberProgressBar label="Shooting Power" value={evalData.metrics.shooting} color="bg-blue-500" />
                                <CyberProgressBar label="Ball Control" value={evalData.metrics.juggling} color="bg-brand-950" />
                                <CyberProgressBar label="Weak Foot" value={evalData.metrics.weakFoot} color="bg-brand-400" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="bg-brand-50 border border-brand-100 p-10 rounded-[3rem] shadow-xl flex-1 relative overflow-hidden group">
                                <h3 className="text-[10px] font-black text-brand-950 uppercase tracking-[0.4em] mb-10 flex items-center gap-4 border-b border-brand-100 pb-5 italic">
                                    <Zap size={18} className="text-brand-500" /> PHYSICAL ENGINE
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-brand-100 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <Timer size={18} className="text-brand-500" />
                                            <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest italic">100m PACE</span>
                                        </div>
                                        <span className="text-2xl font-black text-brand-950 italic">{evalData.timeTrials.speed}<span className="text-xs text-brand-300 ml-1">S</span></span>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-brand-100 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <Gauge size={18} className="text-brand-500" />
                                            <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest italic">AGILITY</span>
                                        </div>
                                        <span className="text-2xl font-black text-brand-950 italic">{evalData.timeTrials.agility}<span className="text-xs text-brand-300 ml-1">S</span></span>
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-brand-100 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <PlayCircle size={18} className="text-brand-500" />
                                            <span className="text-[10px] font-black text-brand-300 uppercase tracking-widest italic">DRIBBLING</span>
                                        </div>
                                        <span className="text-2xl font-black text-brand-950 italic">{evalData.timeTrials.dribbling}<span className="text-xs text-brand-300 ml-1">S</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-brand-50 border border-brand-100 p-12 rounded-[3.5rem] relative overflow-hidden mt-auto shadow-xl">
                        <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.5em] mb-8 flex items-center gap-4 italic border-b border-brand-100 pb-5">
                            <Shield size={18} /> DEVELOPMENT FOCUS AREAS
                        </h3>
                        <div className="flex flex-wrap gap-4 relative z-10 mb-12">
                            {evalData.developmentAreas.map(area => (
                                <span key={area} className="px-6 py-3 bg-white text-brand-950 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-brand-100 shadow-sm italic">
                                    {area}
                                </span>
                            ))}
                        </div>
                        
                        <div className="pt-8 border-t border-brand-100 flex justify-between items-end">
                            <div className="text-[10px] text-brand-300 font-black italic uppercase tracking-widest max-w-[240px]">
                                "Performance metrics verified against current academy standards."
                            </div>
                            <div className="text-right">
                                <div className="text-3xl text-brand-500 italic pr-6" style={{ fontFamily: 'cursive' }}>{evalData.coachName}</div>
                                <div className="h-px w-48 bg-brand-100 mt-4 mb-2 ml-auto"></div>
                                <div className="text-[10px] font-black text-brand-300 uppercase tracking-[0.3em] italic">COACH SIGN-OFF</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
