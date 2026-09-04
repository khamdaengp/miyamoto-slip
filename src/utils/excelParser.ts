import * as XLSX from 'xlsx';
import { EmployeeRecord, RawEmployeeData } from '../types/payroll';
import { toNum, formatNum } from './formatters';

function cleanHeader(h: unknown): string {
  return String(h ?? "").replace(/\s+/g, " ").trim();
}

export function parseEmployeeRecord(raw: RawEmployeeData, index: number, defaultSentStatus = false): EmployeeRecord {
  const employeeId = String(raw['ລະຫັດພງ Emplyee ID'] || raw['Employee ID'] || '').trim();
  const name = String(raw['ຊື່ ແລະ ນາສະກຸນ Name and Surname'] || raw['Employee Name'] || '').trim();
  const position = String(raw['ຕຳແໜ່ງ Position'] || raw['Position'] || '').trim();
  const phone = String(
    raw['Phone Number'] ||
    raw['Phone'] ||
    raw['Telephone'] ||
    raw['Tel'] ||
    raw['ເບີໂທ'] ||
    raw['ເບີໂທລະສັບ'] ||
    ''
  ).trim();

  // Earnings
  const basicSalary = toNum(raw['ເງິນເດືອນພື້ນຖານ Basic Salary'] || raw['Basic Salary']);
  const ot = toNum(raw['ເງິນລ່ວງເວລາ Overtime'] || raw['Overtime Pay']);
  const night = toNum(raw['ເງິນກະກາງຄືນ'] || raw['Night Shift Allowance']);
  const safety = toNum(raw['ເງິນຄວາມປອດໄພ'] || raw['Safety Allowance']);
  const coop = toNum(raw['ເງິນຄວາມ ຮວມມື'] || raw['Cooperation Allowance']);
  const diligence = toNum(raw['ເງິນຄວາມຂະຫຍັນ'] || raw['Diligence Allowance']);
  const fiveS = toNum(raw['ເງິນຄວາມສະອາດ5ສ'] || raw['5S Allowance']);
  const housing = toNum(raw['ເງິນຄ່າທີ່ພັກ'] || raw['Housing Allowance']);
  const target = toNum(raw['ເງິນເປົ້າການຜະລິດ'] || raw['Production Target Allowance']);
  const positionEarn = toNum(raw['ເງີນຕຳແໜ່ງ'] || raw['Position Allowance']);
  const gas = toNum(raw['ເງິນນ້ຳມັນ'] || raw['Fuel Allowance']);
  const rawTotalEarnings = toNum(raw['ລວມຮັບ'] || raw['Total Earnings']);
  const calculatedTotalEarnings = basicSalary + ot + night + safety + coop + diligence + fiveS + housing + target + positionEarn + gas;
  const totalEarnings = rawTotalEarnings > 0 ? rawTotalEarnings : calculatedTotalEarnings;

  // Deductions
  const sso = toNum(raw['ປະກັນສັ່ງຄົມ'] || raw['Social Security']);
  const late1 = toNum(raw['ມາຊ້າ 1-10 ນາທີ'] || raw['Late Penalty (1-10 mins)']);
  const late2 = toNum(raw['ມາຊ້າ 10-30 ນາທີ'] || raw['Late Penalty (10-30 mins)']);
  const late3 = toNum(raw['ມາຊ້າ 30 ນາທີຂື້ນໄປ'] || raw['Late Penalty (30+ mins)']);
  const absent = toNum(raw['ເງິນຂາດວຽກ'] || raw['Absence Deduction']);
  const incomplete = toNum(raw['ບໍ່ເຕັມເດືອນ'] || raw['incomplete Month Deduction']);
  const tax = toNum(raw['ພາສີ 5%'] || raw['Income Tax (5%)']);
  const sumDeductions = sso + late1 + late2 + late3 + absent + incomplete + tax;

  // Net Pay
  const rawNetPay = raw['ລວມຮັບສຸດທິ ຈ່າຍຈິງ'] || raw['ລວມຮັບສຸດທິ'] || raw['Net Income'];
  const netPay = toNum(rawNetPay) || (totalEarnings - sumDeductions);

  return {
    id: `employee_${String(index + 1).padStart(4, "0")}`,
    employeeId,
    name,
    position,
    phone,
    netPay,
    netPayFormatted: formatNum(netPay),
    payslip_sent: Boolean(raw.payslip_sent ?? defaultSentStatus),
    earnings: {
      basicSalary,
      ot,
      night,
      safety,
      coop,
      diligence,
      fiveS,
      housing,
      target,
      position: positionEarn,
      gas,
      total: totalEarnings
    },
    deductions: {
      sso,
      late1,
      late2,
      late3,
      absent,
      incomplete,
      tax,
      total: sumDeductions
    },
    raw
  };
}

export async function parseExcelFile(file: File): Promise<EmployeeRecord[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  // Locate sheet named TAX (or case-insensitive fallback)
  let sheetName = Object.keys(workbook.Sheets).find(s => s.toUpperCase() === "TAX");
  if (!sheetName) {
    // If no sheet named TAX, fallback to first sheet
    sheetName = workbook.SheetNames[0];
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('Sheet "TAX" not found in workbook');
  }

  // skiprows=5 (pandas) == range: 5 (0-based) in SheetJS: skip first 5 rows, row 6 is header
  const rawRows: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: 5,
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) {
    throw new Error("No data found in sheet after row 5");
  }

  const headers = (rawRows[0] || []).map(cleanHeader);
  const dataRows = rawRows.slice(1);

  let rawEmployees: RawEmployeeData[] = dataRows.map((row) => {
    const record: RawEmployeeData = {};
    headers.forEach((col, i) => {
      if (!col || col === "") return;
      const val = row[i];
      record[col] = val === undefined || val === null ? "" : String(val).trim();
    });
    return record;
  });

  // Truncate when hitting a row with neither ID nor Name (summary rows at bottom)
  const stopIndex = rawEmployees.findIndex(rec => {
    const empId = rec['ລະຫັດພງ Emplyee ID'] || rec['Employee ID'] || '';
    const name = rec['ຊື່ ແລະ ນາສະກຸນ Name and Surname'] || rec['Employee Name'] || '';
    const hasValues = Object.values(rec).some(v => v !== "");
    return hasValues && String(empId).trim() === '' && String(name).trim() === '';
  });

  if (stopIndex !== -1) {
    rawEmployees = rawEmployees.slice(0, stopIndex);
  }

  // Remove fully empty rows or rows without an ID
  rawEmployees = rawEmployees.filter((rec) => {
    const hasValues = Object.values(rec).some((v) => v !== "");
    const empId = rec['ລະຫັດພງ Emplyee ID'] || rec['Employee ID'] || '';
    return hasValues && String(empId).trim() !== '';
  });

  // Validate employee ID (matches ^MY...)
  rawEmployees = rawEmployees.filter((rec) => {
    const empId = String(rec['ລະຫັດພງ Emplyee ID'] || rec['Employee ID'] || '').trim();
    return /^MY/i.test(empId);
  });

  // Stop when "No" column is empty
  if (headers.includes("No")) {
    const firstEmptyIndex = rawEmployees.findIndex((rec) => rec["No"] === "");
    if (firstEmptyIndex !== -1) {
      rawEmployees = rawEmployees.slice(0, firstEmptyIndex);
    }
  }

  return rawEmployees.map((raw, idx) => parseEmployeeRecord(raw, idx, false));
}
