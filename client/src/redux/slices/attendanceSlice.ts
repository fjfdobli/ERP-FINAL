import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { attendanceService, Attendance, InsertAttendance, AttendanceFilters } from '../../services/attendanceService';
import { RootState } from '../store';

interface AttendanceState {
  attendanceRecords: Attendance[];
  selectedAttendance: Attendance | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  attendanceRecords: [],
  selectedAttendance: null,
  isLoading: false,
  error: null
};

// Async thunks
export const fetchAttendance = createAsyncThunk(
  'attendance/fetchAttendance',
  async (filters: AttendanceFilters = {}, { rejectWithValue }) => {
    try {
      return await attendanceService.getAttendance(filters);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch attendance records');
    }
  }
);

export const fetchAttendanceById = createAsyncThunk(
  'attendance/fetchAttendanceById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await attendanceService.getAttendanceById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch attendance record');
    }
  }
);

export const createAttendance = createAsyncThunk(
  'attendance/createAttendance',
  async (attendance: InsertAttendance, { rejectWithValue }) => {
    try {
      return await attendanceService.createAttendance(attendance);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create attendance record');
    }
  }
);

export const bulkCreateAttendance = createAsyncThunk(
  'attendance/bulkCreateAttendance',
  async (attendanceRecords: InsertAttendance[], { rejectWithValue }) => {
    try {
      return await attendanceService.bulkCreateAttendance(attendanceRecords);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create bulk attendance records');
    }
  }
);

export const updateAttendance = createAsyncThunk(
  'attendance/updateAttendance',
  async ({ id, data }: { id: number; data: Partial<InsertAttendance> }, { rejectWithValue }) => {
    try {
      return await attendanceService.updateAttendance(id, data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update attendance record');
    }
  }
);

export const deleteAttendance = createAsyncThunk(
  'attendance/deleteAttendance',
  async (id: number, { rejectWithValue }) => {
    try {
      await attendanceService.deleteAttendance(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete attendance record');
    }
  }
);

// Create the slice
const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setSelectedAttendance: (state, action: PayloadAction<Attendance | null>) => {
      state.selectedAttendance = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all attendance records
      .addCase(fetchAttendance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.attendanceRecords = action.payload;
        state.error = null;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch attendance by ID
      .addCase(fetchAttendanceById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAttendanceById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedAttendance = action.payload;
        state.error = null;
      })
      .addCase(fetchAttendanceById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create attendance
      .addCase(createAttendance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.attendanceRecords.unshift(action.payload);
        state.error = null;
      })
      .addCase(createAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Bulk create attendance
      .addCase(bulkCreateAttendance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(bulkCreateAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.attendanceRecords = [...action.payload, ...state.attendanceRecords];
        state.error = null;
      })
      .addCase(bulkCreateAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update attendance
      .addCase(updateAttendance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedAttendance = action.payload;
        const index = state.attendanceRecords.findIndex(record => record.id === updatedAttendance.id);
        if (index !== -1) {
          state.attendanceRecords[index] = updatedAttendance;
        }
        if (state.selectedAttendance?.id === updatedAttendance.id) {
          state.selectedAttendance = updatedAttendance;
        }
        state.error = null;
      })
      .addCase(updateAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete attendance
      .addCase(deleteAttendance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.attendanceRecords = state.attendanceRecords.filter(record => record.id !== action.payload);
        if (state.selectedAttendance?.id === action.payload) {
          state.selectedAttendance = null;
        }
        state.error = null;
      })
      .addCase(deleteAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedAttendance, clearError } = attendanceSlice.actions;
export default attendanceSlice.reducer;

// Selectors
export const selectAllAttendance = (state: RootState) => state.attendance.attendanceRecords;
export const selectAttendanceById = (state: RootState, recordId: number) => 
  state.attendance.attendanceRecords.find(record => record.id === recordId);
export const selectSelectedAttendance = (state: RootState) => state.attendance.selectedAttendance;
export const selectAttendanceLoading = (state: RootState) => state.attendance.isLoading;
export const selectAttendanceError = (state: RootState) => state.attendance.error;