import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  FileText, 
  Settings as SettingsIcon, 
  Plus, 
  Camera,
  Calendar,
  ChevronRight,
  LogOut,
  Moon,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  PunchRecord, 
  PunchType, 
  WorkdayConfig, 
  UserProfile,
  DailySummary
} from './types';

import {
  loadConfig,
  saveConfig,
  loadUser,
  saveUser,
  loadRecords,
  saveRecords,
  saveReceipt,
  loadReceipt,
  deleteReceipt,
  clearAllData
} from './storage';

import { 
  calculateDailySummary, 
  minutesToHHmm, 
  HHmmToMinutes,
  formatDisplayDate 
} from './utils/time';

// --- Small Components ---

const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const baseClass = variant === 'primary' ? 'ios-button-primary' : 'ios-button-secondary';
  return (
    <motion.button 
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.96 }}
      className={`${baseClass} ${className}`} 
      {...props}
    >
      {children}
    </motion.button>
  );
};

const Card = ({ children, className = '', ...props }: any) => (
  <div className={`ios-card ${className}`} {...props}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'dashboard' | 'records' | 'journey' | 'report' | 'settings'>('dashboard');
  const [user, setUser] = useState<UserProfile>(loadUser());
  const [config, setConfig] = useState<WorkdayConfig>(loadConfig());
  const [records, setRecords] = useState<PunchRecord[]>(loadRecords());
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PunchRecord | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // PWA & Service Worker
  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(() => console.log('Service Worker registrado com sucesso'))
          .catch((error) => console.warn('Service Worker falhou:', error));
      });
    }

    // Capture Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Sync data to storage
  useEffect(() => { saveUser(user); }, [user]);
  useEffect(() => { saveConfig(config); }, [config]);
  useEffect(() => { saveRecords(records); }, [records]);

  const handleDeletePunch = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      const record = records.find(r => r.id === id);
      if (record?.receiptId) deleteReceipt(record.receiptId as string);
      setRecords(records.filter(r => r.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex justify-center selection:bg-white/10">
      {/* App Container - Centered on desktop, full width on mobile */}
      <div className="w-full max-w-md bg-[#050505] min-h-screen flex flex-col relative border-x border-white/[0.05] shadow-2xl">
        
        {/* Main Content Area */}
        <main className="flex-1 pb-28 pt-4 px-5 no-scrollbar overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              {view === 'dashboard' && (
                <Dashboard 
                  user={user} 
                  records={records} 
                  config={config} 
                  onAdd={() => setShowPunchModal(true)} 
                />
              )}
              {view === 'records' && (
                <Records 
                  records={records} 
                  config={config} 
                  onEdit={(r: PunchRecord) => { setEditingRecord(r); setShowPunchModal(true); }}
                  onDelete={handleDeletePunch}
                />
              )}
              {view === 'journey' && <Journey config={config} onSave={setConfig} />}
              {view === 'report' && <Report records={records} config={config} />}
              {view === 'settings' && (
                <Settings 
                  user={user} 
                  setUser={setUser} 
                  records={records} 
                  setRecords={setRecords}
                  isInstallable={isInstallable}
                  onInstall={handleInstallClick}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Bottom Navigation (Mobile Native Style) */}
        <nav className="glass fixed bottom-0 w-full max-w-md h-24 flex items-center justify-around px-2 pb-6 z-50">
          <MobileNavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={24} strokeWidth={2.5} />} label="Hoje" />
          <MobileNavButton active={view === 'records'} onClick={() => setView('records')} icon={<Clock size={24} strokeWidth={2.5} />} label="Registros" />
          <MobileNavButton active={view === 'journey'} onClick={() => setView('journey')} icon={<Calendar size={24} strokeWidth={2.5} />} label="Jornada" />
          <MobileNavButton active={view === 'report'} onClick={() => setView('report')} icon={<FileText size={24} strokeWidth={2.5} />} label="Relatório" />
          <MobileNavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<SettingsIcon size={24} strokeWidth={2.5} />} label="Ajustes" />
        </nav>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPunchModal && (
          <PunchModal 
            onClose={() => { setShowPunchModal(false); setEditingRecord(null); }} 
            onSave={(record: PunchRecord) => {
              if (editingRecord) {
                setRecords(records.map(r => r.id === editingRecord.id ? record : r));
              } else {
                setRecords([record, ...records]);
              }
              setEditingRecord(null);
              setShowPunchModal(false);
            }}
            editingRecord={editingRecord}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- View Components ---

function MobileNavButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 flex-1 relative transition-all active:scale-95 ${
        active ? 'text-white' : 'text-white/20'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute -top-4 w-1 flex justify-center"
        >
          <div className="w-6 h-0.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
        </motion.div>
      )}
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
        {icon}
      </div>
      <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
    </button>
  );
}

