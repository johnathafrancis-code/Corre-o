import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { X, Check, HeartHandshake, Trash2, AlertTriangle, Database } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupabase?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenSupabase }) => {
  const { partners, updatePartners, clearAllTransactions, transactions, supabaseStatus } = useFinance();

  const [p1Name, setP1Name] = useState(partners.partner1Name);
  const [p2Name, setP2Name] = useState(partners.partner2Name);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePartners({
      partner1Name: p1Name.trim() || 'Johnatha',
      partner2Name: p2Name.trim() || 'Raisa',
    });
    onClose();
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    await clearAllTransactions();
    setIsClearing(false);
    setShowClearConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Ajustes do Casal
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          <form onSubmit={handleSave} className="space-y-4">
            {/* Partner 1 Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nome do Parceiro 1
              </label>
              <input
                type="text"
                value={p1Name}
                onChange={(e) => setP1Name(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            {/* Partner 2 Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nome do Parceiro 2
              </label>
              <input
                type="text"
                value={p2Name}
                onChange={(e) => setP2Name(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salvar Alterações</span>
            </button>
          </form>

          {/* Cloud Supabase Sync Shortcut */}
          {onOpenSupabase && (
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onOpenSupabase}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Conexão em Tempo Real (Supabase)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {supabaseStatus.isConnected ? 'Conectado à nuvem' : 'Configurar sincronização'}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700">
                  {supabaseStatus.isConnected ? 'Ativo' : 'Conectar'}
                </span>
              </button>
            </div>
          )}

          {/* Danger Zone: Zerar Dados */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Zerar Lançamentos</span>
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Exclui permanentemente todos os lançamentos cadastrados no dispositivo e no servidor para iniciar o controle financeiro do casal do zero.
            </p>

            {showClearConfirm ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Tem certeza? Esta ação apagará todos os {transactions.length} lançamentos.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors"
                  >
                    {isClearing ? 'Zerando...' : 'Sim, Zerar Tudo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Zerar todos os lançamentos ({transactions.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
