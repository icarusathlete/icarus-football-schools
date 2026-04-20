
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Player, AttendanceRecord, Match, AttendanceStatus, FeeRecord, ScheduleEvent, AcademySettings, EventType, Drill, User } from '../types';
import { Trophy, Star, Calendar, Brain, DollarSign, Clock, Activity, Shield, CheckCircle2, XCircle, MapPin, Coffee, Zap, PartyPopper, PlayCircle, Download, Phone, Mail, Globe, X, Shirt, Wand2, Sparkles, Target, ArrowRight, UserCheck, ClipboardList, ChevronDown, ChevronUp, Dumbbell, Play, Youtube, Loader2, Users } from 'lucide-react';
import { auth } from '../firebase';
import { EvaluationCard } from './EvaluationCard';
import html2canvas from 'html2canvas';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
} from 'recharts';

interface PlayerPortalProps {
    user: User;
}

const numberToWords = (num: number): string => {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString().length > 9 ? parseFloat(num.toString().slice(0, 9)) : num) === 0) return 'Zero';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (parseInt(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (parseInt(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (parseInt(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (parseInt(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (parseInt(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str + 'Only';
};

export const PlayerPortal: React.FC<PlayerPortalProps> = ({ user }) => {
    const [player, setPlayer] = useState<Player | null>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [viewMode, setViewMode] = useState<'overview' | 'scout'>('overview');
    const [matchAnalysis, setMatchAnalysis] = useState<string | null>(null);
    const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);
    const [feeStatus, setFeeStatus] = useState<FeeRecord | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
    const [allSchedule, setAllSchedule] = useState<ScheduleEvent[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [coaches, setCoaches] = useState<User[]>([]);
    const [eventFilter, setEventFilter] = useState<EventType>('training');
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    const [isAttendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [selectedAttendanceDetail, setSelectedAttendanceDetail] = useState<{date: string, record?: AttendanceRecord, event?: ScheduleEvent} | null>(null);
    const [viewingSessionPlan, setViewingSessionPlan] = useState<ScheduleEvent | null>(null);
    const [motmToday, setMotmToday] = useState<{playerId: string, timestamp: number} | null>(null);
    const [checkedInToday, setCheckedInToday] = useState(false);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const invoiceHiddenRef = useRef<HTMLDivElement>(null);
    const idCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user?.linkedPlayerId) return;
        
        const refreshData = () => {
            const allPlayers = StorageService.getPlayers();
            const p = allPlayers.find(pl => pl.id === user.linkedPlayerId);
            setPlayer(p || null);
            if (p) {
                const allAttendance = StorageService.getAttendance();
                const myAttendance = allAttendance.filter(a => a.playerId === user?.linkedPlayerId);
                setAttendance(myAttendance);
                
                const today = new Date().toISOString().split('T')[0];
                const checkedIn = myAttendance.some(a => a.date === today && a.status === AttendanceStatus.PRESENT);
                setCheckedInToday(checkedIn);
                
                setMotmToday(StorageService.getMOTM(today));
                
                const allMatches = StorageService.getMatches();
                setMatches(allMatches.filter(m => m.playerStats.some(s => s.playerId === user?.linkedPlayerId)));
                
                const currentMonth = new Date().toISOString().slice(0, 7);
                const fees = StorageService.getFees();
                const myFee = fees.find(f => f.playerId === p.id && f.month === currentMonth);
                setFeeStatus(myFee || null);
                
                loadSchedule();
                loadDrills();
                loadCoaches();
            }
        };

        refreshData();
        window.addEventListener('academy_data_update', refreshData);
        const handleSettingsChange = () => setSettings(StorageService.getSettings());
        window.addEventListener('settingsChanged', handleSettingsChange);
        
        return () => {
            window.removeEventListener('academy_data_update', refreshData);
            window.removeEventListener('settingsChanged', handleSettingsChange);
        };
    }, [user]);

    const loadSchedule = () => {
        const schedule = StorageService.getSchedule();
        const now = new Date();
        setAllSchedule(schedule);
        const upcoming = schedule
            .filter(e => new Date(`${e.date}T${e.time}`) > now)
            .sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        setUpcomingEvents(upcoming);
    };
    const loadDrills = () => setDrills(StorageService.getDrills());
    const loadCoaches = () => {
        const allUsers = StorageService.getUsers();
        setCoaches(allUsers.filter(u => u.role === 'coach'));
    };
    const handleSelfCheckIn = async () => {
        if (!user?.linkedPlayerId || isCheckingIn) return;
        setIsCheckingIn(true);
        const today = new Date().toISOString().split('T')[0];
        try {
            await StorageService.savePlayerSelfCheckIn(user.linkedPlayerId, today);
            setCheckedInToday(true);
        } catch (error) {
            alert('Check-in failed. Please try again.');
        } finally {
            setIsCheckingIn(false);
        }
    };
    const handleDayClick = (date: string, record?: AttendanceRecord) => {
        const event = allSchedule.find(e => e.date === date);
        setSelectedAttendanceDetail({ date, record, event });
    };
    const getYouTubeEmbedUrl = (url: string | undefined) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0` : null;
    };
    const handleDownloadInvoice = async () => {
        if (!invoiceHiddenRef.current || !feeStatus?.invoice) return;
        try {
            const canvas = await html2canvas(invoiceHiddenRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Invoice_${feeStatus.invoice.invoiceNo}.png`;
            link.click();
        } catch (e) { alert('Could not generate invoice download.'); }
    };
    const handleDownloadIDCard = async () => {
        if (!idCardRef.current) return;
        try {
            const canvas = await html2canvas(idCardRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', allowTaint: true });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `ID_Card_${player?.memberId}.png`;
            link.click();
        } catch (e) { alert('Could not generate ID Card.'); }
    };

    const calculateTaxes = (total: number) => {
      const base = total / 1.18;
      const cgst = base * 0.09;
      const sgst = base * 0.09;
      return { base: Math.round(base), cgst: Math.round(cgst), sgst: Math.round(sgst), total: total };
    };
    const getKitRequirement = (dateStr: string) => {
        const day = new Date(dateStr).getDay();
        if (day === 1 || day === 3 || day === 5) return { color: 'Blue Kit', style: 'bg-blue-500/5 text-blue-600 border-blue-500/10' };
        if (day === 2 || day === 4) return { color: 'White Kit', style: 'bg-slate-50 text-slate-400 border-slate-200' };
        return { color: 'Training Bib', style: 'bg-orange-500/5 text-orange-600 border-orange-500/10' };
    };

    // Loading State while syncing player data
    if (user?.linkedPlayerId && !player) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
                <div className="relative w-32 h-32 mb-12">
                    <div className="absolute inset-0 rounded-full border-4 border-brand-500/10 border-t-brand-500 animate-spin-slow" />
                    <div className="absolute inset-4 rounded-full border-4 border-slate-100 border-b-slate-300 animate-spin-slow [animation-direction:reverse]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Shield size={32} className="text-brand-500 animate-pulse-slow" />
                    </div>
                </div>
                <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tighter italic mb-4">
                    SYNCING <span className="text-brand-500">PROFILE</span>
                </h2>
                <div className="w-64 h-1 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-brand-600 animate-progress w-full" />
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mt-6 italic">Secure Channel Established - Fetching Athlete Data</p>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="bg-white p-12 max-w-md w-full text-center space-y-8 relative overflow-hidden group rounded-[2.5rem] border border-slate-100 shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity text-slate-900"><Users size={120} /></div>
                    <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20 shadow-2xl">
                        <Shield size={32} className="text-rose-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tighter italic">LINKAGE <span className="text-rose-500">REQUIRED</span></h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Athlete Profile Not Synchronized</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-500 leading-relaxed italic">
                        Your account is currently <span className="text-slate-900 font-bold">Unmapped</span> in our tactical database. Please contact an Administrator to link your login to your Player ID.
                    </div>
                    <button 
                        onClick={() => auth.signOut()}
                        className="w-full py-4 bg-brand-950 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all italic active:scale-95"
                    >
                        Terminate Session
                    </button>
                </div>
            </div>
        );
    }

    const presentCount = attendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;
    const myMatchStats = matches.map(m => {
        const stats = m.playerStats.find(s => s.playerId === player.id);
        return { ...m, myStats: stats };
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastMatch = myMatchStats[0];
    const totalGoals = myMatchStats.reduce((acc, m) => acc + (m.myStats?.goals || 0), 0);
    const totalAssists = myMatchStats.reduce((acc, m) => acc + (m.myStats?.assists || 0), 0);
    const totalStarts = myMatchStats.reduce((acc, m) => acc + (m.myStats?.isStarter ? 1 : 0), 0);
    const avgRating = myMatchStats.length ? (myMatchStats.reduce((acc, m) => acc + (m.myStats?.rating || 0), 0) / myMatchStats.length).toFixed(1) : '0';

    const handleAnalyzeMatch = async () => {
        if (!lastMatch || !player) return;
        setIsAnalyzingMatch(true);
        const analysis = await GeminiService.analyzeMatchPerformance(player, lastMatch, settings.name);
        setMatchAnalysis(analysis);
        setIsAnalyzingMatch(false);
    };

    const filteredEvents = upcomingEvents.filter(e => e.type === eventFilter);
    const taxes = feeStatus?.invoice ? calculateTaxes(feeStatus.invoice.amount) : { base: 0, cgst: 0, sgst: 0, total: 0 };

    return (
        <div className="min-h-screen bg-white p-4 sm:p-8 md:p-12 font-['Manrope'] selection:bg-brand-primary/20 relative overflow-hidden lg:ml-64">
            {/* ─── Tactical Grid Background ────────────────────────────────────────── */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.04]"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg,#0D1B8A 0,#0D1B8A 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#0D1B8A 0,#0D1B8A 1px,transparent 1px,transparent 40px)' }} />
            
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-900/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto space-y-10 relative z-10">

            {/* ─── ID Card Generator (Hidden) ────────────────────────────────────────── */}
            <div className="fixed left-[-9999px] top-0">
                <div ref={idCardRef} className="w-[400px] h-[600px] bg-white relative overflow-hidden flex flex-col items-center p-8 text-brand-950 border-[6px] rounded-[3rem] border-brand-950/90">
                    <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg,#0D1B8A 0,#0D1B8A 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,#0D1B8A 0,#0D1B8A 1px,transparent 1px,transparent 20px)' }} />
                    
                    <div className="relative z-10 flex flex-col items-center w-full h-full">
                        <div className="mt-6 mb-8 text-center">
                            {settings.logoUrl ? <img src={settings.logoUrl} className="w-16 h-16 object-contain mx-auto mb-3" /> : <Shield className="w-16 h-16 text-brand-500 mx-auto mb-3" />}
                            <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{settings.name}</h2>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-500 mt-1">OFFICIAL ATHLETE PASS</p>
                        </div>
                        
                        <div className="relative mb-10">
                            <div className="absolute -inset-2 bg-brand-500/10 rounded-full blur-xl" />
                            <img src={player.photoUrl} className="relative w-48 h-48 object-cover rounded-full border-[6px] border-white shadow-2xl" />
                        </div>

                        <div className="text-center space-y-2 mb-auto">
                            <h1 className="text-3xl font-black uppercase tracking-tight leading-none text-brand-950">{player.fullName}</h1>
                            <p className="text-sm text-brand-500 font-mono font-black italic tracking-widest">{player.memberId}</p>
                        </div>

                        <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-100 flex justify-between items-center mt-6">
                            <div className="text-center"><p className="text-[9px] text-slate-300 uppercase font-black tracking-widest mb-1">Position</p><p className="text-sm font-black text-brand-950 italic">{player.position}</p></div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div className="text-center"><p className="text-[9px] text-slate-300 uppercase font-black tracking-widest mb-1">Batch</p><p className="text-sm font-black text-brand-950 italic">{player.batch}</p></div>
                        </div>
                        
                        <div className="mt-8 text-[8px] font-black text-slate-300 uppercase tracking-[0.5em] italic">ICARUS FOOTBALL ECOSYSTEM</div>
                    </div>
                </div>
            </div>

            {/* ─── Navigation HUD ─────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex p-1.5 rounded-[1.5rem] bg-slate-100/80 border border-slate-200 backdrop-blur-xl gap-1.5 shadow-sm">
                    {( [['overview', 'HUB'], ['scout', 'SCOUT']] as const).map(([m, label]) => (
                        <button key={m} onClick={() => setViewMode(m as any)}
                            className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-2.5 italic
                                ${viewMode === m
                                    ? 'bg-[#042037] text-[#CCFF00] shadow-xl shadow-slate-200 border border-white/10'
                                    : 'text-slate-400 hover:text-slate-900 hover:bg-white/60'}`}>
                            {m === 'scout' ? <Target size={14} /> : <Command size={14} />}
                            {label}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {coaches.slice(0, 3).map((c, i) => (
                            <div key={c.id} className="w-10 h-10 rounded-full border-4 border-white bg-slate-100 overflow-hidden shadow-sm" style={{ zIndex: 3-i }}>
                                <img src={c.photoUrl} className="w-full h-full object-cover" alt="Coach" />
                            </div>
                        ))}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">TACTICAL UNIT</p>
                        <p className="text-[11px] font-black text-brand-950 italic uppercase">Alpha Command</p>
                    </div>
                </div>
            </div>


            {viewMode === 'scout' ? (
              <div className="animate-in slide-in-from-right-8 duration-500">
                <EvaluationCard player={player} settings={settings} attendance={attendance} matches={matches} />
              </div>
            ) : (
                <div className="space-y-10 animate-in slide-in-from-left-8 duration-500">
                    {/* ─── Athlete Hero HUD (Academy Hub Blue Gradient) ────────────────── */}
                    <div className="relative rounded-[3rem] p-10 md:p-16 border border-white/10 shadow-[0_40px_100px_rgba(4,32,55,0.15)] overflow-hidden group bg-gradient-to-br from-[#0A3D62] via-[#042037] to-[#021422]">
                        {/* Background Elements */}
                        <div className="absolute inset-0 opacity-10 mix-blend-overlay"
                             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                            <Shield size={400} className="text-white" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12 text-white">
                            <div className="flex flex-col md:flex-row items-center gap-12">
                                <div className="relative shrink-0">
                                    <div className="absolute -inset-4 bg-[#CCFF00]/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative w-44 h-44 md:w-60 md:h-60 rounded-[2.5rem] p-1.5 bg-gradient-to-br from-white/20 to-transparent border border-white/10 shadow-2xl">
                                        <img src={player.photoUrl} className="w-full h-full rounded-[2rem] object-cover filter saturate-[1.1] contrast-[1.05]" />
                                    </div>
                                    <div className="absolute -bottom-4 -right-4 bg-[#CCFF00] text-[#042037] px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl border-4 border-[#042037] italic">
                                        {player.position}
                                    </div>
                                </div>
                                
                                <div className="text-center md:text-left">
                                    <div className="flex items-center gap-4 mb-6 justify-center md:justify-start">
                                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/10 border border-white/10 backdrop-blur-md">
                                            <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse shadow-[0_0_12px_rgba(204,255,0,0.6)]" />
                                            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] italic">Premier Prospect</span>
                                        </div>
                                        <span className="text-white/20 text-[11px] font-black tracking-[0.4em] uppercase italic">ID: {player.memberId}</span>
                                    </div>
                                    
                                    <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase leading-[0.85] mb-8 italic" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                        {player.fullName.split(' ')[0]}<br/>
                                        <span className="text-[#CCFF00]">{player.fullName.split(' ').slice(1).join(' ')}</span>
                                    </h1>
                                    
                                    <div className="flex flex-wrap items-center gap-10 text-white/50 text-[11px] font-black uppercase tracking-[0.3em] italic">
                                        <span className="flex items-center gap-3"><MapPin size={18} className="text-[#CCFF00]" /> {player.venue || 'CENTRAL HUB'}</span>
                                        <span className="flex items-center gap-3"><Calendar size={18} className="text-[#CCFF00]" /> 2024 OPS</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 w-full xl:w-auto">
                                <button onClick={handleDownloadIDCard} className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all shadow-2xl group/btn text-center backdrop-blur-xl border-dashed">
                                    <PlayCircle size={32} className="text-[#CCFF00] group-hover/btn:scale-110 transition-transform mx-auto mb-4" />
                                    <span className="block text-[9px] font-black text-white/40 group-hover/btn:text-white uppercase tracking-[0.3em] italic">IDENTITY</span>
                                </button>
                                <button onClick={handleDownloadInvoice} disabled={!feeStatus?.invoice} className={`p-8 rounded-[2rem] border transition-all shadow-2xl group/btn text-center backdrop-blur-xl ${feeStatus?.status === 'PAID' ? 'bg-white/5 border-white/10 hover:bg-[#CCFF00] hover:text-[#042037]' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                                    <Receipt size={32} className={`${feeStatus?.status === 'PAID' ? 'text-[#CCFF00] group-hover/btn:text-[#042037]' : 'text-red-500'} group-hover/btn:scale-110 transition-transform mx-auto mb-4`} />
                                    <span className={`block text-[9px] font-black uppercase tracking-[0.3em] italic ${feeStatus?.status === 'PAID' ? 'text-white/40 group-hover/btn:text-[#042037]' : 'text-red-400'}`}>LEDGER</span>
                                </button>
                                <div className="p-8 rounded-[2rem] bg-[#CCFF00] shadow-[0_20px_50px_rgba(204,255,0,0.15)] text-center flex flex-col justify-center border-4 border-[#042037] transform hover:-translate-y-1 transition-transform">
                                    <div className="text-5xl font-black text-[#042037] mb-1 tracking-tighter italic leading-none">{attendanceRate}<span className="text-lg ml-0.5">%</span></div>
                                    <span className="block text-[9px] font-black text-[#042037]/50 uppercase tracking-[0.2em] italic">READINESS</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Command Modules grid ────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Highlights Row */}
                        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Self Check-In Card */}
                            <div className="rounded-[2.5rem] p-10 border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] relative overflow-hidden group bg-white flex flex-col sm:flex-row items-center justify-between gap-8">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000"><UserCheck size={140} className="text-slate-900" /></div>
                                <div className="relative z-10 flex items-center gap-8">
                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 transition-all duration-500 ${checkedInToday ? 'bg-[#CCFF00] border-[#CCFF00] text-[#042037]' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                        <Activity size={36} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-950">
                                            {checkedInToday ? (
                                                <>CHECK-IN <span className="text-[#0D1B8A]">LOGGED</span></>
                                            ) : (
                                                <>DEPLOY <span className="text-brand-500">SIGNAL</span></>
                                            )}
                                        </h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">
                                            {checkedInToday ? 'Operational status: Active at Training' : 'Transmit current location & status'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSelfCheckIn}
                                    disabled={checkedInToday || isCheckingIn}
                                    className={`relative z-10 px-12 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center gap-3 shadow-2xl ${checkedInToday ? 'bg-slate-50 text-slate-300 cursor-default border border-slate-100' : 'bg-[#042037] text-white hover:bg-black shadow-[#042037]/20 active:scale-95'}`}
                                >
                                    {isCheckingIn ? <Loader2 size={16} className="animate-spin" /> : checkedInToday ? <CheckCircle2 size={16} /> : <Zap size={16} className="text-[#CCFF00]" fill="currentColor" />}
                                    {checkedInToday ? 'ACTIVE' : 'SEND CHECK-IN'}
                                </button>
                            </div>

                            {/* MOTM Showcase */}
                            <div className={`rounded-[2.5rem] p-10 border shadow-[0_10px_40px_rgba(0,0,0,0.03)] relative overflow-hidden group transition-all duration-700 sm:flex-row items-center justify-between gap-8 flex flex-col ${motmToday?.playerId === player.id ? 'bg-[#042037] border-white/10' : 'bg-white border-slate-100'}`}>
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={160} className={motmToday?.playerId === player.id ? 'text-white' : 'text-[#042037]'} /></div>
                                <div className="relative z-10 flex items-center gap-8">
                                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 transition-all duration-500 ${motmToday?.playerId === player.id ? 'bg-[#CCFF00] border-[#CCFF00] text-[#042037]' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                        <Trophy size={36} />
                                    </div>
                                    <div>
                                        <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${motmToday?.playerId === player.id ? 'text-white' : 'text-slate-950'}`}>
                                            ACADEMY <span className={motmToday?.playerId === player.id ? 'text-[#CCFF00]' : 'text-brand-500'}>ELITE</span>
                                        </h3>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic ${motmToday?.playerId === player.id ? 'text-white/40' : 'text-slate-400'}`}>
                                            {motmToday?.playerId === player.id ? 'You are recognized as the top performer' : 'Performance recognition module'}
                                        </p>
                                    </div>
                                </div>
                                {motmToday?.playerId === player.id && (
                                    <div className="relative z-10 px-8 py-3 bg-[#CCFF00] text-[#042037] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl animate-pulse">MVP UNIT</div>
                                )}
                            </div>
                        </div>

                        {/* Large Modules Row */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* Operational Schedule */}
                            <div className="rounded-[3rem] p-10 sm:p-12 border border-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.02)] relative overflow-hidden bg-white">
                                <div className="absolute top-0 left-0 w-[6px] h-full bg-[#042037]" />
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                                    <div>
                                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-slate-950 flex items-center gap-5">
                                            <Calendar className="text-brand-500" size={32} /> Schedule Log
                                        </h3>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-2 italic">Official Deployment Tracker</p>
                                    </div>
                                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                        {(['training', 'match'] as const).map(t => (
                                            <button key={t} onClick={() => setEventFilter(t as any)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all ${eventFilter === t ? 'bg-[#042037] text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-900'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="space-y-5">
                                    {filteredEvents.length > 0 ? filteredEvents.map(event => (
                                        <div key={event.id} className="group p-8 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-[#CCFF00]/50 hover:shadow-2xl hover:shadow-slate-200 transition-all flex flex-col md:flex-row items-center justify-between gap-10 hover:-translate-y-1">
                                            <div className="flex items-center gap-10">
                                                <div className="w-20 h-20 bg-white rounded-3xl flex flex-col items-center justify-center font-black border border-slate-100 text-[#042037] shadow-sm transform group-hover:rotate-6 transition-transform">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-sans">{new Date(event.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                                    <span className="text-3xl leading-none font-mono mt-1" style={{ fontFamily: 'Orbitron' }}>{new Date(event.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <div className="font-black text-2xl text-slate-950 italic uppercase tracking-tight group-hover:text-brand-500 transition-colors">{event.title}</div>
                                                    <div className="flex flex-wrap gap-8 mt-3 text-slate-400 text-[11px] font-black uppercase italic tracking-widest">
                                                        <span className="flex items-center gap-3"><Clock size={16} className="text-brand-500" /> {event.time}</span>
                                                        <span className="flex items-center gap-3"><MapPin size={16} className="text-brand-500" /> {event.location}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 w-full md:w-auto">
                                                <button onClick={() => StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'attending')} 
                                                    className={`flex-1 md:px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-3 border ${event.rsvps?.[player.id] === 'attending' ? 'bg-[#CCFF00] text-[#042037] border-[#CCFF00] shadow-xl shadow-[#CCFF00]/20' : 'bg-white text-slate-400 border-slate-100 hover:border-[#CCFF00] hover:text-brand-500'}`}>
                                                    <CheckCircle2 size={18} /> Confirm
                                                </button>
                                                <button onClick={() => StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'declined')} 
                                                    className={`flex-1 md:px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center justify-center gap-3 border ${event.rsvps?.[player.id] === 'declined' ? 'bg-red-500 text-white border-red-500 shadow-xl shadow-red-500/20' : 'bg-white text-slate-400 border-slate-100 hover:border-red-500 hover:text-red-500'}`}>
                                                    <XCircle size={18} /> Decline
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-32 text-center border-4 border-dashed border-slate-50 rounded-[3rem] font-black text-slate-200 uppercase tracking-[0.5em] italic">
                                            NO ACTIVE LOGS
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Performance Intelligence */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="rounded-[3rem] p-12 border border-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.02)] relative overflow-hidden group min-h-[450px] flex flex-col bg-white">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-1000 -rotate-12"><Brain size={300} className="text-slate-900" /></div>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-5 mb-10 text-slate-950">
                                        <Brain className="text-brand-500" size={32} /> Intelligence Engine
                                    </h3>
                                    {matchAnalysis ? (
                                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar flex flex-col">
                                            <div className="prose prose-slate prose-sm max-w-none text-slate-600 italic font-medium leading-relaxed" 
                                                 dangerouslySetInnerHTML={{ __html: matchAnalysis }} />
                                            <button onClick={() => setMatchAnalysis(null)} className="mt-8 text-[10px] font-black text-brand-500 uppercase tracking-widest italic hover:text-brand-600 transition-colors flex items-center gap-2">
                                                <X size={14} /> Clear Analysis
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-center text-center">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-slate-100 group-hover:rotate-12 transition-transform">
                                                <Sparkles size={40} className="text-slate-200" />
                                            </div>
                                            <p className="text-[11px] text-slate-300 font-black uppercase tracking-[0.3em] mb-12 px-10 italic leading-relaxed">Initialize tactical breakdown module for AI-driven performance metrics.</p>
                                            <button onClick={handleAnalyzeMatch} disabled={isAnalyzingMatch} 
                                                className="w-full bg-[#042037] text-white font-black py-6 rounded-[2rem] text-[12px] uppercase tracking-[0.2em] italic hover:bg-black active:scale-95 transition-all shadow-2xl shadow-[#042037]/20 flex items-center justify-center gap-5">
                                                {isAnalyzingMatch ? <Loader2 size={20} className="animate-spin" /> : <><Wand2 size={20} className="text-[#CCFF00]" /> Process Briefing</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="rounded-[3rem] p-12 border border-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.02)] flex flex-col min-h-[450px] bg-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 -rotate-12"><Activity size={300} className="text-[#042037]" /></div>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-5 mb-10 text-slate-950">
                                        <Activity className="text-brand-500" size={32} /> Mission Deck
                                    </h3>
                                    {myMatchStats.length > 0 ? (
                                        <div className="space-y-6 flex-1">
                                        {myMatchStats.slice(0,3).map(m => (
                                            <div key={m.id} className="p-8 bg-slate-50/80 rounded-3xl border border-slate-100 group/item hover:bg-white hover:shadow-xl transition-all">
                                                <div className="flex justify-between items-center mb-5">
                                                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">{new Date(m.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black italic uppercase tracking-widest border ${m.result === 'W' ? 'bg-[#CCFF00]/10 text-brand-600 border-[#CCFF00]/30' : 'bg-red-500/10 text-red-600 border-red-500/30'}`}>{m.result === 'W' ? 'WON' : 'LOST'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="font-black text-2xl text-slate-950 italic uppercase tracking-tighter">vs {m.opponent}</div>
                                                    <div className="text-4xl font-black text-[#042037] font-mono tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{m.scoreFor}<span className="text-slate-200 mx-1">:</span>{m.scoreAgainst}</div>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-100 font-black italic uppercase tracking-[0.5em] py-12">
                                            ZERO DATA
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Performance Side-Bar (Telemetry) */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="bg-[#042037] p-12 rounded-[4rem] shadow-2xl flex flex-col items-center group text-white relative overflow-hidden transform hover:-translate-y-2 transition-transform">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={200} /></div>
                                <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 mb-10 transform group-hover:rotate-12 transition-transform shadow-2xl">
                                    <Trophy className="text-[#CCFF00]" size={60} />
                                </div>
                                <div className="text-center relative z-10">
                                    <div className="text-[12px] font-black uppercase tracking-[0.4em] text-white/40 mb-2 italic">Strike Rate</div>
                                    <div className="text-[100px] font-black italic leading-none font-mono tracking-tighter text-[#CCFF00]" style={{ fontFamily: 'Orbitron' }}>{totalGoals}</div>
                                    <div className="h-2 w-24 bg-[#CCFF00]/20 rounded-full mt-6 mx-auto overflow-hidden">
                                        <div className="h-full bg-[#CCFF00] animate-progress" style={{ width: '70%' }} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rounded-[4rem] border border-slate-100 p-12 shadow-[0_20px_80px_rgba(0,0,0,0.02)] space-y-12 bg-white relative overflow-hidden">
                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-slate-50 text-brand-500 rounded-[1.5rem] shadow-inner border border-slate-100 group-hover:rotate-12 transition-transform"><Star size={32} /></div>
                                        <div className="text-left font-black italic uppercase leading-none">
                                            <span className="text-[11px] text-slate-300 uppercase tracking-widest mb-1 block">Rating</span>
                                            <span className="text-2xl text-slate-950">PRO UNIT</span>
                                        </div>
                                    </div>
                                    <div className="text-6xl font-black text-brand-500 font-mono tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{avgRating}</div>
                                </div>
                                
                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-slate-50 text-brand-500 rounded-[1.5rem] shadow-inner border border-slate-100 group-hover:rotate-12 transition-transform"><Shirt size={32} /></div>
                                        <div className="text-left font-black italic uppercase leading-none">
                                            <span className="text-[11px] text-slate-300 uppercase tracking-widest mb-1 block">Starts</span>
                                            <span className="text-2xl text-slate-950">DEPLOYS</span>
                                        </div>
                                    </div>
                                    <div className="text-6xl font-black text-slate-950 font-mono tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{totalStarts}</div>
                                </div>
                                
                                <div className="flex justify-between items-center pt-12 border-t border-slate-100 group">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-slate-50 text-brand-500 rounded-[1.5rem] shadow-inner border border-slate-100 group-hover:rotate-12 transition-transform"><Activity size={32} /></div>
                                        <div className="text-left font-black italic uppercase leading-none">
                                            <span className="text-[11px] text-slate-300 uppercase tracking-widest mb-1 block">Appearances</span>
                                            <span className="text-2xl text-slate-950">CAPS</span>
                                        </div>
                                    </div>
                                    <div className="text-6xl font-black text-slate-950 font-mono tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{myMatchStats.length}</div>
                                </div>
                            </div>

                            {/* Kit Requirements (Academy Hub Style) */}
                            <div className="rounded-[3rem] p-10 border border-slate-100 shadow-[0_20px_80px_rgba(0,0,0,0.02)] relative overflow-hidden group bg-white">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000"><Shirt size={140} className="text-slate-900" /></div>
                                <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.4em] mb-8 italic">Kit Directive</h4>
                                {upcomingEvents[0] ? (
                                    <div className="flex items-center gap-8 relative z-10">
                                        <div className={`p-6 rounded-3xl border shadow-xl ${getKitRequirement(upcomingEvents[0].date).style}`}>
                                            <Shirt size={32} />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-slate-950 italic uppercase tracking-tighter">{getKitRequirement(upcomingEvents[0].date).color}</div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 italic">Standard Uniform Bio</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-black text-slate-200 uppercase tracking-widest italic py-4">Awaiting next session data…</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden invoice template for download */}
            {feeStatus?.invoice && (
                <div className="fixed left-[-9999px] top-0">
                    <div ref={invoiceHiddenRef} className="bg-white w-[800px] min-h-[1000px] text-brand-950 p-12">
                         <div className="flex justify-between items-start border-b-4 border-brand-950 pb-12 mb-12">
                             <div className="flex items-center gap-6">
                                 {settings.logoUrl ? <img src={settings.logoUrl} className="h-20 object-contain" /> : <Shield className="h-20 w-20" />}
                                 <div>
                                     <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">{settings.name}</h1>
                                     <p className="text-sm font-black uppercase tracking-widest">Official Receipt</p>
                                 </div>
                             </div>
                             <div className="text-right font-black uppercase italic italic text-xs tracking-widest text-brand-300">
                                 <p>Invoice #: {feeStatus.invoice.invoiceNo}</p>
                                 <p>Date: {new Date(feeStatus.invoice.date).toLocaleDateString()}</p>
                             </div>
                         </div>
                         <div className="mb-12">
                             <h3 className="text-xl font-black uppercase italic mb-4">Member Details</h3>
                             <div className="grid grid-cols-2 gap-8 text-sm font-black uppercase italic tracking-widest text-brand-300">
                                 <div><p className="opacity-50 font-bold">NAME</p><p className="text-brand-950">{player.fullName}</p></div>
                                 <div><p className="opacity-50 font-bold">IDENTIFIER</p><p className="text-brand-950">{player.memberId}</p></div>
                                 <div><p className="opacity-50 font-bold">PROGRAM</p><p className="text-brand-950">Academy Training</p></div>
                                 <div><p className="opacity-50 font-bold">VENUE</p><p className="text-brand-950">{player.venue}</p></div>
                             </div>
                         </div>
                         <div className="border-2 border-brand-950 rounded-3xl overflow-hidden mb-12">
                             <table className="w-full text-left font-black uppercase italic">
                                 <thead className="bg-brand-950 text-white">
                                     <tr><th className="p-6">Description</th><th className="p-6 text-right">Amount</th></tr>
                                 </thead>
                                 <tbody className="text-sm">
                                     <tr className="border-b border-brand-100"><td className="p-6">Service Fee (Base)</td><td className="p-6 text-right">₹ {taxes.base}</td></tr>
                                     <tr className="border-b border-brand-100"><td className="p-6">Tax Element</td><td className="p-6 text-right">₹ {taxes.cgst + taxes.sgst}</td></tr>
                                     <tr className="bg-brand-50"><td className="p-6 text-lg font-black italic">Total Settled</td><td className="p-6 text-2xl font-black italic text-right">₹ {taxes.total}</td></tr>
                                 </tbody>
                             </table>
                         </div>
                         <div className="pt-20 border-t border-brand-100 flex justify-between items-end">
                             <div className="text-[10px] font-black uppercase italic tracking-[0.3em] text-brand-300">Automated verification record. No physical signature required.</div>
                             <div className="text-right">
                                 <div className="text-2xl font-black italic text-brand-500 mb-2">{settings.name}</div>
                                 <div className="text-[8px] font-black uppercase tracking-widest text-brand-300">Management Authorization</div>
                             </div>
                         </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

const History = ({ size, className }: { size?: number, className?: string }) => (
    <svg 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);
