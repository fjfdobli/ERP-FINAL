import { supabase } from '../supabaseClient';

export interface InventoryItem {
  id: number;
  itemName: string;
  sku: string;
  itemType: string;
  quantity: number;
  minStockLevel: number;
  unitPrice: number | null;
  supplierId: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInventoryItem {
  itemName: string;
  sku: string;
  itemType: string;
  quantity: number;
  minStockLevel: number;
  unitPrice?: number;
  supplierId?: number;
}

export interface UpdateInventoryItem {
  itemName?: string;
  sku?: string;
  itemType?: string;
  quantity?: number;
  minStockLevel?: number;
  unitPrice?: number;
  supplierId?: number;
}

// Define interface for inventory transactions
export interface InventoryTransaction {
  id: number;
  inventoryId: number;
  transactionType: 'stock_in' | 'stock_out';
  quantity: number;
  createdBy: number;
  isSupplier: boolean;
  notes?: string;
  transactionDate: string;
}

export interface CreateInventoryTransaction {
  inventoryId: number;
  transactionType: 'stock_in' | 'stock_out';
  quantity: number;
  createdBy: number;
  isSupplier: boolean;
  notes?: string;
  transactionDate?: string;
}

// Table names
const INVENTORY_TABLE = 'inventory';
const TRANSACTIONS_TABLE = 'inventory_transactions';

/**
 * Service for managing inventory data in Supabase
 */
export const inventoryService = {
  /**
   * Fetch all inventory items
   */
  async getInventoryItems(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from(INVENTORY_TABLE)
      .select('*')
      .order('itemName', { ascending: true });

    if (error) {
      console.error('Error fetching inventory items:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Fetch a specific inventory item by ID
   */
  async getInventoryItemById(id: number): Promise<InventoryItem | null> {
    const { data, error } = await supabase
      .from(INVENTORY_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching inventory item with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Search inventory items
   */
  async searchInventory(query: string): Promise<InventoryItem[]> {
    const searchTerm = `%${query}%`;
    
    const { data, error } = await supabase
      .from(INVENTORY_TABLE)
      .select('*')
      .or(`itemName.ilike.${searchTerm},sku.ilike.${searchTerm},itemType.ilike.${searchTerm}`)
      .order('itemName', { ascending: true });

    if (error) {
      console.error('Error searching inventory:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Get low stock inventory items (quantity < minStockLevel)
   */
  async getLowStockItems(): Promise<InventoryItem[]> {
    try {
      // Get all inventory items first
      const { data, error } = await supabase
        .from(INVENTORY_TABLE)
        .select('*')
        .order('itemName', { ascending: true });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Filter client-side for items where quantity is less than minStockLevel
      return (data || []).filter(item => item.quantity <= item.minStockLevel);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error;
    }
  },

  /**
   * Create a new inventory item
   */
  async createInventoryItem(item: CreateInventoryItem): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from(INVENTORY_TABLE)
      .insert([item])
      .select()
      .single();

    if (error) {
      console.error('Error creating inventory item:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Update an existing inventory item
   */
  async updateInventoryItem(id: number, updates: UpdateInventoryItem): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from(INVENTORY_TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating inventory item with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Delete an inventory item
   */
  async deleteInventoryItem(id: number): Promise<void> {
    const { error } = await supabase
      .from(INVENTORY_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting inventory item with ID ${id}:`, error);
      throw new Error(error.message);
    }
  },

  /**
   * Get transactions for a specific inventory item
   */
  async getItemTransactions(itemId: number): Promise<InventoryTransaction[]> {
    const { data, error } = await supabase
      .from(TRANSACTIONS_TABLE)
      .select('*')
      .eq('inventoryId', itemId)
      .order('transactionDate', { ascending: false });

    if (error) {
      console.error(`Error fetching transactions for inventory item ${itemId}:`, error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Add a new inventory transaction
   */
  async addTransaction(transaction: CreateInventoryTransaction): Promise<InventoryTransaction> {
    const { data, error } = await supabase
      .from(TRANSACTIONS_TABLE)
      .insert([transaction])
      .select()
      .single();

    if (error) {
      console.error('Error adding inventory transaction:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Get active suppliers for stock-in transactions
   */
  async getActiveSuppliers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('status', 'Active')
      .order('name');

    if (error) {
      console.error('Error fetching active suppliers:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Get active employees for stock-out transactions
   */
  async getActiveEmployees(): Promise<any[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('id, firstName, lastName')
      .eq('status', 'Active')
      .order('lastName');

    if (error) {
      console.error('Error fetching active employees:', error);
      throw new Error(error.message);
    }

    // Format employee names
    return (data || []).map(emp => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`
    }));
  }
};