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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 animate-fade-in">
            <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-brand-900 uppercase flex items-center gap-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    ACADEMY <span className="premium-gradient-text">HUB</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                </h1>
                <p className="text-brand-900/40 font-bold mt-0.5 uppercase text-[8px] tracking-[0.3em]">Elite Performance Management Ecosystem</p>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="glass-card px-4 py-2.5 text-brand-900 transition-all font-bold text-[10px] uppercase tracking-wider flex items-center gap-2.5 border-brand-500/10 hover:border-brand-500/30"
                >
                    <Settings size={14} className="text-brand-500" />
                    SYSTEM CONFIG
                </button>
                <div className="relative group">
                    <div className="glass-card p-3 text-brand-500 cursor-help border-brand-500/10">
                        <Shield size={18} />
                    </div>
                </div>
            </div>
        </div>

        {/* HUD Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 animate-slide-up">
            {[
                { label: 'TOTAL ATHLETES', val: players.length, icon: Users, color: 'text-brand-950', unit: 'SQUAD SIZE', accent: 'bg-brand-500' },
                { label: 'WIN RATIO', val: `${winRate}%`, icon: Trophy, color: 'text-brand-950', unit: 'SEASON PERFORMANCE', accent: 'bg-lime' },
                { label: 'AVG ATTENDANCE', val: `${avgAttendance}%`, icon: Activity, color: 'text-brand-950', unit: 'DAILY ENGAGEMENT', accent: 'bg-brand-primary' },
                { label: 'MATCH CENTER', val: matches.length, icon: Target, color: 'text-brand-950', unit: 'DATA ENTRIES', accent: 'bg-brand-secondary' },
            ].map((hud, i) => (
                <div key={i} className="glass-card p-6 relative overflow-hidden group border-brand-500/5 hover:border-brand-500/20">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <span className="text-[8px] font-black text-brand-900/40 uppercase tracking-[0.25em]">{hud.label}</span>
                        <hud.icon size={14} className="text-brand-500/30" />
                    </div>
                    <div className="relative z-10 flex items-baseline gap-2">
                        <p className={`text-3xl font-black text-brand-900 tracking-tighter`} 
                           style={{ fontFamily: 'Orbitron, sans-serif' }}>{hud.val}</p>
                        <span className="text-[7px] font-bold text-brand-500/60 uppercase">{hud.unit.split(' ')[0]}</span>
                    </div>
                    <div className="mt-4 w-full h-1 bg-brand-900/5 rounded-full overflow-hidden">
                        <div className={`h-full ${hud.accent} opacity-40`} style={{ width: '65%' }} />
                    </div>
                </div>
            ))}
        </div>

        {/* Quick Actions & Agenda */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            
            <div className="lg:col-span-8 space-y-8">
                {/* Operations Agenda */}
                <section className="glass-card overflow-hidden">
                    <div className="px-8 py-5 border-b border-brand-950/5 flex items-center justify-between bg-brand-900/5">
                        <h3 className="text-[10px] font-black text-brand-950/60 flex items-center gap-3 uppercase tracking-[0.3em]">
                            <Clock size={14} className="text-brand-500" /> ACADEMY LOGS • TODAY
                        </h3>
                        <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest bg-brand-500/10 px-3 py-1 rounded-full">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="p-8">
                        {todayEvents.length > 0 ? (
                            <div className="space-y-3">
                                {todayEvents.map(ev => (
                                    <div key={ev.id} className="flex items-center gap-6 p-5 rounded-xl bg-white border border-brand-900/5 hover:border-brand-500/20 transition-all group">
                                        <div className="w-20 border-r border-brand-900/5 pr-6">
                                            <p className="text-xs font-black text-brand-900" style={{ fontFamily: 'Orbitron, sans-serif' }}>{ev.time}</p>
                                            <p className="text-[7px] font-bold text-brand-900/30 uppercase mt-0.5">LOCAL TIME</p>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black text-brand-900 uppercase tracking-tight">{ev.title}</h4>
                                            <div className="flex items-center gap-3 text-[9px] font-bold text-brand-900/40 mt-1.5 uppercase tracking-wider">
                                                <div className="flex items-center gap-1.5"><MapPin size={10} className="text-brand-500/50" /> {ev.location}</div>
                                                <span className="text-brand-500/40">•</span>
                                                <span className="text-brand-500 font-black">{ev.type}</span>
                                            </div>
                                        </div>
                                        <button className="p-2.5 rounded-lg bg-brand-900/5 text-brand-900/20 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-sm">
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="inline-block p-4 rounded-full bg-brand-950/5 mb-4">
                                     <Zap size={32} className="text-brand-500/20" />
                                </div>
                                <p className="text-[10px] font-black text-brand-950/30 uppercase tracking-[0.25em]">No active deployments found for today</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Analytical Trend */}
                <section className="glass-card p-8 group border-brand-500/5">
                    <div className="flex justify-between items-center mb-10">
                         <div className="flex flex-col">
                            <h3 className="text-[9px] font-black text-brand-900/40 flex items-center gap-2.5 uppercase tracking-[0.3em]">
                                <Activity size={14} className="text-brand-500" /> ENGAGEMENT INDEX
                            </h3>
                            <p className="text-[7px] font-bold text-brand-900/20 uppercase mt-1">SQUAD ATTENDANCE VELOCITY • LAST 7 DAYS</p>
                         </div>
                        <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2 text-[8px] font-black text-brand-900/60 uppercase tracking-widest bg-brand-900/5 px-3 py-1.5 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" /> LIVE TELEMETRY
                             </div>
                        </div>
                    </div>
                    <div className="h-64 w-full relative">
                        <ResponsiveContainer width="100%" height="100%" id="engagement-index-chart">
                            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00C8FF" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#00C8FF" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(13,27,138,0.03)" />
                                <XAxis dataKey="date" 
                                       axisLine={false} 
                                       tickLine={false} 
                                       tick={{fontSize: 8, fill: 'rgba(13,27,138,0.3)', fontWeight: 700}} 
                                />
                                <YAxis axisLine={false} 
                                       tickLine={false} 
                                       tick={{fontSize: 8, fill: 'rgba(13,27,138,0.3)', fontWeight: 700}} />
                                <Tooltip 
                                    contentStyle={{ background: '#0D1B8A', border: 'none', borderRadius: '8px', fontSize: '10px', color: '#fff' }}
                                    itemStyle={{ color: '#00C8FF', fontWeight: 'bold' }}
                                    cursor={{ stroke: 'rgba(0,200,255,0.2)', strokeWidth: 2 }}
                                />
                                <Area type="monotone" dataKey="Present" stroke="#00C8FF" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVisits)" dot={{ r: 3, fill: '#00C8FF', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#00C8FF', stroke: '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            {/* Sidebar Col: AI & Tools */}
            <div className="lg:col-span-4 space-y-8">
                {/* AI Assistant Section */}
                <section className="glass-card p-8 flex flex-col group border-brand-500/5 bg-brand-900/5">
                        <div className="flex items-center gap-3 mb-6 relative">
                            <div className="p-2.5 bg-brand-900 text-brand-500 rounded-lg shadow-sm border border-white/5 transition-colors">
                                <Brain size={16} />
                            </div>
                            <div>
                                <h3 className="font-black text-brand-900 text-[10px] uppercase tracking-wider">SQUAD INTELLIGENCE</h3>
                                <p className="text-[7px] font-bold text-brand-900/30 uppercase tracking-widest mt-0.5">Automated Performance Protocol</p>
                            </div>
                            <Sparkles className="ml-auto text-brand-500/30 animate-pulse" size={12} />
                        </div>

                    <div className="flex-1 bg-white/50 rounded-xl p-5 mb-6 border border-brand-900/5 overflow-y-auto max-h-[300px] text-[10px] leading-relaxed text-brand-900 font-medium custom-scrollbar relative">
                        {isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <div className="w-8 h-8 rounded-full border-2 border-brand-500/10 border-t-brand-500 animate-spin" />
                                <p className="text-[7px] font-bold text-brand-900/40 uppercase tracking-[0.2em]">Processing Squad Data...</p>
                            </div>
                        ) : aiReport ? (
                            <div className="prose prose-xs text-brand-900" dangerouslySetInnerHTML={{ __html: aiReport }} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-6">
                                <Activity size={24} className="text-brand-900/5 mb-4" />
                                <p className="text-[8px] font-bold text-brand-900/30 uppercase tracking-[0.2em] leading-relaxed max-w-[150px]">Initialize tactical assessment & readiness benchmarks</p>
                            </div>
                        )}
                    </div>

                    <button 
                         onClick={handleAiAnalysis} disabled={isAnalyzing}
                         className="w-full py-4 bg-brand-900 text-white font-bold rounded-xl text-[9px] uppercase tracking-[0.25em] hover:bg-brand-950 transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-900/10"
                    >
                        <Zap size={14} className="text-brand-500" fill="currentColor" />
                        {aiReport ? 'REFRESH PROTOCOL' : 'INITIALIZE PERFORMANCE AUDIT'}
                    </button>
                </section>

                {/* Quick Action Hub */}
                <section className="glass-card p-8">
                    <h3 className="text-[9px] font-black text-brand-950/40 uppercase tracking-[0.3em] mb-6 ml-1 flex items-center gap-3">
                        <Plus size={12} className="text-brand-500" /> SYSTEM DEPLOYMENTS
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        <button className="flex items-center justify-between p-4 bg-white/40 border border-brand-950/5 rounded-xl hover:border-brand-500/20 hover:bg-white/80 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-brand-950/5 rounded-lg group-hover:text-brand-500 transition-colors"><Plus size={16} /></div>
                                <span className="font-bold text-brand-950 text-[10px] uppercase tracking-widest truncate">REGISTER ATHLETE</span>
                            </div>
                            <ChevronRight size={14} className="text-brand-950/10 group-hover:text-brand-950/40" />
                        </button>
                        <button className="flex items-center justify-between p-4 bg-white/40 border border-brand-950/5 rounded-xl hover:border-brand-500/20 hover:bg-white/80 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-brand-950/5 rounded-lg group-hover:text-brand-500 transition-colors"><Trophy size={16} /></div>
                                <span className="font-bold text-brand-950 text-[10px] uppercase tracking-widest truncate">LOG MATCH DATA</span>
                            </div>
                            <ChevronRight size={14} className="text-brand-950/10 group-hover:text-brand-950/40" />
                        </button>
                    </div>
                </section>

                {/* DB Archive Tools */}
                <section className="glass-card p-8 bg-brand-900/5">
                    <h4 className="text-[9px] font-black text-brand-950/40 uppercase tracking-[0.3em] mb-6 ml-1 flex items-center justify-between">
                        VAULT & PROTOCOLS
                        <Database size={12} className="text-brand-500 opacity-40" />
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                         <div className="grid grid-cols-2 gap-3">
                            <button onClick={StorageService.triggerBackupDownload} className="py-3 bg-white border border-brand-950/10 text-brand-950 rounded-xl hover:border-brand-500/50 transition-all text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm">
                                <Download size={12} /> EXPORT
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="py-3 bg-white border border-brand-950/10 text-brand-950 rounded-xl hover:border-brand-500/50 transition-all text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm">
                                <Upload size={12} /> RESTORE
                            </button>
                         </div>
                         
                         <button 
                            onClick={handleSeedData} disabled={isSeeding}
                            className="w-full py-4 bg-lime/10 border border-lime/30 text-brand-900 rounded-xl hover:bg-lime/20 transition-all text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-3 group"
                         >
                            <Zap size={14} className={`text-lime ${isSeeding ? 'animate-spin' : ''}`} fill="currentColor" />
                            {isSeeding ? 'INITIALIZING...' : 'RESTORE FACTORY RECORDS'}
                         </button>

                          <button onClick={() => { setDeleteAction({ type: 'clear' }); setDeleteModalOpen(true); }} className="w-full py-3 text-red-500/40 hover:text-red-600 transition-all text-[8px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 mt-4">
                              <Trash2 size={12} /> EMERGENCY DATA WIPE
                          </button>
                    </div>
                </section>
            </div>
        </div>

        {/* Branding Settings Modal */}
        {showSettingsModal && (
            <div className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-brand-950/5 flex flex-col max-h-[90vh] overflow-hidden relative">
                    <div className="bg-brand-950/5 px-10 py-6 border-b border-brand-950/5 flex justify-between items-center">
                         <h3 className="font-black text-2xl text-brand-950 italic uppercase tracking-tight">IDENTITY <span className="text-brand-500">CONFIGURATION</span></h3>
                         <button onClick={() => setShowSettingsModal(false)} className="p-3 hover:bg-brand-950/5 rounded-full text-brand-950/40 transition-colors"><X size={24}/></button>
                    </div>

                    <div className="p-10 overflow-y-auto custom-scrollbar space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-950/40 uppercase tracking-[0.2em] ml-1">ACADEMY DESIGNATION</label>
                                <input 
                                    type="text" 
                                    className="w-full p-4 bg-brand-50 border border-brand-950/5 rounded-2xl focus:border-brand-500 outline-none font-bold text-brand-950 shadow-inner"
                                    value={settings.name}
                                    onChange={(e) => updateSetting('name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-950/40 uppercase tracking-[0.2em] ml-1">INTERFACE FONT</label>
                                <select 
                                    className="w-full p-4 bg-brand-50 border border-brand-950/5 rounded-2xl focus:border-brand-500 outline-none font-bold text-brand-950 shadow-inner appearance-none"
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

                        <div className="bg-brand-50 p-8 rounded-3xl border border-brand-950/5 space-y-8">
                             <div className="flex flex-col md:flex-row gap-10 items-center">
                                 <div className="relative group">
                                     <div className="w-32 h-32 bg-white rounded-full border-2 border-dashed border-brand-950/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-500/50 shadow-inner">
                                         {settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain p-2" /> : <ImageIcon size={32} className="text-brand-950/10" />}
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
                                     <h4 className="text-[10px] font-black text-brand-950 uppercase tracking-[0.2em]">IDENTITY MARK (LOGO)</h4>
                                     <p className="text-xs text-brand-950/40 italic font-medium leading-relaxed">Upload a high-resolution identification mark. PNG or SVG format with transparent backgrounds strongly recommended for professional reports.</p>
                                     <button onClick={() => logoInputRef.current?.click()} className="w-full py-3 bg-brand-950 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 transition-all">UPLOAD NEW LOGO</button>
                                 </div>
                             </div>
                        </div>

                        <div className="space-y-4">
                             <label className="text-[10px] font-black text-brand-950/40 uppercase tracking-[0.2em] ml-1 text-center block">CHROMATIC SIGNATURE</label>
                             <div className="flex gap-4">
                                 <div className="flex-1 space-y-2">
                                     <p className="text-[8px] font-black text-brand-950/40 uppercase text-center">Primary</p>
                                     <div className="flex items-center gap-3 bg-brand-50 p-3 rounded-2xl border border-brand-950/5">
                                         <input type="color" value={settings.primaryColor} onChange={(e) => updateSetting('primaryColor', e.target.value)} className="h-8 w-12 rounded-lg cursor-pointer bg-transparent border-none" />
                                         <span className="text-[10px] font-mono text-brand-950/30">{settings.primaryColor}</span>
                                     </div>
                                 </div>
                                 <div className="flex-1 space-y-2">
                                     <p className="text-[8px] font-black text-brand-950/40 uppercase text-center">Secondary</p>
                                     <div className="flex items-center gap-3 bg-brand-50 p-3 rounded-2xl border border-brand-950/5">
                                         <input type="color" value={settings.secondaryColor} onChange={(e) => updateSetting('secondaryColor', e.target.value)} className="h-8 w-12 rounded-lg cursor-pointer bg-transparent border-none" />
                                         <span className="text-[10px] font-mono text-brand-950/30">{settings.secondaryColor}</span>
                                     </div>
                                 </div>
                             </div>
                             {/* Preview */}
                             <div className="h-24 rounded-3xl flex items-center px-8 text-white shadow-xl relative overflow-hidden" 
                                style={{ background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` }}>
                                 <div className="relative z-10">
                                     <h4 className="font-black text-2xl italic uppercase tracking-tighter" style={{ fontFamily: settings.fontFamily }}>{settings.name || 'ACADEMY CORE'}</h4>
                                     <p className="text-[9px] font-black opacity-80 uppercase tracking-widest">Portal Preview: Active Signature</p>
                                 </div>
                                 <div className="absolute right-0 bottom-0 p-4 opacity-10"><Shield size={80} /></div>
                             </div>
                        </div>
                    </div>

                    <div className="px-10 py-6 border-t border-brand-950/5 bg-brand-50 flex gap-4">
                        <button onClick={() => setShowSettingsModal(false)} className="px-8 py-4 text-brand-950/40 font-black hover:text-brand-950 transition-colors text-xs uppercase tracking-widest">Discard</button>
                        <button 
                            onClick={saveSettings} disabled={!hasUnsavedSettings}
                            className="flex-1 py-4 bg-brand-950 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.2em] disabled:opacity-30"
                        >
                            <CheckCircle size={18} className="inline mr-2 text-lime" />
                            DEPLOY BRANDING PROTOCOLS
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Local Backups Modal */}
        {showLocalBackupsModal && (
            <div className="fixed inset-0 z-[100] bg-brand-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl border border-brand-950/5 flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="bg-brand-950 px-10 py-8 flex justify-between items-center text-white">
                         <div>
                            <h3 className="font-black text-2xl italic uppercase tracking-tight">LOCAL <span className="text-brand-500">ARCHIVE</span></h3>
                            <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest mt-1">Data Snapshots & Restore Points</p>
                         </div>
                         <button onClick={() => setShowLocalBackupsModal(false)} className="p-3 hover:bg-white/10 rounded-full text-white/40 transition-colors"><X size={24}/></button>
                    </div>
                    <div className="p-10 overflow-y-auto custom-scrollbar space-y-6">
                        <button onClick={handleSaveLocalBackup} disabled={isSavingBackup} className="w-full py-5 bg-brand-50 border-2 border-dashed border-brand-950/10 hover:border-brand-500/50 rounded-2xl text-brand-950/40 hover:text-brand-950 transition-all flex items-center justify-center gap-3 group">
                            {isSavingBackup ? <Loader2 size={18} className="animate-spin text-brand-500" /> : <Plus size={18} className="group-hover:text-brand-500" />}
                            <span className="text-xs font-black uppercase tracking-widest">INITIALIZE NEW ARCHIVE</span>
                        </button>

                        <div className="space-y-3">
                            {localBackups.map(backup => (
                                <div key={backup.id} className="bg-brand-50 p-6 rounded-2xl border border-brand-950/5 flex items-center justify-between group hover:border-brand-500/20 transition-all">
                                    <div>
                                        <h4 className="font-black text-brand-950 text-xs italic uppercase tracking-widest">{backup.name}</h4>
                                        <p className="text-[9px] font-black text-brand-950/20 mt-1 uppercase">{new Date(backup.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={async () => {
                                            if(await StorageService.restoreBackup(backup.data)) window.location.reload();
                                        }} className="px-5 py-2.5 bg-brand-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-125 transition-all">RESTORE</button>
                                        <button onClick={async () => { 
                                            await StorageService.deleteLocalBackup(backup.id);
                                            await loadLocalBackups();
                                        }} className="p-2.5 text-brand-950/20 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
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
