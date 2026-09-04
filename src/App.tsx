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
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0] flex flex-col p-3 md:p-6 font-['Noto_Sans_Lao',sans-serif]">
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
          <AdminDashboard
            periodId={periodId}
            employees={employees}
            onPeriodChange={handlePeriodChange}
            onEmployeesUpdated={setEmployees}
            onViewEmployee={handleViewEmployee}
          />
        ) : (
          /* Full Page Payslip View */
          <div className="space-y-4">
            {/* Payslip View Controls (Hidden when printing) */}
            <div className="bg-[#1e1e1e] p-4 rounded-lg border border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 no-print">
              <button
                onClick={() => setActiveTab('admin')}
                className="flex items-center gap-1.5 text-gray-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded bg-gray-800 border border-gray-700 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ກັບຄືນ Dashboard</span>
              </button>

              {/* Employee Selector Dropdown */}
              {employees.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label htmlFor="emp-select" className="text-xs text-gray-400">
                    ເລືອກພະນັກງານ:
                  </label>
                  <select
                    id="emp-select"
                    value={selectedEmployee?.employeeId || ''}
                    onChange={(e) => {
                      const found = employees.find((emp) => emp.employeeId === e.target.value);
                      if (found) setSelectedEmployee(found);
                    }}
                    className="bg-[#121212] text-white border border-gray-700 text-xs rounded px-3 py-1.5 focus:border-[#0097E0] focus:outline-none flex-1 sm:flex-none"
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
                    className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebd5c] text-white text-xs font-bold px-3 py-1.5 rounded transition shadow cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-[#0097E0] hover:bg-[#0086c7] text-white text-xs font-bold px-3 py-1.5 rounded transition shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
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
              <div className="bg-[#1e1e1e] p-8 rounded-lg text-center text-gray-400 text-sm">
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
      />
    </div>
  );
}
