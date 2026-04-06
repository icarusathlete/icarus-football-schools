
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
    const [reportCard, setReportCard] = useState<string | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
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

    const handleGenerateReport = async () => {
        setLoadingReport(true);
        const report = await GeminiService.generateReportCard(player, attendance, matches);
        setReportCard(report);
        setLoadingReport(false);
    };
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
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Download Generators Hidden */}
            <div className="fixed left-[-9999px] top-0">
                <div ref={idCardRef} className="w-[320px] h-[500px] bg-white relative overflow-hidden flex flex-col items-center p-6 text-brand-950 border-4 rounded-[2rem] border-brand-500">
                    <div className="relative z-10 flex flex-col items-center w-full h-full">
                        <div className="mt-4 mb-6 text-center">
                            {settings.logoUrl ? <img src={settings.logoUrl} className="w-12 h-12 object-contain mx-auto mb-2" /> : <Shield className="w-12 h-12 text-brand-500 mx-auto mb-2" />}
                            <h2 className="text-xl font-black italic tracking-tighter uppercase">{settings.name.split(' ')[0]}</h2>
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-500">Official Member Pass</p>
                        </div>
                        <img src={player.photoUrl} className="w-40 h-40 object-cover rounded-full border-4 border-brand-50 shadow-xl mb-6" />
                        <div className="text-center space-y-1 mb-auto">
                            <h1 className="text-2xl font-black uppercase tracking-tight leading-none">{player.fullName}</h1>
                            <p className="text-xs text-brand-300 font-mono font-black italic">{player.memberId}</p>
                        </div>
                        <div className="w-full bg-brand-50 rounded-xl p-3 border border-brand-100 flex justify-between items-center mt-4">
                            <div className="text-center"><p className="text-[8px] text-brand-300 uppercase font-black">Season</p><p className="text-xs font-black">2024/25</p></div>
                            <div className="text-center"><p className="text-[8px] text-brand-300 uppercase font-black">Status</p><p className="text-xs font-black text-brand-500">Active</p></div>
                            <div className="text-center"><p className="text-[8px] text-brand-300 uppercase font-black">Position</p><p className="text-xs font-black">{player.position}</p></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex glass-card p-1.5 rounded-xl w-fit border-brand-900/5 bg-white shadow-sm">
              <button 
                onClick={() => setViewMode('overview')} 
                className={`px-8 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'overview' ? 'bg-brand-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                COMMAND CENTER
              </button>
              <button 
                onClick={() => setViewMode('scout')} 
                className={`px-8 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2.5 ${viewMode === 'scout' ? 'bg-brand-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <Shield size={12} className={viewMode === 'scout' ? 'text-brand-500' : ''} /> SCOUT REPORT
              </button>
            </div>

            {viewMode === 'scout' ? (
              <div className="animate-in slide-in-from-right-8 duration-500">
                <EvaluationCard player={player} settings={settings} stats={{ goals: totalGoals, assists: totalAssists, matches: myMatchStats.length, rating: parseFloat(avgRating), attendanceRate, starts: totalStarts }} />
              </div>
            ) : (
                <div className="space-y-8 animate-in slide-in-from-left-8 duration-500">
                    {/* Athlete Hero HUD */}
                    <div className="relative glass-card rounded-2xl p-10 md:p-14 border-brand-900/5 shadow-sm overflow-hidden group bg-white">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-105 transition-transform duration-1000"><Shield size={260} className="text-brand-900" /></div>
                        
                        <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12 text-brand-900">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-all" />
                                    <img src={player.photoUrl} className="relative w-36 h-36 md:w-52 md:h-52 rounded-full border-4 border-brand-900/5 shadow-lg object-cover transform transition-all group-hover:scale-[1.02]" />
                                    <div className="absolute -bottom-2 -right-2 bg-brand-900 text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-lg border-4 border-white">{player.position}</div>
                                </div>
                                <div className="text-center md:text-left">
                                    <div className="flex items-center gap-4 mb-4 justify-center md:justify-start">
                                        <span className="px-3 py-1 bg-brand-900/5 text-brand-500 text-[8px] font-black uppercase tracking-[0.2em] rounded border border-brand-900/5">ELITE PROSPECT</span>
                                        <span className="text-brand-900/20 text-[9px] font-bold tracking-widest uppercase">{player.memberId}</span>
                                    </div>
                                    <h1 className="text-5xl md:text-7xl font-black text-brand-900 tracking-tight uppercase leading-[0.9] mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                        {player.fullName.split(' ')[0]}<br/>
                                        <span className="premium-gradient-text">{player.fullName.split(' ').slice(1).join(' ')}</span>
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-8 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
                                        <span className="flex items-center gap-2.5"><MapPin size={14} className="text-brand-500" /> {player.venue || 'Main Academy Ground'}</span>
                                        <span className="flex items-center gap-2.5"><Calendar size={14} className="text-brand-500" /> Season 24/25</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full xl:w-auto">
                                <button onClick={handleDownloadIDCard} className="glass-card hover:bg-brand-950 hover:text-white border-slate-100 p-8 rounded-xl transition-all shadow-sm group/btn text-center bg-white">
                                    <UserCheck size={24} className="text-brand-500 group-hover/btn:scale-110 transition-transform mx-auto mb-4" />
                                    <span className="block text-[8px] font-black text-brand-950/40 group-hover/btn:text-white/60 uppercase tracking-widest">IDENTITY PASS</span>
                                </button>
                                <button onClick={handleDownloadInvoice} disabled={!feeStatus?.invoice} className={`p-8 rounded-xl transition-all shadow-sm border group/btn text-center ${feeStatus?.status === 'PAID' ? 'bg-white border-brand-500/20 hover:bg-brand-500 hover:text-white' : 'bg-red-50 text-red-500 border-red-200'}`}>
                                    <Download size={24} className={`${feeStatus?.status === 'PAID' ? 'text-brand-500' : 'text-red-500'} group-hover/btn:text-white group-hover/btn:scale-110 transition-transform mx-auto mb-4`} />
                                    <span className={`block text-[8px] font-black uppercase tracking-widest ${feeStatus?.status === 'PAID' ? 'text-brand-900/40 group-hover/btn:text-white/60' : 'text-red-400'}`}>RECEIPT LOG</span>
                                </button>
                                <div className="glass-card border-slate-100 bg-slate-50 p-8 rounded-xl shadow-sm text-center flex flex-col justify-center">
                                    <div className="text-4xl font-black text-brand-950 mb-1 tracking-tighter" style={{ fontFamily: 'Orbitron, sans-serif' }}>{attendanceRate}<span className="text-xs ml-0.5">%</span></div>
                                    <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest">READINESS</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Highlights Row */}
                        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Self Check-In Card */}
                            <div className="glass-card rounded-[2.5rem] p-10 border-brand-900/5 shadow-xl relative overflow-hidden group bg-white flex items-center justify-between">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000"><CheckCircle2 size={120} className="text-brand-900" /></div>
                                <div className="relative z-10 flex items-center gap-8">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${checkedInToday ? 'bg-brand-500 border-brand-500 text-brand-950' : 'bg-brand-900/5 border-brand-900/10 text-brand-900/20'}`}>
                                        <Activity size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-brand-900">
                                            {checkedInToday ? 'CHECK-IN <span className="premium-gradient-text">COMPLETE</span>' : 'REPORT <span className="premium-gradient-text">READY</span>'}
                                        </h3>
                                        <p className="text-[9px] font-black text-brand-900/30 uppercase tracking-[0.3em] mt-1 italic">
                                            {checkedInToday ? 'Operational status: Active at HQ' : 'Action required: Mark your presence'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSelfCheckIn}
                                    disabled={checkedInToday || isCheckingIn}
                                    className={`relative z-10 px-10 py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center gap-3 ${checkedInToday ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-brand-950 text-white hover:bg-black shadow-xl shadow-brand-950/20 active:scale-95'}`}
                                >
                                    {isCheckingIn ? <Loader2 size={14} className="animate-spin" /> : checkedInToday ? <CheckCircle2 size={14} /> : <Zap size={14} className="text-brand-500" fill="currentColor" />}
                                    {checkedInToday ? 'LIVE' : 'AUTO CHECK-IN'}
                                </button>
                            </div>

                            {/* MOTM Showcase */}
                            <div className={`glass-card rounded-[2.5rem] p-10 border-brand-500/20 shadow-xl relative overflow-hidden group transition-all duration-700 ${motmToday?.playerId === player.id ? 'bg-brand-900 ring-2 ring-brand-500/50' : 'bg-white'}`}>
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={140} className={motmToday?.playerId === player.id ? 'text-white' : 'text-brand-900'} /></div>
                                <div className="relative z-10 flex items-center gap-8">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${motmToday?.playerId === player.id ? 'bg-brand-500 border-brand-500 text-brand-950' : 'bg-brand-900/5 border-brand-900/10 text-brand-900/20'}`}>
                                        <Trophy size={32} />
                                    </div>
                                    <div>
                                        <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${motmToday?.playerId === player.id ? 'text-white' : 'text-brand-900'}`}>
                                            SESSION <span className="premium-gradient-text">ELITE</span>
                                        </h3>
                                        <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-1 italic ${motmToday?.playerId === player.id ? 'text-white/40' : 'text-brand-900/30'}`}>
                                            {motmToday?.playerId === player.id ? 'You were awarded MVP status today' : 'Elite performance recognition'}
                                        </p>
                                    </div>
                                </div>
                                {motmToday?.playerId === player.id && (
                                    <div className="absolute top-6 right-6 px-3 py-1 bg-brand-500 text-brand-950 text-[8px] font-black uppercase tracking-widest rounded-lg animate-pulse">ELITE UNIT</div>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-8">
                            {/* Operational Schedule */}
                            <div className="glass-card rounded-[3rem] p-10 border-slate-100 shadow-xl relative overflow-hidden bg-white">
                                <div className="absolute top-0 left-0 w-[4px] h-full bg-brand-500" />
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-brand-950 flex items-center gap-5">
                                        <Calendar className="text-brand-500" size={28} /> Deployment Log
                                    </h3>
                                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 backdrop-blur-xl">
                                        {(['training', 'match', 'social'] as EventType[]).map(t => (
                                            <button key={t} onClick={() => setEventFilter(t)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] italic transition-all ${eventFilter === t ? 'bg-brand-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {filteredEvents.length > 0 ? filteredEvents.map(event => (
                                        <div key={event.id} className="group glass-card p-6 rounded-[2rem] border-slate-100 bg-slate-50/50 hover:bg-white hover:border-brand-500/50 transition-all flex flex-col md:flex-row items-center justify-between gap-8 hover:translate-x-2">
                                            <div className="flex items-center gap-8">
                                                <div className="w-16 h-16 bg-white rounded-2xl flex flex-col items-center justify-center font-black border border-slate-100 text-brand-500 shadow-sm group-hover:bg-brand-500/10 transition-colors">
                                                    <span className="text-[9px] uppercase tracking-widest opacity-60 font-sans">{new Date(event.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                                    <span className="text-2xl leading-none font-mono" style={{ fontFamily: 'Orbitron' }}>{new Date(event.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <div className="font-black text-xl text-brand-950 italic uppercase tracking-tight group-hover:text-brand-500 transition-colors">{event.title}</div>
                                                    <div className="flex gap-6 mt-2 text-slate-400 text-[10px] font-black uppercase italic tracking-widest">
                                                        <span className="flex items-center gap-2.5"><Clock size={14} className="text-brand-500" /> {event.time}</span>
                                                        <span className="flex items-center gap-2.5"><MapPin size={14} className="text-brand-500" /> {event.location}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'attending');
                                                }} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center gap-3 border ${event.rsvps?.[player.id] === 'attending' ? 'bg-brand-500 text-white border-brand-500 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-slate-900'}`}><CheckCircle2 size={16} /> Confirm</button>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    StorageService.toggleRSVP(event.id, user.linkedPlayerId!, 'declined');
                                                }} className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all flex items-center gap-3 border ${event.rsvps?.[player.id] === 'declined' ? 'bg-red-500 text-white border-red-500 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-500/20'}`}><XCircle size={16} /> Decline</button>
                                            </div>
                                        </div>
                                    )) : <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] font-black text-slate-200 uppercase tracking-[0.4em] italic">No Active {eventFilter} Logs</div>}
                                </div>
                            </div>

                            {/* Performance Intelligence */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="glass-card rounded-[3rem] p-12 border-slate-100 shadow-2xl relative overflow-hidden group min-h-[400px] flex flex-col bg-white">
                                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-1000 -rotate-12"><Activity size={240} className="text-brand-500" /></div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-5 mb-10 text-brand-950">
                                        <Brain className="text-brand-500" size={28} /> AI Insight Engine
                                    </h3>
                                    {matchAnalysis ? (
                                        <div className="flex-1 prose prose-slate prose-sm max-w-none text-slate-600 italic font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: matchAnalysis }} />
                                    ) : (
                                        <div className="flex-1 flex flex-col justify-center text-center">
                                            <p className="text-[11px] text-slate-300 font-black uppercase tracking-[0.3em] mb-10 px-8 italic leading-relaxed">Initialize tactical breakdown module for latest high-performance metrics.</p>
                                            <button onClick={handleAnalyzeMatch} disabled={isAnalyzingMatch} className="w-full bg-brand-950 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-[0.2em] italic hover:bg-black active:scale-95 transition-all shadow-xl shadow-brand-950/20 group/ai disabled:opacity-50">
                                                {isAnalyzingMatch ? <Loader2 size={18} className="animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-4"><Sparkles size={18} /> Initialize Analysis</span>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="glass-card rounded-[3rem] p-12 border-slate-100 shadow-xl flex flex-col min-h-[400px] bg-white">
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-5 mb-10 text-brand-950">
                                        <History className="text-brand-500" size={28} /> Mission History
                                    </h3>
                                    {myMatchStats.length > 0 ? (
                                        <div className="space-y-5 flex-1">
                                        {myMatchStats.slice(0,3).map(m => (
                                            <div key={m.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white transition-colors">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">{new Date(m.date).toLocaleDateString()}</span>
                                                    <span className={`px-3 py-1 rounded text-[9px] font-black italic uppercase tracking-widest ${m.result === 'W' ? 'bg-brand-500 text-white' : 'bg-red-500 text-white'}`}>{m.result === 'W' ? 'Success' : 'Fail'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="font-black text-xl text-brand-950 italic uppercase tracking-tighter">vs {m.opponent}</div>
                                                    <div className="text-3xl font-black text-brand-500 font-mono tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{m.scoreFor}<span className="text-slate-200 mx-1">:</span>{m.scoreAgainst}</div>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    ) : <div className="flex-1 flex flex-col items-center justify-center text-slate-100 font-black italic uppercase tracking-[0.4em] py-12">Zero Logs Found</div>}
                                </div>
                            </div>
                        </div>

                        {/* Performance Telemetry */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="bg-brand-500 p-12 rounded-[3.5rem] shadow-xl flex flex-col items-center group text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000 rotate-12"><Trophy size={180} /></div>
                                <Trophy className="relative z-10 text-white mb-8 group-hover:translate-y-[-10px] transition-transform duration-700" size={80} />
                                <div className="relative z-10 text-center">
                                    <div className="text-8xl font-black italic leading-none mb-1 font-mono tracking-tighter" style={{ fontFamily: 'Orbitron' }}>{totalGoals}</div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.3em] opacity-60 italic">Total Strike Rate</div>
                                </div>
                            </div>
                            
                            <div className="glass-card border-slate-100 p-12 rounded-[3.5rem] shadow-2xl space-y-10 bg-white">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-slate-50 text-brand-500 rounded-2xl shadow-inner border border-slate-100"><Star size={28} /></div>
                                        <div className="text-left font-black italic uppercase leading-tight text-brand-950">PRO<br/><span className="text-slate-300 text-[10px] uppercase tracking-[0.2em]">Rating</span></div>
                                    </div>
                                    <div className="text-5xl font-black text-brand-500 font-mono" style={{ fontFamily: 'Orbitron' }}>{avgRating}</div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-slate-50 text-brand-500 rounded-2xl shadow-inner border border-slate-100"><Shirt size={28} /></div>
                                        <div className="text-left font-black italic uppercase leading-tight text-brand-950">DEPLOYS<br/><span className="text-slate-300 text-[10px] uppercase tracking-[0.2em]">Starter</span></div>
                                    </div>
                                    <div className="text-5xl font-black text-brand-950 font-mono" style={{ fontFamily: 'Orbitron' }}>{totalStarts}</div>
                                </div>
                                <div className="flex justify-between items-center pt-10 border-t border-slate-100">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-slate-50 text-brand-500 rounded-2xl shadow-inner border border-slate-100"><Activity size={28} /></div>
                                        <div className="text-left font-black italic uppercase leading-tight text-brand-950">CAPS<br/><span className="text-slate-300 text-[10px] uppercase tracking-[0.2em]">Appearances</span></div>
                                    </div>
                                    <div className="text-5xl font-black text-brand-950 font-mono" style={{ fontFamily: 'Orbitron' }}>{myMatchStats.length}</div>
                                </div>
                            </div>

                            {/* Kit Requirements */}
                            <div className="glass-card border-brand-900/5 p-10 rounded-[3rem] shadow-sm relative overflow-hidden group bg-white">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000"><Shirt size={120} className="text-brand-900" /></div>
                                <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.3em] mb-6 italic">Kit Directive</h4>
                                {upcomingEvents[0] && (
                                    <div className="flex items-center gap-6">
                                        <div className={`p-4 rounded-2xl border ${getKitRequirement(upcomingEvents[0].date).style}`}>
                                            <Shirt size={24} />
                                        </div>
                                        <div>
                                            <div className="text-lg font-black text-brand-900 italic uppercase tracking-tighter">{getKitRequirement(upcomingEvents[0].date).color}</div>
                                            <p className="text-[9px] text-brand-900/30 font-black uppercase tracking-widest mt-1 italic">Required for next session</p>
                                        </div>
                                    </div>
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
