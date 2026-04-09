import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { StorageService } from './services/storageService';
import { User } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { LoadingList } from './components/ui/LoadingSkeleton';
import { AttendanceStatus } from './types';

// Helper to retry lazy loading on failure (usually due to deployment/version mismatch)
const lazyRetry = (importFn: () => Promise<any>) => 
  lazy(() => 
    importFn().catch((error) => {
      console.error("Chunk load failed, checking for updates...", error);
      const storageKey = 'last-retry-time';
      const lastRetry = sessionStorage.getItem(storageKey);
      const now = Date.now();
      if (!lastRetry || now - parseInt(lastRetry) > 10000) {
        sessionStorage.setItem(storageKey, now.toString());
        window.location.reload();
      }
      return { default: () => <div className="p-8 text-brand-500/20 lowercase font-black text-[10px] tracking-widest italic animate-pulse">Synchronizing Module...</div> };
    })
  );

// Simple Error Boundary to catch absolute rendering crashes
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) return (
       <div className="p-8 text-white">
          <h2>Application Error</h2>
          <p>Please refresh the page or contact the administrator.</p>
       </div>
    );
    return this.props.children;
  }
}

// Lazy Loaded Components
// Lazy Loaded Components with Retry Logic
const Schedule = lazyRetry(() => import('./components/Schedule').then(m => ({ default: m.Schedule })));
const NoticeBoard = lazyRetry(() => import('./components/NoticeBoard').then(m => ({ default: m.NoticeBoard })));
const Leaderboard = lazyRetry(() => import('./components/Leaderboard').then(m => ({ default: m.Leaderboard })));
const Team = lazyRetry(() => import('./components/Team').then(m => ({ default: m.Team })));
const CoachAttendance = lazyRetry(() => import('./components/CoachAttendance').then(m => ({ default: m.CoachAttendance })));
const MatchManager = lazyRetry(() => import('./components/MatchManager').then(m => ({ default: m.MatchManager })));
const SquadComparison = lazyRetry(() => import('./components/SquadComparison').then(m => ({ default: m.SquadComparison })));
const HeadToHead = lazyRetry(() => import('./components/HeadToHead').then(m => ({ default: m.HeadToHead })));
const EvaluationManager = lazyRetry(() => import('./components/EvaluationManager').then(m => ({ default: m.EvaluationManager })));
const TrainingManager = lazyRetry(() => import('./components/TrainingManager').then(m => ({ default: m.TrainingManager })));
const AdminDashboard = lazyRetry(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UserManagement = lazyRetry(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const PlayerRegistration = lazyRetry(() => import('./components/PlayerRegistration').then(m => ({ default: m.PlayerRegistration })));
const FinanceManager = lazyRetry(() => import('./components/FinanceManager').then(m => ({ default: m.FinanceManager })));
const PlayerManager = lazyRetry(() => import('./components/PlayerManager').then(m => ({ default: m.PlayerManager })));
const PlayerPortal = lazyRetry(() => import('./components/PlayerPortal').then(m => ({ default: m.PlayerPortal })));

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [settings, setSettings] = useState(StorageService.getSettings());

  useEffect(() => {
    StorageService.init();
    
    // Immediate settings loading
    const handleSettingsChange = () => setSettings(StorageService.getSettings());
    window.addEventListener('settingsChanged', handleSettingsChange);

    // Safety timeout: If Firebase doesn't signal readiness in 10s, proceed regardless
    const safetyTimeout = setTimeout(() => {
      setIsAuthReady(true);
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(safetyTimeout);
      setIsAuthReady(true); // Signal ready as soon as we know the auth status
      
      if (firebaseUser) {
        // Fetch user role and subscribe to real-time metadata updates
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubUser = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = { id: snapshot.id, ...snapshot.data() } as User;
            setCurrentUser(userData);
            StorageService.startFirebaseSync(userData);
            
            // Default tabs based on role — only if exactly matching a default
            if (activeTab === '') {
              if (userData.role === 'admin') setActiveTab('admin');
              else if (userData.role === 'coach') setActiveTab('schedule');
              else if (userData.role === 'player') setActiveTab('player-dashboard');
            }
          }
        }, (error) => {
          console.error("User metadata sync error:", error);
          StorageService.stopFirebaseSync();
        });
        
        return; 
      } else {
        setCurrentUser(null);
        StorageService.stopFirebaseSync();
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
      window.removeEventListener('settingsChanged', handleSettingsChange);
    };
  }, []);

  useEffect(() => {
    const applySettings = (settingsData: any) => {
      const root = document.documentElement;
      if (settingsData.primaryColor) root.style.setProperty('--brand-primary', settingsData.primaryColor);
      if (settingsData.secondaryColor) root.style.setProperty('--brand-secondary', settingsData.secondaryColor);
      
      // Update font if needed (index.css currently uses Inter/Orbitron by default)
      if (settingsData.fontFamily) {
         root.style.fontFamily = `'${settingsData.fontFamily}', ${root.style.fontFamily}`;
      }
    };

    applySettings(settings);
  }, [settings]);

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      // Removed StorageService.startFirebaseSync from here; handled by onAuthStateChanged
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
    return <Login onLogin={handleLoginSuccess} />;
  }

  // Intercept if profile is incomplete
  if (!currentUser.fullName || !currentUser.memberId) {
    return <Onboarding user={currentUser} onComplete={(updated: any) => setCurrentUser(updated)} />;
  }

  return (
    <Layout currentUser={currentUser} activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}>
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
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </Suspense>
    </Layout>
  );
};

export default App;
