import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmployeeRecord } from '../types/payroll';
import { Payslip } from './Payslip';
import { openWhatsAppPayslip } from '../utils/whatsapp';

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
      const availH = window.innerHeight - 80;
      const naturalH = containerRef.current.scrollHeight;
      if (naturalH > 0 && availH < naturalH) {
        setScale(Math.max(0.65, Math.min(1, availH / naturalH)));
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs no-print-backdrop"
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div ref={modalRef} className="relative z-10 w-full max-w-[490px] max-h-[96vh] flex flex-col items-center">
        {/* Actions bar */}
        <div className="w-full flex justify-between items-center mb-2 px-1 text-white no-print gap-2">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {/* Stepper buttons if multiple employees */}
            {employees.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
                <button
                  onClick={handlePrev}
                  disabled={!canPrev}
                  aria-label="ພະນັກງານກ່ອນໜ້າ (Previous employee)"
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white"
                  title="Previous employee (← Arrow Left)"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <span className="text-[11px] font-mono px-1.5 text-slate-400">
                  {currentIndex + 1}/{employees.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={!canNext}
                  aria-label="ພະນັກງານຕໍ່ໄປ (Next employee)"
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white"
                  title="Next employee (→ Arrow Right)"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <span
              id="modal-employee-title"
              className="text-xs font-semibold bg-slate-900/90 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700/80 truncate max-w-[140px] sm:max-w-none"
            >
              {employee.employeeId} - {employee.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => openWhatsAppPayslip(employee, periodId)}
              aria-label="ສົ່ງໃບແຈ້ງເງິນເດືອນຜ່ານ WhatsApp"
              className="flex items-center gap-1 bg-[#25D366] hover:bg-[#1ebd5c] active:scale-[0.98] text-[#0f172a] text-xs font-bold px-2.5 sm:px-3 py-2 rounded-lg transition shadow-md cursor-pointer min-h-[36px] focus-visible:ring-2 focus-visible:ring-white"
              title="Send via WhatsApp"
            >
              <Send className="w-3.5 h-3.5 text-[#0f172a]" aria-hidden="true" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              aria-label="ພິມໃບແຈ້ງເງິນເດືອນ (Print)"
              className="flex items-center gap-1.5 bg-[#0077b6] hover:bg-[#005f92] active:scale-[0.98] text-white text-xs font-bold px-2.5 sm:px-3 py-2 rounded-lg transition shadow-md cursor-pointer min-h-[36px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              title="Print payslip"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">ພິມ (Print)</span>
            </button>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="ປິດໜ້າຕ່າງໃບແຈ້ງເງິນເດືອນ (Close modal)"
              className="bg-red-700 hover:bg-red-800 active:scale-[0.98] text-white p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              title="Close modal"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scaled Wrapper */}
        <div
          className="w-full overflow-hidden flex justify-center items-start rounded shadow-2xl bg-white"
          style={{
            height: containerRef.current && scale < 1 ? `${containerRef.current.scrollHeight * scale}px` : 'auto'
          }}
        >
          <div
            ref={containerRef}
            style={{
              transform: scale < 1 ? `scale(${scale})` : undefined,
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
