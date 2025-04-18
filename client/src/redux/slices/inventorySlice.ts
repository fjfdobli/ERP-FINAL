import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  inventoryService, 
  InventoryItem, 
  UpdateInventoryItem, 
  CreateInventoryItem, 
  InventoryTransaction, 
  CreateInventoryTransaction 
} from '../../services/inventoryService';
import { RootState } from '../store';

interface Supplier {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  name: string;
}

// Define the state interface
interface InventoryState {
  inventoryItems: InventoryItem[];
  selectedItem: InventoryItem | null;
  transactions: InventoryTransaction[];
  activeSuppliers: Supplier[];
  activeEmployees: Employee[];
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: InventoryState = {
  inventoryItems: [],
  selectedItem: null,
  transactions: [],
  activeSuppliers: [],
  activeEmployees: [],
  isLoading: false,
  error: null
};

// Async thunks
export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async (_, { rejectWithValue }) => {
    try {
      return await inventoryService.getInventoryItems();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch inventory');
    }
  }
);

export const fetchInventoryItemById = createAsyncThunk(
  'inventory/fetchInventoryItemById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await inventoryService.getInventoryItemById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch inventory item');
    }
  }
);

export const searchInventory = createAsyncThunk(
  'inventory/searchInventory',
  async (query: string, { rejectWithValue }) => {
    try {
      return await inventoryService.searchInventory(query);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to search inventory');
    }
  }
);

export const fetchLowStockItems = createAsyncThunk(
  'inventory/fetchLowStockItems',
  async (_, { rejectWithValue }) => {
    try {
      return await inventoryService.getLowStockItems();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch low stock items');
    }
  }
);

export const createInventoryItem = createAsyncThunk(
  'inventory/createInventoryItem',
  async (item: CreateInventoryItem, { rejectWithValue }) => {
    try {
      return await inventoryService.createInventoryItem(item);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create inventory item');
    }
  }
);

export const updateInventoryItem = createAsyncThunk(
  'inventory/updateInventoryItem',
  async ({ id, data }: { id: number; data: UpdateInventoryItem }, { rejectWithValue }) => {
    try {
      return await inventoryService.updateInventoryItem(id, data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update inventory item');
    }
  }
);

export const deleteInventoryItem = createAsyncThunk(
  'inventory/deleteInventoryItem',
  async (id: number, { rejectWithValue }) => {
    try {
      await inventoryService.deleteInventoryItem(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete inventory item');
    }
  }
);

export const fetchItemTransactions = createAsyncThunk(
  'inventory/fetchItemTransactions',
  async (itemId: number, { rejectWithValue }) => {
    try {
      return await inventoryService.getItemTransactions(itemId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch item transactions');
    }
  }
);

export const addInventoryTransaction = createAsyncThunk(
  'inventory/addInventoryTransaction',
  async ({ inventoryId, transactionData }: { 
    inventoryId: number; 
    transactionData: Omit<CreateInventoryTransaction, 'inventoryId'> 
  }, { rejectWithValue }) => {
    try {
      const transaction: CreateInventoryTransaction = {
        ...transactionData,
        inventoryId
      };
      return await inventoryService.addTransaction(transaction);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add inventory transaction');
    }
  }
);

export const fetchActiveSuppliers = createAsyncThunk(
  'inventory/fetchActiveSuppliers',
  async (_, { rejectWithValue }) => {
    try {
      return await inventoryService.getActiveSuppliers();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch active suppliers');
    }
  }
);

export const fetchActiveEmployees = createAsyncThunk(
  'inventory/fetchActiveEmployees',
  async (_, { rejectWithValue }) => {
    try {
      return await inventoryService.getActiveEmployees();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch active employees');
    }
  }
);

// Create the slice
const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setSelectedItem: (state, action: PayloadAction<InventoryItem | null>) => {
      state.selectedItem = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all inventory items
      .addCase(fetchInventory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventoryItems = action.payload;
        state.error = null;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch inventory item by ID
      .addCase(fetchInventoryItemById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchInventoryItemById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedItem = action.payload;
        state.error = null;
      })
      .addCase(fetchInventoryItemById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Search inventory
      .addCase(searchInventory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventoryItems = action.payload;
        state.error = null;
      })
      .addCase(searchInventory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch low stock items
      .addCase(fetchLowStockItems.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchLowStockItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventoryItems = action.payload;
        state.error = null;
      })
      .addCase(fetchLowStockItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create inventory item
      .addCase(createInventoryItem.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createInventoryItem.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventoryItems.push(action.payload);
        state.error = null;
      })
      .addCase(createInventoryItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update inventory item
      .addCase(updateInventoryItem.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateInventoryItem.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedItem = action.payload;
        const index = state.inventoryItems.findIndex(item => item.id === updatedItem.id);
        if (index !== -1) {
          state.inventoryItems[index] = updatedItem;
        }
        if (state.selectedItem?.id === updatedItem.id) {
          state.selectedItem = updatedItem;
        }
        state.error = null;
      })
      .addCase(updateInventoryItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete inventory item
      .addCase(deleteInventoryItem.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteInventoryItem.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventoryItems = state.inventoryItems.filter(item => item.id !== action.payload);
        if (state.selectedItem?.id === action.payload) {
          state.selectedItem = null;
        }
        state.error = null;
      })
      .addCase(deleteInventoryItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch item transactions
      .addCase(fetchItemTransactions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchItemTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions = action.payload;
        state.error = null;
      })
      .addCase(fetchItemTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Add inventory transaction
      .addCase(addInventoryTransaction.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addInventoryTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions.unshift(action.payload);
        state.error = null;
      })
      .addCase(addInventoryTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch active suppliers
      .addCase(fetchActiveSuppliers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchActiveSuppliers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeSuppliers = action.payload;
        state.error = null;
      })
      .addCase(fetchActiveSuppliers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch active employees
      .addCase(fetchActiveEmployees.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchActiveEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeEmployees = action.payload;
        state.error = null;
      })
      .addCase(fetchActiveEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { setSelectedItem, clearError } = inventorySlice.actions;
export default inventorySlice.reducer;

// Selectors
export const selectAllInventoryItems = (state: RootState) => state.inventory.inventoryItems;
export const selectInventoryItemById = (state: RootState, itemId: number) => 
  state.inventory.inventoryItems.find(item => item.id === itemId);
export const selectSelectedInventoryItem = (state: RootState) => state.inventory.selectedItem;
export const selectInventoryTransactions = (state: RootState) => state.inventory.transactions;
export const selectActiveSuppliers = (state: RootState) => state.inventory.activeSuppliers;
export const selectActiveEmployees = (state: RootState) => state.inventory.activeEmployees;
export const selectInventoryLoading = (state: RootState) => state.inventory.isLoading;
export const selectInventoryError = (state: RootState) => state.inventory.error;