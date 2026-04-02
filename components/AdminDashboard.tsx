
import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, AreaChart, Area } from 'recharts';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { Player, AttendanceRecord, AttendanceStatus, AcademySettings } from '../types';
import { Brain, FileText, Loader2, TrendingUp, Download, Upload, Trash2, Database, Palette, Type, Image as ImageIcon, CheckCircle, AlertTriangle, FileJson, X, Settings, ChevronRight, Users, Activity } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export const AdminDashboard: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
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

  // Import/Export Logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [importModal, setImportModal] = useState<{isOpen: boolean, stats: any | null, error: string | null}>({
      isOpen: false, stats: null, error: null
  });
  const [importedContent, setImportedContent] = useState<string>('');

  // Local Backups Logic
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const [showLocalBackupsModal, setShowLocalBackupsModal] = useState(false);
  const [isSavingBackup, setIsSavingBackup] = useState(false);

  const loadLocalBackups = async () => {
      try {
          const backups = await StorageService.getLocalBackups();
          setLocalBackups(backups);
      } catch (e) {
          console.error("Failed to load local backups", e);
      }
  };

  const handleSaveLocalBackup = async () => {
      setIsSavingBackup(true);
      try {
          await StorageService.saveLocalBackup();
          await loadLocalBackups();
      } catch (e) {
          alert("Failed to save local backup.");
      } finally {
          setIsSavingBackup(false);
      }
  };

  const handleDeleteLocalBackup = async (id: string) => {
      setDeleteAction({ type: 'backup', id });
      setDeleteModalOpen(true);
  };

  const handleRestoreLocalBackup = (dataStr: string) => {
      setImportedContent(dataStr);
      const stats = StorageService.analyzeBackup(dataStr);
      if (stats.valid) {
          setImportModal({ isOpen: true, stats: stats.details, error: null });
          setShowLocalBackupsModal(false);
      } else {
          setImportModal({ isOpen: true, stats: null, error: 'Invalid backup file. Missing Icarus data keys.' });
      }
  };

  const loadData = () => {
    const p = StorageService.getPlayers();
    const a = StorageService.getAttendance();
    setPlayers(p);
    setAttendance(a);
    prepareChartData(a);
    setSettings(StorageService.getSettings());
  };

  useEffect(() => {
    loadData();
    // Re-load if data changes externally
    window.addEventListener('icarus_data_update', loadData);
    return () => window.removeEventListener('icarus_data_update', loadData);
  }, []);

  const prepareChartData = (records: AttendanceRecord[]) => {
    // Group by date
    const groups: Record<string, { present: number, absent: number, late: number }> = {};
    
    // Sort records by date first
    const sorted = [...records].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(r => {
        if (!groups[r.date]) groups[r.date] = { present: 0, absent: 0, late: 0 };
        if (r.status === AttendanceStatus.PRESENT) groups[r.date].present++;
        if (r.status === AttendanceStatus.ABSENT) groups[r.date].absent++;
        if (r.status === AttendanceStatus.LATE) groups[r.date].late++;
    });

    const data = Object.keys(groups).map(date => ({
        date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Present: groups[date].present,
        Absent: groups[date].absent,
        Late: groups[date].late
    })).slice(-10); // Last 10 days

    setChartData(data);
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
        const report = await GeminiService.analyzeAttendance(players, attendance);
        setAiReport(report);
    } catch (e) {
        alert("Failed to analyze data. Please check your API Key.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Data Management Functions
  const handleExport = () => {
      StorageService.triggerBackupDownload();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const json = event.target?.result as string;
        setImportedContent(json);
        
        // Analyze content before importing
        const stats = StorageService.analyzeBackup(json);
        if (stats.valid) {
            setImportModal({ isOpen: true, stats: stats.details, error: null });
        } else {
            setImportModal({ isOpen: true, stats: null, error: 'Invalid backup file. Missing Icarus data keys.' });
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = async () => {
      if (await StorageService.restoreBackup(importedContent)) {
          setImportModal({ ...importModal, isOpen: false });
          // Force reload to ensure all states in all components are clean
          window.location.reload();
      } else {
          setImportModal({ ...importModal, error: "Failed to write data to storage. File format might be corrupted." });
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("Academy branding - file selected:", file.name, file.size);
      // Basic size validation (max 500KB for Base64 in Firestore documents)
      if (file.size > 500 * 1024) {
        console.error("Logo file is too large", file.size);
        alert("Logo file is too large! Please choose an image smaller than 500KB to ensure smooth database performance.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("Logo read as Data URL successfully");
        const base64 = reader.result as string;
        updateSetting('logoUrl', base64);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleClear = () => {
    setDeleteAction({ type: 'clear' });
    setDeleteModalOpen(true);
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

  const updateSetting = (key: keyof AcademySettings, value: string) => {
      setSettings(prev => ({ ...prev, [key]: value }));
      setHasUnsavedSettings(true);
  };

  // Stats
  const totalSessions = new Set(attendance.map(a => a.date)).size;
  const overallPresence = attendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
  const avgAttendance = totalSessions > 0 
    ? Math.round((overallPresence / (totalSessions * (players.length || 1))) * 100) 
    : 0;

  return (
    <div className="space-y-8 pb-12 relative animate-in fade-in duration-500">
        {/* Hidden File Inputs at Top Level */}
        <input 
            type="file" 
            ref={fileInputRef} 
            accept=".json"
            onChange={handleFileSelect}
            className="fixed opacity-0 pointer-events-none -z-10"
        />
        <input 
            type="file" 
            ref={logoInputRef} 
            accept="image/*"
            onChange={handleLogoUpload}
            className="fixed opacity-0 pointer-events-none -z-10"
        />
        
        {/* Header with Settings Button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Orbitron' }}>
                    ADMIN <span className="text-icarus-500">DASHBOARD</span>
                </h1>
                <p className="text-gray-500 font-medium text-sm mt-1">Overview of academy performance and operations.</p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all hover:border-icarus-500 group"
                >
                    <Palette size={18} className="text-gray-400 group-hover:text-icarus-500 transition-colors" />
                    <span className="text-xs uppercase tracking-wider">Academy Branding</span>
                </button>
            </div>
        </div>

        {/* Professional KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-blue-200 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users size={64} className="text-blue-500" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Squad</span>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900">{players.length}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-green-500">
                        <TrendingUp size={12} />
                        <span>Active</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-green-200 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={64} className="text-green-500" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Activity size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avg Attendance</span>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900">{avgAttendance}%</h3>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${avgAttendance}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-purple-200 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FileText size={64} className="text-purple-500" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <FileText size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sessions Logged</span>
                    </div>
                    <h3 className="text-4xl font-black text-gray-900">{totalSessions}</h3>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Last 30 Days</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Attendance Analytics</h3>
                        <p className="text-xs text-gray-400 font-medium mt-1">Session participation trends over time</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div> Present
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div> Absent
                        </div>
                    </div>
                </div>
                
                <div className="h-80 w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="Present" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                                <Area type="monotone" dataKey="Absent" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorAbsent)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                            <TrendingUp size={32} className="mb-2 opacity-50"/>
                            <p className="text-sm font-medium">No data to display yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Assistant */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <Brain size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">AI Insights</h3>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Powered by Gemini</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 bg-gray-50/50 rounded-2xl p-5 mb-4 overflow-y-auto max-h-96 text-sm text-gray-700 border border-gray-100 custom-scrollbar">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <Loader2 className="animate-spin text-purple-600 w-10 h-10" />
                            <p className="text-gray-500 font-medium animate-pulse">Crunching the numbers...</p>
                        </div>
                    ) : aiReport ? (
                        <div className="prose prose-sm prose-purple prose-p:text-gray-600 prose-headings:font-bold prose-headings:text-gray-800" dangerouslySetInnerHTML={{ __html: aiReport }} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                            <Brain size={48} className="mb-3 opacity-20" />
                            <p className="max-w-[200px] text-xs leading-relaxed">Generate an AI report to identify trends, at-risk players, and draft parent communications.</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleAiAnalysis}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-wide disabled:opacity-70 disabled:transform-none"
                >
                    <Brain size={18} />
                    <span>{aiReport ? 'Regenerate Analysis' : 'Analyze Data'}</span>
                </button>
            </div>
        </div>

        {/* Data Management Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
                <Database className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-800">Database Operations</h3>
            </div>
            <div className="p-8">
                <div className="flex flex-wrap gap-4 items-center">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-6 py-3.5 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl border border-gray-200 transition-colors font-bold text-xs uppercase tracking-wider"
                    >
                        <Download size={16} />
                        <span>Backup JSON</span>
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-6 py-3.5 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl border border-gray-200 transition-colors font-bold text-xs uppercase tracking-wider"
                        >
                            <Upload size={16} />
                            <span>Restore</span>
                        </button>
                    </div>

                    <button 
                        onClick={() => {
                            loadLocalBackups();
                            setShowLocalBackupsModal(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3.5 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl border border-gray-200 transition-colors font-bold text-xs uppercase tracking-wider"
                    >
                        <Database size={16} />
                        <span>Local Backups</span>
                    </button>

                    <div className="flex-1 border-t border-gray-100 mx-4 h-px"></div>

                    <button 
                        onClick={handleClear}
                        className="flex items-center gap-2 px-6 py-3.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl border border-red-100 transition-colors font-bold text-xs uppercase tracking-wider"
                    >
                        <Trash2 size={16} />
                        <span>Factory Reset</span>
                    </button>
                </div>
            </div>
        </div>

        {/* BRANDING SETTINGS MODAL */}
        {showSettingsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                    <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <Palette size={20} className="text-icarus-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Academy Branding</h3>
                                <p className="text-xs text-gray-500 font-medium">Customize look and feel</p>
                            </div>
                        </div>
                        <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                        {/* Name & Font */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Academy Name</label>
                                <div className="relative">
                                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input 
                                        type="text" 
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-icarus-500 focus:ring-4 focus:ring-icarus-500/10 outline-none transition-all"
                                        value={settings.name}
                                        onChange={(e) => updateSetting('name', e.target.value)}
                                        placeholder="Academy Name"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Font Family</label>
                                <select 
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-icarus-500 outline-none transition-all appearance-none"
                                    value={settings.fontFamily}
                                    onChange={(e) => updateSetting('fontFamily', e.target.value)}
                                >
                                    <option value="Orbitron">Orbitron (Modern/Sci-Fi)</option>
                                    <option value="Inter">Inter (Clean/Standard)</option>
                                    <option value="Montserrat">Montserrat (Geometric)</option>
                                    <option value="Oswald">Oswald (Bold/Condensed)</option>
                                    <option value="Roboto">Roboto (Classic)</option>
                                </select>
                            </div>
                        </div>

                        {/* Identity & Logo */}
                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <ImageIcon className="text-icarus-500 w-4 h-4" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Visual Identity</span>
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                {/* Logo Preview & Upload */}
                                <div className="flex-shrink-0">
                                    <div className="relative group">
                                        <div className="w-32 h-32 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-icarus-400 shadow-sm">
                                            {settings.logoUrl ? (
                                                <img src={settings.logoUrl} className="w-full h-full object-contain p-2" alt="Academy Logo" />
                                            ) : (
                                                <div className="text-center p-4">
                                                    <ImageIcon size={32} className="mx-auto text-gray-300 mb-2" />
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">No Logo</p>
                                                </div>
                                            )}
                                            <div 
                                                onClick={() => logoInputRef.current?.click()}
                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                            >
                                                <Upload className="text-white" size={24} />
                                            </div>
                                        </div>
                                        {settings.logoUrl && (
                                            <button 
                                                onClick={() => updateSetting('logoUrl', '')}
                                                className="absolute -top-3 -right-3 p-1.5 bg-red-100 text-red-600 rounded-full border-2 border-white shadow-sm hover:bg-red-200 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-center text-gray-400 mt-3 font-bold uppercase tracking-wider">Academy Logo</p>
                                </div>

                                <div className="flex-1 w-full space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Academy Name</label>
                                        <div className="relative">
                                            <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input 
                                                type="text" 
                                                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-800 focus:border-icarus-500 outline-none transition-all"
                                                value={settings.name}
                                                onChange={(e) => updateSetting('name', e.target.value)}
                                                placeholder="Enter Academy Name"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Logo Reference (URL)</label>
                                        <div className="relative">
                                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input 
                                                type="text" 
                                                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-600 focus:border-icarus-500 outline-none transition-all"
                                                value={settings.logoUrl.startsWith('data:') ? '[Uploaded Image]' : settings.logoUrl}
                                                onChange={(e) => updateSetting('logoUrl', e.target.value)}
                                                placeholder="https://example.com/logo.png"
                                                disabled={settings.logoUrl.startsWith('data:')}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => logoInputRef.current?.click()}
                                            className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all hover:bg-gray-50 flex items-center justify-center gap-2"
                                        >
                                            <Upload size={14} /> Replace with File
                                        </button>
                                        <p className="text-[10px] text-gray-400 font-medium ml-1 italic">Max file size: 500KB. Transparent PNG recommended.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Colors */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Theme Gradient</label>
                            <div className="p-4 rounded-2xl border-2 border-gray-100 flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Start Color</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={settings.primaryColor}
                                                onChange={(e) => updateSetting('primaryColor', e.target.value)}
                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden" 
                                            />
                                            <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{settings.primaryColor}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">End Color</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="color" 
                                                value={settings.secondaryColor}
                                                onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                                                className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden" 
                                            />
                                            <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">{settings.secondaryColor}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Preview Banner */}
                                <div className="h-16 rounded-xl flex items-center px-6 text-white shadow-lg" style={{ background: `linear-gradient(90deg, ${settings.primaryColor}, ${settings.secondaryColor})` }}>
                                    <div>
                                        <h4 className="font-bold text-lg leading-none" style={{ fontFamily: settings.fontFamily }}>{settings.name || 'ACADEMY NAME'}</h4>
                                        <p className="text-[10px] opacity-80 font-medium tracking-widest uppercase mt-1">Portal Preview</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button 
                            onClick={() => setShowSettingsModal(false)}
                            className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={saveSettings}
                            disabled={!hasUnsavedSettings}
                            className="px-8 py-3 bg-icarus-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {hasUnsavedSettings ? <CheckCircle size={16} /> : null}
                            {hasUnsavedSettings ? 'Save Changes' : 'Saved'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* RESTORE PREVIEW MODAL */}
        {importModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                         <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <Upload size={20} className="text-icarus-600" />
                            Restore Data
                         </h3>
                         <button onClick={() => setImportModal({...importModal, isOpen: false})} className="p-1 hover:bg-gray-200 rounded-full text-gray-400">
                             <X size={20} />
                         </button>
                    </div>
                    
                    <div className="p-6">
                        {importModal.error ? (
                            <div className="text-center py-4">
                                <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={32} />
                                </div>
                                <h4 className="text-red-700 font-bold mb-2">Invalid File</h4>
                                <p className="text-sm text-gray-600">{importModal.error}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <FileJson className="text-blue-500" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-bold">Backup File Detected</p>
                                        <p className="text-xs opacity-80">Ready to restore the following data:</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <span className="block text-xs text-gray-400 font-bold uppercase">Players</span>
                                        <span className="block text-xl font-black text-gray-800">{importModal.stats?.players || 0}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <span className="block text-xs text-gray-400 font-bold uppercase">Matches</span>
                                        <span className="block text-xl font-black text-gray-800">{importModal.stats?.matches || 0}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <span className="block text-xs text-gray-400 font-bold uppercase">Attendance</span>
                                        <span className="block text-xl font-black text-gray-800">{importModal.stats?.attendance || 0}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <span className="block text-xs text-gray-400 font-bold uppercase">Events</span>
                                        <span className="block text-xl font-black text-gray-800">{importModal.stats?.events || 0}</span>
                                    </div>
                                </div>

                                <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2">
                                    <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                    <p>Warning: Restoring this backup will <strong>permanently replace</strong> all current data on this device. This action cannot be undone.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-200">
                        <button 
                            onClick={() => setImportModal({...importModal, isOpen: false})}
                            className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        {!importModal.error && (
                            <button 
                                onClick={confirmImport}
                                className="px-6 py-2 bg-icarus-900 text-white font-bold rounded-lg shadow-lg hover:bg-black transition-all text-sm flex items-center gap-2"
                            >
                                <CheckCircle size={16} />
                                Confirm Restore
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}
        {/* LOCAL BACKUPS MODAL */}
        {showLocalBackupsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                    <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <Database size={20} className="text-icarus-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Local Backups</h3>
                                <p className="text-xs text-gray-500 font-medium">Manage backups stored securely in this browser</p>
                            </div>
                        </div>
                        <button onClick={() => setShowLocalBackupsModal(false)} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-600">These backups are stored locally in your browser using IndexedDB. They are not synced to the cloud.</p>
                            <button 
                                onClick={handleSaveLocalBackup}
                                disabled={isSavingBackup}
                                className="px-4 py-2 bg-icarus-600 hover:bg-icarus-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSavingBackup ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                                Create New Backup
                            </button>
                        </div>

                        {localBackups.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <Database size={48} className="mx-auto text-gray-300 mb-4" />
                                <h4 className="text-gray-900 font-bold mb-1">No Local Backups</h4>
                                <p className="text-sm text-gray-500">Create your first local backup to secure your data.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {localBackups.map(backup => (
                                    <div key={backup.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-icarus-300 transition-colors">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{backup.name}</h4>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(backup.timestamp).toLocaleString()}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleRestoreLocalBackup(backup.data)}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-xs transition-colors"
                                            >
                                                Restore
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteLocalBackup(backup.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        <ConfirmModal
            isOpen={deleteModalOpen}
            onClose={() => {
                setDeleteModalOpen(false);
                setDeleteAction(null);
            }}
            onConfirm={confirmDeleteAction}
            title={deleteAction?.type === 'backup' ? "Delete Backup" : "Clear All Data"}
            message={deleteAction?.type === 'backup' 
                ? "Are you sure you want to delete this backup? This action cannot be undone."
                : "WARNING: This will delete ALL players, matches, and attendance records. The app will reset to default demo data. Are you sure?"}
            confirmText="Delete"
            type="danger"
            requireTypeToConfirm={deleteAction?.type === 'clear'}
        />
    </div>
  );
};
