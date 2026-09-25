import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { VaultGoal, TransactionOwner } from '../types/finance';
import { formatCurrency, getTodayString } from '../utils/formatters';
import {
  PiggyBank,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Sparkles,
  History,
  Trash2,
  Calendar,
  X,
  Check,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { id: 'sky', bg: 'bg-sky-500', light: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  { id: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { id: 'violet', bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { id: 'amber', bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { id: 'rose', bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
];

export const VaultView: React.FC = () => {
  const {
    vaultGoals,
    partners,
    activeDeviceUser,
    addVaultGoal,
    deleteVaultGoal,
    addVaultDeposit,
  } = useFinance();

  // Modals state
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [depositModalGoal, setDepositModalGoal] = useState<VaultGoal | null>(null);
  const [withdrawModalGoal, setWithdrawModalGoal] = useState<VaultGoal | null>(null);
  const [expandedHistoryGoalId, setExpandedHistoryGoalId] = useState<string | null>(null);

  // New goal form state
  const [goalName, setGoalName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [initialAmountStr, setInitialAmountStr] = useState('');
  const [goalColor, setGoalColor] = useState('emerald');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalNotes, setGoalNotes] = useState('');

  // Deposit form state
  const [depositAmountStr, setDepositAmountStr] = useState('');
  const [depositOwner, setDepositOwner] = useState<TransactionOwner>(activeDeviceUser);
  const [depositDate, setDepositDate] = useState(getTodayString());
  const [depositNotes, setDepositNotes] = useState('');

  // Withdraw form state
  const [withdrawAmountStr, setWithdrawAmountStr] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');

  // Totals
  const totalSaved = vaultGoals.reduce((acc, g) => acc + (g.currentAmount || 0), 0);
  const totalTarget = vaultGoals.reduce((acc, g) => acc + (g.targetAmount || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Handle Create Goal
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmount = parseFloat(targetAmountStr.replace(',', '.'));
    if (isNaN(targetAmount) || targetAmount <= 0) return;

    const initialAmount = parseFloat(initialAmountStr.replace(',', '.')) || 0;

    await addVaultGoal(
      {
        name: goalName.trim() || 'Nova Caixinha',
        targetAmount,
        currentAmount: initialAmount,
        color: goalColor,
        deadline: goalDeadline || undefined,
        notes: goalNotes.trim() || undefined,
      },
      initialAmount
    );

    // Reset form
    setGoalName('');
    setTargetAmountStr('');
    setInitialAmountStr('');
    setGoalDeadline('');
    setGoalNotes('');
    setIsNewGoalModalOpen(false);
  };

  // Handle Deposit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalGoal) return;

    const amount = parseFloat(depositAmountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    await addVaultDeposit(
      depositModalGoal.id,
      amount,
      'deposit',
      depositOwner,
      depositNotes.trim() || undefined
    );

    setDepositAmountStr('');
    setDepositNotes('');
    setDepositModalGoal(null);
  };

  // Handle Withdraw
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawModalGoal) return;

    const amount = parseFloat(withdrawAmountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    await addVaultDeposit(
      withdrawModalGoal.id,
      amount,
      'withdraw',
      activeDeviceUser,
      withdrawNotes.trim() || 'Resgate da caixinha'
    );

    setWithdrawAmountStr('');
    setWithdrawNotes('');
    setWithdrawModalGoal(null);
  };

  const getColorConfig = (colorId?: string) => {
    return COLOR_OPTIONS.find(c => c.id === colorId) || COLOR_OPTIONS[0];
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Total Guardado no Cofre */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-2 -bottom-2 opacity-10 pointer-events-none">
          <PiggyBank className="w-36 h-36" />
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-100 tracking-wide">
                Cofre do Casal · Metas & Sonhos
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsNewGoalModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Nova Meta</span>
            </button>
          </div>

          <div>
            <span className="text-[11px] text-emerald-100/90 font-medium block">
              Total Guardado em Caixinhas
            </span>
            <div className="text-2xl font-black font-mono tracking-tight">
              {formatCurrency(totalSaved)}
            </div>
          </div>

          {/* Overall Progress */}
          <div className="space-y-1.5 pt-1 border-t border-emerald-500/40">
            <div className="flex items-center justify-between text-[11px] text-emerald-100 font-semibold">
              <span>Meta total: {formatCurrency(totalTarget)}</span>
              <span>{overallProgress}% alcançado</span>
            </div>
            <div className="w-full bg-emerald-950/30 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* List of Goals / Caixinhas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-600" />
            <span>Nossas Caixinhas ({vaultGoals.length})</span>
          </h3>

          <span className="text-[11px] text-slate-500">
            Toque em Guardar para lançar aportes
          </span>
        </div>

        {vaultGoals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Nenhuma caixinha criada ainda
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Crie sua primeira meta financeira para guardar dinheiro juntos para viagens, reserva de emergência ou compras futuras.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewGoalModalOpen(true)}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Criar Primeira Caixinha</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vaultGoals.map((goal) => {
              const colorCfg = getColorConfig(goal.color);
              const progress =
                goal.targetAmount > 0
                  ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                  : 0;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
              const isCompleted = goal.currentAmount >= goal.targetAmount;
              const isHistoryOpen = expandedHistoryGoalId === goal.id;

              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3 hover:border-slate-300 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl ${colorCfg.light} ${colorCfg.text} flex items-center justify-center shrink-0 border ${colorCfg.border}`}
                      >
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {goal.name}
                          </h4>
                          {isCompleted && (
                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Alcançada! 🎉
                            </span>
                          )}
                        </div>
                        {goal.notes && (
                          <p className="text-[11px] text-slate-500 truncate">
                            {goal.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Delete Caixinha */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Deseja remover a caixinha "${goal.name}"?`)) {
                          deleteVaultGoal(goal.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Excluir meta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 block">
                        Guardado até agora
                      </span>
                      <span className="text-lg font-extrabold font-mono text-slate-900 tabular-nums">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">
                        Meta Alvo
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-700 tabular-nums">
                        {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">
                        {progress}% concluído
                      </span>
                      <span className="text-slate-500">
                        {remaining > 0
                          ? `Faltam ${formatCurrency(remaining)}`
                          : 'Meta 100% atingida!'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`${colorCfg.bg} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons: Guardar Dinheiro / Resgatar / Histórico */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setDepositModalGoal(goal);
                        setDepositAmountStr('');
                        setDepositOwner(activeDeviceUser);
                      }}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Guardar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWithdrawModalGoal(goal);
                        setWithdrawAmountStr('');
                      }}
                      disabled={goal.currentAmount <= 0}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-semibold text-xs border border-slate-200 transition-all cursor-pointer disabled:opacity-40"
                    >
                      Resgatar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHistoryGoalId(isHistoryOpen ? null : goal.id)
                      }
                      className="px-2.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Ver extrato de aportes"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium">
                        {goal.deposits?.length || 0}
                      </span>
                      {isHistoryOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* History of Deposits for this Goal */}
                  {isHistoryOpen && (
                    <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Extrato da Caixinha ({goal.deposits?.length || 0} lançamentos):
                      </span>

                      {!goal.deposits || goal.deposits.length === 0 ? (
                        <p className="text-[11px] text-slate-500 py-1">
                          Nenhum aporte registrado nesta caixinha ainda.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {goal.deposits.map((dep) => {
                            const isDeposit = dep.type === 'deposit';
                            const author =
                              dep.owner === 'partner1'
                                ? partners.partner1Name
                                : dep.owner === 'partner2'
                                ? partners.partner2Name
                                : 'Casal';

                            return (
                              <div
                                key={dep.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isDeposit ? 'bg-emerald-500' : 'bg-rose-500'
                                      }`}
                                    />
                                    <span className="font-semibold text-slate-800">
                                      {isDeposit ? 'Guardado por ' : 'Resgate por '}
                                      {author}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500">
                                    {dep.date} {dep.notes ? `· ${dep.notes}` : ''}
                                  </span>
                                </div>

                                <span
                                  className={`font-mono font-bold shrink-0 ${
                                    isDeposit ? 'text-emerald-700' : 'text-rose-700'
                                  }`}
                                >
                                  {isDeposit ? '+ ' : '- '}
                                  {formatCurrency(dep.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL: NOVA CAIXINHA ================= */}
      {isNewGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Nova Caixinha / Meta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewGoalModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome da Caixinha
                </label>
                <input
                  type="text"
                  placeholder="Ex: Viagem de Férias 2026, Reserva..."
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>

              {/* Target Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Valor Alvo da Meta (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm font-semibold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={targetAmountStr}
                    onChange={(e) => setTargetAmountStr(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2 text-lg font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Initial Saved Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Valor Inicial Já Guardado (Opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs font-semibold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={initialAmountStr}
                    onChange={(e) => setInitialAmountStr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Cor da Caixinha
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setGoalColor(c.id)}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-transform cursor-pointer flex items-center justify-center ${
                        goalColor === c.id ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {goalColor === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadline & Notes */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Prazo Estimado
                  </label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-mono text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Observação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Banco Inter..."
                    value={goalNotes}
                    onChange={(e) => setGoalNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Criar Caixinha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GUARDAR / APORTAR DINHEIRO ================= */}
      {depositModalGoal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Guardar Dinheiro na Caixinha
                </h3>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  {depositModalGoal.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDepositModalGoal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Valor a Guardar
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm font-semibold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={depositAmountStr}
                    onChange={(e) => setDepositAmountStr(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-xl font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Who is saving */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quem está guardando este valor?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDepositOwner('partner1')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                      depositOwner === 'partner1'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{partners.partner1Name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDepositOwner('partner2')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                      depositOwner === 'partner2'
                        ? 'bg-pink-50 border-pink-400 text-pink-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{partners.partner2Name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDepositOwner('shared')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                      depositOwner === 'shared'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Ambos / Casal</span>
                  </button>
                </div>
              </div>

              {/* Date & Note */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-mono text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Observação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Sobra do mês..."
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar Aporte no Cofre</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESGATAR DINHEIRO ================= */}
      {withdrawModalGoal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Resgatar Dinheiro da Caixinha
                </h3>
                <span className="text-[11px] text-slate-500">
                  Saldo disponível:{' '}
                  <b className="font-mono text-emerald-700">
                    {formatCurrency(withdrawModalGoal.currentAmount)}
                  </b>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWithdrawModalGoal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Valor a Retirar
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm font-semibold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    max={withdrawModalGoal.currentAmount}
                    value={withdrawAmountStr}
                    onChange={(e) => setWithdrawAmountStr(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-xl font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-rose-600 shadow-xs tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Compra das passagens, emergência..."
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-rose-600 shadow-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar Resgate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
