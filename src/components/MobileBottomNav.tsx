import React from 'react';
import { Home, ReceiptText, Plus, HandCoins, PiggyBank, MessageCircle, BarChart3 } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: 'dashboard' | 'transactions' | 'charts' | 'loans' | 'vault' | 'chat';
  setCurrentTab: (tab: 'dashboard' | 'transactions' | 'charts' | 'loans' | 'vault' | 'chat') => void;
  onOpenNewTransaction: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewTransaction,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg">
      <div className="max-w-md mx-auto px-1 py-1 flex items-center justify-between h-16">
        {/* Tab 1: Início */}
        <button
          type="button"
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-colors cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className={`w-4.5 h-4.5 ${currentTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight truncate">Início</span>
        </button>

        {/* Tab 2: Extrato */}
        <button
          type="button"
          onClick={() => setCurrentTab('transactions')}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-colors cursor-pointer ${
            currentTab === 'transactions'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ReceiptText className={`w-4.5 h-4.5 ${currentTab === 'transactions' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight truncate">Extrato</span>
        </button>

        {/* Tab 3: Gráficos */}
        <button
          type="button"
          onClick={() => setCurrentTab('charts')}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-colors cursor-pointer ${
            currentTab === 'charts'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className={`w-4.5 h-4.5 ${currentTab === 'charts' ? 'stroke-[2.5] text-emerald-600' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight truncate">Gráficos</span>
        </button>

        {/* Tab Central: Primary Action [+] */}
        <div className="flex items-center justify-center px-0.5 shrink-0">
          <button
            type="button"
            onClick={onOpenNewTransaction}
            className="w-11 h-11 -mt-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 border-3 border-white transition-all cursor-pointer"
            aria-label="Novo Lançamento"
            title="Novo Lançamento"
          >
            <Plus className="w-5 h-5 stroke-[2.75]" />
          </button>
        </div>

        {/* Tab 4: Emprestado */}
        <button
          type="button"
          onClick={() => setCurrentTab('loans')}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-colors cursor-pointer ${
            currentTab === 'loans'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HandCoins className={`w-4.5 h-4.5 ${currentTab === 'loans' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight truncate">Emprést.</span>
        </button>

        {/* Tab 5: Cofre */}
        <button
          type="button"
          onClick={() => setCurrentTab('vault')}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-colors cursor-pointer ${
            currentTab === 'vault'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PiggyBank className={`w-4.5 h-4.5 ${currentTab === 'vault' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight truncate">Cofre</span>
        </button>

        {/* Tab 6: Chat */}
        <button
          type="button"
          onClick={() => setCurrentTab('chat')}
          className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-colors cursor-pointer relative ${
            currentTab === 'chat'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageCircle className={`w-4.5 h-4.5 ${currentTab === 'chat' ? 'stroke-[2.5] text-emerald-600' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight truncate">Chat</span>
        </button>
      </div>
    </div>
  );
};
