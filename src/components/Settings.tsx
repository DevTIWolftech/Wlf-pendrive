import React, { useState } from 'react';
import { useBranding } from './BrandingProvider';
import { Settings as SettingsIcon, Save, Image as ImageIcon, Layout, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';

export function Settings() {
  const { appName, updateBranding } = useBranding();
  const [name, setName] = useState(appName);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateBranding(name);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-600" /> Configurações
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1">Personalize a identidade do seu sistema.</p>
        </div>
      </div>

      <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b dark:border-zinc-800 border-gray-100 bg-gray-50/50 dark:bg-zinc-900/50">
          <h3 className="font-bold flex items-center gap-2">
            <Layout className="w-4 h-4 text-blue-500" /> Identidade do Ambiente
          </h3>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Nome do Sistema</label>
            <input 
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-12 dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl px-4 outline-none focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-4 p-4 dark:bg-zinc-950 bg-gray-50 rounded-2xl border dark:border-zinc-800/50 border-gray-100">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-sm shadow-blue-500/5">
                <Layout className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Visualização Atual</p>
              <p className="font-black text-lg dark:text-white text-gray-900 tracking-tight">{name || 'Seu Sistema'}</p>
              <p className="text-[10px] text-gray-500">Este nome aparecerá em todos os cabeçalhos e menus do sistema.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-emerald-500 text-sm font-bold"
              >
                <CheckCircle2 className="w-4 h-4" /> Nome atualizado!
              </motion.div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Salvar Nome
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-2xl space-y-2">
          <h4 className="font-bold">Informações do Tenant</h4>
          <p className="text-sm text-gray-500">Seu ambiente está configurado para o ID:</p>
          <code className="text-[10px] bg-gray-100 dark:bg-zinc-950 p-2 rounded block break-all font-mono">
            {auth.currentUser?.uid}
          </code>
        </div>
        <div className="p-6 dark:bg-zinc-500/5 bg-blue-50 border dark:border-zinc-500/20 border-blue-200 rounded-2xl flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
             <ShieldCheck className="w-6 h-6 text-blue-500" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-blue-600 dark:text-blue-500">Privacidade dos Dados</h4>
            <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed font-medium">
              Sua base de dados é isolada por Tenant ID. Ninguém além de você e seus usuários autorizados tem acesso aos seus registros de locação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
