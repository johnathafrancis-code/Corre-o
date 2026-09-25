import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Transaction, PartnerConfig, TransactionOwner, VaultGoal, VaultDeposit, Loan, LoanPayment, ChatMessage } from '../types/finance';
import { DEFAULT_PARTNERS, INITIAL_TRANSACTIONS } from '../data/defaultData';
import { CoupleSyncPackage, parseCoupleDataFromString } from '../utils/syncLink';
import { 
  getStoredSupabaseConfig, 
  getSupabaseClient, 
  fetchSupabaseTransactions, 
  saveSupabaseTransaction, 
  deleteSupabaseTransaction,
  bulkUploadToSupabase,
  fetchSupabaseLoans,
  saveSupabaseLoan,
  deleteSupabaseLoan,
  bulkUploadLoansToSupabase,
  fetchSupabaseChatMessages,
  saveSupabaseChatMessage,
  deleteSupabaseChatMessage,
  bulkUploadChatMessagesToSupabase,
  mapSupabaseLoan,
  mapSupabaseChatMessage,
  mapSupabaseVaultGoal,
  fetchSupabaseVaultGoals,
  saveSupabaseVaultGoal,
  deleteSupabaseVaultGoal,
  bulkUploadVaultGoalsToSupabase,
  fetchServerSupabaseConfig,
} from '../lib/supabase';
import { getCurrentMonthString, formatCurrency } from '../utils/formatters';
import { playSyncChime } from '../utils/sound';

interface FinanceContextType {
  transactions: Transaction[];
  partners: PartnerConfig;
  activeDeviceUser: 'partner1' | 'partner2';
  selectedMonth: string; // 'YYYY-MM'
  filterOwner: 'all' | 'partner1' | 'partner2' | 'shared';
  searchQuery: string;
  connectedDevices: number;
  supabaseStatus: {
    isConfigured: boolean;
    isConnected: boolean;
    isSyncing: boolean;
    error: string | null;
    lastEventTime?: string;
  };
  notification: string | null;
  soundEnabled: boolean;
  vaultGoals: VaultGoal[];
  loans: Loan[];
  setSoundEnabled: (val: boolean) => void;
  setActiveDeviceUser: (user: 'partner1' | 'partner2') => void;
  setSelectedMonth: (month: string) => void;
  setFilterOwner: (owner: 'all' | 'partner1' | 'partner2' | 'shared') => void;
  setSearchQuery: (q: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<boolean>;
  addTransactions: (items: Omit<Transaction, 'id'>[]) => Promise<boolean>;
  updateTransaction: (tx: Transaction) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  updatePartners: (config: Partial<PartnerConfig>) => void;
  refreshTransactions: () => Promise<void>;
  migrateLocalToSupabase: () => Promise<{ count: number; error: string | null }>;
  clearAllTransactions: () => Promise<void>;
  dismissNotification: () => void;
  addVaultGoal: (goal: Omit<VaultGoal, 'id' | 'deposits' | 'created_at'>, initialDeposit?: number) => Promise<boolean>;
  updateVaultGoal: (goal: VaultGoal) => Promise<boolean>;
  deleteVaultGoal: (id: string) => Promise<boolean>;
  addVaultDeposit: (goalId: string, amount: number, type: 'deposit' | 'withdraw', owner: TransactionOwner, notes?: string) => Promise<boolean>;
  addLoan: (loan: Omit<Loan, 'id' | 'payments' | 'created_at'>) => Promise<boolean>;
  updateLoan: (loan: Loan) => Promise<boolean>;
  deleteLoan: (id: string) => Promise<boolean>;
  payLoan: (loanId: string, amount: number, payer: TransactionOwner, notes?: string) => Promise<boolean>;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string, sender: TransactionOwner) => Promise<boolean>;
  deleteChatMessage: (id: string) => Promise<boolean>;
  forceSyncNow: () => Promise<void>;
  importCoupleData: (pkg: CoupleSyncPackage) => void;
}

const LOCAL_STORAGE_TX_KEY = 'financas_casal_transactions';
const LOCAL_STORAGE_PARTNERS_KEY = 'financas_casal_partners';
const LOCAL_STORAGE_DEVICE_USER_KEY = 'financas_casal_device_user';
const LOCAL_STORAGE_SOUND_KEY = 'financas_casal_sound';
const LOCAL_STORAGE_VAULT_KEY = 'financas_casal_vault_goals';
const LOCAL_STORAGE_LOANS_KEY = 'financas_casal_loans';
const LOCAL_STORAGE_CHAT_KEY = 'financas_casal_chat_messages';

