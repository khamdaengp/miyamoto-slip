import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, MessageCircle, Download } from 'lucide-react';
import { EmployeeRecord } from '../types/payroll';
import { Payslip } from './Payslip';
import { openWhatsAppPayslip } from '../utils/whatsapp';
import {
  captureElementToBlob,
  copyBlobToClipboard,
  downloadImageBlob,
  getPayslipFilename
} from '../utils/payslipImage';

interface PayslipModalProps {
  employee: EmployeeRecord | null;
  periodId: string;
  isOpen: boolean;
  onClose: () => void;
  employees?: EmployeeRecord[];
  onSelectEmployee?: (emp: EmployeeRecord) => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  employee,
  periodId,
  isOpen,
  onClose,
  employees = [],
  onSelectEmployee,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [isProcessingWhatsApp, setIsProcessingWhatsApp] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [modalToast, setModalToast] = useState<{ text: string; type: 'info' | 'success' } | null>(null);

  const showModalToast = (text: string, type: 'info' | 'success' = 'info') => {
    setModalToast({ text, type });
    setTimeout(() => setModalToast(null), 5000);
  };

  const handleWhatsAppText = () => {
    if (!employee) return;
    showModalToast('🚀 ກຳລັງເປີດ WhatsApp ເພື່ອສົ່ງຂໍ້ຄວາມ...', 'info');
    openWhatsAppPayslip(employee, periodId);
  };

