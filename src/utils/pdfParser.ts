import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { EmployeeRecord, RawEmployeeData } from '../types/payroll';
import { formatNum, LAO_MONTHS } from './formatters';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageLine {
  y: number;
  text: string;
  items: TextItem[];
}

export interface ParsedPdfResult {
  employees: EmployeeRecord[];
  detectedPeriod?: string;
}

/**
 * Extract numbers safely from string, stripping currency and commas
 */
function extractNumber(str: string): number {
  if (!str) return 0;
  // Replace Lao numerals if any
  const clean = str
    .replace(/[^\d.-]/g, '')
    .trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Detect period ID (YYYYMM) from Lao month text or digits
 */
export function detectPeriodFromText(text: string): string | undefined {
  // Pattern 1: Direct YYYYMM (e.g. 202606)
  const yyyymmMatch = text.match(/\b(202[4-9])(0[1-9]|1[0-2])\b/);
  if (yyyymmMatch) {
    return `${yyyymmMatch[1]}${yyyymmMatch[2]}`;
  }

  // Pattern 2: Lao month name + year (e.g. "ປະຈຳເດືອນ ມິຖູນາ 2026" or "ມິຖູນາ 2026")
  for (const [code, monthName] of Object.entries(LAO_MONTHS)) {
    if (text.includes(monthName)) {
      const yearMatch = text.match(/\b(202[4-9])\b/);
      if (yearMatch) {
        return `${yearMatch[1]}${code}`;
      }
    }
  }

  return undefined;
}

/**
 * Parses an individual Payslip page structure
 */
function parsePayslipPage(lines: PageLine[], pageIndex: number): EmployeeRecord | null {
  const fullText = lines.map((l) => l.text).join('\n');

  // Look for employee ID (e.g. MYL202504053, MY001, MY-123)
  const idMatch = fullText.match(/\b(MY[A-Z0-9_-]{2,20})\b/i);
  let employeeId = idMatch ? idMatch[1].toUpperCase() : '';

  if (!employeeId) {
    // Try finding after "ລະຫັດ" or "Employee ID"
    for (const l of lines) {
      if (/ລະຫັດ|Employee\s*ID/i.test(l.text)) {
        const parts = l.text.split(/ລະຫັດ|Employee\s*ID/i);
        const candidate = parts[1]?.trim().split(/\s+/)[0];
        if (candidate && candidate.length >= 3) {
          employeeId = candidate;
          break;
        }
      }
    }
  }

  // Look for employee name
  let name = '';
  for (const l of lines) {
    if (/ລາຍຊື່ພະນັກງານ|Employee\s*Name|Name\s*and\s*Surname/i.test(l.text)) {
      const cleaned = l.text
        .replace(/ລາຍຊື່ພະນັກງານ|Employee\s*Name|Name\s*and\s*Surname|[:1]/gi, '')
        .trim();
      if (cleaned.length > 2) {
        name = cleaned;
        break;
      }
    }
  }

  // Look for position
  let position = '';
  for (const l of lines) {
    if (/ຕຳແໜ່ງ|Position/i.test(l.text)) {
      const cleaned = l.text
        .replace(/ຕຳແໜ່ງ|Position|[:2]/gi, '')
        .trim();
      if (cleaned.length > 1) {
        position = cleaned;
        break;
      }
    }
  }

  // Look for phone number
  let phone = '';
  const phoneMatch = fullText.match(/(?:856\s?20|020|20)\s?([0-9]{8})/);
  if (phoneMatch) {
    phone = phoneMatch[0].replace(/\s+/g, '');
  }

  // Helper to find numeric value in lines matching keywords
  const findValue = (patterns: (string | RegExp)[]): number => {
    for (const l of lines) {
      const matched = patterns.some((p) =>
        typeof p === 'string' ? l.text.includes(p) : p.test(l.text)
      );
      if (matched) {
        // Extract numbers from the line (take the rightmost or largest non-index number)
        const tokens = l.items.map((it) => it.str.trim()).filter(Boolean);
        for (let i = tokens.length - 1; i >= 0; i--) {
          const num = extractNumber(tokens[i]);
          if (num > 0) return num;
        }
      }
    }
    return 0;
  };

  // Earnings
  const basicSalary = findValue(['ເງິນເດືອນພື້ນຖານ', 'Basic Salary']);
  const ot = findValue(['ເງິນລ່ວງເວລາ', 'Overtime']);
  const night = findValue(['ເງິນກາງຄືນ', 'ເງິນກະກາງຄືນ', 'Night']);
  const safety = findValue(['ເງິນຄວາມປອດໄພ', 'Safety']);
  const coop = findValue(['ເງິນຄວາມຮ່ວມມື', 'ເງິນຄວາມ ຮວມມື', 'Cooperation']);
  const diligence = findValue(['ເງິນຄວາມສະຫຍັນ', 'ເງິນຄວາມຂະຫຍັນ', 'Diligence']);
  const fiveS = findValue(['ເງິນຄວາມສະອາດ5ສ', '5S']);
  const housing = findValue(['ເງິນຄ່າທີ່ພັກ', 'Housing']);
  const target = findValue(['ເງິນເປົ້າໝາຍການຜະລິດ', 'ເງິນເປົ້າການຜະລິດ', 'Target']);
  const positionEarn = findValue(['ເງິນຕຳແໜ່ງ', 'ເງີນຕຳແໜ່ງ', 'Position Allowance']);
  const gas = findValue(['ເງິນນ້ຳມັນ', 'Fuel', 'Gas']);
  const totalEarningsFound = findValue(['ລວມຮັບ', 'Total Earnings']);
  const calculatedEarnings =
    basicSalary + ot + night + safety + coop + diligence + fiveS + housing + target + positionEarn + gas;
  const totalEarnings = totalEarningsFound > 0 ? totalEarningsFound : calculatedEarnings;

  // Deductions
  const sso = findValue(['ປະກັນສັງຄົມ', 'ປະກັນສັ່ງຄົມ', 'Social Security', 'SSO']);
  const late1 = findValue(['ມາຊ້າ 1-10', 'Late 1-10']);
  const late2 = findValue(['ມາຊ້າ 10-30', 'Late 10-30']);
  const late3 = findValue(['ມາຊ້າ 30', 'Late 30']);
  const absent = findValue(['ເງິນຂາດວຽກ', 'Absence']);
  const incomplete = findValue(['ບໍ່ເຕັມເດືອນ', 'Incomplete']);
  const tax = findValue(['ພາສີ', 'Tax']);
  const totalDeductionsFound = findValue(['ລວມຫັກ', 'Total Deductions']);
  const calculatedDeductions = sso + late1 + late2 + late3 + absent + incomplete + tax;
  const totalDeductions = totalDeductionsFound > 0 ? totalDeductionsFound : calculatedDeductions;

  // Net Pay
  const netPayFound = findValue(['ລວມຮັບສຸດທິ', 'ຈ່າຍຈິງ', 'Net Pay', 'Net Income']);
  const netPay = netPayFound > 0 ? netPayFound : Math.max(0, totalEarnings - totalDeductions);

  // If no employee ID and no name and no salary, skip this page (probably a cover or summary page)
  if (!employeeId && !name && totalEarnings === 0) {
    return null;
  }

  const empId = employeeId || `EMP${String(pageIndex + 1).padStart(3, '0')}`;
  const empName = name || `Staff ${empId}`;

  const raw: RawEmployeeData = {
    'ລະຫັດພງ Emplyee ID': empId,
    'ຊື່ ແລະ ນາສະກຸນ Name and Surname': empName,
    'ຕຳແໜ່ງ Position': position,
    'Telephone': phone,
    'ລວມຮັບສຸດທິ จ่ายจริง': netPay,
  };

  return {
    id: `pdf_emp_${String(pageIndex + 1).padStart(4, '0')}`,
    employeeId: empId,
    name: empName,
    position: position || '-',
    phone,
    netPay,
    netPayFormatted: formatNum(netPay),
    payslip_sent: false,
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
      total: totalEarnings,
    },
    deductions: {
      sso,
      late1,
      late2,
      late3,
      absent,
      incomplete,
      tax,
      total: totalDeductions,
    },
    raw,
  };
}

