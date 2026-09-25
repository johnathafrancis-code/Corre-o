import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Loan, TransactionOwner } from '../types/finance';
import { formatCurrency, formatDateBR, getTodayString } from '../utils/formatters';
import {
  HandCoins,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X,
  CreditCard,
  History,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Edit2,
} from 'lucide-react';

export const LoansView: React.FC = () => {
  const {
    loans,
    partners,
    activeDeviceUser,
    addLoan,
    updateLoan,
    deleteLoan,
    payLoan,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [isEditLoanOpen, setIsEditLoanOpen] = useState(false);
  const [selectedLoanForEdit, setSelectedLoanForEdit] = useState<Loan | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);

  // New Loan Form state
  const [lenderName, setLenderName] = useState('');
  const [borrower, setBorrower] = useState<TransactionOwner>(activeDeviceUser);
  const [amountStr, setAmountStr] = useState('');
  const [borrowDate, setBorrowDate] = useState(getTodayString());
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Loan Form state
  const [editLenderName, setEditLenderName] = useState('');
  const [editBorrower, setEditBorrower] = useState<TransactionOwner>('partner1');
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editPaidAmountStr, setEditPaidAmountStr] = useState('');
  const [editBorrowDate, setEditBorrowDate] = useState(getTodayString());
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<'pending' | 'paid'>('pending');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Payment Form state
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentPayer, setPaymentPayer] = useState<TransactionOwner>(activeDeviceUser);
  const [paymentDate, setPaymentDate] = useState(getTodayString());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Expanded payments history per loan
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});

  const today = getTodayString();

  // Metrics
  const pendingLoans = loans.filter(l => l.status === 'pending');
  const paidLoans = loans.filter(l => l.status === 'paid');

  const totalOwed = pendingLoans.reduce(
    (acc, l) => acc + Math.max(0, l.amount - l.paidAmount),
    0
  );
  const totalPaid = loans.reduce((acc, l) => acc + (l.paidAmount || 0), 0);
  const totalBorrowedEver = loans.reduce((acc, l) => acc + l.amount, 0);

  // Filtered list
  const filteredLoans = loans.filter(l => {
    if (activeTab === 'pending' && l.status !== 'pending') return false;
    if (activeTab === 'paid' && l.status !== 'paid') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const lenderMatch = l.lenderName.toLowerCase().includes(q);
      const notesMatch = (l.notes || '').toLowerCase().includes(q);
      const borrowerName =
        l.borrower === 'partner1'
          ? partners.partner1Name.toLowerCase()
          : l.borrower === 'partner2'
          ? partners.partner2Name.toLowerCase()
          : 'casal compartilhado';
      if (!lenderMatch && !notesMatch && !borrowerName.includes(q)) return false;
    }
    return true;
  });

  const handleOpenNewLoan = () => {
    setLenderName('');
    setBorrower(activeDeviceUser);
    setAmountStr('');
    setBorrowDate(getTodayString());
    setDueDate('');
    setNotes('');
    setFormError(null);
    setIsNewLoanOpen(true);
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLender = lenderName.trim();
    if (!cleanLender) {
      setFormError('Informe com quem você pegou o dinheiro emprestado.');
      return;
    }

    const cleanAmount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }

    if (!dueDate) {
      setFormError('Informe a data de quando vai pagar.');
      return;
    }

    await addLoan({
      lenderName: cleanLender,
      borrower,
      amount: cleanAmount,
      paidAmount: 0,
      borrowDate: borrowDate || getTodayString(),
      dueDate,
      status: 'pending',
      notes: notes.trim() || undefined,
    });

    setIsNewLoanOpen(false);
  };

  const handleOpenPayment = (loan: Loan) => {
    setSelectedLoanForPayment(loan);
    const remaining = Math.max(0, loan.amount - loan.paidAmount);
    setPaymentAmountStr(remaining.toFixed(2).replace('.', ','));
    setPaymentPayer(loan.borrower === 'shared' ? activeDeviceUser : loan.borrower);
    setPaymentDate(getTodayString());
    setPaymentNotes('');
    setPaymentError(null);
    setIsPaymentOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForPayment) return;

    const remaining = Math.max(0, selectedLoanForPayment.amount - selectedLoanForPayment.paidAmount);
    const cleanAmount = parseFloat(paymentAmountStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setPaymentError('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    if (cleanAmount > remaining) {
      setPaymentError(`O valor excede o saldo devedor restante (${formatCurrency(remaining)}).`);
      return;
    }

    await payLoan(
      selectedLoanForPayment.id,
      cleanAmount,
      paymentPayer,
      paymentNotes.trim() || undefined
    );

    setIsPaymentOpen(false);
    setSelectedLoanForPayment(null);
  };

  const handleOpenEditLoan = (loan: Loan) => {
    setSelectedLoanForEdit(loan);
    setEditLenderName(loan.lenderName);
    setEditBorrower(loan.borrower);
    setEditAmountStr(loan.amount.toFixed(2).replace('.', ','));
    setEditPaidAmountStr((loan.paidAmount || 0).toFixed(2).replace('.', ','));
    setEditBorrowDate(loan.borrowDate || getTodayString());
    setEditDueDate(loan.dueDate || '');
    setEditStatus(loan.status);
    setEditNotes(loan.notes || '');
    setEditError(null);
    setIsEditLoanOpen(true);
  };

  const handleSaveEditedLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForEdit) return;

    const cleanLender = editLenderName.trim();
    if (!cleanLender) {
      setEditError('Informe com quem você pegou o dinheiro emprestado.');
      return;
    }

    const cleanAmount = parseFloat(editAmountStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setEditError('Informe um valor total válido maior que zero.');
      return;
    }

    const cleanPaid = parseFloat((editPaidAmountStr || '0').replace(/\./g, '').replace(',', '.'));
    if (isNaN(cleanPaid) || cleanPaid < 0) {
      setEditError('Informe um valor pago válido.');
      return;
    }

    if (cleanPaid > cleanAmount) {
      setEditError('O valor pago não pode ser maior que o valor total do empréstimo.');
      return;
    }

    if (!editDueDate) {
      setEditError('Informe a data de vencimento / quando vai pagar.');
      return;
    }

    const finalStatus = editStatus === 'paid' || cleanPaid >= cleanAmount ? 'paid' : 'pending';

    await updateLoan({
      ...selectedLoanForEdit,
      lenderName: cleanLender,
      borrower: editBorrower,
      amount: cleanAmount,
      paidAmount: cleanPaid,
      borrowDate: editBorrowDate || selectedLoanForEdit.borrowDate,
      dueDate: editDueDate,
      status: finalStatus,
      notes: editNotes.trim() || undefined,
      updated_at: new Date().toISOString(),
    });

    setIsEditLoanOpen(false);
    setSelectedLoanForEdit(null);
  };

  const toggleHistory = (loanId: string) => {
    setExpandedHistories(prev => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <HandCoins className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Dinheiro Emprestado
              </h2>
              <p className="text-[11px] text-slate-500">
                Acompanhe o que foi pego com terceiros e os prazos de pagamento
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNewLoan}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Empréstimo</span>
          </button>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider block">
              Total a Pagar
            </span>
            <span className="text-base font-bold font-mono text-amber-950 block mt-0.5">
              {formatCurrency(totalOwed)}
            </span>
            <span className="text-[10px] text-amber-800">
              {pendingLoans.length} pendências em aberto
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">
              Total Quitado
            </span>
            <span className="text-base font-bold font-mono text-emerald-950 block mt-0.5">
              {formatCurrency(totalPaid)}
            </span>
            <span className="text-[10px] text-emerald-800">
              {paidLoans.length} empréstimos pagos
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider block">
              Total Contratado
            </span>
            <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
              {formatCurrency(totalBorrowedEver)}
            </span>
            <span className="text-[10px] text-slate-500">
              {loans.length} registros no histórico
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Em Aberto ({pendingLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paid')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'paid'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quitados ({paidLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({loans.length})
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome, quem pegou ou notas..."
          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 shadow-2xs"
        />
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <HandCoins className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Nenhum registro encontrado
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Nenhum empréstimo corresponde ao termo pesquisado.'
                : activeTab === 'pending'
                ? 'Você não tem nenhum dinheiro emprestado em aberto! Tudo em dia.'
                : 'Nenhum registro de empréstimo nesta visualização.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewLoan}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Empréstimo</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map(loan => {
            const borrowerName =
              loan.borrower === 'partner1'
                ? partners.partner1Name
                : loan.borrower === 'partner2'
                ? partners.partner2Name
                : 'Casal (Ambos)';

            const remaining = Math.max(0, loan.amount - loan.paidAmount);
            const isOverdue = loan.status === 'pending' && loan.dueDate < today;
            const progress = Math.min(100, Math.round(((loan.paidAmount || 0) / loan.amount) * 100));
            const hasPayments = (loan.payments || []).length > 0;
            const isHistoryOpen = !!expandedHistories[loan.id];

            return (
              <div
                key={loan.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3 transition-all"
              >
                {/* Card Top: Lender & Borrower */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {loan.lenderName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                        Pegou: {borrowerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>Pegou em: {formatDateBR(loan.borrowDate)}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Pagar até:{' '}
                          <b className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800 font-semibold'}>
                            {formatDateBR(loan.dueDate)}
                          </b>
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {loan.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Quitado</span>
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Vencido</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                        <span>Em Aberto</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount & Progress */}
                <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Saldo a Pagar
                      </span>
                      <span className="text-base font-bold font-mono text-slate-900">
                        {formatCurrency(remaining)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Valor Total Pego
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-700">
                        {formatCurrency(loan.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          loan.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{progress}% amortizado ({formatCurrency(loan.paidAmount || 0)} pagos)</span>
                      <span>Restante: {formatCurrency(remaining)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes if provided */}
                {loan.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 leading-relaxed">
                    <span className="font-semibold text-slate-700">Obs: </span>
                    {loan.notes}
                  </p>
                )}

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {hasPayments && (
                      <button
                        type="button"
                        onClick={() => toggleHistory(loan.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        <span>{loan.payments.length} pagamento(s)</span>
                        {isHistoryOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenEditLoan(loan)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      title="Editar dados deste empréstimo"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Editar</span>
                    </button>

                    {loan.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleOpenPayment(loan)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Dar Baixa / Pagar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja excluir o registro deste empréstimo de "${loan.lenderName}"?`)) {
                          deleteLoan(loan.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Excluir empréstimo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Payment History */}
                {isHistoryOpen && hasPayments && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-150">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Histórico de Pagamentos / Abatimentos:
                    </span>
                    <div className="space-y-1">
                      {loan.payments.map(p => {
                        const payerName =
                          p.payer === 'partner1'
                            ? partners.partner1Name
                            : p.payer === 'partner2'
                            ? partners.partner2Name
                            : 'Casal';
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200/60"
                          >
                            <div>
                              <span className="font-semibold text-slate-800">
                                {formatDateBR(p.date)}
                              </span>
                              <span className="text-slate-500 text-[10px] ml-1.5">
                                por {payerName}
                              </span>
                              {p.notes && (
                                <span className="text-[10px] text-slate-600 block mt-0.5">
                                  {p.notes}
                                </span>
                              )}
                            </div>
                            <span className="font-bold font-mono text-emerald-700">
                              - {formatCurrency(p.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Novo Empréstimo (Pegar Emprestado) */}
      {isNewLoanOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <HandCoins className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pegar Dinheiro Emprestado
                  </h3>
                  <p className="text-[10.5px] text-slate-500">
                    Registre com quem pegou e quando vai devolver
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewLoanOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-4 space-y-3.5 overflow-y-auto">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Com quem pegou */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Com quem você pegou o dinheiro? *
                </label>
                <input
                  type="text"
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="Ex: Banco Nubank, Mãe, Carlos, Sogro, Amigo..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>

              {/* Quem pegou */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Quem pegou o empréstimo? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBorrower('partner1')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      borrower === 'partner1'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {partners.partner1Name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBorrower('partner2')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      borrower === 'partner2'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {partners.partner2Name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBorrower('shared')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      borrower === 'shared'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Casal (Ambos)
                  </button>
                </div>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Quanto foi pego emprestado? (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0,00"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                  />
                </div>
              </div>

              {/* Datas: Quando pegou & Quando vai pagar */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Data em que pegou *
                  </label>
                  <input
                    type="date"
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Quando vai pagar? *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Observações / Chave Pix de Devolução (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Pagar no 5º dia útil; Chave pix da pessoa; Taxa acordada..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewLoanOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Salvar Empréstimo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Dar Baixa / Registrar Pagamento */}
      {isPaymentOpen && selectedLoanForPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Dar Baixa / Pagar Empréstimo
                  </h3>
                  <p className="text-[10.5px] text-slate-500">
                    {selectedLoanForPayment.lenderName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-4 space-y-3.5 overflow-y-auto">
              {paymentError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Informative debt banner */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Saldo Devedor Atual
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {formatCurrency(Math.max(0, selectedLoanForPayment.amount - selectedLoanForPayment.paidAmount))}
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span>Pagar até: <b>{formatDateBR(selectedLoanForPayment.dueDate)}</b></span>
                </div>
              </div>

              {/* Valor a Pagar */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Valor a pagar / abater agora (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={paymentAmountStr}
                    onChange={(e) => setPaymentAmountStr(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                  />
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Para quitar tudo, mantenha o valor total pendente. Você também pode informar um pagamento parcial.
                </p>
              </div>

              {/* Quem está pagando */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Quem está realizando o pagamento? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentPayer('partner1')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentPayer === 'partner1'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {partners.partner1Name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentPayer('partner2')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentPayer === 'partner2'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {partners.partner2Name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentPayer('shared')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentPayer === 'shared'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Casal (Ambos)
                  </button>
                </div>
              </div>

              {/* Data do pagamento */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Data do pagamento *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>

              {/* Observação */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Comprovante / Observação (opcional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ex: Pago via Pix; Quitação antecipada..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Editar Empréstimo */}
      {isEditLoanOpen && selectedLoanForEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Editar Empréstimo
                  </h3>
                  <p className="text-[10.5px] text-slate-500">
                    Atualize os valores, prazos ou quem é o responsável
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditLoanOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedLoan} className="p-4 space-y-3.5 overflow-y-auto">
              {editError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Com quem pegou */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Com quem você pegou o dinheiro? *
                </label>
                <input
                  type="text"
                  value={editLenderName}
                  onChange={(e) => setEditLenderName(e.target.value)}
                  placeholder="Ex: Banco Nubank, Mãe, Carlos, Sogro..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              {/* Quem pegou */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Quem é o responsável? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditBorrower('partner1')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editBorrower === 'partner1'
                        ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {partners.partner1Name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditBorrower('partner2')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editBorrower === 'partner2'
                        ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {partners.partner2Name}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditBorrower('shared')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editBorrower === 'shared'
                        ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Casal (Ambos)
                  </button>
                </div>
              </div>

              {/* Status do Empréstimo */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Status da Dívida
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('pending')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editStatus === 'pending'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Em Aberto (Ativo)
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus('paid')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editStatus === 'paid'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Quitado (Pago)
                  </button>
                </div>
              </div>

              {/* Valores: Total e Já Pago */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Valor Total (R$) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editAmountStr}
                    onChange={(e) => setEditAmountStr(e.target.value)}
                    placeholder="0,00"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Já Pago / Amortizado (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editPaidAmountStr}
                    onChange={(e) => setEditPaidAmountStr(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-emerald-700 focus:bg-white focus:outline-none focus:border-blue-600 shadow-xs"
                  />
                </div>
              </div>

              {/* Datas: Quando pegou & Quando vai pagar */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Data em que pegou
                  </label>
                  <input
                    type="date"
                    value={editBorrowDate}
                    onChange={(e) => setEditBorrowDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Quando vai pagar? *
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 shadow-xs"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Observações / Chave Pix de Devolução (opcional)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Pagar no 5º dia útil; Chave pix da pessoa..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditLoanOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
