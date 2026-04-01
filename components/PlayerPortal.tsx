
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

// Helper to convert number to words
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
    
    // Match Analysis State
    const [matchAnalysis, setMatchAnalysis] = useState<string | null>(null);
    const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);

    // New States for Event Filtering and Drills
    const [feeStatus, setFeeStatus] = useState<FeeRecord | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
    const [allSchedule, setAllSchedule] = useState<ScheduleEvent[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]); // All available drills
    const [coaches, setCoaches] = useState<User[]>([]); // Needed to find Lead Coach
    const [eventFilter, setEventFilter] = useState<EventType>('training'); // Default to Sessions
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
    
    // Modals
    const [isAttendanceModalOpen, setAttendanceModalOpen] = useState(false);
    const [selectedAttendanceDetail, setSelectedAttendanceDetail] = useState<{date: string, record?: AttendanceRecord, event?: ScheduleEvent} | null>(null);
    const [viewingSessionPlan, setViewingSessionPlan] = useState<ScheduleEvent | null>(null);
    const [expandedDrillId, setExpandedDrillId] = useState<string | null>(null);
    const [playingDrillVideo, setPlayingDrillVideo] = useState<string | null>(null); // Drill ID that is playing

    // Invoice & ID Card Generation Ref
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

            // Get Fees
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
        setAllSchedule(schedule); // Store all events for history lookup

        // Fetch all upcoming events, sorted by date
        const upcoming = schedule
            .filter(e => new Date(`${e.date}T${e.time}`) > now)
            .sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
        setUpcomingEvents(upcoming);
    };

    const loadDrills = () => {
        setDrills(StorageService.getDrills());
    };

    const loadCoaches = () => {
        const allUsers = StorageService.getUsers();
        setCoaches(allUsers.filter(u => u.role === 'coach'));
    };

    const handleRSVP = (e: React.MouseEvent, eventId: string, status: 'attending' | 'declined') => {
        e.stopPropagation(); // Prevent opening modal
        if (!user.linkedPlayerId) return;
        StorageService.toggleRSVP(eventId, user.linkedPlayerId, status);
        loadSchedule(); // Reload to show updated status
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
            const canvas = await html2canvas(invoiceHiddenRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `Invoice_${feeStatus.invoice.invoiceNo}.png`;
            link.click();
        } catch (e) {
            alert('Could not generate invoice download.');
        }
    };

    const handleDownloadIDCard = async () => {
        if (!idCardRef.current) return;
        
        try {
            const canvas = await html2canvas(idCardRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#020617', // Explicitly capture dark slate background
                allowTaint: true
            });

            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `ID_Card_${player?.memberId}.png`;
            link.click();
        } catch (e) {
            console.error(e);
            alert('Could not generate ID Card.');
        }
    };

    const calculateTaxes = (total: number) => {
      const base = total / 1.18;
      const cgst = base * 0.09;
      const sgst = base * 0.09;
      return {
          base: Math.round(base),
          cgst: Math.round(cgst),
          sgst: Math.round(sgst),
          total: total
      };
    };

    const getKitRequirement = (dateStr: string) => {
        const day = new Date(dateStr).getDay();
        if (day === 1 || day === 3 || day === 5) { // Mon, Wed, Fri
            return { color: 'Blue Kit', style: 'bg-blue-50 text-blue-600 border-blue-100', iconColor: 'text-blue-500' };
        }
        if (day === 2 || day === 4) { // Tue, Thu
            return { color: 'White Kit', style: 'bg-gray-50 text-gray-600 border-gray-200', iconColor: 'text-gray-400' };
        }
        return { color: 'Training Bib', style: 'bg-orange-50 text-orange-600 border-orange-100', iconColor: 'text-orange-500' };
    };

    const getCoach = (coachId?: string) => {
        return coaches.find(c => c.id === coachId);
    };

    if (!player) return <div className="p-8 text-center text-gray-500">Player profile not linked. Contact admin.</div>;

    // --- Stats Calculation ---
    const presentCount = attendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;
    
    // Group attendance by Month for Heatmap
    const attendanceByMonth = attendance.reduce((acc, record) => {
        const dateObj = new Date(record.date);
        const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(record);
        return acc;
    }, {} as Record<string, AttendanceRecord[]>);

    // Sort months descending
    const sortedMonths = Object.keys(attendanceByMonth).sort((a, b) => b.localeCompare(a));

    // Sort matches: Newest first
    const myMatchStats = matches.map(m => {
        const stats = m.playerStats.find(s => s.playerId === player.id);
        return { ...m, myStats: stats };
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const lastMatch = myMatchStats[0]; // Most recent match

    const totalGoals = myMatchStats.reduce((acc, m) => acc + (m.myStats?.goals || 0), 0);
    const totalAssists = myMatchStats.reduce((acc, m) => acc + (m.myStats?.assists || 0), 0);
    const totalStarts = myMatchStats.reduce((acc, m) => acc + (m.myStats?.isStarter ? 1 : 0), 0);
    const avgRating = myMatchStats.length ? (myMatchStats.reduce((acc, m) => acc + (m.myStats?.rating || 0), 0) / myMatchStats.length).toFixed(1) : 'N/A';

    // --- Chart Data Preparation ---
    const matchChartData = [...myMatchStats].reverse().map(m => ({
        date: new Date(m.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
        goals: m.myStats?.goals || 0,
        rating: m.myStats?.rating || 0,
        opponent: m.opponent
    }));

    const handleGenerateReport = async () => {
        setLoadingReport(true);
        const report = await GeminiService.generateReportCard(player, attendance, matches);
        setReportCard(report);
        setLoadingReport(false);
    };

    const handleAnalyzeMatch = async () => {
        if (!lastMatch || !player) return;
        setIsAnalyzingMatch(true);
        const analysis = await GeminiService.analyzeMatchPerformance(player, lastMatch);
        setMatchAnalysis(analysis);
        setIsAnalyzingMatch(false);
    };

    const filteredEvents = upcomingEvents.filter(e => e.type === eventFilter);

    // Custom Tab Component
    const EventTabButton = ({ type, label, icon: Icon, activeColor }: { type: EventType, label: string, icon: any, activeColor: string }) => {
        const isActive = eventFilter === type;
        return (
            <button
                onClick={() => setEventFilter(type)}
                className={`
                    relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 ease-out overflow-hidden group
                    ${isActive 
                        ? 'text-white shadow-lg shadow-gray-200 scale-105' 
                        : 'bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }
                `}
                style={isActive ? { background: activeColor } : {}}
            >
                {!isActive && (
                    <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
                <Icon size={16} className={`relative z-10 ${isActive ? 'animate-bounce-subtle' : ''}`} />
                <span className="relative z-10">{label}</span>
            </button>
        );
    };

    const taxes = feeStatus?.invoice ? calculateTaxes(feeStatus.invoice.amount) : { base: 0, cgst: 0, sgst: 0, total: 0 };

    return (
        <div className="space-y-6 pb-20">
            {/* HIDDEN GENERATORS FOR DOWNLOADS */}
            <div className="fixed left-[-9999px] top-0">
                {/* 1. ID CARD GENERATOR */}
                <div ref={idCardRef} className="w-[320px] h-[500px] bg-slate-950 relative overflow-hidden flex flex-col items-center p-6 text-white border-4 border-cyan-500 rounded-[2rem]">
                    {/* Background */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-900/40 via-slate-950 to-slate-950"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    
                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center w-full h-full">
                        {/* Logo Area */}
                        <div className="mt-4 mb-6 text-center">
                            {settings.logoUrl ? (
                                <img src={settings.logoUrl} className="w-12 h-12 object-contain mx-auto mb-2" />
                            ) : (
                                <Shield className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
                            )}
                            <h2 className="text-xl font-black italic tracking-tighter" style={{ fontFamily: settings.fontFamily }}>{settings.name.split(' ')[0] || 'ICARUS'}</h2>
                            <p className="text-[8px] font-bold text-cyan-400 uppercase tracking-[0.3em]">Official Player Pass</p>
                        </div>

                        {/* Photo */}
                        <div className="relative w-40 h-40 mb-6 group">
                            <div className="absolute inset-0 bg-cyan-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <img src={player.photoUrl} className="relative w-full h-full object-cover rounded-full border-4 border-slate-800 shadow-2xl" />
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-slate-900">
                                {player.position}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="text-center space-y-1 mb-auto">
                            <h1 className="text-2xl font-black uppercase tracking-tight leading-none">{player.fullName}</h1>
                            <p className="text-xs text-slate-400 font-mono">{player.memberId}</p>
                        </div>

                        {/* Footer Bar */}
                        <div className="w-full bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex justify-between items-center mt-4">
                            <div className="text-center">
                                <p className="text-[8px] text-slate-500 uppercase font-bold">Season</p>
                                <p className="text-xs font-bold text-white">2024/25</p>
                            </div>
                            <div className="h-6 w-px bg-slate-800"></div>
                            <div className="text-center">
                                <p className="text-[8px] text-slate-500 uppercase font-bold">Status</p>
                                <p className="text-xs font-bold text-green-400 flex items-center gap-1"><CheckCircle2 size={10} /> Active</p>
                            </div>
                            <div className="h-6 w-px bg-slate-800"></div>
                            <div className="text-center">
                                <p className="text-[8px] text-slate-500 uppercase font-bold">DOB</p>
                                <p className="text-xs font-bold text-white">{new Date(player.dateOfBirth).getFullYear()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. INVOICE GENERATOR (BRANDING FIX) */}
                {feeStatus?.invoice && (
                    <div ref={invoiceHiddenRef} className="bg-white w-[800px] min-h-[1000px] relative text-slate-900 overflow-hidden font-sans">
                        {/* HEADER */}
                        <div className="relative h-48 w-full bg-white">
                            {/* Left: Branding */}
                            <div className="absolute top-0 left-0 h-full w-[45%] pl-12 flex flex-col justify-center z-10">
                                 <div className="flex items-center gap-4">
                                     {settings.logoUrl ? (
                                         <img src={settings.logoUrl} className="h-24 object-contain" />
                                     ) : (
                                         <Shield className="h-24 w-24 text-black" />
                                     )}
                                     <div>
                                         <h1 className="text-5xl font-black uppercase tracking-tighter text-black leading-none" style={{ fontFamily: 'Orbitron' }}>
                                             ICARUS
                                         </h1>
                                         <p className="text-xl font-bold text-black tracking-wide">FOOTBALL SCHOOLS</p>
                                     </div>
                                 </div>
                            </div>

                            {/* Right: Contact Info (Slanted Black Background) */}
                            {/* Polygon: Top-Left(20%,0), Top-Right(100%,0), Bottom-Right(100%,100%), Bottom-Left(0%,100%) relative to this div */}
                            <div className="absolute top-0 right-0 h-full w-[60%] bg-black text-white" style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' }}>
                                 <div className="h-full flex flex-col justify-center pl-24 space-y-3">
                                     <div className="flex items-center gap-3">
                                         <div className="p-1 bg-white rounded-full"><Phone size={12} className="text-black" /></div>
                                         <span className="text-sm font-bold">+91 9259418625</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <div className="p-1 bg-white rounded-full"><MapPin size={12} className="text-black" /></div>
                                         <span className="text-sm font-bold max-w-[250px] leading-tight">Sector 13/868, Vasundhara, Ghaziabad, Uttar Pradesh - 201012</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <div className="p-1 bg-white rounded-full"><Mail size={12} className="text-black" /></div>
                                         <span className="text-sm font-bold">hello@icarusfootballschools.com</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <div className="p-1 bg-white rounded-full"><Globe size={12} className="text-black" /></div>
                                         <span className="text-sm font-bold">www.icarusfootballschools.com</span>
                                     </div>
                                 </div>
                            </div>
                        </div>

                        <div className="px-12 py-8">
                            {/* TITLE ROW */}
                            <div className="flex justify-between items-start mb-10">
                                <h2 className="text-3xl font-bold uppercase tracking-wide text-black">Payment Receipt</h2>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-black">GSTIN : 09AAHCI6679R1ZD</p>
                                    <p className="text-base text-gray-600 mt-1 font-medium">Invoice Number: {feeStatus.invoice.invoiceNo.replace('INV-', '')}</p>
                                    <p className="text-base text-gray-600 font-medium">Date: {new Date(feeStatus.invoice.date).toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>

                            <div className="border-t-4 border-gray-800 w-full mb-8"></div>

                            {/* BILLED TO */}
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-black mb-3">Billed To:</h3>
                                <div className="ml-4 space-y-1 text-base text-gray-800">
                                    <p><span className="font-bold">Name:</span> {player.parentName}</p>
                                    <p><span className="font-bold">Player Name:</span> {player.fullName}</p>
                                    <p><span className="font-bold">Phone Number:</span> {player.contactNumber}</p>
                                    <p><span className="font-bold">Email:</span> {player.fullName.toLowerCase().replace(' ', '')}@example.com</p>
                                    {player.address && <p><span className="font-bold">Address:</span> {player.address}</p>}
                                </div>
                            </div>

                            <div className="border-t-4 border-gray-400 w-full mb-8"></div>

                            {/* PROGRAM DETAILS */}
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-black mb-3">Program Details:</h3>
                                <div className="ml-4 space-y-1 text-base text-gray-800">
                                    <p><span className="font-bold">Program Enrolled:</span> Monthly Elite Training</p>
                                    <p><span className="font-bold">Training Location:</span> {player.venue || 'Main Ground'}</p>
                                    <p><span className="font-bold">Training Days:</span> Monday To Friday</p>
                                    <p><span className="font-bold">Coach:</span> Aditya Anand</p>
                                </div>
                            </div>

                            <div className="border-t-4 border-gray-400 w-full mb-8"></div>

                            {/* PAYMENT INFO TABLE */}
                            <h3 className="text-xl font-bold text-black mb-4">Payment Information</h3>
                            <div className="border-2 border-black mb-8">
                                <div className="flex border-b-2 border-black">
                                    <div className="w-1/2 p-3 font-bold border-r-2 border-black pl-6 text-lg">COACHING FEE</div>
                                    <div className="w-1/2 p-3 font-bold text-center text-lg">₹ {taxes.base}</div>
                                </div>
                                <div className="flex border-b-2 border-black">
                                    <div className="w-1/2 p-3 font-bold border-r-2 border-black pl-6 text-lg">CGST @ 9%</div>
                                    <div className="w-1/2 p-3 font-bold text-center text-lg">₹ {taxes.cgst}</div>
                                </div>
                                <div className="flex border-b-2 border-black">
                                    <div className="w-1/2 p-3 font-bold border-r-2 border-black pl-6 text-lg">SGST @ 9%</div>
                                    <div className="w-1/2 p-3 font-bold text-center text-lg">₹ {taxes.sgst}</div>
                                </div>
                                <div className="flex bg-white">
                                    <div className="w-1/2 p-4 font-black border-r-2 border-black pl-6 text-xl">TOTAL AMOUNT</div>
                                    <div className="w-1/2 p-4 font-black text-center text-xl">₹ {taxes.total}</div>
                                </div>
                            </div>

                            <div className="text-base font-bold text-gray-800 mb-6 ml-4 space-y-1">
                                <p>• Payment Mode: {feeStatus.invoice.paymentMode}</p>
                                <p>• Payment Date: {new Date(feeStatus.invoice.date).toLocaleDateString('en-GB')}</p>
                                <p>• Fee Valid Until: {new Date(feeStatus.invoice.validTill).toLocaleDateString('en-GB')}</p>
                            </div>

                            <div className="mb-10">
                                <p className="font-bold text-black border-b-4 border-gray-400 pb-2 text-lg">
                                    Total Amount Received: <span className="font-medium text-gray-700">{numberToWords(taxes.total)}</span>
                                </p>
                            </div>

                            <div className="mb-16">
                                <p className="font-bold text-base text-black leading-relaxed">Thank You For Choosing Icarus Football Schools. We look forward to helping you achieve your football goals!</p>
                            </div>

                            {/* SIGNATURE */}
                            <div className="text-base font-bold text-black">
                                <p>Authorized By:</p>
                                <p>Abhishek Begal</p>
                                <p>Icarus Football Schools</p>
                                <div className="mt-4 w-64 border-b-2 border-black relative">
                                     <div className="h-16 absolute bottom-2 left-4">
                                         <span className="font-calendary text-5xl ml-4 opacity-70" style={{fontFamily: 'cursive'}}>AbhiB</span>
                                     </div>
                                </div>
                                <p className="mt-2">Signature:</p>
                            </div>
                       </div>

                       {/* BOTTOM CURVE */}
                       <div className="absolute bottom-0 left-0 w-full h-16 bg-gray-300" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }}></div>
                   </div>
                )}
            </div>
            
            {/* Top Navigation for Portal Views (Kept same) */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm w-fit mx-auto md:mx-0">
              <button 
                onClick={() => setViewMode('overview')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    viewMode === 'overview' 
                    ? 'bg-icarus-900 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Performance Overview
              </button>
              <button 
                onClick={() => setViewMode('scout')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                    viewMode === 'scout' 
                    ? 'bg-icarus-900 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Shield size={16} />
                Scout Report
              </button>
            </div>

            {viewMode === 'scout' ? (
              <EvaluationCard 
                player={player} 
                settings={settings}
                stats={{
                    goals: totalGoals,
                    assists: totalAssists,
                    matches: myMatchStats.length,
                    rating: avgRating !== 'N/A' ? parseFloat(avgRating) : 0,
                    attendanceRate: attendanceRate,
                    starts: totalStarts
                }}
               />
            ) : (
                /* ... (No changes to the overview section) ... */
                <>
                {/* Hero Header */}
                <div className="relative overflow-hidden rounded-[2rem] p-6 md:p-10 text-white shadow-2xl transition-all hover:shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)` }}>
                    {/* ... (Existing Hero Content) ... */}
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-white/30 rounded-full blur-sm"></div>
                                <img src={player.photoUrl} className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/40 bg-white shadow-xl object-cover" alt={player.fullName} />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-5xl font-black tracking-tighter" style={{ fontFamily: settings.fontFamily }}>{player.fullName}</h1>
                                <div className="flex flex-wrap items-center gap-3 mt-3 text-white/90 text-sm md:text-base">
                                    <span className="bg-white/20 px-4 py-1.5 rounded-full font-bold uppercase tracking-wider border border-white/10 backdrop-blur-sm text-xs md:text-sm">{player.position}</span>
                                    <span className="hidden md:inline opacity-60">•</span>
                                    <span className="opacity-90 font-medium">{settings.name}</span>
                                    <span className="hidden md:inline opacity-60">•</span>
                                    <span className="opacity-90 font-mono font-bold tracking-widest text-xs md:text-sm">{player.memberId}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 self-start md:self-center">
                            {/* Download ID Card Button */}
                            <button 
                                onClick={handleDownloadIDCard}
                                className="flex-1 md:flex-none px-6 py-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 text-center min-w-[100px] shadow-lg transition-transform hover:-translate-y-1 hover:bg-white/20 group"
                            >
                                <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-80 font-bold">ID Card</div>
                                <div className="flex justify-center text-cyan-300">
                                    <UserCheck size={28} className="group-hover:text-white transition-colors" />
                                </div>
                            </button>

                            <button 
                                onClick={handleDownloadInvoice}
                                disabled={!feeStatus?.invoice}
                                className={`flex-1 md:flex-none px-6 py-4 rounded-2xl backdrop-blur-md border text-center min-w-[120px] shadow-lg transition-all hover:-translate-y-1 relative group ${
                                feeStatus?.status === 'PAID' ? 'bg-green-500/20 border-green-400/30' : 'bg-red-500/20 border-red-400/30'
                            }`}>
                                <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-80 font-bold">Fees Status</div>
                                {feeStatus?.status === 'PAID' ? (
                                    <div className="text-green-200 font-bold flex items-center justify-center gap-1.5">
                                        {feeStatus.invoice ? <Download size={16} className="animate-bounce" /> : <DollarSign size={16} />}
                                        Paid
                                    </div>
                                ) : (
                                    <div className="text-red-200 font-bold flex items-center justify-center gap-1.5">₹ Due</div>
                                )}
                                
                                {feeStatus?.invoice && (
                                    <div className="absolute inset-0 bg-green-600/90 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs uppercase tracking-wider">
                                        Download PDF
                                    </div>
                                )}
                            </button>
                            
                            <button 
                                onClick={() => setAttendanceModalOpen(true)}
                                className="flex-1 md:flex-none px-6 py-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 text-center min-w-[120px] shadow-lg transition-transform hover:-translate-y-1 hover:bg-white/20"
                            >
                                <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-80 font-bold">Attendance</div>
                                <div className="text-2xl font-black text-yellow-300">{attendanceRate}%</div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Schedule & RSVP Section */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* ... (Existing Schedule Section Code) ... */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                             <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <div className="p-2 bg-icarus-50 rounded-lg text-icarus-600">
                                    <Calendar size={20} />
                                </div>
                                Upcoming Schedule
                            </h3>
                            
                            <div className="flex p-1 bg-gray-100/50 rounded-2xl border border-gray-200 shadow-inner">
                                <EventTabButton type="training" label="Sessions" icon={Zap} activeColor="#0ea5e9" />
                                <EventTabButton type="match" label="Matches" icon={Trophy} activeColor="#eab308" />
                                <EventTabButton type="social" label="Events" icon={PartyPopper} activeColor="#8b5cf6" />
                            </div>
                        </div>
                       
                        <div className="min-h-[300px]">
                            {filteredEvents.length > 0 ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {filteredEvents.map(event => {
                                        const myRsvp = event.rsvps?.[player.id];
                                        const isAttending = myRsvp === 'attending';
                                        const isDeclined = myRsvp === 'declined';
                                        const kit = event.type === 'training' ? getKitRequirement(event.date) : null;
                                        
                                        return (
                                            <div 
                                                key={event.id} 
                                                onClick={() => setViewingSessionPlan(event)}
                                                className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden cursor-pointer"
                                            >
                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300 ${
                                                    event.type === 'match' ? 'bg-yellow-400 group-hover:bg-yellow-500' : 
                                                    event.type === 'social' ? 'bg-purple-400 group-hover:bg-purple-500' :
                                                    'bg-cyan-400 group-hover:bg-cyan-500'
                                                }`} />

                                                <div className="flex items-center gap-5 pl-3">
                                                    <div className={`
                                                        w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
                                                        ${
                                                            event.type === 'match' ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 
                                                            event.type === 'social' ? 'bg-gradient-to-br from-purple-400 to-pink-500' :
                                                            'bg-gradient-to-br from-cyan-400 to-blue-500'
                                                        }
                                                    `}>
                                                        <span className="text-[10px] uppercase opacity-90 tracking-wider">{new Date(event.date).toLocaleDateString(undefined, {month: 'short'})}</span>
                                                        <span className="text-2xl leading-none font-black">{new Date(event.date).getDate()}</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-lg group-hover:text-icarus-700 transition-colors">{event.title}</div>
                                                        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-3 mt-1.5 font-medium">
                                                            <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                                <Clock size={12} className={
                                                                    event.type === 'match' ? 'text-yellow-600' : 
                                                                    event.type === 'social' ? 'text-purple-600' :
                                                                    'text-cyan-600'
                                                                } /> 
                                                                {event.time}
                                                            </span>
                                                            <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                                <MapPin size={12} className={
                                                                    event.type === 'match' ? 'text-yellow-600' : 
                                                                    event.type === 'social' ? 'text-purple-600' :
                                                                    'text-cyan-600'
                                                                } /> 
                                                                {event.location}
                                                            </span>
                                                            {kit && (
                                                                <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] uppercase font-bold tracking-wide ${kit.style}`}>
                                                                    <Shirt size={12} /> 
                                                                    {kit.color}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-3 self-start md:self-center w-full md:w-auto">
                                                    <button onClick={(e) => handleRSVP(e, event.id, 'attending')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 ${isAttending ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20 translate-y-[-2px]' : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50'}`}><CheckCircle2 size={16} className={isAttending ? 'text-green-400' : ''} />Going</button>
                                                    <button onClick={(e) => handleRSVP(e, event.id, 'declined')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95 ${isDeclined ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20 translate-y-[-2px]' : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50'}`}><XCircle size={16} className={isDeclined ? 'text-red-500' : ''} />Out</button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="h-full min-h-[300px] bg-white rounded-3xl border-2 border-dashed border-gray-200 text-center flex flex-col items-center justify-center text-gray-400 group">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                       <Calendar size={32} className="text-gray-300 group-hover:text-gray-400" />
                                    </div>
                                    <p className="font-bold text-lg text-gray-500">No {eventFilter === 'training' ? 'sessions' : eventFilter === 'match' ? 'matches' : 'events'} found</p>
                                    <p className="text-xs uppercase tracking-wider mt-1 opacity-70">Check back later for updates</p>
                                </div>
                            )}
                        </div>

                        {/* Match History */}
                        <div className="pt-8 border-t border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                    <PlayCircle size={20} />
                                </div>
                                Match History & Highlights
                            </h3>
                            <div className="space-y-6">
                                {myMatchStats.length > 0 ? (
                                    myMatchStats.map((match) => {
                                        const embedUrl = getYouTubeEmbedUrl(match.highlightsUrl);
                                        return (
                                            <div key={match.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 border-b border-gray-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-black text-lg border-2 border-white shadow-sm ${match.result === 'W' ? 'bg-green-100 text-green-600' : match.result === 'D' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'}`}>{match.result}</div>
                                                        <div>
                                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{new Date(match.date).toLocaleDateString()}</div>
                                                            <h4 className="font-black text-xl text-gray-900">vs {match.opponent}</h4>
                                                            {match.myStats?.isStarter && (
                                                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 border border-green-200">
                                                                    <Shirt size={10} /> Started
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-6 text-center">
                                                        <div><div className="text-2xl font-black text-gray-800">{match.scoreFor}-{match.scoreAgainst}</div><div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Score</div></div>
                                                        <div><div className="text-2xl font-black text-icarus-600">{match.myStats?.rating || '-'}</div><div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">My Rating</div></div>
                                                    </div>
                                                </div>
                                                {embedUrl ? (<div className="aspect-video w-full bg-black"><iframe src={embedUrl} className="w-full h-full" title="Match Highlights" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>) : (<div className="p-8 text-center bg-gray-50 border-t border-gray-100"><div className="inline-flex items-center gap-2 text-gray-400 text-sm font-medium"><PlayCircle size={16} /> No highlights uploaded for this match</div></div>)}
                                            </div>
                                        );
                                    })
                                ) : (<div className="p-8 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400">No completed matches found.</div>)}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Stats & AI */}
                    <div className="space-y-6">
                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center hover:border-green-200 transition-colors">
                                <div className="p-3 bg-green-50 text-green-600 rounded-2xl mb-2"><Trophy size={20} /></div>
                                <div className="text-3xl font-black text-gray-800">{totalGoals}</div>
                                <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Goals</div>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center hover:border-blue-200 transition-colors">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl mb-2"><Star size={20} /></div>
                                <div className="text-3xl font-black text-gray-800">{avgRating}</div>
                                <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Rating</div>
                            </div>
                            <div className="col-span-2 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-purple-200 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Shirt size={20} /></div>
                                    <div className="text-left">
                                        <div className="text-3xl font-black text-gray-800 leading-none">{totalStarts}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Matches Started</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-gray-500">Total Played</div>
                                    <div className="text-xl font-black text-gray-800">{myMatchStats.length}</div>
                                </div>
                            </div>
                        </div>

                        {/* --- LAST MATCH ANALYSIS GENERATOR --- */}
                        <div className="relative overflow-hidden rounded-3xl shadow-xl border border-gray-800" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                            <div className="absolute inset-0 opacity-10" style={{ 
                                backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)', 
                                backgroundSize: '20px 20px' 
                            }}></div>
                            
                            <div className="relative z-10 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg">
                                            <Wand2 size={18} className="text-white" />
                                        </div>
                                        <h3 className="text-lg font-black text-white italic tracking-tighter">GAME <span className="text-purple-400">ANALYSIS</span></h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-900/50 px-2 py-1 rounded border border-gray-700">AI Powered</span>
                                </div>

                                {lastMatch ? (
                                    <>
                                        {/* Match Info Card */}
                                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-6">
                                            <div className="flex justify-between items-start border-b border-white/5 pb-3 mb-3">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Match</p>
                                                    <h4 className="text-white font-bold text-lg">vs {lastMatch.opponent}</h4>
                                                </div>
                                                <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${lastMatch.result === 'W' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                    {lastMatch.scoreFor}-{lastMatch.scoreAgainst} {lastMatch.result}
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-around text-center">
                                                <div>
                                                    <div className="text-xs font-bold text-gray-500 uppercase">Goals</div>
                                                    <div className="text-xl font-black text-white">{lastMatch.myStats?.goals || 0}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-gray-500 uppercase">Assists</div>
                                                    <div className="text-xl font-black text-white">{lastMatch.myStats?.assists || 0}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-gray-500 uppercase">Rating</div>
                                                    <div className="text-xl font-black text-yellow-400">{lastMatch.myStats?.rating || 0}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Analysis Content */}
                                        {matchAnalysis ? (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                                <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: matchAnalysis }} />
                                                <button 
                                                    onClick={() => setMatchAnalysis(null)}
                                                    className="w-full text-xs text-gray-500 hover:text-white transition-colors uppercase font-bold tracking-widest mt-2"
                                                >
                                                    Reset Analysis
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400 mb-4 px-4">Generate a tactical breakdown of your performance using match data.</p>
                                                <button 
                                                    onClick={handleAnalyzeMatch}
                                                    disabled={isAnalyzingMatch}
                                                    className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/50 transition-all transform active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:transform-none"
                                                >
                                                    {isAnalyzingMatch ? (
                                                        <Sparkles className="animate-spin" size={18} /> 
                                                    ) : (
                                                        <Brain size={18} className="group-hover:text-yellow-300 transition-colors" />
                                                    )}
                                                    <span className="uppercase tracking-widest text-xs">{isAnalyzingMatch ? 'Analyzing Tactics...' : 'Generate Insight'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        <Target size={32} className="mx-auto mb-3 opacity-50" />
                                        <p className="text-xs uppercase tracking-widest font-bold">No Match Data Available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Coach Report Panel (Kept same) */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
                                <div className="flex items-center gap-2">
                                    <Brain className="text-purple-600" size={18} />
                                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Season Report</h3>
                                </div>
                                <button 
                                    onClick={handleGenerateReport}
                                    disabled={loadingReport}
                                    className="text-[10px] bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-50 transition-colors uppercase tracking-wider"
                                >
                                    {loadingReport ? 'Thinking...' : 'Full Report'}
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-80 prose prose-sm prose-purple">
                               {reportCard ? (
                                    <div className="animate-in fade-in duration-500" dangerouslySetInnerHTML={{ __html: reportCard }} />
                               ) : (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Brain className="text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 text-xs italic">Tap 'Full Report' for a comprehensive season review.</p>
                                    </div>
                               )}
                            </div>
                        </div>
                    </div>
                </div>
              </>
            )}
        </div>
    );
};
