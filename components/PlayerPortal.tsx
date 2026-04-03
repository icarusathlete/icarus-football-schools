
import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Player, AttendanceRecord, Match, AttendanceStatus, FeeRecord, ScheduleEvent, AcademySettings, EventType, Drill, User } from '../types';
import { Trophy, Star, Calendar, Brain, DollarSign, Clock, Activity, Shield, CheckCircle2, XCircle, MapPin, Coffee, Zap, PartyPopper, PlayCircle, Download, Phone, Mail, Globe, X, Shirt, Wand2, Sparkles, Target, ArrowRight, UserCheck, ClipboardList, ChevronDown, ChevronUp, Dumbbell, Play, Youtube } from 'lucide-react';
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
    const invoiceHiddenRef = useRef<HTMLDivElement>(null);
    const idCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user.linkedPlayerId) return;
        const allPlayers = StorageService.getPlayers();
        const p = allPlayers.find(pl => pl.id === user.linkedPlayerId);
        setPlayer(p || null);
        if (p) {
            const allAttendance = StorageService.getAttendance();
            setAttendance(allAttendance.filter(a => a.playerId === user.linkedPlayerId));
            const allMatches = StorageService.getMatches();
            setMatches(allMatches.filter(m => m.playerStats.some(s => s.playerId === user.linkedPlayerId)));
            const currentMonth = new Date().toISOString().slice(0, 7);
            const fees = StorageService.getFees();
            const myFee = fees.find(f => f.playerId === p.id && f.month === currentMonth);
            setFeeStatus(myFee || null);
            loadSchedule();
            loadDrills();
            loadCoaches();
        }
        const handleSettingsChange = () => setSettings(StorageService.getSettings());
        window.addEventListener('settingsChanged', handleSettingsChange);
        return () => window.removeEventListener('settingsChanged', handleSettingsChange);
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
    const handleRSVP = (e: React.MouseEvent, eventId: string, status: 'attending' | 'declined') => {
        e.stopPropagation();
        if (!user.linkedPlayerId) return;
        StorageService.toggleRSVP(eventId, user.linkedPlayerId, status);
        loadSchedule();
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
        if (day === 1 || day === 3 || day === 5) return { color: 'Blue Kit', style: 'bg-blue-50 text-blue-600 border-blue-100' };
        if (day === 2 || day === 4) return { color: 'White Kit', style: 'bg-gray-50 text-gray-600 border-gray-200' };
        return { color: 'Training Bib', style: 'bg-orange-50 text-orange-600 border-orange-100' };
    };

    if (!player) return <div className="p-8 text-center text-brand-950 font-black uppercase tracking-widest italic py-40">Player profile not linked. Contact academy administration.</div>;

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
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
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

            {/* Portal Navigation */}
            <div className="flex bg-white p-2 rounded-2xl border border-brand-100 shadow-xl w-fit">
              <button onClick={() => setViewMode('overview')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all italic ${viewMode === 'overview' ? 'bg-brand-500 text-brand-950 shadow-lg' : 'text-brand-300 hover:text-brand-950 hover:bg-brand-50'}`}>Overview</button>
              <button onClick={() => setViewMode('scout')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all italic flex items-center gap-2 ${viewMode === 'scout' ? 'bg-brand-500 text-brand-950 shadow-lg' : 'text-brand-300 hover:text-brand-950 hover:bg-brand-50'}`}><Shield size={14} /> Scout Report</button>
            </div>

            {viewMode === 'scout' ? (
              <EvaluationCard player={player} settings={settings} stats={{ goals: totalGoals, assists: totalAssists, matches: myMatchStats.length, rating: parseFloat(avgRating), attendanceRate, starts: totalStarts }} />
            ) : (
                <>
                {/* Hero Profile */}
                <div className="bg-white rounded-[3rem] p-10 border border-brand-100 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-1000"><Shield size={200} className="text-brand-500" /></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="relative">
                                <img src={player.photoUrl} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-brand-50 shadow-2xl object-cover transform transition-transform group-hover:scale-105" />
                                <div className="absolute -bottom-2 -right-2 bg-brand-500 text-brand-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border-4 border-white italic">{player.position}</div>
                            </div>
                            <div className="text-center md:text-left">
                                <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                                    <span className="px-3 py-1 bg-brand-50 text-brand-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-brand-100 italic">Official Athlete</span>
                                    <span className="text-brand-500 text-[9px] font-black tracking-widest uppercase italic">{player.memberId}</span>
                                </div>
                                <h1 className="text-5xl md:text-6xl font-black text-brand-950 tracking-tighter italic uppercase leading-none mb-4">{player.fullName}</h1>
                                <div className="flex flex-wrap items-center gap-6 text-brand-300 text-xs font-black uppercase tracking-widest italic">
                                    <span className="flex items-center gap-2"><MapPin size={14} className="text-brand-500" /> {player.venue || 'Academy Ground'}</span>
                                    <span className="flex items-center gap-2"><Calendar size={14} className="text-brand-500" /> Season 2024/25</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 justify-center">
                            <button onClick={handleDownloadIDCard} className="bg-brand-50 hover:bg-brand-500 border border-brand-100 p-6 rounded-3xl transition-all shadow-sm group/btn">
                                <UserCheck size={24} className="text-brand-500 group-hover/btn:text-brand-950 mx-auto mb-2" />
                                <span className="block text-[8px] font-black text-brand-300 group-hover/btn:text-brand-950 uppercase tracking-widest">ID Card</span>
                            </button>
                            <button onClick={handleDownloadInvoice} disabled={!feeStatus?.invoice} className={`p-6 rounded-3xl transition-all shadow-sm border group/btn ${feeStatus?.status === 'PAID' ? 'bg-green-50 border-green-100 hover:bg-green-500' : 'bg-red-50 border-red-100'}`}>
                                <Download size={24} className={`${feeStatus?.status === 'PAID' ? 'text-green-500' : 'text-red-500'} group-hover/btn:text-brand-950 mx-auto mb-2`} />
                                <span className="block text-[8px] font-black text-brand-300 group-hover/btn:text-brand-950 uppercase tracking-widest">Receipt</span>
                            </button>
                            <div className="bg-brand-50 border border-brand-100 p-6 rounded-3xl shadow-sm text-center">
                                <div className="text-2xl font-black text-brand-500">{attendanceRate}%</div>
                                <span className="block text-[8px] font-black text-brand-300 uppercase tracking-widest">Attendance</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-brand-950">
                    <div className="lg:col-span-8 space-y-8">
                        {/* Weekly Schedule */}
                        <div className="bg-white rounded-[3rem] p-10 border border-brand-100 shadow-xl">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                                <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-4">
                                    <Calendar className="text-brand-500" size={24} /> Training Schedule
                                </h3>
                                <div className="flex bg-brand-50 p-1.5 rounded-2xl border border-brand-100">
                                    {(['training', 'match', 'social'] as EventType[]).map(t => (
                                        <button key={t} onClick={() => setEventFilter(t)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all ${eventFilter === t ? 'bg-brand-500 text-brand-950 shadow-md' : 'text-brand-300 hover:text-brand-950'}`}>{t}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                {filteredEvents.length > 0 ? filteredEvents.map(event => (
                                    <div key={event.id} className="group bg-white p-6 rounded-3xl border border-brand-100 hover:border-brand-500 transition-all flex flex-col md:flex-row items-center justify-between gap-6 hover:-translate-y-1">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex flex-col items-center justify-center font-black border border-brand-100 text-brand-500">
                                                <span className="text-[8px] uppercase">{new Date(event.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                                <span className="text-xl leading-none">{new Date(event.date).getDate()}</span>
                                            </div>
                                            <div>
                                                <div className="font-black text-lg text-brand-950 italic uppercase tracking-tight">{event.title}</div>
                                                <div className="flex gap-4 mt-1 text-brand-300 text-[10px] font-black uppercase italic">
                                                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-brand-500" /> {event.time}</span>
                                                    <span className="flex items-center gap-1.5"><MapPin size={12} className="text-brand-500" /> {event.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={(e) => handleRSVP(e, event.id, 'attending')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all flex items-center gap-2 ${event.rsvps?.[player.id] === 'attending' ? 'bg-brand-500 text-brand-950' : 'bg-brand-50 text-brand-300 hover:bg-brand-100'}`}><CheckCircle2 size={14} /> I'm In</button>
                                            <button onClick={(e) => handleRSVP(e, event.id, 'declined')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all flex items-center gap-2 ${event.rsvps?.[player.id] === 'declined' ? 'bg-red-500 text-white' : 'bg-brand-50 text-brand-300 hover:bg-red-50 hover:text-red-500'}`}><XCircle size={14} /> Out</button>
                                        </div>
                                    </div>
                                )) : <div className="py-20 text-center border-2 border-dashed border-brand-100 rounded-[2rem] font-black text-brand-100 uppercase tracking-widest italic">No {eventFilter} found for this week</div>}
                            </div>
                        </div>

                        {/* Performance Insights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-brand-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700 font-black italic text-8xl leading-none">AI</div>
                                <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-4 mb-8">
                                    <Brain className="text-brand-500" size={24} /> Performance Insight
                                </h3>
                                {matchAnalysis ? (
                                    <div className="prose prose-invert prose-xs max-w-none text-brand-100 italic" dangerouslySetInnerHTML={{ __html: matchAnalysis }} />
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-xs text-brand-300 font-bold uppercase tracking-widest mb-6 px-4 italic leading-relaxed">Generate a professional tactical breakdown of your performance from the latest match.</p>
                                        <button onClick={handleAnalyzeMatch} disabled={isAnalyzingMatch} className="w-full bg-brand-500 text-brand-950 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest italic hover:scale-105 active:scale-95 transition-all shadow-xl group/ai">
                                            {isAnalyzingMatch ? <Loader2 size={16} className="animate-spin mx-auto" /> : <span className="flex items-center justify-center gap-3"><Sparkles size={16} /> Analysis Engine Ready</span>}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white rounded-[3rem] p-10 border border-brand-100 shadow-xl h-full flex flex-col">
                                <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-4 mb-8 text-brand-950">
                                    <History className="text-brand-500" size={24} /> Match Results
                                </h3>
                                {myMatchStats.length > 0 ? (
                                    <div className="space-y-4 flex-1">
                                    {myMatchStats.slice(0,3).map(m => (
                                        <div key={m.id} className="p-5 bg-brand-50 rounded-2xl border border-brand-100">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-black text-brand-300 uppercase italic">{new Date(m.date).toLocaleDateString()}</span>
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black italic uppercase ${m.result === 'W' ? 'bg-green-500 text-brand-950' : 'bg-red-500 text-white'}`}>{m.result === 'W' ? 'Victory' : 'Defeat'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="font-black text-brand-950 italic uppercase tracking-tighter">vs {m.opponent}</div>
                                                <div className="text-xl font-black text-brand-950">{m.scoreFor}-{m.scoreAgainst}</div>
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                ) : <div className="flex-1 flex items-center justify-center text-brand-100 font-black italic uppercase tracking-widest py-10">No Matches Logged</div>}
                            </div>
                        </div>
                    </div>

                    {/* Stats Sidebar */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-brand-500 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center group text-brand-950">
                            <Trophy className="text-brand-950 mb-6 group-hover:scale-110 transition-transform duration-700" size={60} />
                            <div className="text-center">
                                <div className="text-6xl font-black italic leading-none mb-1">{totalGoals}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 italic">Goals Scored</div>
                            </div>
                        </div>
                        <div className="bg-white border border-brand-100 p-10 rounded-[3rem] shadow-xl space-y-8 text-brand-950">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl shadow-inner"><Star size={24} /></div>
                                    <div className="text-left font-black italic uppercase leading-tight">Average<br/><span className="text-brand-300 text-[9px] uppercase tracking-widest">Rating</span></div>
                                </div>
                                <div className="text-4xl font-black">{avgRating}</div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl shadow-inner"><Shirt size={24} /></div>
                                    <div className="text-left font-black italic uppercase leading-tight">Matches<br/><span className="text-brand-300 text-[9px] uppercase tracking-widest">Started</span></div>
                                </div>
                                <div className="text-4xl font-black">{totalStarts}</div>
                            </div>
                            <div className="flex justify-between items-center pt-8 border-t border-brand-100">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl shadow-inner"><Activity size={24} /></div>
                                    <div className="text-left font-black italic uppercase leading-tight">Match<br/><span className="text-brand-300 text-[9px] uppercase tracking-widest">Participation</span></div>
                                </div>
                                <div className="text-4xl font-black">{myMatchStats.length}</div>
                            </div>
                        </div>
                    </div>
                </div>
              </>
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
