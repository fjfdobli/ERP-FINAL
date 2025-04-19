import { supabase } from '../supabaseClient';
import { calculateBaseSalary, calculateOvertimePay } from './utils/payrollUtils';

export interface Payroll {
  id: number;
  employeeId: number;
  employeeName?: string; // For display purposes
  period: string; // YYYY-MM
  startDate: string;
  endDate: string;
  baseSalary: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  taxWithholding: number;
  netSalary: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Paid';
  notes: string | null;
  bankTransferRef: string | null;
  paymentDate: string | null;
  paymentCycle?: string; // '15' or '30' for bi-monthly or monthly
  createdAt?: string;
  updatedAt?: string;
}

export interface InsertPayroll {
  employeeId: number;
  period: string;
  startDate: string;
  endDate: string;
  baseSalary: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  taxWithholding: number;
  netSalary: number;
  status: string;
  notes?: string | null;
  bankTransferRef?: string | null;
  paymentDate?: string | null;
  paymentCycle?: string;
}

export interface PayrollFilters {
  period?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  employeeId?: number;
}

const TABLE_NAME = 'payroll';

export const payrollService = {
  async getPayrolls(filters?: PayrollFilters): Promise<Payroll[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select(`
        *,
        employees:employeeId (
          "firstName",
          "lastName"
        )
      `)
      .order('period', { ascending: false });

    // Apply filters if provided
    if (filters) {
      if (filters.period) {
        // Support both exact period matches and prefix matches for bi-monthly periods
        query = query.or(`period.eq.${filters.period},period.like.${filters.period}-%`);
      }
      if (filters.startDate) {
        query = query.gte('startDate', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('endDate', filters.endDate);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.employeeId) {
        query = query.eq('employeeId', filters.employeeId);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payroll records:', error);
      throw new Error(error.message);
    }

    // Format the response to include employee names
    const formattedData = data.map(record => ({
      ...record,
      employeeName: record.employees ? 
        `${record.employees.firstName} ${record.employees.lastName}` : 
        undefined
    }));

    return formattedData;
  },

  async getPayrollById(id: number): Promise<Payroll | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(`
        *,
        employees:employeeId (
          "firstName",
          "lastName"
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching payroll record with ID ${id}:`, error);
      throw new Error(error.message);
    }

    if (!data) return null;

    // Format the response to include employee name
    return {
      ...data,
      employeeName: data.employees ? 
        `${data.employees.firstName} ${data.employees.lastName}` : 
        undefined
    };
  },

  async createPayroll(payroll: InsertPayroll): Promise<Payroll> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payroll])
      .select()
      .single();

    if (error) {
      console.error('Error creating payroll record:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async bulkCreatePayroll(payrollRecords: InsertPayroll[]): Promise<Payroll[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(payrollRecords)
      .select();

    if (error) {
      console.error('Error creating bulk payroll records:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async updatePayroll(id: number, payroll: Partial<InsertPayroll>): Promise<Payroll> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payroll)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating payroll record with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  async deletePayroll(id: number): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting payroll record with ID ${id}:`, error);
      throw new Error(error.message);
    }
  }
};