/**
 * Parses a Tabular report PDF where each row is an employee
 */
function parseTabularLines(lines: PageLine[], startIndex: number): EmployeeRecord[] {
  const records: EmployeeRecord[] = [];

  for (const line of lines) {
    const text = line.text.trim();
    // Check if line contains an employee ID (e.g. MYL... or MY...)
    const idMatch = text.match(/\b(MY[A-Z0-9_-]{2,20})\b/i);
    if (!idMatch) continue;

    const employeeId = idMatch[1].toUpperCase();

    // Extract numbers from the line items
    const numbers: number[] = [];
    const textTokens: string[] = [];

    for (const item of line.items) {
      const clean = item.str.trim();
      if (!clean) continue;
      const num = extractNumber(clean);
      if (num > 0 && /[\d,]+/.test(clean)) {
        numbers.push(num);
      } else if (!/^\d+$/.test(clean) && clean.toUpperCase() !== employeeId) {
        textTokens.push(clean);
      }
    }

    // Name is usually the first non-numeric text after or before ID
    const name = textTokens.length > 0 ? textTokens[0] : `Staff ${employeeId}`;
    const position = textTokens.length > 1 ? textTokens[1] : '-';

    // In a payroll table, the last large number is typically Net Pay
    const netPay = numbers.length > 0 ? numbers[numbers.length - 1] : 0;
    const basicSalary = numbers.length > 1 ? numbers[0] : netPay;

    records.push({
      id: `pdf_row_${String(startIndex + records.length + 1).padStart(4, '0')}`,
      employeeId,
      name,
      position,
      phone: '',
      netPay,
      netPayFormatted: formatNum(netPay),
      payslip_sent: false,
      earnings: {
        basicSalary,
        ot: 0,
        night: 0,
        safety: 0,
        coop: 0,
        diligence: 0,
        fiveS: 0,
        housing: 0,
        target: 0,
        position: 0,
        gas: 0,
        total: basicSalary,
      },
      deductions: {
        sso: 0,
        late1: 0,
        late2: 0,
        late3: 0,
        absent: 0,
        incomplete: 0,
        tax: 0,
        total: Math.max(0, basicSalary - netPay),
      },
      raw: {
        'ລະຫັດພງ Emplyee ID': employeeId,
        'ຊື່ ແລະ ນາສະກຸນ Name and Surname': name,
        'ຕຳແໜ່ງ Position': position,
        'ລວມຮັບສຸດທິ': netPay,
      },
    });
  }

  return records;
}

