import { supabase } from '../supabaseClient';
import { addMonths } from 'date-fns';

export interface Machinery {
  id: number;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  manufacturer: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  status: 'Operational' | 'Maintenance' | 'Repair' | 'Offline' | 'Retired';
  location: string | null;
  specifications: string | null;
  notes: string | null;
  imageUrl: string | null; // Main image (kept for backward compatibility)
  imageUrls: string[] | null; // Array of multiple image URLs
  createdAt?: string;
  updatedAt?: string;
}

export interface InsertMachinery {
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  manufacturer: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  status: string;
  location: string | null;
  specifications: string | null;
  notes: string | null;
  imageUrl: string | null; // Main image (kept for backward compatibility)
  imageUrls: string[] | null; // Array of multiple image URLs
}

export interface MaintenanceRecord {
  id: number;
  machineryId: number;
  date: string;
  type: 'Scheduled' | 'Repair' | 'Inspection' | 'Emergency';
  description: string;
  cost: number;
  performedBy: string;
  notes: string | null;
  imageUrls?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
  is_completed?: boolean;
}

export interface InsertMaintenanceRecord {
  machineryId: number;
  date: string;
  type: string;
  description: string;
  cost: number;
  performedBy: string;
  notes: string | null;
  imageUrls?: string[] | null;
  is_completed?: boolean;
}

export interface StatusHistoryRecord {
  id: number;
  machineryId: number;
  date: string;
  previousStatus: 'Operational' | 'Maintenance' | 'Repair' | 'Offline' | 'Retired';
  newStatus: 'Operational' | 'Maintenance' | 'Repair' | 'Offline' | 'Retired';
  reason: string;
  changedBy: string;
  notes: string | null;
  imageUrls?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InsertStatusHistoryRecord {
  machineryId: number;
  date: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  changedBy: string;
  notes: string | null;
  imageUrls?: string[] | null;
}

export interface MachineryFilters {
  type?: string;
  status?: string;
  manufacturer?: string;
}

export interface MachineryStats {
  total: number;
  operational: number;
  maintenance: number;
  repair: number;
  offline: number;
  retired: number;
  maintenanceDue: number;
}

export interface MaintenanceCostSummary {
  totalCost: number;
  monthlyCosts: { month: string; cost: number }[];
  costByType: { type: string; cost: number }[];
}

const MACHINERY_TABLE = 'machinery';
const MAINTENANCE_RECORDS_TABLE = 'maintenance_records';
const STATUS_HISTORY_TABLE = 'machinery_status_history';

/**
 * Service for managing machinery and maintenance records in Supabase
 */
export const machineryService = {
  /**
   * Upload machinery image to Supabase storage and get URL
   */
  async uploadMachineryImage(file: File, machineryId: number): Promise<string> {
    console.log('Starting image upload for machinery:', machineryId, 'file:', file.name, file.type, file.size);

    try {
      // Create a simple file name without paths
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;

      console.log('Using file name:', fileName);

      // Convert the file to a base64 string to verify it's valid
      const reader = new FileReader();
      const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      const fileData = await fileDataPromise;
      console.log('File data loaded, size:', fileData.byteLength);

      // Now upload the file directly - set content type explicitly
      const contentType = file.type || 'application/octet-stream';
      console.log('Setting content type for upload:', contentType);

      const { data, error } = await supabase.storage
        .from('machinery-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: contentType
        });

      if (error) {
        console.error('Storage upload error details:', error);
        throw new Error(error.message || 'Failed to upload image');
      }

      if (!data) {
        console.error('Upload succeeded but no data returned');
        throw new Error('Upload succeeded but no data returned');
      }

      console.log('Upload successful, path:', data.path);

      // Get the public URL
      try {
        console.log('Attempting to get public URL for:', fileName);
        const { data: urlData } = supabase.storage
          .from('machinery-images')
          .getPublicUrl(fileName);

        if (!urlData?.publicUrl) {
          console.error('No public URL data returned:', urlData);
          throw new Error('Could not generate public URL');
        }

        console.log('Generated public URL:', urlData.publicUrl);
        return urlData.publicUrl;
      } catch (urlError) {
        console.error('Error getting public URL:', urlError);

        // Fallback to constructing URL manually if needed
        // Import the supabaseUrl directly from the config rather than trying to access it from the client
        const supabaseUrl = 'https://iyjfpkcxwljfkxbjagbd.supabase.co';
        const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/machinery-images/${fileName}`;
        console.log('Using fallback URL:', fallbackUrl);
        return fallbackUrl;
      }
    } catch (err) {
      console.error('Exception during image upload:', err);
      throw new Error(err instanceof Error ? err.message : 'Unknown upload error');
    }
  },

  /**
   * Upload multiple machinery images and return array of URLs
   */
  async uploadMultipleMachineryImages(files: File[], machineryId: number): Promise<string[]> {
    console.log(`Starting upload of ${files.length} images for machinery:`, machineryId);

    const uploadPromises = files.map(file => this.uploadMachineryImage(file, machineryId));

    try {
      const urls = await Promise.all(uploadPromises);
      console.log(`Successfully uploaded ${urls.length} images:`, urls);
      return urls;
    } catch (err) {
      console.error('Error uploading multiple images:', err);
      throw new Error(err instanceof Error ? err.message : 'Unknown upload error');
    }
  },

  /**
   * Fetch all machinery with optional filters
   */
  async getMachinery(filters?: MachineryFilters): Promise<Machinery[]> {
    let query = supabase
      .from(MACHINERY_TABLE)
      .select('*')
      .order('name', { ascending: true });

    // Apply filters if provided
    if (filters) {
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.manufacturer) {
        query = query.eq('manufacturer', filters.manufacturer);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching machinery:', error);
      throw new Error(error.message);
    }

    return data as Machinery[];
  },

  /**
   * Fetch a single machinery by ID
   */
  async getMachineryById(id: number): Promise<Machinery | null> {
    const { data, error } = await supabase
      .from(MACHINERY_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching machinery with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data as Machinery;
  },

  /**
   * Create a new machinery
   */
  async createMachinery(machinery: InsertMachinery): Promise<Machinery> {
    const { data, error } = await supabase
      .from(MACHINERY_TABLE)
      .insert([machinery])
      .select()
      .single();

    if (error) {
      console.error('Error creating machinery:', error);
      throw new Error(error.message);
    }

    return data as Machinery;
  },

  /**
   * Update an existing machinery
   */
  async updateMachinery(id: number, machinery: Partial<InsertMachinery>): Promise<Machinery> {
    const { data, error } = await supabase
      .from(MACHINERY_TABLE)
      .update(machinery)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating machinery with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data as Machinery;
  },

  /**
   * Delete a machinery
   */
  async deleteMachinery(id: number): Promise<void> {
    const { error } = await supabase
      .from(MACHINERY_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting machinery with ID ${id}:`, error);
      throw new Error(error.message);
    }
  },

