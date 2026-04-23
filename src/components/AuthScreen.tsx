import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Cpu } from 'lucide-react';

export function AuthScreen() {
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
      console.error('Google Login error:', err);
      setError('Erro ao entrar com Google: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Tenta fazer o login direto com o email
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Auto-cria a conta se ela não existe (Bypass do erro de usuário não encontrado)
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (createErr: any) {
          if (createErr.code === 'auth/operation-not-allowed') {
            setError('O Google bloqueou a criação com E-mail/Senha por segurança. Para resolver sem complicações, USE O BOTÃO "Entrar com Google" abaixo, ou ative no painel manualmente.');
          } else if (createErr.code === 'auth/email-already-in-use') {
            setError('Senha incorreta para este email.');
          } else {
            setError('Credenciais inválidas: ' + createErr.message);
          }
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O Google bloqueou a criação com E-mail/Senha por segurança. Para resolver sem complicações, USE O BOTÃO "Entrar com Google" abaixo, ou ative no painel manualmente.');
      } else {
        setError('Erro ao autenticar: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-zinc-950 bg-gray-50 px-4 dark:text-zinc-100 text-gray-900">
      <div className="max-w-md w-full dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
            <Cpu className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-center">Gestão de Pendrive</h2>
          <p className="dark:text-zinc-400 text-gray-500 text-sm mt-2 text-center">
            Acesso Restrito ao Sistema
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-lg mb-6 leading-relaxed font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-zinc-300 text-gray-700 mb-1">E-mail de Acesso</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-zinc-100 text-gray-900"
              required
              placeholder="seu@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium dark:text-zinc-300 text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-zinc-100 text-gray-900"
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center mt-2"
          >
            {loading ? 'Acessando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 border-t dark:border-zinc-800 border-gray-200"></div>
          <span className="text-sm dark:text-zinc-500 text-gray-400 font-medium">Ou use o acesso sem senha</span>
          <div className="flex-1 border-t dark:border-zinc-800 border-gray-200"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={loading}
          className="w-full mt-6 py-2.5 dark:bg-zinc-800 bg-gray-100 hover:dark:bg-zinc-700 hover:bg-gray-200 disabled:opacity-50 dark:text-zinc-100 text-gray-900 font-medium rounded-lg transition-colors border dark:border-zinc-700 border-gray-300 flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Entrar com o Google
        </button>
        
        <div className="mt-6 text-xs text-center text-gray-500 dark:text-zinc-400">
           Se quiser usar e-mail e senha personalizados, acesse <a href="https://console.firebase.google.com/project/ai-studio-applet-webapp-aa2ed/authentication/providers" target="_blank" className="text-blue-500 underline">seu painel do banco de dados</a> e ative a opção E-mail/Senha.
        </div>
      </div>
    </div>
  );
}
