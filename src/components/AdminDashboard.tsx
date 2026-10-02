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
  SendHorizontal,
  Loader2,
  Image as ImageIcon,
  AlertTriangle,
  X
} from 'lucide-react';
import { EmployeeRecord } from '../types/payroll';
import { parseExcelFile } from '../utils/excelParser';
import { parsePdfFile } from '../utils/pdfParser';
import { openWhatsAppPayslip } from '../utils/whatsapp';
import { clearEmployeesFromStorage, exportJsonBackup, saveEmployeesToStorage } from '../utils/storage';
import { formatNum, getPeriodInfo } from '../utils/formatters';
import { Payslip } from './Payslip';
import {
  captureElementToBlob,
  copyBlobToClipboard,
  sharePayslipImageFile,
  getPayslipFilename
} from '../utils/payslipImage';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'unsent'>('all');
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

  // Filtered employees by search query and status tab
  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (statusFilter === 'sent') {
      list = list.filter((e) => e.payslip_sent);
    } else if (statusFilter === 'unsent') {
      list = list.filter((e) => !e.payslip_sent);
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q)
    );
  }, [employees, searchQuery, statusFilter]);

  // Handle period change
  const handleApplyPeriod = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = periodInput.trim();
    if (clean && clean !== periodId) {
      onPeriodChange(clean);
    }
  };

  // Handle Excel or PDF upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    setUploadStatus({
      type: 'loading',
      message: isPdf
        ? `ກຳລັງອ່ານໄຟລ໌ PDF ${file.name}... (Parsing PDF...)`
        : `ກຳລັງອ່ານໄຟລ໌ ${file.name}... (Reading Excel...)`,
    });

    try {
      let parsed: EmployeeRecord[];
      let effectivePeriod = periodId;

      if (isPdf) {
        const result = await parsePdfFile(file);
        parsed = result.employees;
        if (result.detectedPeriod && result.detectedPeriod !== periodId) {
          effectivePeriod = result.detectedPeriod;
          onPeriodChange(result.detectedPeriod);
        }
      } else {
        parsed = await parseExcelFile(file);
      }

      onEmployeesUpdated(parsed);
      saveEmployeesToStorage(effectivePeriod, parsed);
      setUploadStatus({
        type: 'success',
        message: `✅ ບັນທຶກສຳເລັດ! ພົບພະນັກງານ ${parsed.length} ຄົນສຳລັບເດືອນ ${effectivePeriod} (ຈາກ ${file.name})`,
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

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Handle Clear Storage Dialog
  const handleOpenClearModal = () => {
    setIsClearModalOpen(true);
  };

  const handleConfirmClearStorage = () => {
    clearEmployeesFromStorage(periodId);
    onEmployeesUpdated([]);
    setUploadStatus({
      type: 'idle',
      message: `🗑️ ລຶບຂໍ້ມູນທ້ອງຖິ່ນສຳລັບເດືອນ ${periodId} ແລ້ວ (Cleared local storage)`,
    });
    setIsClearModalOpen(false);
    showToast(`🗑️ ລຶບຂໍ້ມູນເດືອນ ${periodId} ອອກຈາກເຄື່ອງຮຽບຮ້ອຍແລ້ວ`, 'info', 4000);
  };

  const [capturingEmp, setCapturingEmp] = useState<EmployeeRecord | null>(null);
  const [capturingEmpId, setCapturingEmpId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const offscreenSlipRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'warning' = 'info', duration = 5000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ text, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  };

  // Handle WhatsApp dispatch with text message only
  const handleSendWhatsAppText = (emp: EmployeeRecord) => {
    if (!emp.phone || emp.phone.trim() === '') {
      alert('ບໍ່ມີເບີໂທສຳລັບພະນັກງານນີ້ (No phone number found for this employee)');
      return;
    }

    const updated = employees.map((item) =>
      item.id === emp.id ? { ...item, payslip_sent: true } : item
    );
    onEmployeesUpdated(updated);
    saveEmployeesToStorage(periodId, updated);

    showToast(`🚀 ກຳລັງເປີດ WhatsApp ເພື່ອສົ່ງຂໍ້ຄວາມໃຫ້ ${emp.name}`, 'info', 4000);
    openWhatsAppPayslip(emp, periodId);
  };

  // Handle WhatsApp dispatch with payslip image copy to clipboard
  const handleSendWhatsAppImage = async (emp: EmployeeRecord) => {
    if (!emp.phone || emp.phone.trim() === '') {
      alert('ບໍ່ມີເບີໂທສຳລັບພະນັກງານນີ້ (No phone number found for this employee)');
      return;
    }

    setCapturingEmpId(emp.id);
    setCapturingEmp(emp);
    showToast(`⏳ ກຳລັງສ້າງຮູບໃບເງິນເດືອນຂອງ ${emp.name}...`, 'info', 10000);

    let copied = false;
    let blob: Blob | null = null;
    const filename = getPayslipFilename(emp, periodId);

    try {
      // Give offscreen component time to mount and render fully
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (offscreenSlipRef.current) {
        const slipEl =
          (offscreenSlipRef.current.querySelector('#payslip-document') as HTMLElement) ||
          offscreenSlipRef.current;
        blob = await captureElementToBlob(slipEl);
        if (blob) {
          copied = await copyBlobToClipboard(blob);
        }
      }
    } catch (err) {
      console.error('Error generating/copying payslip image:', err);
    } finally {
      setCapturingEmp(null);
      setCapturingEmpId(null);
    }

    const updated = employees.map((item) =>
      item.id === emp.id ? { ...item, payslip_sent: true } : item
    );
    onEmployeesUpdated(updated);
    saveEmployeesToStorage(periodId, updated);

    // If native platform and blob was generated, also offer direct native share with image attached!
    if (blob) {
      const shared = await sharePayslipImageFile(
        blob,
        filename,
        `ໃບແຈ້ງເງິນເດືອນ ${emp.name}`,
        `ໃບແຈ້ງເງິນເດືອນ ປະຈຳເດືອນ ${periodId} ຂອງ ${emp.name}`
      );
      if (shared) {
        showToast(`✅ ເປີດການແບ່ງປັນຮູບໃບເງິນເດືອນສຳເລັດແລ້ວ!`, 'success', 5000);
        return;
      }
    }

    if (copied) {
      showToast(
        `📋 ຄັດລອກຮູບໃບເງິນເດືອນແລ້ວ! ກຳລັງເປີດ WhatsApp (ກົດ Paste ເພື່ອສົ່ງຮູບໃຫ້ ${emp.name})`,
        'success',
        6000
      );
    } else {
      showToast(`🚀 ກຳລັງເປີດ WhatsApp...`, 'info', 4000);
    }

    try {
      openWhatsAppPayslip(emp, periodId, true);
    } catch (err) {
      console.error('Failed to open WhatsApp:', err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Hidden Level 1 Heading for Semantic Hierarchy */}
      <h1 className="sr-only">ລະບົບຈັດການໃບເງິນເດືອນ ບໍລິສັດ ມິຢາໂມໂຕ (Miyamoto Lao Salary Viewer)</h1>

      {/* Control Panel Card */}
      <div className="relative bg-[#151b28]/95 p-5 rounded-xl border border-slate-800/90 shadow-xl shadow-black/30 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#0097E0]/60 to-transparent" aria-hidden="true" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0097E0] flex items-center gap-2">
              <Calendar className="w-5 h-5" aria-hidden="true" />
              <span>ຜູ້ຄວບຄຸມລະບົບ (Admin Dashboard)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ອັບໂຫຼດໄຟລ໌ Excel ຂໍ້ມູນເງິນເດືອນ (Sheet name ຕ້ອງເປັນ "TAX", skip row = 5)
            </p>
          </div>

          {/* Period change and actions */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <form onSubmit={handleApplyPeriod} className="flex items-center gap-1.5 w-full sm:w-auto">
              <label htmlFor="periodInput" className="text-xs text-slate-300 font-medium whitespace-nowrap">
                ເດືອນ/ປີ:
              </label>
              <input
                id="periodInput"
                type="text"
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value)}
                placeholder="202606"
                aria-label="ລະບຸເດືອນ ແລະ ປີ (ຮູບແບບ YYYYMM)"
                className="bg-slate-950 text-white border border-slate-700 rounded-lg px-2.5 py-2 text-xs w-24 text-center font-mono focus:border-[#0097E0] focus-visible:ring-2 focus-visible:ring-[#0077b6] focus:outline-none min-h-[38px]"
              />
              <button
                type="submit"
                className="flex-1 sm:flex-none bg-[#0077b6] hover:bg-[#005f92] text-white text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer min-h-[38px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                ປ່ຽນເດືອນ
              </button>
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {employees.length > 0 && (
                <button
                  onClick={() => exportJsonBackup(periodId, employees)}
                  aria-label="ດາວໂຫຼດໄຟລ໌ສຳຮອງຂໍ້ມູນ JSON"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg transition border border-slate-700 cursor-pointer min-h-[38px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  title="Download JSON Backup"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Backup JSON</span>
                </button>
              )}

              <button
                onClick={handleOpenClearModal}
                aria-label={`ລຶບຂໍ້ມູນທ້ອງຖິ່ນສຳລັບເດືອນ ${periodId}`}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-medium px-3 py-2 rounded-lg transition border border-red-800/60 cursor-pointer min-h-[38px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                title="Clear current period storage"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ລຶບຂໍ້ມູນ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Upload area */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 transition">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-cyan-500/10 rounded-xl text-[#0097E0] border border-cyan-500/20 shrink-0" aria-hidden="true">
              <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-200">ເລືອກໄຟລ໌ Excel ຫຼື PDF (.xlsx, .xls, .pdf)</div>
              <div id="upload-help-text" className="text-[11px] sm:text-xs text-slate-400">
                ຮອງຮັບທັງໄຟລ໌ Excel (Sheet "TAX") ແລະ ໄຟລ໌ເອກະສານ PDF ໃບເງິນເດືອນ
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .pdf, application/pdf"
              onChange={handleFileUpload}
              className="sr-only"
              id="excel-upload-btn"
              aria-describedby="upload-help-text"
            />
            <label
              htmlFor="excel-upload-btn"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0077b6] hover:bg-[#005f92] text-white text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition shadow-md shadow-black/20 min-h-[42px] focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 focus-within:ring-white"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>ອັບໂຫຼດ Excel / PDF</span>
            </label>
          </div>
        </div>

        {/* Status notice */}
        {uploadStatus.message && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-3 text-xs p-3 rounded-lg border ${
              uploadStatus.type === 'error'
                ? 'bg-red-950/60 border-red-800 text-red-200'
                : uploadStatus.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : 'bg-blue-950/60 border-blue-800 text-blue-200'
            }`}
          >
            {uploadStatus.message}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {employees.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Staff Card */}
          <div className="relative bg-[#151b28]/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-lg shadow-black/25 overflow-hidden flex items-center gap-3.5">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" aria-hidden="true" />
            <div className="p-3 bg-cyan-500/10 text-[#0097E0] rounded-xl border border-cyan-500/20 shrink-0" aria-hidden="true">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">ພະນັກງານທັງໝົດ (Total Staff)</div>
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono mt-0.5">
                {stats.totalCount} <span className="text-xs font-sans font-normal text-slate-400">ຄົນ</span>
              </div>
            </div>
          </div>

          {/* Total Net Pay Card */}
          <div className="relative bg-[#151b28]/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-lg shadow-black/25 overflow-hidden flex items-center gap-3.5">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" aria-hidden="true" />
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0" aria-hidden="true">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-400">ລວມຈ່າຍສຸດທິ (Total Net Pay)</div>
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono mt-0.5 truncate">
                {formatNum(stats.totalNet)} <span className="text-xs font-sans font-normal text-slate-400">ກີບ</span>
              </div>
            </div>
          </div>

          {/* Dispatch Progress Card */}
          <div className="relative bg-[#151b28]/90 border border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-lg shadow-black/25 overflow-hidden flex items-center gap-3.5">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent" aria-hidden="true" />
            <div className="p-3 bg-green-500/10 text-[#25D366] rounded-xl border border-green-500/20 shrink-0" aria-hidden="true">
              <SendHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline text-xs text-slate-300">
                <span className="font-medium text-slate-400">ອັດຕາສົ່ງ (Dispatched)</span>
                <span className="font-bold font-mono text-[#25D366] text-sm">{stats.sentPercentage}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={stats.sentPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`ອັດຕາການສົ່ງໃບແຈ້ງເງິນເດືອນ: ${stats.sentCount} ຈາກ ${stats.totalCount} ຄົນ (${stats.sentPercentage}%)`}
                className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden"
              >
                <div
                  className="bg-gradient-to-r from-[#0077b6] to-[#25D366] h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.sentPercentage}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {stats.sentCount} / {stats.totalCount} ຄົນ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee List Container */}
      <div className="bg-[#151b28]/95 rounded-xl border border-slate-800/90 shadow-xl shadow-black/30 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>ລາຍຊື່ພະນັກງານ</span>
              <span className="text-xs bg-slate-800 text-cyan-400 border border-slate-700 px-2.5 py-0.5 rounded-full font-mono">
                {filteredEmployees.length} ຄົນ
              </span>
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Status Filter Tabs */}
            <div
              className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800"
              role="radiogroup"
              aria-label="ກັ່ນຕອງສະຖານະການສົ່ງໃບແຈ້ງເງິນເດືອນ"
            >
              <button
                type="button"
                role="radio"
                aria-checked={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer min-h-[34px] ${
                  statusFilter === 'all'
                    ? 'bg-[#0077b6] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>ທັງໝົດ</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {stats.totalCount}
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={statusFilter === 'sent'}
                onClick={() => setStatusFilter('sent')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer min-h-[34px] ${
                  statusFilter === 'sent'
                    ? 'bg-[#25D366] text-[#0f172a] shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>ສົ່ງແລ້ວ</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${statusFilter === 'sent' ? 'bg-black/20 text-[#0f172a]' : 'bg-slate-800 text-slate-400'}`}>
                  {stats.sentCount}
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={statusFilter === 'unsent'}
                onClick={() => setStatusFilter('unsent')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer min-h-[34px] ${
                  statusFilter === 'unsent'
                    ? 'bg-amber-400 text-[#0f172a] shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>ຍັງບໍ່ສົ່ງ</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${statusFilter === 'unsent' ? 'bg-black/20 text-[#0f172a]' : 'bg-slate-800 text-slate-400'}`}>
                  {stats.unsentCount}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ຄົ້ນຫາຊື່, ລະຫັດ ຫຼື ເບີໂທ..."
                aria-label="ຄົ້ນຫາຊື່, ລະຫັດ ຫຼື ເບີໂທ"
                className="w-full bg-slate-950/80 text-white pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-700/80 focus:border-[#0097E0] focus-visible:ring-2 focus-visible:ring-[#0077b6] focus:outline-none min-h-[36px]"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {filteredEmployees.length === 0 ? (
          <div className="p-10 text-center text-gray-300 text-xs">
            {employees.length === 0 ? (
              <p>ບໍ່ມີຂໍ້ມູນສຳລັບເດືອນນີ້. ກະລຸນາອັບໂຫຼດໄຟລ໌ Excel ອີກຄັ້ງ. (No payroll data uploaded yet.)</p>
            ) : (
              <p>ບໍ່ພົບພະນັກງານທີ່ກົງກັບຄຳຄົ້ນຫາ (No employees matching search criteria)</p>
            )}
          </div>
        ) : (
          <div>
            {/* Mobile Card List View (Phones) */}
            <div className="block sm:hidden divide-y divide-slate-800/80">
              {filteredEmployees.map((emp, index) => (
                <div key={emp.id} className="p-4 space-y-3 hover:bg-slate-800/20 transition">
                  {/* Top line: Index, Name, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 shrink-0 mt-0.5">
                        #{index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-white break-words leading-snug">{emp.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="font-mono text-[#0097E0] font-semibold shrink-0">{emp.employeeId}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-300 truncate">{emp.position || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {emp.payslip_sent ? (
                        <span className="inline-flex items-center gap-1 text-[#25D366] font-bold text-[11px] bg-[#25D366]/10 px-2.5 py-1 rounded-full border border-[#25D366]/30 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>ສົ່ງແລ້ວ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center text-amber-400 font-medium text-[11px] bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/30 whitespace-nowrap">
                          ຍັງບໍ່ສົ່ງ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Net Pay and Phone Info Box */}
                  <div className="flex items-center justify-between text-xs bg-slate-950/80 px-3.5 py-2.5 rounded-xl border border-slate-800/80">
                    <div className="text-slate-400">
                      {emp.phone ? (
                        <a href={`tel:${emp.phone}`} className="text-slate-300 hover:text-white font-mono flex items-center gap-1">
                          <span>📞</span>
                          <span>{emp.phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 font-mono">ບໍ່ມີເບີໂທ</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[11px] mr-1.5">ຮັບສຸດທິ:</span>
                      <span className="font-bold font-mono text-sm text-cyan-400">{emp.netPayFormatted} ກີບ</span>
                    </div>
                  </div>

                  {/* Mobile Action Buttons: Split into Text, Image, and View */}
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    <button
                      onClick={() => handleSendWhatsAppText(emp)}
                      aria-label={`ສົ່ງຂໍ້ຄວາມ WhatsApp ໃຫ້ ${emp.name}`}
                      className="flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#1ebd5c] active:scale-[0.98] text-[#0f172a] px-2 py-2.5 rounded-lg font-bold transition shadow-sm cursor-pointer text-xs min-h-[40px] focus-visible:ring-2 focus-visible:ring-white"
                      title="Send WhatsApp text message"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#0f172a]" aria-hidden="true" />
                      <span>ຂໍ້ຄວາມ</span>
                    </button>
                    <button
                      onClick={() => handleSendWhatsAppImage(emp)}
                      disabled={capturingEmpId === emp.id}
                      aria-label={`ສົ່ງຮູບໃບເງິນເດືອນຜ່ານ WhatsApp ໃຫ້ ${emp.name}`}
                      className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-2 py-2.5 rounded-lg font-bold transition shadow-sm cursor-pointer text-xs min-h-[40px] focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                      title="Copy payslip image & open WhatsApp"
                    >
                      {capturingEmpId === emp.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" aria-hidden="true" />
                          <span>ສ້າງຮູບ...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                          <span>ຮູບໃບເງິນ</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onViewEmployee(emp)}
                      aria-label={`ເບິ່ງໃບແຈ້ງເງິນເດືອນຂອງ ${emp.name}`}
                      className="flex items-center justify-center gap-1 bg-[#0077b6] hover:bg-[#005f92] active:scale-[0.98] text-white px-2 py-2.5 rounded-lg font-bold transition shadow-sm cursor-pointer text-xs min-h-[40px] focus-visible:ring-2 focus-visible:ring-white"
                      title="View payslip document"
                    >
                      <Eye className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                      <span>ເບິ່ງໃບເງິນ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/Tablet Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="ຕາຕະລາງລາຍຊື່ພະນັກງານ ແລະ ສະຖານະການແຈ້ງເງິນເດືອນ">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-300 font-semibold uppercase text-[11px] tracking-wider whitespace-nowrap border-b border-slate-700/80">
                    <th scope="col" className="p-3.5">ລ/ດ</th>
                    <th scope="col" className="p-3.5">ລະຫັດ (ID)</th>
                    <th scope="col" className="p-3.5">ຊື່ ແລະ ນາມສະກຸນ (Name)</th>
                    <th scope="col" className="p-3.5">ຕຳແໜ່ງ (Position)</th>
                    <th scope="col" className="p-3.5">ເບີໂທ (Phone)</th>
                    <th scope="col" className="p-3.5 text-right">ຮັບສຸດທິ (Net Pay)</th>
                    <th scope="col" className="p-3.5 text-center">ສະຖານະ</th>
                    <th scope="col" className="p-3.5 text-center min-w-[220px]">ຈັດການ (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredEmployees.map((emp, index) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 text-slate-500 font-mono">{index + 1}</td>
                      <td className="p-3.5 font-mono font-bold text-white">{emp.employeeId}</td>
                      <td className="p-3.5 font-medium text-slate-100">{emp.name}</td>
                      <td className="p-3.5 text-slate-400">{emp.position}</td>
                      <td className="p-3.5 font-mono text-slate-400">{emp.phone || '-'}</td>
                      <td className="p-3.5 text-right font-bold font-mono text-cyan-400">
                        {emp.netPayFormatted}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {emp.payslip_sent ? (
                          <span className="inline-flex items-center gap-1 text-[#25D366] font-bold text-xs bg-[#25D366]/10 px-2.5 py-0.5 rounded-full border border-[#25D366]/30">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>ສົ່ງແລ້ວ</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium text-xs bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                            ຍັງບໍ່ສົ່ງ
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleSendWhatsAppText(emp)}
                            aria-label={`ສົ່ງຂໍ້ຄວາມ WhatsApp ໃຫ້ ${emp.name}`}
                            className="flex items-center gap-1 bg-[#25D366] hover:bg-[#1ebd5c] active:scale-[0.98] text-[#0f172a] px-2.5 py-1.5 rounded-lg font-bold transition shadow-sm cursor-pointer text-[11px] whitespace-nowrap min-h-[34px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                            title="Send WhatsApp text message"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#0f172a]" aria-hidden="true" />
                            <span>ຂໍ້ຄວາມ</span>
                          </button>
                          <button
                            onClick={() => handleSendWhatsAppImage(emp)}
                            disabled={capturingEmpId === emp.id}
                            aria-label={`ສົ່ງຮູບໃບເງິນເດືອນຜ່ານ WhatsApp ໃຫ້ ${emp.name}`}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-2.5 py-1.5 rounded-lg font-bold transition shadow-sm cursor-pointer text-[11px] whitespace-nowrap min-h-[34px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-60"
                            title="Copy payslip image & open WhatsApp"
                          >
                            {capturingEmpId === emp.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" aria-hidden="true" />
                                <span>ສ້າງຮູບ...</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                                <span>ຮູບໃບເງິນ</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => onViewEmployee(emp)}
                            aria-label={`ເບິ່ງໃບແຈ້ງເງິນເດືອນຂອງ ${emp.name}`}
                            className="flex items-center gap-1 bg-[#0077b6] hover:bg-[#005f92] active:scale-[0.98] text-white px-2.5 py-1.5 rounded-lg font-bold transition shadow-sm cursor-pointer text-[11px] whitespace-nowrap min-h-[34px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                            title="View payslip document"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>ເບິ່ງ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Offscreen Payslip Renderer for Image Capture */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '460px',
          pointerEvents: 'none',
          zIndex: -9999,
        }}
        aria-hidden="true"
      >
        {capturingEmp && (
          <div ref={offscreenSlipRef} className="bg-white p-3">
            <Payslip employee={capturingEmp} periodId={periodId} isCompact={true} />
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Clear Storage */}
      {isClearModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsClearModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-[#161d2b] border border-slate-700/80 rounded-2xl p-6 shadow-2xl shadow-black/70 text-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 id="clear-dialog-title" className="text-base sm:text-lg font-bold text-white flex items-center justify-between">
                  <span>ຢືນຢັນການລຶບຂໍ້ມູນ?</span>
                  <button
                    onClick={() => setIsClearModalOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    aria-label="ປິດ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນທ້ອງຖິ່ນສຳລັບເດືອນ <span className="font-bold text-amber-300 font-mono">{periodId}</span> ({getPeriodInfo(periodId).displayMonthLao})?
                </p>
                <div className="mt-3 p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-[11px] sm:text-xs text-red-200/90 leading-relaxed">
                  ⚠️ ນີ້ຈະລຶບຂໍ້ມູນເງິນເດືອນທີ່ອັບໂຫຼດໄວ້ (ຮວມທັງສະຖານະ <span className="text-[#25D366] font-semibold">"ສົ່ງແລ້ວ"</span>) ອອກຈາກເຄື່ອງນີ້ ແລະ ບໍ່ສາມາດກູ້ຄືນໄດ້.
                  <div className="text-[10px] text-slate-400 mt-1 italic">
                    (This will delete the uploaded payroll data and sent statuses from this device. It cannot be undone.)
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer min-h-[40px]"
              >
                ຍົກເລີກ (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmClearStorage}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-950 transition active:scale-[0.98] cursor-pointer min-h-[40px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>ລຶບຂໍ້ມູນ (Delete)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Banner */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[92vw] sm:max-w-lg w-full px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium transition-all"
          style={{
            backgroundColor: toast.type === 'success' ? 'rgba(6, 78, 59, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            borderColor: toast.type === 'success' ? '#10b981' : '#0097E0',
            color: '#ffffff',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span>{toast.text}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/70 hover:text-white p-1 rounded-md cursor-pointer"
            aria-label="ປິດແຈ້ງເຕືອນ"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
