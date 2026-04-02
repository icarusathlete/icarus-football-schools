import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { StorageService } from './services/storageService';
import { User } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LoadingList } from './components/ui/LoadingSkeleton';

// Lazy Loaded Components
const Schedule = lazy(() => import('./components/Schedule').then(m => ({ default: m.Schedule })));
const NoticeBoard = lazy(() => import('./components/NoticeBoard').then(m => ({ default: m.NoticeBoard })));
const Leaderboard = lazy(() => import('./components/Leaderboard').then(m => ({ default: m.Leaderboard })));
const Team = lazy(() => import('./components/Team').then(m => ({ default: m.Team })));
const CoachAttendance = lazy(() => import('./components/CoachAttendance').then(m => ({ default: m.CoachAttendance })));
const MatchManager = lazy(() => import('./components/MatchManager').then(m => ({ default: m.MatchManager })));
const SquadComparison = lazy(() => import('./components/SquadComparison').then(m => ({ default: m.SquadComparison })));
const HeadToHead = lazy(() => import('./components/HeadToHead').then(m => ({ default: m.HeadToHead })));
const EvaluationManager = lazy(() => import('./components/EvaluationManager').then(m => ({ default: m.EvaluationManager })));
const TrainingManager = lazy(() => import('./components/TrainingManager').then(m => ({ default: m.TrainingManager })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UserManagement = lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const PlayerRegistration = lazy(() => import('./components/PlayerRegistration').then(m => ({ default: m.PlayerRegistration })));
const FinanceManager = lazy(() => import('./components/FinanceManager').then(m => ({ default: m.FinanceManager })));
const PlayerManager = lazy(() => import('./components/PlayerManager').then(m => ({ default: m.PlayerManager })));
const PlayerPortal = lazy(() => import('./components/PlayerPortal').then(m => ({ default: m.PlayerPortal })));

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
      case 'squad-comparison': return <SquadComparison />;
      case 'head-to-head': return <HeadToHead />;
      case 'evaluations': return <EvaluationManager />;
      case 'training': return <TrainingManager />;
      case 'admin': return <AdminDashboard />;
      case 'users': return <UserManagement />;
      case 'register': return <PlayerRegistration />;
      case 'finance': return <FinanceManager />;
      case 'players': return <PlayerManager />;
      case 'player-dashboard': return <PlayerPortal currentUser={currentUser} />;
      default: return <div className="p-8 text-white">Select a module to begin</div>;
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-brand-950 flex items-center justify-center p-12">
        <LoadingList count={5} />
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Intercept if profile is incomplete
  if (!currentUser.fullName || !currentUser.memberId) {
    return <Onboarding currentUser={currentUser} onComplete={(updated) => setCurrentUser(updated)} />;
  }

  return (
    <Layout currentUser={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      <Suspense fallback={
        <div className="p-8 animate-in fade-in duration-500">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-brand-800 rounded-xl animate-pulse" />
              <div className="space-y-2">
                 <div className="h-4 w-32 bg-brand-800 rounded animate-pulse" />
                 <div className="h-3 w-48 bg-brand-800/50 rounded animate-pulse" />
              </div>
           </div>
           <LoadingList count={3} />
        </div>
      }>
        {renderContent()}
      </Suspense>
    </Layout>
  );
};

export default App;
