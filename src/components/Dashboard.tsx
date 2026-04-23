import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Usb, Users, Clock, DollarSign, MessageCircle, Sun, Moon, Home, LayoutDashboard, TrendingUp, Cpu, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { sendTelegramMessage } from '../lib/telegram';
import { useTheme } from './ThemeProvider';
import { auth } from '../lib/firebase';
import { useBranding } from './BrandingProvider';

// Import our views
import { Pendrives } from './Pendrives';
import { Clients } from './Clients';
import { Rentals } from './Rentals';
import { Financials } from './Financials';
import { Summary } from './Summary';
import { Settings } from './Settings';
import { Admin } from './Admin';

const WolfLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2L4 8L5 11L2 14L5 16L4 22L12 18L20 22L19 16L22 14L19 11L20 8L12 2Z" fill="currentColor" />
    <path d="M8 8L12 11M16 8L12 11M12 11V15" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" strokeLinecap="round"/>
  </svg>
);

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { appName } = useBranding();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  useEffect(() => {
    // Basic trick to trigger "cron" alerts when someone uses the app
    const checkAutomatedAlerts = async () => {
      if (!localStorage.getItem('tg_token')) return; // Setup not complete
      
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const isMonday = today.getDay() === 1;
      const isFirstDay = today.getDate() === 1;

      // Ensure we only trigger once per day
      if (localStorage.getItem(`cron_daily_${dateStr}`)) return;
      localStorage.setItem(`cron_daily_${dateStr}`, 'true');

      // (In a real backend, we'd calculate and send the daily string here -
      // but since we rely on the Reports component for data fetching, we are 
      // just notifying that the app woke up. To send real stats, the easiest 
      // is telling them to click inside "Relatórios").
      await sendTelegramMessage(`☀️ *Sistema Habilitado Hoje* (${dateStr})\nAcesse a aba Relatórios para disparar os fechamentos!`);
    };

    checkAutomatedAlerts();
  }, []);

  

  const navItems = [
    { name: 'Início', icon: TrendingUp, path: '/' },
    { name: 'Locações', icon: Clock, path: '/rentals' },
    { name: 'Pendrives', icon: Usb, path: '/pendrives' },
    { name: 'Clientes', icon: Users, path: '/clients' },
    { name: 'Financeiro', icon: DollarSign, path: '/financials' },
    { name: 'Configurações', icon: SettingsIcon, path: '/settings' },
  ];

  // Adiciona menu de Admin apenas para o dono do sistema
  if (auth.currentUser?.email === 'rodrigolonewolf@gmail.com') {
    navItems.push({ name: 'Admin', icon: ShieldCheck, path: '/admin' });
  }

  return (
    <div className="min-h-screen dark:bg-zinc-950 bg-gray-50 dark:text-zinc-100 text-gray-900 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 dark:bg-zinc-900 bg-white border-r dark:border-zinc-800 border-gray-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center shadow-lg group">
              <WolfLogo className="w-6 h-6 text-white group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm dark:text-zinc-100 text-gray-900 uppercase tracking-tighter leading-tight">Wolftech</span>
              <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest leading-none">Gestão de Aluguel</span>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-blue-600/10 text-blue-500 border border-blue-500/20"
                    : "dark:text-zinc-400 text-gray-500 hover:dark:text-zinc-100 text-gray-900 hover:dark:bg-zinc-800 bg-gray-100/50"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t dark:border-zinc-800 border-gray-200 space-y-2">
          <div className="px-3 py-2">
             <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Ativo como</p>
             <p className="text-xs font-semibold dark:text-zinc-300 text-gray-700 truncate">{auth.currentUser?.email}</p>
          </div>
          
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium dark:text-zinc-400 text-gray-500 hover:dark:text-zinc-100 text-gray-900 hover:dark:bg-zinc-800 hover:bg-gray-100 transition-colors border dark:border-zinc-800 border-gray-200"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5" />} 
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5"/>
            Sair
          </button>
          
          <div className="pt-2 text-center space-y-1">
            <p className="text-[10px] text-gray-400 dark:text-zinc-600 leading-tight">🌟 Em memória de Valdecir G de Lima. <br/> O Primeiro que acreditou na realização desta marca. Obrigado Pai.</p>
            <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-[0.2em] block">versão core: 1.2.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden dark:bg-zinc-900 bg-white border-b dark:border-zinc-800 border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center shadow-lg">
              <WolfLogo className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm dark:text-white text-gray-900 uppercase tracking-tighter leading-tight">Wolftech</span>
              <span className="text-[7px] font-bold text-blue-500 uppercase tracking-widest leading-none">Gestão</span>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 dark:text-zinc-400 text-gray-500">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleLogout} className="p-2 text-red-500 bg-red-500/10 rounded-lg">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Summary />} />
          <Route path="/rentals" element={<Rentals />} />
          <Route path="/pendrives" element={<Pendrives />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/financials" element={<Financials />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>

        <div className="md:hidden pb-4 pt-8 text-center space-y-1">
            <p className="text-[10px] text-gray-400 dark:text-zinc-600 leading-tight px-4">🌟 Em memória de Valdecir G de Lima. <br/> O Primeiro que acreditou na realização desta marca. Obrigado Pai.</p>
            <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-600 uppercase tracking-[0.2em] block">versão core: 1.2.0</span>
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 dark:bg-zinc-900 bg-white border-t dark:border-zinc-800 border-gray-200 z-50 flex overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex w-full min-w-max px-2 py-1 items-center justify-around gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors rounded-lg",
                location.pathname === item.path
                  ? "text-blue-500 bg-blue-500/5"
                  : "dark:text-zinc-500 text-gray-400 hover:dark:text-zinc-300 text-gray-700"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-tight text-center">{item.name}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
