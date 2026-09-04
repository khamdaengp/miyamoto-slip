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
    <header className="w-full max-w-6xl mx-auto mb-6 bg-[#1e1e1e] border-l-4 border-[#0097E0] p-4 rounded-lg shadow-lg no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded max-w-[90px] border border-gray-700">
            <img src={MIYAMOTO_LOGO_BASE64} alt="Miyamoto AC Logo" className="max-h-7 object-contain" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Miyamoto AC - Salary Viewer
            </h2>
            <p className="text-xs text-gray-400">
              ລະບົບຈັດການ ແລະ ແຈ້ງໃບເງິນເດືອນພະນັກງານ (Lao Payroll & WhatsApp Dispatch)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <div className="text-right hidden sm:block mr-2">
            <div className="text-[11px] text-gray-400">ເດືອນປະຈຸບັນ</div>
            <div className="text-xs font-semibold text-[#0097E0]">{periodInfo.displayMonthLao} ({periodId})</div>
          </div>

          <div className="flex bg-[#121212] p-1 rounded-md border border-gray-800">
            <button
              onClick={() => onTabChange('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#0097E0] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
            {hasData && (
              <button
                onClick={() => onTabChange('slip')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition cursor-pointer ${
                  activeTab === 'slip'
                    ? 'bg-[#0097E0] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ໃບແຈ້ງເງິນເດືອນ (Payslip)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
