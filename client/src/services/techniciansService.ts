import { supabase } from '../supabaseClient';

export interface Technician {
  id: number;
  first_name: string;  // snake_case for DB columns
  last_name: string;   // snake_case for DB columns
  email: string;
  phone: string;
  experience: number;
  bio: string | null;
  join_date: string;   // snake_case for DB columns
  status: 'Active' | 'On Leave' | 'Unavailable' | 'Former';
  assigned_machinery: number[];  // snake_case for DB columns
  type: 'Company' | 'External';
  company: string | null;
  created_at?: string;  // snake_case for DB columns
  updated_at?: string;  // snake_case for DB columns

  // Add camelCase aliases for frontend use
  firstName?: string;
  lastName?: string;
  joinDate?: string;
  assignedMachinery?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InsertTechnician {
  first_name: string;  // snake_case for DB columns
  last_name: string;   // snake_case for DB columns
  email: string;
  phone: string;
  experience: number;
  bio: string | null;
  join_date: string;   // snake_case for DB columns
  status: string;
  assigned_machinery: number[];  // snake_case for DB columns
  type: string;
  company: string | null;
}

export interface TechnicianFilters {
  type?: string;
  status?: string;
  search?: string;
}

const TECHNICIANS_TABLE = 'technicians';
const TECHNICIAN_MACHINERY_TABLE = 'technician_machinery';

/**
 * Service for managing technicians in Supabase
 */
export const techniciansService = {
  /**
   * Fetch all technicians with optional filters
   */
  async getTechnicians(filters?: TechnicianFilters): Promise<Technician[]> {
    let query = supabase
      .from(TECHNICIANS_TABLE)
      .select('*')
      .order('last_name', { ascending: true });  // Use snake_case column name

    // Apply filters if provided
    if (filters) {
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      // Add search functionality if needed
      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching technicians:', error);
      throw new Error(error.message);
    }

    // Add camelCase aliases for frontend use
    return (data || []).map(tech => ({
      ...tech,
      firstName: tech.first_name,
      lastName: tech.last_name,
      joinDate: tech.join_date,
      assignedMachinery: tech.assigned_machinery,
      createdAt: tech.created_at,
      updatedAt: tech.updated_at
    })) as Technician[];
  },

  /**
   * Fetch a single technician by ID
   */
  async getTechnicianById(id: number): Promise<Technician | null> {
    const { data, error } = await supabase
      .from(TECHNICIANS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching technician with ID ${id}:`, error);
      throw new Error(error.message);
    }

    if (!data) return null;

    // Add camelCase aliases for frontend use
    return {
      ...data,
      firstName: data.first_name,
      lastName: data.last_name,
      joinDate: data.join_date,
      assignedMachinery: data.assigned_machinery,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as Technician;
  },

  /**
   * Create a new technician
   */
  async createTechnician(technician: InsertTechnician): Promise<Technician> {
    const { data, error } = await supabase
      .from(TECHNICIANS_TABLE)
      .insert([technician])
      .select()
      .single();

    if (error) {
      console.error('Error creating technician:', error);
      throw new Error(error.message);
    }

    // Add camelCase aliases for frontend use
    return {
      ...data,
      firstName: data.first_name,
      lastName: data.last_name,
      joinDate: data.join_date,
      assignedMachinery: data.assigned_machinery,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as Technician;
  },

  /**
   * Update an existing technician
   */
  async updateTechnician(id: number, technician: Partial<InsertTechnician>): Promise<Technician> {
    const { data, error } = await supabase
      .from(TECHNICIANS_TABLE)
      .update(technician)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating technician with ID ${id}:`, error);
      throw new Error(error.message);
    }

    // Add camelCase aliases for frontend use
    return {
      ...data,
      firstName: data.first_name,
      lastName: data.last_name,
      joinDate: data.join_date,
      assignedMachinery: data.assigned_machinery,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as Technician;
  },

  /**
   * Delete a technician
   */
  async deleteTechnician(id: number): Promise<void> {
    // First, delete any associated machinery assignments
    try {
      await supabase
        .from(TECHNICIAN_MACHINERY_TABLE)
        .delete()
        .eq('technician_id', id); // Use snake_case for column names in Supabase
    } catch (error) {
      console.error(`Error deleting technician's machinery assignments:`, error);
      // Continue with deletion even if this fails
    }

    // Then delete the technician
    const { error } = await supabase
      .from(TECHNICIANS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting technician with ID ${id}:`, error);
      throw new Error(error.message);
    }
  },

  /**
   * Assign machinery to a technician
   */
  async assignMachineryToTechnician(technicianId: number, machineryIds: number[]): Promise<Technician> {
    // First, update the technician's assigned_machinery field (using snake_case for DB column)
    const { data: techData, error: techError } = await supabase
      .from(TECHNICIANS_TABLE)
      .update({ assigned_machinery: machineryIds })
      .eq('id', technicianId)
      .select()
      .single();

    if (techError) {
      console.error(`Error updating technician's assigned machinery:`, techError);
      throw new Error(techError.message);
    }

    // Create records in the junction table (if you have one)
    // First, delete any existing assignments
    try {
      await supabase
        .from(TECHNICIAN_MACHINERY_TABLE)
        .delete()
        .eq('technician_id', technicianId);

      // Then create the new assignments
      if (machineryIds.length > 0) {
        const assignments = machineryIds.map(machineryId => ({
          technician_id: technicianId,
          machinery_id: machineryId,
          assigned_date: new Date().toISOString()
        }));

        await supabase
          .from(TECHNICIAN_MACHINERY_TABLE)
          .insert(assignments);
      }
    } catch (error) {
      console.error(`Error updating technician-machinery junction table:`, error);
      // This is a secondary operation, so we don't throw an error here
    }

    return techData as Technician;
  },

  /**
   * Get machinery IDs assigned to a technician
   */
  async getAssignedMachinery(technicianId: number): Promise<number[]> {
    // First check if the technician has the assigned_machinery field populated (using snake_case for DB column)
    const { data: techData, error: techError } = await supabase
      .from(TECHNICIANS_TABLE)
      .select('assigned_machinery')
      .eq('id', technicianId)
      .single();

    if (techError) {
      console.error(`Error fetching technician's assigned machinery:`, techError);
      throw new Error(techError.message);
    }

    if (techData && Array.isArray(techData.assigned_machinery)) {
      return techData.assigned_machinery;
    }

    // If not, fetch from the junction table
    const { data, error } = await supabase
      .from(TECHNICIAN_MACHINERY_TABLE)
      .select('machinery_id')
      .eq('technician_id', technicianId);

    if (error) {
      console.error(`Error fetching machinery assigned to technician ${technicianId}:`, error);
      throw new Error(error.message);
    }

    return data.map(item => item.machinery_id);
  }
};