function Dashboard({ user, records, config, onAdd }: any) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayRecords = records.filter((r: any) => r.date === today);
  const summary = calculateDailySummary(today, todayRecords, config);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthRecords = records.filter((r: any) => r.date.startsWith(currentMonth));
  const uniqueDays = Array.from(new Set(monthRecords.map((r: any) => r.date)));
  
  let monthTotalWorked = 0;
  let monthBalance = 0;
  uniqueDays.forEach(day => {
    const dayStr = day as string;
    const dayRecs = monthRecords.filter((r: any) => r.date === dayStr);
    const daySum = calculateDailySummary(dayStr, dayRecs, config);
    monthTotalWorked += daySum.totalWorkedMinutes;
    monthBalance += daySum.balanceMinutes;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-start pt-2">
        <div>
          <p className="text-white/50 text-sm font-medium tracking-wide">
            {new Date().getHours() < 5 ? 'Boa noite' : new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'},
          </p>
          <h2 className="text-3xl font-display font-bold tracking-tight mt-0.5">{user.name}</h2>
        </div>
        <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
          <Clock3 size={22} className="text-white/80" />
        </div>
      </header>

      <section className="space-y-6">
        <Card className="p-7 overflow-hidden relative border-white/[0.08]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.04] rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          
          <div className="flex justify-between items-start mb-8 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C0C0C0] bg-white/[0.06] px-3 py-1.5 rounded-lg border border-white/[0.08]">Status de Hoje</span>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Meta: {minutesToHHmm(config.dailyHours)}</span>
          </div>
          
          <div className="flex items-baseline gap-2 relative z-10">
             <h3 className="text-7xl font-display font-medium tracking-tighter text-[#EDEDED]">{minutesToHHmm(summary.totalWorkedMinutes)}</h3>
             <span className="text-white/20 text-sm font-black uppercase tracking-[0.2em]">trabalhadas</span>
          </div>

          <div className="mt-10 flex justify-between items-center bg-black/40 rounded-2xl p-5 border border-white/[0.03] relative z-10 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Saldo Atual</span>
              <span className={`text-xl font-bold tracking-tight ${summary.balanceMinutes >= 0 ? 'text-success' : 'text-danger'}`}>
                {summary.balanceMinutes >= 0 ? '+' : ''}{minutesToHHmm(summary.balanceMinutes)}
              </span>
            </div>
            <div className="h-8 w-px bg-white/[0.05]" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Sessões</span>
              <span className="text-xl font-bold tracking-tight text-white/80">{todayRecords.length} <span className="text-white/20 font-medium">/ 4</span></span>
            </div>
          </div>
        </Card>

        <div className="px-1">
          <Button onClick={onAdd} className="w-full h-22 text-xl rounded-[28px] shadow-2xl">
            <Plus size={26} strokeWidth={2.5} />
            Registrar Ponto
          </Button>
        </div>
      </section>

      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Visão Geral Mensal</h3>
          <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em] bg-white/[0.05] px-2.5 py-1 rounded-md border border-white/[0.05]">
            {format(new Date(), 'MMMM', { locale: ptBR })}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5 border-white/[0.03]">
            <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] mb-2">Total Acumulado</p>
            <p className="text-2xl font-display font-medium tracking-tight text-white/80">{minutesToHHmm(monthTotalWorked)}</p>
          </Card>
          <Card className="p-5 border-white/[0.03] relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${monthBalance >= 0 ? 'bg-success' : 'bg-danger'}`} />
            <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] mb-2">Saldo do Mês</p>
            <p className={`text-2xl font-display font-medium tracking-tight ${monthBalance >= 0 ? 'text-success' : 'text-danger'}`}>
              {monthBalance >= 0 ? '+' : ''}{minutesToHHmm(monthBalance)}
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Records({ records, config, onEdit, onDelete }: any) {
  // Group by date
  const grouped = records.reduce((acc: any, record: any) => {
    if (!acc[record.date]) acc[record.date] = [];
    acc[record.date].push(record);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
          <Clock size={40} />
        </div>
        <div>
          <h3 className="text-xl font-bold">Nenhum registro ainda</h3>
          <p className="text-white/40 mt-1">Seus pontos aparecerão aqui assim que forem registrados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4 pb-12">
      <header>
        <h2 className="text-3xl font-display font-bold tracking-tight">Histórico de Registros</h2>
        <p className="text-white/40">Visualize e gerencie seus pontos batidos.</p>
      </header>

      <div className="space-y-6">
        {dates.map(date => {
          const dayRecords = grouped[date];
          const summary = calculateDailySummary(date, dayRecords, config);
          
          return (
            <div key={date} className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] capitalize">
                  {formatDisplayDate(date)}
                </h3>
                <div className="flex gap-2">
                  <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-white/[0.03] text-white/40 uppercase tracking-widest border border-white/[0.03]">
                    Total: {minutesToHHmm(summary.totalWorkedMinutes)}
                  </span>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border ${
                    summary.balanceMinutes >= 0 ? 'bg-success/5 text-success border-success/10' : 'bg-danger/5 text-danger border-danger/10'
                  }`}>
                    {summary.balanceMinutes >= 0 ? '+' : ''}{minutesToHHmm(summary.balanceMinutes)}
                  </span>
                </div>
              </div>

              <Card className="p-0 overflow-hidden divide-y divide-white/[0.03] border-white/[0.05]">
                {summary.records.map((r: any) => (
                  <div key={r.id} className="p-5 flex items-center gap-5 hover:bg-white/[0.01] transition-colors group">
                    <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)] ${
                      r.type === PunchType.ENTRY ? 'bg-success' :
                      r.type === PunchType.EXIT ? 'bg-danger' :
                      r.type === PunchType.EXTRA ? 'bg-white' : 'bg-white/10'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-display font-medium text-xl text-white/80">{r.time}</p>
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.15em]">
                          {r.type === PunchType.ENTRY ? 'Entrada' :
                           r.type === PunchType.LUNCH_START ? 'Almoço ↓' :
                           r.type === PunchType.LUNCH_END ? 'Almoço ↑' :
                           r.type === PunchType.EXIT ? 'Saída' : 'Extra'}
                        </p>
                      </div>
                      {r.observation && <p className="text-[10px] text-white/30 mt-1 font-medium italic opacity-60">“{r.observation}”</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.receiptId && (
                         <div className="bg-white/5 p-2.5 rounded-xl text-white/40">
                            <Camera size={16} strokeWidth={1.5} />
                         </div>
                      )}
                      <button 
                         onClick={() => onEdit(r)}
                         className="p-2.5 text-white/20 hover:text-white transition-colors"
                      >
                         <ChevronRight size={20} />
                      </button>
                      <button 
                         onClick={() => onDelete(r.id)}
                         className="p-2.5 text-white/[0.05] hover:text-danger transition-colors"
                      >
                         <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Journey({ config, onSave }: any) {
  const [formData, setFormData] = useState({ ...config });

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = () => {
    // Basic validation
    onSave({
       ...formData,
       dailyHours: Number(formData.dailyHours),
       toleranceMinutes: Number(formData.toleranceMinutes)
    });
    alert('Configurações de jornada salvas!');
  };

  return (
    <div className="space-y-8 pt-4">
      <header>
        <h2 className="text-3xl font-display font-bold tracking-tight">Sua Jornada</h2>
        <p className="text-white/40">Configure seus horários padrão para cálculos automáticos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] ml-2 mb-2 block">Entrada Padrão</label>
            <input 
              type="time" 
              name="entryTime"
              value={formData.entryTime}
              onChange={handleChange}
              className="ios-input" 
            />
          </div>
          <div>
            <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] ml-2 mb-2 block">Saída Padrão</label>
            <input 
              type="time" 
              name="exitTime"
              value={formData.exitTime}
              onChange={handleChange}
              className="ios-input" 
            />
          </div>
          <div>
            <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] ml-2 mb-2 block">Início Almoço</label>
            <input 
              type="time" 
              name="lunchStartTime"
              value={formData.lunchStartTime || ''}
              onChange={handleChange}
              className="ios-input" 
            />
          </div>
           <div>
            <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] ml-2 mb-2 block">Fim Almoço</label>
            <input 
              type="time" 
              name="lunchEndTime"
              value={formData.lunchEndTime || ''}
              onChange={handleChange}
              className="ios-input" 
            />
          </div>
        </div>

        <div className="space-y-6 p-7 rounded-[32px] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05]">
          <div>
            <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] mb-2 block">Carga Horária (Minutos)</label>
            <input 
              type="number" 
              name="dailyHours"
              value={formData.dailyHours}
              onChange={handleChange}
              className="ios-input" 
            />
            <p className="text-[9px] text-white/20 mt-2 ml-1 font-bold uppercase tracking-widest">{Math.floor(formData.dailyHours / 60)}h {(formData.dailyHours % 60)}minutos</p>
          </div>
          <div>
            <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] mb-2 block">Tolerância Administrativa</label>
            <input 
              type="number" 
              name="toleranceMinutes"
              value={formData.toleranceMinutes}
              onChange={handleChange}
              className="ios-input" 
            />
          </div>
          
          <div className="pt-6 border-t border-white/[0.05]">
            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Resumo da Configuração</h4>
            <div className="space-y-3">
               <div className="flex justify-between text-xs">
                 <span className="text-white/30 font-medium">Jornada Líquida:</span>
                 <span className="font-display font-medium text-white/80">{minutesToHHmm(formData.dailyHours)}</span>
               </div>
               <div className="flex justify-between text-xs">
                 <span className="text-white/30 font-medium">Tempo de Pausa:</span>
                 <span className="font-display font-medium text-white/80">
                   {formData.lunchStartTime && formData.lunchEndTime 
                     ? minutesToHHmm(HHmmToMinutes(formData.lunchEndTime) - HHmmToMinutes(formData.lunchStartTime))
                     : '--:--'}
                 </span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">Salvar Configurações</Button>
    </div>
  );
}

function Report({ records, config }: any) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Logic to process month's data
  const monthRecords = records.filter((r: any) => r.date.startsWith(selectedMonth));
  const uniqueDays = Array.from(new Set(monthRecords.map((r: any) => r.date))).sort();

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-8 pt-4">
      <header className="no-print">
        <h2 className="text-3xl font-display font-bold tracking-tight">Relatório Mensal</h2>
        <p className="text-white/40">Gere e visualize seu desempenho no período.</p>
      </header>

      <div className="flex items-center gap-4 no-print">
        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="ios-input flex-1"
        />
        <Button type="button" onClick={handlePrint} variant="secondary">
          <Download size={20} />
          Imprimir relatório
        </Button>
      </div>

      <section id="print-area" className="space-y-6 pt-4 bg-white md:bg-transparent rounded-2xl">
        <div className="hidden print:block mb-8 border-b-2 border-black pb-4 text-black">
          <h1 className="text-4xl font-display font-bold text-brand">TEMPUS</h1>
          <p className="text-xs uppercase tracking-widest font-bold">Seu trabalho merece prova</p>
          <div className="mt-4 flex justify-between">
            <div>
              <p className="text-xs font-bold uppercase">Relatório: {format(parse(selectedMonth, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: ptBR })}</p>
              <p className="text-[10px]">Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto selection:bg-white/10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b border-white/[0.05] print:border-black/10">
                <th className="py-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 print:text-black/60">Data</th>
                <th className="py-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 print:text-black/60">Entrada</th>
                <th className="py-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 print:text-black/60">Almoço I.</th>
                <th className="py-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 print:text-black/60">Almoço F.</th>
                <th className="py-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 print:text-black/60">Saída</th>
                <th className="py-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 print:text-black/60 text-right">Total</th>
                <th className="py-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 print:text-black/60 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02] print:divide-black/5 text-white/80">
              {uniqueDays.map((day: any) => {
                const dayRecs = monthRecords.filter((r: any) => r.date === day);
                const sum = calculateDailySummary(day, dayRecs, config);
                const e = dayRecs.find((r: any) => r.type === PunchType.ENTRY)?.time || '--:--';
                const ai = dayRecs.find((r: any) => r.type === PunchType.LUNCH_START)?.time || '--:--';
                const af = dayRecs.find((r: any) => r.type === PunchType.LUNCH_END)?.time || '--:--';
                const s = dayRecs.find((r: any) => r.type === PunchType.EXIT)?.time || '--:--';

                return (
                   <tr key={day} className="text-sm border-white/[0.01] hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-2 font-medium text-white/40 print:text-black">{format(parse(day, 'yyyy-MM-dd', new Date()), 'dd/MM')}</td>
                    <td className="py-4 px-2 font-display font-medium print:text-black">{e}</td>
                    <td className="py-4 px-2 font-display font-medium print:text-black opacity-40">{ai}</td>
                    <td className="py-4 px-2 font-display font-medium print:text-black opacity-40">{af}</td>
                    <td className="py-4 px-2 font-display font-medium print:text-black">{s}</td>
                    <td className="py-4 px-2 font-display font-bold text-right print:text-black">{minutesToHHmm(sum.totalWorkedMinutes)}</td>
                    <td className={`py-4 px-2 font-display font-bold text-right ${sum.balanceMinutes >= 0 ? 'text-success' : 'text-danger'}`}>
                      {sum.balanceMinutes >= 0 ? '+' : ''}{minutesToHHmm(sum.balanceMinutes)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {uniqueDays.length === 0 && (
          <div className="py-12 text-center text-white/20">Nenhum registro encontrado para este período.</div>
        )}
      </section>
    </div>
  );
}

function Settings({ user, setUser, records, setRecords, isInstallable, onInstall }: any) {
  const [name, setName] = useState(user.name);

  const handleBackup = () => {
    const data = { user, records, config: loadConfig() };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tempus-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
  };

  const handleClear = async () => {
    if (confirm('Tem certeza? Isso apagará TODOS os seus pontos e comprovantes permanentemente.')) {
      await clearAllData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 pt-4">
      <header>
        <h2 className="text-3xl font-display font-bold tracking-tight">Ajustes</h2>
        <p className="text-white/40">Gerencie sua conta e seus dados.</p>
      </header>

      <section className="space-y-6">
        <Card className="border-white/[0.05]">
          <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] mb-3 block ml-2">Identificação Profissional</label>
          <div className="flex gap-4">
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="ios-input flex-1"
              placeholder="Nome completo"
            />
            <Button onClick={() => setUser({ ...user, name })} className="px-8 font-black uppercase text-[10px] tracking-widest">Salvar</Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {isInstallable && (
            <Card className="flex flex-col gap-6 bg-gradient-to-b from-white/[0.05] to-transparent border-white/[0.1] col-span-full">
              <div className="flex items-start gap-4">
                 <div className="bg-white/10 p-3 rounded-2xl border border-white/10">
                   <Plus size={20} className="text-white" />
                 </div>
                 <div>
                    <h4 className="font-display font-medium text-lg text-white tracking-tight">Instalar TEMPUS</h4>
                    <p className="text-[10px] text-white/40 mt-1 font-medium uppercase tracking-wider">Adicione o app à sua tela de início para acesso rápido.</p>
                 </div>
              </div>
              <Button onClick={onInstall} className="w-full text-[10px] font-black uppercase tracking-[0.15em]">Instalar Aplicativo</Button>
            </Card>
          )}

          {!isInstallable && (
            <Card className="flex flex-col gap-4 bg-transparent border-white/[0.03] col-span-full opacity-60">
              <p className="text-[10px] text-white/30 text-center font-medium">
                Caso a opção de instalação não apareça, abra o menu do navegador e toque em “Instalar app”.
              </p>
            </Card>
          )}

          <Card className="flex flex-col gap-6 bg-transparent border-white/[0.05]">
            <div className="flex items-start gap-4">
               <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                 <Download size={20} className="text-white/60" />
               </div>
               <div>
                  <h4 className="font-display font-medium text-lg text-white/80 tracking-tight">Cópia de Segurança</h4>
                  <p className="text-[10px] text-white/30 mt-1 font-medium uppercase tracking-wider">Exportar registros em formato JSON.</p>
               </div>
            </div>
            <Button variant="secondary" onClick={handleBackup} className="w-full text-[10px] font-black uppercase tracking-[0.15em] border-white/[0.05]">Gerar Backup</Button>
          </Card>

          <Card className="flex flex-col gap-6 bg-transparent border-danger/[0.1]">
            <div className="flex items-start gap-4">
               <div className="bg-danger/5 p-3 rounded-2xl border border-danger/5 text-danger">
                 <Trash2 size={20} />
               </div>
               <div>
                  <h4 className="font-display font-medium text-lg text-danger tracking-tight">Redefinir Sistema</h4>
                  <p className="text-[10px] text-danger/40 mt-1 font-medium uppercase tracking-wider">Apagar permanentemente todos os dados.</p>
               </div>
            </div>
            <button 
              onClick={handleClear}
              className="w-full py-4 rounded-[22px] bg-danger/10 text-danger text-[10px] font-black uppercase tracking-[0.15em] hover:bg-danger/20 transition-all border border-danger/10"
            >
              Excluir Tudo
            </button>
          </Card>
        </div>
      </section>

      <footer className="pt-16 pb-8 text-center">
        <p className="text-[9px] text-white/20 font-medium uppercase tracking-[0.25em]">
          © 2026 • Desenvolvido por Leonardo Assunção
        </p>
      </footer>
    </div>
  );
}

import { extractDataFromImage } from './services/ocrService';

// --- Punch Modal ---

function PunchModal({ onClose, onSave, editingRecord }: any) {
  const [formData, setFormData] = useState<Partial<PunchRecord>>(
    editingRecord || {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      type: PunchType.ENTRY,
      observation: ''
    }
  );
  const [image, setImage] = useState<Blob | null>(null);
  const [isPreview, setIsPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  useEffect(() => {
    if (editingRecord?.receiptId) {
       loadReceipt(editingRecord.receiptId).then(blob => {
         if (blob) {
            setImage(blob);
            setIsPreview(URL.createObjectURL(blob));
         }
       });
    }
  }, [editingRecord]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    let receiptId = formData.receiptId;
    if (image) {
      receiptId = editingRecord?.receiptId || crypto.randomUUID();
      await saveReceipt(receiptId, image);
    }

    onSave({
      ...formData,
      id: editingRecord?.id || crypto.randomUUID(),
      receiptId,
      createdAt: editingRecord?.createdAt || new Date().toISOString()
    } as PunchRecord);
  };

  const handleImageChange = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setIsPreview(URL.createObjectURL(file));
      
      // Trigger OCR
      setIsAnalyzing(true);
      setAnalysisStatus('Analisando comprovante...');
      
      const extracted = await extractDataFromImage(file);
      
      if (extracted) {
        setFormData(prev => ({
          ...prev,
          time: extracted.time || prev.time,
          date: extracted.date || prev.date
        }));
        setAnalysisStatus('Dados extraídos com sucesso!');
        setTimeout(() => setAnalysisStatus(null), 3000);
      } else {
        setAnalysisStatus('Não foi possível identificar automaticamente.');
        setTimeout(() => setAnalysisStatus(null), 3000);
      }
      setIsAnalyzing(false);
    }
  };

  const handleUseNow = () => {
     setFormData({ 
       ...formData, 
       date: format(new Date(), 'yyyy-MM-dd'), 
       time: format(new Date(), 'HH:mm') 
     });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-end justify-center">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-[#0A0A0A] w-full max-w-lg rounded-t-[44px] p-8 pb-12 space-y-8 shadow-2xl border-t border-white/[0.08]"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-1 bg-white/10 rounded-full mb-2" />
          <div className="flex justify-between items-center w-full">
            <h3 className="text-3xl font-display font-medium tracking-tight">{editingRecord ? 'Editar' : 'Registrar'} Ponto</h3>
            <button onClick={onClose} className="bg-white/[0.05] p-2.5 rounded-full text-white/40 hover:text-white transition-colors">
               <Plus className="rotate-45" size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] ml-2">Data do Ponto</label>
               <input 
                 type="date" 
                 value={formData.date}
                 onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                 className="ios-input" 
                 required
               />
             </div>
             <div className="space-y-2">
               <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] ml-2">Hora do Registro</label>
               <input 
                 type="time" 
                 value={formData.time}
                 onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                 className="ios-input" 
                 required
               />
             </div>
           </div>

           <Button type="button" onClick={handleUseNow} variant="secondary" className="w-full h-15 bg-[#1A1A1A] text-white/40 border border-white/[0.03]">
              <Clock size={18} strokeWidth={2.5} />
              Usar Horário Atual
           </Button>

           <div className="space-y-2">
             <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] ml-2">Tipo de Sessão</label>
             <div className="grid grid-cols-3 gap-2">
                {[PunchType.ENTRY, PunchType.LUNCH_START, PunchType.LUNCH_END, PunchType.EXIT, PunchType.EXTRA].map(type => (
                   <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.1em] border transition-all ${
                        formData.type === type 
                        ? 'bg-white text-black border-white' 
                        : 'bg-[#151515] border-white/[0.03] text-white/30'
                      }`}
                   >
                      {type === PunchType.ENTRY ? 'Entrada' :
                       type === PunchType.LUNCH_START ? 'Almoço ↓' :
                       type === PunchType.LUNCH_END ? 'Almoço ↑' :
                       type === PunchType.EXIT ? 'Saída' : 'Extra'}
                   </button>
                ))}
             </div>
           </div>

           <div className="space-y-2">
             <label className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em] ml-2">Comprovante</label>
             <div className="flex items-center gap-4 bg-white/[0.02] p-5 rounded-[28px] border border-white/[0.03] relative overflow-hidden">
               {isAnalyzing && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-10">
                   <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin mb-3" />
                   <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/80">Processando...</span>
                 </div>
               )}
               
               {isPreview ? (
                 <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl bg-black">
                   <img src={isPreview} className="w-full h-full object-cover opacity-80" />
                   <button 
                     type="button" 
                     onClick={() => { setImage(null); setIsPreview(null); }}
                     className="absolute inset-x-0 bottom-0 bg-danger/90 text-white py-1.5 text-[8px] font-black uppercase tracking-widest backdrop-blur-sm"
                   >
                     Excluir
                   </button>
                 </div>
               ) : (
                 <label className="w-24 h-24 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-white/20 hover:border-white/30 hover:text-white/40 cursor-pointer transition-all bg-white/[0.01]">
                   <Camera size={26} strokeWidth={1} />
                   <span className="text-[8px] mt-2 font-black uppercase tracking-[0.2em]">Câmera</span>
                   <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                 </label>
               )}
               <div className="flex-1 space-y-1">
                 <p className="text-sm font-bold text-white/80">Evidência Digital</p>
                 {analysisStatus ? (
                   <p className={`text-[8px] font-black uppercase tracking-[0.1em] ${analysisStatus.includes('sucesso') ? 'text-success' : 'text-danger'}`}>
                     {analysisStatus}
                   </p>
                 ) : (
                   <p className="text-[9px] text-white/20 leading-relaxed font-medium">
                     "Seu trabalho merece prova."
                     <br />Anexe o comprovante físico ou digital.
                   </p>
                 )}
               </div>
             </div>
           </div>

           <Button type="submit" className="w-full h-20 text-lg mt-4 shadow-2xl shadow-white/5">
              {editingRecord ? 'Salvar Edição' : 'Finalizar Registro'}
           </Button>
        </form>
      </motion.div>
    </div>
  );
}
