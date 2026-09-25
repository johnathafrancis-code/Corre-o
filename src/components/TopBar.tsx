import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Database, Settings, Volume2, VolumeX, Banknote } from 'lucide-react';

interface TopBarProps {
  onOpenNewTransaction: () => void;
  onOpenSupabaseModal: () => void;
  onOpenSettingsModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenNewTransaction,
  onOpenSupabaseModal,
  onOpenSettingsModal,
}) => {
  const {
    partners,
    activeDeviceUser,
    setActiveDeviceUser,
    supabaseStatus,
    soundEnabled,
    setSoundEnabled,
  } = useFinance();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3.5 pt-2.5 pb-2 shadow-xs">
      <div className="max-w-md mx-auto space-y-2">
        {/* Top line: Left (Supabase sync), Center (Centered Brand with Money Icon), Right (Sound & Settings Gear) */}
        <div className="grid grid-cols-3 items-center">
          {/* Left: Supabase / Cloud connection status */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={onOpenSupabaseModal}
              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                supabaseStatus.isConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title={
                supabaseStatus.isConnected
                  ? 'Supabase Conectado em Tempo Real'
                  : 'Conectar Supabase'
              }
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database className="w-3.5 h-3.5" />
              <span className="hidden xs:inline text-[10px]">
                {supabaseStatus.isConnected ? 'Nuvem' : 'Local'}
              </span>
            </button>
          </div>

          {/* Center: Brand (100% Centralized with Money Icon) */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100/90 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
                <Banknote className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
                Finanças a Dois
              </h1>
            </div>
            <span className="text-[10px] text-slate-500 font-medium tracking-tight mt-0.5">
              Controle Compartilhado
            </span>
          </div>

          {/* Right: Sound toggle + Settings Gear right next to it */}
          <div className="flex items-center justify-end gap-1">
            {/* Sound toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={soundEnabled ? 'Som de notificação ativado' : 'Som desativado'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Gear Icon for Settings (Ajustes) */}
            <button
              type="button"
              onClick={onOpenSettingsModal}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Ajustes do Casal"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom line: Centralized Device User Switcher (Johnatha / Raisa) */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveDeviceUser('partner1')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeDeviceUser === 'partner1'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={`Este celular pertence a ${partners.partner1Name}`}
            >
              <span>{partners.partner1Name}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDeviceUser('partner2')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeDeviceUser === 'partner2'
                  ? 'bg-white text-pink-700 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={`Este celular pertence a ${partners.partner2Name}`}
            >
              <span>{partners.partner2Name}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
