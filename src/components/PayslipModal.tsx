import React, { useEffect, useRef, useState } from 'react';
import { X, Printer } from 'lucide-react';
import { EmployeeRecord } from '../types/payroll';
import { Payslip } from './Payslip';

interface PayslipModalProps {
  employee: EmployeeRecord | null;
  periodId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  employee,
  periodId,
  isOpen,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs no-print-backdrop">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-[490px] max-h-[96vh] flex flex-col items-center">
        {/* Actions bar */}
        <div className="w-full flex justify-between items-center mb-2 px-1 text-white no-print">
          <span className="text-xs font-semibold bg-gray-800/80 px-2.5 py-1 rounded border border-gray-700">
            {employee.employeeId} - {employee.name}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#0097E0] hover:bg-[#0086c7] text-white text-xs font-bold px-3 py-1.5 rounded transition shadow-md cursor-pointer"
              title="Print payslip"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ພິມ (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="bg-red-700 hover:bg-red-800 text-white p-1.5 rounded transition cursor-pointer shadow-md"
              title="Close modal"
            >
              <X className="w-4 h-4" />
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
