import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Transaction, Loan, LoanPayment, ChatMessage, TransactionOwner, VaultGoal, VaultDeposit } from '../types/finance';

const CONFIG_STORAGE_KEY = 'financas_supabase_config';

export interface StoredSupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

export function getStoredSupabaseConfig(): StoredSupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler config do Supabase do localStorage', err);
  }

  // Fallback to env vars if available
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  return null;
}

export function saveStoredSupabaseConfig(url: string, anonKey: string): void {
  const trimmedUrl = url.trim().replace(/\/+$/, '');
  const trimmedKey = anonKey.trim();
  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({ url: trimmedUrl, anonKey: trimmedKey })
  );
  // Invalidate cached client
  cachedClient = null;

  // Sync to shared backend server
  syncSupabaseConfigToServer(trimmedUrl, trimmedKey);
}

export function clearStoredSupabaseConfig(): void {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  cachedClient = null;

  // Sync deletion to shared backend server
  deleteSupabaseConfigFromServer();
}

export async function syncSupabaseConfigToServer(url: string, anonKey: string): Promise<void> {
  try {
    await fetch('/api/supabase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, anonKey }),
    });
  } catch (e) {
    // Ignore server error if offline or dev
  }
}

export async function deleteSupabaseConfigFromServer(): Promise<void> {
  try {
    await fetch('/api/supabase-config', {
      method: 'DELETE',
    });
  } catch (e) {}
}

export async function fetchServerSupabaseConfig(): Promise<StoredSupabaseConfig | null> {
  try {
    const res = await fetch('/api/supabase-config');
    if (res.ok) {
      const data = await res.json();
      if (data.isConfigured && data.config?.url && data.config?.anonKey) {
        return {
          url: data.config.url,
          anonKey: data.config.anonKey,
        };
      }
    }
  } catch (e) {}
  return null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config?.url || !config?.anonKey) {
    return null;
  }

  if (cachedClient && currentClientUrl === config.url && currentClientKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentClientUrl = config.url;
    currentClientKey = config.anonKey;
    return cachedClient;
  } catch (e) {
    console.error('Erro ao inicializar Supabase client:', e);
    return null;
  }
}

// --------------------------------------------------------
// MAPPERS
// --------------------------------------------------------

export function mapSupabaseTransaction(row: any): Transaction {
  return {
    id: String(row.id),
    description: row.description,
    amount: Number(row.amount),
    type: row.type as 'income' | 'expense',
    category: row.category,
    owner: row.owner as TransactionOwner,
    date: row.date,
    payment_method: row.payment_method,
    status: row.status as 'paid' | 'pending',
    notes: row.notes || undefined,
    created_at: row.created_at,
  };
}

export function mapSupabaseLoan(row: any): Loan {
  let parsedPayments: LoanPayment[] = [];
  if (Array.isArray(row.payments)) {
    parsedPayments = row.payments;
  } else if (typeof row.payments === 'string') {
    try {
      parsedPayments = JSON.parse(row.payments);
    } catch (e) {
      parsedPayments = [];
    }
  }

  return {
    id: String(row.id),
    lenderName: row.lender_name ?? row.lenderName ?? 'Empréstimo',
    borrower: (row.borrower as TransactionOwner) || 'shared',
    amount: Number(row.amount || 0),
    paidAmount: Number(row.paid_amount ?? row.paidAmount ?? 0),
    borrowDate: row.borrow_date ?? row.borrowDate ?? '',
    dueDate: row.due_date ?? row.dueDate ?? '',
    status: (row.status === 'paid' ? 'paid' : 'pending') as 'pending' | 'paid',
    notes: row.notes || undefined,
    payments: parsedPayments,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || undefined,
  };
}

export function loanToSupabasePayload(loan: Loan) {
  return {
    id: loan.id,
    lender_name: loan.lenderName,
    borrower: loan.borrower,
    amount: loan.amount,
    paid_amount: loan.paidAmount || 0,
    borrow_date: loan.borrowDate,
    due_date: loan.dueDate,
    status: loan.status,
    notes: loan.notes || null,
    payments: loan.payments || [],
    created_at: loan.created_at || new Date().toISOString(),
    updated_at: loan.updated_at || new Date().toISOString(),
  };
}

export function mapSupabaseChatMessage(row: any): ChatMessage {
  return {
    id: String(row.id),
    sender: (row.sender as TransactionOwner) || 'partner1',
    senderName: row.sender_name ?? row.senderName ?? 'Usuário',
    text: row.text || '',
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
  };
}

