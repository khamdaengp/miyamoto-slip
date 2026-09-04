import { EmployeeRecord } from '../types/payroll';
import { parseEmployeeRecord } from './excelParser';

const STORAGE_PREFIX = 'miyamoto_salary_';

export function loadEmployeesFromStorage(periodId: string): EmployeeRecord[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${periodId}`);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    
    return list.map((item, index) => {
      // Check if it's already full EmployeeRecord structure or raw data
      if (item.earnings && item.deductions) {
        return item as EmployeeRecord;
      }
      return parseEmployeeRecord(item, index, Boolean(item.payslip_sent));
    });
  } catch (err) {
    console.error(`Failed to load data for period ${periodId}:`, err);
    return [];
  }
}

export function saveEmployeesToStorage(periodId: string, employees: EmployeeRecord[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${periodId}`, JSON.stringify(employees));
  } catch (err) {
    console.error(`Failed to save data for period ${periodId}:`, err);
  }
}

export function clearEmployeesFromStorage(periodId: string): boolean {
  try {
    const key = `${STORAGE_PREFIX}${periodId}`;
    if (!localStorage.getItem(key)) {
      return false;
    }
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`Failed to clear storage for period ${periodId}:`, err);
    return false;
  }
}

export function exportJsonBackup(periodId: string, employees: EmployeeRecord[]): void {
  const blob = new Blob([JSON.stringify(employees, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_salary_${periodId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
