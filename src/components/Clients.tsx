import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { Trash2, Edit2, Plus, Users, MapPin, Clock, X, Usb, Search, PlayCircle, TrendingUp, User } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { sendTelegramMessage } from '../lib/telegram';

export function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', nickname: '', room: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [historyClient, setHistoryClient] = useState<any>(null);
  const [clientHistory, setClientHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(collection(db, 'clients'), where('ownerId', '==', userId));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(data.sort((a, b) => b.createdAt - a.createdAt));
    });

    const unsubR = onSnapshot(query(collection(db, 'rentals'), where('ownerId', '==', userId)), (s) => {
      setRentals(s.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    return () => { unsub(); unsubR(); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      if (editingId) {
        await updateDoc(doc(db, 'clients', editingId), {
          ...formData,
          updatedAt: now
        });
        sendTelegramMessage(`👤 *Cliente Atualizado*\nNome: ${formData.name}\nQuarto: ${formData.room}`);
      } else {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          createdAt: now,
          updatedAt: now,
          ownerId: auth.currentUser?.uid
        });
        sendTelegramMessage(`✅ *Novo Cliente*\nNome: ${formData.name}\nQuarto: ${formData.room}`);
      }
      setShowModal(false);
      setFormData({ name: '', nickname: '', room: '' });
      setEditingId(null);
    } catch(err) {
      console.error(err);
      alert('Erro ao salvar cliente.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza? Isso apagará o cliente permanentemente.')) {
      await deleteDoc(doc(db, 'clients', id));
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.nickname || '').toLowerCase().includes(search.toLowerCase()) ||
    c.room.includes(search)
  );

  const handleViewHistory = async (client: any) => {
    setHistoryClient(client);
    setHistoryLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      const q = query(
        collection(db, 'rentals'), 
        where('clientId', '==', client.id),
        where('ownerId', '==', userId)
      );
      const snap = await getDocs(q);
      let rentals = snap.docs.map(d => ({id: d.id, ...d.data() as any}));
      
      const pSnap = await getDocs(query(
        collection(db, 'pendrives'),
        where('ownerId', '==', userId)
      ));
      const pendrives = pSnap.docs.map(d => ({id: d.id, ...d.data() as any}));
      const pMap: Record<string, string> = {};
      pendrives.forEach(p => { pMap[p.id] = p.number; });
      
      rentals = rentals.map(r => ({...r, pendriveName: pMap[r.pendriveId] || 'Desconhecido'}));
      rentals.sort((a,b) => b.createdAt - a.createdAt);
      
      setClientHistory(rentals);
    } catch(err) {
      console.error(err);
      alert('Erro ao carregar o histórico de aluguéis.');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="dark:text-zinc-400 text-gray-500 text-sm">Gerencie os moradores/locatários</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar por nome, vulgo ou quarto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredClients.map(c => {
          const hasDebt = rentals.some(r => r.clientId === c.id && !r.paid);
          
          return (
          <div key={c.id} className={`dark:bg-zinc-900 bg-white border ${hasDebt ? 'border-orange-500/50 shadow-lg shadow-orange-500/5' : 'dark:border-zinc-800 border-gray-200'} rounded-xl p-4 flex flex-col gap-4`}>
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center text-left">
                <div className={`w-12 h-12 rounded-full ${hasDebt ? 'bg-orange-500/10 text-orange-500 ring-2 ring-orange-500/20' : 'dark:bg-zinc-800 bg-gray-100 dark:text-zinc-400 text-gray-500'} flex items-center justify-center font-bold uppercase`}>
                  {c.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold dark:text-zinc-100 text-gray-900">{c.name}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm dark:text-zinc-400 text-gray-500 mt-0.5">
                    {c.nickname && <span>Vulgo: {c.nickname}</span>}
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> Quarto {c.room}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setFormData({ name: c.name, nickname: c.nickname, room: c.room });
                    setEditingId(c.id);
                    setShowModal(true);
                  }}
                  className="p-2 dark:text-zinc-400 text-gray-500 hover:text-blue-400 rounded-lg hover:dark:bg-zinc-800 bg-gray-100 transition-colors border dark:border-zinc-700 border-gray-200"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 dark:text-zinc-400 text-gray-500 hover:text-red-400 rounded-lg hover:dark:bg-zinc-800 bg-gray-100 transition-colors border dark:border-zinc-700 border-gray-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-zinc-800 border-gray-100">
              <button
                onClick={() => handleViewHistory(c)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 dark:bg-zinc-800 bg-gray-100 dark:text-zinc-400 text-gray-500 hover:text-blue-500 rounded-lg transition-colors border dark:border-zinc-700 border-gray-200"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-tight">Histórico</span>
              </button>
              <button
                onClick={() => navigate('/rentals', { state: { preSelectClientId: c.id } })}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-tight">Alugar</span>
              </button>
            </div>
            {hasDebt && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                Débito Pendente
              </div>
            )}
          </div>
        )})}
        {filteredClients.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed dark:border-zinc-800 border-gray-200 rounded-xl">
            <Users className="w-8 h-8 dark:text-zinc-600 text-gray-400 mx-auto mb-2" />
            <p className="dark:text-zinc-400 text-gray-500">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 dark:bg-black/60 bg-gray-900/40 flex flex-col items-center justify-end sm:justify-center p-4 z-50 overflow-y-auto">
          <div className="dark:bg-zinc-900 bg-white w-full max-w-md rounded-2xl border dark:border-zinc-800 border-gray-200 shadow-2xl p-6 mb-safe overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-5 fade-in-20 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-zinc-100">{editingId ? 'Editar' : 'Novo'} Cliente</h2>
              <button onClick={() => {setShowModal(false); setEditingId(null);}} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Nome Completo
                </label>
                <input
                  required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Apelido ou Citar (opcional)</label>
                <input
                  value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})}
                  className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="Ex: Jão"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Quarto Designado
                </label>
                <select
                  required value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})}
                  className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                >
                  <option value="">Selecione o quarto...</option>
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={String(i+1)}>Quarto {i+1}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => {setShowModal(false); setEditingId(null);}} className="flex-1 px-4 py-3 dark:bg-zinc-800 bg-gray-100 dark:hover:bg-zinc-700 hover:bg-gray-200 rounded-xl transition-all font-bold text-gray-500 dark:text-zinc-400">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95">Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyClient && (
        <div className="fixed inset-0 dark:bg-black/60 bg-gray-900/40 flex flex-col items-center justify-end sm:justify-center p-4 z-50">
          <div className="dark:bg-zinc-900 bg-white w-full max-w-2xl rounded-2xl border dark:border-zinc-800 border-gray-200 shadow-2xl p-6 mb-safe flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-5 fade-in-20">
            <div className="flex justify-between items-center mb-6">
               <div>
                 <h2 className="text-xl font-bold dark:text-zinc-100 text-gray-900 flex items-center gap-2">
                   <Clock className="w-5 h-5 text-blue-500" /> Histórico de Aluguéis
                 </h2>
                 <p className="dark:text-zinc-400 text-gray-500 text-sm mt-1">Cliente: {historyClient.name}</p>
               </div>
               <button onClick={() => setHistoryClient(null)} className="p-2 dark:text-zinc-400 text-gray-500 hover:text-red-400 dark:hover:bg-zinc-800 hover:bg-gray-100 rounded-md transition-colors">
                  <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {historyLoading ? (
                 <div className="py-8 text-center flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="dark:text-zinc-400 text-gray-500 text-sm">Carregando histórico...</p>
                 </div>
              ) : clientHistory.length === 0 ? (
                 <div className="py-12 text-center border border-dashed dark:border-zinc-800 border-gray-200 rounded-xl">
                    <Usb className="w-8 h-8 dark:text-zinc-600 text-gray-400 mx-auto mb-2" />
                    <p className="dark:text-zinc-400 text-gray-500">Nenhum aluguel encontrado para este cliente.</p>
                 </div>
              ) : (
                 <>
                  {/* Summary Section */}
                  <div className="mb-6 p-4 dark:bg-zinc-800/50 bg-gray-100/50 border dark:border-zinc-800 border-gray-200 rounded-2xl">
                    <h3 className="text-sm font-bold dark:text-zinc-400 text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> Preferências de Uso
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const counts: Record<string, number> = {};
                        clientHistory.forEach(r => {
                          counts[r.pendriveName] = (counts[r.pendriveName] || 0) + 1;
                        });
                        return Object.entries(counts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([name, count]) => (
                            <div key={name} className="flex items-center gap-2 px-3 py-1.5 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl">
                              <Usb className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-sm font-bold">#{name}</span>
                              <span className="text-[10px] dark:bg-zinc-800 bg-gray-100 dark:text-zinc-500 text-gray-400 px-1.5 py-0.5 rounded-md">{count}x</span>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>

                  <h3 className="text-xs font-bold dark:text-zinc-500 text-gray-400 uppercase tracking-widest mb-2 px-1">Registros de Locação</h3>
                  <div className="space-y-3 pb-4">
                    {clientHistory.map(rental => {
                      const expectedReturn = rental.createdAt + (rental.plan === '12h' ? 12 : rental.plan === '24h' ? 24 : 168) * 60 * 60 * 1000;
                      const isLate = rental.status === 'active' && Date.now() > expectedReturn;
                      
                      return (
                      <div key={rental.id} className="p-4 border dark:border-zinc-800 border-gray-200 rounded-xl dark:bg-zinc-950 bg-gray-50 flex flex-col sm:flex-row justify-between gap-4 sm:items-center relative overflow-hidden">
                        <div className="flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Usb className="w-4 h-4 text-blue-500" />
                            <span className="font-bold dark:text-zinc-100 text-gray-900">Pendrive #{rental.pendriveName}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md font-medium dark:bg-blue-500/10 bg-blue-50 dark:text-blue-400 text-blue-600 border dark:border-blue-500/20 border-blue-200">
                              {rental.plan === '12h' ? '12 Horas' : rental.plan === '24h' ? '24 Horas' : 'Semanal'}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-800 px-1.5 py-0.5 rounded-sm uppercase ml-auto sm:ml-0">
                              #{rental.id.slice(-6)}
                            </span>
                          </div>
                          <div className="text-sm dark:text-zinc-400 text-gray-500 flex flex-col gap-1.5">
                            <span className="flex items-center gap-1.5"><strong className="dark:text-zinc-300 text-gray-700">Início:</strong> {format(rental.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                            {rental.status === 'active' && (
                              <span className={`flex items-center gap-1.5 ${isLate ? 'text-red-500' : 'text-blue-500'}`}>
                                <strong className="opacity-80">Prev. Devolução:</strong> {format(expectedReturn, 'dd/MM/yyyy HH:mm')}
                                {isLate && <span className="text-[10px] bg-red-500/10 border border-red-500/20 px-1.5 rounded-full ml-1 font-bold">ATRASADO</span>}
                              </span>
                            )}
                            {rental.status === 'returned' && (
                              <span className="flex items-center gap-1.5"><strong className="dark:text-zinc-300 text-gray-700">Devolvido em:</strong> {format(rental.updatedAt, 'dd/MM/yyyy HH:mm')}</span>
                            )}
                            {rental.status === 'damaged' && (
                              <span className="flex items-center gap-1.5 text-red-500"><strong className="text-red-500/80">Danificado em:</strong> {format(rental.updatedAt, 'dd/MM/yyyy HH:mm')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 dark:border-zinc-800 border-gray-200 mt-2 sm:mt-0">
                          <span className="font-bold text-lg dark:text-zinc-100 text-gray-900 sm:mb-1">R$ {rental.price.toFixed(2)}</span>
                          <div className="flex items-center sm:items-end gap-2 sm:gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                              rental.status === 'active' ? 'dark:bg-yellow-500/10 bg-yellow-50 dark:border-yellow-500/20 border-yellow-200 text-yellow-600 dark:text-yellow-400' :
                              rental.status === 'returned' ? 'dark:bg-emerald-500/10 bg-emerald-50 dark:border-emerald-500/20 border-emerald-200 text-emerald-600 dark:text-emerald-400' :
                              'dark:bg-red-500/10 bg-red-50 dark:border-red-500/20 border-red-200 text-red-600 dark:text-red-400'
                            }`}>
                              {rental.status === 'active' ? 'Em andamento' : rental.status === 'returned' ? 'Concluído' : 'Danificado'}
                            </span>
                            <span className="text-xs font-medium">
                              {rental.paid ? 
                                <span className="text-emerald-500 dark:bg-emerald-500/10 bg-emerald-50 px-2 py-0.5 rounded-md border dark:border-emerald-500/20 border-emerald-200">Pago ✓</span> : 
                                <span className="text-orange-500 dark:bg-orange-500/10 bg-orange-50 px-2 py-0.5 rounded-md border dark:border-orange-500/20 border-orange-200">Fiado ⚠️</span>
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                 </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
