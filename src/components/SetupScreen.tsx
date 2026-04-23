import React, { useState } from 'react';
import { useBranding } from './BrandingProvider';
import { Layout, Palette, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export function SetupScreen() {
  const { updateBranding } = useBranding();
  const [appName, setAppName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateBranding(appName || 'Meu Sistema');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-zinc-950 bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 shadow-blue-500/30">
            <Layout className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">Seja bem-vindo!</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Estamos felizes em ter você aqui. <br />
            Para começar, dê uma identidade ao seu novo sistema de gestão.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Palette className="w-3 h-3" /> Nome do seu App
            </label>
            <input
              autoFocus
              type="text"
              required
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Ex: WolfTech, Consultoria T.I..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Finalizar Configuração
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800 text-center">
          <p className="text-xs text-gray-400">
            Esta configuração é necessária apenas uma vez para preparar seu banco de dados exclusivo.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
