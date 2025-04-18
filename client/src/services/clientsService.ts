import { supabase } from '../supabaseClient';

export interface Client {
  id: number;
  name: string;
  contactPerson: string;
  email: string | null;
  phone: string | null;
  status: string;
  address: string | null;
  notes: string | null;
  businessType: string | null;
  industry: string | null;
  taxId: string | null;
  clientSince: string | null;
  alternatePhone: string | null;
  billingAddressSame: boolean;
  billingAddress: string | null;
  paymentTerms: string | null;
  creditLimit: number | null;
  taxExempt: boolean;
  specialRequirements: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Define the InsertClient interface (without id, createdAt, and updatedAt)
export interface InsertClient {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: string;
  address: string | null;
  notes: string | null;
  businessType: string | null;
  industry: string | null;
  taxId: string | null;
  clientSince?: string;
  alternatePhone: string | null;
  billingAddressSame: boolean;
  billingAddress: string | null;
  paymentTerms: string | null;
  creditLimit: number | null;
  taxExempt: boolean;
  specialRequirements: string | null;
}

const TABLE_NAME = 'clients';

/**
 * Service for managing client data in Supabase
 */
export const clientsService = {
  /**
   * Fetch all clients from the database
   */
  async getClients(): Promise<Client[]> {
    try {
      console.log('Fetching clients from table:', TABLE_NAME);
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching clients:', error);
        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }

      console.log(`Successfully fetched ${data?.length || 0} clients`);
      return data || [];
    } catch (err: any) {
      console.error('Unexpected error in getClients():', err);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  },

  /**
   * Fetch a client by ID
   */
  async getClientById(id: number): Promise<Client | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching client with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Search clients by query (searches name, contactPerson, and email)
   */
  async searchClients(query: string): Promise<Client[]> {
    const searchTerm = `%${query}%`;
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .or(`name.ilike.${searchTerm},contactPerson.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching clients:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Create a new client
   */
  async createClient(client: InsertClient): Promise<Client> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([client])
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Update an existing client
   */
  async updateClient(id: number, client: InsertClient): Promise<Client> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(client)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating client with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Delete a client
   */
  async deleteClient(id: number): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting client with ID ${id}:`, error);
      throw new Error(error.message);
    }
  }
};