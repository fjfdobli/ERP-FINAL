import { supabase } from '../supabaseClient';

export interface Attendance {
  id: number;
  employeeId: number;
  employeeName?: string; 
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: string;
  overtime: number | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InsertAttendance {
  employeeId: number;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: string;
  overtime: number | null;
  notes: string | null;
}

export interface AttendanceFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: number;
  status?: string;
}

const TABLE_NAME = 'attendance';

/**
 * Service for managing attendance data in Supabase
 */
export const attendanceService = {
  /**
   * Fetch attendance records with optional filters
   */
  async getAttendance(filters?: AttendanceFilters): Promise<Attendance[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select(`
        *,
        employees:employeeId (
          "firstName",
          "lastName"
        )
      `)
      .order('date', { ascending: false });

    // Apply filters if provided
    if (filters) {
      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters.employeeId) {
        query = query.eq('employeeId', filters.employeeId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance records:', error);
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

  /**
   * Fetch a single attendance record by ID
   */
  async getAttendanceById(id: number): Promise<Attendance | null> {
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
      console.error(`Error fetching attendance record with ID ${id}:`, error);
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

  /**
   * Create a new attendance record
   */
  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([attendance])
      .select()
      .single();

    if (error) {
      console.error('Error creating attendance record:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Create multiple attendance records in bulk
   */
  async bulkCreateAttendance(attendanceRecords: InsertAttendance[]): Promise<Attendance[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(attendanceRecords)
      .select();

    if (error) {
      console.error('Error creating bulk attendance records:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Update an existing attendance record
   */
  async updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(attendance)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating attendance record with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Delete an attendance record
   */
  async deleteAttendance(id: number): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting attendance record with ID ${id}:`, error);
      throw new Error(error.message);
    }
  }
};