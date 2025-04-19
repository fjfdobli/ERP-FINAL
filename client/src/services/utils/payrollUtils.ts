// payrollUtils.ts

import { format, parseISO, isWithinInterval } from 'date-fns';
import { Attendance } from '../attendanceService';
import { Employee } from '../employeesService';

// Constants for calculation
const OVERTIME_RATE = 1.25; // 25% premium for overtime
const DEFAULT_WORKING_HOURS_PER_DAY = 8;
const DEFAULT_WORKING_DAYS_PER_MONTH = 22;
const DEFAULT_SSS_RATE = 0.045; // 4.5% SSS contribution
const DEFAULT_TAX_RATE = 0.10; // 10% withholding tax as default

/**
 * Calculate daily rate from monthly salary
 */
export const calculateDailyRate = (monthlySalary: number, workingDaysPerMonth = DEFAULT_WORKING_DAYS_PER_MONTH): number => {
  return monthlySalary / workingDaysPerMonth;
};

/**
 * Calculate hourly rate from daily rate
 */
export const calculateHourlyRate = (dailyRate: number, hoursPerDay = DEFAULT_WORKING_HOURS_PER_DAY): number => {
  return dailyRate / hoursPerDay;
};

/**
 * Calculate basic salary based on attendance and daily rate
 */
export const calculateBaseSalary = (
  attendance: Attendance[], 
  dailyRate: number,
  startDate: string,
  endDate: string
): number => {
  // Filter attendance within the period
  const periodAttendance = attendance.filter(record => {
    const recordDate = parseISO(record.date);
    return isWithinInterval(recordDate, {
      start: parseISO(startDate),
      end: parseISO(endDate)
    });
  });
  
  // Count working days (Present, Late, Half-day)
  const presentDays = periodAttendance.filter(record => 
    record.status === 'Present'
  ).length;
  
  const lateDays = periodAttendance.filter(record => 
    record.status === 'Late'
  ).length;
  
  const halfDays = periodAttendance.filter(record => 
    record.status === 'Half-day'
  ).length;
  
  // Calculate base salary
  return (presentDays + lateDays + (halfDays * 0.5)) * dailyRate;
};

/**
 * Calculate overtime pay based on attendance, hourly rate and overtime rate
 */
export const calculateOvertimePay = (
  attendance: Attendance[],
  hourlyRate: number,
  startDate: string,
  endDate: string,
  overtimeRate = OVERTIME_RATE
): number => {
  // Filter attendance within the period
  const periodAttendance = attendance.filter(record => {
    const recordDate = parseISO(record.date);
    return isWithinInterval(recordDate, {
      start: parseISO(startDate),
      end: parseISO(endDate)
    });
  });
  
  // Sum up all overtime hours
  const totalOvertimeHours = periodAttendance.reduce(
    (sum, record) => sum + (record.overtime || 0),
    0
  );
  
  // Calculate overtime pay
  return totalOvertimeHours * hourlyRate * overtimeRate;
};

/**
 * Calculate overtime hours based on afternoon time out
 * Returns hours worked after 6:00 PM, rounded to nearest 0.1 hours
 */
export const calculateOvertimeHours = (afternoonTimeOut: string | null): number => {
  if (!afternoonTimeOut) {
    return 0;
  }
  
  // Parse time from format "HH:mm"
  const [hours, minutes] = afternoonTimeOut.split(':').map(Number);
  
  // If time is before or equal to 6:00 PM, no overtime
  if (hours < 18 || (hours === 18 && minutes === 0)) {
    return 0;
  }
  
  // Calculate hours after 6:00 PM
  const overtimeHours = hours - 18 + (minutes / 60);
  
  // Round to nearest 0.1 hours
  return Math.round(overtimeHours * 10) / 10;
};

/**
 * Calculate default deductions (SSS, etc)
 */
export const calculateDefaultDeductions = (
  baseSalary: number,
  sssRate = DEFAULT_SSS_RATE
): number => {
  return baseSalary * sssRate;
};

/**
 * Calculate tax withholding
 */
export const calculateTaxWithholding = (
  baseSalary: number,
  overtimePay: number,
  bonus: number,
  taxRate = DEFAULT_TAX_RATE
): number => {
  const taxableIncome = baseSalary + overtimePay + bonus;
  return taxableIncome * taxRate;
};

/**
 * Calculate net salary
 */
export const calculateNetSalary = (
  baseSalary: number,
  overtimePay: number,
  bonus: number,
  deductions: number,
  taxWithholding: number
): number => {
  return baseSalary + overtimePay + bonus - deductions - taxWithholding;
};

/**
 * Generate a complete payroll record for an employee
 */
export const generatePayrollRecord = (
  employee: Employee,
  attendance: Attendance[],
  period: string, // YYYY-MM
  startDate: string,
  endDate: string,
  additionalBonus = 0,
  additionalDeductions = 0,
  status: 'Draft' | 'Pending' | 'Approved' | 'Paid' = 'Draft'
): any => {
  // Get base salary from employee or default to 0
  const monthlySalary = employee.salary || 0;
  
  // Calculate rates
  const dailyRate = calculateDailyRate(monthlySalary);
  const hourlyRate = calculateHourlyRate(dailyRate);
  
  // Calculate components
  const baseSalary = calculateBaseSalary(attendance, dailyRate, startDate, endDate);
  const overtimePay = calculateOvertimePay(attendance, hourlyRate, startDate, endDate);
  const deductions = calculateDefaultDeductions(baseSalary) + additionalDeductions;
  const taxWithholding = calculateTaxWithholding(baseSalary, overtimePay, additionalBonus);
  
  // Calculate net salary
  const netSalary = calculateNetSalary(
    baseSalary,
    overtimePay,
    additionalBonus,
    deductions,
    taxWithholding
  );
  
  // Generate the payroll record
  return {
    employeeId: typeof employee.id === 'string' ? parseInt(employee.id) : employee.id,
    period,
    startDate,
    endDate,
    baseSalary,
    overtimePay,
    bonus: additionalBonus,
    deductions,
    taxWithholding,
    netSalary,
    status,
    notes: `Auto-generated payroll for ${employee.firstName} ${employee.lastName} (${period})`,
    bankTransferRef: null,
    paymentDate: null
  };
};

/**
 * Generate bulk payroll records for multiple employees
 */
export const generateBulkPayroll = (
  employees: Employee[],
  attendance: Attendance[],
  period: string,
  startDate: string,
  endDate: string
): any[] => {
  return employees
    .filter(employee => employee.status !== 'Inactive')
    .map(employee => generatePayrollRecord(
      employee,
      attendance.filter(record => 
        record.employeeId === (typeof employee.id === 'string' ? parseInt(employee.id) : employee.id)
      ),
      period,
      startDate,
      endDate
    ));
};