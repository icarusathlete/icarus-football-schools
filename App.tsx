
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { PlayerRegistration } from './components/PlayerRegistration';
import { CoachAttendance } from './components/CoachAttendance';
import { AdminDashboard } from './components/AdminDashboard';
import { UserManagement } from './components/UserManagement';
import { MatchManager } from './components/MatchManager';
import { PlayerPortal } from './components/PlayerPortal';
import { Schedule } from './components/Schedule';
import { NoticeBoard } from './components/NoticeBoard';
import { FinanceManager } from './components/FinanceManager';
import { Leaderboard } from './components/Leaderboard';
import { EvaluationManager } from './components/EvaluationManager';
import { PlayerManager } from './components/PlayerManager';
import { Team } from './components/Team'; 
import { TrainingManager } from './components/TrainingManager';
import { StorageService } from './services/storageService';
import { User } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('schedule');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [settings, setSettings] = useState(StorageService.getSettings());

  useEffect(() => {
    StorageService.init();
    
    // Immediate settings loading
    const handleSettingsChange = () => setSettings(StorageService.getSettings());
    window.addEventListener('settingsChanged', handleSettingsChange);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as User;
          setCurrentUser(userData);
          StorageService.startFirebaseSync(userData);
          
          // Default tabs based on role
          if (userData.role === 'admin') setActiveTab('admin');
          else if (userData.role === 'coach') setActiveTab('schedule');
          else if (userData.role === 'player') setActiveTab('player-dashboard');
        } else {
          // Fallback if user doc doesn't exist yet (e.g. during first login)
          // The Login component will create it and call handleLoginSuccess
        }
      } else {
        setCurrentUser(null);
        StorageService.stopFirebaseSync();
      }
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      StorageService.startFirebaseSync(user);
      
      // Default tabs based on role
      if (user.role === 'admin') setActiveTab('admin');
      else if (user.role === 'coach') setActiveTab('schedule');
      else if (user.role === 'player') setActiveTab('player-dashboard');
  };

  const handleLogout = async () => {
      await auth.signOut();
      setCurrentUser(null);
      setActiveTab('');
      StorageService.stopFirebaseSync();
  };

  const renderContent = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'schedule': return <Schedule role={currentUser.role} />;
      case 'notices': return <NoticeBoard role={currentUser.role} />;
      case 'leaderboard': return <Leaderboard role={currentUser.role} />;
      case 'team': return <Team currentUser={currentUser} />;
      case 'coach': return <CoachAttendance />;
      case 'matches': return <MatchManager />;
      case 'evaluations': return <EvaluationManager />;
      case 'training': return <TrainingManager />;
      case 'admin': return <AdminDashboard />;
      case 'register': return <PlayerRegistration />;
      case 'players': return <PlayerManager />;
      case 'users': return <UserManagement />;
      case 'finance': return <FinanceManager />;
      case 'player-dashboard': return <PlayerPortal user={currentUser} />;
      default: return <div>Tab not found</div>;
    }
  };

  if (!isAuthReady) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center text-white font-mono"
        style={{ backgroundColor: 'var(--brand-secondary)' }}
      >
        <div className="flex flex-col items-center gap-4">
           {settings.logoUrl && <img src={settings.logoUrl} className="w-16 h-16 object-contain" alt="Logo" />}
           <div className="animate-pulse flex flex-col items-center">
             <span className="uppercase tracking-[0.3em] font-black text-xs opacity-50 mb-2">Synchronizing</span>
             <span className="font-bold text-lg">{settings.name}</span>
           </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
      return <Login onLogin={handleLoginSuccess} />;
  }

  return (
    <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
    >
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </Layout>
  );
};

export default App;
