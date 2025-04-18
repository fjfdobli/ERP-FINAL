import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { suppliersService, Supplier, InsertSupplier } from '../../services/suppliersService';
import { RootState } from '../store';

interface SuppliersState {
  items: Supplier[];
  selectedSupplier: Supplier | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state
const initialState: SuppliersState = {
  items: [],
  selectedSupplier: null,
  status: 'idle',
  error: null
};

// Async thunks
export const fetchSuppliers = createAsyncThunk(
  'suppliers/fetchSuppliers',
  async (_, { rejectWithValue }) => {
    try {
      return await suppliersService.getSuppliers();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch suppliers');
    }
  }
);

export const fetchSupplierById = createAsyncThunk(
  'suppliers/fetchSupplierById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await suppliersService.getSupplierById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch supplier');
    }
  }
);

export const searchSuppliers = createAsyncThunk(
  'suppliers/searchSuppliers',
  async (query: string, { rejectWithValue }) => {
    try {
      return await suppliersService.searchSuppliers(query);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to search suppliers');
    }
  }
);

export const createSupplier = createAsyncThunk(
  'suppliers/createSupplier',
  async (supplier: InsertSupplier, { rejectWithValue }) => {
    try {
      return await suppliersService.createSupplier(supplier);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create supplier');
    }
  }
);

export const updateSupplier = createAsyncThunk(
  'suppliers/updateSupplier',
  async ({ id, supplier }: { id: number; supplier: InsertSupplier }, { rejectWithValue }) => {
    try {
      return await suppliersService.updateSupplier(id, supplier);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update supplier');
    }
  }
);

export const deleteSupplier = createAsyncThunk(
  'suppliers/deleteSupplier',
  async (id: number, { rejectWithValue }) => {
    try {
      await suppliersService.deleteSupplier(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete supplier');
    }
  }
);

// Create the slice
const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    setSelectedSupplier: (state, action: PayloadAction<Supplier | null>) => {
      state.selectedSupplier = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all suppliers
      .addCase(fetchSuppliers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Fetch supplier by ID
      .addCase(fetchSupplierById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSupplierById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedSupplier = action.payload;
        state.error = null;
      })
      .addCase(fetchSupplierById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Search suppliers
      .addCase(searchSuppliers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(searchSuppliers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(searchSuppliers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Create supplier
      .addCase(createSupplier.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Update supplier
      .addCase(updateSupplier.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateSupplier.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const updatedSupplier = action.payload;
        const index = state.items.findIndex(supplier => supplier.id === updatedSupplier.id);
        if (index !== -1) {
          state.items[index] = updatedSupplier;
        }
        if (state.selectedSupplier?.id === updatedSupplier.id) {
          state.selectedSupplier = updatedSupplier;
        }
        state.error = null;
      })
      .addCase(updateSupplier.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Delete supplier
      .addCase(deleteSupplier.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(supplier => supplier.id !== action.payload);
        if (state.selectedSupplier?.id === action.payload) {
          state.selectedSupplier = null;
        }
        state.error = null;
      })
      .addCase(deleteSupplier.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { setSelectedSupplier, clearError } = suppliersSlice.actions;
export default suppliersSlice.reducer;

// Selectors
export const selectAllSuppliers = (state: RootState) => state.suppliers.items;
export const selectSupplierById = (state: RootState, supplierId: number) => 
  state.suppliers.items.find(supplier => supplier.id === supplierId);
export const selectSelectedSupplier = (state: RootState) => state.suppliers.selectedSupplier;
export const selectSuppliersStatus = (state: RootState) => state.suppliers.status;
export const selectSuppliersError = (state: RootState) => state.suppliers.error;