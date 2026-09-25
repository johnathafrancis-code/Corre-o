import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { HandCoins, ChevronRight, Calendar, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoanSummaryCardProps {
  onOpenNewLoan?: () => void;
  onViewAll?: () => void;
}

export const LoanSummaryCard: React.FC<LoanSummaryCardProps> = ({
  onOpenNewLoan,
  onViewAll,
}) => {
  const { loans, partners } = useFinance();

  const activeLoans = loans.filter(l => l.status === 'pending');
  const totalOwed = activeLoans.reduce((acc, l) => acc + Math.max(0, l.amount - l.paidAmount), 0);
  const totalPaid = loans.reduce((acc, l) => acc + (l.paidAmount || 0), 0);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <HandCoins className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 leading-tight">
              Dinheiro Emprestado
            </h3>
            <p className="text-[10px] text-slate-500">
              Controle do que foi pego e quando vai pagar
            </p>
          </div>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
          >
            <span>Ver detalhes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Metric Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Total a Pagar
          </span>
          <span className="text-lg font-bold font-mono text-slate-900 leading-tight">
            {formatCurrency(totalOwed)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 block">
            {activeLoans.length} {activeLoans.length === 1 ? 'pendência ativa' : 'pendências ativas'}
          </span>
          {totalPaid > 0 && (
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3 h-3" />
              <span>{formatCurrency(totalPaid)} já pago</span>
            </span>
          )}
        </div>
      </div>

      {/* Loan Items Preview */}
      {activeLoans.length === 0 ? (
        <div className="py-4 text-center rounded-xl bg-emerald-50/50 border border-emerald-100/60 p-3 space-y-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-emerald-800">
            Nenhum dinheiro emprestado em aberto!
          </p>
          <p className="text-[10.5px] text-emerald-700">
            Todas as pendências com terceiros estão quitadas.
          </p>
          {onOpenNewLoan && (
            <button
              type="button"
              onClick={onOpenNewLoan}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-500 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pegou emprestado? Registrar</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {activeLoans.slice(0, 3).map(loan => {
            const borrowerName =
              loan.borrower === 'partner1'
                ? partners.partner1Name
                : loan.borrower === 'partner2'
                ? partners.partner2Name
                : 'Casal';
            
            const remaining = Math.max(0, loan.amount - loan.paidAmount);
            const isOverdue = loan.dueDate < today;

            return (
              <div
                key={loan.id}
                onClick={onViewAll}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
              >
                <div className="min-w-0 pr-2 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {loan.lenderName}
                    </span>
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600">
                      {borrowerName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10.5px] text-slate-500">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Pagar até: <b className={isOverdue ? 'text-rose-600' : 'text-slate-700'}>{formatDateBR(loan.dueDate)}</b></span>
                    {isOverdue && (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1 rounded flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" /> Vencido
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold font-mono text-slate-900 block">
                    {formatCurrency(remaining)}
                  </span>
                  {loan.paidAmount > 0 && (
                    <span className="text-[9px] text-emerald-600 font-medium">
                      {formatCurrency(loan.paidAmount)} pago
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-1">
            {onOpenNewLoan && (
              <button
                type="button"
                onClick={onOpenNewLoan}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar novo empréstimo</span>
              </button>
            )}

            {onViewAll && activeLoans.length > 3 && (
              <button
                type="button"
                onClick={onViewAll}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                + {activeLoans.length - 3} mais
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
