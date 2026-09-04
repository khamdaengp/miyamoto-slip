export interface RawEmployeeData {
  [key: string]: string | number | undefined | boolean;
}

export interface EmployeeRecord {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  phone: string;
  netPay: number;
  netPayFormatted: string;
  payslip_sent: boolean;
  
  // Earnings
  earnings: {
    basicSalary: number;
    ot: number;
    night: number;
    safety: number;
    coop: number;
    diligence: number;
    fiveS: number;
    housing: number;
    target: number;
    position: number;
    gas: number;
    total: number;
  };

  // Deductions
  deductions: {
    sso: number;
    late1: number;
    late2: number;
    late3: number;
    absent: number;
    incomplete: number;
    tax: number;
    total: number;
  };

  raw: RawEmployeeData;
}

export interface PeriodInfo {
  periodId: string;
  year: string;
  monthKey: string;
  displayMonthLao: string;
}
