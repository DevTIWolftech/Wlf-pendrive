import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, writeBatch, getDocs, where } from 'firebase/firestore';
import { Plus, Check, Clock, Usb, Info, DollarSign, X, Search, Timer, MessageCircle, ArrowRight, Calendar, User, Hash } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { ptBR } from 'date-fns/locale';
import { sendTelegramMessage } from '../lib/telegram';

export function Rentals() {
  const location = useLocation();
  const [rentals, setRentals] = useState<any[]>([]);
  const [pendrives, setPendrives] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ pendriveId: '', clientId: '', plan: '24h', paid: false, customPrice: '' });

  const [activeTab, setActiveTab] = useState<'active' | 'debt'>('active');
  const [payActionData, setPayActionData] = useState<{ rental: any; amount: string; status: 'paid' | 'unpaid' } | null>(null);
  const [returnActionData, setReturnActionData] = useState<{ rental: any; amount: string; status: 'paid' | 'unpaid'; fine?: number } | null>(null);
  const [selectedRental, setSelectedRental] = useState<any | null>(null);
  const [rentalTransactions, setRentalTransactions] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Refs for background checks without re-triggering interval
  const rentalsRef = useRef(rentals);
  const clientsRef = useRef(clients);
  const pendrivesRef = useRef(pendrives);

  useEffect(() => {
    rentalsRef.current = rentals;
    clientsRef.current = clients;
    pendrivesRef.current = pendrives;
  }, [rentals, clients, pendrives]);

  const getExpectedReturnTime = (startTime: number, plan: string) => {
    const hours = plan === '12h' ? 12 : plan === '24h' ? 24 : 168;
    return startTime + hours * 60 * 60 * 1000;
  };

  const calculateFine = (rental: any) => {
    const expected = rental.expectedReturnTime || getExpectedReturnTime(rental.startTime, rental.plan);
    const now = Date.now();
    if (now <= expected) return 0;
    
    const hoursLate = Math.floor((now - expected) / (1000 * 60 * 60));
    if (hoursLate <= 0) return 0;

    // R$ 2,00 per hour late
    return hoursLate * 2;
  };

  // Per-hour notification for late rentals and reminders
  useEffect(() => {
    const checkAndNotify = async () => {
      const now = Date.now();
      const activeRentals = rentalsRef.current.filter(r => r.status === 'active');
      const batch = writeBatch(db);
      let hasUpdates = false;
      
      // 1. Late Notifications
      const lateToNotify = activeRentals.filter(r => {
        const expected = r.expectedReturnTime || getExpectedReturnTime(r.startTime, r.plan);
        return now > expected && r.notifiedOverdue !== true;
      });

      if (lateToNotify.length > 0) {
        let message = `⚠️ *Novos Aluguéis Atrasados (${lateToNotify.length})*\n\n`;
        lateToNotify.forEach(r => {
          const client = clientsRef.current.find(c => c.id === r.clientId);
          const pen = pendrivesRef.current.find(p => p.id === r.pendriveId);
          const expected = r.expectedReturnTime || getExpectedReturnTime(r.startTime, r.plan);
          const hoursLate = Math.floor((now - expected) / (1000 * 60 * 60));
          message += `👤 ${client?.name || 'Cliente'} (Q. ${client?.room})\n💾 Pendrive: #${pen?.number}\n⏰ Atraso: ${hoursLate}h\n\n`;
          
          batch.update(doc(db, 'rentals', r.id), { notifiedOverdue: true, updatedAt: now });
          hasUpdates = true;
        });
        message += `_Por favor, verifique no painel de Locações._`;
        sendTelegramMessage(message);
      }

      // 2. Reminder Notifications (1 day before)
      const upcomingToNotify = activeRentals.filter(r => {
        const expected = r.expectedReturnTime || getExpectedReturnTime(r.startTime, r.plan);
        const timeUntilReturn = expected - now;
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        // Notify if it's less than 24h away AND hasn't been notified yet
        return timeUntilReturn > 0 && timeUntilReturn <= oneDayMs && r.notifiedReminder !== true;
      });

      if (upcomingToNotify.length > 0) {
        upcomingToNotify.forEach(r => {
          const client = clientsRef.current.find(c => c.id === r.clientId);
          const pen = pendrivesRef.current.find(p => p.id === r.pendriveId);
          const msg = `🔔 *Lembrete de Devolução*\n\nCliente: ${client?.name}\nPendrive: #${pen?.number}\nPrazo encerra em menos de 24h.\n\n_Favor avisar no Quarto ${client?.room}_`;
          sendTelegramMessage(msg);
          
          batch.update(doc(db, 'rentals', r.id), { notifiedReminder: true, updatedAt: now });
          hasUpdates = true;
        });
      }

      if (hasUpdates) {
        await batch.commit();
      }
    };

    // Run every hour (3600000ms)
    const interval = setInterval(checkAndNotify, 3600000);
    const initialTimeout = setTimeout(checkAndNotify, 10000);
    return () => { clearInterval(interval); clearTimeout(initialTimeout); };
  }, []);

  useEffect(() => {
    // Pre-select client from navigation state
    if (location.state?.preSelectClientId) {
      setFormData(prev => ({ ...prev, clientId: location.state.preSelectClientId }));
      setShowModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const unsubR = onSnapshot(query(collection(db, 'rentals'), where('ownerId', '==', userId)), s => {
      const data: any[] = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setRentals(data.sort((a,b) => b.createdAt - a.createdAt));
    });
    const unsubP = onSnapshot(query(collection(db, 'pendrives'), where('ownerId', '==', userId)), s => {
      setPendrives(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubC = onSnapshot(query(collection(db, 'clients'), where('ownerId', '==', userId)), s => {
      setClients(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubR(); unsubP(); unsubC(); };
  }, []);

  const getPrice = (plan: string) => {
    if (plan === '12h') return 5;
    if (plan === '24h') return 10;
    if (plan === 'weekly') return 40;
    return 10;
  };

  const planLabels: Record<string, string> = {
    '12h': '12 Horas (R$ 5,00)',
    '24h': '24 Horas (R$ 10,00)',
    'weekly': 'Semanal (R$ 40,00)'
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      const planPrices = { '12h': 5, '24h': 10, 'weekly': 40 };
      const basePrice = planPrices[formData.plan as keyof typeof planPrices] || 10;
      const finalPrice = formData.customPrice ? parseFloat(formData.customPrice) : basePrice;
      
      const batch = writeBatch(db);
      
      const rentalRef = doc(collection(db, 'rentals'));
      const rentalId = rentalRef.id;
      const expectedReturnTime = getExpectedReturnTime(now, formData.plan);

      batch.set(rentalRef, {
        ...formData,
        price: finalPrice,
        startTime: now,
        expectedReturnTime: expectedReturnTime,
        status: 'active',
        notifiedOverdue: false,
        notifiedReminder: false,
        createdAt: now,
        updatedAt: now,
        ownerId: auth.currentUser?.uid
      });

      const penRef = doc(db, 'pendrives', formData.pendriveId);
      batch.update(penRef, { status: 'rented', updatedAt: now });

      if (formData.paid && finalPrice > 0) {
        const transRef = doc(collection(db, 'transactions'));
        batch.set(transRef, {
          type: 'payment',
          amount: finalPrice,
          description: `Aluguel pendrive pago adiantado (Plano ${formData.plan})`,
          rentalId: rentalId,
          ownerId: auth.currentUser?.uid,
          createdAt: now,
          updatedAt: now
        });
      }

      await batch.commit();
      
      const clientName = clients.find(c => c.id === formData.clientId)?.name;
      const penName = pendrives.find(p => p.id === formData.pendriveId)?.number;
      sendTelegramMessage(`🚀 *Novo Aluguel Iniciado*\nCliente: ${clientName}\nPendrive: #${penName}\nPlano: ${planLabels[formData.plan]}\nValor: R$ ${finalPrice.toFixed(2)}\nPago: ${formData.paid ? 'Sim' : 'Não (Fiado)'}`);

      setShowModal(false);
      setFormData({ pendriveId: '', clientId: '', plan: '24h', paid: false, customPrice: '' });
    } catch(err) {
      console.error(err);
      alert('Erro ao registrar locação.');
    }
  };

  const handlePayRental = async () => {
    if (!payActionData) return;
    const { rental, amount, status } = payActionData;
    
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      const numAmount = parseFloat(amount);

      batch.update(doc(db, 'rentals', rental.id), {
        paid: status === 'paid',
        updatedAt: now
      });

      if (status === 'paid' && numAmount > 0) {
        const penName = pendrives.find(p => p.id === rental.pendriveId)?.number || 'Desconhecido';
        const transRef = doc(collection(db, 'transactions'));
        batch.set(transRef, {
          type: 'payment',
          amount: numAmount,
          description: `Pagamento de aluguel: Pendrive #${penName}`,
          rentalId: rental.id,
          ownerId: auth.currentUser?.uid,
          createdAt: now,
          updatedAt: now
        });
      }

      await batch.commit();

      const clientName = clients.find(c => c.id === rental.clientId)?.name || 'Cliente';
      const penName = pendrives.find(p => p.id === rental.pendriveId)?.number || 'Desconhecido';
      
      if (status === 'paid') {
        sendTelegramMessage(`💰 *Pagamento Recebido*\nCliente: ${clientName}\nPendrive: #${penName}\nValor: R$ ${numAmount.toFixed(2)}`);
      }
      
      setPayActionData(null);
    } catch(err) {
      console.error(err);
      alert('Erro ao registrar pagamento.');
    }
  };

  const handleReturn = async (rental: any, damaged: boolean = false, payNow: boolean = false, customAmount?: number, fineAmount: number = 0) => {
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      const baseAmount = customAmount !== undefined ? customAmount : rental.price;
      const totalAmountWithFine = baseAmount + fineAmount;

      // Update Rental
      batch.update(doc(db, 'rentals', rental.id), {
        status: damaged ? 'damaged' : 'returned',
        paid: payNow || rental.paid,
        fine: fineAmount,
        updatedAt: now
      });

      // Update Pendrive Status
      batch.update(doc(db, 'pendrives', rental.pendriveId), {
        status: damaged ? 'damaged' : 'available',
        updatedAt: now
      });

      // If paying now on return
      if (payNow && !damaged) {
        batch.set(doc(collection(db, 'transactions')), {
          type: 'payment',
          amount: totalAmountWithFine,
          description: fineAmount > 0 
            ? `Pagamento na devolução c/ multa (Plano ${rental.plan})`
            : `Pagamento na devolução (Plano ${rental.plan})`,
          rentalId: rental.id,
          ownerId: auth.currentUser?.uid,
          createdAt: now,
          updatedAt: now
        });
      }

      await batch.commit();

      const clientName = clients.find(c => c.id === rental.clientId)?.name;
      const penName = pendrives.find(p => p.id === rental.pendriveId)?.number;
      sendTelegramMessage(`📥 *Devolução de Pendrive*\nCliente: ${clientName}\nPendrive: #${penName}\nStatus: ${damaged ? '⚠️ DANIFICADO' : 'OK'}\nPagamento: ${payNow || rental.paid ? 'Confirmado' : 'Manteve Fiado'}`);
      
      setReturnActionData(null);
    } catch(err) {
      console.error(err);
      alert('Erro ao devolver.');
    }
  };

  const sendOverdueReport = () => {
    const now = Date.now();
    const overdueUnpaid = rentals.filter(r => {
      if (r.status !== 'active' || r.paid) return false;
      const hours = (r.plan === '12h' ? 12 : r.plan === '24h' ? 24 : 168);
      const expectedReturn = r.startTime + hours * 60 * 60 * 1000;
      // Overdue more than 1 hour beyond scheduled time
      return now > (expectedReturn + 1 * 60 * 60 * 1000);
    });

    if (overdueUnpaid.length === 0) {
      alert('Nenhum aluguel com atraso superior a 1 hora e pendente de pagamento no momento.');
      return;
    }

    let message = `🔴 *RELATÓRIO DE ATRASOS (+1h e Fiados)*\n\n`;
    overdueUnpaid.forEach(r => {
      const client = clients.find(c => c.id === r.clientId);
      const pen = pendrives.find(p => p.id === r.pendriveId);
      const expectedReturn = r.startTime + (r.plan === '12h' ? 12 : r.plan === '24h' ? 24 : 168) * 60 * 60 * 1000;
      const hoursLate = Math.floor((now - expectedReturn) / (1000 * 60 * 60));
      
      message += `👤 *${client?.name || 'Cliente'}* (Q. ${client?.room})\n`;
      message += `💾 Pendrive: #${pen?.number}\n`;
      message += `⏰ Atraso: ${hoursLate}h\n`;
      message += `💰 Valor: R$ ${r.price.toFixed(2)}\n\n`;
    });
    
    sendTelegramMessage(message);
    alert('Relatório enviado para o Telegram!');
  };

  const handleOpenDetails = async (rental: any) => {
    setSelectedRental(rental);
    setLoadingDetails(true);
    try {
      const q = query(
        collection(db, 'transactions'),
        where('rentalId', '==', rental.id),
        where('ownerId', '==', auth.currentUser?.uid)
      );
      const snap = await getDocs(q);
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRentalTransactions(txs.sort((a: any, b: any) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Locações</h1>
          <p className="dark:text-zinc-400 text-gray-500 text-sm">Gerencie os aluguéis ativos</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={sendOverdueReport}
            className="flex-1 sm:flex-none border dark:border-zinc-800 border-gray-200 dark:bg-zinc-900 bg-white hover:bg-gray-50 dark:hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-red-500 transition-colors"
            title="Enviar relatório de atrasos fiados para o Telegram"
          >
            <MessageCircle className="w-4 h-4" /> Relatório
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Aluguel
          </button>
        </div>
      </div>

      <div className="flex bg-gray-100 dark:bg-zinc-800/50 p-1 rounded-xl w-full sm:w-fit">
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white dark:bg-zinc-900 shadow-sm text-blue-500' : 'text-gray-500'}`}
        >
          Painel Ativo ({rentals.filter(r => r.status === 'active').length})
        </button>
        <button 
          onClick={() => setActiveTab('debt')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'debt' ? 'bg-white dark:bg-zinc-900 shadow-sm text-orange-500' : 'text-gray-500'}`}
        >
          Devedores ({rentals.filter(r => r.paid === false && r.status !== 'active').length})
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar locação por cliente ou pendrive..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rentals.filter(r => activeTab === 'active' ? r.status === 'active' : (r.paid === false && r.status !== 'active'))
          .filter(r => {
            const clName = clients.find(c => c.id === r.clientId)?.name.toLowerCase() || '';
            const penNum = pendrives.find(p => p.id === r.pendriveId)?.number.toLowerCase() || '';
            const query = search.toLowerCase();
            return clName.includes(query) || penNum.includes(query);
          })
          .map(r => {
          const client = clients.find(c => c.id === r.clientId);
          const pendrive = pendrives.find(p => p.id === r.pendriveId);
          const expectedReturn = r.startTime + (r.plan === '12h' ? 12 : r.plan === '24h' ? 24 : 168) * 60 * 60 * 1000;
          const isLate = Date.now() > expectedReturn;
          const hoursLeft = differenceInHours(expectedReturn, Date.now());
          
          return (
            <div 
              key={r.id} 
              onClick={() => handleOpenDetails(r)}
              className={`dark:bg-zinc-900 bg-white border ${isLate ? 'border-red-500/50 shadow-lg shadow-red-500/5' : 'dark:border-zinc-800 border-gray-200'} rounded-xl p-5 relative overflow-hidden flex flex-col transition-all duration-300 cursor-pointer hover:border-blue-500/40`}
            >
              {isLate && (
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
              )}
              <div className="absolute top-0 right-0 pt-3 pr-3 flex flex-col items-end gap-1">
                <span className="font-mono text-[10px] text-gray-400 dark:text-zinc-500 uppercase">#{r.id.slice(-6)}</span>
                {r.paid 
                  ? <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2 py-1 rounded font-medium border border-emerald-500/20">Pago</span>
                  : <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs px-2 py-1 rounded font-medium border border-orange-500/20">Pendente</span>
                }
              </div>
              <div className="flex gap-4">
                <div className={`flex-shrink-0 w-12 h-12 ${isLate ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'} rounded-lg flex flex-col items-center justify-center`}>
                  <Clock className="w-6 h-6" />
                </div>
                <div className="w-full">
                  <h3 className="font-bold dark:text-zinc-100 text-gray-900 flex flex-wrap items-center">
                    {client?.name || 'Cliente deletado'} 
                    <span className="dark:text-zinc-500 text-gray-400 font-normal ml-2 text-sm bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Qrt {client?.room}</span>
                  </h3>
                  <p className="text-sm dark:text-zinc-400 text-gray-500 flex items-center gap-1 mt-1">
                    <Usb className="w-3 h-3" /> Pendrive #{pendrive?.number || 'Deletado'}
                  </p>

                  {r.status === 'active' && (
                    <div className="mt-2">
                       {isLate ? (
                         <div className="flex items-center gap-1.5 text-red-500 font-black text-[10px] uppercase tracking-widest">
                           <Timer className="w-3.5 h-3.5" /> Atrasado faz {Math.abs(hoursLeft)}h
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 text-blue-500 font-black text-[10px] uppercase tracking-widest">
                           <Timer className="w-3.5 h-3.5" /> Restam {hoursLeft}h
                         </div>
                       )}
                    </div>
                  )}

                  <div className="text-sm dark:text-zinc-300 text-gray-700 mt-4 space-y-1.5 bg-gray-50 dark:bg-zinc-950/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                    <p className="flex justify-between">
                      <strong className="dark:text-zinc-500 text-gray-400">Plano:</strong> 
                      <span>{planLabels[r.plan as keyof typeof planLabels]} ({r.price} R$)</span>
                    </p>
                    <p className="flex justify-between">
                      <strong className="dark:text-zinc-500 text-gray-400">Início:</strong> 
                      <span>{format(r.startTime, "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                    </p>
                    <p className="flex justify-between items-center">
                      <strong className={`dark:text-zinc-500 text-gray-400`}>Prev. Devolução:</strong>
                      <span className={`font-medium flex items-center gap-1 ${isLate ? 'text-red-500' : 'text-blue-500'}`}>
                        {format(expectedReturn, "dd/MM 'às' HH:mm", { locale: ptBR })}
                        {isLate && <span className="bg-red-500/10 text-red-500 text-[10px] px-1 rounded-sm border border-red-500/20">ATRASO</span>}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t dark:border-zinc-800 border-gray-200">
                    {!r.paid && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPayActionData({ rental: r, amount: r.price.toString(), status: 'paid' });
                        }} 
                        className="w-full sm:flex-1 justify-center px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-lg transition-colors border border-emerald-500/20 flex items-center gap-1"
                      >
                        <DollarSign className="w-4 h-4"/> Dar Baixa
                      </button>
                    )}
                    {r.status === 'active' && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (r.paid) handleReturn(r);
                            else {
                               const fine = calculateFine(r);
                               const basePrice = r.paid ? 0 : r.price;
                               setReturnActionData({ 
                                 rental: r, 
                                 amount: (basePrice + fine).toString(), 
                                 status: 'paid',
                                 fine: fine 
                               });
                            }
                          }} 
                          className="flex-1 justify-center px-3 py-2 dark:bg-zinc-800 bg-gray-100 dark:hover:bg-zinc-700 hover:bg-gray-200 dark:text-zinc-200 text-gray-800 text-sm font-medium rounded-lg transition-colors border dark:border-zinc-700 border-gray-300 flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-4 h-4"/> Devolver
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation();
                            if(confirm('Marcar pendrive como danificado pelo cliente?')) handleReturn(r, true); 
                          }} 
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-500/20 flex items-center justify-center gap-1"
                        >
                          <Info className="w-4 h-4"/> Dano
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {rentals.filter(r => activeTab === 'active' ? r.status === 'active' : (r.paid === false && r.status !== 'active')).length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed dark:border-zinc-800 border-gray-200 rounded-xl">
            <Clock className="w-8 h-8 dark:text-zinc-600 text-gray-400 mx-auto mb-2" />
            <p className="dark:text-zinc-400 text-gray-500">
              {activeTab === 'active' ? 'Nenhum aluguel ativo no momento.' : 'Nenhuma dívida pendente encontrada.'}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 dark:bg-black/60 bg-gray-900/40 flex flex-col items-center justify-end sm:justify-center p-4 z-50 overflow-y-auto">
          <div className="dark:bg-zinc-900 bg-white w-full max-w-md rounded-2xl border dark:border-zinc-800 border-gray-200 shadow-2xl p-6 mb-safe overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-5 fade-in-20 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-zinc-100">Novo Aluguel</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Selecionar Cliente
                </label>
                <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all">
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} (Q. {c.room})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Usb className="w-3.5 h-3.5" /> Selecionar Pendrive
                </label>
                <select required value={formData.pendriveId} onChange={e => setFormData({...formData, pendriveId: e.target.value})} className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all">
                  <option value="">Selecione...</option>
                  {pendrives.filter(p => p.status === 'available').map(p => <option key={p.id} value={p.id}>#{p.number} - {p.description}</option>)}
                </select>
                {pendrives.filter(p => p.status === 'available').length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1 uppercase font-bold px-1">Nenhum disponível no estoque.</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Plano de Locação</label>
                <div className="grid grid-cols-3 gap-2">
                   {Object.entries(planLabels).map(([id, label]) => (
                     <button
                        key={id}
                        type="button"
                        onClick={() => setFormData({...formData, plan: id})}
                        className={`py-3 px-1 rounded-xl text-[10px] font-black uppercase border transition-all ${
                          formData.plan === id 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                          : 'dark:bg-zinc-950 bg-gray-50 dark:text-zinc-500 text-gray-400 dark:border-zinc-800 border-gray-200'
                        }`}
                     >
                       {id === 'weekly' ? 'Semanal' : id.toUpperCase()}
                     </button>
                   ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Preço Customizado (Opcional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                  <input
                    type="number"
                    value={formData.customPrice}
                    onChange={e => setFormData({ ...formData, customPrice: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold"
                    placeholder="Usar preço padrão"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 dark:bg-zinc-950 bg-gray-50 rounded-xl border dark:border-zinc-800 border-gray-200 group cursor-pointer" onClick={() => setFormData({...formData, paid: !formData.paid})}>
                <input type="checkbox" checked={formData.paid} readOnly className="w-5 h-5 rounded-lg border-2 dark:border-zinc-700 border-gray-300 dark:bg-zinc-900 bg-white text-blue-600 focus:ring-0 focus:ring-offset-0 pointer-events-none"/>
                <div className="flex-1">
                  <p className="text-sm font-bold dark:text-zinc-200 text-gray-700">Pagamento Adiantado</p>
                  <p className="text-[10px] text-gray-400 uppercase">Marque se o cliente já pagou agora</p>
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 dark:bg-zinc-800 bg-gray-100 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl transition-all font-bold text-gray-500 dark:text-zinc-400">Cancelar</button>
                <button type="submit" disabled={!formData.pendriveId || !formData.clientId} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95">Confirmar Locação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payActionData && (
        <div className="fixed inset-0 dark:bg-black/60 bg-gray-900/40 flex flex-col items-center justify-center p-4 z-50 overflow-y-auto px-4 py-8">
          <div className="dark:bg-zinc-900 bg-white w-full max-w-sm rounded-2xl border dark:border-zinc-800 border-gray-200 shadow-2xl p-6 relative animate-in zoom-in-95 fade-in-20 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-zinc-100">Dar Baixa</h2>
              <button onClick={() => setPayActionData(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 ">Valor Recebido</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                    <input 
                      type="number"
                      step="0.01"
                      value={payActionData.amount} 
                      onChange={e => setPayActionData({...payActionData, amount: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl dark:text-zinc-100 text-gray-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-black text-xl"
                    />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Status do Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPayActionData({...payActionData, status: 'paid'})}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${payActionData.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-sm' : 'dark:border-zinc-800 border-gray-200 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                    >
                      <Check className="w-4 h-4"/> Pago
                    </button>
                    <button 
                      onClick={() => setPayActionData({...payActionData, status: 'unpaid'})}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${payActionData.status === 'unpaid' ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-sm' : 'dark:border-zinc-800 border-gray-200 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                    >
                      <Clock className="w-4 h-4"/> Fiado
                    </button>
                  </div>
               </div>
               <div className="pt-4 space-y-2">
                <button 
                  onClick={handlePayRental}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
                >
                  Confirmar Recebimento
                </button>
                <button 
                  onClick={() => setPayActionData(null)}
                  className="w-full py-2 text-gray-400 text-xs font-medium hover:text-gray-500 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {returnActionData && (
        <div className="fixed inset-0 dark:bg-black/60 bg-gray-900/40 flex flex-col items-center justify-end sm:justify-center p-4 z-50">
          <div className="dark:bg-zinc-900 bg-white w-full max-w-sm rounded-2xl border dark:border-zinc-800 border-gray-200 shadow-2xl p-6 mb-safe overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-5 fade-in-20 text-gray-900 dark:text-zinc-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-zinc-100">Confirmar Devolução</h2>
              <button onClick={() => setReturnActionData(null)}><X className="w-5 h-5 text-gray-500 hover:text-red-500 transition-colors"/></button>
            </div>
            
            <div className="space-y-4">
              <div className="p-3 dark:bg-zinc-950 bg-gray-50 rounded-xl border dark:border-zinc-800 border-gray-200">
                <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase font-bold mb-1">Cliente</p>
                <p className="font-bold">{clients.find(c => c.id === returnActionData.rental.clientId)?.name} (Q. {clients.find(c => c.id === returnActionData.rental.clientId)?.room})</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Status de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setReturnActionData({...returnActionData, status: 'paid'})}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${returnActionData.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-sm' : 'dark:border-zinc-800 border-gray-200 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                  >
                    <Check className="w-4 h-4"/> Pago
                  </button>
                  <button 
                    onClick={() => setReturnActionData({...returnActionData, status: 'unpaid'})}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${returnActionData.status === 'unpaid' ? 'bg-orange-500/10 border-orange-500 text-orange-500 shadow-sm' : 'dark:border-zinc-800 border-gray-200 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                  >
                    <Clock className="w-4 h-4"/> Fiado
                  </button>
                </div>
              </div>

              {returnActionData.fine !== undefined && returnActionData.fine > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2">
                  <div>
                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Multa por Atraso</p>
                    <p className="text-[10px] text-red-400">R$ 2,00 por hora de atraso</p>
                  </div>
                  <p className="text-lg font-black text-red-500">+ R$ {returnActionData.fine.toFixed(2)}</p>
                </div>
              )}

              {returnActionData.status === 'paid' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Valor Total a Receber (R$)</label>
                    {returnActionData.fine !== undefined && returnActionData.fine > 0 && (
                       <span className="text-[10px] text-zinc-500 italic">(Preço: {returnActionData.rental.price} + Multa: {returnActionData.fine})</span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">R$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={returnActionData.amount} 
                      onChange={e => setReturnActionData({...returnActionData, amount: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-lg"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-2">
                <button 
                  onClick={() => handleReturn(
                    returnActionData.rental, 
                    false, 
                    returnActionData.status === 'paid', 
                    parseFloat(returnActionData.amount) - (returnActionData.fine || 0),
                    returnActionData.fine || 0
                  )}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
                >
                  Finalizar Devolução
                </button>
                <button 
                  onClick={() => setReturnActionData(null)}
                  className="w-full py-2 text-gray-400 text-xs font-medium hover:text-gray-500 transition-colors"
                >
                  Cancelar Operação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRental && (
        <div className="fixed inset-0 dark:bg-black/60 bg-gray-900/40 flex flex-col items-center justify-end sm:justify-center p-4 z-50 overflow-y-auto">
          <div className="dark:bg-zinc-900 bg-white w-full max-w-lg rounded-2xl border dark:border-zinc-800 border-gray-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in-20 my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b dark:border-zinc-800 border-gray-100 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${Date.now() > (selectedRental.startTime + (selectedRental.plan === '12h' ? 12 : selectedRental.plan === '24h' ? 24 : 168) * 60 * 60 * 1000) ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold dark:text-zinc-100">Detalhes da Locação</h2>
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">ID: #{selectedRental.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRental(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <User className="w-3 h-3" /> Cliente
                  </span>
                  <p className="font-bold dark:text-zinc-100">{clients.find(c => c.id === selectedRental.clientId)?.name || 'Desconhecido'}</p>
                  <p className="text-xs text-gray-400">Quarto: {clients.find(c => c.id === selectedRental.clientId)?.room || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Usb className="w-3 h-3" /> Pendrive
                  </span>
                  <p className="font-bold dark:text-zinc-100">#{pendrives.find(p => p.id === selectedRental.pendriveId)?.number || '??'}</p>
                  <p className="text-xs text-gray-400">{pendrives.find(p => p.id === selectedRental.pendriveId)?.description || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Início
                  </span>
                  <p className="font-bold dark:text-zinc-100">{format(selectedRental.startTime, "dd/MM/yyyy")}</p>
                  <p className="text-xs text-gray-400">Horário: {format(selectedRental.startTime, "HH:mm")}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Prev. Devolução
                  </span>
                  <p className={`font-bold ${Date.now() > (selectedRental.startTime + (selectedRental.plan === '12h' ? 12 : selectedRental.plan === '24h' ? 24 : 168) * 60 * 60 * 1000) ? 'text-red-500' : 'text-blue-500'}`}>
                    {format(selectedRental.startTime + (selectedRental.plan === '12h' ? 12 : selectedRental.plan === '24h' ? 24 : 168) * 60 * 60 * 1000, "dd/MM/yyyy")}
                  </p>
                  <p className="text-xs text-gray-400">Horário: {format(selectedRental.startTime + (selectedRental.plan === '12h' ? 12 : selectedRental.plan === '24h' ? 24 : 168) * 60 * 60 * 1000, "HH:mm")}</p>
                </div>
              </div>

              {/* Plano e Preço */}
              <div className="bg-gray-50 dark:bg-zinc-950/50 p-4 rounded-xl border dark:border-zinc-800 border-gray-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Plano Contratado</span>
                  <p className="font-bold dark:text-zinc-100">{selectedRental.plan.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Valor</span>
                  <p className="text-xl font-black text-blue-500">R$ {selectedRental.price?.toFixed(2)}</p>
                </div>
              </div>

              {/* Pagamento */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Histórico de Pagamento
                  </h3>
                  {selectedRental.paid ? (
                    <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase">Total Pago</span>
                  ) : (
                    <span className="bg-orange-500/10 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/20 uppercase">Pendente (Fiado)</span>
                  )}
                </div>

                <div className="space-y-2">
                  {loadingDetails ? (
                    <div className="py-4 text-center">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs text-gray-400">Buscando transações...</p>
                    </div>
                  ) : rentalTransactions.length > 0 ? (
                    rentalTransactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center p-3 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <div>
                            <p className="text-sm font-medium dark:text-zinc-100">Pagamento Recebido</p>
                            <p className="text-[10px] text-gray-400">{format(tx.createdAt, "dd/MM/yyyy HH:mm")}</p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-600">+ R$ {tx.amount?.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 border border-dashed dark:border-zinc-800 border-gray-200 rounded-xl text-center">
                      <p className="text-xs text-gray-400">Nenhuma transação vinculada encontrada.</p>
                      {!selectedRental.paid && <p className="text-[10px] text-orange-500 mt-1 uppercase font-bold">Aguardando pagamento</p>}
                      {selectedRental.paid && rentalTransactions.length === 0 && (
                        <p className="text-[10px] text-gray-500 mt-1 italic">Pago adiantado ou registro legado</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t dark:border-zinc-800 border-gray-100 flex flex-wrap gap-3">
               <button onClick={() => setSelectedRental(null)} className="flex-1 py-3 dark:bg-zinc-800 bg-gray-100 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl font-bold transition-all">Fechar</button>
               
               {selectedRental.status === 'active' && (
                 <button 
                  onClick={() => {
                    const r = selectedRental;
                    setSelectedRental(null);
                    if (r.paid) handleReturn(r);
                    else {
                      const fine = calculateFine(r);
                      const basePrice = r.paid ? 0 : r.price;
                      setReturnActionData({ 
                        rental: r, 
                        amount: (basePrice + fine).toString(), 
                        status: 'paid',
                        fine: fine 
                      });
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                 >
                   <Check className="w-5 h-5" /> Devolver
                 </button>
               )}

               {!selectedRental.paid && selectedRental.status === 'active' && (
                 <button 
                  onClick={() => {
                    const r = selectedRental;
                    setSelectedRental(null);
                    setPayActionData({ rental: r, amount: r.price.toString(), status: 'paid' });
                  }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                 >
                   <DollarSign className="w-5 h-5" /> Pagar Agora
                 </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
