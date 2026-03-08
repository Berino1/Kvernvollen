import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Plus, 
  Minus, 
  History, 
  User as UserIcon, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck,
  Package,
  Users,
  X,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pocket, Patient, LogEntry, User } from './types';

export default function App() {
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'patients' | 'users'>('inventory');
  const [showModal, setShowModal] = useState<'withdrawal' | 'restock' | 'addPatient' | 'addUser' | 'editPatient' | 'editUser' | 'editPocket' | null>(null);
  const [selectedPocket, setSelectedPocket] = useState<Pocket | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    patientId: '',
    amount: '',
    userName: '',
    userPassword: '',
    witnessName: '',
    witnessPassword: '',
    medicineName: '',
    strength: '',
    // New patient/user fields
    newName: '',
    newRoom: '',
    newLN: '',
    newUsername: '',
    newPassword: '',
    newRole: 'Helsefagarbeider'
  });

  const fetchData = async () => {
    try {
      const [pRes, patRes, lRes, uRes] = await Promise.all([
        fetch('/api/pockets'),
        fetch('/api/patients'),
        fetch('/api/logs'),
        fetch('/api/users')
      ]);
      setPockets(await pRes.json());
      setPatients(await patRes.json());
      setLogs(await lRes.json());
      setUsers(await uRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const openTransactionModal = (pocket: Pocket, type: 'withdrawal' | 'restock') => {
    setSelectedPocket(pocket);
    setFormData(prev => ({
      ...prev,
      medicineName: pocket.medicine_name || '',
      strength: pocket.strength?.toString() || '',
      amount: '',
      userName: '',
      userPassword: '',
      witnessName: '',
      witnessPassword: '',
      patientId: ''
    }));
    setShowModal(type);
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPocket) return;
    setError(null);

    if (formData.userName === formData.witnessName) {
      setError("To forskjellige ansatte må signere");
      return;
    }

    const payload = {
      pocket_id: selectedPocket.id,
      patient_id: formData.patientId ? parseInt(formData.patientId) : null,
      user_name: formData.userName,
      user_password: formData.userPassword,
      witness_name: formData.witnessName,
      witness_password: formData.witnessPassword,
      amount: parseFloat(formData.amount) || 0,
      type: showModal,
      medicine_name: showModal === 'restock' ? formData.medicineName : selectedPocket.medicine_name,
      strength: showModal === 'restock' ? (formData.strength ? parseFloat(formData.strength) : 0) : selectedPocket.strength
    };

    try {
      const res = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        setShowModal(null);
        resetForm();
        fetchData();
      } else {
        setError(data.error || "Noe gikk galt");
      }
    } catch (error) {
      setError("Nettverksfeil");
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const url = showModal === 'editPatient' ? `/api/patients/${editingId}` : '/api/patients';
      const method = showModal === 'editPatient' ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.newName,
          room: formData.newRoom,
          ln: formData.newLN
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(null);
        setEditingId(null);
        resetForm();
        fetchData();
      } else {
        setError(data.error || "Kunne ikke lagre pasient");
      }
    } catch (error) {
      setError("Nettverksfeil");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const url = showModal === 'editUser' ? `/api/users/${editingId}` : '/api/users';
      const method = showModal === 'editUser' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.newUsername,
          password: formData.newPassword,
          role: formData.newRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(null);
        setEditingId(null);
        resetForm();
        fetchData();
      } else {
        setError(data.error || "Kunne ikke lagre bruker");
      }
    } catch (error) {
      setError("Nettverksfeil");
    }
  };

  const handleEditPocket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`/api/pockets/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: formData.medicineName,
          strength: parseFloat(formData.strength) || 0,
          current_stock: parseInt(formData.amount) || 0,
          unit: 'stk'
        })
      });
      if (res.ok) {
        setShowModal(null);
        setEditingId(null);
        resetForm();
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Kunne ikke oppdatere lomme");
      }
    } catch (error) {
      setError("Nettverksfeil");
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      amount: '',
      userName: '',
      userPassword: '',
      witnessName: '',
      witnessPassword: '',
      medicineName: '',
      strength: '',
      newName: '',
      newRoom: '',
      newLN: '',
      newUsername: '',
      newPassword: '',
      newRole: 'Helsefagarbeider'
    });
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-emerald-600 animate-pulse" />
          <p className="text-zinc-500 font-medium">Laster stasjon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <header className="bg-[#00263a] text-white border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 overflow-hidden shadow-xl border-2 border-emerald-500/20">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Vennesla_komm_komm.svg/512px-Vennesla_komm_komm.svg.png" 
                alt="Vennesla Kommune Logo" 
                className="h-full w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-xl tracking-tight text-white">Venneslaheimen</h1>
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Kvernvollen Korttidsavdeling</p>
            </div>
            <div className="sm:hidden">
              <h1 className="font-bold text-sm tracking-tight text-white">Venneslaheimen</h1>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Kvernvollen</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            {!isInstalled && (
              <button 
                onClick={handleInstallClick}
                className="px-2 sm:px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-lg flex items-center gap-1.5"
              >
                <Activity className="w-3 h-3" />
                <span className="hidden sm:inline">Installer app</span>
                <span className="sm:hidden">App</span>
              </button>
            )}
            <div className="hidden md:block text-right">
              <p className="text-xs text-white/40 uppercase font-bold">Status</p>
              <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                System Operativt
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Totalt lommer</p>
            <p className="text-3xl font-bold text-zinc-900">{pockets.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Aktive uttak</p>
            <p className="text-3xl font-bold text-zinc-900">{logs.filter(l => l.type === 'withdrawal').length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Beholdning varsler</p>
            <p className="text-3xl font-bold text-amber-600">{pockets.filter(p => p.current_stock < 5 && p.medicine_name).length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Registrerte Pasienter</p>
            <p className="text-3xl font-bold text-emerald-600">{patients.length}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 bg-zinc-200/50 p-1 rounded-xl w-fit mb-4">
          {[
            { id: 'inventory', label: 'Lageroversikt', icon: Package },
            { id: 'history', label: 'Logg / Historikk', icon: History },
            { id: 'patients', label: 'Pasienter', icon: Users },
            { id: 'users', label: 'Brukere', icon: UserCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#00263a] text-white shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition-all"
          >
            <Activity className="w-4 h-4" />
            Hjelp / App
          </button>
        </div>

        {activeTab === 'inventory' && (
          <p className="text-xs text-zinc-500 mb-6 flex items-center gap-2">
            <Package className="w-3 h-3" />
            Klikk på en lomme for å ta ut medisin eller registrere ny medisin i en ledig lomme.
          </p>
        )}

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {pockets.map((pocket) => (
                <button
                  key={pocket.id}
                  title={pocket.medicine_name ? `Klikk for uttak` : `Klikk for å registrere ny medisin i lomme ${pocket.id}`}
                  onClick={() => {
                    if (pocket.medicine_name) {
                      openTransactionModal(pocket, 'withdrawal');
                    } else {
                      openTransactionModal(pocket, 'restock');
                    }
                  }}
                  className={`relative bg-white rounded-xl border p-4 text-left transition-all hover:shadow-lg hover:-translate-y-1 group ${
                    pocket.medicine_name ? 'border-zinc-200' : 'border-dashed border-zinc-300 opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Lomme {pocket.id}</span>
                    {pocket.current_stock < 5 && pocket.medicine_name && (
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                  <h3 className="font-bold text-zinc-900 text-sm truncate mb-1">
                    {pocket.medicine_name || 'Ledig'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-medium">
                    {pocket.medicine_name ? `${pocket.strength}mg • ${pocket.current_stock} ${pocket.unit}` : 'Ingen medisin'}
                  </p>
                  
                  {pocket.medicine_name && (
                    <div className="absolute inset-0 bg-[#00263a]/90 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openTransactionModal(pocket, 'withdrawal'); }}
                        className="w-full py-1.5 bg-white text-[#00263a] rounded-lg text-[10px] font-bold"
                      >
                        Uttak
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openTransactionModal(pocket, 'restock'); }}
                        className="w-full py-1.5 bg-white/20 text-white rounded-lg text-[10px] font-bold border border-white/20"
                      >
                        Påfyll
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingId(pocket.id);
                          setFormData({
                            ...formData,
                            medicineName: pocket.medicine_name,
                            strength: pocket.strength.toString(),
                            amount: pocket.current_stock.toString()
                          });
                          setShowModal('editPocket');
                        }}
                        className="w-full py-1.5 bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-bold border border-zinc-600"
                      >
                        Korriger
                      </button>
                    </div>
                  )}
                  {!pocket.medicine_name && (
                    <div className="mt-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openTransactionModal(pocket, 'restock'); }}
                        className="w-full py-2 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
                      >
                        Legg til medisin
                      </button>
                    </div>
                  )}
                </button>
              ))}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Tidspunkt</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Lomme</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Medisin</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Styrke</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Mengde</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Pasient</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Signaturer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-zinc-600 font-mono">
                          {new Date(log.timestamp).toLocaleString('no-NO', { 
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-zinc-400">#{log.pocket_id}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.type === 'withdrawal' 
                              ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {log.type === 'withdrawal' ? 'Uttak' : 'Påfyll'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-zinc-900">{log.medicine_name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-zinc-500">{log.strength ? `${log.strength}mg` : '-'}</td>
                        <td className="px-6 py-4 text-sm font-mono text-zinc-600">{log.amount} stk</td>
                        <td className="px-6 py-4 text-sm text-zinc-600">{log.patient_name || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-zinc-700">{log.user_name}</span>
                            <span className="text-[10px] text-zinc-400">Vitne: {log.witness_name}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'patients' && (
            <motion.div
              key="patients"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-zinc-900">Pasientregister</h2>
                <button 
                  onClick={() => setShowModal('addPatient')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Registrer Ny Pasient
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {patients.map((patient) => (
                  <div key={patient.id} className="bg-white rounded-2xl border border-zinc-200 p-6 flex items-center justify-between shadow-sm group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900">{patient.name}</h3>
                        <p className="text-xs text-zinc-500 font-mono">LN: {patient.ln}</p>
                        <p className="text-sm text-zinc-500">Rom {patient.room}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingId(patient.id);
                        setFormData({
                          ...formData,
                          newName: patient.name,
                          newRoom: patient.room,
                          newLN: patient.ln
                        });
                        setShowModal('editPatient');
                      }}
                      className="p-2 text-zinc-400 hover:text-[#00263a] hover:bg-zinc-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-zinc-900">Brukeradministrasjon</h2>
                <button 
                  onClick={() => setShowModal('addUser')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00263a] text-white rounded-xl text-sm font-bold hover:bg-[#001a29] transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Legg Til Ny Bruker
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((user) => (
                  <div key={user.id} className="bg-white rounded-2xl border border-zinc-200 p-6 flex items-center justify-between shadow-sm group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900">{user.username}</h3>
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">{user.role}</p>
                        {user.password && (
                          <p className="text-[10px] text-zinc-400 font-mono mt-1">Passord: {user.password}</p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingId(user.id);
                        setFormData({
                          ...formData,
                          newUsername: user.username,
                          newPassword: user.password,
                          newRole: user.role
                        });
                        setShowModal('editUser');
                      }}
                      className="p-2 text-zinc-400 hover:text-[#00263a] hover:bg-zinc-100 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="overflow-y-auto flex-1">
              {/* Transaction Modals */}
              {(showModal === 'withdrawal' || showModal === 'restock') && selectedPocket && (
                <>
                  <div className={`p-6 text-white ${showModal === 'withdrawal' ? 'bg-[#00263a]' : 'bg-emerald-600'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold">{showModal === 'withdrawal' ? 'Registrer Uttak' : 'Registrer Påfyll'}</h2>
                        <p className="opacity-80 text-sm font-medium">Lomme #{selectedPocket.id} • {selectedPocket.medicine_name || 'Ledig'}</p>
                      </div>
                      <button onClick={() => setShowModal(null)} className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleTransaction} className="p-6 space-y-4">
                    {error && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                      </div>
                    )}

                    {showModal === 'restock' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Medisin Navn</label>
                          <input 
                            type="text" 
                            required
                            placeholder="F.eks. Morphine"
                            autoComplete="off"
                            value={formData.medicineName}
                            onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Styrke (mg) - Valgfritt</label>
                          <input 
                            type="number" 
                            step="any"
                            placeholder="0.0"
                            autoComplete="off"
                            value={formData.strength}
                            onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </>
                    )}

                    {showModal === 'withdrawal' && (
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Pasient</label>
                        <select 
                          required
                          value={formData.patientId}
                          onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] focus:border-transparent outline-none transition-all"
                        >
                          <option value="">Velg pasient...</option>
                          {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (LN: {p.ln})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Antall</label>
                      <input 
                        type="number" 
                        required
                        placeholder="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] focus:border-transparent outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Ansatt 1 (Signatur)</label>
                          <input 
                            type="text"
                            required
                            placeholder="Brukernavn"
                            autoComplete="off"
                            value={formData.userName}
                            onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Passord 1</label>
                          <input 
                            type="password" 
                            required
                            placeholder="Passord"
                            autoComplete="off"
                            value={formData.userPassword}
                            onChange={(e) => setFormData({ ...formData, userPassword: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Ansatt 2 (Vitne)</label>
                          <input 
                            type="text"
                            required
                            placeholder="Brukernavn"
                            autoComplete="off"
                            value={formData.witnessName}
                            onChange={(e) => setFormData({ ...formData, witnessName: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Passord 2</label>
                          <input 
                            type="password" 
                            required
                            placeholder="Passord"
                            autoComplete="off"
                            value={formData.witnessPassword}
                            onChange={(e) => setFormData({ ...formData, witnessPassword: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 pb-2">
                      <button 
                        type="submit"
                        className={`w-full py-4 text-white rounded-2xl text-sm font-bold shadow-xl transition-all active:scale-[0.98] ${
                          showModal === 'withdrawal' ? 'bg-[#00263a] hover:bg-[#001a29]' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {showModal === 'withdrawal' ? 'Bekreft Uttak' : 'Bekreft Påfyll/Registrering'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* Add/Edit Patient Modal */}
              {(showModal === 'addPatient' || showModal === 'editPatient') && (
                <>
                  <div className="p-6 bg-emerald-600 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold">{showModal === 'editPatient' ? 'Rediger Pasient' : 'Registrer Ny Pasient'}</h2>
                        <p className="opacity-80 text-sm font-medium">{showModal === 'editPatient' ? 'Oppdater informasjon' : 'Legg til i registeret'}</p>
                      </div>
                      <button onClick={() => { setShowModal(null); setEditingId(null); }} className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleAddPatient} className="p-6 space-y-4">
                    {error && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Fullt Navn</label>
                      <input 
                        type="text" required
                        value={formData.newName}
                        onChange={(e) => setFormData({ ...formData, newName: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">LN (Løpenummer)</label>
                      <input 
                        type="text" required
                        value={formData.newLN}
                        onChange={(e) => setFormData({ ...formData, newLN: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Romnummer</label>
                      <input 
                        type="text" required
                        value={formData.newRoom}
                        onChange={(e) => setFormData({ ...formData, newRoom: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
                      />
                    </div>
                    <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-sm font-bold shadow-xl">
                      {showModal === 'editPatient' ? 'Oppdater Pasient' : 'Lagre Pasient'}
                    </button>
                  </form>
                </>
              )}

              {/* Add/Edit User Modal */}
              {(showModal === 'addUser' || showModal === 'editUser') && (
                <>
                  <div className="p-6 bg-[#00263a] text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold">{showModal === 'editUser' ? 'Rediger Bruker' : 'Legg Til Ny Bruker'}</h2>
                        <p className="opacity-80 text-sm font-medium">{showModal === 'editUser' ? 'Oppdater tilgang' : 'Opprett tilgang'}</p>
                      </div>
                      <button onClick={() => { setShowModal(null); setEditingId(null); }} className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleAddUser} className="p-6 space-y-4">
                    {error && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Brukernavn</label>
                      <input 
                        type="text" required
                        autoComplete="off"
                        value={formData.newUsername}
                        onChange={(e) => setFormData({ ...formData, newUsername: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Passord</label>
                      <input 
                        type="password" required
                        autoComplete="off"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Rolle</label>
                      <select 
                        value={formData.newRole}
                        onChange={(e) => setFormData({ ...formData, newRole: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00263a] outline-none"
                      >
                        <option value="Helsefagarbeider">Helsefagarbeider</option>
                        <option value="Sykepleier">Sykepleier</option>
                        <option value="Lege">Lege</option>
                        <option value="Avdelingsleder">Avdelingsleder</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-4 bg-[#00263a] text-white rounded-2xl text-sm font-bold shadow-xl">
                      {showModal === 'editUser' ? 'Oppdater Bruker' : 'Lagre Bruker'}
                    </button>
                  </form>
                </>
              )}

              {/* Edit Pocket Modal */}
              {showModal === 'editPocket' && (
                <>
                  <div className="p-6 bg-zinc-800 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold">Korriger Lomme {editingId}</h2>
                        <p className="opacity-80 text-sm font-medium">Manuell korrigering av innhold</p>
                      </div>
                      <button onClick={() => { setShowModal(null); setEditingId(null); }} className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <form onSubmit={handleEditPocket} className="p-6 space-y-4">
                    {error && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Medisinnavn</label>
                      <input 
                        type="text" required
                        value={formData.medicineName}
                        onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-800 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Styrke (mg)</label>
                        <input 
                          type="number" step="any" required
                          value={formData.strength}
                          onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Beholdning (stk)</label>
                        <input 
                          type="number" required
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-800 outline-none"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-zinc-800 text-white rounded-2xl text-sm font-bold shadow-xl">
                      Lagre Korrigering
                    </button>
                  </form>
                </>
              )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Install Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallGuide(false)}
              className="absolute inset-0 bg-zinc-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-[#00263a] p-8 text-white text-center">
                <div className="w-24 h-24 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center p-3 shadow-2xl border-2 border-emerald-500/10">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Vennesla_komm_komm.svg/512px-Vennesla_komm_komm.svg.png" 
                    alt="Logo" 
                    className="w-full h-auto object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h2 className="text-2xl font-bold mb-2">Installer som app</h2>
                <p className="text-white/60 text-sm">Få raskere tilgang og bedre brukeropplevelse</p>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center font-bold text-zinc-900 shrink-0">1</div>
                  <div>
                    <h3 className="font-bold text-zinc-900 mb-1">For iPhone / iPad</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Trykk på <span className="inline-block p-1 bg-zinc-100 rounded">Del-ikonet</span> (firkant med pil opp) nederst i Safari, og velg <span className="font-bold text-zinc-800">"Legg til på hjem-skjerm"</span>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center font-bold text-zinc-900 shrink-0">2</div>
                  <div>
                    <h3 className="font-bold text-zinc-900 mb-1">For Android</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Trykk på de <span className="font-bold text-zinc-800">tre prikkene</span> øverst til høyre i Chrome, og velg <span className="font-bold text-zinc-800">"Installer app"</span> eller "Legg til på startsiden".
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center font-bold text-zinc-900 shrink-0">3</div>
                  <div>
                    <h3 className="font-bold text-zinc-900 mb-1">For PC</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Klikk på <span className="font-bold text-zinc-800">installer-ikonet</span> (skjerm med pil) helt til høyre i adressefeltet i Chrome eller Edge.
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowInstallGuide(false)}
                  className="w-full py-4 bg-[#00263a] text-white rounded-2xl font-bold shadow-lg hover:bg-[#001a29] transition-all"
                >
                  Skjønner!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
