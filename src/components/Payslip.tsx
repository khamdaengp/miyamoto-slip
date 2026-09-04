import React from 'react';
import { EmployeeRecord } from '../types/payroll';
import { MIYAMOTO_LOGO_BASE64 } from '../assets/logo';
import { getPeriodInfo, formatNum } from '../utils/formatters';

interface PayslipProps {
  employee: EmployeeRecord;
  periodId: string;
  isCompact?: boolean;
}

export const Payslip: React.FC<PayslipProps> = ({ employee, periodId, isCompact = false }) => {
  const periodInfo = getPeriodInfo(periodId);
  const displayMonth = periodInfo.displayMonthLao || periodId;

  const earningsList = [
    { num: 1, lbl: "ເງິນເດືອນພື້ນຖານ Basic Salary", val: employee.earnings.basicSalary },
    { num: 2, lbl: "ເງິນລ່ວງເວລາ Overtime", val: employee.earnings.ot },
    { num: 3, lbl: "ເງິນກາງຄືນ", val: employee.earnings.night },
    { num: 4, lbl: "ເງິນຄວາມປອດໄພ", val: employee.earnings.safety },
    { num: 5, lbl: "ເງິນຄວາມຮ່ວມມື", val: employee.earnings.coop },
    { num: 6, lbl: "-", val: null },
    { num: 7, lbl: "ເງິນຄວາມສະຫຍັນ", val: employee.earnings.diligence },
    { num: 8, lbl: "ເງິນຄວາມສະອາດ5ສ", val: employee.earnings.fiveS },
    { num: 9, lbl: "ເງິນຄ່າທີ່ພັກ", val: employee.earnings.housing },
    { num: 10, lbl: "ເງິນເປົ້າໝາຍການຜະລິດ", val: employee.earnings.target },
    { num: 11, lbl: "ເງິນຕຳແໜ່ງ", val: employee.earnings.position },
    { num: 12, lbl: "ເງິນນ້ຳມັນ", val: employee.earnings.gas }
  ];

  const deductionsList = [
    { num: 1, lbl: "ປະກັນສັງຄົມ", val: employee.deductions.sso },
    { num: 2, lbl: "ມາຊ້າ 1-10 ນາທີ", val: employee.deductions.late1 },
    { num: 3, lbl: "ມາຊ້າ 10-30 ນາທີ", val: employee.deductions.late2 },
    { num: 4, lbl: "ມາຊ້າ 30 ນາທີຂຶ້ນໄປ", val: employee.deductions.late3 },
    { num: 5, lbl: "ເງິນຂາດວຽກ", val: employee.deductions.absent },
    { num: 6, lbl: "ບໍ່ເຕັມເດືອນ", val: employee.deductions.incomplete },
    { num: 7, lbl: "ພາສີລາຍໄດ້ສ່ວນບຸກຄົນ 5%", val: employee.deductions.tax }
  ];

  return (
    <div
      className={`payslip-print-container bg-white text-[#333333] w-full max-w-full box-border ${
        isCompact ? 'p-3 md:p-4 text-xs' : 'p-6 md:p-8 shadow-xl text-sm'
      } mx-auto font-['Noto_Sans_Lao',sans-serif]`}
      id="payslip-document"
    >
      {/* Slip Header */}
      <div className={`flex border-2 border-black ${isCompact ? 'min-h-[60px] mb-3' : 'min-h-[90px] mb-6'}`}>
        <div className="flex-[0_0_35%] p-2 flex items-center justify-center border-r-2 border-black bg-white">
          <img
            src={MIYAMOTO_LOGO_BASE64}
            alt="Miyamoto AC Logo"
            className={`${isCompact ? 'max-h-[50px]' : 'max-h-[75px]'} max-w-full object-contain`}
          />
        </div>
        <div className="flex-1 bg-[#0097E0] text-white flex flex-col justify-center items-center text-center p-2 md:p-3">
          <h1 className={`${isCompact ? 'text-base font-bold' : 'text-xl md:text-2xl font-bold'} m-0 leading-tight`}>
            ໃບແຈ້ງເງິນເດືອນ
          </h1>
          <h2 className={`${isCompact ? 'text-xs' : 'text-sm md:text-base'} m-0 mt-1 font-normal opacity-95`}>
            ປະຈຳເດືອນ {displayMonth}
          </h2>
        </div>
      </div>

      {/* Employee Info */}
      <div className={`grid grid-cols-[auto_1fr] gap-x-4 ${isCompact ? 'gap-y-1 mb-3 text-xs' : 'gap-y-2 mb-6 text-sm'}`}>
        <div className="font-medium text-gray-700">1 ລາຍຊື່ພະນັກງານ</div>
        <div className="text-right font-bold uppercase">{employee.name || '-'}</div>

        <div className="font-medium text-gray-700">2 ຕຳແໜ່ງ</div>
        <div className="text-right font-bold uppercase">{employee.position || '-'}</div>

        <div className="font-medium text-gray-700">3 ລະຫັດ</div>
        <div className="text-right font-bold uppercase tracking-wider">{employee.employeeId || '-'}</div>
      </div>

      {/* Earnings Section */}
      <div className={`text-center font-bold text-[#1a5276] ${isCompact ? 'my-2 text-sm' : 'my-4 text-base'}`}>
        ລາຍຮັບ
      </div>

      <div className="space-y-1">
        {earningsList.map((item) => (
          <div
            key={item.num}
            className={`flex justify-between border-b border-dashed border-gray-200 pb-0.5 ${
              isCompact ? 'text-[11px]' : 'text-sm'
            }`}
          >
            <div className="flex gap-2 flex-1">
              <span className="w-5 text-right shrink-0 text-gray-500 font-medium">{item.num}</span>
              <span className="truncate">{item.lbl}</span>
            </div>
            <div className={`text-right shrink-0 font-medium ${isCompact ? 'w-24' : 'w-28'}`}>
              {item.val !== null ? formatNum(item.val, item.num > 3) : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Total Earnings */}
      <div className={`flex justify-between font-bold ${isCompact ? 'mt-2 pt-1 text-xs' : 'mt-3 pt-1 text-sm'}`}>
        <div>ລວມຮັບ</div>
        <div
          className={`text-right shrink-0 border-t border-black border-b-[3px] border-b-double border-black py-0.5 font-bold ${
            isCompact ? 'w-24' : 'w-28'
          }`}
        >
          {formatNum(employee.earnings.total)}
        </div>
      </div>

      <div className="my-2"></div>

      {/* Deductions Section */}
      <div className={`text-center font-bold text-[#1a5276] ${isCompact ? 'my-2 text-sm' : 'my-4 text-base'}`}>
        ລາຍຈ່າຍ / ຫັກ
      </div>

      <div className="space-y-1">
        {deductionsList.map((item) => (
          <div
            key={item.num}
            className={`flex justify-between border-b border-dashed border-gray-200 pb-0.5 ${
              isCompact ? 'text-[11px]' : 'text-sm'
            }`}
          >
            <div className="flex gap-2 flex-1">
              <span className="w-5 text-right shrink-0 text-gray-500 font-medium">{item.num}</span>
              <span className="truncate">{item.lbl}</span>
            </div>
            <div className={`text-right shrink-0 font-medium ${isCompact ? 'w-24' : 'w-28'}`}>
              {formatNum(item.val, item.num === 1)}
            </div>
          </div>
        ))}
      </div>

      {/* Total Deductions */}
      <div className={`flex justify-between font-bold ${isCompact ? 'mt-2 pt-1 text-xs' : 'mt-3 pt-1 text-sm'}`}>
        <div>ລວມຫັກ</div>
        <div
          className={`text-right shrink-0 border-t border-black border-b-[3px] border-b-double border-black py-0.5 font-bold ${
            isCompact ? 'w-24' : 'w-28'
          }`}
        >
          {formatNum(employee.deductions.total)}
        </div>
      </div>

      {/* Net Pay */}
      <div
        className={`flex justify-between font-bold text-[#1a5276] ${
          isCompact ? 'mt-3 text-sm' : 'mt-5 text-base'
        }`}
      >
        <div>ລວມຮັບສຸດທິ</div>
        <div
          className={`text-right shrink-0 border-t border-black border-b-[3px] border-b-double border-black py-0.5 font-bold ${
            isCompact ? 'w-24' : 'w-28'
          }`}
        >
          {formatNum(employee.netPay)}
        </div>
      </div>

      {/* Signatures */}
      <div
        className={`flex justify-between font-bold text-[#1a5276] ${
          isCompact ? 'mt-6 text-xs' : 'mt-12 text-sm'
        }`}
      >
        <div className="border-t border-gray-400 pt-1 px-4 text-center">Requestor</div>
        <div className="border-t border-gray-400 pt-1 px-4 text-center">HR department</div>
      </div>
    </div>
  );
};
