import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { clientOrdersService, ClientOrder, PaymentRecord } from '../../services/clientOrdersService';
import { OrderRequestItem } from '../../services/orderRequestsService';

// Define the state interface with extended ClientOrder including items
interface ClientOrderState {
  clientOrders: (ClientOrder & { items?: OrderRequestItem[] })[];
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: ClientOrderState = {
  clientOrders: [],
  loading: false,
  error: null
};

// Async thunks
export const fetchClientOrders = createAsyncThunk(
  'clientOrders/fetchClientOrders',
  async () => {
    try {
      const orders = await clientOrdersService.getClientOrders();
      
      // For each order, fetch its items
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          try {
            const fullOrder = await clientOrdersService.getClientOrderById(order.id);
            return fullOrder;
          } catch (error) {
            // If we can't get items, return the order without items
            return order;
          }
        })
      );
      
      return ordersWithItems;
    } catch (error: any) {
      throw Error(error.message || 'Failed to fetch client orders');
    }
  }
);

export const getClientOrderById = createAsyncThunk(
  'clientOrders/getClientOrderById',
  async (id: number) => {
    try {
      return await clientOrdersService.getClientOrderById(id);
    } catch (error: any) {
      throw Error(error.message || `Failed to fetch client order with ID ${id}`);
    }
  }
);

export const changeClientOrderStatus = createAsyncThunk(
  'clientOrders/changeClientOrderStatus',
  async ({ id, status, changedBy }: { id: number, status: string, changedBy?: string }) => {
    try {
      return await clientOrdersService.changeOrderStatus(id, status, changedBy);
    } catch (error: any) {
      throw Error(error.message || `Failed to change status for client order with ID ${id}`);
    }
  }
);

export const addOrderPayment = createAsyncThunk(
  'clientOrders/addOrderPayment',
  async (paymentData: Omit<PaymentRecord, 'id' | 'created_at'>) => {
    try {
      await clientOrdersService.addPayment(paymentData);
      return await clientOrdersService.getClientOrderById(paymentData.order_id);
    } catch (error: any) {
      throw Error(error.message || `Failed to add payment for client order with ID ${paymentData.order_id}`);
    }
  }
);

export const updateOrderPaymentPlan = createAsyncThunk(
  'clientOrders/updateOrderPaymentPlan',
  async ({ orderId, paymentPlan }: { orderId: number, paymentPlan: string }) => {
    try {
      await clientOrdersService.updatePaymentPlan(orderId, paymentPlan);
      return await clientOrdersService.getClientOrderById(orderId);
    } catch (error: any) {
      throw Error(error.message || `Failed to update payment plan for client order with ID ${orderId}`);
    }
  }
);

export const getOrdersByStatus = createAsyncThunk(
  'clientOrders/getOrdersByStatus',
  async (status: string) => {
    try {
      return await clientOrdersService.getOrdersByStatus(status);
    } catch (error: any) {
      throw Error(error.message || `Failed to fetch orders with status ${status}`);
    }
  }
);

// Create the slice
const clientOrdersSlice = createSlice({
  name: 'clientOrders',
  initialState,
  reducers: {
    resetError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchClientOrders
      .addCase(fetchClientOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.clientOrders = action.payload;
      })
      .addCase(fetchClientOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch client orders';
      })
      
      // Handle getClientOrderById - does not modify state, just gets data
      
      // Handle changeClientOrderStatus
      .addCase(changeClientOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeClientOrderStatus.fulfilled, (state, action: PayloadAction<ClientOrder>) => {
        state.loading = false;
        
        // If status is changed to Pending, the order has been moved back to Order Requests
        // and should be removed from client orders
        if (action.payload.status === 'Pending') {
          console.log(`Removing order ${action.payload.id} from client orders list as it's moved to Pending`);
          state.clientOrders = state.clientOrders.filter(order => order.id !== action.payload.id);
        } else {
          // For other status changes, update the order
          const index = state.clientOrders.findIndex(order => order.id === action.payload.id);
          if (index !== -1) {
            // Preserve the items array if it exists
            const items = state.clientOrders[index].items;
            state.clientOrders[index] = {
              ...action.payload,
              items
            };
            console.log(`Updated order ${action.payload.id} status to ${action.payload.status}`);
          } else {
            // If the order doesn't exist in the state (new order), add it
            console.log(`Adding new order with ID ${action.payload.id} to client orders list`);
            state.clientOrders.push(action.payload);
          }
        }
      })
      .addCase(changeClientOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to change client order status';
      })
      
      // Handle adding payment
      .addCase(addOrderPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addOrderPayment.fulfilled, (state, action: PayloadAction<ClientOrder>) => {
        state.loading = false;
        
        // Update the order with new payment information
        const index = state.clientOrders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          // Preserve the items array if it exists
          const items = state.clientOrders[index].items;
          state.clientOrders[index] = {
            ...action.payload,
            items
          };
          console.log(`Updated order ${action.payload.id} with new payment information`);
        }
      })
      .addCase(addOrderPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add payment';
      })
      
      // Handle updating payment plan
      .addCase(updateOrderPaymentPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrderPaymentPlan.fulfilled, (state, action: PayloadAction<ClientOrder>) => {
        state.loading = false;
        
        // Update the order with new payment plan
        const index = state.clientOrders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          // Preserve the items array if it exists
          const items = state.clientOrders[index].items;
          state.clientOrders[index] = {
            ...action.payload,
            items
          };
          console.log(`Updated order ${action.payload.id} payment plan`);
        }
      })
      .addCase(updateOrderPaymentPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update payment plan';
      })
      
      // Handle getOrdersByStatus
      .addCase(getOrdersByStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOrdersByStatus.fulfilled, (state, action) => {
        state.loading = false;
        // This doesn't change the overall orders state, as it's just a filtered view
      })
      .addCase(getOrdersByStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders by status';
      });
  },
});

// Export actions
export const { resetError } = clientOrdersSlice.actions;

// Base selectors (not memoized as they return primitive/scalar values)
export const selectAllClientOrders = (state: RootState) => state.orders.clientOrders;
export const selectClientOrdersLoading = (state: RootState) => state.orders.loading;
export const selectClientOrdersError = (state: RootState) => state.orders.error;

// Memoized selectors for filtered orders
export const selectApprovedOrders = createSelector(
  [selectAllClientOrders],
  (clientOrders) => clientOrders.filter(order => order.status === 'Approved')
);

export const selectPartiallyPaidOrders = createSelector(
  [selectAllClientOrders],
  (clientOrders) => clientOrders.filter(order => order.status === 'Partially Paid')
);

export const selectCompletedOrders = createSelector(
  [selectAllClientOrders],
  (clientOrders) => clientOrders.filter(order => order.status === 'Completed')
);

export const selectRejectedOrders = createSelector(
  [selectAllClientOrders],
  (clientOrders) => clientOrders.filter(order => order.status === 'Rejected')
);

// Export reducer
export default clientOrdersSlice.reducer;