export function chatMessageToSupabasePayload(msg: ChatMessage) {
  return {
    id: msg.id,
    sender: msg.sender,
    sender_name: msg.senderName,
    text: msg.text,
    timestamp: msg.timestamp || new Date().toISOString(),
  };
}

export function mapSupabaseVaultGoal(row: any): VaultGoal {
  let parsedDeposits: VaultDeposit[] = [];
  if (Array.isArray(row.deposits)) {
    parsedDeposits = row.deposits;
  } else if (typeof row.deposits === 'string') {
    try {
      parsedDeposits = JSON.parse(row.deposits);
    } catch (e) {
      parsedDeposits = [];
    }
  }

  return {
    id: String(row.id),
    name: row.name || 'Caixinha',
    targetAmount: Number(row.target_amount ?? row.targetAmount ?? 0),
    currentAmount: Number(row.current_amount ?? row.currentAmount ?? 0),
    color: row.color || 'emerald',
    icon: row.icon || undefined,
    deadline: row.deadline || undefined,
    notes: row.notes || undefined,
    deposits: parsedDeposits,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || undefined,
  };
}

export function vaultGoalToSupabasePayload(goal: VaultGoal) {
  return {
    id: goal.id,
    name: goal.name,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount || 0,
    color: goal.color || 'emerald',
    icon: goal.icon || null,
    deadline: goal.deadline || null,
    notes: goal.notes || null,
    deposits: goal.deposits || [],
    created_at: goal.created_at || new Date().toISOString(),
    updated_at: goal.updated_at || new Date().toISOString(),
  };
}

// --------------------------------------------------------
// CONNECTION TEST
// --------------------------------------------------------

