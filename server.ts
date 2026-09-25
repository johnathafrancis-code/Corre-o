import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

interface TransactionItem {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  owner: 'partner1' | 'partner2' | 'shared';
  date: string;
  payment_method: string;
  status: 'paid' | 'pending';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// In-memory data store with file persistence
const DATA_FILE = path.join(__dirname, 'transactions-data.json');
const VAULT_FILE = path.join(__dirname, 'vault-data.json');
const LOANS_FILE = path.join(__dirname, 'loans-data.json');
const CHAT_FILE = path.join(__dirname, 'chat-data.json');
const PARTNERS_FILE = path.join(__dirname, 'partners-data.json');
const SUPABASE_CONFIG_FILE = path.join(__dirname, 'supabase-config.json');

const INITIAL_DATA: TransactionItem[] = [];

let transactions: TransactionItem[] = [];
let vaultGoals: any[] = [];
let loans: any[] = [];
let chatMessages: any[] = [];
let partnersData: any = null;
let supabaseConfig: { url: string; anonKey: string } | null = null;

try {
  if (fs.existsSync(SUPABASE_CONFIG_FILE)) {
    const raw = fs.readFileSync(SUPABASE_CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.url && parsed.anonKey) {
      supabaseConfig = { url: parsed.url, anonKey: parsed.anonKey };
    }
  }
} catch (e) {
  supabaseConfig = null;
}

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    transactions = JSON.parse(raw);
  } else {
    transactions = [];
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  transactions = [];
}

try {
  if (fs.existsSync(VAULT_FILE)) {
    const raw = fs.readFileSync(VAULT_FILE, 'utf-8');
    vaultGoals = JSON.parse(raw);
  } else {
    vaultGoals = [];
    fs.writeFileSync(VAULT_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  vaultGoals = [];
}

try {
  if (fs.existsSync(LOANS_FILE)) {
    const raw = fs.readFileSync(LOANS_FILE, 'utf-8');
    loans = JSON.parse(raw);
  } else {
    loans = [];
    fs.writeFileSync(LOANS_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  loans = [];
}

try {
  if (fs.existsSync(CHAT_FILE)) {
    const raw = fs.readFileSync(CHAT_FILE, 'utf-8');
    chatMessages = JSON.parse(raw);
  } else {
    chatMessages = [];
    fs.writeFileSync(CHAT_FILE, JSON.stringify([], null, 2));
  }
} catch (e) {
  chatMessages = [];
}

try {
  if (fs.existsSync(PARTNERS_FILE)) {
    const raw = fs.readFileSync(PARTNERS_FILE, 'utf-8');
    partnersData = JSON.parse(raw);
  }
} catch (e) {}

function persistData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(transactions, null, 2));
  } catch (err) {
    console.error('Erro ao salvar transactions-data.json', err);
  }
}

function persistVault() {
  try {
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vaultGoals, null, 2));
  } catch (err) {
    console.error('Erro ao salvar vault-data.json', err);
  }
}

function persistLoans() {
  try {
    fs.writeFileSync(LOANS_FILE, JSON.stringify(loans, null, 2));
  } catch (err) {
    console.error('Erro ao salvar loans-data.json', err);
  }
}

function persistChat() {
  try {
    fs.writeFileSync(CHAT_FILE, JSON.stringify(chatMessages, null, 2));
  } catch (err) {
    console.error('Erro ao salvar chat-data.json', err);
  }
}

function persistPartners() {
  try {
    if (partnersData) {
      fs.writeFileSync(PARTNERS_FILE, JSON.stringify(partnersData, null, 2));
    }
  } catch (err) {
    console.error('Erro ao salvar partners-data.json', err);
  }
}

function persistSupabaseConfig() {
  try {
    if (supabaseConfig) {
      fs.writeFileSync(SUPABASE_CONFIG_FILE, JSON.stringify(supabaseConfig, null, 2));
    } else if (fs.existsSync(SUPABASE_CONFIG_FILE)) {
      fs.unlinkSync(SUPABASE_CONFIG_FILE);
    }
  } catch (err) {
    console.error('Erro ao salvar supabase-config.json', err);
  }
}

// SSE Connected clients
type SSEClient = {
  id: string;
  res: express.Response;
};

let clients: SSEClient[] = [];

