import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { clientsService, Client, InsertClient } from '../../services/clientsService';
import { RootState } from '../store';

// Define the state interface
interface ClientsState {
  items: Client[];
  selectedClient: Client | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state
const initialState: ClientsState = {
  items: [],
  selectedClient: null,
  status: 'idle',
  error: null
};

// Async thunks
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      return await clientsService.getClients();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch clients');
    }
  }
);

export const fetchClientById = createAsyncThunk(
  'clients/fetchClientById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await clientsService.getClientById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch client');
    }
  }
);

export const searchClients = createAsyncThunk(
  'clients/searchClients',
  async (query: string, { rejectWithValue }) => {
    try {
      return await clientsService.searchClients(query);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to search clients');
    }
  }
);

export const createClient = createAsyncThunk(
  'clients/createClient',
  async (client: InsertClient, { rejectWithValue }) => {
    try {
      return await clientsService.createClient(client);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create client');
    }
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, client }: { id: number; client: InsertClient }, { rejectWithValue }) => {
    try {
      return await clientsService.updateClient(id, client);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update client');
    }
  }
);

export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id: number, { rejectWithValue }) => {
    try {
      await clientsService.deleteClient(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete client');
    }
  }
);

// Create the slice
const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setSelectedClient: (state, action: PayloadAction<Client | null>) => {
      state.selectedClient = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all clients
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Fetch client by ID
      .addCase(fetchClientById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchClientById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedClient = action.payload;
        state.error = null;
      })
      .addCase(fetchClientById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Search clients
      .addCase(searchClients.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(searchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(searchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Create client
      .addCase(createClient.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(createClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Update client
      .addCase(updateClient.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const updatedClient = action.payload;
        const index = state.items.findIndex(client => client.id === updatedClient.id);
        if (index !== -1) {
          state.items[index] = updatedClient;
        }
        if (state.selectedClient?.id === updatedClient.id) {
          state.selectedClient = updatedClient;
        }
        state.error = null;
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Delete client
      .addCase(deleteClient.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(client => client.id !== action.payload);
        if (state.selectedClient?.id === action.payload) {
          state.selectedClient = null;
        }
        state.error = null;
      })
      .addCase(deleteClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { setSelectedClient, clearError } = clientsSlice.actions;
export default clientsSlice.reducer;

// Selectors
export const selectAllClients = (state: RootState) => state.clients.items;
export const selectClientById = (state: RootState, clientId: number) => 
  state.clients.items.find(client => client.id === clientId);
export const selectSelectedClient = (state: RootState) => state.clients.selectedClient;
export const selectClientsStatus = (state: RootState) => state.clients.status;
export const selectClientsError = (state: RootState) => state.clients.error;