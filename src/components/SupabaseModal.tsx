import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  clearStoredSupabaseConfig,
  testSupabaseConnection,
  getSupabaseSqlSchema,
} from '../lib/supabase';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Check,
  Zap,
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { supabaseStatus, refreshTransactions, migrateLocalToSupabase } = useFinance();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tableExists: boolean;
    tables?: {
      transactions: boolean;
      loans: boolean;
      chat_messages: boolean;
    };
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredSupabaseConfig();
      if (config) {
        setUrl(config.url);
        setAnonKey(config.anonKey);
      }
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(url, anonKey);
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSaveAndConnect = async () => {
    saveStoredSupabaseConfig(url, anonKey);
    await refreshTransactions();
    onClose();
  };

  const handleDisconnect = async () => {
    clearStoredSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    await refreshTransactions();
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    await migrateLocalToSupabase();
    setIsMigrating(false);
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(getSupabaseSqlSchema());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden" />

        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                Sincronização Supabase
              </h3>
              <span className="text-[10px] text-slate-500">
                Nuvem e tempo real entre celulares
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

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status banner */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 ${
              supabaseStatus.isConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                supabaseStatus.isConnected
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <div className="flex-1">
              <span className="font-bold block">
                {supabaseStatus.isConnected
                  ? 'Supabase Conectado em Tempo Real!'
                  : 'Sincronização Local / SSE Ativa'}
              </span>
              <span className="text-[11px] text-slate-500">
                {supabaseStatus.isConnected
                  ? 'Mudanças são refletidas instantaneamente nos aparelhos.'
                  : 'Configure as credenciais abaixo para sincronizar na nuvem Supabase.'}
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Project URL (Supabase)
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value.trim())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                anon / public API Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value.trim())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-2 ${
                  testResult.success
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="font-semibold block leading-tight">{testResult.message}</span>
                </div>

                {testResult.tables && (
                  <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-3 gap-1.5 text-[11px]">
                    <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-medium ${testResult.tables.transactions ? 'bg-white text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                      {testResult.tables.transactions ? <Check className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-rose-600" />}
                      <span className="truncate">Transações</span>
                    </div>
                    <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-medium ${testResult.tables.loans ? 'bg-white text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                      {testResult.tables.loans ? <Check className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-rose-600" />}
                      <span className="truncate">Empréstimos</span>
                    </div>
                    <div className={`px-2 py-1 rounded-lg border flex items-center gap-1 font-medium ${testResult.tables.chat_messages ? 'bg-white text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                      {testResult.tables.chat_messages ? <Check className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-rose-600" />}
                      <span className="truncate">Chat Casal</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Test button & Save button */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !url || !anonKey}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTesting ? 'Testando...' : 'Testar Conexão'}
              </button>

              <button
                type="button"
                onClick={handleSaveAndConnect}
                disabled={!url || !anonKey}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Salvar & Conectar
              </button>
            </div>

            {supabaseStatus.isConfigured && (
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleMigrate}
                  disabled={isMigrating}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isMigrating ? 'Sincronizando...' : 'Enviar Dados Locais para o Supabase (Upload)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full py-1.5 text-rose-600 hover:text-rose-700 text-[11px] font-semibold cursor-pointer"
                >
                  Desconectar Supabase
                </button>
              </div>
            )}
          </div>

          {/* SQL Script Box */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">
                Script SQL para criar tabela no Supabase:
              </span>
              <button
                type="button"
                onClick={copySqlToClipboard}
                className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-700 font-mono overflow-x-auto max-h-32">
              {getSupabaseSqlSchema()}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
