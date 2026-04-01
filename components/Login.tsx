import React, { useState } from 'react';
import { Trophy, ArrowRight, AlertTriangle } from 'lucide-react';
import { User } from '../types';
import { loginWithGoogle, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../services/storageService';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
        <div className="min-h-screen bg-icarus-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-icarus-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />

            <div className="mb-8 text-center text-white relative z-10">
                <div className="p-4 bg-white/10 backdrop-blur-xl rounded-3xl inline-block border border-white/20 mb-6 shadow-2xl">
                    <Trophy className="w-16 h-16 text-yellow-400" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter italic" style={{ fontFamily: 'Orbitron' }}>
                    ICARUS <span className="text-icarus-500 font-normal">SCHOOLS</span>
                </h1>
                <p className="text-icarus-100 uppercase tracking-[0.4em] text-[10px] font-bold mt-2 opacity-70">Football Management Portal</p>
            </div>

            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/20">
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
                        className="w-full bg-icarus-600 hover:bg-icarus-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center space-x-3 shadow-xl shadow-icarus-600/20 active:scale-95 italic disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Orbitron' }}
                    >
                        {isLoading ? (
                            <span>SIGNING IN...</span>
                        ) : (
                            <>
                                <span>SIGN IN WITH GOOGLE</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            <p className="mt-8 text-white/30 text-[10px] font-bold uppercase tracking-[0.3em] relative z-10">
                &copy; 2025 ICARUS ATHLETIC SYSTEMS
            </p>
        </div>
    );
};