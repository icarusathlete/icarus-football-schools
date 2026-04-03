
import React, { useState, useEffect } from 'react';
import { Trophy, ClipboardCheck, Users, BarChart3, LogOut, Shield, LayoutDashboard, Calendar, FileText, Megaphone, DollarSign, Menu, X, MoreHorizontal, Medal, Gauge, Database, Download, CheckCircle2, UserCog, Shirt, Dumbbell, Swords } from 'lucide-react';
import { User, Role, AcademySettings } from '../types';
import { StorageService } from '../services/storageService';
import { PerformanceHUD } from './ui/PerformanceHUD';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
  currentUser: User;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
}

interface NavItemComponentProps {
  item: NavItem;
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const SidebarItem: React.FC<NavItemComponentProps> = ({ item, activeTab, onTabChange }) => (
  <button
    onClick={() => onTabChange(item.id)}
    className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden ${
      activeTab === item.id 
        ? 'bg-brand-500/10 text-brand-500 shadow-[0_0_30px_rgba(14,165,233,0.1)] border border-brand-500/20' 
        : 'text-white/50 hover:bg-white/10 hover:text-white'
    }`}
  >
    {activeTab === item.id && (
      <div className="absolute left-0 top-3 bottom-3 w-1 bg-lime shadow-[0_0_15px_#bef264] rounded-r-full" />
    )}
    <item.icon className={`w-5 h-5 transition-all duration-500 ${activeTab === item.id ? 'text-brand-500 scale-110' : 'text-white/30 group-hover:text-white group-hover:scale-110'}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
    <span className={`text-[11px] uppercase tracking-[0.2em] transition-all ${activeTab === item.id ? 'font-black' : 'font-bold'}`}>{item.label}</span>
  </button>
);

const getShortLabel = (label: string) => {
  const mapping: Record<string, string> = {
    'Academy Hub': 'Hub',
    'Squad Management': 'Squad',
    'New Athlete': 'New',
    'Finance Hub': 'Finance',
    'Access Control': 'Access',
    'Rankings': 'Rank',
    'Match Center': 'Match',
    'Scout Reports': 'Reports',
    'Pro Analytics': 'Analytics'
  };
  return mapping[label] || label.split(' ')[0];
};

const BottomNavItem: React.FC<NavItemComponentProps> = ({ item, activeTab, onTabChange }) => (
  <button
    onClick={() => onTabChange(item.id)}
    className={`flex flex-col items-center justify-center py-2 px-1 flex-1 min-w-0 transition-all duration-500 overflow-hidden ${
      activeTab === item.id ? 'text-brand-500 scale-105' : 'text-white/40 hover:text-white'
    }`}
  >
    <item.icon className={`w-5 h-5 mb-1 ${activeTab === item.id ? 'fill-brand-500/10' : ''}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
    <span className="text-[8px] font-black uppercase tracking-tight truncate w-full text-center">
        {getShortLabel(item.label)}
    </span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentUser, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  useEffect(() => {
    const handleSettingsChange = () => setSettings(StorageService.getSettings());
    const handleDataUpdate = () => setLastSaved(new Date());
    
    window.addEventListener('settingsChanged', handleSettingsChange);
    window.addEventListener('academy_data_update', handleDataUpdate);
    
    return () => {
        window.removeEventListener('settingsChanged', handleSettingsChange);
        window.removeEventListener('academy_data_update', handleDataUpdate);
    };
  }, []);

  const getNavSections = () => {
    const sections: { title: string; items: NavItem[] }[] = [];
    
    const core = [
      { id: 'leaderboard', label: 'Rankings', icon: Medal },
      { id: 'team', label: 'Team', icon: Shirt }, 
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'notices', label: 'Notices', icon: Megaphone },
    ];

    if (currentUser.role === 'player') {
      sections.push({ title: 'ACADEMY CORE', items: [{ id: 'player-dashboard', label: 'Portal', icon: LayoutDashboard }, ...core] });
      return sections;
    }

    const operations = [
      { id: 'coach', label: 'Attendance', icon: ClipboardCheck },
      { id: 'matches', label: 'Match Center', icon: Trophy },
      { id: 'training', label: 'Training', icon: Dumbbell },
    ];

    const intelligence = [
      { id: 'squad-comparison', label: 'Pro Analytics', icon: BarChart3 },
      { id: 'head-to-head', label: 'Head to Head', icon: Swords },
      { id: 'evaluations', label: 'Scout Reports', icon: Gauge },
    ];

    const management = [
      { id: 'admin', label: 'Academy Hub', icon: LayoutDashboard },
      { id: 'players', label: 'Squad Management', icon: UserCog },
      { id: 'register', label: 'New Athlete', icon: Users },
      { id: 'finance', label: 'Finance Hub', icon: DollarSign },
      { id: 'users', label: 'Access Control', icon: Shield },
    ];

    if (currentUser.role === 'admin') {
      sections.push({ title: 'MANAGEMENT', items: management.slice(0, 5) });
      sections.push({ title: 'ACADEMY TOOLS', items: operations });
      sections.push({ title: 'ANALYTICS', items: intelligence });
      sections.push({ title: 'GENERAL', items: core });
    } else if (currentUser.role === 'coach') {
      sections.push({ title: 'ACADEMY TOOLS', items: operations });
      sections.push({ title: 'ANALYTICS', items: intelligence });
      sections.push({ title: 'GENERAL', items: core });
    }

    return sections;
  };

  const navSections = getNavSections();
  const allNavItems = navSections.flatMap(s => s.items);

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-brand-950 relative overflow-x-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,200,255,0.05),transparent_70%)] pointer-events-none" />
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 shadow-2xl z-20 bg-brand-950/80 backdrop-blur-xl border-r border-white/10">
        <div className="p-6 flex items-center gap-4 border-b border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-full bg-white/5 backdrop-blur-sm -z-10" />
          <div className="shrink-0 p-1 bg-white rounded-full shadow-2xl flex items-center justify-center w-12 h-12 ring-2 ring-brand-500 transition-all group-hover:ring-lime overflow-hidden">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} className="w-10 h-10 object-contain rounded-full" alt="Logo" />
            ) : (
              <Trophy className="w-8 h-8 opacity-20" style={{ color: settings.primaryColor || '#0066FF' }} />
            )}
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-black tracking-tighter leading-tight uppercase" 
                style={{ fontFamily: settings.fontFamily || 'Orbitron', color: 'white' }}>
              {settings.name}
            </h1>
            <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-black mt-0.5">{currentUser.role} Management Center</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8 custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-5 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map(item => <SidebarItem key={item.id} item={item} activeTab={activeTab} onTabChange={onTabChange} />)}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 mb-4">
             <PerformanceHUD />
        </div>

        {/* Data Persistence Area - Only for Admins */}
        {currentUser.role === 'admin' && (
            <div className="mx-4 mb-6 p-5 bg-brand-950/50 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex items-center gap-2 mb-3">
                    <Database size={14} className="text-white/20" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Database Sync</span>
                </div>
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    <span className="text-[10px] text-white/60 font-black uppercase tracking-widest truncate">Database Online</span>
                </div>
                <button 
                    onClick={() => StorageService.triggerBackupDownload()}
                    className="w-full flex items-center justify-center gap-3 py-3 bg-brand-500 text-brand-950 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-500/10"
                >
                    <Download size={14} />
                    Export Archive
                </button>
            </div>
        )}

        <div className="p-5 border-t border-white/5 bg-brand-950/50">
           <div className="flex items-center gap-4 mb-6 px-2">
              <div className="w-10 h-10 rounded-full bg-brand-950 border border-brand-500/20 flex items-center justify-center text-brand-500 font-black shadow-2xl ring-2 ring-brand-500/10 transition-transform hover:scale-110">{currentUser.username[0].toUpperCase()}</div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-white truncate uppercase tracking-tight">{currentUser.username}</p>
                <p className="text-[8px] font-bold text-brand-600 uppercase tracking-widest mt-0.5">{currentUser.role === 'admin' ? 'Administrator Access' : 'Coach Portal Active'}</p>
              </div>
           </div>
           <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">
             <LogOut size={16} strokeWidth={2.5} />
             <span>Sign Out</span>
           </button>
        </div>
      </aside>
      <header className="md:hidden bg-brand-950/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-2xl overflow-hidden">
         <div className="flex items-center gap-4 overflow-hidden flex-1">
            <div className="shrink-0 w-10 h-10 rounded-full shadow-2xl border border-brand-500/20 flex items-center justify-center bg-white p-1 overflow-hidden ring-2 ring-brand-500/10 active:scale-95 transition-transform">
                {settings.logoUrl ? (
                    <img src={settings.logoUrl} className="w-8 h-8 object-contain rounded-full" />
                ) : (
                    <div className="p-2 rounded-lg" style={{ background: settings.primaryColor }}><Trophy className="w-6 h-6 text-white" /></div>
                )}
            </div>
            <div className="overflow-hidden flex-1">
                <span className="font-black text-white tracking-tighter uppercase text-sm block leading-none truncate" 
                      style={{ fontFamily: settings.fontFamily }}>
                    {settings.name}
                </span>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-1 block truncate">Management Center</span>
            </div>
         </div>
         <button onClick={onLogout} className="shrink-0 p-3 bg-white/5 text-brand-600 hover:text-red-500 rounded-xl transition-all border border-white/5 ml-4">
            <LogOut size={20} />
         </button>
      </header>
      <main className="flex-1 min-h-[calc(100vh-64px)] md:h-screen md:overflow-y-auto pb-24 md:pb-8 relative z-10 custom-scrollbar scroll-smooth box-border">
        <div className="p-4 md:p-10 max-w-7xl mx-auto w-full">{children}</div>
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)] bg-brand-500/10 backdrop-blur-xl border-t border-brand-500/30" >
        <div className="flex justify-around items-center h-16">
          {allNavItems.slice(0, 4).map(item => <BottomNavItem key={item.id} item={item} activeTab={activeTab} onTabChange={onTabChange} />)}
          {allNavItems.length > 4 && <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center py-2 px-1 flex-1 text-white/40"><MoreHorizontal className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">More</span></button>}
        </div>
      </nav>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 backdrop-blur-3xl bg-brand-950/95 md:hidden flex flex-col p-8 overflow-y-auto animate-in fade-in duration-300">
           <div className="flex justify-between items-center mb-12">
                <div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">ADMIN <span className="text-brand-500">DASHBOARD</span></h2>
                    <p className="text-[10px] text-brand-500 font-black uppercase tracking-[0.3em] mt-3">Academy Management Portal</p>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-brand-500/10 rounded-[2rem] text-brand-500 hover:text-white border border-brand-500/30 shadow-2xl transition-all active:scale-90">
                    <X size={28} />
                </button>
           </div>
           
           <div className="grid grid-cols-2 gap-4 pb-20">
              {allNavItems.map(item => (
                <button 
                    key={item.id} 
                    onClick={() => { onTabChange(item.id); setIsMobileMenuOpen(false); }} 
                    className={`flex flex-col items-center p-6 rounded-[2rem] border transition-all duration-500 ${activeTab === item.id ? 'bg-brand-500 text-brand-950 border-brand-500 shadow-[0_10px_30px_rgba(14,165,233,0.2)] scale-[1.05] z-10' : 'bg-brand-950/50 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                >
                    <div className={`p-4 rounded-2xl mb-4 ${activeTab === item.id ? 'bg-brand-950/10' : 'bg-white/5 border border-white/10'}`}>
                        <item.icon size={28} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
                    </div>
                    <span className="font-black text-[10px] uppercase tracking-[0.25em] text-center leading-tight">{item.label}</span>
                </button>
              ))}
           </div>
           
           {currentUser.role === 'admin' && (
               <div className="mt-auto p-8 bg-brand-900/50 rounded-[3rem] border border-white/5 shadow-inner">
                    <div className="flex items-center gap-3 mb-6">
                        <Database className="text-lime" size={20} />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Database Tools</span>
                    </div>
                    <button 
                        onClick={() => StorageService.triggerBackupDownload()}
                        className="w-full py-5 bg-brand-500 text-brand-950 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-brand-500/10"
                    >
                        <Download size={20} /> Synchronize All Data
                    </button>
               </div>
           )}
        </div>
      )}
    </div>
  );
};
