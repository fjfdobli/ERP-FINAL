import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { techniciansService, Technician, TechnicianFilters, InsertTechnician } from '../../services/techniciansService';
import { RootState } from '../store';

interface TechniciansState {
  technicians: Technician[];
  currentTechnician: Technician | null;
  assignedMachinery: number[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TechniciansState = {
  technicians: [],
  currentTechnician: null,
  assignedMachinery: [],
  isLoading: false,
  error: null
};

// Async thunks for technicians
export const fetchTechnicians = createAsyncThunk(
  'technicians/fetchTechnicians',
  async (filters: TechnicianFilters = {}, { rejectWithValue }) => {
    try {
      return await techniciansService.getTechnicians(filters);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch technicians');
    }
  }
);

export const fetchTechnicianById = createAsyncThunk(
  'technicians/fetchTechnicianById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await techniciansService.getTechnicianById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch technician details');
    }
  }
);

export const createTechnician = createAsyncThunk(
  'technicians/createTechnician',
  async (technician: InsertTechnician, { rejectWithValue }) => {
    try {
      return await techniciansService.createTechnician(technician);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create technician');
    }
  }
);

export const updateTechnician = createAsyncThunk(
  'technicians/updateTechnician',
  async ({ id, data }: { id: number; data: Partial<InsertTechnician> }, { rejectWithValue }) => {
    try {
      return await techniciansService.updateTechnician(id, data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update technician');
    }
  }
);

export const deleteTechnician = createAsyncThunk(
  'technicians/deleteTechnician',
  async (id: number, { rejectWithValue }) => {
    try {
      await techniciansService.deleteTechnician(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete technician');
    }
  }
);

export const assignMachineryToTechnician = createAsyncThunk(
  'technicians/assignMachineryToTechnician',
  async ({ technicianId, machineryIds }: { technicianId: number; machineryIds: number[] }, { rejectWithValue }) => {
    try {
      return await techniciansService.assignMachineryToTechnician(technicianId, machineryIds);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to assign machinery to technician');
    }
  }
);

export const getAssignedMachinery = createAsyncThunk(
  'technicians/getAssignedMachinery',
  async (technicianId: number, { rejectWithValue }) => {
    try {
      return await techniciansService.getAssignedMachinery(technicianId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch assigned machinery');
    }
  }
);

const techniciansSlice = createSlice({
  name: 'technicians',
  initialState,
  reducers: {
    setCurrentTechnician: (state, action: PayloadAction<Technician | null>) => {
      state.currentTechnician = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch technicians
      .addCase(fetchTechnicians.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTechnicians.fulfilled, (state, action) => {
        state.technicians = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchTechnicians.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch technician by ID
      .addCase(fetchTechnicianById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTechnicianById.fulfilled, (state, action) => {
        state.currentTechnician = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchTechnicianById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create technician
      .addCase(createTechnician.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createTechnician.fulfilled, (state, action) => {
        state.technicians.push(action.payload);
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createTechnician.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update technician
      .addCase(updateTechnician.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateTechnician.fulfilled, (state, action) => {
        const index = state.technicians.findIndex(tech => tech.id === action.payload.id);
        if (index !== -1) {
          state.technicians[index] = action.payload;
        }
        if (state.currentTechnician && state.currentTechnician.id === action.payload.id) {
          state.currentTechnician = action.payload;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateTechnician.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete technician
      .addCase(deleteTechnician.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteTechnician.fulfilled, (state, action) => {
        state.technicians = state.technicians.filter(tech => tech.id !== action.payload);
        if (state.currentTechnician && state.currentTechnician.id === action.payload) {
          state.currentTechnician = null;
        }
        state.isLoading = false;
        state.error = null;
      })
      .addCase(deleteTechnician.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Assign machinery to technician
      .addCase(assignMachineryToTechnician.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(assignMachineryToTechnician.fulfilled, (state, action) => {
        if (state.currentTechnician && state.currentTechnician.id === action.payload.id) {
          state.currentTechnician = action.payload;
        }
        
        const index = state.technicians.findIndex(tech => tech.id === action.payload.id);
        if (index !== -1) {
          state.technicians[index] = action.payload;
        }
        
        state.isLoading = false;
        state.error = null;
      })
      .addCase(assignMachineryToTechnician.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Get assigned machinery
      .addCase(getAssignedMachinery.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAssignedMachinery.fulfilled, (state, action) => {
        state.assignedMachinery = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(getAssignedMachinery.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const { setCurrentTechnician, clearError } = techniciansSlice.actions;

// Selectors
export const selectAllTechnicians = (state: RootState) => state.technicians.technicians;
export const selectCurrentTechnician = (state: RootState) => state.technicians.currentTechnician;
export const selectAssignedMachinery = (state: RootState) => state.technicians.assignedMachinery;
export const selectTechniciansLoading = (state: RootState) => state.technicians.isLoading;
export const selectTechniciansError = (state: RootState) => state.technicians.error;

export default techniciansSlice.reducer;