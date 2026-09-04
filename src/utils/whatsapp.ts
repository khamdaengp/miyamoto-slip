import { EmployeeRecord } from '../types/payroll';
import { normalizeLaoPhone, getPeriodInfo } from './formatters';
import { Capacitor } from '@capacitor/core';

export function buildWhatsAppMessage(employee: EmployeeRecord, periodId: string): string {
  const periodInfo = getPeriodInfo(periodId);
  const displayMonth = periodInfo.displayMonthLao || periodId;

  let msg = `ສະບາຍດີ ທ່ານ ${employee.name},\n\n📄 ໃບແຈ້ງເງິນເດືອນ ປະຈຳເດືອນ ${displayMonth}\nເລກທີ: ${employee.employeeId}\nຕຳແໜ່ງ: ${employee.position}\n\n`;

  msg += `ລາຍຮັບ\n`;
  const earningsList = [
    { lbl: "ເງິນເດືອນພື້ນຖານ Basic Salary", v: employee.earnings.basicSalary },
    { lbl: "ເງິນລ່ວງເວລາ Overtime", v: employee.earnings.ot },
    { lbl: "ເງິນກາງຄືນ", v: employee.earnings.night },
    { lbl: "ເງິນຄວາມປອດໄພ", v: employee.earnings.safety },
    { lbl: "ເງິນຄວາມຮ່ວມມື", v: employee.earnings.coop },
    { lbl: "ເງິນຄວາມສະຫຍັນ", v: employee.earnings.diligence },
    { lbl: "ເງິນຄວາມສະອາດ5ສ", v: employee.earnings.fiveS },
    { lbl: "ເງິນຄ່າທີ່ພັກ", v: employee.earnings.housing },
    { lbl: "ເງິນເປົ້າໝາຍການຜະລິດ", v: employee.earnings.target },
    { lbl: "ເງິນຕຳແໜ່ງ", v: employee.earnings.position },
    { lbl: "ເງິນນ້ຳມັນ", v: employee.earnings.gas }
  ];

  earningsList.forEach((item, i) => {
    msg += `${i + 1}. ${item.lbl}: ${item.v.toLocaleString('en-US')} ກີບ\n`;
  });
  msg += `ລວມຮັບ: ${employee.earnings.total.toLocaleString('en-US')} ກີບ\n\n`;

  msg += `ລາຍຈ່າຍ / ຫັກ\n`;
  const deductionsList = [
    { lbl: "ປະກັນສັງຄົມ", v: employee.deductions.sso },
    { lbl: "ມາຊ້າ 1-10 ນາທີ", v: employee.deductions.late1 },
    { lbl: "ມາຊ້າ 10-30 ນາທີ", v: employee.deductions.late2 },
    { lbl: "ມາຊ້າ 30 ນາທີຂຶ້ນໄປ", v: employee.deductions.late3 },
    { lbl: "ເງິນຂາດວຽກ", v: employee.deductions.absent },
    { lbl: "ບໍ່ເຕັມເດືອນ", v: employee.deductions.incomplete },
    { lbl: "ພາສີລາຍໄດ້ສ່ວນບຸກຄົນ 5%", v: employee.deductions.tax }
  ];

  deductionsList.forEach((item, i) => {
    msg += `${i + 1}. ${item.lbl}: ${item.v.toLocaleString('en-US')} ກີບ\n`;
  });
  msg += `ລວມຫັກ: ${employee.deductions.total.toLocaleString('en-US')} ກີບ\n\n`;

  msg += `ລວມຮັບສຸດທິ: ${employee.netPay.toLocaleString('en-US')} ກີບ\n\n`;
  msg += `ຂໍຂອບໃຈ\nHR Department\nMiyamoto Lao`;

  return msg;
}

export function openWhatsAppPayslip(employee: EmployeeRecord, periodId: string): boolean {
  if (!employee.phone || employee.phone.trim() === '') {
    alert('ບໍ່ມີເບີໂທສຳລັບພະນັກງານນີ້ (No phone number found for this employee)');
    return false;
  }

  const phoneNum = normalizeLaoPhone(employee.phone);
  const msg = buildWhatsAppMessage(employee, periodId);
  const encodedMsg = encodeURIComponent(msg);
  const waWebUrl = `https://wa.me/${phoneNum}?text=${encodedMsg}`;

  // Native mobile app handling (Capacitor Android / iOS)
  if (Capacitor.isNativePlatform()) {
    const waNativeUrl = `whatsapp://send?phone=${phoneNum}&text=${encodedMsg}`;
    
    // Trigger native app intent via link
    const link = document.createElement('a');
    link.href = waNativeUrl;
    link.target = '_system';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Fallback if WhatsApp is not installed
    setTimeout(() => {
      window.open(waWebUrl, '_system');
    }, 600);
    return true;
  }

  window.open(waWebUrl, '_blank');
  return true;
}
