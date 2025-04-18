import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { payrollService, Payroll, InsertPayroll, PayrollFilters } from '../../services/payrollService';
import { RootState } from '../store';

interface PayrollState {
  payrollRecords: Payroll[];
  selectedPayroll: Payroll | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PayrollState = {
  payrollRecords: [],
  selectedPayroll: null,
  isLoading: false,
  error: null
};

// Async thunks
export const fetchPayrolls = createAsyncThunk(
  'payroll/fetchPayrolls',
  async (filters: PayrollFilters | undefined, { rejectWithValue }) => {
    try {
      return await payrollService.getPayrolls(filters);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch payroll records');
    }
  }
);

export const fetchPayrollById = createAsyncThunk(
  'payroll/fetchPayrollById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await payrollService.getPayrollById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch payroll record');
    }
  }
);

export const createPayroll = createAsyncThunk(
  'payroll/createPayroll',
  async (payroll: InsertPayroll, { rejectWithValue }) => {
    try {
      return await payrollService.createPayroll(payroll);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create payroll record');
    }
  }
);

export const bulkCreatePayroll = createAsyncThunk(
  'payroll/bulkCreatePayroll',
  async (payrolls: InsertPayroll[], { rejectWithValue }) => {
    try {
      return await payrollService.bulkCreatePayroll(payrolls);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create bulk payroll records');
    }
  }
);

export const updatePayroll = createAsyncThunk(
  'payroll/updatePayroll',
  async ({ id, data }: { id: number; data: Partial<InsertPayroll> }, { rejectWithValue }) => {
    try {
      return await payrollService.updatePayroll(id, data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update payroll record');
    }
  }
);

export const deletePayroll = createAsyncThunk(
  'payroll/deletePayroll',
  async (id: number, { rejectWithValue }) => {
    try {
      await payrollService.deletePayroll(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete payroll record');
    }
  }
);

// Create the slice
const payrollSlice = createSlice({
  name: 'payroll',
  initialState,
  reducers: {
    setSelectedPayroll: (state, action: PayloadAction<Payroll | null>) => {
      state.selectedPayroll = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all payroll records
      .addCase(fetchPayrolls.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPayrolls.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payrollRecords = action.payload;
        state.error = null;
      })
      .addCase(fetchPayrolls.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch payroll by ID
      .addCase(fetchPayrollById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPayrollById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPayroll = action.payload;
        state.error = null;
      })
      .addCase(fetchPayrollById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create payroll
      .addCase(createPayroll.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createPayroll.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payrollRecords.unshift(action.payload);
        state.error = null;
      })
      .addCase(createPayroll.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Bulk create payroll
      .addCase(bulkCreatePayroll.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(bulkCreatePayroll.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payrollRecords = [...action.payload, ...state.payrollRecords];
        state.error = null;
      })
      .addCase(bulkCreatePayroll.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update payroll
      .addCase(updatePayroll.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updatePayroll.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedPayroll = action.payload;
        const index = state.payrollRecords.findIndex(record => record.id === updatedPayroll.id);
        if (index !== -1) {
          state.payrollRecords[index] = updatedPayroll;
        }
        if (state.selectedPayroll?.id === updatedPayroll.id) {
          state.selectedPayroll = updatedPayroll;
        }
        state.error = null;
      })
      .addCase(updatePayroll.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete payroll
      .addCase(deletePayroll.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deletePayroll.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payrollRecords = state.payrollRecords.filter(record => record.id !== action.payload);
        if (state.selectedPayroll?.id === action.payload) {
          state.selectedPayroll = null;
        }
        state.error = null;
      })
      .addCase(deletePayroll.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedPayroll, clearError } = payrollSlice.actions;
export default payrollSlice.reducer;

// Selectors
export const selectAllPayrolls = (state: RootState) => state.payroll.payrollRecords;
export const selectPayrollById = (state: RootState, recordId: number) => 
  state.payroll.payrollRecords.find(record => record.id === recordId);
export const selectSelectedPayroll = (state: RootState) => state.payroll.selectedPayroll;
export const selectPayrollLoading = (state: RootState) => state.payroll.isLoading;
export const selectPayrollError = (state: RootState) => state.payroll.error;