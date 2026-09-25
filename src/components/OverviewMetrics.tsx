import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatMonthName } from '../utils/formatters';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Users, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { MonthPickerModal } from './MonthPickerModal';

export const OverviewMetrics: React.FC = () => {
  const {
    transactions,
    partners,
    selectedMonth,
    setSelectedMonth,
    filterOwner,
    setFilterOwner,
  } = useFinance();

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${prevYear}-${prevMonth}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const nextYear = date.getFullYear();
    const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextYear}-${nextMonth}`);
  };

  // Filter transactions for current selected month
  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  const transactionMonths = Array.from(new Set(transactions.map(t => t.date.slice(0, 7))));

  // Transactions filtered by perspective
  const filteredTransactions = monthTransactions.filter(t => {
    if (filterOwner === 'all') return true;
    return t.owner === filterOwner;
  });

  // Totals
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Breakdown by partner (all expenses in this month)
  const p1Expenses = monthTransactions
    .filter(t => t.type === 'expense' && t.owner === 'partner1')
    .reduce((sum, t) => sum + t.amount, 0);

  const p2Expenses = monthTransactions
    .filter(t => t.type === 'expense' && t.owner === 'partner2')
    .reduce((sum, t) => sum + t.amount, 0);

  const sharedExpenses = monthTransactions
    .filter(t => t.type === 'expense' && t.owner === 'shared')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalAllExpenses = p1Expenses + p2Expenses + sharedExpenses;

  return (
    <div className="space-y-3.5">
      {/* 1. Month Navigator Bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200/90 px-3 py-1.5 shadow-xs">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Mês Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsMonthPickerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition-all text-xs font-bold text-slate-800 capitalize tracking-tight cursor-pointer group"
          title="Clique para abrir o calendário e selecionar o mês"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          <span>{formatMonthName(selectedMonth)}</span>
        </button>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Próximo Mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Hero Balance Card (White & Clean) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">
              {filterOwner === 'all'
                ? 'Saldo do Mês (Casal)'
                : filterOwner === 'partner1'
                ? `Saldo (${partners.partner1Name})`
                : filterOwner === 'partner2'
                ? `Saldo (${partners.partner2Name})`
                : 'Saldo (Gastos Compartilhados)'}
            </span>
            {totalIncome > 0 && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                netBalance >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {savingsRate.toFixed(0)}% poupado
              </span>
            )}
          </div>

          <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
            {formatCurrency(netBalance)}
          </div>
        </div>

        {/* Incomes & Expenses Pills */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-100/80">
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-0.5">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receitas</span>
            </div>
            <div className="text-base font-bold text-emerald-800 font-mono tabular-nums">
              {formatCurrency(totalIncome)}
            </div>
          </div>

          <div className="bg-rose-50/70 rounded-xl p-2.5 border border-rose-100/80">
            <div className="flex items-center gap-1.5 text-rose-700 text-xs font-semibold mb-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Despesas</span>
            </div>
            <div className="text-base font-bold text-rose-800 font-mono tabular-nums">
              {formatCurrency(totalExpense)}
            </div>
          </div>
        </div>

        {/* 3. Perspective Filter Pills */}
        <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterOwner('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterOwner === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterOwner('partner1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterOwner === 'partner1'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {partners.partner1Name}
          </button>
          <button
            type="button"
            onClick={() => setFilterOwner('partner2')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterOwner === 'partner2'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {partners.partner2Name}
          </button>
          <button
            type="button"
            onClick={() => setFilterOwner('shared')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterOwner === 'shared'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Compartilhado
          </button>
        </div>
      </div>

      {/* 4. Mini Partner Spending Distribution Cards */}
      {totalAllExpenses > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-xs">
            <span className="text-[10px] text-slate-500 font-medium block truncate">
              {partners.partner1Name}
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5 tabular-nums truncate">
              {formatCurrency(p1Expenses)}
            </span>
            <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">
              {totalAllExpenses > 0 ? ((p1Expenses / totalAllExpenses) * 100).toFixed(0) : 0}%
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-xs">
            <span className="text-[10px] text-slate-500 font-medium block truncate">
              {partners.partner2Name}
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5 tabular-nums truncate">
              {formatCurrency(p2Expenses)}
            </span>
            <span className="text-[10px] text-pink-600 font-semibold block mt-0.5">
              {totalAllExpenses > 0 ? ((p2Expenses / totalAllExpenses) * 100).toFixed(0) : 0}%
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-xs">
            <span className="text-[10px] text-slate-500 font-medium block truncate">
              Compartilhado
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5 tabular-nums truncate">
              {formatCurrency(sharedExpenses)}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              {totalAllExpenses > 0 ? ((sharedExpenses / totalAllExpenses) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      ) : null}

      {/* Month Picker Calendar Modal */}
      <MonthPickerModal
        isOpen={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        transactionMonths={transactionMonths}
      />
    </div>
  );
};
