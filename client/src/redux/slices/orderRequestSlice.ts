import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { orderRequestsService, OrderRequest, ExtendedOrderRequest, OrderRequestItem } from '../../services/orderRequestsService';

// Define the state interface
interface OrderRequestState {
  orderRequests: ExtendedOrderRequest[];
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: OrderRequestState = {
  orderRequests: [],
  loading: false,
  error: null
};

// Async thunks
export const fetchOrderRequests = createAsyncThunk(
  'orderRequest/fetchOrderRequests',
  async (_, { dispatch }) => {
    try {
      console.log('Fetching order requests');
      // Refresh the data when fetching order requests as there might be 
      // orders that have been moved back from client orders
      const orderRequests = await orderRequestsService.getOrderRequests();
      console.log(`Found ${orderRequests.length} order requests`);
      return orderRequests;
    } catch (error: any) {
      throw Error(error.message || 'Failed to fetch order requests');
    }
  }
);

export const getOrderRequestById = createAsyncThunk(
  'orderRequest/getOrderRequestById',
  async (id: number) => {
    try {
      return await orderRequestsService.getOrderRequestById(id);
    } catch (error: any) {
      throw Error(error.message || `Failed to fetch order request with ID ${id}`);
    }
  }
);

export const createOrderRequest = createAsyncThunk(
  'orderRequest/createOrderRequest',
  async ({ 
    orderRequest, 
    items 
  }: { 
    orderRequest: Omit<OrderRequest, 'id' | 'created_at' | 'updated_at'>, 
    items: Omit<OrderRequestItem, 'id' | 'request_id' | 'created_at'>[] 
  }) => {
    try {
      console.log(`Creating new order request with ${items.length} items`);
      return await orderRequestsService.createOrderRequest(orderRequest, items);
    } catch (error: any) {
      throw Error(error.message || 'Failed to create order request');
    }
  }
);

export const updateOrderRequest = createAsyncThunk(
  'orderRequest/updateOrderRequest',
  async ({ 
    id, 
    orderRequest, 
    items 
  }: { 
    id: number, 
    orderRequest: Partial<OrderRequest>, 
    items: OrderRequestItem[] 
  }) => {
    try {
      console.log(`Updating order request ${id} with ${items.length} items`);
      return await orderRequestsService.updateOrderRequest(id, orderRequest, items);
    } catch (error: any) {
      throw Error(error.message || `Failed to update order request with ID ${id}`);
    }
  }
);

export const changeOrderRequestStatus = createAsyncThunk(
  'orderRequest/changeOrderRequestStatus',
  async ({ id, status, changedBy }: { id: number, status: string, changedBy?: string }) => {
    try {
      console.log(`Changing request ${id} status to ${status}`);
      return await orderRequestsService.changeOrderRequestStatus(id, status, changedBy);
    } catch (error: any) {
      throw Error(error.message || `Failed to change status for order request with ID ${id}`);
    }
  }
);

export const deleteOrderRequest = createAsyncThunk(
  'orderRequest/deleteOrderRequest',
  async (id: number) => {
    try {
      await orderRequestsService.deleteOrderRequest(id);
      return id;
    } catch (error: any) {
      throw Error(error.message || `Failed to delete order request with ID ${id}`);
    }
  }
);

// Create the slice
const orderRequestSlice = createSlice({
  name: 'orderRequest',
  initialState,
  reducers: {
    resetError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchOrderRequests
      .addCase(fetchOrderRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderRequests.fulfilled, (state, action: PayloadAction<ExtendedOrderRequest[]>) => {
        state.loading = false;
        state.orderRequests = action.payload;
      })
      .addCase(fetchOrderRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch order requests';
      })
      
      // Handle getOrderRequestById - it doesn't modify the list, so we don't need to handle it
      
      // Handle createOrderRequest
      .addCase(createOrderRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrderRequest.fulfilled, (state, action: PayloadAction<ExtendedOrderRequest>) => {
        state.loading = false;
        state.orderRequests.unshift(action.payload);  // Add to the beginning of the array
        console.log(`Added new request ${action.payload.id} to state`);
      })
      .addCase(createOrderRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create order request';
      })
      
      // Handle updateOrderRequest
      .addCase(updateOrderRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderRequest.fulfilled, (state, action: PayloadAction<ExtendedOrderRequest>) => {
        state.loading = false;
        const index = state.orderRequests.findIndex(request => request.id === action.payload.id);
        if (index !== -1) {
          state.orderRequests[index] = action.payload;
          console.log(`Updated request ${action.payload.id} in state`);
        } else {
          // If not found, add it (this shouldn't normally happen)
          state.orderRequests.unshift(action.payload);
          console.log(`Request ${action.payload.id} not found in state, adding it`);
        }
      })
      .addCase(updateOrderRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update order request';
      })
      
      // Handle changeOrderRequestStatus
      .addCase(changeOrderRequestStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeOrderRequestStatus.fulfilled, (state, action: PayloadAction<OrderRequest>) => {
        state.loading = false;
        const index = state.orderRequests.findIndex(request => request.id === action.payload.id);
        
        // If status is Approved or Rejected, remove from requests (it's now in client orders)
        if (action.payload.status === 'Approved' || action.payload.status === 'Rejected') {
          if (index !== -1) {
            console.log(`Removing request ${action.payload.id} from state as it's now ${action.payload.status}`);
            state.orderRequests.splice(index, 1);
          }
        } else if (index !== -1) {
          // Otherwise, just update the status
          state.orderRequests[index] = {
            ...state.orderRequests[index],
            status: action.payload.status,
            updated_at: action.payload.updated_at
          };
          console.log(`Updated request ${action.payload.id} status to ${action.payload.status}`);
        } else {
          // If not found and status is Pending, it may have been moved back from client orders
          if (action.payload.status === 'Pending') {
            // We should refresh the list to get the complete request with items
            console.log(`Request ${action.payload.id} not found in state and is Pending. Will handle in fetchOrderRequests.`);
          }
        }
      })
      .addCase(changeOrderRequestStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to change order request status';
      })
      
      // Handle deleteOrderRequest
      .addCase(deleteOrderRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOrderRequest.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.orderRequests = state.orderRequests.filter(request => request.id !== action.payload);
        console.log(`Deleted request ${action.payload} from state`);
      })
      .addCase(deleteOrderRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete order request';
      });
  },
});

// Export actions
export const { resetError } = orderRequestSlice.actions;

// Export selectors
export const selectOrderRequests = (state: RootState) => state.orderRequest.orderRequests;
export const selectOrderRequestLoading = (state: RootState) => state.orderRequest.loading;
export const selectOrderRequestError = (state: RootState) => state.orderRequest.error;

// Export reducer
export default orderRequestSlice.reducer;