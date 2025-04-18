import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { employeesService, Employee, InsertEmployee } from '../../services/employeesService';
import { RootState } from '../store';

interface EmployeesState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: EmployeesState = {
  employees: [],
  selectedEmployee: null,
  isLoading: false,
  error: null
};

// Async thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (_, { rejectWithValue }) => {
    try {
      return await employeesService.getEmployees();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch employees');
    }
  }
);

export const fetchEmployeeById = createAsyncThunk(
  'employees/fetchEmployeeById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await employeesService.getEmployeeById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch employee');
    }
  }
);

export const searchEmployees = createAsyncThunk(
  'employees/searchEmployees',
  async (query: string, { rejectWithValue }) => {
    try {
      return await employeesService.searchEmployees(query);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to search employees');
    }
  }
);

export const createEmployee = createAsyncThunk(
  'employees/createEmployee',
  async (employee: InsertEmployee, { rejectWithValue }) => {
    try {
      return await employeesService.createEmployee(employee);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create employee');
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, employee }: { id: number; employee: InsertEmployee }, { rejectWithValue }) => {
    try {
      return await employeesService.updateEmployee(id, employee);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update employee');
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (id: number, { rejectWithValue }) => {
    try {
      await employeesService.deleteEmployee(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete employee');
    }
  }
);

// Create the slice
const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setSelectedEmployee: (state, action: PayloadAction<Employee | null>) => {
      state.selectedEmployee = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all employees
      .addCase(fetchEmployees.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = action.payload;
        state.error = null;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch employee by ID
      .addCase(fetchEmployeeById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedEmployee = action.payload;
        state.error = null;
      })
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Search employees
      .addCase(searchEmployees.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = action.payload;
        state.error = null;
      })
      .addCase(searchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create employee
      .addCase(createEmployee.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees.push(action.payload);
        state.error = null;
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update employee
      .addCase(updateEmployee.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedEmployee = action.payload;
        const index = state.employees.findIndex(employee => employee.id === updatedEmployee.id);
        if (index !== -1) {
          state.employees[index] = updatedEmployee;
        }
        if (state.selectedEmployee?.id === updatedEmployee.id) {
          state.selectedEmployee = updatedEmployee;
        }
        state.error = null;
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete employee
      .addCase(deleteEmployee.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = state.employees.filter(employee => employee.id !== action.payload);
        if (state.selectedEmployee?.id === action.payload) {
          state.selectedEmployee = null;
        }
        state.error = null;
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedEmployee, clearError } = employeesSlice.actions;
export default employeesSlice.reducer;

export const selectAllEmployees = (state: RootState) => state.employees.employees;
export const selectEmployeeById = (state: RootState, employeeId: number) => 
  state.employees.employees.find(employee => employee.id === employeeId);
export const selectSelectedEmployee = (state: RootState) => state.employees.selectedEmployee;
export const selectEmployeesLoading = (state: RootState) => state.employees.isLoading;
export const selectEmployeesError = (state: RootState) => state.employees.error;