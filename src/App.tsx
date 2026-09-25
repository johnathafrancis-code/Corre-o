/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { TopBar } from './components/TopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OverviewMetrics } from './components/OverviewMetrics';
import { TransactionList } from './components/TransactionList';
import { VaultView } from './components/VaultView';
import { ChatView } from './components/ChatView';
import { TransactionModal } from './components/TransactionModal';
import { SupabaseModal } from './components/SupabaseModal';
import { SettingsModal } from './components/SettingsModal';
import { CoupleSyncModal } from './components/CoupleSyncModal';
import { Transaction } from './types/finance';
import {
  ReceiptText,
  ChevronRight,
} from 'lucide-react';

const DashboardContent: React.FC = () => {
  const {
    transactions,
    selectedMonth,
    partners,
  } = useFinance();

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'transactions' | 'vault' | 'chat'>('dashboard');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCoupleSyncModalOpen, setIsCoupleSyncModalOpen] = useState(false);

  const handleOpenNewTransaction = () => {
    setTransactionToEdit(null);
    setIsTransactionModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setTransactionToEdit(tx);
    setIsTransactionModalOpen(true);
  };

  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-900 font-sans">
      {/* Mobile Frame Container (Max width 430px for authentic phone feel on any screen) */}
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col relative shadow-xl shadow-slate-200/80 border-x border-slate-200/60 pb-20">
        
        {/* Sticky Mobile Top Bar */}
        <TopBar
          onOpenNewTransaction={handleOpenNewTransaction}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenCoupleSyncModal={() => setIsCoupleSyncModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 space-y-3.5">
          {/* TAB 1: INÍCIO (DASHBOARD) */}
          {currentTab === 'dashboard' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* Overview Metrics (Month scroller + Balance Card + Partner cards) */}
              <OverviewMetrics />

              {/* Recent Transactions Preview */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ReceiptText className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Lançamentos Recentes
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('transactions')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Ver todos ({monthTransactions.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {monthTransactions.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    Nenhum lançamento cadastrado neste mês.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {monthTransactions.slice(0, 4).map(tx => (
                      <div
                        key={tx.id}
                        onClick={() => handleEditTransaction(tx)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-semibold text-slate-800 block truncate">
                            {tx.description}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {tx.date} · {tx.owner === 'partner1' ? partners.partner1Name : (tx.owner === 'partner2' ? partners.partner2Name : 'Compartilhado')}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold font-mono shrink-0 tabular-nums ${
                            tx.type === 'expense' ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {tx.type === 'expense' ? '- ' : '+ '}
                          R$ {tx.amount.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EXTRATO COMPLETO */}
          {currentTab === 'transactions' && (
            <div className="animate-in fade-in duration-150">
              <TransactionList
                onEditTransaction={handleEditTransaction}
                onNewTransaction={handleOpenNewTransaction}
              />
            </div>
          )}

          {/* TAB 3: COFRE (CAIXINHAS & METAS) */}
          {currentTab === 'vault' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <VaultView />
            </div>
          )}

          {/* TAB 4: CHAT / ANOTAÇÕES DO CASAL (ESTILO WHATSAPP) */}
          {currentTab === 'chat' && (
            <div className="animate-in fade-in duration-150">
              <ChatView />
            </div>
          )}
        </main>

        {/* Fixed Mobile Bottom Tab Bar (Thumb Zone) */}
        <MobileBottomNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenNewTransaction={handleOpenNewTransaction}
        />

        {/* Modals as Mobile Bottom Sheets */}
        <TransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setTransactionToEdit(null);
          }}
          transactionToEdit={transactionToEdit}
        />

        <SupabaseModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onOpenSupabase={() => {
            setIsSettingsModalOpen(false);
            setIsSupabaseModalOpen(true);
          }}
        />

        <CoupleSyncModal
          isOpen={isCoupleSyncModalOpen}
          onClose={() => setIsCoupleSyncModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <DashboardContent />
    </FinanceProvider>
  );
}
