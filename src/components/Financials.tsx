import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, where } from 'firebase/firestore';
import { Plus, TrendingUp, TrendingDown, DollarSign, Check, Filter, Calendar, Clock, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Financials() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({ type: 'expense', amount: '', description: '' });

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubT = onSnapshot(query(collection(db, 'transactions'), where('ownerId', '==', userId)), s => {
      const data: any[] = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(data.sort((a,b) => b.createdAt - a.createdAt));
    });
    const unsubR = onSnapshot(query(collection(db, 'rentals'), where('ownerId', '==', userId)), s => {
      setRentals(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubT(); unsubR(); };
  }, []);

  const totalEmCaixa = transactions.reduce((acc, t) => {
    if (t.type === 'payment' || t.type === 'damage_fee') return acc + t.amount;
    if (t.type === 'expense') return acc - t.amount;
    return acc;
  }, 0);

  const totalFiados = rentals.filter(r => !r.paid).reduce((acc, r) => acc + r.price, 0);

  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.createdAt);
    const inMonth = format(tDate, 'yyyy-MM') === filterMonth;
    const typeMatch = filterType === 'all' || t.type === filterType;
    return inMonth && typeMatch;
  });

  const monthEarnings = filteredTransactions
    .filter(t => t.type === 'payment' || t.type === 'damage_fee')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      await addDoc(collection(db, 'transactions'), {
        type: formData.type,
        amount: Number(formData.amount),
        description: formData.description,
        createdAt: now,
        updatedAt: now,
        ownerId: auth.currentUser?.uid
      });
      setShowModal(false);
      setFormData({ type: 'expense', amount: '', description: '' });
    } catch(err) {
      console.error(err);
      alert('Erro ao registrar transação.');
    }
  };

  const markRentalPaid = async (rentalId: string, amount: number) => {
    try {
      const now = Date.now();
      await updateDoc(doc(db, 'rentals', rentalId), { paid: true, updatedAt: now });
      await addDoc(collection(db, 'transactions'), {
        type: 'payment',
        amount: amount,
        description: 'Pagamento de Fiado (Caixa)',
        createdAt: now,
        updatedAt: now,
        ownerId: auth.currentUser?.uid
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      alert('Erro ao baixar fiado.');
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="dark:text-zinc-400 text-gray-500 text-sm">Visão geral do caixa e fiados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Despesa/Receita
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium dark:text-zinc-400 text-gray-500">Saldo Geral</h3>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <DollarSign className="w-5 h-5"/>
            </div>
          </div>
          <p className="text-3xl font-black dark:text-zinc-100 text-gray-900">R$ {totalEmCaixa.toFixed(2)}</p>
        </div>

        <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium dark:text-zinc-400 text-gray-500">A Receber (Dívidas)</h3>
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
               !
            </div>
          </div>
          <p className="text-3xl font-black dark:text-zinc-100 text-gray-900">R$ {totalFiados.toFixed(2)}</p>
        </div>

        <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium dark:text-zinc-400 text-gray-500">Resultado do Mês</h3>
            <div className={`w-10 h-10 rounded-full ${monthEarnings - monthExpenses >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} flex items-center justify-center`}>
              {monthEarnings - monthExpenses >= 0 ? <TrendingUp className="w-5 h-5"/> : <TrendingDown className="w-5 h-5"/>}
            </div>
          </div>
          <p className="text-3xl font-black dark:text-zinc-100 text-gray-900">R$ {(monthEarnings - monthExpenses).toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b dark:border-zinc-800 border-gray-200 pb-4">
          <h2 className="text-xl font-bold italic text-blue-500">Fluxo de Caixa</h2>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input 
                type="month" 
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 dark:bg-zinc-950 bg-gray-100 border dark:border-zinc-800 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
              />
            </div>
            <div className="relative flex-1 sm:flex-none">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <select 
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 dark:bg-zinc-950 bg-gray-100 border dark:border-zinc-800 border-gray-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
              >
                <option value="all">TODOS</option>
                <option value="payment">ENTRADAS</option>
                <option value="expense">SAÍDAS</option>
                <option value="damage_fee">DANOS</option>
              </select>
            </div>
          </div>
        </div>

        <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl overflow-hidden divide-y dark:divide-zinc-800 divide-gray-200">
          {filteredTransactions.map(t => (
             <div key={t.id} className="p-4 flex items-center justify-between hover:dark:bg-zinc-800/30 transition-colors">
               <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'expense' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {t.type === 'expense' ? <TrendingDown className="w-4 h-4"/> : <TrendingUp className="w-4 h-4"/>}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold dark:text-zinc-200 text-gray-800">{t.description}</h4>
                    <p className="text-[10px] uppercase font-bold dark:text-zinc-600 text-gray-400 tracking-tighter">{format(t.createdAt, "dd 'de' MMMM 'às' HH:mm", {locale: ptBR})}</p>
                  </div>
               </div>
               <span className={`font-black text-sm ${t.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                 {t.type === 'expense' ? '−' : '+'} R$ {t.amount.toFixed(2)}
               </span>
             </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
              <DollarSign className="w-8 h-8 dark:text-zinc-700 text-gray-300 mx-auto mb-2" />
              <p className="dark:text-zinc-500 text-gray-400 text-sm">Nenhuma transação para este filtro.</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold mt-12 mb-4 border-b dark:border-zinc-800 border-gray-200 pb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" /> Dívidas Pendentes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rentals.filter(r => !r.paid).map(r => (
            <div key={r.id} className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium dark:text-zinc-200 text-gray-800">Aluguel: {r.plan === '12h' ? '12h' : r.plan === '24h' ? '24h' : 'Semanal'}</p>
                <p className="text-xs dark:text-zinc-500 text-gray-400 mt-1">{format(r.createdAt, "dd/MM/yyyy HH:mm")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-red-400">R$ {r.price.toFixed(2)}</span>
                <button onClick={() => markRentalPaid(r.id, r.price)} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-medium rounded-md border border-emerald-500/20 transition-colors">
                  Dar Baixa
                </button>
              </div>
            </div>
          ))}
          {rentals.filter(r => !r.paid).length === 0 && <p className="dark:text-zinc-500 text-gray-400 text-sm">Sem fiados pendentes.</p>}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 dark:bg-black/60 bg-gray-900/40 flex flex-col items-center justify-end sm:justify-center p-4 z-50 overflow-y-auto">
          <div className="dark:bg-zinc-900 bg-white w-full max-w-md rounded-2xl border dark:border-zinc-800 border-gray-200 shadow-2xl p-6 mb-safe overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-5 fade-in-20 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-zinc-100">Nova Transação</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTx} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  Tipo de Lançamento
                </label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})} 
                  className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                >
                  <option value="expense">Despesa (Gasto / Aquisição)</option>
                  <option value="payment">Receita (Entrada / Aluguel)</option>
                  <option value="damage_fee">Taxa de Danos / Multa</option>
                </select>
              </div>
              
              <div className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border dark:border-zinc-800 border-gray-200">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Valor do Lançamento (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    className="w-full pl-10 pr-4 py-3 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl dark:text-zinc-100 text-gray-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-lg" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  Descrição detalhada
                </label>
                <input 
                  required 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all" 
                  placeholder="Ex: Compra de 3 pendrives 32GB" 
                />
              </div>
              
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 dark:bg-zinc-800 bg-gray-100 dark:hover:bg-zinc-700 hover:bg-gray-200 rounded-xl transition-all font-bold text-gray-400">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95">Confirmar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] pointer-events-none">
          <div className="dark:bg-zinc-900 bg-white border-2 border-emerald-500/50 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] px-8 py-6 rounded-3xl flex flex-col items-center gap-3 animate-in zoom-in-95 fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 animate-bounce">
              <Check className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-emerald-500">PAGO COM SUCESSO!</h3>
            <p className="text-sm dark:text-zinc-400 text-gray-500 font-medium">Transação registrada no caixa.</p>
          </div>
        </div>
      )}
    </div>
  );
}
