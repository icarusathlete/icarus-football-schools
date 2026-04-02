import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Smartphone, Zap } from 'lucide-react';

export const PerformanceHUD: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for Firebase sync events (custom event if emitted)
        const handleSyncStart = () => setIsSyncing(true);
        const handleSyncEnd = () => setIsSyncing(false);
        
        window.addEventListener('firebase_sync_start', handleSyncStart);
        window.addEventListener('firebase_sync_end', handleSyncEnd);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('firebase_sync_start', handleSyncStart);
            window.removeEventListener('firebase_sync_end', handleSyncEnd);
        };
    }, []);

    return (
        <div className="flex items-center gap-3 bg-brand-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 shadow-2xl">
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isOnline ? 'SIGNAL STABLE' : 'SIGNAL LOST'}
                </span>
            </div>
            
            <div className="h-3 w-px bg-white/10" />
            
            <div className="flex items-center gap-2 px-1">
                {isSyncing ? (
                    <RefreshCw size={12} className="text-gold animate-spin" />
                ) : (
                    <Zap size={12} className={isOnline ? 'text-gold' : 'text-brand-800'} />
                )}
                <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">
                    {isSyncing ? 'SYNCING...' : 'LIVE'}
                </span>
            </div>
        </div>
    );
};
