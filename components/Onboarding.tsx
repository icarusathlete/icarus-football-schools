import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Shield, Users, UploadCloud, ChevronRight, Check, Trophy, Zap } from 'lucide-react';
import Papa from 'papaparse';
import { db } from '../firebase';
import { doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { User } from '../types';

interface OnboardingProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<string>('coach');
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleRoleSelect = (selectedRole: string) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          let count = 0;
          
          results.data.forEach((row: any) => {
            if (row.name) {
              const newPlayerRef = doc(collection(db, 'players'));
              batch.set(newPlayerRef, {
                id: newPlayerRef.id,
                fullName: row.fullName || row.name,
                squadId: row.squadId || 'unassigned',
                position: row.position || 'Unknown',
                createdAt: new Date().toISOString(),
              });
              count++;
            }
          });
          
          await batch.commit();
          setImportedCount(count);
          setLoading(false);
          setStep(3);
        } catch (error) {
          console.error("Error importing squad:", error);
          setLoading(false);
        }
      }
    });
  };

  const finishSetup = async () => {
    setLoading(true);
    try {
      const updatedUser: User = { 
        ...user, 
        role: (role === 'academy_director' ? 'admin' : 'coach') as any,
        fullName: user.fullName || user.username,
        memberId: user.memberId || `M-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        onboardingComplete: true, 
        specificRole: role 
      };
      
      await setDoc(doc(db, 'users', user.id), updatedUser, { merge: true });
      
      // Artificial delay for "moment of success"
      setTimeout(() => {
        onComplete(updatedUser);
      }, 1500);
    } catch (error) {
      console.error("Error finishing setup:", error);
      alert("Failed to save profile. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <div className="glass-card max-w-2xl w-full p-12 relative overflow-hidden border-brand-500/5 shadow-xl bg-white/80">
        {/* Refined Progress Indicator */}
        <div className="absolute top-0 left-0 right-0 flex h-1.5 gap-1 px-1 pt-1">
            {[1,2,3].map(i => (
                <div key={i} className={`flex-1 transition-all duration-700 rounded-full ${step >= i ? 'bg-brand-500' : 'bg-brand-900/5'}`} />
            ))}
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="animate-fade-in space-y-10">
             <div className="text-center">
               <h2 className="text-3xl font-black text-brand-900 uppercase tracking-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                 INITIALIZE <span className="premium-gradient-text">ACCESS</span>
               </h2>
               <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-900/40">Select primary academy designation</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <button onClick={() => handleRoleSelect('head_coach')} className="glass-card p-8 border-brand-900/5 hover:border-brand-500/30 transition-all flex flex-col gap-5 group text-left relative overflow-hidden bg-white/50">
                 <div className="p-3.5 bg-brand-900/5 rounded-lg group-hover:bg-brand-500 group-hover:text-white w-fit transition-all text-brand-900/40"><Shield size={24} /></div>
                 <div>
                    <h3 className="font-black text-brand-900 uppercase tracking-tight text-sm">HEAD COACH</h3>
                    <p className="text-[10px] text-brand-900/40 font-bold leading-relaxed mt-2 uppercase tracking-wide">Squad training, fixtures, and performance metrics.</p>
                 </div>
                 {role === 'head_coach' && <div className="absolute top-6 right-6 text-brand-500"><Check size={18} strokeWidth={3} /></div>}
               </button>
               <button onClick={() => handleRoleSelect('academy_director')} className="glass-card p-8 border-brand-900/5 hover:border-brand-500/30 transition-all flex flex-col gap-5 group text-left relative overflow-hidden bg-white/50">
                 <div className="p-3.5 bg-brand-900/5 rounded-lg group-hover:bg-brand-500 group-hover:text-white w-fit transition-all text-brand-900/40"><Users size={24} /></div>
                 <div>
                    <h3 className="font-black text-brand-900 uppercase tracking-tight text-sm">DIRECTOR</h3>
                    <p className="text-[10px] text-brand-900/40 font-bold leading-relaxed mt-2 uppercase tracking-wide">Oversight, registry management, and system logs.</p>
                 </div>
                 {role === 'academy_director' && <div className="absolute top-6 right-6 text-brand-500"><Check size={18} strokeWidth={3} /></div>}
               </button>
             </div>
             <div className="flex justify-center">
                <button onClick={() => setStep(2)} className="text-[9px] font-black text-brand-900/30 hover:text-brand-500 uppercase tracking-[0.25em] transition-all">DEFER CONFIGURATION</button>
             </div>
          </div>
        )}

        {/* Step 2: Squad Import */}
        {step === 2 && (
          <div className="animate-fade-in space-y-10">
             <div className="text-center">
               <h2 className="text-3xl font-black text-brand-900 uppercase tracking-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                 DEPLOY <span className="premium-gradient-text">DATAFEED</span>
               </h2>
               <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-900/40">Batch-import athlete records via CSV</p>
             </div>
             
             <div className="glass-card border-dashed border-2 border-brand-500/10 p-16 text-center hover:border-brand-500/40 transition-all bg-brand-900/[0.02] relative group cursor-pointer">
               <input type="file" accept=".csv" onChange={handleFileUpload} disabled={loading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
               <div className="w-16 h-16 bg-brand-900 text-brand-500 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg transition-all">
                <UploadCloud size={28} />
               </div>
               <h3 className="font-black text-lg text-brand-900 uppercase tracking-tight mb-2">UPLOAD LEDGER</h3>
               <p className="text-[9px] text-brand-900/40 font-bold uppercase tracking-widest leading-relaxed">Expected: name, squadId, position</p>
               {loading && <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-4" />
                  <p className="text-[9px] font-black text-brand-900 uppercase tracking-[0.2em]">Processing Matrix...</p>
               </div>}
             </div>
             
             <button onClick={() => setStep(3)} className="w-full py-4 text-brand-900/30 hover:text-brand-900 font-black text-[9px] uppercase tracking-[0.25em] flex items-center justify-center gap-2 transition-all">
                MANUAL ENTRY PROTOCOL <ChevronRight size={14}/>
             </button>
          </div>
        )}

        {/* Step 3: Complete Moment */}
        {step === 3 && (
            <div className="animate-fade-in text-center space-y-10 py-8">
                {loading ? (
                    <div className="flex flex-col items-center space-y-8">
                        <div className="w-20 h-20 bg-brand-500/5 rounded-full flex items-center justify-center relative">
                            <div className="absolute inset-0 border-2 border-brand-500/10 border-t-brand-500 rounded-full animate-spin" />
                            <Trophy className="text-brand-500" size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-brand-900 uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                SYNCING <span className="premium-gradient-text">CORE</span>
                            </h2>
                            <p className="text-[9px] font-bold text-brand-900/30 uppercase tracking-[0.2em] mt-3">Finalizing academy encryption...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-brand-500/10 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                            <Check size={36} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-brand-900 uppercase tracking-tight mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                ACADEMY <span className="premium-gradient-text">ONLINE</span>
                            </h2>
                            <p className="text-[9px] font-bold text-brand-900/40 uppercase tracking-[0.3em]">
                                {importedCount > 0 ? `${importedCount} ATHLETE RECORDS DEPLOYED` : 'SYSTEM INITIALIZATION SUCCESSFUL'}
                            </p>
                        </div>
                        <button 
                            onClick={finishSetup}
                            className="w-full bg-brand-900 text-white font-black px-10 py-5 rounded-xl shadow-lg hover:bg-brand-950 transition-all uppercase tracking-[0.25em] text-[10px] flex items-center justify-center gap-3"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            <Zap size={14} className="text-brand-500" fill="currentColor" /> ENTER COMMAND CENTER
                        </button>
                    </>
                )}
            </div>
        )}
      </div>
    </div>

  );
};
