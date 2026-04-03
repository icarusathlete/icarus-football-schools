import React, { useEffect, useState, useRef } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area 
} from 'recharts';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Player, AttendanceRecord, AttendanceStatus, AcademySettings, ScheduleEvent, Match } from '../types';
import { 
    Brain, FileText, Loader2, TrendingUp, Download, Upload, 
    Trash2, Database, Palette, Type, Image as ImageIcon, 
    CheckCircle, AlertTriangle, FileJson, X, Settings, 
    ChevronRight, Users, Activity, Plus, LayoutGrid, 
    Target, Trophy, Calendar, Zap, MessageSquare, Shield,
    Bell, Sparkles, Clock, MapPin
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export const AdminDashboard: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Settings State
  const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<{type: 'backup' | 'clear', id?: string} | null>(null);

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Import/Export references
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState<{isOpen: boolean, stats: any | null, error: string | null}>({
      isOpen: false, stats: null, error: null
  });
  const [importedContent, setImportedContent] = useState<string>('');

  // Local Backups
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const [showLocalBackupsModal, setShowLocalBackupsModal] = useState(false);
  const [isSavingBackup, setIsSavingBackup] = useState(false);

  // Seeding State
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
      if (!window.confirm("This will add sample players, matches, and schedule events. Continue?")) return;
      setIsSeeding(true);
      try {
          await StorageService.seedSampleData();
          // Reload to reflect all new listeners
          window.location.reload();
      } catch (e) {
          alert("Failed to seed data.");
      } finally {
          setIsSeeding(false);
      }
  };

  const loadLocalBackups = async () => {
      try {
          const backups = await StorageService.getLocalBackups();
          setLocalBackups(backups);
      } catch (e) {
          console.error("Failed to load local backups", e);
      }
  };

  const loadData = () => {
    const p = StorageService.getPlayers();
    const a = StorageService.getAttendance();
    const m = StorageService.getMatches();
    const e = StorageService.getSchedule();
    setPlayers(p);
    setAttendance(a);
    setMatches(m);
    setEvents(e);
    prepareChartData(a);
    setSettings(StorageService.getSettings());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('academy_data_update', loadData);
    const handleSettingsChange = () => setSettings(StorageService.getSettings());
    window.addEventListener('settingsChanged', handleSettingsChange);
    return () => {
        window.removeEventListener('academy_data_update', loadData);
        window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  const prepareChartData = (records: AttendanceRecord[]) => {
    const groups: Record<string, { present: number, absent: number }> = {};
    const sorted = [...records].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach(r => {
        if (!groups[r.date]) groups[r.date] = { present: 0, absent: 0 };
        if (r.status === AttendanceStatus.PRESENT) groups[r.date].present++;
        if (r.status === AttendanceStatus.ABSENT) groups[r.date].absent++;
    });
    const data = Object.keys(groups).map(date => ({
        date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Present: groups[date].present,
        Absent: groups[date].absent
    })).slice(-7);
    setChartData(data);
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
        const report = await GeminiService.analyzeAttendance(players, attendance, settings.name);
        setAiReport(report);
    } catch (e) {
        alert("AI processing unavailable. Check API credentials.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSaveLocalBackup = async () => {
      setIsSavingBackup(true);
      try {
          await StorageService.saveLocalBackup();
          await loadLocalBackups();
      } finally {
          setIsSavingBackup(false);
      }
  };

  const confirmImport = async () => {
      if (await StorageService.restoreBackup(importedContent)) {
          setImportModal({ ...importModal, isOpen: false });
          window.location.reload();
      }
  };

  const updateSetting = (key: keyof AcademySettings, value: string) => {
      setSettings(prev => ({ ...prev, [key]: value }));
      setHasUnsavedSettings(true);
  };

  const confirmDeleteAction = async () => {
      if (!deleteAction) return;
      try {
          if (deleteAction.type === 'backup' && deleteAction.id) {
              await StorageService.deleteLocalBackup(deleteAction.id);
              await loadLocalBackups();
          } else if (deleteAction.type === 'clear') {
              StorageService.clearData();
              setTimeout(() => {
                   window.location.reload();
              }, 100);
          }
      } catch (e) {
          alert(`Failed to ${deleteAction.type === 'backup' ? 'delete backup' : 'clear data'}.`);
      } finally {
          setDeleteModalOpen(false);
          setDeleteAction(null);
      }
  };

  const saveSettings = async () => {
      await StorageService.saveSettings(settings);
      setHasUnsavedSettings(false);
      setShowSettingsModal(false);
  };

  // Logic: Today's Operations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);
  const winRate = matches.length > 0 ? (matches.filter(m => m.result === 'W').length / matches.length * 100).toFixed(0) : 0;
  const avgAttendance = attendance.length > 0 ? (attendance.filter(a => a.status === AttendanceStatus.PRESENT).length / attendance.length * 100).toFixed(0) : 0;

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
        <input type="file" ref={fileInputRef} accept=".json" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const json = event.target?.result as string;
                setImportedContent(json);
                const stats = StorageService.analyzeBackup(json);
                setImportModal({ isOpen: true, stats: stats.valid ? stats.details : null, error: stats.valid ? null : 'Invalid JSON format' });
            };
            reader.readAsText(file);
        }} className="hidden" />

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
                <h1 className="text-4xl font-black italic tracking-tighter text-brand-950 uppercase flex items-center gap-3">
                    ACADEMY <span className="text-brand-500">DASHBOARD</span>
                    <LayoutGrid size={24} className="text-brand-500" />
                </h1>
                <p className="text-brand-950/60 font-black mt-1 uppercase text-[10px] tracking-[0.4em] italic">Real-time Academy Performance & Statistics</p>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="bg-brand-950 text-white px-5 py-3 rounded-2xl border border-white/5 hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-brand-500 transition-all shadow-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                >
                    <Palette size={16} />
                    APPEARANCE SETTINGS
                </button>
                <button 
                    onClick={async () => {
                        const roster = [
                            { fullName: "Aadi Malhotra", parentName: "Mrs Kavita Malhotra", contactNumber: "+91 9099288188", email: "drkavitagupta@gmail.com", address: "Tower, 7th Avenue, GC 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 01/07/2026" },
                            { fullName: "Aadvik Singh", parentName: "Mr Siddharth Chetan", contactNumber: "+91 8588879881", email: "singhsidha@gmail.com", address: "7th Avenue Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/02/2026" },
                            { fullName: "Advik Kumar", parentName: "Mrs Tanishka Naskar", contactNumber: "+91 8447192100", email: "tanishkanaskar@gmail.com", address: "14th Avenue, Gaur City 2", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/02/2026" },
                            { fullName: "Anik Singh", parentName: "Mr Sanjay Singh", contactNumber: "+91 9711234554", email: "sanjay12312@gmail.com", address: "Park Avenue, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/02/2026" },
                            { fullName: "Aarav Sharma", parentName: "Mrs Sonia Panwar", contactNumber: "+91 9911113006", email: "soniapanwar3006@gmail.com", address: "4th Avenue, Gaur City", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/04/2026" },
                            { fullName: "Atharv Srivastava", parentName: "Mrs Anupama Srivastava", contactNumber: "+91 8447055577", email: "", address: "Ajnara Gen-X, Noida", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 30/04/2026" },
                            { fullName: "Dakshesh Pratap Singh", parentName: "Mr Tanmay Singh", contactNumber: "+91 7081521690", email: "tanmay.uflex@gmail.com", address: "1st Avenue, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/02/2026" },
                            { fullName: "Gurshaan Singh", parentName: "Mr Gurbhej Singh", contactNumber: "+91 9958255233", email: "mrsingh1422@gmail.com", address: "11th Avenue, Gaur City 2", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 30/04/2026" },
                            { fullName: "Ibrahim Khan", parentName: "Mr Khawar Khan", contactNumber: "+91 9911030200", email: "khan_khawar_khan@hotmail.com", address: "Nirala greenshire, Noida", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/02/2026" },
                            { fullName: "Manas Gupta", parentName: "Mr Rishi Gupta", contactNumber: "+91 9871063235", email: "rishigupta5552@gmail.com", address: "Saya Zion, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/02/2026" },
                            { fullName: "Manheim Srivastava", parentName: "Mr Ritesh Kumar Srivastava", contactNumber: "+91 9513874009", email: "viti.esh19@gmail.com", address: "L-8, Amrapali Golf Homes", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 01/04/2026" },
                            { fullName: "Reyaan Singh", parentName: "Mr Parul Chaudhary", contactNumber: "+91 9310748201", email: "Parulc1911@gmail.com", address: "Palm Olympia, Noida", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/02/2026" },
                            { fullName: "Reyansh Sharma", parentName: "Mr पवन Kumar Sharma", contactNumber: "+91 9910903653", email: "pawansharma07@gmail.com", address: "10075 ,Tower J, 14th Avenue, GC 2", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 27/09/2026" },
                            { fullName: "Rhythm Garg", parentName: "Mrs Vishal Garg", contactNumber: "+91 9810455512", email: "me.jyotika@gmail.com", address: "C Tower, 7th Avenue, GC 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/02/2026" },
                            { fullName: "Shashwat Chaudhary", parentName: "Mr Manoj Chaudhary", contactNumber: "+91 9818321282", email: "choudharymannu7@gmail.com", address: "Saya Zion, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 13/07/2026" },
                            { fullName: "Shivansh Chandraker", parentName: "Mr Raghuvendra Kumar", contactNumber: "+91 9485175415", email: "raghabadde@gmail.com", address: "6th Avenue, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 31/07/2026" },
                            { fullName: "Shivay Bajaj", parentName: "Mr Parul Bajaj", contactNumber: "+91 9818043821", email: "bajajpassi@gmail.com", address: "Saya Zion, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 31/07/2026" },
                            { fullName: "Sushant Chaudhary", parentName: "Mr Manoj Chaudhary", contactNumber: "+91 9818321282", email: "manojchoudhary23@gmail.com", address: "Saya Zion, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 13/07/2026" },
                            { fullName: "Syed Baaman", parentName: "Mrs Sabiya Kirmani", contactNumber: "+91 9797001234", email: "sabiyakirmani.sk@gmail.com", address: "Park Avenue, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 31/07/2026" },
                            { fullName: "Takshit Singh", parentName: "Mr Nitin Teotia", contactNumber: "+91 9540008836", email: "nitinteotia2341@gmail.com", address: "Saya Zion, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/07/2026" },
                            { fullName: "Vihaan Gujrati", parentName: "Mrs Vinni Gujrati", contactNumber: "+91 9717300014", email: "vinnigujrati21@gmail.com", address: "Park Avenue, Gaur City 1", venue: "Playall, Gaur City Sports Complex", batch: "5 Days A Week (Mon-Fri)", dateOfBirth: "2015-01-01", position: "TBD", photoUrl: "", registeredAt: "2026-04-03", notes: "Coach: Abhishek Begal. Fees Ending: 28/02/2026" }
                        ];
                        for (const p of roster) {
                            await StorageService.addPlayer(p as any);
                        }
                        alert("Gaur City Roster Imported Successfully!");
                        window.location.reload();
                    }}
                    className="bg-brand-500 text-brand-950 px-5 py-3 rounded-2xl shadow-xl shadow-brand-500/20 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                >
                    <Users size={16} />
                    IMPORT GAUR CITY
                </button>
                <div className="relative group">
                    <div className="bg-brand-950 p-3 rounded-2xl border border-white/5 text-brand-500 cursor-help">
                        <Shield size={20} />
                    </div>
                </div>
            </div>
        </div>

        {/* HUD Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
                { label: 'TOTAL ATHLETES', val: players.length, icon: Users, color: 'text-brand-950', unit: 'ATHLETES', accent: 'bg-brand-950' },
                { label: 'WIN RATIO', val: `${winRate}%`, icon: Trophy, color: 'text-brand-950', unit: 'SEASON', accent: 'bg-brand-950' },
                { label: 'AVG ATTENDANCE', val: `${avgAttendance}%`, icon: Activity, color: 'text-brand-950', unit: 'DAILY', accent: 'bg-brand-950' },
                { label: 'MATCHES RECORDED', val: matches.length, icon: Target, color: 'text-brand-950', unit: 'RECORDED', accent: 'bg-brand-950' },
            ].map((hud, i) => (
                <div key={i} className="bg-brand-500 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-700 font-black text-brand-950"><hud.icon size={64} /></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className={`px-3 py-1 rounded-full bg-brand-950 border border-white/5 flex items-center gap-2`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${hud.accent.replace('brand-950', 'white')} animate-pulse`} />
                            <span className="text-[8px] font-black text-white uppercase tracking-tight lg:tracking-[0.2em]">{hud.label}</span>
                        </div>
                        <span className="text-[9px] font-black text-brand-950 uppercase tracking-widest">{hud.unit}</span>
                    </div>
                    <div className="relative z-10">
                        <p className={`text-3xl md:text-5xl font-black ${hud.color} tracking-tighter italic leading-none`} style={{ fontFamily: 'Orbitron' }}>{hud.val}</p>
                        <div className="w-12 h-1 bg-brand-950/20 mt-4 rounded-full overflow-hidden">
                            <div className={`h-full ${hud.accent} w-2/3 group-hover:w-full transition-all duration-1000 shadow-[0_0_10px_rgba(13,27,138,0.3)] opacity-50`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Quick Actions & Agenda */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-8 space-y-8">
                {/* Operations Agenda */}
                <section className="bg-brand-500 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                    <div className="bg-brand-950/20 px-8 py-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest italic">
                            <Clock size={16} className="text-white" /> ACADEMY SCHEDULE • TODAY
                        </h3>
                        <span className="text-[10px] font-black text-white/60 uppercase">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="p-8">
                        {todayEvents.length > 0 ? (
                            <div className="space-y-4">
                                {todayEvents.map(ev => (
                                    <div key={ev.id} className="flex items-center gap-6 p-4 bg-brand-950/30 rounded-2xl border border-white/5 hover:border-brand-500/30 transition-all group">
                                        <div className="w-16 text-center border-r border-white/5 pr-6">
                                            <p className="text-xs font-black text-white">{ev.time}</p>
                                            <p className="text-[8px] font-bold text-brand-600 uppercase">Start</p>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-black text-white group-hover:text-brand-500 transition-colors italic uppercase">{ev.title}</h4>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-brand-500 mt-1">
                                                <MapPin size={10} /> {ev.location}
                                                <span className="opacity-30">•</span>
                                                <span className="text-brand-500 opacity-100 uppercase">{ev.type}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-brand-800" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Zap size={40} className="mx-auto text-brand-700 opacity-20 mb-4" />
                                <p className="text-xs font-black text-brand-600 uppercase tracking-widest">No deployments scheduled for today</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Analytical Trend */}
                <section className="bg-brand-500 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-8">
                         <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest italic">
                            <Activity size={16} className="text-white" /> ENGAGEMENT INDEX
                        </h3>
                        <div className="flex gap-4">
                             <div className="flex items-center gap-2 text-[9px] font-black text-white/60 uppercase tracking-tighter">
                                <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]" /> ATTENDANCE
                             </div>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: 'rgba(255,255,255,0.7)', fontWeight: 900}} />
                                <Tooltip 
                                    contentStyle={{ background: '#0D1B8A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="Present" stroke="#FFFFFF" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            {/* Sidebar Col: AI & Tools */}
            <div className="lg:col-span-4 space-y-8">
                {/* AI Assistant Section */}
                <section className="bg-brand-500 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden flex flex-col h-full">
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 blur-[80px] rounded-full" />
                        <div className="flex items-center gap-3 mb-6 relative">
                            <div className="p-2.5 bg-brand-950 text-brand-500 rounded-2xl shadow-lg border border-white/10">
                                <Brain size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm italic uppercase">AI ASSISTANT</h3>
                                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Academy Analytics Engine</p>
                            </div>
                            <Sparkles className="ml-auto text-white/40" size={14} />
                        </div>

                    <div className="flex-1 bg-brand-950/20 rounded-3xl p-6 mb-6 border border-white/10 overflow-y-auto max-h-[300px] text-xs leading-relaxed text-white custom-scrollbar relative">
                        {isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <Loader2 className="animate-spin text-white w-8 h-8" />
                                <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] animate-pulse">Scanning Databases...</p>
                            </div>
                        ) : aiReport ? (
                            <div className="prose prose-invert prose-xs text-white" dangerouslySetInnerHTML={{ __html: aiReport }} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-4">
                                <Activity size={32} className="text-white/20 mb-4" />
                                <p className="text-[10px] font-bold text-white uppercase tracking-widest leading-loose">Analyze attendance trends and squad readiness.</p>
                            </div>
                        )}
                    </div>

                    <button 
                         onClick={handleAiAnalysis} disabled={isAnalyzing}
                         className="w-full py-4 bg-brand-950 text-brand-500 font-black rounded-2xl text-xs uppercase tracking-[0.2em] border border-brand-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Zap size={16} fill="currentColor" />
                        {aiReport ? 'REFRESH INTEL' : 'EXECUTE ANALYSIS'}
                    </button>
                </section>

                {/* Quick Action Hub */}
                <section className="bg-brand-500 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6 ml-2 flex items-center gap-2 italic">
                        <Plus size={14} className="text-white" /> QUICK ACTIONS
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        <button className="flex items-center justify-between p-5 bg-brand-950/20 border border-white/5 rounded-2xl hover:bg-brand-950 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-xl group-hover:text-brand-500 transition-colors"><Plus size={18} /></div>
                                <span className="font-black text-white text-xs uppercase italic tracking-widest truncate">Enroll New Athlete</span>
                            </div>
                            <ChevronRight size={16} className="text-white/20 group-hover:text-white" />
                        </button>
                        <button className="flex items-center justify-between p-5 bg-brand-950/20 border border-white/5 rounded-2xl hover:bg-brand-950 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-xl group-hover:text-brand-500 transition-colors"><Trophy size={18} /></div>
                                <span className="font-black text-white text-xs uppercase italic tracking-widest truncate">Log Match Result</span>
                            </div>
                            <ChevronRight size={16} className="text-white/20 group-hover:text-white" />
                        </button>
                    </div>
                </section>

                {/* DB Archive Tools */}
                <section className="bg-brand-500/10 backdrop-blur-xl rounded-[2.5rem] border border-brand-500/30 p-8 shadow-2xl">
                    <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] mb-6 ml-1 italic flex items-center justify-between">
                        STORAGE & PROTOCOLS
                        <Database size={12} className="text-brand-700" />
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                         <button onClick={StorageService.triggerBackupDownload} className="w-full py-3 bg-brand-950 border border-white/5 text-brand-400 rounded-xl hover:bg-white/5 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                             <Download size={14} /> EXPORT SEED
                         </button>
                         <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-brand-950 border border-white/5 text-brand-400 rounded-xl hover:bg-white/5 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                             <Upload size={14} /> RESTORE BACKUP
                         </button>
                         <div className="h-px bg-white/5 my-2" />
                         
                         {/* Engineering Tool: Sample Data moved here */}
                         <button 
                            onClick={handleSeedData} disabled={isSeeding}
                            className="w-full py-3 bg-brand-950/20 border border-white/5 text-brand-600 rounded-xl hover:border-brand-500/30 hover:text-brand-500 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group"
                         >
                            <Zap size={12} className={isSeeding ? 'animate-spin' : ''} />
                            {isSeeding ? 'SEEDING...' : 'INIT SAMPLE RECORDS'}
                         </button>

                         <button onClick={() => { setDeleteAction({ type: 'clear' }); setDeleteModalOpen(true); }} className="w-full py-3 bg-red-900/10 border border-red-900/30 text-red-500 rounded-xl hover:bg-red-900 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                             <Trash2 size={14} /> WIPE CORE
                         </button>
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-[8px] font-black text-brand-700 uppercase tracking-[0.3em]">System: Secured & Encrypted</p>
                    </div>
                </section>
            </div>
        </div>

        {/* Branding Settings Modal */}
        {showSettingsModal && (
            <div className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-brand-500/10 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-brand-500/30 flex flex-col max-h-[90vh] overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-30" />
                    
                    <div className="bg-brand-950/50 px-10 py-6 border-b border-white/5 flex justify-between items-center">
                         <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">IDENTITY <span className="text-brand-500">CONFIGURATION</span></h3>
                         <button onClick={() => setShowSettingsModal(false)} className="p-3 hover:bg-white/10 rounded-full text-brand-500 transition-colors"><X size={24}/></button>
                    </div>

                    <div className="p-10 overflow-y-auto custom-scrollbar space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">ACADEMY DESIGNATION</label>
                                <input 
                                    type="text" 
                                    className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-brand-500 outline-none font-bold text-white shadow-inner"
                                    value={settings.name}
                                    onChange={(e) => updateSetting('name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1">INTERFACE FONT</label>
                                <select 
                                    className="w-full p-4 bg-brand-800 border border-white/10 rounded-2xl focus:border-brand-500 outline-none font-bold text-white shadow-inner appearance-none"
                                    value={settings.fontFamily}
                                    onChange={(e) => updateSetting('fontFamily', e.target.value)}
                                >
                                    <option value="Orbitron">Orbitron</option>
                                    <option value="Inter">Inter</option>
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Oswald">Oswald</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-brand-800 p-8 rounded-3xl border border-white/5 space-y-8">
                             <div className="flex flex-col md:flex-row gap-10 items-center">
                                 <div className="relative group">
                                     <div className="w-32 h-32 bg-brand-950 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-500/50 shadow-inner">
                                         {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain p-2" /> : <ImageIcon size={32} className="text-brand-800" />}
                                         <div onClick={() => logoInputRef.current?.click()} className="absolute inset-0 bg-brand-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                             <Upload className="text-brand-500" size={24} />
                                         </div>
                                     </div>
                                     <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                         const file = e.target.files?.[0];
                                         if(file) {
                                             const reader = new FileReader();
                                             reader.onloadend = () => { updateSetting('logoUrl', reader.result as string); };
                                             reader.readAsDataURL(file);
                                         }
                                     }} />
                                 </div>
                                 <div className="flex-1 w-full space-y-4">
                                     <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em]">IDENTITY MARK (LOGO)</h4>
                                     <p className="text-xs text-brand-400 italic font-medium">Upload a transparent SVG or high-res PNG. This mark will appear on all scout reports, match center headers, and the player portal.</p>
                                     <button onClick={() => logoInputRef.current?.click()} className="w-full py-3 bg-brand-900 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-brand-500 hover:text-brand-950 transition-all font-display italic">UPLOAD NEW LOGO</button>
                                 </div>
                             </div>
                        </div>

                        <div className="space-y-4">
                             <label className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] ml-1 text-center block">CHROMATIC SIGNATURE</label>
                             <div className="flex gap-4">
                                 <div className="flex-1 space-y-2">
                                     <p className="text-[8px] font-black text-brand-600 uppercase text-center">Primary</p>
                                     <div className="flex items-center gap-3 bg-brand-800 p-3 rounded-2xl border border-white/5">
                                         <input type="color" value={settings.primaryColor} onChange={(e) => updateSetting('primaryColor', e.target.value)} className="h-8 w-12 rounded-lg cursor-pointer bg-transparent border-none" />
                                         <span className="text-[10px] font-mono text-white/50">{settings.primaryColor}</span>
                                     </div>
                                 </div>
                                 <div className="flex-1 space-y-2">
                                     <p className="text-[8px] font-black text-brand-600 uppercase text-center">Secondary</p>
                                     <div className="flex items-center gap-3 bg-brand-800 p-3 rounded-2xl border border-white/5">
                                         <input type="color" value={settings.secondaryColor} onChange={(e) => updateSetting('secondaryColor', e.target.value)} className="h-8 w-12 rounded-lg cursor-pointer bg-transparent border-none" />
                                         <span className="text-[10px] font-mono text-white/50">{settings.secondaryColor}</span>
                                     </div>
                                 </div>
                             </div>
                             {/* Preview */}
                             <div className="h-20 rounded-3xl flex items-center px-8 text-white shadow-2xl relative overflow-hidden" 
                                style={{ background: `linear-gradient(90deg, ${settings.primaryColor}, ${settings.secondaryColor})` }}>
                                 <div className="relative z-10">
                                     <h4 className="font-black text-xl italic uppercase tracking-tighter" style={{ fontFamily: settings.fontFamily }}>{settings.name || 'ACADEMY CORE'}</h4>
                                     <p className="text-[9px] font-black opacity-80 uppercase tracking-widest">Portal Aesthetic Preview</p>
                                 </div>
                                 <div className="absolute right-0 bottom-0 p-4 opacity-20"><Shield size={64} /></div>
                             </div>
                        </div>
                    </div>

                    <div className="px-10 py-6 border-t border-white/5 bg-brand-950/50 flex gap-4">
                        <button onClick={() => setShowSettingsModal(false)} className="px-8 py-4 text-brand-500 font-bold hover:text-white transition-colors text-xs uppercase tracking-widest">Discard Changes</button>
                        <button 
                            onClick={saveSettings} disabled={!hasUnsavedSettings}
                            className="flex-1 py-4 bg-brand-500 text-brand-950 font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                        >
                            <CheckCircle size={18} className="inline mr-2" />
                            SAVE BRANDING SETTINGS
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Local Backups Modal */}
        {showLocalBackupsModal && (
            <div className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-brand-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="bg-brand-950/50 px-10 py-6 border-b border-white/5 flex justify-between items-center">
                         <h3 className="font-black text-2xl text-white italic uppercase tracking-tight">LOCAL <span className="text-brand-500">ARCHIVE</span></h3>
                         <button onClick={() => setShowLocalBackupsModal(false)} className="p-3 hover:bg-white/10 rounded-full text-brand-500 transition-colors"><X size={24}/></button>
                    </div>
                    <div className="p-10 overflow-y-auto custom-scrollbar space-y-8">
                        <button onClick={handleSaveLocalBackup} disabled={isSavingBackup} className="w-full py-4 bg-brand-800 border-2 border-dashed border-white/10 hover:border-brand-500/50 rounded-2xl text-brand-400 hover:text-white transition-all flex items-center justify-center gap-3">
                            {isSavingBackup ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            <span className="text-xs font-black uppercase tracking-widest">INITIALIZE NEW ARCHIVE</span>
                        </button>

                        <div className="space-y-3">
                            {localBackups.map(backup => (
                                <div key={backup.id} className="bg-brand-800 p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/10">
                                    <div>
                                        <h4 className="font-black text-white text-sm italic uppercase tracking-widest">{backup.name}</h4>
                                        <p className="text-[10px] font-medium text-brand-500 mt-1">{new Date(backup.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={async () => {
                                            if(await StorageService.restoreBackup(backup.data)) window.location.reload();
                                        }} className="px-4 py-2 bg-brand-950 text-brand-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 hover:bg-brand-500 hover:text-brand-950 transition-all uppercase tracking-tight">RESTORE DATA</button>
                                        <button onClick={async () => { 
                                            await StorageService.deleteLocalBackup(backup.id);
                                            await loadLocalBackups();
                                        }} className="p-2 text-brand-700 hover:text-red-500"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        <ConfirmModal
            isOpen={deleteModalOpen}
            onCancel={() => { setDeleteModalOpen(false); setDeleteAction(null); }}
            onConfirm={confirmDeleteAction}
            title={deleteAction?.type === 'backup' ? "Delete Archive" : "REDLINE PROTOCOL"}
            message={deleteAction?.type === 'backup' ? "Permanently remove this archive signal?" : "CRITICAL: This will initiate a complete system wipe. Restore data via JSON if needed. Authorize?"}
            requireTypeToConfirm={deleteAction?.type === 'clear' ? "CLEAR" : undefined}
        />
    </div>
  );
};
