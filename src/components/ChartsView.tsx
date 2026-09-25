import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatMonthName } from '../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Users,
  Wallet,
  Sparkles,
  Info,
} from 'lucide-react';

export const ChartsView: React.FC = () => {
  const { transactions, selectedMonth, partners } = useFinance();
  const [activeView, setActiveView] = useState<'month' | 'history'>('month');

  // Filter current month transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const monthExpenses = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'expense');
  }, [monthTransactions]);

  const monthIncome = useMemo(() => {
    return monthTransactions.filter(t => t.type === 'income');
  }, [monthTransactions]);

  const totalExpense = useMemo(() => {
    return monthExpenses.reduce((sum, t) => sum + t.amount, 0);
  }, [monthExpenses]);

  const totalIncome = useMemo(() => {
    return monthIncome.reduce((sum, t) => sum + t.amount, 0);
  }, [monthIncome]);

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netBalance / totalIncome) * 100)) : 0;

  // Breakdown by Owner
  const ownerBreakdown = useMemo(() => {
    const p1Name = partners.partner1Name || 'Johnatha';
    const p2Name = partners.partner2Name || 'Raisa';

    let p1Amount = 0;
    let p2Amount = 0;
    let sharedAmount = 0;

    monthExpenses.forEach(tx => {
      if (tx.owner === 'partner1') p1Amount += tx.amount;
      else if (tx.owner === 'partner2') p2Amount += tx.amount;
      else sharedAmount += tx.amount;
    });

    const p1Percent = totalExpense > 0 ? Math.round((p1Amount / totalExpense) * 100) : 0;
    const p2Percent = totalExpense > 0 ? Math.round((p2Amount / totalExpense) * 100) : 0;
    const sharedPercent = totalExpense > 0 ? Math.max(0, 100 - p1Percent - p2Percent) : 0;

    return {
      p1: { name: p1Name, amount: p1Amount, percent: p1Percent, color: '#059669' },
      p2: { name: p2Name, amount: p2Amount, percent: p2Percent, color: '#8b5cf6' },
      shared: { name: 'Compartilhado', amount: sharedAmount, percent: sharedPercent, color: '#f59e0b' },
    };
  }, [monthExpenses, partners, totalExpense]);

  // Daily Spending for current month
  const dailySpending = useMemo(() => {
    if (!selectedMonth || !selectedMonth.includes('-')) return [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const days: { day: number; dateStr: string; amount: number }[] = [];
    const spendingMap: Record<number, number> = {};

    monthExpenses.forEach(tx => {
      const dayNum = parseInt(tx.date.split('-')[2], 10);
      if (dayNum) {
        spendingMap[dayNum] = (spendingMap[dayNum] || 0) + tx.amount;
      }
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr,
        amount: spendingMap[d] || 0,
      });
    }

    return days;
  }, [monthExpenses, selectedMonth]);

  const maxDailyExpense = useMemo(() => {
    return Math.max(...dailySpending.map(d => d.amount), 1);
  }, [dailySpending]);

  // Last 6 months trend
  const historyData = useMemo(() => {
    const result: { monthKey: string; label: string; income: number; expense: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${d.getFullYear()}-${mStr}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      const mTx = transactions.filter(t => t.date.startsWith(monthKey));
      const inc = mTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      result.push({ monthKey, label, income: inc, expense: exp });
    }
    return result;
  }, [transactions]);

  const maxHistoryValue = useMemo(() => {
    return Math.max(
      ...historyData.map(h => Math.max(h.income, h.expense)),
      1
    );
  }, [historyData]);

  return (
    <div className="space-y-4">
      {/* Header and View Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                Análise Financeira
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {formatMonthName(selectedMonth)}
              </span>
            </div>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveView('month')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeView === 'month'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês Atual
            </button>
            <button
              type="button"
              onClick={() => setActiveView('history')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeView === 'history'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 Meses
            </button>
          </div>
        </div>

        {/* Quick Month Metrics */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-slate-100">
          <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100/60">
            <span className="text-[10px] text-emerald-800 font-medium block">Entradas</span>
            <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums truncate block">
              {formatCurrency(totalIncome)}
            </span>
          </div>
          <div className="bg-rose-50/60 rounded-xl p-2.5 border border-rose-100/60">
            <span className="text-[10px] text-rose-800 font-medium block">Saídas</span>
            <span className="text-xs font-bold text-rose-700 font-mono tabular-nums truncate block">
              {formatCurrency(totalExpense)}
            </span>
          </div>
          <div className={`rounded-xl p-2.5 border ${
            netBalance >= 0 ? 'bg-sky-50/60 border-sky-100/60 text-sky-800' : 'bg-amber-50/60 border-amber-100/60 text-amber-800'
          }`}>
            <span className="text-[10px] font-medium block">Saldo Líquido</span>
            <span className={`text-xs font-bold font-mono tabular-nums truncate block ${
              netBalance >= 0 ? 'text-sky-700' : 'text-amber-700'
            }`}>
              {formatCurrency(netBalance)}
            </span>
          </div>
        </div>

        {/* Savings Rate Bar */}
        {totalIncome > 0 && (
          <div className="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Taxa de Poupança do Mês
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono">
                {savingsRate}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  savingsRate >= 30 ? 'bg-emerald-500' : savingsRate >= 10 ? 'bg-sky-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {activeView === 'month' ? (
        <>
          {/* Divisão por Responsável / Titular */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Despesas por Titular
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-700 font-mono tabular-nums">
                {formatCurrency(totalExpense)}
              </span>
            </div>

            {totalExpense === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                Nenhuma despesa para exibir neste mês.
              </div>
            ) : (
              <>
                {/* Horizontal Multi-Bar */}
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  {ownerBreakdown.p1.percent > 0 && (
                    <div
                      style={{ width: `${ownerBreakdown.p1.percent}%`, backgroundColor: ownerBreakdown.p1.color }}
                      title={`${ownerBreakdown.p1.name}: ${ownerBreakdown.p1.percent}%`}
                    />
                  )}
                  {ownerBreakdown.p2.percent > 0 && (
                    <div
                      style={{ width: `${ownerBreakdown.p2.percent}%`, backgroundColor: ownerBreakdown.p2.color }}
                      title={`${ownerBreakdown.p2.name}: ${ownerBreakdown.p2.percent}%`}
                    />
                  )}
                  {ownerBreakdown.shared.percent > 0 && (
                    <div
                      style={{ width: `${ownerBreakdown.shared.percent}%`, backgroundColor: ownerBreakdown.shared.color }}
                      title={`Compartilhado: ${ownerBreakdown.shared.percent}%`}
                    />
                  )}
                </div>

                {/* Detail Cards */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {/* Partner 1 */}
                  <div className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span className="text-[11px] font-bold text-slate-800 truncate">
                        {ownerBreakdown.p1.name}
                      </span>
                    </div>
                    <div className="text-xs font-bold font-mono text-slate-900">
                      {formatCurrency(ownerBreakdown.p1.amount)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {ownerBreakdown.p1.percent}% do total
                    </span>
                  </div>

                  {/* Partner 2 */}
                  <div className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      <span className="text-[11px] font-bold text-slate-800 truncate">
                        {ownerBreakdown.p2.name}
                      </span>
                    </div>
                    <div className="text-xs font-bold font-mono text-slate-900">
                      {formatCurrency(ownerBreakdown.p2.amount)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {ownerBreakdown.p2.percent}% do total
                    </span>
                  </div>

                  {/* Shared */}
                  <div className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-[11px] font-bold text-slate-800 truncate">
                        Compartilhado
                      </span>
                    </div>
                    <div className="text-xs font-bold font-mono text-slate-900">
                      {formatCurrency(ownerBreakdown.shared.amount)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {ownerBreakdown.shared.percent}% do total
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Histórico Diário do Mês (Gráfico de Distribuição Diária) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Ritmo de Gastos Diários
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Distribuídos do dia 1 ao fim do mês
                  </span>
                </div>
              </div>
            </div>

            {totalExpense === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                Nenhum lançamento no mês para traçar o gráfico diário.
              </div>
            ) : (
              <div className="pt-2">
                {/* Visual sparkline bars */}
                <div className="h-28 flex items-end gap-1 px-1 border-b border-slate-200 pb-1">
                  {dailySpending.map(item => {
                    const heightPercent = item.amount > 0 ? Math.max(8, Math.round((item.amount / maxDailyExpense) * 100)) : 3;
                    const hasSpend = item.amount > 0;
                    return (
                      <div
                        key={item.day}
                        className="flex-1 flex flex-col items-center group relative cursor-pointer"
                      >
                        {/* Tooltip on hover/active */}
                        <div className="absolute -top-9 hidden group-hover:flex group-focus:flex flex-col items-center z-20 pointer-events-none bg-slate-900 text-white text-[9px] py-1 px-1.5 rounded shadow whitespace-nowrap">
                          <span>Dia {item.day}</span>
                          <span className="font-mono font-bold">{formatCurrency(item.amount)}</span>
                        </div>

                        <div
                          className={`w-full rounded-t transition-all ${
                            hasSpend
                              ? 'bg-emerald-500 hover:bg-emerald-600 group-hover:scale-y-105'
                              : 'bg-slate-200/70'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 px-1 font-mono">
                  <span>Dia 1</span>
                  <span>Dia 15</span>
                  <span>Dia {dailySpending.length}</span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 6-Month Evolution */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Evolução dos Últimos 6 Meses
                </h3>
                <span className="text-[10px] text-slate-500">
                  Comparativo de Entradas x Saídas
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 justify-end">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              Receitas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
              Despesas
            </span>
          </div>

          {/* Bar Chart */}
          <div className="h-44 flex items-end justify-between gap-2 border-b border-slate-200 pb-2 pt-4 px-2">
            {historyData.map(item => {
              const incHeight = item.income > 0 ? Math.max(8, Math.round((item.income / maxHistoryValue) * 100)) : 4;
              const expHeight = item.expense > 0 ? Math.max(8, Math.round((item.expense / maxHistoryValue) * 100)) : 4;

              return (
                <div key={item.monthKey} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    {/* Income Bar */}
                    <div
                      className="w-1/2 max-w-[14px] bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                      style={{ height: `${incHeight}%` }}
                      title={`Receita (${item.label}): ${formatCurrency(item.income)}`}
                    />
                    {/* Expense Bar */}
                    <div
                      className="w-1/2 max-w-[14px] bg-rose-500 rounded-t transition-all hover:bg-rose-600"
                      style={{ height: `${expHeight}%` }}
                      title={`Despesa (${item.label}): ${formatCurrency(item.expense)}`}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 mt-2 capitalize">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Monthly Table / Summary */}
          <div className="space-y-2 pt-1">
            {historyData.slice().reverse().map(item => {
              const balance = item.income - item.expense;
              return (
                <div
                  key={item.monthKey}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 capitalize block">
                      {formatMonthName(item.monthKey)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Entradas: {formatCurrency(item.income)} · Saídas: {formatCurrency(item.expense)}
                    </span>
                  </div>
                  <span
                    className={`font-bold font-mono tabular-nums ${
                      balance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {balance >= 0 ? '+ ' : ''}
                    {formatCurrency(balance)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
