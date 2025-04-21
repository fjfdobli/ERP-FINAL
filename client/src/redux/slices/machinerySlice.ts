import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  machineryService, 
  Machinery, 
  MaintenanceRecord, 
  MachineryFilters, 
  MachineryStats,
  MaintenanceCostSummary,
  InsertMachinery,
  InsertMaintenanceRecord,
  StatusHistoryRecord,
  InsertStatusHistoryRecord
} from '../../services/machineryService';
import { RootState } from '../store';

interface MachineryState {
  machinery: Machinery[];
  currentMachinery: Machinery | null;
  maintenanceRecords: MaintenanceRecord[];
  statusHistory: StatusHistoryRecord[];
  machineryStats: MachineryStats | null;
  maintenanceCostSummary: MaintenanceCostSummary | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: MachineryState = {
  machinery: [],
  currentMachinery: null,
  maintenanceRecords: [],
  statusHistory: [],
  machineryStats: null,
  maintenanceCostSummary: null,
  isLoading: false,
  error: null
};

// Async thunks for machinery
export const uploadMachineryImage = createAsyncThunk(
  'machinery/uploadMachineryImage',
  async ({ file, machineryId }: { file: File; machineryId: number }, { rejectWithValue }) => {
    try {
      return await machineryService.uploadMachineryImage(file, machineryId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to upload machinery image');
    }
  }
);

export const uploadMultipleMachineryImages = createAsyncThunk(
  'machinery/uploadMultipleMachineryImages',
  async ({ files, machineryId }: { files: File[]; machineryId: number }, { rejectWithValue }) => {
    try {
      return await machineryService.uploadMultipleMachineryImages(files, machineryId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to upload machinery images');
    }
  }
);

export const fetchMachinery = createAsyncThunk(
  'machinery/fetchMachinery',
  async (filters: MachineryFilters = {}, { rejectWithValue }) => {
    try {
      return await machineryService.getMachinery(filters);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch machinery');
    }
  }
);

export const fetchMachineryById = createAsyncThunk(
  'machinery/fetchMachineryById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await machineryService.getMachineryById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch machinery details');
    }
  }
);

export const createMachinery = createAsyncThunk(
  'machinery/createMachinery',
  async (machinery: InsertMachinery, { rejectWithValue }) => {
    try {
      return await machineryService.createMachinery(machinery);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create machinery');
    }
  }
);