function broadcast(eventType: string, data: any, originClientId?: string) {
  const payload = JSON.stringify({ eventType, data, timestamp: new Date().toISOString() });
  clients.forEach(client => {
    try {
      client.res.write(`event: message\ndata: ${payload}\n\n`);
    } catch (e) {
      // client disconnected
    }
  });
}

function broadcastClientCount() {
  const payload = JSON.stringify({
    eventType: 'CONNECTED_DEVICES',
    count: clients.length,
    timestamp: new Date().toISOString(),
  });
  clients.forEach(client => {
    try {
      client.res.write(`event: message\ndata: ${payload}\n\n`);
    } catch (e) {}
  });
}

async function startServer() {
  const app = express();

  app.use(express.json());

  // API Routes
  // 1. Get all transactions
  app.get('/api/transactions', (req, res) => {
    res.json({ transactions });
  });

  // 2. Add transaction
  app.post('/api/transactions', (req, res) => {
    const newTx: TransactionItem = {
      ...req.body,
      id: req.body.id || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    // Prepend to list
    transactions = [newTx, ...transactions.filter(t => t.id !== newTx.id)];
    persistData();

    // Broadcast instant event to all other open devices (phones, tablets, laptops)
    broadcast('INSERT', newTx, req.headers['x-client-id'] as string);

    res.status(201).json({ success: true, transaction: newTx });
  });

  // 3. Update transaction
  app.put('/api/transactions/:id', (req, res) => {
    const id = req.params.id;
    const index = transactions.findIndex(t => t.id === id);

    if (index === -1) {
      // If not exists, insert it
      const newTx: TransactionItem = {
        ...req.body,
        id,
        updated_at: new Date().toISOString(),
      };
      transactions = [newTx, ...transactions];
      persistData();
      broadcast('INSERT', newTx, req.headers['x-client-id'] as string);
      return res.json({ success: true, transaction: newTx });
    }

    const updatedTx = {
      ...transactions[index],
      ...req.body,
      id,
      updated_at: new Date().toISOString(),
    };
    transactions[index] = updatedTx;
    persistData();

    broadcast('UPDATE', updatedTx, req.headers['x-client-id'] as string);
    res.json({ success: true, transaction: updatedTx });
  });

  // 4. Delete transaction
  app.delete('/api/transactions/:id', (req, res) => {
    const id = req.params.id;
    transactions = transactions.filter(t => t.id !== id);
    persistData();

    broadcast('DELETE', { id }, req.headers['x-client-id'] as string);
    res.json({ success: true, id });
  });

  // 4b. Clear all transactions
  app.post('/api/transactions/clear', (req, res) => {
    transactions = [];
    persistData();
    broadcast('RELOAD', { transactions: [] }, req.headers['x-client-id'] as string);
    res.json({ success: true, count: 0 });
  });

  // 5. Bulk sync / restore
  app.post('/api/transactions/bulk', (req, res) => {
    const incoming: TransactionItem[] = req.body.transactions || [];
    if (Array.isArray(incoming) && incoming.length > 0) {
      const map = new Map<string, TransactionItem>();
      incoming.forEach(t => map.set(t.id, t));
      transactions.forEach(t => {
        if (!map.has(t.id)) map.set(t.id, t);
      });
      transactions = Array.from(map.values());
      persistData();
      broadcast('RELOAD', { transactions }, req.headers['x-client-id'] as string);
    }
    res.json({ success: true, count: transactions.length });
  });

  // 5b. Vault (Cofre & Caixinhas de Metas)
  app.get('/api/vault', (req, res) => {
    res.json({ goals: vaultGoals });
  });

  app.post('/api/vault', (req, res) => {
    const goal = req.body;
    if (!goal || !goal.id) {
      return res.status(400).json({ error: 'ID do cofre é obrigatório.' });
    }
    const idx = vaultGoals.findIndex(g => g.id === goal.id);
    if (idx === -1) {
      vaultGoals = [goal, ...vaultGoals];
    } else {
      vaultGoals[idx] = { ...vaultGoals[idx], ...goal, updated_at: new Date().toISOString() };
    }
    persistVault();
    broadcast('VAULT_UPDATE', { goal: idx === -1 ? goal : vaultGoals[idx], goals: vaultGoals }, req.headers['x-client-id'] as string);
    res.json({ success: true, goal: idx === -1 ? goal : vaultGoals[idx] });
  });

  app.delete('/api/vault/:id', (req, res) => {
    const id = req.params.id;
    vaultGoals = vaultGoals.filter(g => g.id !== id);
    persistVault();
    broadcast('VAULT_DELETE', { id, goals: vaultGoals }, req.headers['x-client-id'] as string);
    res.json({ success: true, id });
  });

  // 5c. Loans (Dinheiro Emprestado / Empréstimos)
  app.get('/api/loans', (req, res) => {
    res.json({ loans });
  });

  app.post('/api/loans', (req, res) => {
    const loan = req.body;
    if (!loan || !loan.id) {
      return res.status(400).json({ error: 'ID do empréstimo é obrigatório.' });
    }
    const idx = loans.findIndex(l => l.id === loan.id);
    if (idx === -1) {
      loans = [loan, ...loans];
    } else {
      loans[idx] = { ...loans[idx], ...loan, updated_at: new Date().toISOString() };
    }
    persistLoans();
    broadcast('LOAN_UPDATE', { loan: idx === -1 ? loan : loans[idx], loans }, req.headers['x-client-id'] as string);
    res.json({ success: true, loan: idx === -1 ? loan : loans[idx] });
  });

  app.delete('/api/loans/:id', (req, res) => {
    const id = req.params.id;
    loans = loans.filter(l => l.id !== id);
    persistLoans();
    broadcast('LOAN_DELETE', { id, loans }, req.headers['x-client-id'] as string);
    res.json({ success: true, id });
  });

  // 5d. Chat / Anotações do Casal (estilo WhatsApp)
  app.get('/api/chat', (req, res) => {
    res.json({ messages: chatMessages });
  });

  app.post('/api/chat', (req, res) => {
    const msg = req.body;
    if (!msg || !msg.id || !msg.text) {
      return res.status(400).json({ error: 'Mensagem inválida.' });
    }
    const idx = chatMessages.findIndex(m => m.id === msg.id);
    if (idx === -1) {
      chatMessages.push(msg);
    } else {
      chatMessages[idx] = msg;
    }
    persistChat();
    broadcast('CHAT_MESSAGE', { message: msg, messages: chatMessages }, req.headers['x-client-id'] as string);
    res.json({ success: true, message: msg });
  });

  app.delete('/api/chat/:id', (req, res) => {
    const id = req.params.id;
    chatMessages = chatMessages.filter(m => m.id !== id);
    persistChat();
    broadcast('CHAT_DELETE', { id, messages: chatMessages }, req.headers['x-client-id'] as string);
    res.json({ success: true, id });
  });

  // 5e. Partners Config
  app.get('/api/partners', (req, res) => {
    res.json({ partners: partnersData });
  });

  app.post('/api/partners', (req, res) => {
    const config = req.body;
    if (!config) return res.status(400).json({ error: 'Config inválido.' });
    partnersData = { ...(partnersData || {}), ...config };
    persistPartners();
    broadcast('PARTNERS_UPDATE', { partners: partnersData }, req.headers['x-client-id'] as string);
    res.json({ success: true, partners: partnersData });
  });

  // 5f. Shared Supabase Config across all devices
  app.get('/api/supabase-config', (req, res) => {
    if (supabaseConfig && supabaseConfig.url && supabaseConfig.anonKey) {
      res.json({ isConfigured: true, config: supabaseConfig });
    } else {
      res.json({ isConfigured: false, config: null });
    }
  });

  app.post('/api/supabase-config', (req, res) => {
    const { url, anonKey } = req.body || {};
    if (!url || !anonKey) {
      return res.status(400).json({ error: 'URL e Anon Key do Supabase são obrigatórios.' });
    }
    supabaseConfig = {
      url: String(url).trim().replace(/\/+$/, ''),
      anonKey: String(anonKey).trim(),
    };
    persistSupabaseConfig();
    broadcast('SUPABASE_CONFIG_UPDATED', { config: supabaseConfig });
    res.json({ success: true, config: supabaseConfig });
  });

  app.delete('/api/supabase-config', (req, res) => {
    supabaseConfig = null;
    persistSupabaseConfig();
    broadcast('SUPABASE_CONFIG_CLEARED', {});
    res.json({ success: true });
  });

  // 5g. Bidirectional Full Reconcile (Merges data between any client device and server)
  app.post('/api/sync/reconcile', (req, res) => {
    const incoming = req.body || {};
    let changed = false;

    // 1. Reconcile Loans (merge by ID, never drop)
    if (Array.isArray(incoming.loans) && incoming.loans.length > 0) {
      const loanMap = new Map<string, any>();
      loans.forEach(l => {
        if (l && l.id) loanMap.set(l.id, l);
      });

      incoming.loans.forEach((incLoan: any) => {
        if (!incLoan || !incLoan.id) return;
        const existing = loanMap.get(incLoan.id);
        if (!existing) {
          loanMap.set(incLoan.id, incLoan);
          changed = true;
        } else {
          const exTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
          const inTime = new Date(incLoan.updated_at || incLoan.created_at || 0).getTime();
          if (inTime >= exTime) {
            loanMap.set(incLoan.id, { ...existing, ...incLoan });
            changed = true;
          }
        }
      });
      loans = Array.from(loanMap.values());
      persistLoans();
    }

    // 2. Reconcile Transactions (merge by ID, never drop)
    if (Array.isArray(incoming.transactions) && incoming.transactions.length > 0) {
      const txMap = new Map<string, any>();
      transactions.forEach(t => {
        if (t && t.id) txMap.set(t.id, t);
      });

      incoming.transactions.forEach((incTx: any) => {
        if (!incTx || !incTx.id) return;
        const existing = txMap.get(incTx.id);
        if (!existing) {
          txMap.set(incTx.id, incTx);
          changed = true;
        } else {
          const exTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
          const inTime = new Date(incTx.updated_at || incTx.created_at || 0).getTime();
          if (inTime >= exTime) {
            txMap.set(incTx.id, { ...existing, ...incTx });
            changed = true;
          }
        }
      });
      transactions = Array.from(txMap.values());
      persistData();
    }

    // 3. Reconcile Vault Goals (merge by ID and deposits)
    if (Array.isArray(incoming.vaultGoals) && incoming.vaultGoals.length > 0) {
      const vaultMap = new Map<string, any>();
      vaultGoals.forEach(g => {
        if (g && g.id) vaultMap.set(g.id, g);
      });

      incoming.vaultGoals.forEach((incGoal: any) => {
        if (!incGoal || !incGoal.id) return;
        const existing = vaultMap.get(incGoal.id);
        if (!existing) {
          vaultMap.set(incGoal.id, incGoal);
          changed = true;
        } else {
          const exTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
          const inTime = new Date(incGoal.updated_at || incGoal.created_at || 0).getTime();
          if (inTime >= exTime) {
            vaultMap.set(incGoal.id, { ...existing, ...incGoal });
            changed = true;
          }
        }
      });
      vaultGoals = Array.from(vaultMap.values());
      persistVault();
    }

    // 4. Reconcile Chat Messages
    if (Array.isArray(incoming.chatMessages) && incoming.chatMessages.length > 0) {
      const chatMap = new Map<string, any>();
      chatMessages.forEach(m => {
        if (m && m.id) chatMap.set(m.id, m);
      });

      incoming.chatMessages.forEach((incMsg: any) => {
        if (!incMsg || !incMsg.id) return;
        if (!chatMap.has(incMsg.id)) {
          chatMap.set(incMsg.id, incMsg);
          changed = true;
        }
      });
      chatMessages = Array.from(chatMap.values());
      persistChat();
    }

    // 5. Reconcile Partners Config
    if (incoming.partners && typeof incoming.partners === 'object') {
      if (!partnersData || JSON.stringify(partnersData) !== JSON.stringify(incoming.partners)) {
        partnersData = { ...(partnersData || {}), ...incoming.partners };
        persistPartners();
        changed = true;
      }
    }

    if (changed) {
      broadcast('RECONCILE_UPDATE', {
        loans,
        transactions,
        vaultGoals,
        chatMessages,
        partners: partnersData,
      }, req.headers['x-client-id'] as string);
    }

    res.json({
      success: true,
      loans,
      transactions,
      vaultGoals,
      chatMessages,
      partners: partnersData,
      serverTime: new Date().toISOString(),
    });
  });

  // 6. Real-time Server-Sent Events (SSE) stream for instant synchronization
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newClient: SSEClient = { id: clientId, res };
    clients.push(newClient);

    // Initial greeting with client id and current count
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, connectedDevices: clients.length })}\n\n`);
    broadcastClientCount();

    // Heartbeat every 20s to avoid Cloud Run / proxy idle timeouts
    const heartbeatTimer = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
      clients = clients.filter(c => c.id !== clientId);
      broadcastClientCount();
    });
  });

  // Vite middleware in dev or static files in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (isProduction: ${isProduction})`);
  });
}

startServer();
