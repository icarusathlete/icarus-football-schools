import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Shield, Users, UploadCloud, ChevronRight, Check } from 'lucide-react';
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
    await setDoc(doc(db, 'users', user.id), { ...user, onboardingComplete: true, specificRole: role }, { merge: true });
    setLoading(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 relative overflow-hidden">
        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="animate-slide-up space-y-6">
             <div className="text-center mb-8">
               <h2 className="text-3xl font-display font-bold text-white mb-2">Welcome to Icarus</h2>
               <p className="text-brand-300">Let's set up your academy profile. What is your role?</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button onClick={() => handleRoleSelect('head_coach')} className="p-6 border border-white/10 rounded-xl hover:border-gold hover:bg-white/5 transition-all flex items-center gap-4 group text-left">
                 <div className="p-3 bg-white/5 rounded-lg group-hover:bg-gold/20 group-hover:text-gold"><Shield size={24} /></div>
                 <div><h3 className="font-bold text-white">Head Coach</h3><p className="text-sm text-brand-400">Manage squads, matches, and training</p></div>
               </button>
               <button onClick={() => handleRoleSelect('academy_director')} className="p-6 border border-white/10 rounded-xl hover:border-gold hover:bg-white/5 transition-all flex items-center gap-4 group text-left">
                 <div className="p-3 bg-white/5 rounded-lg group-hover:bg-gold/20 group-hover:text-gold"><Users size={24} /></div>
                 <div><h3 className="font-bold text-white">Academy Director</h3><p className="text-sm text-brand-400">Full access to finance and analytics</p></div>
               </button>
             </div>
             <div className="flex justify-center mt-6">
                <button onClick={() => setStep(2)} className="text-sm text-brand-400 hover:text-white underline">Skip for now</button>
             </div>
          </div>
        )}

        {/* Step 2: Squad Import */}
        {step === 2 && (
          <div className="animate-slide-up space-y-6">
             <div className="text-center mb-8">
               <h2 className="text-3xl font-display font-bold text-white mb-2">Build Your Squad</h2>
               <p className="text-brand-300">Upload a CSV file to instantly import your players.</p>
             </div>
             
             <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-gold/50 transition-colors bg-white/5 relative">
               <input type="file" accept=".csv" onChange={handleFileUpload} disabled={loading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
               <UploadCloud size={48} className="mx-auto mb-4 text-brand-400" />
               <h3 className="font-bold text-lg text-white mb-1">Click or drag a CSV file</h3>
               <p className="text-sm text-brand-400">Format: name, squadId, position</p>
               {loading && <p className="text-gold mt-4 font-bold animate-pulse">Importing players...</p>}
             </div>
             
             <button onClick={() => setStep(3)} className="w-full py-4 text-brand-300 hover:text-white font-medium flex items-center justify-center gap-2">Skip this step <ChevronRight size={16}/></button>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
            <div className="animate-fade-in text-center space-y-6 py-8">
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <Check size={40} />
                </div>
                <h2 className="text-3xl font-display font-bold text-white mb-2">You're All Set!</h2>
                {importedCount > 0 && <p className="text-brand-300">Successfully imported {importedCount} players.</p>}
                <p className="text-brand-300">Your professional portal is ready.</p>
                <button onClick={finishSetup} disabled={loading} className="mt-8 bg-gold hover:bg-gold-glow text-gray-900 font-bold px-8 py-4 rounded-xl shadow-lg transition-all w-full md:w-auto">
                    {loading ? 'Finalizing...' : 'Enter Academy Portal'}
                </button>
            </div>
        )}

        {/* Progress Dots */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {[1,2,3].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${step === i ? 'w-6 bg-gold' : 'w-1.5 bg-white/20'}`} />
            ))}
        </div>
      </Card>
    </div>
  );
};
