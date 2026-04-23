/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { ThemeProvider } from './components/ThemeProvider';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';

import { BrandingProvider, useBranding } from './components/BrandingProvider';
import { SetupScreen } from './components/SetupScreen';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { isConfigured, loading: brandingLoading } = useBranding();

  if (authLoading || (user && brandingLoading)) {
    return (
      <div className="min-h-screen dark:bg-zinc-950 bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Login />;
  
  if (!isConfigured) return <SetupScreen />;

  return <Dashboard />;
}

// Hook to simplify auth state in AppContent
function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}

export default function App() {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <Router>
          <AppContent />
        </Router>
      </BrandingProvider>
    </ThemeProvider>
  );
}
