import React, { useState, useEffect } from 'react';
import { Send, Settings, BarChart2, MessageCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { sendTelegramMessage } from '../lib/telegram';
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfWeek, endOfMonth, endOfWeek } from 'date-fns';

export function Reports() {
  const [token, setToken] = useState(localStorage.getItem('tg_token') || '');
  const [chatId, setChatId] = useState(localStorage.getItem('tg_chat_id') || '');
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('tg_token', token);
    localStorage.setItem('tg_chat_id', chatId);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    sendTelegramMessage('🤖 *Bot Conectado!* O sistema Pendrive Aluguel agora enviará os alertas aqui.');
  };

  const fetchAppData = async () => {
    const [txSnap, rentSnap, penSnap, cliSnap] = await Promise.all([
      getDocs(query(collection(db, 'transactions'))),
      getDocs(query(collection(db, 'rentals'))),
      getDocs(query(collection(db, 'pendrives'))),
      getDocs(query(collection(db, 'clients')))
    ]);

    const transactions = txSnap.docs.map(d => d.data());
    const rentals = rentSnap.docs.map(d => d.data());
    const pendrives = penSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    return { transactions, rentals, pendrives };
  };

  const calculateROI = (transactions: any[]) => {
    const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const revenue = transactions.filter(t => t.type === 'payment' || t.type === 'damage_fee').reduce((acc, t) => acc + t.amount, 0);
    const profit = revenue - expenses;
    const roi = expenses > 0 ? ((profit / expenses) * 100).toFixed(2) : '100';
    return { expenses, revenue, profit, roi };
  };

  const getPendriveStats = (rentals: any[], pendrives: any[]) => {
    const counts: Record<string, number> = {};
    rentals.forEach(r => {
      counts[r.pendriveId] = (counts[r.pendriveId] || 0) + 1;
    });
    
    const stats = pendrives.map(p => ({
      number: (p as any).number,
      count: counts[p.id] || 0
    })).sort((a, b) => b.count - a.count);

    return {
      most: stats.slice(0, 3),
      least: stats.slice(-3).reverse()
    };
  };

  const generateDaily = async () => {
    setLoading(true);
    const { transactions, rentals, pendrives } = await fetchAppData();
    
    const today = startOfDay(new Date()).getTime();
    const todayRen = rentals.filter(r => r.createdAt >= today);
    const todayTx = transactions.filter(t => t.createdAt >= today);
    const todayRev = todayTx.filter(t => t.type !== 'expense').reduce((a, t) => a + t.amount, 0);

    const text = `📊 <b>RESUMO DIÁRIO</b>\nData: ${format(new Date(), 'dd/MM/yyyy')}\n\n`
      + `✅ Locações Hoje: ${todayRen.length}\n`
      + `💰 Renda Hoje: R$ ${todayRev.toFixed(2)}\n\n`
      + `<i>Enviado pelo sistema Pendrive Aluguel</i>`;

    await sendTelegramMessage(text);
    setLoading(false);
  };

  const generateWeekly = async () => {
    setLoading(true);
    const { transactions, rentals, pendrives } = await fetchAppData();
    
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();
    const weekRen = rentals.filter(r => r.createdAt >= weekStart);
    const weekTx = transactions.filter(t => t.createdAt >= weekStart);
    const weekRev = weekTx.filter(t => t.type !== 'expense').reduce((a, t) => a + t.amount, 0);
    const weekExp = weekTx.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

    const { most, least } = getPendriveStats(rentals, pendrives);

    const text = `📆 <b>FECHAMENTO SEMANAL</b>\n\n`
      + `✅ Locações na Semana: ${weekRen.length}\n`
      + `💰 Receitas: R$ ${weekRev.toFixed(2)}\n`
      + `📉 Despesas: R$ ${weekExp.toFixed(2)}\n`
      + `💵 Lucro na Semana: R$ ${(weekRev - weekExp).toFixed(2)}\n\n`
      + `📈 <b>Mais Alugados (Geral):</b>\n${most.map(m => `- #${m.number} (${m.count}x)`).join('\n')}\n\n`
      + `⚠️ <b>Menos Alugados (Geral):</b>\n${least.map(m => `- #${m.number} (${m.count}x)`).join('\n')}`;

    await sendTelegramMessage(text);
    setLoading(false);
  };

  const generateMonthly = async () => {
    setLoading(true);
    const { transactions, rentals, pendrives } = await fetchAppData();
    
    const monthStart = startOfMonth(new Date()).getTime();
    const monthRen = rentals.filter(r => r.createdAt >= monthStart);
    
    const { expenses, revenue, profit, roi } = calculateROI(transactions);

    const text = `🏢 <b>FECHAMENTO MENSAL / GERAL</b>\n\n`
      + `Mês Atual:\n`
      + `✅ Novas Locações: ${monthRen.length}\n\n`
      + `📊 <b>Métricas Reais (Todo o período):</b>\n`
      + `Total Investido: R$ ${expenses.toFixed(2)}\n`
      + `Total Arrecadado: R$ ${revenue.toFixed(2)}\n`
      + `Lucro Real Pás-Gastos: R$ ${profit.toFixed(2)}\n`
      + `🚀 <b>Retorno sobre Investimento (ROI):</b> ${roi}%\n\n`;

    await sendTelegramMessage(text);
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Send className="w-6 h-6 text-blue-500" /> Telegram & Relatórios</h1>
        <p className="dark:text-zinc-400 text-gray-500 text-sm">Configure os alertas automáticos e relatórios gerenciais</p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
        <h3 className="font-bold text-blue-400 flex items-center gap-2 mb-2"><MessageCircle className="w-5 h-5"/> Como configurar?</h3>
        <ol className="list-decimal list-inside text-sm dark:text-zinc-300 text-gray-700 space-y-2">
          <li>Abra o Telegram e procure por <strong>@BotFather</strong></li>
          <li>Envie o comando <code className="bg-black/30 px-1 rounded">/newbot</code>, escolha um nome e anote o <strong>Token de Acesso</strong>.</li>
          <li>Procure pelo bot que você criou no Telegram e mande um "Oi" para ele.</li>
          <li>Acesse <a href="https://api.telegram.org/botSEU_TOKEN_AQUI/getUpdates" target="_blank" className="text-blue-400 underline">este link</a> (trocando a palavra SEU_TOKEN_AQUI pelo token) para descobrir seu <strong>Chat ID</strong>.</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5 dark:text-zinc-400 text-gray-500"/> Credenciais do Bot</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm dark:text-zinc-400 text-gray-500 mb-1">Bot Token</label>
              <input
                required value={token} onChange={e => setToken(e.target.value)}
                className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-lg p-2 text-white outline-none focus:border-blue-500" placeholder="Ex: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              />
            </div>
            <div>
              <label className="block text-sm dark:text-zinc-400 text-gray-500 mb-1">Seu Chat ID (ou do Grupo)</label>
              <input
                required value={chatId} onChange={e => setChatId(e.target.value)}
                className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-lg p-2 text-white outline-none focus:border-blue-500" placeholder="Ex: 123456789"
              />
            </div>
            <button type="submit" className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white transition-colors flex justify-center items-center gap-2">
              Salvar Credenciais
            </button>
            {isSaved && <p className="text-emerald-400 text-sm text-center">Salvo com sucesso!</p>}
          </form>
        </div>

        <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5 dark:text-zinc-400 text-gray-500"/> Disparar Relatórios</h2>
          <p className="text-sm dark:text-zinc-400 text-gray-500 mb-6">Envie resumos forçados para o seu Telegram agora mesmo.</p>
          
          <div className="space-y-3">
            <button disabled={loading} onClick={generateDaily} className="w-full px-4 py-3 dark:bg-zinc-800 bg-gray-100 dark:hover:bg-zinc-700 hover:bg-gray-200 disabled:opacity-50 rounded-lg font-medium text-white transition-colors flex items-center justify-between">
              Resumo Diário <Send className="w-4 h-4"/>
            </button>
            <button disabled={loading} onClick={generateWeekly} className="w-full px-4 py-3 dark:bg-zinc-800 bg-gray-100 dark:hover:bg-zinc-700 hover:bg-gray-200 disabled:opacity-50 rounded-lg font-medium text-white transition-colors flex items-center justify-between">
              Fechamento Semanal <Send className="w-4 h-4"/>
            </button>
            <button disabled={loading} onClick={generateMonthly} className="w-full px-4 py-3 dark:bg-zinc-800 bg-gray-100 dark:hover:bg-zinc-700 hover:bg-gray-200 disabled:opacity-50 rounded-lg font-medium text-white transition-colors flex items-center justify-between">
              Fechamento Mensal / ROI <Send className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
