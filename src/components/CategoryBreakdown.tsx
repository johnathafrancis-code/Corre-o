import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { DEFAULT_CATEGORIES } from '../data/defaultData';
import { formatCurrency, formatMonthName } from '../utils/formatters';
import { PieChart, ArrowRight } from 'lucide-react';

interface CategoryBreakdownProps {
  onSelectCategory?: (categoryId: string) => void;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ onSelectCategory }) => {
  const { transactions, selectedMonth } = useFinance();

  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  const expenseTransactions = monthTransactions.filter(t => t.type === 'expense');
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const categoryMap: Record<string, { categoryId: string; amount: number; count: number }> = {};

  expenseTransactions.forEach(tx => {
    if (!categoryMap[tx.category]) {
      categoryMap[tx.category] = { categoryId: tx.category, amount: 0, count: 0 };
    }
    categoryMap[tx.category].amount += tx.amount;
    categoryMap[tx.category].count += 1;
  });

  const categoryList = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              Gastos por Categoria
            </h3>
            <span className="text-[10px] text-slate-500">
              Distribuição do mês
            </span>
          </div>
        </div>

        <span className="text-xs font-bold text-rose-700 font-mono tabular-nums">
          {formatCurrency(totalExpense)}
        </span>
      </div>

      {categoryList.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-xs">
          Nenhuma despesa registrada neste mês.
        </div>
      ) : (
        <div className="space-y-2.5 pt-1">
          {categoryList.map(item => {
            const catInfo = DEFAULT_CATEGORIES.find(c => c.id === item.categoryId) || {
              name: item.categoryId,
              color: '#94a3b8',
            };
            const percentage = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0;

            return (
              <button
                key={item.categoryId}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(item.categoryId)}
                className="w-full text-left group p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: catInfo.color }}
                    />
                    <span>{catInfo.name}</span>
                    <span className="text-[10px] text-slate-600">({item.count})</span>
                  </span>

                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex items-center">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: catInfo.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
