import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Shield, Users, UploadCloud, ChevronRight, Check, Trophy, Zap } from 'lucide-react';
import Papa from 'papaparse';
import { db } from '../firebase';
import { doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { User } from '../types';

interface OnboardingProps {
  user: User;
  onComplete: () => void;
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
                name: row.name,
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
      const updatedUser = { 
        ...user, 
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
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-10 relative overflow-hidden border border-white/5 shadow-2xl">
        {/* Top Progress Bar */}
        <div className="absolute top-0 left-0 right-0 flex h-1">
            {[1,2,3].map(i => (
                <div key={i} className={`flex-1 transition-all duration-500 ${step >= i ? 'bg-gold' : 'bg-white/10'}`} />
            ))}
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="animate-slide-up space-y-8">
             <div className="text-center">
               <h2 className="text-4xl font-display font-black text-white italic uppercase tracking-tight mb-2">Initialize <span className="text-gold">Access</span></h2>
               <p className="text-brand-400 font-medium">Select your primary designation within the academy.</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button onClick={() => handleRoleSelect('head_coach')} className="p-8 bg-white/5 border border-white/10 rounded-2xl hover:border-gold hover:bg-gold/5 transition-all flex flex-col gap-4 group text-left relative overflow-hidden">
                 <div className="p-4 bg-white/5 rounded-xl group-hover:bg-gold/20 group-hover:text-gold w-fit transition-colors"><Shield size={28} /></div>
                 <div><h3 className="font-black text-white uppercase italic tracking-tight text-lg">Head Coach</h3><p className="text-xs text-brand-500 font-medium leading-relaxed mt-1">Full control over squad training, match fixtures, and attendance analytics.</p></div>
                 {role === 'head_coach' && <div className="absolute top-4 right-4 text-gold"><Check size={20} /></div>}
               </button>
               <button onClick={() => handleRoleSelect('academy_director')} className="p-8 bg-white/5 border border-white/10 rounded-2xl hover:border-gold hover:bg-gold/5 transition-all flex flex-col gap-4 group text-left relative overflow-hidden">
                 <div className="p-4 bg-white/5 rounded-xl group-hover:bg-gold/20 group-hover:text-gold w-fit transition-colors"><Users size={28} /></div>
                 <div><h3 className="font-black text-white uppercase italic tracking-tight text-lg">Director</h3><p className="text-xs text-brand-500 font-medium leading-relaxed mt-1">High-level oversight including financial reporting, registration, and system logs.</p></div>
                 {role === 'academy_director' && <div className="absolute top-4 right-4 text-gold"><Check size={20} /></div>}
               </button>
             </div>
             <div className="flex justify-center pt-4">
                <button onClick={() => setStep(2)} className="text-[10px] font-black text-brand-600 hover:text-white uppercase tracking-[0.2em] transition-colors">Skip for now</button>
             </div>
          </div>
        )}

        {/* Step 2: Squad Import */}
        {step === 2 && (
          <div className="animate-slide-up space-y-8">
             <div className="text-center">
               <h2 className="text-4xl font-display font-black text-white italic uppercase tracking-tight mb-2">Deploy <span className="text-gold">Squad</span></h2>
               <p className="text-brand-400 font-medium">Batch-import your athletes via CSV for immediate analysis.</p>
             </div>
             
             <div className="border-2 border-dashed border-white/10 rounded-[2rem] p-16 text-center hover:border-gold/50 transition-all bg-white/5 relative group cursor-pointer">
               <input type="file" accept=".csv" onChange={handleFileUpload} disabled={loading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
               <div className="w-20 h-20 bg-brand-950 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <UploadCloud size={32} className="text-brand-400 group-hover:text-gold" />
               </div>
               <h3 className="font-black text-xl text-white italic uppercase tracking-tight mb-2">Drop CSV Archive</h3>
               <p className="text-xs text-brand-500 font-medium">Expected format: <span className="text-brand-300">name, squadId, position</span></p>
               {loading && <div className="absolute inset-0 bg-brand-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2rem]">
                  <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-xs font-black text-gold uppercase tracking-widest">Processing Ledger...</p>
               </div>}
             </div>
             
             <button onClick={() => setStep(3)} className="w-full py-4 text-brand-500 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all">Manual Setup <ChevronRight size={14}/></button>
          </div>
        )}

        {/* Step 3: Complete Moment */}
        {step === 3 && (
            <div className="animate-fade-in text-center space-y-8 py-12">
                {loading ? (
                    <div className="flex flex-col items-center space-y-8">
                        <div className="w-24 h-24 bg-gold/5 rounded-full flex items-center justify-center relative">
                            <div className="absolute inset-0 border-4 border-gold border-t-transparent rounded-full animate-spin" />
                            <Trophy className="text-gold animate-pulse" size={40} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-display font-black text-white italic uppercase tracking-tight">Initializing <span className="text-gold">HQ</span></h2>
                            <p className="text-brand-400 text-sm mt-2 animate-pulse">Syncing academy data and finalizing profile...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                            <Check size={48} strokeWidth={3} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-display font-black text-white italic uppercase tracking-tight mb-2 flex items-center justify-center gap-3">Academy <span className="text-gold">Ready</span></h2>
                            {importedCount > 0 ? (
                                <p className="text-brand-400 font-medium uppercase text-[10px] tracking-[0.3em]">{importedCount} Athlete records successfully deployed</p>
                            ) : (
                                <p className="text-brand-400 font-medium">Core configuration successful.</p>
                            )}
                        </div>
                        <button 
                            onClick={finishSetup}
                            className="w-full bg-gold hover:bg-gold-glow text-brand-950 font-black px-12 py-5 rounded-2xl shadow-2xl shadow-gold/20 transition-all uppercase tracking-[0.25em] text-xs hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Zap size={16} fill="currentColor" /> Enter Academy Portal
                        </button>
                    </>
                )}
            </div>
        )}
      </Card>
    </div>
  );
};

