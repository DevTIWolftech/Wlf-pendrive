import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { TrendingUp, Users, Usb, Clock, DollarSign, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useBranding } from './BrandingProvider';

export function Summary() {
  const { appName } = useBranding();
  const [stats, setStats] = useState({
    activeRentals: 0,
    availablePendrives: 0,
    totalClients: 0,
    monthlyRevenue: 0,
    totalDebt: 0,
    topClients: [] as any[]
  });

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Real-time listeners for summary data
    const unsubR = onSnapshot(query(collection(db, 'rentals'), where('ownerId', '==', userId)), (s) => {
      const rentals = s.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const active = rentals.filter(r => r.status === 'active').length;
      const debt = rentals.filter(r => !r.paid).reduce((acc, r) => acc + (r.price || 0), 0);
      
      const now = new Date();
      const thisMonth = rentals.filter(r => {
        const d = new Date(r.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.paid;
      }).reduce((acc, r) => acc + (r.price || 0), 0);

      // Top clients
      const clientCounts: Record<string, { count: number, id: string }> = {};
      rentals.forEach(r => {
        if (!clientCounts[r.clientId]) clientCounts[r.clientId] = { count: 0, id: r.clientId };
        clientCounts[r.clientId].count++;
      });
      
      setStats(prev => ({ ...prev, activeRentals: active, totalDebt: debt, monthlyRevenue: thisMonth }));
      
      // Fetch client names for top clients
      const topEntries = Object.values(clientCounts).sort((a, b) => b.count - a.count).slice(0, 3);
      if (topEntries.length > 0) {
        getDocs(query(collection(db, 'clients'), where('ownerId', '==', userId))).then(cs => {
          const cMap: Record<string, string> = {};
          cs.docs.forEach(d => { cMap[d.id] = (d.data() as any).name; });
          setStats(prev => ({ 
            ...prev, 
            topClients: topEntries.map(e => ({ name: cMap[e.id] || 'Desconhecido', count: e.count })) 
          }));
        });
      }
    });

    const unsubP = onSnapshot(query(collection(db, 'pendrives'), where('ownerId', '==', userId)), (s) => {
      const available = s.docs.map(d => d.data()).filter(p => p.status === 'available').length;
      setStats(prev => ({ ...prev, availablePendrives: available }));
    });

    const unsubC = onSnapshot(query(collection(db, 'clients'), where('ownerId', '==', userId)), (s) => {
      setStats(prev => ({ ...prev, totalClients: s.size }));
    });

    return () => { unsubR(); unsubP(); unsubC(); };
  }, []);

  const cards = [
    { title: 'Locações Ativas', value: stats.activeRentals, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Pendrives Livres', value: stats.availablePendrives, icon: Usb, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Total Clientes', value: stats.totalClients, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Receita (Mês)', value: `R$ ${stats.monthlyRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Visão Geral</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-1">Como anda o seu negócio hoje?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{card.title}</p>
            <p className="text-3xl font-black mt-1 dark:text-white text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> Melhores Clientes
          </h3>
          <div className="space-y-4">
            {stats.topClients.map((c, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm dark:bg-emerald-500/10 bg-emerald-50 text-emerald-500 px-3 py-1 rounded-full font-bold">
                  {c.count} locações
                </span>
              </div>
            ))}
            {stats.topClients.length === 0 && <p className="text-center text-gray-500 py-4">Nenhum dado disponível.</p>}
          </div>
        </div>

        <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" /> Resumo de Débitos
          </h3>
          <div className="flex flex-col items-center justify-center h-full pb-10">
            <p className="text-sm text-gray-500 dark:text-zinc-400 uppercase font-bold tracking-widest mb-2">Total Pendente (Fiados)</p>
            <p className={`text-5xl font-black ${stats.totalDebt > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
              R$ {stats.totalDebt.toFixed(2)}
            </p>
            {stats.totalDebt > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-orange-500 animate-pulse">
                <ArrowUpRight className="w-4 h-4" /> Existem clientes aguardando acerto
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-center space-y-2 pt-12">
        <p className="text-[10px] text-gray-400 dark:text-zinc-600 leading-tight italic">
          🌟 Em memória de Valdecir G de Lima, O Primeiro que acreditou na realização desta marca. Obrigado Pai.
        </p>
        <div className="text-[10px] text-gray-400 dark:text-zinc-600 font-mono uppercase tracking-widest">
          {appName} System • versão core: 1.2.0
        </div>
      </div>
    </div>
  );
}
