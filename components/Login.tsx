import React, { useState, useEffect } from 'react';
import { Trophy, ArrowRight, AlertTriangle } from 'lucide-react';
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
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-700" 
             style={{ backgroundColor: settings.secondaryColor }}>
            
            {/* Background elements with theme primary color */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 rounded-full blur-3xl opacity-20" 
                 style={{ backgroundColor: settings.primaryColor }} />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 rounded-full blur-3xl opacity-10" 
                 style={{ backgroundColor: settings.primaryColor }} />

            <div className="mb-8 text-center text-white relative z-10">
                <div className="p-6 bg-white/10 backdrop-blur-xl rounded-[2.5rem] inline-block border border-white/20 mb-6 shadow-2xl animate-in zoom-in duration-500">
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} className="w-20 h-20 object-contain" alt="Logo" />
                    ) : (
                        <Trophy className="w-16 h-16 text-yellow-400" />
                    )}
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase" 
                    style={{ fontFamily: settings.fontFamily }}>
                    {settings.name.split(' ')[0]} <span className="font-normal opacity-70" style={{ color: settings.primaryColor }}>{settings.name.split(' ').slice(1).join(' ')}</span>
                </h1>
                <p className="text-white/40 uppercase tracking-[0.4em] text-[10px] font-bold mt-4">Football Management Portal</p>
            </div>

            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="p-10 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
                    <p className="text-gray-400 text-sm mb-8">Sign in to access your dashboard.</p>
                    
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in text-left">
                            <AlertTriangle size={18} className="shrink-0" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <button 
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center space-x-3 shadow-xl active:scale-95 italic disabled:opacity-70 disabled:cursor-not-allowed group"
                        style={{ 
                            fontFamily: settings.fontFamily,
                            backgroundColor: settings.primaryColor,
                            boxShadow: `0 20px 25px -5px ${settings.primaryColor}33`
                        }}
                    >
                        {isLoading ? (
                            <span>SIGNING IN...</span>
                        ) : (
                            <>
                                <span>SIGN IN WITH GOOGLE</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            <p className="mt-8 text-white/20 text-[10px] font-bold uppercase tracking-[0.3em] relative z-10">
                &copy; 2025 {settings.name} SYSTEMS
            </p>
        </div>
    );
};