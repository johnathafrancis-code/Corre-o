import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X, Check } from 'lucide-react';
import { getCurrentMonthString } from '../utils/formatters';

interface MonthPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string; // 'YYYY-MM'
  onSelectMonth: (month: string) => void;
  transactionMonths?: string[]; // array of YYYY-MM that have transactions
}

const MONTH_NAMES = [
  { num: '01', short: 'Jan', full: 'Janeiro' },
  { num: '02', short: 'Fev', full: 'Fevereiro' },
  { num: '03', short: 'Mar', full: 'Março' },
  { num: '04', short: 'Abr', full: 'Abril' },
  { num: '05', short: 'Mai', full: 'Maio' },
  { num: '06', short: 'Jun', full: 'Junho' },
  { num: '07', short: 'Jul', full: 'Julho' },
  { num: '08', short: 'Ago', full: 'Agosto' },
  { num: '09', short: 'Set', full: 'Setembro' },
  { num: '10', short: 'Out', full: 'Outubro' },
  { num: '11', short: 'Nov', full: 'Novembro' },
  { num: '12', short: 'Dez', full: 'Dezembro' },
];

export const MonthPickerModal: React.FC<MonthPickerModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  onSelectMonth,
  transactionMonths = [],
}) => {
  const currentActualMonth = getCurrentMonthString();
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const [y] = selectedMonth.split('-').map(Number);
    return isNaN(y) ? new Date().getFullYear() : y;
  });

  useEffect(() => {
    if (isOpen) {
      const [y] = selectedMonth.split('-').map(Number);
      if (!isNaN(y)) setCurrentYear(y);
    }
  }, [isOpen, selectedMonth]);

  if (!isOpen) return null;

  const handleSelect = (monthNum: string) => {
    const formatted = `${currentYear}-${monthNum}`;
    onSelectMonth(formatted);
    onClose();
  };

  const handleGoToCurrentMonth = () => {
    onSelectMonth(currentActualMonth);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xs sm:max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">
              Selecionar Mês
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Year Selector Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentYear(y => y - 1)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
            title="Ano anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold font-mono text-slate-900">
            {currentYear}
          </span>

          <button
            type="button"
            onClick={() => setCurrentYear(y => y + 1)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
            title="Próximo ano"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Months Grid (3 columns x 4 rows) */}
        <div className="p-3.5 grid grid-cols-3 gap-2">
          {MONTH_NAMES.map(m => {
            const monthCode = `${currentYear}-${m.num}`;
            const isSelected = selectedMonth === monthCode;
            const isCurrent = currentActualMonth === monthCode;
            const hasActivity = transactionMonths.includes(monthCode);

            return (
              <button
                key={m.num}
                type="button"
                onClick={() => handleSelect(m.num)}
                className={`py-2.5 px-2 rounded-xl text-center transition-all cursor-pointer relative flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs scale-[1.02]'
                    : isCurrent
                    ? 'bg-emerald-50 text-emerald-800 font-bold border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white hover:bg-slate-50 text-slate-700 font-semibold border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-xs">{m.short}</span>
                <span className={`text-[9.5px] truncate max-w-full ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                  {m.full}
                </span>

                {/* Indicators */}
                <div className="flex items-center gap-1 mt-0.5">
                  {isCurrent && !isSelected && (
                    <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-100/80 px-1 rounded">
                      Atual
                    </span>
                  )}
                  {hasActivity && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Possui lançamentos" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleGoToCurrentMonth}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
          >
            Ir para Mês Atual
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