  const handleWhatsAppWithImage = async () => {
    if (!employee) return;
    setIsProcessingWhatsApp(true);
    showModalToast('⏳ ກຳລັງສ້າງຮູບໃບເງິນເດືອນ...', 'info');

    try {
      let copied = false;
      const slipEl =
        (containerRef.current?.querySelector('#payslip-document') as HTMLElement) ||
        containerRef.current;

      if (slipEl) {
        const blob = await captureElementToBlob(slipEl);
        if (blob) {
          copied = await copyBlobToClipboard(blob);
        }
      }

      if (copied) {
        showModalToast('📋 ຄັດລອກຮູບແລ້ວ! ກຳລັງເປີດ WhatsApp (ກົດ Paste ເພື່ອສົ່ງຮູບ)', 'success');
      } else {
        showModalToast('🚀 ກຳລັງເປີດ WhatsApp...', 'info');
      }

      openWhatsAppPayslip(employee, periodId, true);
    } catch (err) {
      console.error('Failed to prepare payslip image for WhatsApp:', err);
      openWhatsAppPayslip(employee, periodId, true);
    } finally {
      setIsProcessingWhatsApp(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!employee) return;
    setIsDownloadingImage(true);
    try {
      const slipEl =
        (containerRef.current?.querySelector('#payslip-document') as HTMLElement) ||
        containerRef.current;
      if (slipEl) {
        const blob = await captureElementToBlob(slipEl);
        if (blob) {
          const filename = getPayslipFilename(employee, periodId);
          downloadImageBlob(blob, filename);
          showModalToast(`✅ ດາວໂຫຼດຮູບ ${filename} ສຳເລັດແລ້ວ!`, 'success');
        }
      }
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Stepper calculations
  const currentIndex = employee && employees.length > 0
    ? employees.findIndex((e) => e.id === employee.id)
    : -1;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < employees.length - 1;

  const handlePrev = () => {
    if (canPrev && onSelectEmployee) {
      onSelectEmployee(employees[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (canNext && onSelectEmployee) {
      onSelectEmployee(employees[currentIndex + 1]);
    }
  };

  // Focus trap, Escape key & Left/Right arrow handlers
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus close button upon opening
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowLeft' && canPrev) {
        handlePrev();
        return;
      }

      if (e.key === 'ArrowRight' && canNext) {
        handleNext();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose, canPrev, canNext, currentIndex]);

  // Viewport-aware scaling calculation
  useEffect(() => {
    if (!isOpen) return;

    const computeScale = () => {
      if (!containerRef.current) return;
      if (window.innerWidth < 640) {
        setScale(1);
        return;
      }
      const availH = window.innerHeight - 130;
      const naturalH = containerRef.current.scrollHeight;
      if (naturalH > 0 && availH < naturalH) {
        setScale(Math.max(0.7, Math.min(1, availH / naturalH)));
      } else {
        setScale(1);
      }
    };

    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-employee-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs no-print-backdrop overflow-y-auto"
      style={{
        paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
      }}
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div ref={modalRef} className="relative z-10 w-full max-w-[500px] flex flex-col items-center my-auto">
        {/* Toast notification inside modal */}
        {modalToast && (
          <div
            role="status"
            aria-live="polite"
            className={`w-full mb-2 px-3 py-2 rounded-lg text-xs font-semibold text-center shadow-lg transition-all flex items-center justify-between gap-2 ${
              modalToast.type === 'success'
                ? 'bg-emerald-600 text-white border border-emerald-400'
                : 'bg-sky-600 text-white border border-sky-400'
            }`}
          >
            <span className="flex-1">{modalToast.text}</span>
            <button
              onClick={() => setModalToast(null)}
              className="text-white/80 hover:text-white text-xs px-1 cursor-pointer"
              aria-label="ປິດແຈ້ງເຕືອນ"
            >
              ✕
            </button>
          </div>
        )}

        {/* Actions bar */}
        <div className="w-full flex flex-col gap-2 mb-2 px-0.5 text-white no-print">
          {/* Top Row: Navigation + Employee Name + Close Button */}
          <div className="flex items-center justify-between gap-2 bg-slate-900/95 p-1.5 sm:p-2 rounded-xl border border-slate-700/80 shadow-md">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {employees.length > 1 && (
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
                  <button
                    onClick={handlePrev}
                    disabled={!canPrev}
                    aria-label="ພະນັກງານກ່ອນໜ້າ"
                    className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white"
                    title="Previous employee (← Arrow Left)"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <span className="text-[11px] font-mono px-1.5 text-slate-400 font-semibold">
                    {currentIndex + 1}/{employees.length}
                  </span>
                  <button
                    onClick={handleNext}
                    disabled={!canNext}
                    aria-label="ພະນັກງານຕໍ່ໄປ"
                    className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white"
                    title="Next employee (→ Arrow Right)"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              <span
                id="modal-employee-title"
                className="text-xs font-semibold text-slate-200 truncate px-1"
                title={`${employee.employeeId} - ${employee.name}`}
              >
                <span className="text-[#0097E0] font-mono font-bold mr-1.5">{employee.employeeId}</span>
                <span className="truncate">{employee.name}</span>
              </span>
            </div>

            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="ປິດໜ້າຕ່າງໃບແຈ້ງເງິນເດືອນ (Close modal)"
              className="bg-red-700 hover:bg-red-800 active:scale-[0.95] text-white p-1.5 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg transition cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none shrink-0"
              title="Close modal"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Action Row: Split Send Message & Image Payslip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            <button
              onClick={handleWhatsAppText}
              aria-label="ສົ່ງຂໍ້ຄວາມຜ່ານ WhatsApp"
              className="flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1ebd5c] active:scale-[0.98] text-[#0f172a] text-xs font-bold py-2 px-1.5 rounded-lg transition shadow-sm cursor-pointer min-h-[38px] focus-visible:ring-2 focus-visible:ring-white"
              title="Send WhatsApp text message"
            >
              <MessageCircle className="w-4 h-4 text-[#0f172a]" aria-hidden="true" />
              <span>ສົ່ງຂໍ້ຄວາມ</span>
            </button>
            <button
              onClick={handleWhatsAppWithImage}
              disabled={isProcessingWhatsApp}
              aria-label="ສົ່ງຮູບໃບເງິນເດືອນຜ່ານ WhatsApp"
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold py-2 px-1.5 rounded-lg transition shadow-sm cursor-pointer min-h-[38px] focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
              title="Copy image to clipboard & Send via WhatsApp"
            >
              {isProcessingWhatsApp ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
              ) : (
                <ImageIcon className="w-4 h-4 text-white" aria-hidden="true" />
              )}
              <span>ສົ່ງຮູບ WhatsApp</span>
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={isDownloadingImage}
              aria-label="ດາວໂຫຼດຮູບໃບແຈ້ງເງິນເດືອນ (PNG)"
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-slate-700 text-xs font-semibold py-2 px-1.5 rounded-lg transition shadow-sm cursor-pointer min-h-[38px] focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
              title="Download payslip image (PNG)"
            >
              {isDownloadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4 text-slate-300" aria-hidden="true" />
              )}
              <span>ດາວໂຫຼດຮູບ</span>
            </button>
            <button
              onClick={handlePrint}
              aria-label="ພິມໃບແຈ້ງເງິນເດືອນ (Print)"
              className="flex items-center justify-center gap-1.5 bg-[#0077b6] hover:bg-[#005f92] active:scale-[0.98] text-white text-xs font-bold py-2 px-1.5 rounded-lg transition shadow-sm cursor-pointer min-h-[38px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              title="Print payslip"
            >
              <Printer className="w-4 h-4 text-white" aria-hidden="true" />
              <span>ພິມ</span>
            </button>
          </div>
        </div>

        {/* Scrollable Document Wrapper */}
        <div
          className="w-full max-h-[calc(100dvh-140px)] overflow-y-auto overflow-x-hidden flex justify-center items-start rounded-xl shadow-2xl bg-white border border-slate-700/50"
          style={{
            height:
              typeof window !== 'undefined' && window.innerWidth >= 640 && containerRef.current && scale < 1
                ? `${containerRef.current.scrollHeight * scale}px`
                : 'auto'
          }}
        >
          <div
            ref={containerRef}
            style={{
              transform:
                typeof window !== 'undefined' && window.innerWidth >= 640 && scale < 1
                  ? `scale(${scale})`
                  : undefined,
              transformOrigin: 'top center',
              width: '100%'
            }}
          >
            <Payslip employee={employee} periodId={periodId} isCompact={true} />
          </div>
        </div>
      </div>
    </div>
  );
};