  /**
   * Fetch maintenance records for a specific machinery or all records
   */
  async getMaintenanceRecords(machineryId?: number): Promise<MaintenanceRecord[]> {
    let query = supabase
      .from(MAINTENANCE_RECORDS_TABLE)
      .select('*')
      .order('date', { ascending: false });

    if (machineryId) {
      query = query.eq('machineryId', machineryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching maintenance records:', error);
      throw new Error(error.message);
    }

    return data as MaintenanceRecord[];
  },

  /**
   * Create a new maintenance record
   */
  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const { data, error } = await supabase
      .from(MAINTENANCE_RECORDS_TABLE)
      .insert([record])
      .select()
      .single();

    if (error) {
      console.error('Error creating maintenance record:', error);
      throw new Error(error.message);
    }

    // Update the machinery's last maintenance date and set next maintenance date
    try {
      await supabase
        .from(MACHINERY_TABLE)
        .update({
          lastMaintenanceDate: record.date,
          // Set next maintenance date to 3 months from now by default
          nextMaintenanceDate: new Date(
            new Date(record.date).setMonth(new Date(record.date).getMonth() + 3)
          ).toISOString().split('T')[0]
        })
        .eq('id', record.machineryId);
    } catch (updateError) {
      console.error('Error updating machinery maintenance dates:', updateError);
      // Don't throw error here, as the maintenance record was created successfully
    }

    return data as MaintenanceRecord;
  },