export const updateMachinery = createAsyncThunk(
  'machinery/updateMachinery',
  async ({ id, data }: { id: number; data: Partial<InsertMachinery> }, { rejectWithValue }) => {
    try {
      return await machineryService.updateMachinery(id, data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update machinery');
    }
  }
);

export const deleteMachinery = createAsyncThunk(
  'machinery/deleteMachinery',
  async (id: number, { rejectWithValue }) => {
    try {
      await machineryService.deleteMachinery(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete machinery');
    }
  }
);

// Async thunks for maintenance records
export const fetchMaintenanceRecords = createAsyncThunk(
  'machinery/fetchMaintenanceRecords',
  async (machineryId: number | undefined, { rejectWithValue }) => {
    try {
      return await machineryService.getMaintenanceRecords(machineryId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch maintenance records');
    }
  }
);

export const createMaintenanceRecord = createAsyncThunk(
  'machinery/createMaintenanceRecord',
  async (record: InsertMaintenanceRecord, { rejectWithValue }) => {
    try {
      return await machineryService.createMaintenanceRecord(record);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create maintenance record');
    }
  }
);

export const updateMaintenanceRecord = createAsyncThunk(
  'machinery/updateMaintenanceRecord',
  async ({ id, data }: { id: number; data: Partial<InsertMaintenanceRecord> }, { rejectWithValue }) => {
    try {
      return await machineryService.updateMaintenanceRecord(id, data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update maintenance record');
    }
  }
);

export const deleteMaintenanceRecord = createAsyncThunk(
  'machinery/deleteMaintenanceRecord',
  async (id: number, { rejectWithValue }) => {
    try {
      await machineryService.deleteMaintenanceRecord(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete maintenance record');
    }
  }
);

// Async thunks for status history
export const fetchStatusHistory = createAsyncThunk(
  'machinery/fetchStatusHistory',
  async (machineryId: number | undefined, { rejectWithValue }) => {
    try {
      return await machineryService.getStatusHistory(machineryId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch status history');
    }
  }
);

export const createStatusHistory = createAsyncThunk(
  'machinery/createStatusHistory',
  async (record: InsertStatusHistoryRecord, { rejectWithValue }) => {
    try {
      return await machineryService.createStatusHistory(record);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create status history record');
    }
  }
);

export const updateStatusHistory = createAsyncThunk(
  'machinery/updateStatusHistory',
  async ({ id, data }: { id: number; data: Partial<InsertStatusHistoryRecord> }, { rejectWithValue }) => {
    try {
      return await machineryService.updateStatusHistory(id, data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update status history record');
    }
  }
);

export const deleteStatusHistory = createAsyncThunk(
  'machinery/deleteStatusHistory',
  async (id: number, { rejectWithValue }) => {
    try {
      await machineryService.deleteStatusHistory(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete status history record');
    }
  }
);

// Async thunks for statistics
export const fetchMachineryStats = createAsyncThunk(
  'machinery/fetchMachineryStats',
  async (_, { rejectWithValue }) => {
    try {
      return await machineryService.getMachineryStats();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch machinery statistics');
    }
  }
);

export const fetchMaintenanceCostSummary = createAsyncThunk(
  'machinery/fetchMaintenanceCostSummary',
  async (_, { rejectWithValue }) => {
    try {
      return await machineryService.getMaintenanceCostSummary();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch maintenance cost summary');
    }
  }
);

const machinerySlice = createSlice({
  name: 'machinery',
  initialState,
  reducers: {
    setCurrentMachinery: (state, action: PayloadAction<Machinery | null>) => {
      state.currentMachinery = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch machinery
      .addCase(fetchMachinery.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMachinery.fulfilled, (state, action) => {
        state.machinery = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchMachinery.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch machinery by ID
      .addCase(fetchMachineryById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMachineryById.fulfilled, (state, action) => {
        state.currentMachinery = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchMachineryById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create machinery
      .addCase(createMachinery.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createMachinery.fulfilled, (state, action) => {
        state.machinery.push(action.payload);
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createMachinery.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update machinery
      .addCase(updateMachinery.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateMachinery.fulfilled, (state, action) => {
        const index = state.machinery.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.machinery[index] = action.payload;
        }
        if (state.currentMachinery && state.currentMachinery.id === action.payload.id) {
          state.currentMachinery = action.payload;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateMachinery.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete machinery
      .addCase(deleteMachinery.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteMachinery.fulfilled, (state, action) => {
        state.machinery = state.machinery.filter(item => item.id !== action.payload);
        if (state.currentMachinery && state.currentMachinery.id === action.payload) {
          state.currentMachinery = null;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(deleteMachinery.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch maintenance records
      .addCase(fetchMaintenanceRecords.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMaintenanceRecords.fulfilled, (state, action) => {
        state.maintenanceRecords = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchMaintenanceRecords.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create maintenance record
      .addCase(createMaintenanceRecord.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createMaintenanceRecord.fulfilled, (state, action) => {
        state.maintenanceRecords.unshift(action.payload);
        
        // Update machinery last maintenance date if this record is for the current machinery
        if (state.currentMachinery && state.currentMachinery.id === action.payload.machineryId) {
          state.currentMachinery.lastMaintenanceDate = action.payload.date;
          
          // Set next maintenance date to 3 months from now by default
          const nextDate = new Date(action.payload.date);
          nextDate.setMonth(nextDate.getMonth() + 3);
          state.currentMachinery.nextMaintenanceDate = nextDate.toISOString().split('T')[0];
        }
        
        // Also update in the machinery list
        const machineryIndex = state.machinery.findIndex(item => item.id === action.payload.machineryId);
        if (machineryIndex !== -1) {
          state.machinery[machineryIndex].lastMaintenanceDate = action.payload.date;
          
          // Set next maintenance date to 3 months from now by default
          const nextDate = new Date(action.payload.date);
          nextDate.setMonth(nextDate.getMonth() + 3);
          state.machinery[machineryIndex].nextMaintenanceDate = nextDate.toISOString().split('T')[0];
        }
        
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createMaintenanceRecord.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update maintenance record
      .addCase(updateMaintenanceRecord.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateMaintenanceRecord.fulfilled, (state, action) => {
        const index = state.maintenanceRecords.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.maintenanceRecords[index] = action.payload;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateMaintenanceRecord.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete maintenance record
      .addCase(deleteMaintenanceRecord.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteMaintenanceRecord.fulfilled, (state, action) => {
        state.maintenanceRecords = state.maintenanceRecords.filter(item => item.id !== action.payload);
        state.isLoading = false;
        state.error = null;
      })
      .addCase(deleteMaintenanceRecord.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch machinery stats
      .addCase(fetchMachineryStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMachineryStats.fulfilled, (state, action) => {
        state.machineryStats = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchMachineryStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch maintenance cost summary
      .addCase(fetchMaintenanceCostSummary.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMaintenanceCostSummary.fulfilled, (state, action) => {
        state.maintenanceCostSummary = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchMaintenanceCostSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch status history
      .addCase(fetchStatusHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchStatusHistory.fulfilled, (state, action) => {
        state.statusHistory = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchStatusHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create status history record
      .addCase(createStatusHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createStatusHistory.fulfilled, (state, action) => {
        state.statusHistory.unshift(action.payload);
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createStatusHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update status history record
      .addCase(updateStatusHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateStatusHistory.fulfilled, (state, action) => {
        const index = state.statusHistory.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.statusHistory[index] = action.payload;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateStatusHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete status history record
      .addCase(deleteStatusHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteStatusHistory.fulfilled, (state, action) => {
        state.statusHistory = state.statusHistory.filter(item => item.id !== action.payload);
        state.isLoading = false;
        state.error = null;
      })
      .addCase(deleteStatusHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const { setCurrentMachinery, clearError } = machinerySlice.actions;

// Selectors
export const selectAllMachinery = (state: RootState) => state.machinery.machinery;
export const selectCurrentMachinery = (state: RootState) => state.machinery.currentMachinery;
export const selectMaintenanceRecords = (state: RootState) => state.machinery.maintenanceRecords;
export const selectStatusHistory = (state: RootState) => state.machinery.statusHistory;
export const selectMachineryStats = (state: RootState) => state.machinery.machineryStats;
export const selectMaintenanceCostSummary = (state: RootState) => state.machinery.maintenanceCostSummary;
export const selectMachineryLoading = (state: RootState) => state.machinery.isLoading;
export const selectMachineryError = (state: RootState) => state.machinery.error;

export default machinerySlice.reducer;