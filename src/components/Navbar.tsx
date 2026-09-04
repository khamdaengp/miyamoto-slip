import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { MIYAMOTO_LOGO_BASE64 } from '../assets/logo';
import { getPeriodInfo } from '../utils/formatters';

interface NavbarProps {
  periodId: string;
  activeTab: 'admin' | 'slip';
  onTabChange: (tab: 'admin' | 'slip') => void;
  hasData: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  periodId,
  activeTab,
  onTabChange,
  hasData,
}) => {
  const periodInfo = getPeriodInfo(periodId);

  return (
    <header className="w-full max-w-6xl mx-auto mb-4 sm:mb-6 bg-[#111827]/90 backdrop-blur-md border border-slate-800/80 p-3.5 sm:p-4 rounded-xl shadow-2xl no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg max-w-[80px] sm:max-w-[95px] border border-slate-700/60 shrink-0 shadow-sm flex items-center justify-center">
              <img src={MIYAMOTO_LOGO_BASE64} alt="Miyamoto AC Logo" className="max-h-6 sm:max-h-7 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Miyamoto AC
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#0097E0] bg-[#0097E0]/10 px-2 py-0.5 rounded-full border border-[#0097E0]/20 hidden sm:inline-block">
                  Salary Viewer
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium leading-relaxed">
                ລະບົບຈັດການ ແລະ ແຈ້ງໃບເງິນເດືອນ (Lao Payroll Dispatch)
              </p>
            </div>
          </div>

          <div className="text-right sm:hidden">
            <span className="text-[11px] font-mono font-semibold text-[#0097E0] bg-[#0A0E17] px-2.5 py-1 rounded-full border border-slate-700">
              {periodId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="text-right hidden sm:block mr-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">ງວດເດືອນ (Period)</div>
            <div className="text-xs font-semibold font-mono text-[#0097E0] flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0097E0] animate-pulse"></span>
              <span>{periodInfo.displayMonthLao} ({periodId})</span>
            </div>
          </div>

          <nav aria-label="Main Navigation" className="w-full sm:w-auto">
            <div role="tablist" aria-label="Dashboard Views" className="flex w-full bg-[#0A0E17] p-1 rounded-lg border border-slate-800 gap-1 shadow-inner">
              <button
                role="tab"
                id="tab-admin"
                aria-selected={activeTab === 'admin'}
                aria-controls="panel-admin"
                onClick={() => onTabChange('admin')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer min-h-[38px] sm:min-h-[36px] focus-visible:ring-2 focus-visible:ring-[#0077b6] focus-visible:outline-none ${
                  activeTab === 'admin'
                    ? 'bg-[#0077b6] text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Admin Dashboard</span>
              </button>
              {hasData && (
                <button
                  role="tab"
                  id="tab-slip"
                  aria-selected={activeTab === 'slip'}
                  aria-controls="panel-slip"
                  onClick={() => onTabChange('slip')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer min-h-[38px] sm:min-h-[36px] focus-visible:ring-2 focus-visible:ring-[#0077b6] focus-visible:outline-none ${
                    activeTab === 'slip'
                      ? 'bg-[#0077b6] text-white shadow-md font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">ໃບແຈ້ງເງິນເດືອນ</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};
