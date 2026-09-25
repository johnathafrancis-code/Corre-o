import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  generateCoupleShareUrl,
  exportCoupleDataToString,
  parseCoupleDataFromString,
} from '../utils/syncLink';

interface CoupleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CoupleSyncModal: React.FC<CoupleSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    loans,
    transactions,
    vaultGoals,
    partners,
    activeDeviceUser,
    forceSyncNow,
    importCoupleData,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [isServerSyncing, setIsServerSyncing] = useState(false);

  if (!isOpen) return null;

  const currentUserName =
    activeDeviceUser === 'partner1'
      ? partners.partner1Name
      : partners.partner2Name;

  const otherPartnerName =
    activeDeviceUser === 'partner1'
      ? partners.partner2Name
      : partners.partner1Name;

  const handleShareWhatsApp = () => {
    const shareUrl = generateCoupleShareUrl({
      loans,
      transactions,
      vaultGoals,
      partners,
      sourceDevice: currentUserName,
    });

    const msg = `Oi meu amor! ❤️ Aqui estão os empréstimos e lançamentos financeiros que atualizei no nosso app. Toque neste link para sincronizar tudo no seu celular:\n\n${shareUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = () => {
    const shareUrl = generateCoupleShareUrl({
      loans,
      transactions,
      vaultGoals,
      partners,
      sourceDevice: currentUserName,
    });

    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyCode = () => {
    const code = exportCoupleDataToString({
      loans,
      transactions,
      vaultGoals,
      partners,
      sourceDevice: currentUserName,
    });

    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleApplyPaste = () => {
    setImportStatus(null);
    if (!pasteInput.trim()) {
      setImportStatus({
        success: false,
        message: 'Por favor, cole o código ou link recebido do outro celular.',
      });
      return;
    }

    const pkg = parseCoupleDataFromString(pasteInput);
    if (!pkg) {
      setImportStatus({
        success: false,
        message: 'Código inválido. Verifique se copiou todo o link ou código enviado.',
      });
      return;
    }

    const countLoans = (pkg.loans || []).length;
    const countTx = (pkg.transactions || []).length;

    importCoupleData(pkg);

    setImportStatus({
      success: true,
      message: `🎉 Sucesso! Foram sincronizados ${countLoans} empréstimos e ${countTx} lançamentos com sucesso!`,
    });
    setPasteInput('');

    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleManualServerSync = async () => {
    setIsServerSyncing(true);
    try {
      await forceSyncNow();
      setImportStatus({
        success: true,
        message: '⚡ Servidor consultado! Se o outro aparelho já enviou os dados, eles foram carregados.',
      });
    } catch (e) {
      setImportStatus({
        success: false,
        message: 'Falha ao conectar com o servidor.',
      });
    } finally {
      setIsServerSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                Sincronização Direta do Casal
              </h3>
              <span className="text-[10.5px] text-slate-500">
                Transfira empréstimos e finanças entre celulares
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('send')}
              className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
                activeTab === 'send'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📤 Enviar para {otherPartnerName}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('receive')}
              className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
                activeTab === 'receive'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📥 Receber no meu celular
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {importStatus && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                importStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{importStatus.message}</div>
            </div>
          )}

          {activeTab === 'send' ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                <span className="text-xs font-bold text-emerald-950 block mb-1">
                  Se você é quem cadastrou os empréstimos:
                </span>
                <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                  Envie o link direto para o celular de {otherPartnerName}. Ao tocar no link, o celular dele(a) importa todos os {loans.length} empréstimos e lançamentos na hora, sem precisar configurar nada!
                </p>
              </div>

              {/* Botão WhatsApp */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar para {otherPartnerName} no WhatsApp</span>
              </button>

              {/* Botão Copiar Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Link de Sincronização Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copiar Link de Sincronização Direta</span>
                  </>
                )}
              </button>

              {/* Botão Copiar Código de Backup */}
              <button
                type="button"
                onClick={handleCopyCode}
                className="w-full py-2 px-3 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedCode ? (
                  <span className="text-emerald-700 font-bold">Código copiado para colar no outro aparelho!</span>
                ) : (
                  <span>Ou copiar código textual para colar no outro aparelho</span>
                )}
              </button>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Empréstimos cadastrados neste aparelho:</span>
                  <span className="font-bold text-slate-800">{loans.length}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
                <span className="text-xs font-bold text-blue-950 block mb-1">
                  Se você não vê os empréstimos no seu celular:
                </span>
                <p className="text-[11.5px] text-blue-800 leading-relaxed">
                  Peça para sua esposa tocar em <strong>"Enviar no WhatsApp"</strong> ou colar o link/código abaixo para sincronizar no seu celular instantaneamente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Cole o link ou código enviado por ela:
                </label>
                <textarea
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder="Cole aqui o link ou código copiado do celular dela..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyPaste}
                disabled={!pasteInput.trim()}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Importar e Sincronizar Tudo Agora</span>
              </button>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Ou tente buscar via servidor:
                </span>
                <button
                  type="button"
                  onClick={handleManualServerSync}
                  disabled={isServerSyncing}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isServerSyncing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
                  <span>{isServerSyncing ? 'Buscando do servidor...' : 'Buscar do Servidor Compartilhado'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