export async function testSupabaseConnection(
  url?: string,
  key?: string
): Promise<{
  success: boolean;
  message: string;
  tableExists: boolean;
  tables: {
    transactions: boolean;
    loans: boolean;
    chat_messages: boolean;
    vault_goals: boolean;
  };
}> {
  const targetUrl = (url || getStoredSupabaseConfig()?.url || '').trim();
  const targetKey = (key || getStoredSupabaseConfig()?.anonKey || '').trim();

  if (!targetUrl || !targetKey) {
    return {
      success: false,
      message: 'URL e Anon Key do Supabase são obrigatórios.',
      tableExists: false,
      tables: { transactions: false, loans: false, chat_messages: false, vault_goals: false },
    };
  }

  try {
    const testClient = createClient(targetUrl, targetKey);

    const [txRes, loansRes, chatRes, vaultRes] = await Promise.all([
      testClient.from('transactions').select('id').limit(1),
      testClient.from('loans').select('id').limit(1),
      testClient.from('chat_messages').select('id').limit(1),
      testClient.from('vault_goals').select('id').limit(1),
    ]);

    // Check errors
    const isRelationMissing = (err: any) =>
      err?.code === '42P01' ||
      err?.message?.includes('does not exist') ||
      err?.message?.includes('relation');

    const tables = {
      transactions: !txRes.error,
      loans: !loansRes.error,
      chat_messages: !chatRes.error,
      vault_goals: !vaultRes.error,
    };

    // If there's an auth or invalid key error
    if (txRes.error && !isRelationMissing(txRes.error)) {
      return {
        success: false,
        message: `Erro de autenticação/conexão: ${txRes.error.message}`,
        tableExists: false,
        tables,
      };
    }

    const missing: string[] = [];
    if (!tables.transactions) missing.push('transactions');
    if (!tables.loans) missing.push('loans');
    if (!tables.chat_messages) missing.push('chat_messages');
    if (!tables.vault_goals) missing.push('vault_goals');

    if (missing.length === 0) {
      return {
        success: true,
        message: 'Conexão estabelecida com sucesso! Todas as tabelas (transações, empréstimos, chat e cofre) estão prontas para tempo real.',
        tableExists: true,
        tables,
      };
    }

    return {
      success: true,
      message: `Conectado ao Supabase! Porém, as seguintes tabelas precisam ser criadas: ${missing.join(', ')}. Copie o script SQL abaixo e execute no SQL Editor do Supabase.`,
      tableExists: false,
      tables,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha ao conectar: ${err?.message || 'Verifique a URL e a Anon Key fornecidas.'}`,
      tableExists: false,
      tables: { transactions: false, loans: false, chat_messages: false, vault_goals: false },
    };
  }
}

// --------------------------------------------------------
// TRANSACTIONS
// --------------------------------------------------------

export async function fetchSupabaseTransactions(): Promise<{ data: Transaction[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase não configurado' };
  }

  try {
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const mapped: Transaction[] = (data || []).map(mapSupabaseTransaction);
    return { data: mapped, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Erro ao carregar transações do Supabase' };
  }
}

export async function saveSupabaseTransaction(tx: Transaction): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado' };
  }

  try {
    const payload = {
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      owner: tx.owner,
      date: tx.date,
      payment_method: tx.payment_method,
      status: tx.status,
      notes: tx.notes || null,
    };

    const { error } = await client
      .from('transactions')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Erro ao salvar transação no Supabase' };
  }
}

export async function deleteSupabaseTransaction(id: string): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado' };
  }

  try {
    const { error } = await client
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Erro ao deletar transação no Supabase' };
  }
}

export async function bulkUploadToSupabase(transactions: Transaction[]): Promise<{ count: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase não configurado' };
  }
  if (transactions.length === 0) {
    return { count: 0, error: null };
  }

  try {
    const payloads = transactions.map(tx => ({
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      owner: tx.owner,
      date: tx.date,
      payment_method: tx.payment_method,
      status: tx.status,
      notes: tx.notes || null,
    }));

    const { error } = await client
      .from('transactions')
      .upsert(payloads, { onConflict: 'id' });

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: payloads.length, error: null };
  } catch (e: any) {
    return { count: 0, error: e?.message || 'Falha ao sincronizar' };
  }
}

// --------------------------------------------------------
// LOANS (EMPRÉSTIMOS)
// --------------------------------------------------------

export async function fetchSupabaseLoans(): Promise<{ data: Loan[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase não configurado' };
  }

  try {
    const { data, error } = await client
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const mapped: Loan[] = (data || []).map(mapSupabaseLoan);
    return { data: mapped, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Erro ao carregar empréstimos do Supabase' };
  }
}

export async function saveSupabaseLoan(loan: Loan): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado' };
  }

  try {
    const payload = loanToSupabasePayload(loan);
    const { error } = await client
      .from('loans')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Erro ao salvar empréstimo no Supabase' };
  }
}

export async function deleteSupabaseLoan(id: string): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado' };
  }

  try {
    const { error } = await client
      .from('loans')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Erro ao deletar empréstimo no Supabase' };
  }
}

export async function bulkUploadLoansToSupabase(loans: Loan[]): Promise<{ count: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase não configurado' };
  }
  if (loans.length === 0) {
    return { count: 0, error: null };
  }

  try {
    const payloads = loans.map(loanToSupabasePayload);
    const { error } = await client
      .from('loans')
      .upsert(payloads, { onConflict: 'id' });

    if (error) {
      return { count: 0, error: error.message };
    }
    return { count: payloads.length, error: null };
  } catch (e: any) {
    return { count: 0, error: e?.message || 'Falha ao sincronizar empréstimos' };
  }
}

// --------------------------------------------------------
// CHAT MESSAGES (MENSAGENS)
// --------------------------------------------------------

export async function fetchSupabaseChatMessages(): Promise<{ data: ChatMessage[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase não configurado' };
  }

  try {
    const { data, error } = await client
      .from('chat_messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const mapped: ChatMessage[] = (data || []).map(mapSupabaseChatMessage);
    return { data: mapped, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Erro ao carregar mensagens do Supabase' };
  }
}

export async function saveSupabaseChatMessage(message: ChatMessage): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado' };
  }

  try {
    const payload = chatMessageToSupabasePayload(message);
    const { error } = await client
      .from('chat_messages')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Erro ao salvar mensagem no Supabase' };
  }
}

export async function deleteSupabaseChatMessage(id: string): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado' };
  }

  try {
    const { error } = await client
      .from('chat_messages')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Erro ao deletar mensagem no Supabase' };
  }
}

export async function bulkUploadChatMessagesToSupabase(messages: ChatMessage[]): Promise<{ count: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase não configurado' };
  }
  if (messages.length === 0) {
    return { count: 0, error: null };
  }

  try {
    const payloads = messages.map(chatMessageToSupabasePayload);
    const { error } = await client
      .from('chat_messages')
      .upsert(payloads, { onConflict: 'id' });

    if (error) {
      return { count: 0, error: error.message };
    }
    return { count: payloads.length, error: null };
  } catch (e: any) {
    return { count: 0, error: e?.message || 'Falha ao sincronizar mensagens' };
  }
}

// --------------------------------------------------------
// VAULT GOALS (COFRE & CAIXINHAS)
// --------------------------------------------------------

export async function fetchSupabaseVaultGoals(): Promise<{ data: VaultGoal[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase não configurado' };
  }

  try {
    const { data, error } = await client
      .from('vault_goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const mapped: VaultGoal[] = (data || []).map(mapSupabaseVaultGoal);
    return { data: mapped, error: null };
  } catch (e: any) {
    return { data: null, error: e?.message || 'Erro ao carregar caixinhas do Supabase' };
  }
}

export async function saveSupabaseVaultGoal(goal: VaultGoal): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado' };
  }

  try {
    const payload = vaultGoalToSupabasePayload(goal);
    const { error } = await client
      .from('vault_goals')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Erro ao salvar caixinha no Supabase' };
  }
}

export async function deleteSupabaseVaultGoal(id: string): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase não configurado' };
  }

  try {
    const { error } = await client
      .from('vault_goals')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || 'Erro ao deletar caixinha no Supabase' };
  }
}

export async function bulkUploadVaultGoalsToSupabase(goals: VaultGoal[]): Promise<{ count: number; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase não configurado' };
  }
  if (goals.length === 0) {
    return { count: 0, error: null };
  }

  try {
    const payloads = goals.map(vaultGoalToSupabasePayload);
    const { error } = await client
      .from('vault_goals')
      .upsert(payloads, { onConflict: 'id' });

    if (error) {
      return { count: 0, error: error.message };
    }
    return { count: payloads.length, error: null };
  } catch (e: any) {
    return { count: 0, error: e?.message || 'Falha ao sincronizar caixinhas' };
  }
}

// --------------------------------------------------------
// SQL SCHEMA SCRIPT
// --------------------------------------------------------

export function getSupabaseSqlSchema(): string {
  return `-- ========================================================
-- SCRIPT SQL: FINANÇAS DO CASAL (SUPABASE FULL SYNC)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/_/sql
-- ========================================================

-- 1. TABELA DE TRANSAÇÕES
create table if not exists public.transactions (
  id text primary key,
  description text not null,
  amount numeric(12, 2) not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  owner text not null check (owner in ('partner1', 'partner2', 'shared')),
  date text not null,
  payment_method text not null,
  status text not null check (status in ('paid', 'pending')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TABELA DE EMPRÉSTIMOS
create table if not exists public.loans (
  id text primary key,
  lender_name text not null,
  borrower text not null check (borrower in ('partner1', 'partner2', 'shared')),
  amount numeric(12, 2) not null,
  paid_amount numeric(12, 2) not null default 0,
  borrow_date text not null,
  due_date text not null,
  status text not null check (status in ('pending', 'paid')),
  notes text,
  payments jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

-- 3. TABELA DE MENSAGENS (CHAT DO CASAL)
create table if not exists public.chat_messages (
  id text primary key,
  sender text not null check (sender in ('partner1', 'partner2', 'shared')),
  sender_name text not null,
  text text not null,
  timestamp text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABELA DE COFRE & CAIXINHAS (METAS)
create table if not exists public.vault_goals (
  id text primary key,
  name text not null,
  target_amount numeric(12, 2) not null,
  current_amount numeric(12, 2) not null default 0,
  color text not null default 'emerald',
  icon text,
  deadline text,
  notes text,
  deposits jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
alter table public.transactions enable row level security;
alter table public.loans enable row level security;
alter table public.chat_messages enable row level security;
alter table public.vault_goals enable row level security;

-- 6. REPLICA IDENTITY FULL (Para capturar DELETE e UPDATE completos no Realtime)
alter table public.transactions replica identity full;
alter table public.loans replica identity full;
alter table public.chat_messages replica identity full;
alter table public.vault_goals replica identity full;

-- 7. POLÍTICAS DE ACESSO TOTAL PARA CHAVE ANÔNIMA (ANON)
drop policy if exists "Acesso total as transacoes do casal" on public.transactions;
create policy "Acesso total as transacoes do casal"
  on public.transactions for all
  using (true) with check (true);

drop policy if exists "Acesso total aos emprestimos do casal" on public.loans;
create policy "Acesso total aos emprestimos do casal"
  on public.loans for all
  using (true) with check (true);

drop policy if exists "Acesso total ao chat do casal" on public.chat_messages;
create policy "Acesso total ao chat do casal"
  on public.chat_messages for all
  using (true) with check (true);

drop policy if exists "Acesso total as caixinhas do cofre" on public.vault_goals;
create policy "Acesso total as caixinhas do cofre"
  on public.vault_goals for all
  using (true) with check (true);

-- 8. HABILITAR PUBLICAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- Permite que transações, empréstimos, chat e cofre sincronizem instantaneamente entre celulares!
do $$
begin
  begin
    alter publication supabase_realtime add table public.transactions;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.loans;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.vault_goals;
  exception when others then null;
  end;
end $$;
`;
}
