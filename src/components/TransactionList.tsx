import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType, TransactionOwner } from '../types/finance';
import { PAYMENT_METHOD_LABELS } from '../data/defaultData';
import { formatCurrency, formatDateBR, formatMonthName } from '../utils/formatters';
import {
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Copy,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { MonthPickerModal } from './MonthPickerModal';

interface TransactionListProps {
  onEditTransaction: (tx: Transaction) => void;
  onNewTransaction: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  onEditTransaction,
  onNewTransaction,
}) => {
  const {
    transactions,
    partners,
    selectedMonth,
    setSelectedMonth,
    deleteTransaction,
    updateTransaction,
    addTransaction,
  } = useFinance();

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const transactionMonths = useMemo(() => Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))), [transactions]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income' | 'pending'>('all');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'partner1' | 'partner2' | 'shared'>('all');
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      // Month
      if (!tx.date.startsWith(selectedMonth)) return false;

      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesNotes = tx.notes?.toLowerCase().includes(query) || false;
        if (!matchesDesc && !matchesNotes) return false;
      }

      // Type / Status
      if (typeFilter === 'expense' && tx.type !== 'expense') return false;
      if (typeFilter === 'income' && tx.type !== 'income') return false;
      if (typeFilter === 'pending' && tx.status !== 'pending') return false;

      // Owner
      if (ownerFilter !== 'all' && tx.owner !== ownerFilter) return false;

      return true;
    });
  }, [transactions, selectedMonth, searchTerm, typeFilter, ownerFilter]);

  const toggleStatus = async (tx: Transaction) => {
    const newStatus = tx.status === 'paid' ? 'pending' : 'paid';
    await updateTransaction({ ...tx, status: newStatus });
  };

  const handleDuplicate = async (tx: Transaction) => {
    await addTransaction({
      description: `${tx.description} (Cópia)`,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      owner: tx.owner,
      date: tx.date,
      payment_method: tx.payment_method,
      status: tx.status,
      notes: tx.notes,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      await deleteTransaction(id);
      setSelectedTxForDetail(null);
    }
  };

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Categoria', 'Responsável', 'Pagamento', 'Status', 'Observações'];
    const rows = filtered.map(t => [
      t.date,
      t.type === 'expense' ? 'Despesa' : 'Receita',
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.category,
      t.owner === 'partner1' ? partners.partner1Name : (t.owner === 'partner2' ? partners.partner2Name : 'Compartilhado'),
      PAYMENT_METHOD_LABELS[t.payment_method] || t.payment_method,
      t.status === 'paid' ? 'Pago' : 'Pendente',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lancamentos-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Month Navigator Bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200/90 px-3 py-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => {
            const [year, month] = selectedMonth.split('-').map(Number);
            const date = new Date(year, month - 2, 1);
            const prevYear = date.getFullYear();
            const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
            setSelectedMonth(`${prevYear}-${prevMonth}`);
          }}
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
          onClick={() => {
            const [year, month] = selectedMonth.split('-').map(Number);
            const date = new Date(year, month, 1);
            const nextYear = date.getFullYear();
            const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
            setSelectedMonth(`${nextYear}-${nextMonth}`);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Próximo Mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar lançamento ou nota..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200/90 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 shadow-xs"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs (Horizontal Scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            typeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900'
          }`}
        >
          Todos ({filtered.length})
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('expense')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            typeFilter === 'expense'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900'
          }`}
        >
          Despesas
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('income')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            typeFilter === 'income'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900'
          }`}
        >
          Receitas
        </button>

        <button
          type="button"
          onClick={() => setTypeFilter('pending')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            typeFilter === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900'
          }`}
        >
          Pendentes
        </button>

        {filtered.length > 0 && (
          <button
            type="button"
            onClick={exportCSV}
            className="ml-auto p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Exportar CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Nenhum lançamento encontrado
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {searchTerm
                  ? 'Nenhum resultado corresponde à sua pesquisa.'
                  : 'Comece adicionando seu primeiro gasto ou ganho do casal tocando no botão abaixo!'}
              </p>
            </div>
            <button
              type="button"
              onClick={onNewTransaction}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lançamento</span>
            </button>
          </div>
        ) : (
          filtered.map(tx => {
            const isExpense = tx.type === 'expense';
            const isPaid = tx.status === 'paid';

            const ownerName =
              tx.owner === 'partner1'
                ? partners.partner1Name
                : tx.owner === 'partner2'
                ? partners.partner2Name
                : 'Compartilhado';

            const ownerBadgeColor =
              tx.owner === 'partner1'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                : tx.owner === 'partner2'
                ? 'bg-pink-50 text-pink-700 border-pink-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-100';

            return (
              <div
                key={tx.id}
                className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs hover:border-slate-300 transition-all space-y-2"
              >
                {/* Main Row */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Type icon (Receita / Despesa) */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-xs ${
                        isExpense
                          ? 'bg-rose-50 text-rose-600 border-rose-100'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}
                    >
                      {isExpense ? (
                        <ArrowDownLeft className="w-4 h-4 stroke-[2.2]" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {tx.description}
                      </h4>

                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${ownerBadgeColor}`}>
                          {ownerName}
                        </span>

                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDateBR(tx.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Status */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold font-mono tabular-nums ${
                        isExpense ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {isExpense ? '- ' : '+ '}
                      {formatCurrency(tx.amount)}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleStatus(tx)}
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5 transition-colors cursor-pointer ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                      title="Toque para alternar entre Pago e Pendente"
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Pago</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-2.5 h-2.5 text-amber-600" />
                          <span>Pendente</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Notes if available */}
                {tx.notes && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    {tx.notes}
                  </p>
                )}

                {/* Quick Action Footer */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(tx)}
                    className="p-1 text-slate-500 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                    title="Duplicar lançamento"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    className="flex items-center gap-1 p-1 text-slate-600 hover:text-slate-900 rounded-md transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(tx.id)}
                    className="p-1 text-rose-500 hover:text-rose-700 rounded-md transition-colors cursor-pointer ml-1"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

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
