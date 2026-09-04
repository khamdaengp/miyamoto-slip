import { useState, useEffect } from 'react';
import { EmployeeRecord } from './types/payroll';
import { getDefaultPeriodId } from './utils/formatters';
import { loadEmployeesFromStorage } from './utils/storage';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/AdminDashboard';
import { Payslip } from './components/Payslip';
import { PayslipModal } from './components/PayslipModal';
import { Printer, ArrowLeft, Send } from 'lucide-react';
import { openWhatsAppPayslip } from './utils/whatsapp';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

export default function App() {
  // Query parameters initialization
  const urlParams = new URLSearchParams(window.location.search);
  const initialEmpId = urlParams.get('id');
  const initialPeriod = urlParams.get('period') || getDefaultPeriodId();

  const [periodId, setPeriodId] = useState<string>(initialPeriod);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'admin' | 'slip'>(initialEmpId ? 'slip' : 'admin');
  const [modalEmployee, setModalEmployee] = useState<EmployeeRecord | null>(null);

  // Hardware Back Button listener on Android mobile
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;
    let handlePromise = CapacitorApp.addListener('backButton', () => {
      if (!isMounted) return;
      if (modalEmployee) {
        setModalEmployee(null);
      } else if (activeTab === 'slip') {
        setActiveTab('admin');
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      isMounted = false;
      handlePromise.then(handler => handler.remove());
    };
  }, [modalEmployee, activeTab]);

  // Load data from localStorage on period change
  useEffect(() => {
    const loaded = loadEmployeesFromStorage(periodId);
    setEmployees(loaded);

    if (initialEmpId && loaded.length > 0) {
      const match = loaded.find(
        (e) => e.employeeId.toUpperCase() === initialEmpId.toUpperCase() || e.id === initialEmpId
      );
      if (match) {
        setSelectedEmployee(match);
        setActiveTab('slip');
      }
    } else if (loaded.length > 0 && !selectedEmployee) {
      setSelectedEmployee(loaded[0]);
    }
  }, [periodId, initialEmpId]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriodId(newPeriod);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('period', newPeriod);
    window.history.pushState({}, '', newUrl.toString());
  };

  const handleViewEmployee = (emp: EmployeeRecord) => {
    setModalEmployee(emp);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0] flex flex-col p-2 sm:p-4 md:p-6 font-['Noto_Sans_Lao',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        periodId={periodId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasData={employees.length > 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto">
        {activeTab === 'admin' ? (
          <div id="panel-admin" role="tabpanel" aria-labelledby="tab-admin">
            <AdminDashboard
              periodId={periodId}
              employees={employees}
              onPeriodChange={handlePeriodChange}
              onEmployeesUpdated={setEmployees}
              onViewEmployee={handleViewEmployee}
            />
          </div>
        ) : (
          /* Full Page Payslip View */
          <div id="panel-slip" role="tabpanel" aria-labelledby="tab-slip" className="space-y-4">
            {/* Payslip View Controls (Hidden when printing) */}
            <div className="bg-[#151b28]/95 p-4 rounded-xl border border-slate-800/90 shadow-xl shadow-black/25 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
              <button
                onClick={() => setActiveTab('admin')}
                aria-label="ກັບຄືນໜ້າ Dashboard"
                className="flex items-center gap-1.5 text-slate-200 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer min-h-[36px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>ກັບຄືນ Dashboard</span>
              </button>

              {/* Employee Selector Dropdown */}
              {employees.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label htmlFor="emp-select" className="text-xs text-slate-300 font-medium">
                    ເລືອກພະນັກງານ:
                  </label>
                  <select
                    id="emp-select"
                    value={selectedEmployee?.employeeId || ''}
                    onChange={(e) => {
                      const found = employees.find((emp) => emp.employeeId === e.target.value);
                      if (found) setSelectedEmployee(found);
                    }}
                    className="bg-slate-950 text-white border border-slate-700 text-xs rounded-lg px-3 py-2 focus:border-[#0097E0] focus-visible:ring-2 focus-visible:ring-[#0077b6] focus:outline-none flex-1 sm:flex-none min-h-[36px]"
                  >
                    {employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.employeeId} - {emp.name} ({emp.position})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                {selectedEmployee && (
                  <button
                    onClick={() => openWhatsAppPayslip(selectedEmployee, periodId)}
                    aria-label={`ສົ່ງໃບແຈ້ງເງິນເດືອນຜ່ານ WhatsApp ໃຫ້ ${selectedEmployee.name}`}
                    className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebd5c] active:scale-[0.98] text-[#0f172a] text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer min-h-[36px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  >
                    <Send className="w-3.5 h-3.5 text-[#0f172a]" aria-hidden="true" />
                    <span>WhatsApp</span>
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  aria-label="ພິມໃບແຈ້ງເງິນເດືອນ (Print A4)"
                  className="flex items-center gap-1.5 bg-[#0077b6] hover:bg-[#005f92] active:scale-[0.98] text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm cursor-pointer min-h-[36px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ພິມ (Print A4)</span>
                </button>
              </div>
            </div>

            {/* Document container */}
            {selectedEmployee ? (
              <div className="w-full flex justify-center">
                <div className="w-full max-w-[680px]">
                  <Payslip employee={selectedEmployee} periodId={periodId} isCompact={false} />
                </div>
              </div>
            ) : (
              <div className="bg-[#151b28]/95 p-8 rounded-xl border border-slate-800 text-center text-slate-300 text-sm">
                ບໍ່ພົບຂໍ້ມູນພະນັກງານ. ກະລຸນາກັບໄປທີ່ Dashboard ເພື່ອອັບໂຫຼດໄຟລ໌ Excel.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quick View Modal */}
      <PayslipModal
        employee={modalEmployee}
        periodId={periodId}
        isOpen={Boolean(modalEmployee)}
        onClose={() => setModalEmployee(null)}
        employees={employees}
        onSelectEmployee={setModalEmployee}
      />
    </div>
  );
}
