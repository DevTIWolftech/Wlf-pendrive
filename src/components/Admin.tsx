import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ShieldCheck, Users, Globe, Activity, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export function Admin() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Admin view of all configured tenants
    const unsub = onSnapshot(collection(db, 'settings'), (snap) => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const stats = [
    { title: 'Total de Ambientes', value: tenants.length, icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Usuários Ativos', value: tenants.filter(t => t.appName).length, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Status do Sistema', value: 'Online', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Versão Core', value: '1.2.0', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-600" /> Painel do Administrador
        </h1>
        <p className="text-gray-500 dark:text-zinc-400">Visão global da infraestrutura Multi-Tenant.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{stat.title}</p>
            <p className="text-3xl font-black mt-1 dark:text-white text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b dark:border-zinc-800 border-gray-100 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Lista de Tenats (Clientes)
          </h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">Real-time</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-zinc-800 border-gray-100 italic">
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Nome do App</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tenant ID (UUID)</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b dark:border-zinc-800 border-gray-50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-4 font-bold text-gray-700 dark:text-zinc-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-zinc-400" />
                      </div>
                      {t.appName || 'Não Configurado'}
                    </div>
                  </td>
                  <td className="p-4">
                    <code className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded font-mono text-zinc-500">{t.id}</code>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-[10px] font-bold text-blue-500 uppercase hover:underline">Auditar Dados</button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-400 text-sm">
                    Nenhum tenant registrado no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