/**
 * Main entry point: Parses any PDF payroll file (payslips or table report)
 */
export async function parsePdfFile(file: File): Promise<ParsedPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  let detectedPeriod: string | undefined;
  const pageLinesList: PageLine[][] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items: TextItem[] = [];

    for (const it of textContent.items) {
      if ('str' in it && typeof it.str === 'string' && it.str.trim()) {
        const x = it.transform[4];
        const y = it.transform[5];
        items.push({
          str: it.str,
          x,
          y,
          width: it.width,
          height: it.height,
        });
      }
    }

    // Sort top to bottom, then left to right
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group items into lines
    const lines: PageLine[] = [];
    for (const item of items) {
      const existingLine = lines.find((l) => Math.abs(l.y - item.y) <= 4);
      if (existingLine) {
        existingLine.items.push(item);
      } else {
        lines.push({
          y: item.y,
          text: '',
          items: [item],
        });
      }
    }

    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);
      line.text = line.items.map((it) => it.str.trim()).join(' ');
    }

    // Try detecting period on first few pages
    if (!detectedPeriod) {
      const pageFullText = lines.map((l) => l.text).join(' ');
      detectedPeriod = detectPeriodFromText(pageFullText);
    }

    pageLinesList.push(lines);
  }

  // Check if pages look like individual payslips
  // A payslip page typically has "ໃບແຈ້ງເງິນເດືອນ", "ລາຍຊື່ພະນັກງານ", or "ລາຍຮັບ"
  const isPayslipFormat = pageLinesList.some((lines) =>
    lines.some((l) => /ໃບແຈ້ງເງິນເດືອນ|ລາຍຊື່ພະນັກງານ|ລາຍຮັບ|Payslip/i.test(l.text))
  );

  const employees: EmployeeRecord[] = [];

  if (isPayslipFormat) {
    pageLinesList.forEach((lines, idx) => {
      const record = parsePayslipPage(lines, idx);
      if (record) {
        employees.push(record);
      }
    });
  }

  // If no employees found via payslip format, try tabular report parsing across all pages
  if (employees.length === 0) {
    pageLinesList.forEach((lines) => {
      const tableRecords = parseTabularLines(lines, employees.length);
      employees.push(...tableRecords);
    });
  }

  if (employees.length === 0) {
    throw new Error(
      'ບໍ່ພົບຂໍ້ມູນພະນັກງານໃນໄຟລ໌ PDF. ກະລຸນາກວດສອບວ່າໄຟລ໌ມີລະຫັດພະນັກງານ (MY...) ຫຼື ໃບແຈ້ງເງິນເດືອນ. (No employee records found in PDF)'
    );
  }

  return {
    employees,
    detectedPeriod,
  };
}
