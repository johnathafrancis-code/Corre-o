import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType, TransactionOwner, PaymentMethod, TransactionStatus } from '../types/finance';
import { PAYMENT_METHOD_LABELS } from '../data/defaultData';
import { getTodayString, addMonthsToDate, formatCurrency, formatMonthName } from '../utils/formatters';
import { X, Check, ArrowDownLeft, ArrowUpRight, CreditCard, Calendar } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transactionToEdit,
}) => {
  const { partners, activeDeviceUser, addTransaction, addTransactions, updateTransaction } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('supermercado');
  const [owner, setOwner] = useState<TransactionOwner>(activeDeviceUser);
  const [date, setDate] = useState(getTodayString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [status, setStatus] = useState<TransactionStatus>('paid');
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setDescription(transactionToEdit.description);
      setAmountStr(String(transactionToEdit.amount));
      setCategory(transactionToEdit.category);
      setOwner(transactionToEdit.owner);
      setDate(transactionToEdit.date);
      setPaymentMethod(transactionToEdit.payment_method);
      setStatus(transactionToEdit.status);
      setNotes(transactionToEdit.notes || '');
      setInstallments(1);
    } else {
      setType('expense');
      setDescription('');
      setAmountStr('');
      setCategory('supermercado');
      setOwner(activeDeviceUser);
      setDate(getTodayString());
      setPaymentMethod('pix');
      setStatus('paid');
      setNotes('');
      setInstallments(1);
    }
    setErrorMessage(null);
  }, [transactionToEdit, isOpen, activeDeviceUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numericAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Por favor, informe um valor maior que zero.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Por favor, digite o nome do lançamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (transactionToEdit) {
        await updateTransaction({
          ...transactionToEdit,
          description: description.trim(),
          amount: numericAmount,
          type,
          category,
          owner,
          date,
          payment_method: paymentMethod,
          status,
          notes: notes.trim() || undefined,
        });
      } else if (type === 'expense' && paymentMethod === 'cartao_credito' && installments > 1) {
        // Multi-installment creation across subsequent months
        const baseParcel = +(numericAmount / installments).toFixed(2);
        const remainder = +(numericAmount - (baseParcel * installments)).toFixed(2);

        const items: Omit<Transaction, 'id'>[] = [];
        for (let i = 0; i < installments; i++) {
          const isFirst = i === 0;
          const currentParcelAmount = isFirst ? +(baseParcel + remainder).toFixed(2) : baseParcel;
          const parcelDate = addMonthsToDate(date, i);
          const parcelNum = i + 1;

          items.push({
            description: `${description.trim()} (${parcelNum}/${installments})`,
            amount: currentParcelAmount,
            type: 'expense',
            category,
            owner,
            date: parcelDate,
            payment_method: 'cartao_credito',
            status: isFirst ? status : 'pending',
            notes: notes.trim()
              ? `${notes.trim()} · Parcela ${parcelNum}/${installments}`
              : `Parcela ${parcelNum}/${installments} no cartão de crédito`,
          });
        }

        await addTransactions(items);
      } else {
        await addTransaction({
          description: description.trim(),
          amount: numericAmount,
          type,
          category,
          owner,
          date,
          payment_method: paymentMethod,
          status,
          notes: notes.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Grab Handle */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            {transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Type Toggle: Despesa vs Receita */}
          <div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory('supermercado');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white text-rose-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Despesa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategory('salario');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>Receita</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Valor
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm font-semibold">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-xl font-bold font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors tabular-nums shadow-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Mercado da Semana, Conta de Luz..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors shadow-xs"
            />
          </div>

          {/* Quem Pagou / Quem Recebeu */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {type === 'expense' ? 'Quem Pagou / Responsável' : 'Quem Recebeu'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOwner('partner1')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer font-medium text-xs sm:text-sm ${
                  owner === 'partner1'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate block">{partners.partner1Name || 'Johnatha'}</span>
              </button>

              <button
                type="button"
                onClick={() => setOwner('partner2')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer font-medium text-xs sm:text-sm ${
                  owner === 'partner2'
                    ? 'bg-pink-50 border-pink-400 text-pink-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate block">{partners.partner2Name || 'Raisa'}</span>
              </button>

              <button
                type="button"
                onClick={() => setOwner('shared')}
                className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer font-medium text-xs sm:text-sm ${
                  owner === 'shared'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate block">Compartilhado</span>
              </button>
            </div>
          </div>

          {/* Data e Forma de Pagamento */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono text-xs shadow-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs shadow-xs"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Status do Lançamento
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setStatus('paid')}
                className={`py-1.5 rounded-lg text-center font-bold text-xs transition-all cursor-pointer ${
                  status === 'paid'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pago
              </button>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`py-1.5 rounded-lg text-center font-bold text-xs transition-all cursor-pointer ${
                  status === 'pending'
                    ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendente
              </button>
            </div>
          </div>

          {/* Credit Card Installments */}
          {type === 'expense' && paymentMethod === 'cartao_credito' && !transactionToEdit && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Quantas parcelas foram comprometidas?</span>
                </label>
                {installments > 1 && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg border border-emerald-200">
                    {installments}x no Cartão
                  </span>
                )}
              </div>

              <div>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 text-xs shadow-xs"
                >
                  <option value={1}>1x (À vista no cartão)</option>
                  <option value={2}>2x (2 parcelas)</option>
                  <option value={3}>3x (3 parcelas)</option>
                  <option value={4}>4x (4 parcelas)</option>
                  <option value={5}>5x (5 parcelas)</option>
                  <option value={6}>6x (6 parcelas)</option>
                  <option value={7}>7x (7 parcelas)</option>
                  <option value={8}>8x (8 parcelas)</option>
                  <option value={9}>9x (9 parcelas)</option>
                  <option value={10}>10x (10 parcelas)</option>
                  <option value={11}>11x (11 parcelas)</option>
                  <option value={12}>12x (12 parcelas)</option>
                  <option value={15}>15x (15 parcelas)</option>
                  <option value={18}>18x (18 parcelas)</option>
                  <option value={24}>24x (24 parcelas)</option>
                  <option value={36}>36x (36 parcelas)</option>
                  <option value={48}>48x (48 parcelas)</option>
                </select>
              </div>

              {installments > 1 && (
                <div className="pt-2 border-t border-slate-200/80 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Valor de cada parcela:</span>
                    <span className="font-bold font-mono text-slate-900 text-xs">
                      {installments}x de {formatCurrency(Math.max(0, (parseFloat(amountStr.replace(',', '.')) || 0) / installments))}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Lançamentos automáticos para os meses seguintes:</span>
                    </div>
                    <p className="text-[10.5px] text-emerald-800 leading-relaxed">
                      A 1ª parcela entra no mês atual (<b>{formatMonthName(date.substring(0, 7))}</b>) e as outras {installments - 1} parcelas já serão agendadas mês a mês até <b>{formatMonthName(addMonthsToDate(date, installments - 1).substring(0, 7))}</b>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Parcela 1 de 3, pago no cartão da Raisa..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