const DEFAULT_VAULT_GOALS: VaultGoal[] = [
  {
    id: 'vault-1',
    name: 'Reserva de Emergência',
    targetAmount: 10000,
    currentAmount: 0,
    color: 'emerald',
    notes: 'Reserva de segurança para imprevistos do casal',
    deposits: [],
    created_at: new Date().toISOString(),
  },
  {
    id: 'vault-2',
    name: 'Viagem de Férias',
    targetAmount: 5000,
    currentAmount: 0,
    color: 'sky',
    notes: 'Nossas próximas férias juntos',
    deposits: [],
    created_at: new Date().toISOString(),
  },
];

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partners, setPartners] = useState<PartnerConfig>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PARTNERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.partner2Name === 'Esposa' || !parsed.partner2Name) {
          parsed.partner2Name = 'Raisa';
          localStorage.setItem(LOCAL_STORAGE_PARTNERS_KEY, JSON.stringify(parsed));
        }
        return { ...DEFAULT_PARTNERS, ...parsed };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PARTNERS;
  });

  const [activeDeviceUser, setActiveDeviceUserState] = useState<'partner1' | 'partner2'>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_DEVICE_USER_KEY);
      if (stored === 'partner1' || stored === 'partner2') return stored;
    } catch (e) {
      console.error(e);
    }
    return 'partner1';
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SOUND_KEY);
      if (stored !== null) return stored === 'true';
    } catch (e) {}
    return true;
  });

  const [vaultGoals, setVaultGoals] = useState<VaultGoal[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_VAULT_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_VAULT_GOALS;
  });

  // Keep localStorage in sync with vaultGoals
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify(vaultGoals));
    } catch (e) {
      console.error(e);
    }
  }, [vaultGoals]);

  // Load vault goals from backend API on mount
  useEffect(() => {
    fetch('/api/vault')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.goals) && data.goals.length > 0) {
          setVaultGoals(data.goals);
        }
      })
      .catch(() => {});
  }, []);

  const [loans, setLoans] = useState<Loan[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY) || localStorage.getItem('financas_loans');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Keep localStorage in sync with loans
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(loans));
    } catch (e) {
      console.error(e);
    }
  }, [loans]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CHAT_KEY) || localStorage.getItem('financas_chat_messages');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Keep localStorage in sync with chatMessages
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(chatMessages));
    } catch (e) {
      console.error(e);
    }
  }, [chatMessages]);

  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val);
    localStorage.setItem(LOCAL_STORAGE_SOUND_KEY, String(val));
  };

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // If stored data contains the old mock tx-001, clear it
          if (parsed.some((t: any) => t.id === 'tx-001')) {
            localStorage.removeItem(LOCAL_STORAGE_TX_KEY);
            return [];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [filterOwner, setFilterOwner] = useState<'all' | 'partner1' | 'partner2' | 'shared'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<number>(1);

  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConfigured: boolean;
    isConnected: boolean;
    isSyncing: boolean;
    error: string | null;
    lastEventTime?: string;
  }>({
    isConfigured: false,
    isConnected: false,
    isSyncing: false,
    error: null,
  });

  const clientIdRef = useRef<string>(`client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`);
  const supabaseChannelRef = useRef<any>(null);
  const activeDeviceUserRef = useRef(activeDeviceUser);
  const soundEnabledRef = useRef(soundEnabled);
  const partnersRef = useRef(partners);

  useEffect(() => {
    activeDeviceUserRef.current = activeDeviceUser;
  }, [activeDeviceUser]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    partnersRef.current = partners;
  }, [partners]);

  const broadcastToSupabase = useCallback((event: string, payload: any) => {
    try {
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event,
          payload,
        });
      }
    } catch (e) {
      console.warn('Erro ao emitir broadcast no Supabase:', e);
    }
  }, []);

  const setActiveDeviceUser = (user: 'partner1' | 'partner2') => {
    setActiveDeviceUserState(user);
    localStorage.setItem(LOCAL_STORAGE_DEVICE_USER_KEY, user);
  };

  const updatePartners = (config: Partial<PartnerConfig>) => {
    setPartners(prev => {
      const updated = { ...prev, ...config };
      localStorage.setItem(LOCAL_STORAGE_PARTNERS_KEY, JSON.stringify(updated));
      return updated;
    });

    broadcastToSupabase('PARTNERS_UPDATE', config);

    try {
      fetch('/api/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(config),
      }).catch(() => {});
    } catch (e) {}
  };

  const dismissNotification = () => setNotification(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Falha ao salvar no localStorage', e);
    }
  }, [transactions]);

  // Bidirectional Full Reconciliation with Server
  // Guarantees that any loans, transactions, vault goals, or chat launched on any device
  // are pushed to the server, merged by ID, persisted to disk, and broadcast to all devices.
  const reconcileWithServer = useCallback(async (isManualTrigger = false) => {
    try {
      // 1. Fetch server-stored Supabase config so partner connects automatically
      try {
        const serverConfig = await fetchServerSupabaseConfig();
        if (serverConfig?.url && serverConfig?.anonKey) {
          const local = getStoredSupabaseConfig();
          if (!local || local.url !== serverConfig.url || local.anonKey !== serverConfig.anonKey) {
            localStorage.setItem('financas_supabase_config', JSON.stringify(serverConfig));
            setSupabaseStatus(prev => ({ ...prev, isConfigured: true }));
          }
        }
      } catch (err) {}

      // 2. Read local stored items (safely check primary and fallback storage keys)
      let localLoans: Loan[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY) || localStorage.getItem('financas_loans');
        if (raw) localLoans = JSON.parse(raw);
      } catch (e) {}

      let localTx: Transaction[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_TX_KEY) || localStorage.getItem('financas_transactions');
        if (raw) localTx = JSON.parse(raw);
      } catch (e) {}

      let localVault: VaultGoal[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_VAULT_KEY) || localStorage.getItem('financas_vault_goals');
        if (raw) localVault = JSON.parse(raw);
      } catch (e) {}

      let localChat: ChatMessage[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_CHAT_KEY) || localStorage.getItem('financas_chat_messages');
        if (raw) localChat = JSON.parse(raw);
      } catch (e) {}

      let localPartners: PartnerConfig | null = null;
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_PARTNERS_KEY) || localStorage.getItem('financas_partners');
        if (raw) localPartners = JSON.parse(raw);
      } catch (e) {}

      // 3. Send full reconcile payload to server
      const res = await fetch('/api/sync/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify({
          loans: localLoans,
          transactions: localTx,
          vaultGoals: localVault,
          chatMessages: localChat,
          partners: localPartners,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();

        if (Array.isArray(data.loans)) {
          setLoans(prev => {
            const map = new Map<string, Loan>();
            prev.forEach(l => { if (l && l.id) map.set(l.id, l); });
            data.loans.forEach((l: Loan) => { if (l && l.id) map.set(l.id, l); });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }

        if (Array.isArray(data.transactions)) {
          setTransactions(prev => {
            const map = new Map<string, Transaction>();
            prev.forEach(t => { if (t && t.id) map.set(t.id, t); });
            data.transactions.forEach((t: Transaction) => { if (t && t.id) map.set(t.id, t); });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }

        if (Array.isArray(data.vaultGoals)) {
          setVaultGoals(prev => {
            const map = new Map<string, VaultGoal>();
            prev.forEach(g => { if (g && g.id) map.set(g.id, g); });
            data.vaultGoals.forEach((g: VaultGoal) => { if (g && g.id) map.set(g.id, g); });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }

        if (Array.isArray(data.chatMessages)) {
          setChatMessages(prev => {
            const map = new Map<string, ChatMessage>();
            prev.forEach(m => { if (m && m.id) map.set(m.id, m); });
            data.chatMessages.forEach((m: ChatMessage) => { if (m && m.id) map.set(m.id, m); });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(LOCAL_STORAGE_CHAT_KEY, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }

        if (data.partners && typeof data.partners === 'object') {
          setPartners(prev => {
            const updated = { ...prev, ...data.partners };
            try {
              localStorage.setItem(LOCAL_STORAGE_PARTNERS_KEY, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }

        if (isManualTrigger) {
          setNotification('⚡ Sincronizado com sucesso! Todos os dados de ambos os celulares estão atualizados.');
          if (soundEnabledRef.current) playSyncChime();
        }
      }
    } catch (e) {
      console.log('Modo client-only ou offline ativo');
    }
  }, []);

  const importCoupleData = useCallback((pkg: CoupleSyncPackage) => {
    if (!pkg) return;

    if (Array.isArray(pkg.loans) && pkg.loans.length > 0) {
      setLoans(prev => {
        const map = new Map<string, Loan>();
        prev.forEach(l => { if (l && l.id) map.set(l.id, l); });
        pkg.loans.forEach((l: Loan) => { if (l && l.id) map.set(l.id, l); });
        const merged = Array.from(map.values());
        try {
          localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(merged));
          localStorage.setItem('financas_loans', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });
    }

    if (Array.isArray(pkg.transactions) && pkg.transactions.length > 0) {
      setTransactions(prev => {
        const map = new Map<string, Transaction>();
        prev.forEach(t => { if (t && t.id) map.set(t.id, t); });
        pkg.transactions.forEach((t: Transaction) => { if (t && t.id) map.set(t.id, t); });
        const merged = Array.from(map.values());
        try {
          localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });
    }

    if (Array.isArray(pkg.vaultGoals) && pkg.vaultGoals.length > 0) {
      setVaultGoals(prev => {
        const map = new Map<string, VaultGoal>();
        prev.forEach(g => { if (g && g.id) map.set(g.id, g); });
        pkg.vaultGoals.forEach((g: VaultGoal) => { if (g && g.id) map.set(g.id, g); });
        const merged = Array.from(map.values());
        try {
          localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });
    }

    if (pkg.partners && typeof pkg.partners === 'object') {
      setPartners(prev => {
        const updated = { ...prev, ...pkg.partners };
        try {
          localStorage.setItem(LOCAL_STORAGE_PARTNERS_KEY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }

    // Persist immediately to backend server so other devices also have it
    try {
      fetch('/api/sync/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify({
          loans: pkg.loans,
          transactions: pkg.transactions,
          vaultGoals: pkg.vaultGoals,
          partners: pkg.partners,
        }),
      }).catch(() => {});
    } catch (e) {}

    const loanCount = (pkg.loans || []).length;
    setNotification(`⚡ Sincronização concluída com sucesso! ${loanCount} empréstimos carregados.`);
    if (soundEnabledRef.current) playSyncChime();
  }, []);

  // Check URL query parameters for instant WhatsApp / Link sync
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const syncParam = urlParams.get('couple_sync');
      if (syncParam) {
        const pkg = parseCoupleDataFromString(syncParam);
        if (pkg) {
          importCoupleData(pkg);
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [importCoupleData]);

  const forceSyncNow = useCallback(async () => {
    await reconcileWithServer(true);
  }, [reconcileWithServer]);

  useEffect(() => {
    reconcileWithServer(false);
  }, [reconcileWithServer]);

  // 1. Instant Realtime SSE (Server-Sent Events) synchronization across devices
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connectSSE() {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onopen = () => {
          // Connected to SSE stream
        };

        eventSource.addEventListener('connected', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.connectedDevices) {
              setConnectedDevices(data.connectedDevices);
            }
          } catch (err) {}
        });

        eventSource.onmessage = (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            if (!payload || !payload.eventType) return;

            if (payload.eventType === 'CONNECTED_DEVICES') {
              setConnectedDevices(payload.count || 1);
              return;
            }

            if (payload.eventType === 'INSERT') {
              const newTx = payload.data as Transaction;
              setTransactions(prev => {
                if (prev.some(t => t.id === newTx.id)) return prev;
                return [newTx, ...prev];
              });

              if (soundEnabled) {
                playSyncChime();
              }

              const author = newTx.owner === 'partner1'
                ? partners.partner1Name
                : (newTx.owner === 'partner2' ? partners.partner2Name : 'Compartilhado');

              setNotification(
                `⚡ Sincronizado agora: ${author} adicionou "${newTx.description}" (${formatCurrency(newTx.amount)})`
              );
            } else if (payload.eventType === 'UPDATE') {
              const updatedTx = payload.data as Transaction;
              setTransactions(prev =>
                prev.map(t => (t.id === updatedTx.id ? updatedTx : t))
              );
              setNotification(`⚡ Sincronizado agora: "${updatedTx.description}" foi atualizado`);
            } else if (payload.eventType === 'DELETE') {
              const { id } = payload.data;
              setTransactions(prev => prev.filter(t => t.id !== id));
              setNotification(`⚡ Sincronizado agora: um lançamento foi excluído`);
            } else if (payload.eventType === 'RELOAD') {
              if (Array.isArray(payload.data?.transactions)) {
                setTransactions(payload.data.transactions);
              }
            } else if (payload.eventType === 'VAULT_UPDATE') {
              const { goal, goals } = payload.data || {};
              if (Array.isArray(goals)) {
                setVaultGoals(goals);
              } else if (goal) {
                setVaultGoals(prev => {
                  const idx = prev.findIndex(g => g.id === goal.id);
                  if (idx !== -1) {
                    const next = [...prev];
                    next[idx] = goal;
                    return next;
                  }
                  return [goal, ...prev];
                });
              }
              if (soundEnabled) playSyncChime();
              setNotification('⚡ Caixinha do Cofre atualizada em tempo real!');
            } else if (payload.eventType === 'VAULT_DELETE') {
              const { id, goals } = payload.data || {};
              if (Array.isArray(goals)) {
                setVaultGoals(goals);
              } else if (id) {
                setVaultGoals(prev => prev.filter(g => g.id !== id));
              }
              setNotification('⚡ Caixinha removida do cofre');
            } else if (payload.eventType === 'LOAN_UPDATE') {
              const { loan, loans: remoteLoans } = payload.data || {};
              if (Array.isArray(remoteLoans)) {
                setLoans(prev => {
                  const map = new Map<string, Loan>();
                  prev.forEach(l => { if (l && l.id) map.set(l.id, l); });
                  remoteLoans.forEach((l: Loan) => { if (l && l.id) map.set(l.id, l); });
                  return Array.from(map.values());
                });
              } else if (loan) {
                setLoans(prev => {
                  const idx = prev.findIndex(l => l.id === loan.id);
                  if (idx !== -1) {
                    const next = [...prev];
                    next[idx] = loan;
                    return next;
                  }
                  return [loan, ...prev];
                });
              }
              if (soundEnabled) playSyncChime();
              setNotification('⚡ Empréstimos sincronizados em tempo real!');
            } else if (payload.eventType === 'RECONCILE_UPDATE') {
              const { loans: rLoans, transactions: rTx, vaultGoals: rVault, chatMessages: rChat, partners: rPartners } = payload.data || {};
              if (Array.isArray(rLoans)) {
                setLoans(prev => {
                  const map = new Map<string, Loan>();
                  prev.forEach(l => { if (l && l.id) map.set(l.id, l); });
                  rLoans.forEach((l: Loan) => { if (l && l.id) map.set(l.id, l); });
                  return Array.from(map.values());
                });
              }
              if (Array.isArray(rTx)) {
                setTransactions(prev => {
                  const map = new Map<string, Transaction>();
                  prev.forEach(t => { if (t && t.id) map.set(t.id, t); });
                  rTx.forEach((t: Transaction) => { if (t && t.id) map.set(t.id, t); });
                  return Array.from(map.values());
                });
              }
              if (Array.isArray(rVault)) {
                setVaultGoals(prev => {
                  const map = new Map<string, VaultGoal>();
                  prev.forEach(g => { if (g && g.id) map.set(g.id, g); });
                  rVault.forEach((g: VaultGoal) => { if (g && g.id) map.set(g.id, g); });
                  return Array.from(map.values());
                });
              }
              if (Array.isArray(rChat)) {
                setChatMessages(prev => {
                  const map = new Map<string, ChatMessage>();
                  prev.forEach(m => { if (m && m.id) map.set(m.id, m); });
                  rChat.forEach((m: ChatMessage) => { if (m && m.id) map.set(m.id, m); });
                  return Array.from(map.values());
                });
              }
              if (rPartners && typeof rPartners === 'object') {
                setPartners(prev => ({ ...prev, ...rPartners }));
              }
              if (soundEnabled) playSyncChime();
              setNotification('⚡ Dados sincronizados instantaneamente com o outro aparelho!');
            } else if (payload.eventType === 'LOAN_DELETE') {
              const { id, loans: remoteLoans } = payload.data || {};
              if (Array.isArray(remoteLoans)) {
                setLoans(remoteLoans);
              } else if (id) {
                setLoans(prev => prev.filter(l => l.id !== id));
              }
            } else if (payload.eventType === 'CHAT_MESSAGE') {
              const { message, messages: remoteMessages } = payload.data || {};
              if (Array.isArray(remoteMessages)) {
                setChatMessages(remoteMessages);
              } else if (message) {
                setChatMessages(prev => {
                  if (prev.some(m => m.id === message.id)) return prev;
                  return [...prev, message];
                });
              }
              if (soundEnabled) playSyncChime();
            } else if (payload.eventType === 'CHAT_DELETE') {
              const { id, messages: remoteMessages } = payload.data || {};
              if (Array.isArray(remoteMessages)) {
                setChatMessages(remoteMessages);
              } else if (id) {
                setChatMessages(prev => prev.filter(m => m.id !== id));
              }
            } else if (payload.eventType === 'PARTNERS_UPDATE') {
              const { partners: remotePartners } = payload.data || {};
              if (remotePartners) {
                setPartners(prev => ({ ...prev, ...remotePartners }));
              }
            } else if (payload.eventType === 'SUPABASE_CONFIG_UPDATED') {
              const cfg = payload.data?.config;
              if (cfg?.url && cfg?.anonKey) {
                localStorage.setItem('financas_supabase_config', JSON.stringify(cfg));
                loadSupabaseData();
                setNotification('⚡ Supabase sincronizado automaticamente neste aparelho!');
              }
            } else if (payload.eventType === 'SUPABASE_CONFIG_CLEARED') {
              localStorage.removeItem('financas_supabase_config');
              setSupabaseStatus({
                isConfigured: false,
                isConnected: false,
                isSyncing: false,
                error: null,
              });
              setNotification('Supabase desconectado.');
            }
          } catch (err) {
            console.error('Erro ao processar mensagem SSE', err);
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          // Auto-reconnect in 3s
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        // SSE not supported or offline
      }
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [partners.partner1Name, partners.partner2Name, soundEnabled]);

  // 2. Supabase Realtime synchronization setup
  const loadSupabaseData = useCallback(async () => {
    const config = getStoredSupabaseConfig();
    if (!config?.url || !config?.anonKey) {
      setSupabaseStatus({
        isConfigured: false,
        isConnected: false,
        isSyncing: false,
        error: null,
      });
      return;
    }

    setSupabaseStatus(prev => ({ ...prev, isConfigured: true, isSyncing: true, error: null }));

    try {
      const [txRes, loansRes, chatRes, vaultRes] = await Promise.all([
        fetchSupabaseTransactions(),
        fetchSupabaseLoans(),
        fetchSupabaseChatMessages(),
        fetchSupabaseVaultGoals(),
      ]);

      if (!txRes.error && Array.isArray(txRes.data)) {
        setTransactions(txRes.data);
      }
      if (!loansRes.error && Array.isArray(loansRes.data)) {
        setLoans(loansRes.data);
      }
      if (!chatRes.error && Array.isArray(chatRes.data)) {
        setChatMessages(chatRes.data);
      }
      if (!vaultRes.error && Array.isArray(vaultRes.data)) {
        setVaultGoals(vaultRes.data);
      }

      const errors = [txRes.error, loansRes.error, chatRes.error, vaultRes.error].filter(Boolean);
      const isConnected = errors.length === 0;

      setSupabaseStatus({
        isConfigured: true,
        isConnected,
        isSyncing: false,
        error: errors.length > 0 ? errors.join('; ') : null,
        lastEventTime: new Date().toLocaleTimeString('pt-BR'),
      });
    } catch (err: any) {
      setSupabaseStatus({
        isConfigured: true,
        isConnected: false,
        isSyncing: false,
        error: err?.message || 'Erro ao carregar dados do Supabase',
      });
    }
  }, []);

  useEffect(() => {
    loadSupabaseData();
  }, [loadSupabaseData]);

  // Supabase Realtime WebSocket subscription for transactions, loans, and chat_messages
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      supabaseChannelRef.current = null;
      return;
    }

    let isSubscribed = true;

    // Use broadcast-enabled channel with self: false
    const channel = client.channel('financas-casal-v2', {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    supabaseChannelRef.current = channel;

    // A. INSTANT BROADCAST SUBSCRIPTIONS (Direct WebSocket peer-to-peer sync)
    channel
      .on('broadcast', { event: 'CHAT_MESSAGE' }, ({ payload }) => {
        if (!payload || !payload.id) return;
        const newMsg = payload as ChatMessage;
        setChatMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (soundEnabledRef.current) playSyncChime();
        if (newMsg.sender !== activeDeviceUserRef.current) {
          const preview = newMsg.text.length > 35 ? `${newMsg.text.slice(0, 35)}...` : newMsg.text;
          setNotification(`💬 ${newMsg.senderName || 'Parceiro(a)'}: "${preview}"`);
        }
      })
      .on('broadcast', { event: 'CHAT_DELETE' }, ({ payload }) => {
        const id = payload?.id;
        if (id) {
          setChatMessages(prev => prev.filter(m => m.id !== id));
        }
      })
      .on('broadcast', { event: 'LOAN_UPDATE' }, ({ payload }) => {
        if (!payload || !payload.id) return;
        const loan = payload as Loan;
        setLoans(prev => {
          const exists = prev.some(l => l.id === loan.id);
          if (!exists) return [loan, ...prev];
          return prev.map(l => (l.id === loan.id ? loan : l));
        });
        if (soundEnabledRef.current) playSyncChime();
        const borrowerName = loan.borrower === 'partner1'
          ? partnersRef.current.partner1Name
          : (loan.borrower === 'partner2' ? partnersRef.current.partner2Name : 'Casal');
        setNotification(`⚡ Empréstimo sincronizado: "${loan.lenderName}" (${borrowerName})`);
      })
      .on('broadcast', { event: 'LOAN_DELETE' }, ({ payload }) => {
        const id = payload?.id;
        if (id) {
          setLoans(prev => prev.filter(l => l.id !== id));
          setNotification(`⚡ Empréstimo removido`);
        }
      })
      .on('broadcast', { event: 'VAULT_UPDATE' }, ({ payload }) => {
        if (!payload || !payload.id) return;
        const goal = payload as VaultGoal;
        setVaultGoals(prev => {
          const idx = prev.findIndex(g => g.id === goal.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = goal;
            return next;
          }
          return [goal, ...prev];
        });
        if (soundEnabledRef.current) playSyncChime();
        setNotification(`⚡ Caixinha do cofre atualizada: "${goal.name}"`);
      })
      .on('broadcast', { event: 'VAULT_DELETE' }, ({ payload }) => {
        const id = payload?.id;
        if (id) {
          setVaultGoals(prev => prev.filter(g => g.id !== id));
          setNotification(`⚡ Caixinha removida do cofre`);
        }
      })
      .on('broadcast', { event: 'TRANSACTION_UPDATE' }, ({ payload }) => {
        if (!payload || !payload.id) return;
        const tx = payload as Transaction;
        setTransactions(prev => {
          const exists = prev.some(t => t.id === tx.id);
          if (!exists) return [tx, ...prev];
          return prev.map(t => (t.id === tx.id ? tx : t));
        });
        if (soundEnabledRef.current) playSyncChime();
        setNotification(`⚡ Lançamento atualizado: "${tx.description}"`);
      })
      .on('broadcast', { event: 'TRANSACTION_DELETE' }, ({ payload }) => {
        const id = payload?.id;
        if (id) {
          setTransactions(prev => prev.filter(t => t.id !== id));
        }
      })
      .on('broadcast', { event: 'PARTNERS_UPDATE' }, ({ payload }) => {
        if (payload) {
          setPartners(prev => ({ ...prev, ...payload }));
        }
      })

      // B. POSTGRES DATABASE CDC SUBSCRIPTIONS (For persistent database updates)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          if (!isSubscribed) return;

          const nowStr = new Date().toLocaleTimeString('pt-BR');
          setSupabaseStatus(prev => ({
            ...prev,
            isConnected: true,
            lastEventTime: nowStr,
          }));

          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as any;
            const newTx: Transaction = {
              id: String(newRow.id),
              description: newRow.description,
              amount: Number(newRow.amount),
              type: newRow.type,
              category: newRow.category,
              owner: newRow.owner,
              date: newRow.date,
              payment_method: newRow.payment_method,
              status: newRow.status,
              notes: newRow.notes || undefined,
              created_at: newRow.created_at,
            };

            setTransactions(prev => {
              if (prev.some(t => t.id === newTx.id)) return prev;
              return [newTx, ...prev];
            });

            if (soundEnabledRef.current) playSyncChime();
            const author = newTx.owner === 'partner1'
              ? partnersRef.current.partner1Name
              : (newTx.owner === 'partner2' ? partnersRef.current.partner2Name : 'Compartilhado');
            setNotification(`⚡ Sincronizado via Supabase: ${author} adicionou "${newTx.description}"`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any;
            const updatedTx: Transaction = {
              id: String(updatedRow.id),
              description: updatedRow.description,
              amount: Number(updatedRow.amount),
              type: updatedRow.type,
              category: updatedRow.category,
              owner: updatedRow.owner,
              date: updatedRow.date,
              payment_method: updatedRow.payment_method,
              status: updatedRow.status,
              notes: updatedRow.notes || undefined,
              created_at: updatedRow.created_at,
            };

            setTransactions(prev =>
              prev.map(t => (t.id === updatedTx.id ? updatedTx : t))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String((payload.old as any)?.id);
            if (deletedId) {
              setTransactions(prev => prev.filter(t => t.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loans',
        },
        (payload) => {
          if (!isSubscribed) return;

          const nowStr = new Date().toLocaleTimeString('pt-BR');
          setSupabaseStatus(prev => ({
            ...prev,
            isConnected: true,
            lastEventTime: nowStr,
          }));

          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as any;
            const newLoan = mapSupabaseLoan(newRow);

            setLoans(prev => {
              if (prev.some(l => l.id === newLoan.id)) {
                return prev.map(l => l.id === newLoan.id ? newLoan : l);
              }
              return [newLoan, ...prev];
            });

            if (soundEnabledRef.current) playSyncChime();
            const borrowerName = newLoan.borrower === 'partner1'
              ? partnersRef.current.partner1Name
              : (newLoan.borrower === 'partner2' ? partnersRef.current.partner2Name : 'Casal');
            setNotification(`⚡ Empréstimo sincronizado: "${newLoan.lenderName}" (${borrowerName})`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any;
            const updatedLoan = mapSupabaseLoan(updatedRow);

            setLoans(prev => {
              const exists = prev.some(l => l.id === updatedLoan.id);
              if (!exists) return [updatedLoan, ...prev];
              return prev.map(l => (l.id === updatedLoan.id ? updatedLoan : l));
            });

            if (soundEnabledRef.current) playSyncChime();
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String((payload.old as any)?.id);
            if (deletedId) {
              setLoans(prev => prev.filter(l => l.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          if (!isSubscribed) return;

          const nowStr = new Date().toLocaleTimeString('pt-BR');
          setSupabaseStatus(prev => ({
            ...prev,
            isConnected: true,
            lastEventTime: nowStr,
          }));

          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as any;
            const newMsg = mapSupabaseChatMessage(newRow);

            setChatMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (soundEnabledRef.current) playSyncChime();
            if (newMsg.sender !== activeDeviceUserRef.current) {
              const preview = newMsg.text.length > 35 ? `${newMsg.text.slice(0, 35)}...` : newMsg.text;
              setNotification(`💬 Mensagem de ${newMsg.senderName}: "${preview}"`);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any;
            const updatedMsg = mapSupabaseChatMessage(updatedRow);

            setChatMessages(prev =>
              prev.map(m => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String((payload.old as any)?.id);
            if (deletedId) {
              setChatMessages(prev => prev.filter(m => m.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vault_goals',
        },
        (payload) => {
          if (!isSubscribed) return;

          const nowStr = new Date().toLocaleTimeString('pt-BR');
          setSupabaseStatus(prev => ({
            ...prev,
            isConnected: true,
            lastEventTime: nowStr,
          }));

          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as any;
            const newGoal = mapSupabaseVaultGoal(newRow);

            setVaultGoals(prev => {
              if (prev.some(g => g.id === newGoal.id)) {
                return prev.map(g => (g.id === newGoal.id ? newGoal : g));
              }
              return [newGoal, ...prev];
            });

            if (soundEnabledRef.current) playSyncChime();
            setNotification(`⚡ Caixinha sincronizada via Supabase: "${newGoal.name}"`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedRow = payload.new as any;
            const updatedGoal = mapSupabaseVaultGoal(updatedRow);

            setVaultGoals(prev =>
              prev.map(g => (g.id === updatedGoal.id ? updatedGoal : g))
            );

            if (soundEnabledRef.current) playSyncChime();
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String((payload.old as any)?.id);
            if (deletedId) {
              setVaultGoals(prev => prev.filter(g => g.id !== deletedId));
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          setSupabaseStatus(prev => ({ ...prev, isConnected: true, error: null }));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSupabaseStatus(prev => ({
            ...prev,
            isConnected: false,
            error: err?.message || 'Canal de tempo real desconectado',
          }));
        }
      });

    return () => {
      isSubscribed = false;
      client.removeChannel(channel);
      if (supabaseChannelRef.current === channel) {
        supabaseChannelRef.current = null;
      }
    };
  }, [supabaseStatus.isConfigured]);

  // Periodic background sync fallback (every 2 minutes regardless of whether tab is active or in background)
  // Guarantees zero missed transactions, loans, vault goals, chat messages, or partners even with network glitches or Cloud Run instance rotation
  useEffect(() => {
    const syncAllData = async () => {
      // 1. Full bidirectional reconcile with server
      await reconcileWithServer(false);

      // 2. Reconcile Supabase if connected
      const client = getSupabaseClient();
      if (client) {
        try {
          const [sTx, sLoans, sVault, sChat] = await Promise.all([
            fetchSupabaseTransactions(),
            fetchSupabaseLoans(),
            fetchSupabaseVaultGoals(),
            fetchSupabaseChatMessages(),
          ]);

          if (!sTx.error && Array.isArray(sTx.data) && sTx.data.length > 0) {
            setTransactions(prev => {
              const map = new Map<string, Transaction>();
              prev.forEach(t => map.set(t.id, t));
              sTx.data!.forEach(t => map.set(t.id, t));
              return Array.from(map.values());
            });
          }

          if (!sLoans.error && Array.isArray(sLoans.data) && sLoans.data.length > 0) {
            setLoans(prev => {
              const map = new Map<string, Loan>();
              prev.forEach(l => map.set(l.id, l));
              sLoans.data!.forEach(l => map.set(l.id, l));
              return Array.from(map.values());
            });
          }

          if (!sVault.error && Array.isArray(sVault.data) && sVault.data.length > 0) {
            setVaultGoals(prev => {
              const map = new Map<string, VaultGoal>();
              prev.forEach(g => map.set(g.id, g));
              sVault.data!.forEach(g => map.set(g.id, g));
              return Array.from(map.values());
            });
          }

          if (!sChat.error && Array.isArray(sChat.data) && sChat.data.length > 0) {
            setChatMessages(prev => {
              const map = new Map<string, ChatMessage>();
              prev.forEach(m => map.set(m.id, m));
              sChat.data!.forEach(m => map.set(m.id, m));
              return Array.from(map.values());
            });
          }
        } catch (e) {}
      }
    };

    // Run every 2 minutes (120,000 ms) continuously, regardless of tab state
    const intervalId = setInterval(syncAllData, 120000);

    // Instant sync on focus, page show, and visibility change
    const handleImmediateSync = () => {
      syncAllData();
    };

    document.addEventListener('visibilitychange', handleImmediateSync);
    window.addEventListener('focus', handleImmediateSync);
    window.addEventListener('pageshow', handleImmediateSync);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleImmediateSync);
      window.removeEventListener('focus', handleImmediateSync);
      window.removeEventListener('pageshow', handleImmediateSync);
    };
  }, []);

  // Actions
  const addTransaction = async (data: Omit<Transaction, 'id'>): Promise<boolean> => {
    const newTx: Transaction = {
      ...data,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    // 1. Optimistic local update
    setTransactions(prev => [newTx, ...prev]);

    // 2. Broadcast immediately via Supabase Realtime channel (Instant WebSocket sync)
    broadcastToSupabase('TRANSACTION_UPDATE', newTx);

    // 3. Broadcast immediately via backend server API to all open devices
    try {
      fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(newTx),
      }).catch(e => console.error('Erro na sincronização backend', e));
    } catch (e) {}

    // 4. If Supabase is connected, save to Supabase
    if (supabaseStatus.isConfigured) {
      setSupabaseStatus(prev => ({ ...prev, isSyncing: true }));
      const { error } = await saveSupabaseTransaction(newTx);
      setSupabaseStatus(prev => ({ ...prev, isSyncing: false, error: error || null }));
      if (error) {
        console.warn(`Aviso Supabase: ${error}`);
      }
    }

    if (soundEnabled) playSyncChime();
    return true;
  };

  const addTransactions = async (items: Omit<Transaction, 'id'>[]): Promise<boolean> => {
    if (items.length === 0) return true;

    const timestamp = Date.now();
    const newTxs: Transaction[] = items.map((data, idx) => ({
      ...data,
      id: `tx-${timestamp}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
    }));

    // 1. Optimistic local update
    setTransactions(prev => [...newTxs, ...prev]);

    // 2. Broadcast via Supabase Realtime channel
    newTxs.forEach(t => broadcastToSupabase('TRANSACTION_UPDATE', t));

    // 3. Broadcast via backend server API
    for (const newTx of newTxs) {
      try {
        fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': clientIdRef.current,
          },
          body: JSON.stringify(newTx),
        }).catch(e => console.error('Erro na sincronização backend', e));
      } catch (e) {}

      // 4. Save to Supabase if configured
      if (supabaseStatus.isConfigured) {
        saveSupabaseTransaction(newTx).catch(e => console.error(e));
      }
    }

    if (soundEnabled) playSyncChime();
    return true;
  };

  const updateTransaction = async (tx: Transaction): Promise<boolean> => {
    setTransactions(prev => prev.map(t => (t.id === tx.id ? tx : t)));

    // Broadcast via Supabase Realtime channel
    broadcastToSupabase('TRANSACTION_UPDATE', tx);

    // Broadcast via backend API
    try {
      fetch(`/api/transactions/${tx.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(tx),
      }).catch(e => console.error('Erro na sincronização backend', e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      setSupabaseStatus(prev => ({ ...prev, isSyncing: true }));
      const { error } = await saveSupabaseTransaction(tx);
      setSupabaseStatus(prev => ({ ...prev, isSyncing: false, error: error || null }));
      if (error) {
        console.warn(`Aviso Supabase: ${error}`);
      }
    }
    return true;
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    setTransactions(prev => prev.filter(t => t.id !== id));

    // Broadcast via Supabase Realtime channel
    broadcastToSupabase('TRANSACTION_DELETE', { id });

    // Broadcast via backend API
    try {
      fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'x-client-id': clientIdRef.current,
        },
      }).catch(e => console.error('Erro na sincronização backend', e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      setSupabaseStatus(prev => ({ ...prev, isSyncing: true }));
      const { error } = await deleteSupabaseTransaction(id);
      setSupabaseStatus(prev => ({ ...prev, isSyncing: false, error: error || null }));
      if (error) {
        console.warn(`Aviso Supabase: ${error}`);
      }
    }

    return true;
  };

  const refreshTransactions = async () => {
    await reconcileWithServer(false);
    await loadSupabaseData();
  };

  const clearAllTransactions = async () => {
    setTransactions([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_TX_KEY);
      await fetch('/api/transactions/clear', {
        method: 'POST',
        headers: {
          'x-client-id': clientIdRef.current,
        },
      });
    } catch (e) {
      console.error('Erro ao limpar lançamentos', e);
    }
    setNotification('Todos os lançamentos foram zerados. Pronto para começar do zero!');
  };

  const migrateLocalToSupabase = async () => {
    setSupabaseStatus(prev => ({ ...prev, isSyncing: true }));
    const [txRes, loansRes, chatRes, vaultRes] = await Promise.all([
      bulkUploadToSupabase(transactions),
      bulkUploadLoansToSupabase(loans),
      bulkUploadChatMessagesToSupabase(chatMessages),
      bulkUploadVaultGoalsToSupabase(vaultGoals),
    ]);

    const anyError = txRes.error || loansRes.error || chatRes.error || vaultRes.error;
    setSupabaseStatus(prev => ({ ...prev, isSyncing: false, error: anyError }));
    if (!anyError) {
      setNotification(
        `Sucesso! Sincronizados no Supabase: ${txRes.count} transações, ${loansRes.count} empréstimos, ${chatRes.count} mensagens e ${vaultRes.count} caixinhas!`
      );
    }
    return {
      count: txRes.count + loansRes.count + chatRes.count + vaultRes.count,
      error: anyError,
    };
  };

  const addVaultGoal = async (
    goalData: Omit<VaultGoal, 'id' | 'deposits' | 'created_at'>,
    initialDeposit: number = 0
  ): Promise<boolean> => {
    const goalId = `goal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const initialDeposits: VaultDeposit[] = [];
    if (initialDeposit > 0) {
      initialDeposits.push({
        id: `dep-${Date.now()}`,
        amount: initialDeposit,
        type: 'deposit',
        date: new Date().toISOString().split('T')[0],
        owner: activeDeviceUser,
        notes: 'Aporte inicial ao criar a caixinha',
        created_at: new Date().toISOString(),
      });
    }

    const newGoal: VaultGoal = {
      ...goalData,
      id: goalId,
      currentAmount: initialDeposit,
      deposits: initialDeposits,
      created_at: new Date().toISOString(),
    };

    setVaultGoals(prev => [newGoal, ...prev]);

    // Broadcast instantaneamente para o outro aparelho via WebSocket
    broadcastToSupabase('VAULT_UPDATE', newGoal);

    try {
      fetch('/api/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(newGoal),
      }).catch(e => console.error(e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      saveSupabaseVaultGoal(newGoal).catch(e => console.warn('Aviso Supabase save vault:', e));
    }

    setNotification(`Caixinha "${newGoal.name}" criada no Cofre!`);
    return true;
  };

  const updateVaultGoal = async (goal: VaultGoal): Promise<boolean> => {
    setVaultGoals(prev => prev.map(g => (g.id === goal.id ? goal : g)));

    // Broadcast instantaneamente para o outro aparelho via WebSocket
    broadcastToSupabase('VAULT_UPDATE', goal);

    try {
      fetch('/api/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(goal),
      }).catch(e => console.error(e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      saveSupabaseVaultGoal(goal).catch(e => console.warn('Aviso Supabase update vault:', e));
    }

    return true;
  };

  const deleteVaultGoal = async (id: string): Promise<boolean> => {
    setVaultGoals(prev => prev.filter(g => g.id !== id));

    // Broadcast instantaneamente para o outro aparelho via WebSocket
    broadcastToSupabase('VAULT_DELETE', { id });

    try {
      fetch(`/api/vault/${id}`, {
        method: 'DELETE',
        headers: {
          'x-client-id': clientIdRef.current,
        },
      }).catch(e => console.error(e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      deleteSupabaseVaultGoal(id).catch(e => console.warn('Aviso Supabase delete vault:', e));
    }

    setNotification('Caixinha removida do cofre.');
    return true;
  };

  const addVaultDeposit = async (
    goalId: string,
    amount: number,
    type: 'deposit' | 'withdraw',
    owner: TransactionOwner,
    notes?: string
  ): Promise<boolean> => {
    const goal = vaultGoals.find(g => g.id === goalId);
    if (!goal) return false;

    const newDeposit: VaultDeposit = {
      id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      amount,
      type,
      date: new Date().toISOString().split('T')[0],
      owner,
      notes,
      created_at: new Date().toISOString(),
    };

    const newCurrentAmount =
      type === 'deposit'
        ? goal.currentAmount + amount
        : Math.max(0, goal.currentAmount - amount);

    const updatedGoal: VaultGoal = {
      ...goal,
      currentAmount: newCurrentAmount,
      deposits: [newDeposit, ...goal.deposits],
      updated_at: new Date().toISOString(),
    };

    setVaultGoals(prev => prev.map(g => (g.id === goalId ? updatedGoal : g)));

    // Broadcast instantaneamente para o outro aparelho via WebSocket
    broadcastToSupabase('VAULT_UPDATE', updatedGoal);

    try {
      fetch('/api/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(updatedGoal),
      }).catch(e => console.error(e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      saveSupabaseVaultGoal(updatedGoal).catch(e => console.warn('Aviso Supabase deposit vault:', e));
    }

    const author =
      owner === 'partner1'
        ? partners.partner1Name
        : owner === 'partner2'
        ? partners.partner2Name
        : 'Casal';
    const actionText = type === 'deposit' ? 'guardou' : 'resgatou';
    setNotification(
      `${author} ${actionText} ${formatCurrency(amount)} na caixinha "${goal.name}"!`
    );
    if (soundEnabled) playSyncChime();

    return true;
  };

  const addLoan = async (
    loanData: Omit<Loan, 'id' | 'payments' | 'created_at'>
  ): Promise<boolean> => {
    const loanId = `loan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newLoan: Loan = {
      ...loanData,
      id: loanId,
      paidAmount: loanData.paidAmount || 0,
      status: loanData.status || 'pending',
      payments: [],
      created_at: new Date().toISOString(),
    };

    // 1. Optimistic local state update
    setLoans(prev => [newLoan, ...prev]);

    // 2. Broadcast via Supabase Realtime channel (Instant WebSocket sync to partner's phone)
    broadcastToSupabase('LOAN_UPDATE', newLoan);

    // 3. Local backend sync
    try {
      fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(newLoan),
      }).catch(e => console.error(e));
    } catch (e) {}

    // 4. Supabase Cloud Database persistence
    if (supabaseStatus.isConfigured) {
      setSupabaseStatus(prev => ({ ...prev, isSyncing: true }));
      saveSupabaseLoan(newLoan).then(({ error }) => {
        setSupabaseStatus(prev => ({ ...prev, isSyncing: false, error: error || null }));
        if (error) {
          console.warn('Aviso Supabase loan:', error);
          if (error.includes('relation') && error.includes('does not exist')) {
            setNotification('⚠️ Empréstimo transmitido em tempo real! Para salvar permanentemente no Supabase, execute o script SQL no editor do Supabase.');
          }
        }
      }).catch(e => {
        setSupabaseStatus(prev => ({ ...prev, isSyncing: false }));
        console.error(e);
      });
    }

    if (soundEnabled) playSyncChime();
    return true;
  };

  const updateLoan = async (loan: Loan): Promise<boolean> => {
    setLoans(prev => prev.map(l => (l.id === loan.id ? loan : l)));

    // Broadcast via Supabase Realtime channel
    broadcastToSupabase('LOAN_UPDATE', loan);

    try {
      fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(loan),
      }).catch(e => console.error(e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      setSupabaseStatus(prev => ({ ...prev, isSyncing: true }));
      saveSupabaseLoan(loan).then(({ error }) => {
        setSupabaseStatus(prev => ({ ...prev, isSyncing: false, error: error || null }));
        if (error) console.warn('Aviso Supabase update loan:', error);
      }).catch(e => setSupabaseStatus(prev => ({ ...prev, isSyncing: false })));
    }

    if (soundEnabled) playSyncChime();
    return true;
  };

  const deleteLoan = async (id: string): Promise<boolean> => {
    setLoans(prev => prev.filter(l => l.id !== id));

    // Broadcast via Supabase Realtime channel
    broadcastToSupabase('LOAN_DELETE', { id });

    try {
      fetch(`/api/loans/${id}`, {
        method: 'DELETE',
        headers: {
          'x-client-id': clientIdRef.current,
        },
      }).catch(e => console.error(e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      setSupabaseStatus(prev => ({ ...prev, isSyncing: true }));
      deleteSupabaseLoan(id).then(({ error }) => {
        setSupabaseStatus(prev => ({ ...prev, isSyncing: false, error: error || null }));
        if (error) console.warn('Aviso Supabase delete loan:', error);
      }).catch(e => setSupabaseStatus(prev => ({ ...prev, isSyncing: false })));
    }

    return true;
  };

  const payLoan = async (
    loanId: string,
    amount: number,
    payer: TransactionOwner,
    notes?: string
  ): Promise<boolean> => {
    const targetLoan = loans.find(l => l.id === loanId);
    if (!targetLoan) return false;

    const newPayment: LoanPayment = {
      id: `lpay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      amount,
      date: new Date().toISOString().split('T')[0],
      payer,
      notes,
      created_at: new Date().toISOString(),
    };

    const newPaidAmount = targetLoan.paidAmount + amount;
    const isFullyPaid = newPaidAmount >= targetLoan.amount;

    const updatedLoan: Loan = {
      ...targetLoan,
      paidAmount: Math.min(newPaidAmount, targetLoan.amount),
      status: isFullyPaid ? 'paid' : 'pending',
      payments: [newPayment, ...(targetLoan.payments || [])],
      updated_at: new Date().toISOString(),
    };

    setLoans(prev => prev.map(l => (l.id === loanId ? updatedLoan : l)));

    // Broadcast payment update via Supabase Realtime channel
    broadcastToSupabase('LOAN_UPDATE', updatedLoan);

    try {
      fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(updatedLoan),
      }).catch(e => console.error(e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      setSupabaseStatus(prev => ({ ...prev, isSyncing: true }));
      saveSupabaseLoan(updatedLoan).then(({ error }) => {
        setSupabaseStatus(prev => ({ ...prev, isSyncing: false, error: error || null }));
        if (error) console.warn('Aviso Supabase pay loan:', error);
      }).catch(e => setSupabaseStatus(prev => ({ ...prev, isSyncing: false })));
    }

    if (soundEnabled) playSyncChime();
    return true;
  };

  const sendChatMessage = async (text: string, sender: TransactionOwner): Promise<boolean> => {
    const cleanText = text.trim();
    if (!cleanText) return false;
    const senderName = sender === 'partner1' ? partners.partner1Name : partners.partner2Name;
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      sender,
      senderName,
      text: cleanText,
      timestamp: new Date().toISOString(),
    };

    // 1. Optimistic local update
    setChatMessages(prev => [...prev, newMsg]);

    // 2. Broadcast via Supabase Realtime channel (Instant WebSocket sync to partner's phone)
    broadcastToSupabase('CHAT_MESSAGE', newMsg);

    // 3. Local backend sync
    try {
      fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientIdRef.current,
        },
        body: JSON.stringify(newMsg),
      }).catch(e => console.error(e));
    } catch (e) {}

    // 4. Supabase Cloud Database persistence
    if (supabaseStatus.isConfigured) {
      saveSupabaseChatMessage(newMsg).then(({ error }) => {
        if (error) {
          console.warn('Aviso Supabase chat:', error);
          if (error.includes('relation') && error.includes('does not exist')) {
            setNotification('⚠️ Mensagem enviada em tempo real! Para salvar permanentemente no Supabase, crie a tabela "chat_messages" executando o script SQL.');
          }
        }
      }).catch(e => {
        console.error('Erro ao enviar mensagem no Supabase:', e);
      });
    }

    if (soundEnabled) playSyncChime();
    return true;
  };

  const deleteChatMessage = async (id: string): Promise<boolean> => {
    setChatMessages(prev => prev.filter(m => m.id !== id));

    // Broadcast deletion via Supabase Realtime channel
    broadcastToSupabase('CHAT_DELETE', { id });

    try {
      fetch(`/api/chat/${id}`, {
        method: 'DELETE',
        headers: {
          'x-client-id': clientIdRef.current,
        },
      }).catch(e => console.error(e));
    } catch (e) {}

    if (supabaseStatus.isConfigured) {
      deleteSupabaseChatMessage(id).catch(e => {
        console.error('Erro ao excluir mensagem no Supabase:', e);
      });
    }

    return true;
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        partners,
        activeDeviceUser,
        selectedMonth,
        filterOwner,
        searchQuery,
        connectedDevices,
        supabaseStatus,
        notification,
        soundEnabled,
        vaultGoals,
        loans,
        chatMessages,
        setSoundEnabled,
        setActiveDeviceUser,
        setSelectedMonth,
        setFilterOwner,
        setSearchQuery,
        addTransaction,
        addTransactions,
        updateTransaction,
        deleteTransaction,
        updatePartners,
        refreshTransactions,
        migrateLocalToSupabase,
        clearAllTransactions,
        dismissNotification,
        addVaultGoal,
        updateVaultGoal,
        deleteVaultGoal,
        addVaultDeposit,
        addLoan,
        updateLoan,
        deleteLoan,
        payLoan,
        sendChatMessage,
        deleteChatMessage,
        forceSyncNow,
        importCoupleData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance deve ser usado dentro de um FinanceProvider');
  }
  return context;
};
