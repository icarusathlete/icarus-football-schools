import React, { useState, useEffect } from 'react';
import { Trophy, ArrowRight, AlertTriangle, Shield, Database, Sparkles } from 'lucide-react';
import { User, AcademySettings } from '../types';
import { loginWithGoogle, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType, StorageService } from '../services/storageService';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState<AcademySettings>(StorageService.getSettings());

    useEffect(() => {
        // Attempt to fetch latest settings from Firestore for public branding
        const fetchSettings = async () => {
            try {
                const settingsDoc = await getDoc(doc(db, 'settings', 'academy'));
                if (settingsDoc.exists()) {
                    setSettings(settingsDoc.data() as AcademySettings);
                }
            } catch (e) {
                console.warn("Could not fetch remote settings for branding, using local defaults.");
            }
        };
        fetchSettings();
    }, []);

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            const firebaseUser = await loginWithGoogle();
            
            // Check if user exists in Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            let appUser: User;
            
            if (userDoc.exists()) {
                appUser = { id: userDoc.id, ...userDoc.data() } as User;
            } else {
                // Create new user
                const isDefaultAdmin = firebaseUser.email === 'negidevender19@gmail.com' && firebaseUser.emailVerified;
                
                appUser = {
                    id: firebaseUser.uid,
                    username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                    password: '', // Not used for Google Login
                    role: isDefaultAdmin ? 'admin' : 'player',
                    photoUrl: firebaseUser.photoURL || undefined,
                };
                
                const userData: any = {
                    username: appUser.username,
                    role: appUser.role,
                    email: firebaseUser.email
                };
                if (appUser.photoUrl) userData.photoUrl = appUser.photoUrl;
                
                try {
                    await setDoc(userDocRef, userData);
                } catch (error) {
                    handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
                }
            }
            
            onLogin(appUser);
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || 'Failed to sign in with Google.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-brand-950">
            
            {/* Tactical Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            {/* Orbital Gradients */}
            <div className="absolute top-0 right-0 -mt-40 -mr-40 w-[600px] h-[600px] bg-gold/10 rounded-full blur-[120px] animate-pulse duration-[10s]" />
            <div className="absolute bottom-0 left-0 -mb-40 -ml-40 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse duration-[8s]" />

            <div className="mb-12 text-center relative z-10">
                <div className="w-24 h-24 bg-brand-900 p-5 rounded-[2.5rem] inline-flex items-center justify-center border border-white/10 mb-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-700 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} className="w-16 h-16 object-contain relative z-10" alt="Logo" />
                    ) : (
                        <Trophy className="w-14 h-14 text-gold relative z-10" />
                    )}
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase text-white" 
                    style={{ fontFamily: settings.fontFamily }}>
                    {settings.name.split(' ')[0]} <span className="text-gold">{settings.name.split(' ').slice(1).join(' ')}</span>
                </h1>
                <div className="flex items-center justify-center gap-4 mt-6">
                    <div className="h-px w-8 bg-white/10" />
                    <p className="text-brand-500 uppercase tracking-[0.4em] text-[10px] font-black">Tactical Command Interface</p>
                    <div className="h-px w-8 bg-white/10" />
                </div>
            </div>

            <div className="w-full max-w-md bg-brand-900 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] overflow-hidden relative z-10 border border-white/5 animate-in fade-in slide-in-from-bottom-12 duration-1000 p-1">
                <div className="bg-brand-950/50 p-12 text-center rounded-[3.2rem]">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-800 border border-white/5 mb-8">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                        <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest leading-none">Terminal Secure</span>
                    </div>

                    <h2 className="text-2xl font-black text-white mb-3 italic uppercase tracking-tight" style={{ fontFamily: 'Orbitron' }}>Authorized <span className="text-gold">Access</span></h2>
                    <p className="text-brand-600 text-[11px] font-bold uppercase tracking-widest mb-10 leading-relaxed">Establish secure uplink via encrypted Google authentication protocol</p>
                    
                    {error && (
                        <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold rounded-2xl flex items-center gap-4 animate-in fade-in zoom-in text-left leading-relaxed">
                            <AlertTriangle size={20} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button 
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-gold text-brand-950 font-black py-5 rounded-[2rem] transition-all flex items-center justify-center gap-4 shadow-[0_20px_40px_rgba(251,191,36,0.15)] active:scale-95 group disabled:opacity-50 disabled:grayscale uppercase tracking-[0.2em] text-xs"
                        style={{ fontFamily: 'Orbitron' }}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 border-2 border-brand-950 border-t-transparent rounded-full animate-spin" />
                                <span>AUTHENTICATING...</span>
                            </div>
                        ) : (
                            <>
                                <span>INITIALIZE LOGIN</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <div className="mt-10 flex flex-col gap-4">
                        <p className="text-[9px] font-black text-brand-700 uppercase tracking-[0.25em]">End-to-End Encryption Enabled</p>
                        <div className="flex justify-center gap-1">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 h-1 rounded-full bg-brand-800" />)}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mt-12 flex flex-col items-center gap-4 relative z-10">
                <p className="text-brand-800 text-[10px] font-black uppercase tracking-[0.4em]">
                    &copy; 2025 {settings.name} OPS
                </p>
                <div className="flex items-center gap-3 opacity-20">
                    <Shield size={16} className="text-white" />
                    <Database size={16} className="text-white" />
                    <Sparkles size={16} className="text-white" />
                </div>
            </div>
        </div>
    );
};