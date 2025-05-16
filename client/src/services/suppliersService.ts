import { supabase } from '../supabaseClient';

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  email: string | null;
  phone: string | null;
  status: string;
  address: string | null;
  notes: string | null;
  businesstype: string | null; // lowercase to match database column name
  businessType?: string | null; // keep for backward compatibility
  custom_business_type: string | null;
  industry: string | null;
  custom_industry: string | null;
  taxId: string | null;
  relationship_since: string | null;
  alternatePhone: string | null;
  billingAddressSame: boolean;
  billingAddress: string | null;
  paymentTerms: string | null;
  leadTime: number | null;
  productCategories: string | null;
  taxExempt: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Define the InsertSupplier interface (without id, createdAt, and updatedAt)
export interface InsertSupplier {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: string;
  address: string | null;
  notes: string | null;
  businesstype: string | null; // lowercase to match database column name
  custom_business_type: string | null;
  industry: string | null;
  custom_industry: string | null;
  taxId: string | null;
  relationship_since?: string;
  alternatePhone: string | null;
  billingAddressSame: boolean;
  billingAddress: string | null;
  paymentTerms: string | null;
  leadTime: number | null;
  productCategories: string | null;
  taxExempt: boolean;
}

const TABLE_NAME = 'suppliers';

/**
 * Service for managing supplier data in Supabase
 */
export const suppliersService = {
  /**
   * Fetch all suppliers from the database
   */
  async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Fetch a supplier by ID
   */
  async getSupplierById(id: number): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching supplier with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Search suppliers by query (searches name, contactPerson, and email)
   */
  async searchSuppliers(query: string): Promise<Supplier[]> {
    const searchTerm = `%${query}%`;
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .or(`name.ilike.${searchTerm},contactPerson.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching suppliers:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Create a new supplier
   */
  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([supplier])
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Update an existing supplier
   */
  async updateSupplier(id: number, supplier: InsertSupplier): Promise<Supplier> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(supplier)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating supplier with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Delete a supplier
   */
  async deleteSupplier(id: number): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting supplier with ID ${id}:`, error);
      throw new Error(error.message);
    }
  }
};