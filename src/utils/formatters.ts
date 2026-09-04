import { PeriodInfo } from '../types/payroll';

export const LAO_MONTHS: Record<string, string> = {
  "01": "ມັງກອນ",
  "02": "ກຸມພາ",
  "03": "ມີນາ",
  "04": "ເມສາ",
  "05": "ພຶດສະພາ",
  "06": "ມິຖຸນາ",
  "07": "ກໍລະກົດ",
  "08": "ສິງຫາ",
  "09": "ກັນຍາ",
  "10": "ຕຸລາ",
  "11": "ພະຈິກ",
  "12": "ທັນວາ"
};

/**
 * Returns default period ID based on last month (YYYYMM)
 */
export function getDefaultPeriodId(): string {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yyyy = lastMonth.getFullYear();
  const mm = String(lastMonth.getMonth() + 1).padStart(2, "0");
  return `${yyyy}${mm}`;
}

/**
 * Extract display month in Lao e.g. "ມິຖຸນາ 2026"
 */
export function getPeriodInfo(periodId: string): PeriodInfo {
  const clean = periodId.trim();
  const year = clean.length >= 4 ? clean.substring(0, 4) : "";
  const monthKey = clean.length >= 6 ? clean.substring(4, 6) : "";
  const monthName = LAO_MONTHS[monthKey] || "ບໍ່ລະບຸ";
  
  return {
    periodId: clean,
    year,
    monthKey,
    displayMonthLao: `${monthName} ${year}`.trim()
  };
}

/**
 * Parse any Excel string/number value safely into a valid number.
 * Strips whitespace, dashes (" - "), and comma separators.
 */
export function toNum(val: unknown): number {
  if (val === undefined || val === null) return 0;
  const cleaned = String(val).trim();
  if (cleaned === '' || cleaned === '-' || cleaned.replace(/-/g, '').trim() === '') return 0;
  const num = Number(cleaned.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Format a number or string into US comma grouping e.g. 13,613,400.
 * Returns empty string or '0' if empty.
 */
export function formatNum(val: unknown, returnEmptyOnZero = false): string {
  if (val === undefined || val === null) return returnEmptyOnZero ? '' : '0';
  const cleaned = String(val).trim();
  if (cleaned === '' || cleaned === '-' || cleaned.replace(/-/g, '').trim() === '') {
    return returnEmptyOnZero ? '' : '0';
  }
  const num = Number(cleaned.replace(/,/g, ''));
  if (isNaN(num)) return cleaned;
  if (num === 0 && returnEmptyOnZero) return '';
  return num.toLocaleString('en-US');
}

/**
 * Standardize Lao phone numbers into wa.me format (+856)
 */
export function normalizeLaoPhone(rawPhone: string): string {
  let phoneNum = rawPhone.replace(/\D/g, '');
  if (phoneNum.startsWith('20') && phoneNum.length === 10) {
    phoneNum = '856' + phoneNum;
  } else if (phoneNum.length === 8 && phoneNum.startsWith('20')) {
    phoneNum = '856' + phoneNum;
  } else if (phoneNum.startsWith('020')) {
    phoneNum = '85620' + phoneNum.substring(3);
  } else if (phoneNum.length === 8) {
    phoneNum = '85620' + phoneNum;
  }
  return phoneNum;
}