  /**
   * Update an existing maintenance record
   */
  async updateMaintenanceRecord(id: number, record: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord> {
    const { data, error } = await supabase
      .from(MAINTENANCE_RECORDS_TABLE)
      .update({
        ...record,
        is_completed: record.is_completed,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating maintenance record with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return {
      ...data,
      is_completed: data.is_completed
    } as MaintenanceRecord;
  }
  ,

  /**
   * Delete a maintenance record
   */
  async deleteMaintenanceRecord(id: number): Promise<void> {
    const { error } = await supabase
      .from(MAINTENANCE_RECORDS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting maintenance record with ID ${id}:`, error);
      throw new Error(error.message);
    }
  },

  /**
   * Get machinery statistics
   */
  async getMachineryStats(): Promise<MachineryStats> {
    // Get all machinery to calculate stats
    const { data: machinery, error } = await supabase
      .from(MACHINERY_TABLE)
      .select('*');

    if (error) {
      console.error('Error fetching machinery for stats:', error);
      throw new Error(error.message);
    }

    // Calculate statistics
    const stats: MachineryStats = {
      total: machinery.length,
      operational: machinery.filter(m => m.status === 'Operational').length,
      maintenance: machinery.filter(m => m.status === 'Maintenance').length,
      repair: machinery.filter(m => m.status === 'Repair').length,
      offline: machinery.filter(m => m.status === 'Offline').length,
      retired: machinery.filter(m => m.status === 'Retired').length,
      maintenanceDue: 0
    };

    // Calculate machines due for maintenance (next maintenance date is in the past or within 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    stats.maintenanceDue = machinery.filter(m => {
      if (!m.nextMaintenanceDate) return false;
      const nextDate = new Date(m.nextMaintenanceDate);
      return nextDate <= thirtyDaysFromNow && m.status !== 'Retired';
    }).length;

    return stats;
  },

  /**
   * Get maintenance cost summary
   */
  async getMaintenanceCostSummary(): Promise<MaintenanceCostSummary> {
    // Get all maintenance records to calculate costs
    const { data: records, error } = await supabase
      .from(MAINTENANCE_RECORDS_TABLE)
      .select('*');

    if (error) {
      console.error('Error fetching maintenance records for cost summary:', error);
      throw new Error(error.message);
    }

    // Calculate total cost
    const totalCost = records.reduce((sum, record) => sum + record.cost, 0);

    // Group costs by month
    const costByMonth = records.reduce((acc: Record<string, number>, record) => {
      const month = record.date.substring(0, 7); // YYYY-MM format
      acc[month] = (acc[month] || 0) + record.cost;
      return acc;
    }, {});

    // Convert to array and sort by month
    const monthlyCosts = Object.entries(costByMonth).map(([month, cost]) => ({
      month,
      cost
    })).sort((a, b) => a.month.localeCompare(b.month));

    // Group costs by maintenance type
    const costByType = records.reduce((acc: Record<string, number>, record) => {
      acc[record.type] = (acc[record.type] || 0) + record.cost;
      return acc;
    }, {});

    // Convert to array
    const costByTypeArray = Object.entries(costByType).map(([type, cost]) => ({
      type,
      cost
    }));

    return {
      totalCost,
      monthlyCosts,
      costByType: costByTypeArray
    };
  },

  /**
   * Fetch status history records for a specific machinery or all records
   */
  async getStatusHistory(machineryId?: number): Promise<StatusHistoryRecord[]> {
    let query = supabase
      .from(STATUS_HISTORY_TABLE)
      .select('*')
      .order('date', { ascending: false });

    if (machineryId) {
      query = query.eq('machineryId', machineryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching status history records:', error);
      throw new Error(error.message);
    }

    return data as StatusHistoryRecord[];
  },

  /**
   * Create a new status history record
   */
  async createStatusHistory(record: InsertStatusHistoryRecord): Promise<StatusHistoryRecord> {
    const { data, error } = await supabase
      .from(STATUS_HISTORY_TABLE)
      .insert([record])
      .select()
      .single();

    if (error) {
      console.error('Error creating status history record:', error);
      throw new Error(error.message);
    }

    return data as StatusHistoryRecord;
  },

  /**
   * Update an existing status history record
   */
  async updateStatusHistory(id: number, record: Partial<InsertStatusHistoryRecord>): Promise<StatusHistoryRecord> {
    const { data, error } = await supabase
      .from(STATUS_HISTORY_TABLE)
      .update(record)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating status history record with ID ${id}:`, error);
      throw new Error(error.message);
    }

    return data as StatusHistoryRecord;
  },

  /**
   * Delete a status history record
   */
  async deleteStatusHistory(id: number): Promise<void> {
    const { error } = await supabase
      .from(STATUS_HISTORY_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting status history record with ID ${id}:`, error);
      throw new Error(error.message);
    }
  }
};