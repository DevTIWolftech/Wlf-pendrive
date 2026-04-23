import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { Trash2, Edit2, Plus, Usb, AlertTriangle, X, Search, Hash } from 'lucide-react';
import { format } from 'date-fns';

export function Pendrives() {
  const [pendrives, setPendrives] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [formData, setFormData] = useState({ number: '', description: '', status: 'available' });
  const [damageFormData, setDamageFormData] = useState({ description: '', fee: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetPendriveId, setTargetPendriveId] = useState<string | null>(null);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(collection(db, 'pendrives'), where('ownerId', '==', userId));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendrives(data.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
  }, []);

  const filteredPendrives = pendrives.filter(p => 
    p.number.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const now = Date.now();
      if (editingId) {
        await updateDoc(doc(db, 'pendrives', editingId), {
          ...formData,
          updatedAt: now
        });
      } else {
        await addDoc(collection(db, 'pendrives'), {
          ...formData,
          createdAt: now,
          updatedAt: now,
          ownerId: auth.currentUser?.uid
        });
      }
      setShowModal(false);
      setFormData({ number: '', description: '', status: 'available' });
      setEditingId(null);
    } catch(err) {
      console.error(err);
      alert('Erro ao salvar pendrive.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza? Isso apagará o pendrive permanentemente.')) {
      await deleteDoc(doc(db, 'pendrives', id));
    }
  };

  const handleRegisterDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPendriveId) return;

    try {
      const now = Date.now();
      const fee = parseFloat(damageFormData.fee) || 0;
      const pendrive = pendrives.find(p => p.id === targetPendriveId);

      const batch = await import('firebase/firestore').then(m => m.writeBatch(db));
      
      // Update pendrive status
      batch.update(doc(db, 'pendrives', targetPendriveId), {
        status: 'damaged',
        updatedAt: now
      });

      // Create damage fee transaction
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, {
        type: 'damage_fee',
        amount: fee,
        description: `Taxa de Dano: Pendrive #${pendrive?.number} - ${damageFormData.description}`,
        ownerId: auth.currentUser?.uid,
        createdAt: now,
        updatedAt: now
      });

      await batch.commit();
      setShowDamageModal(false);
      setDamageFormData({ description: '', fee: '' });
      setTargetPendriveId(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar dano.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'available': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Livre</span>;
      case 'rented': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">Em Uso</span>;
      case 'damaged': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">Dano</span>;
      case 'lost': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase dark:bg-zinc-500/10 bg-gray-500/10 dark:text-zinc-400 text-gray-500 border dark:border-zinc-500/20 border-gray-500/20">Perda</span>;
      default: return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pendrives</h1>
          <p className="dark:text-zinc-400 text-gray-500 text-sm">Controle de estoque e estado físico</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Pendrive
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar pendrive por número ou descrição..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredPendrives.map(p => (
          <div key={p.id} className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg dark:bg-zinc-950 bg-gray-50 flex items-center justify-center border dark:border-zinc-800 border-gray-100 uppercase font-black text-xs">
                  {p.number}
                </div>
                <div>
                  <h3 className="font-bold dark:text-zinc-100 text-gray-900">Pendrive #{p.number}</h3>
                  {getStatusBadge(p.status)}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setFormData({ number: p.number, description: p.description, status: p.status });
                    setEditingId(p.id);
                    setShowModal(true);
                  }}
                  className="p-1.5 dark:text-zinc-400 text-gray-500 hover:text-blue-400 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1.5 dark:text-zinc-400 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="dark:text-zinc-400 text-gray-500 text-sm mt-1 flex-grow line-clamp-2 italic">"{p.description}"</p>
            <div className="pt-2 border-t dark:border-zinc-800 border-gray-100">
              <button
                onClick={() => {
                  setTargetPendriveId(p.id);
                  setShowDamageModal(true);
                }}
                disabled={p.status === 'damaged'}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors border dark:border-zinc-800 border-gray-200 dark:bg-zinc-950 bg-gray-50 dark:hover:bg-red-500/10 hover:bg-red-50 dark:hover:text-red-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Registrar Dano
              </button>
            </div>
          </div>
        ))}
        {pendrives.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed dark:border-zinc-800 border-gray-200 rounded-xl">
            <Usb className="w-8 h-8 dark:text-zinc-600 text-gray-400 mx-auto mb-2" />
            <p className="dark:text-zinc-400 text-gray-500">Nenhum pendrive cadastrado.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 dark:bg-black/60 bg-gray-900/40 flex flex-col items-center justify-end sm:justify-center p-4 z-50 overflow-y-auto">
          <div className="dark:bg-zinc-900 bg-white w-full max-w-md rounded-2xl border dark:border-zinc-800 border-gray-200 shadow-2xl p-6 mb-safe overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-5 fade-in-20 my-auto text-gray-900 dark:text-zinc-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-zinc-100">{editingId ? 'Editar' : 'Novo'} Pendrive</h2>
              <button onClick={() => {setShowModal(false); setEditingId(null);}} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" /> Número de Identificação
                </label>
                <input
                  required value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})}
                  className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm font-bold" placeholder="Ex: 01"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Usb className="w-3.5 h-3.5" /> Conteúdo / Descrição
                </label>
                <input
                  required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm" placeholder="Ex: Filmes de Ação / 32GB"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Status Inicial</label>
                <select
                  value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-xl p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm font-medium"
                >
                  <option value="available">Disponível para Locação</option>
                  <option value="rented">Alugado no Momento</option>
                  <option value="damaged">Danificado / Manutenção</option>
                  <option value="lost">Perdido / Extraviado</option>
                </select>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => {setShowModal(false); setEditingId(null);}} className="flex-1 px-4 py-3 dark:bg-zinc-800 bg-gray-100 dark:hover:bg-zinc-700 hover:bg-gray-200 rounded-xl transition-all font-bold text-gray-500 dark:text-zinc-400">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95">Salvar Pendrive</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDamageModal && (
        <div className="fixed inset-0 dark:bg-black/60 bg-gray-900/40 flex flex-col items-center justify-end sm:justify-center p-4 z-50">
          <div className="dark:bg-zinc-900 bg-white w-full max-w-sm rounded-2xl border dark:border-zinc-800 border-gray-200 shadow-2xl p-6 mb-safe overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-5 fade-in-20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-zinc-100">Registrar Dano</h2>
              <button onClick={() => setShowDamageModal(false)}><X className="w-5 h-5 text-gray-500 hover:text-red-500 transition-colors"/></button>
            </div>
            <form onSubmit={handleRegisterDamage} className="space-y-4">
              <div>
                <label className="block text-sm dark:text-zinc-400 text-gray-500 mb-1 font-medium">Descrição do Dano</label>
                <textarea
                  required
                  value={damageFormData.description}
                  onChange={e => setDamageFormData({...damageFormData, description: e.target.value})}
                  className="w-full dark:bg-zinc-950 bg-gray-50 border dark:border-zinc-800 border-gray-200 rounded-lg p-3 dark:text-zinc-100 text-gray-900 outline-none focus:border-red-500 transition-all font-medium"
                  placeholder="Ex: Conector quebrado / Carcaça trincada"
                  rows={3}
                />
              </div>
              <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                <label className="block text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1.5">Taxa de Conserto (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 font-bold">R$</span>
                  <input
                    type="number"
                    required
                    value={damageFormData.fee}
                    onChange={e => setDamageFormData({...damageFormData, fee: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 dark:bg-zinc-950 bg-white border dark:border-zinc-800 border-gray-200 rounded-lg dark:text-zinc-100 text-gray-900 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <p className="text-[10px] dark:text-zinc-500 text-gray-400 text-center italic leading-relaxed">
                Isso atualizará o status do pendrive para "Danificado" e gerará uma taxa no caixa.
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDamageModal(false)} className="flex-1 px-4 py-2.5 dark:bg-zinc-800 bg-gray-100 dark:hover:bg-zinc-700 hover:bg-gray-200 rounded-lg transition-colors font-medium">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition-all shadow-lg shadow-red-600/20">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
