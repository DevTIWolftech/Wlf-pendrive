import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, UserPlus, Github, Chrome, Cpu, ShieldCheck } from 'lucide-react';

const WolfLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2L4 8L5 11L2 14L5 16L4 22L12 18L20 22L19 16L22 14L19 11L20 8L12 2Z" fill="currentColor" />
    <path d="M8 8L12 11M16 8L12 11M12 11V15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" strokeLinecap="round"/>
  </svg>
);

export function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domínio não autorizado. Adicione este domínio no painel do Firebase Authentication (Settings > Authorized domains).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('O popup de login foi fechado antes de concluir.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Login com Google não está habilitado no Firebase Console.');
      } else {
        setError(`Erro: ${err.message || err.code || 'Desconhecido'}`);
      }
      console.error("Google Auth Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('O login por E-mail/Senha precisa ser habilitado no Firebase Console.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Ocorreu um erro na autenticação.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark:bg-zinc-950 bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors" />
            <WolfLogo className="w-16 h-16 text-blue-500 relative z-10 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            <div className="absolute -bottom-1 -right-1">
              <ShieldCheck className="w-6 h-6 text-emerald-500 fill-emerald-500/10" />
            </div>
          </div>
          <h1 className="text-3xl font-black dark:text-zinc-100 text-gray-900 tracking-tighter italic uppercase">Wolftech</h1>
          <p className="text-[10px] font-bold dark:text-zinc-500 text-gray-500 mt-1 uppercase tracking-[0.2em] opacity-80">Sistema de Gestão de Aluguel</p>
        </div>

        <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <LogIn className="w-24 h-24" />
          </div>

          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            {isRegistering ? 'Criar Nova Conta' : 'Entrar no Sistema'}
          </h2>

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">E-mail</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-12 dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                placeholder="exemplo@gmail.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg font-medium">
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />
              )}
              {isRegistering ? 'Criar Ambiente' : 'Entrar Agora'}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t dark:border-zinc-800 border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="dark:bg-zinc-900 bg-white px-2 text-gray-400 dark:text-zinc-500 font-bold">Ou entrar com</span></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 dark:bg-zinc-950 bg-gray-50 dark:hover:bg-zinc-800 hover:bg-gray-100 border dark:border-zinc-800 border-gray-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Chrome className="w-5 h-5 text-red-500" />
            Google
          </button>

          <p className="mt-8 text-center text-sm text-gray-500">
            {isRegistering ? 'Já tem um ambiente?' : 'Novo por aqui?'} 
            <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="ml-1 text-blue-500 font-bold hover:underline"
            >
              {isRegistering ? 'Fazer Login' : 'Criar Conta Gratuita'}
            </button>
          </p>
        </div>

        <div className="mt-8 text-center">
           <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-zinc-600">Ambiente Multi-Tenant Certificado</p>
        </div>
      </div>
    </div>
  );
}
