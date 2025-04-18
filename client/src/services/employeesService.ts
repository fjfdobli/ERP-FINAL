import { supabase } from '../supabaseClient';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string;
  department: string | null;
  status: string;
  hireDate: string | null;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  employeeId: string | null;
  notes: string | null;
  salary: number | null;
  bankDetails: string | null;
  taxId: string | null;
  birthDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Define the InsertEmployee interface (without id, createdAt, and updatedAt)
export interface InsertEmployee {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  status: string;
  hireDate?: string;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  employeeId: string | null;
  notes: string | null;
  salary: number | null;
  bankDetails: string | null;
  taxId: string | null;
  birthDate?: string;
}

const TABLE_NAME = 'employees';

/**
 * Service for managing employee data in Supabase
 */
export const employeesService = {
  /**
   * Fetch all employees from the database
   */
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('lastName', { ascending: true });

    if (error) {
      console.error('Error fetching employees:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Fetch an employee by ID
   */
  async getEmployeeById(id: number): Promise<Employee | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching employee with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Search employees by query (searches firstName, lastName, position, department)
   */
  async searchEmployees(query: string): Promise<Employee[]> {
    const searchTerm = `%${query}%`;
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .or(`firstName.ilike.${searchTerm},lastName.ilike.${searchTerm},position.ilike.${searchTerm},department.ilike.${searchTerm}`)
      .order('lastName', { ascending: true });

    if (error) {
      console.error('Error searching employees:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Create a new employee
   */
  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([employee])
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Update an existing employee
   */
  async updateEmployee(id: number, employee: InsertEmployee): Promise<Employee> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(employee)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating employee with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Delete an employee
   */
  async deleteEmployee(id: number): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting employee with ID ${id}:`, error);
      throw new Error(error.message);
    }
  }
};