import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface BrandingContextType {
  appName: string;
  isConfigured: boolean;
  loading: boolean;
  user: any;
  updateBranding: (name: string) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [appName, setAppName] = useState('Wolftech Sistema de Gestão de aluguel');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setIsConfigured(false);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsub = onSnapshot(doc(db, 'settings', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppName(data.appName || 'Wolftech Sistema de Gestão de aluguel');
        setIsConfigured(true);
      } else {
        setIsConfigured(false);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore settings error:", error);
      setIsConfigured(false);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const updateBranding = async (name: string) => {
    if (!user) return;

    await setDoc(doc(db, 'settings', user.uid), {
      appName: name,
      ownerId: user.uid,
      updatedAt: Date.now()
    });
  };

  return (
    <BrandingContext.Provider value={{ appName, isConfigured, loading, user, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
