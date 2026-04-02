
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
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
      activeTab === item.id 
        ? 'bg-white/10 text-white shadow-md border border-white/10' 
        : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`}
  >
    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
    <span className="font-medium">{item.label}</span>
  </button>
);

const BottomNavItem: React.FC<NavItemComponentProps> = ({ item, activeTab, onTabChange }) => (
  <button
    onClick={() => onTabChange(item.id)}
    className={`flex flex-col items-center justify-center py-2 px-1 flex-1 transition-colors ${
      activeTab === item.id ? 'text-white' : 'text-white/40 hover:text-white'
    }`}
  >
    <item.icon className={`w-6 h-6 mb-1 ${activeTab === item.id ? 'fill-current' : ''}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
    <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
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

  const getNavItems = (): NavItem[] => {
    const common = [
      { id: 'leaderboard', label: 'Rankings', icon: Medal },
      { id: 'team', label: 'Team', icon: Shirt }, 
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'notices', label: 'Notices', icon: Megaphone },
    ];

    if (currentUser.role === 'player') {
      return [{ id: 'player-dashboard', label: 'Portal', icon: LayoutDashboard }, ...common];
    }

    const manage = [
      { id: 'coach', label: 'Attendance', icon: ClipboardCheck },
      { id: 'matches', label: 'Match Center', icon: Trophy },
      { id: 'squad-comparison', label: 'Pro Analytics', icon: BarChart3 },
      { id: 'head-to-head', label: 'Head to Head', icon: Swords },
      { id: 'evaluations', label: 'Scout Reports', icon: Gauge },
      { id: 'training', label: 'Training', icon: Dumbbell },
    ];

    if (currentUser.role === 'coach') return [...common, ...manage];

    if (currentUser.role === 'admin') {
      return [
        { id: 'admin', label: 'Analytics', icon: BarChart3 },
        { id: 'players', label: 'Squad', icon: UserCog },
        { id: 'register', label: 'Register', icon: Users },
        { id: 'finance', label: 'Finance', icon: DollarSign },
        { id: 'users', label: 'Access', icon: Shield },
        ...common,
        ...manage
      ];
    }
    return common;
  };

  const navItems = getNavItems();
  const brandStyle = { background: `linear-gradient(180deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)` };

  return (
    <div className="min-h-screen bg-brand-900 flex flex-col md:flex-row text-brand-50">
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 shadow-2xl z-20 bg-brand-900 border-r border-white/5">
        <div className="p-6 flex items-center gap-4 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-white/5 backdrop-blur-sm -z-10" />
          <div className="shrink-0 p-2 bg-white rounded-2xl shadow-inner flex items-center justify-center w-12 h-12">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} className="w-10 h-10 object-contain" alt="Logo" />
            ) : (
              <Trophy className="w-8 h-8 opacity-20" style={{ color: settings.primaryColor }} />
            )}
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-black tracking-tight leading-tight uppercase" 
                style={{ fontFamily: settings.fontFamily, color: 'white' }}>
              {settings.name}
            </h1>
            <p className="text-[9px] text-white/50 uppercase tracking-[0.2em] font-bold mt-0.5">{currentUser.role} Portal</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map(item => <SidebarItem key={item.id} item={item} activeTab={activeTab} onTabChange={onTabChange} />)}
        </div>
        <div className="px-4 mb-4">
             <PerformanceHUD />
        </div>

        {/* Data Persistence Area - Only for Admins */}
        {currentUser.role === 'admin' && (
            <div className="mx-4 mb-4 p-3 bg-white/10 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                    <Database size={14} className="text-white/70" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Database Status</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={12} className="text-green-400" />
                    <span className="text-xs text-white font-medium truncate">Saved locally {lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <button 
                    onClick={() => StorageService.triggerBackupDownload()}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-white text-gray-900 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors shadow-sm"
                >
                    <Download size={12} />
                    Download Backup
                </button>
            </div>
        )}

        <div className="p-4 border-t border-white/10 bg-black/10">
           <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">{currentUser.username[0].toUpperCase()}</div>
              <p className="text-sm font-medium text-white truncate">{currentUser.username}</p>
           </div>
           <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg border border-white/10 hover:bg-white/10 transition-all text-sm text-white/80"><LogOut size={16} /><span>Sign Out</span></button>
        </div>
      </aside>
      <header className="md:hidden bg-brand-800/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center bg-white">
                {settings.logoUrl ? (
                    <img src={settings.logoUrl} className="w-6 h-6 object-contain" />
                ) : (
                    <div className="p-1 rounded-lg" style={{ background: settings.primaryColor }}><Trophy className="w-4 h-4 text-white" /></div>
                )}
            </div>
            <span className="font-black text-white tracking-tighter uppercase text-sm truncate max-w-[180px]" 
                  style={{ fontFamily: settings.fontFamily }}>
                {settings.name}
            </span>
         </div>
         <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
      </header>
      <main className="flex-1 overflow-y-auto h-[calc(100vh-60px)] md:h-screen pb-20 md:pb-8">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.5)] bg-brand-900 border-t border-white/5" >
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 4).map(item => <BottomNavItem key={item.id} item={item} activeTab={activeTab} onTabChange={onTabChange} />)}
          {navItems.length > 4 && <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center py-2 px-1 flex-1 text-white/40"><MoreHorizontal className="w-6 h-6 mb-1" /><span className="text-[10px] font-medium">More</span></button>}
        </div>
      </nav>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 backdrop-blur-xl bg-brand-900/95 md:hidden flex flex-col p-6">
           <div className="flex justify-between items-center mb-8 text-white"><h2 className="text-2xl font-bold">Menu</h2><button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-full"><X size={24} /></button></div>
           <div className="grid grid-cols-2 gap-4">
              {navItems.map(item => <button key={item.id} onClick={() => { onTabChange(item.id); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center p-4 rounded-xl border ${activeTab === item.id ? 'bg-white text-gray-900 border-white' : 'bg-white/5 border-white/10 text-white'}`}><item.icon className="w-8 h-8 mb-2" /><span className="font-medium text-sm">{item.label}</span></button>)}
           </div>
           
           {currentUser.role === 'admin' && (
               <div className="mt-8 p-4 bg-white/10 rounded-xl border border-white/10 text-white">
                    <div className="text-sm font-bold mb-2">Data Management</div>
                    <button 
                        onClick={() => StorageService.triggerBackupDownload()}
                        className="w-full py-3 bg-white text-gray-900 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                    >
                        <Download size={16} /> Save Database
                    </button>
               </div>
           )}
        </div>
      )}
    </div>
  );
};
