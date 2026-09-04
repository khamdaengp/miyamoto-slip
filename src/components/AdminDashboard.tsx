import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Search,
  MessageCircle,
  Eye,
  CheckCircle2,
  Trash2,
  Download,
  Calendar,
  Users,
  Wallet,
  SendHorizontal
} from 'lucide-react';
import { EmployeeRecord } from '../types/payroll';
import { parseExcelFile } from '../utils/excelParser';
import { openWhatsAppPayslip } from '../utils/whatsapp';
import { clearEmployeesFromStorage, exportJsonBackup, saveEmployeesToStorage } from '../utils/storage';
import { formatNum } from '../utils/formatters';

interface AdminDashboardProps {
  periodId: string;
  employees: EmployeeRecord[];
  onPeriodChange: (newPeriod: string) => void;
  onEmployeesUpdated: (newEmployees: EmployeeRecord[]) => void;
  onViewEmployee: (employee: EmployeeRecord) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  periodId,
  employees,
  onPeriodChange,
  onEmployeesUpdated,
  onViewEmployee,
}) => {
  const [periodInput, setPeriodInput] = useState<string>(periodId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats calculation
  const stats = useMemo(() => {
    const totalCount = employees.length;
    const sentCount = employees.filter((e) => e.payslip_sent).length;
    const totalNet = employees.reduce((sum, e) => sum + e.netPay, 0);
    return {
      totalCount,
      sentCount,
      unsentCount: totalCount - sentCount,
      totalNet,
      sentPercentage: totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0,
    };
  }, [employees]);

  // Filtered employees by search query
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Handle period change
  const handleApplyPeriod = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = periodInput.trim();
    if (clean && clean !== periodId) {
      onPeriodChange(clean);
    }
  };

  // Handle Excel upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadStatus({ type: 'loading', message: `ກຳລັງອ່ານໄຟລ໌ ${file.name}... (Reading Excel...)` });

    try {
      const parsed = await parseExcelFile(file);
      onEmployeesUpdated(parsed);
      saveEmployeesToStorage(periodId, parsed);
      setUploadStatus({
        type: 'success',
        message: `✅ ບັນທຶກສຳເລັດ! ພົບພະນັກງານ ${parsed.length} ຄົນສຳລັບເດືອນ ${periodId}`,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setUploadStatus({
        type: 'error',
        message: `❌ ຜິດພາດ (Error): ${errorMsg}`,
      });
    }
  };

  // Handle Clear Storage
  const handleClearStorage = () => {
    const confirmed = window.confirm(
      `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນທ້ອງຖິ່ນສຳລັບເດືອນ ${periodId}?\n` +
      `ນີ້ຈະລຶບຂໍ້ມູນເງິນເດືອນທີ່ອັບໂຫຼດໄວ້ (ຮວມທັງສະຖານະ "ສົ່ງແລ້ວ") ອອກຈາກເຄື່ອງນີ້.\n` +
      `(This will delete the uploaded payroll data for this period from this device. It cannot be undone.)`
    );
    if (!confirmed) return;

    clearEmployeesFromStorage(periodId);
    onEmployeesUpdated([]);
    setUploadStatus({
      type: 'idle',
      message: `🗑️ ລຶບຂໍ້ມູນທ້ອງຖິ່ນສຳລັບເດືອນ ${periodId} ແລ້ວ (Cleared local storage)`,
    });
  };

  // Handle WhatsApp dispatch
  const handleSendWhatsApp = (emp: EmployeeRecord) => {
    const opened = openWhatsAppPayslip(emp, periodId);
    if (!opened) return;

    const updated = employees.map((item) =>
      item.id === emp.id ? { ...item, payslip_sent: true } : item
    );
    onEmployeesUpdated(updated);
    saveEmployeesToStorage(periodId, updated);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Control Panel Card */}
      <div className="bg-[#1e1e1e] p-5 rounded-lg border border-gray-800 shadow-md">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-[#0097E0] flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              ຜູ້ຄວບຄຸມລະບົບ (Admin Dashboard)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              ອັບໂຫຼດໄຟລ໌ Excel ຂໍ້ມູນເງິນເດືອນ (Sheet name ຕ້ອງເປັນ "TAX", skip row = 5)
            </p>
          </div>

          {/* Period change and actions */}
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleApplyPeriod} className="flex items-center gap-1">
              <label htmlFor="periodInput" className="text-xs text-gray-300 font-medium">
                ເດືອນ/ປີ:
              </label>
              <input
                id="periodInput"
                type="text"
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value)}
                placeholder="202606"
                className="bg-[#121212] text-white border border-gray-700 rounded px-2.5 py-1.5 text-xs w-24 text-center font-mono focus:border-[#0097E0] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#0097E0] hover:bg-[#0086c7] text-white text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer"
              >
                ປ່ຽນເດືອນ
              </button>
            </form>

            {employees.length > 0 && (
              <button
                onClick={() => exportJsonBackup(periodId, employees)}
                className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium px-3 py-1.5 rounded transition border border-gray-700 cursor-pointer"
                title="Download JSON Backup"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup JSON</span>
              </button>
            )}

            <button
              onClick={handleClearStorage}
              className="flex items-center gap-1 bg-red-900/80 hover:bg-red-800 text-white text-xs font-medium px-3 py-1.5 rounded transition cursor-pointer"
              title="Clear current period storage"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ລຶບຂໍ້ມູນ</span>
            </button>
          </div>
        </div>

        {/* Upload area */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#121212] p-4 rounded-md border border-dashed border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#0097E0]/10 rounded-full text-[#0097E0]">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-200">ເລືອກໄຟລ໌ Excel (.xlsx, .xls)</div>
              <div className="text-xs text-gray-400">ລະບົບຈະອ່ານແຜ່ນງານ "TAX" ແລະ ບັນທຶກລົງໃນອຸປະກອນນີ້ໂດຍອັດຕະໂນມັດ</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload-btn"
            />
            <label
              htmlFor="excel-upload-btn"
              className="flex items-center gap-1.5 bg-[#0097E0] hover:bg-[#0086c7] text-white text-xs font-bold px-4 py-2 rounded cursor-pointer transition shadow"
            >
              <Upload className="w-4 h-4" />
              <span>ອັບໂຫຼດ Excel</span>
            </label>
          </div>
        </div>

        {/* Status notice */}
        {uploadStatus.message && (
          <div
            className={`mt-3 text-xs p-2.5 rounded border ${
              uploadStatus.type === 'error'
                ? 'bg-red-950/50 border-red-800 text-red-300'
                : uploadStatus.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                : 'bg-blue-950/50 border-blue-800 text-blue-300'
            }`}
          >
            {uploadStatus.message}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {employees.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1e1e1e] p-4 rounded-lg border border-gray-800 flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-[#0097E0] rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-gray-400">ພະນັກງານທັງໝົດ</div>
              <div className="text-xl font-bold text-white">{stats.totalCount} ຄົນ</div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] p-4 rounded-lg border border-gray-800 flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-gray-400">ລວມຈ່າຍສຸດທິ (Total Net Pay)</div>
              <div className="text-xl font-bold text-white">{formatNum(stats.totalNet)} ກີບ</div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] p-4 rounded-lg border border-gray-800 flex items-center gap-3">
            <div className="p-3 bg-green-500/10 text-[#25D366] rounded-lg">
              <SendHorizontal className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>ສົ່ງແລ້ວ {stats.sentCount}/{stats.totalCount}</span>
                <span>{stats.sentPercentage}%</span>
              </div>
              <div className="w-full bg-gray-700 h-2 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-[#25D366] h-full transition-all duration-300"
                  style={{ width: `${stats.sentPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee List Table */}
      <div className="bg-[#1e1e1e] rounded-lg border border-gray-800 shadow-md overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800">
          <h3 className="text-base font-bold text-[#0097E0] flex items-center gap-2">
            <span>ລາຍຊື່ພະນັກງານ (Employees)</span>
            <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
              {filteredEmployees.length} ຄົນ
            </span>
          </h3>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່, ລະຫັດ ຫຼື ເບີໂທ..."
              className="w-full bg-[#121212] text-white pl-9 pr-3 py-1.5 text-xs rounded border border-gray-700 focus:border-[#0097E0] focus:outline-none"
            />
          </div>
        </div>

        {/* Table Content */}
        {filteredEmployees.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-xs">
            {employees.length === 0 ? (
              <p>ບໍ່ມີຂໍ້ມູນສຳລັບເດືອນນີ້. ກະລຸນາອັບໂຫຼດໄຟລ໌ Excel ອີກຄັ້ງ. (No payroll data uploaded yet.)</p>
            ) : (
              <p>ບໍ່ພົບພະນັກງານທີ່ກົງກັບຄຳຄົ້ນຫາ (No employees matching search criteria)</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0097E0] text-white font-bold whitespace-nowrap">
                  <th className="p-3 border-b border-gray-800">ລ/ດ</th>
                  <th className="p-3 border-b border-gray-800">ລະຫັດ (ID)</th>
                  <th className="p-3 border-b border-gray-800">ຊື່ ແລະ ນາມສະກຸນ (Name)</th>
                  <th className="p-3 border-b border-gray-800">ຕຳແໜ່ງ (Position)</th>
                  <th className="p-3 border-b border-gray-800">ເບີໂທ (Phone)</th>
                  <th className="p-3 border-b border-gray-800 text-right">ຮັບສຸດທິ (Net Pay)</th>
                  <th className="p-3 border-b border-gray-800 text-center">ສະຖານະ</th>
                  <th className="p-3 border-b border-gray-800 text-center min-w-[190px]">ຈັດການ (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-200">
                {filteredEmployees.map((emp, index) => (
                  <tr key={emp.id} className="hover:bg-gray-800/50 transition">
                    <td className="p-3 text-gray-400">{index + 1}</td>
                    <td className="p-3 font-mono font-bold text-gray-100">{emp.employeeId}</td>
                    <td className="p-3 font-medium">{emp.name}</td>
                    <td className="p-3 text-gray-400">{emp.position}</td>
                    <td className="p-3 font-mono text-gray-300">{emp.phone || '-'}</td>
                    <td className="p-3 text-right font-bold font-mono text-[#0097E0]">
                      {emp.netPayFormatted}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {emp.payslip_sent ? (
                        <span className="inline-flex items-center gap-1 text-[#25D366] font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ສົ່ງແລ້ວ</span>
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">ຍັງບໍ່ສົ່ງ</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSendWhatsApp(emp)}
                          className="flex items-center gap-1 bg-[#25D366] hover:bg-[#1ebd5c] text-white px-2.5 py-1.5 rounded font-bold transition shadow cursor-pointer text-[11px] whitespace-nowrap"
                          title="Send payslip summary via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => onViewEmployee(emp)}
                          className="flex items-center gap-1 bg-[#0097E0] hover:bg-[#0086c7] text-white px-2.5 py-1.5 rounded font-bold transition shadow cursor-pointer text-[11px] whitespace-nowrap"
                          title="View payslip document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ເບິ່ງ</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
