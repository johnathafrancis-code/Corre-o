import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatMonthName, getTodayString } from '../utils/formatters';
import { HeartHandshake, CheckCircle2, ArrowRight, DollarSign, Scale } from 'lucide-react';

export const BalanceSettlementCard: React.FC = () => {
  const { transactions, partners, selectedMonth, addTransaction } = useFinance();
  const [settledSuccess, setSettledSuccess] = useState(false);

  // Month transactions
  const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  // Shared expenses
  const sharedExpenses = monthTransactions.filter(t => t.type === 'expense' && t.owner === 'shared');
  const totalShared = sharedExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Who paid what
  const p1PaidShared = sharedExpenses
    .filter(t => {
      const note = (t.notes || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const p1 = partners.partner1Name.toLowerCase();
      return note.includes(p1) || desc.includes(p1) || (!note.includes(partners.partner2Name.toLowerCase()) && !desc.includes(partners.partner2Name.toLowerCase()));
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const p2PaidShared = totalShared - p1PaidShared;

  // Split target
  const ratioP1 = partners.splitRatio; // default 0.5 (50%)
  const ratioP2 = 1 - ratioP1;

  const targetP1 = totalShared * ratioP1;
  const targetP2 = totalShared * ratioP2;

  // Balance: who owes whom
  const balance = p1PaidShared - targetP1;
  const whoOwes = balance > 0.01 ? partners.partner2Name : (balance < -0.01 ? partners.partner1Name : null);
  const whoReceives = balance > 0.01 ? partners.partner1Name : (balance < -0.01 ? partners.partner2Name : null);
  const settlementAmount = Math.abs(balance);

  const handleRegisterSettlement = async () => {
    if (!whoOwes || settlementAmount <= 0) return;

    await addTransaction({
      description: `Acerto de Contas Pix: ${whoOwes} -> ${whoReceives}`,
      amount: Number(settlementAmount.toFixed(2)),
      type: 'expense',
      category: 'outros_gastos',
      owner: whoOwes === partners.partner1Name ? 'partner1' : 'partner2',
      date: getTodayString(),
      payment_method: 'pix',
      status: 'paid',
      notes: `Transferência realizada para equilibrar as despesas de ${formatMonthName(selectedMonth)}.`,
    });

    setSettledSuccess(true);
    setTimeout(() => setSettledSuccess(false), 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
              Divisão & Balanço
            </h3>
            <span className="text-[10px] text-slate-500">
              Despesas da casa e acertos
            </span>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
          {Math.round(ratioP1 * 100)}% / {Math.round(ratioP2 * 100)}%
        </span>
      </div>

      {totalShared === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
          <Scale className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            Nenhuma despesa compartilhada ainda
          </p>
          <p className="text-[11px] text-slate-500">
            Ao lançar um gasto comum (mercado, aluguel, contas), selecione <strong>Compartilhado</strong> para calcular o acerto.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-indigo-700 font-semibold">
                {partners.partner1Name}: {formatCurrency(p1PaidShared)}
              </span>
              <span className="text-pink-700 font-semibold">
                {partners.partner2Name}: {formatCurrency(p2PaidShared)}
              </span>
            </div>

            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-indigo-500 h-full transition-all"
                style={{ width: `${totalShared > 0 ? (p1PaidShared / totalShared) * 100 : 50}%` }}
              />
              <div
                className="bg-pink-500 h-full transition-all"
                style={{ width: `${totalShared > 0 ? (p2PaidShared / totalShared) * 100 : 50}%` }}
              />
            </div>

            <div className="text-[10px] text-slate-500 text-center">
              Total compartilhado no mês: <strong className="text-slate-800">{formatCurrency(totalShared)}</strong>
            </div>
          </div>

          {/* Acerto status */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            {whoOwes && settlementAmount > 0.05 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Para equilibrar as contas:</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Pendente
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {whoOwes} transfere para {whoReceives}
                    </span>
                    <span className="text-[10px] text-slate-500">via Pix</span>
                  </div>
                  <span className="text-lg font-extrabold text-emerald-700 font-mono tabular-nums">
                    {formatCurrency(settlementAmount)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRegisterSettlement}
                  disabled={settledSuccess}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{settledSuccess ? 'Acerto Registrado!' : 'Registrar Acerto Feito'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-1 text-emerald-700 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Contas perfeitamente equilibradas! Ninguém deve nada.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
