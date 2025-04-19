import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  orderSupplierService, 
  SupplierOrder, 
  QuotationRequest, 
  CreateSupplierOrder,
  UpdateSupplierOrder,
  CreateQuotationRequest,
  UpdateQuotationRequest,
  CreateOrderPayment,
  OrderPayment
} from '../../services/orderSupplierService';
import { RootState } from '../store';

// Define the state interface
interface OrderSupplierState {
  supplierOrders: SupplierOrder[];
  selectedOrder: SupplierOrder | null;
  quotationRequests: QuotationRequest[];
  selectedQuotation: QuotationRequest | null;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: OrderSupplierState = {
  supplierOrders: [],
  selectedOrder: null,
  quotationRequests: [],
  selectedQuotation: null,
  isLoading: false,
  error: null
};

// Async thunks for supplier orders
export const fetchSupplierOrders = createAsyncThunk(
  'orderSupplier/fetchSupplierOrders',
  async (_, { rejectWithValue }) => {
    try {
      return await orderSupplierService.getSupplierOrders();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch supplier orders');
    }
  }
);

export const fetchSupplierOrderById = createAsyncThunk(
  'orderSupplier/fetchSupplierOrderById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await orderSupplierService.getSupplierOrderById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch supplier order');
    }
  }
);

export const createSupplierOrder = createAsyncThunk(
  'orderSupplier/createSupplierOrder',
  async (orderData: CreateSupplierOrder, { rejectWithValue }) => {
    try {
      return await orderSupplierService.createSupplierOrder(orderData);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create supplier order');
    }
  }
);

export const updateSupplierOrder = createAsyncThunk(
  'orderSupplier/updateSupplierOrder',
  async ({ id, data }: { id: number; data: UpdateSupplierOrder }, { rejectWithValue }) => {
    try {
      return await orderSupplierService.updateSupplierOrder(id, data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update supplier order');
    }
  }
);

export const deleteSupplierOrder = createAsyncThunk(
  'orderSupplier/deleteSupplierOrder',
  async (id: number, { rejectWithValue }) => {
    try {
      await orderSupplierService.deleteSupplierOrder(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete supplier order');
    }
  }
);

export const addOrderPayment = createAsyncThunk(
  'orderSupplier/addOrderPayment',
  async (paymentData: CreateOrderPayment, { rejectWithValue }) => {
    try {
      return await orderSupplierService.addOrderPayment(paymentData);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add order payment');
    }
  }
);

// Async thunks for quotation requests
export const fetchQuotationRequests = createAsyncThunk(
  'orderSupplier/fetchQuotationRequests',
  async (_, { rejectWithValue }) => {
    try {
      return await orderSupplierService.getQuotationRequests();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch quotation requests');
    }
  }
);

export const fetchQuotationRequestById = createAsyncThunk(
  'orderSupplier/fetchQuotationRequestById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await orderSupplierService.getQuotationRequestById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch quotation request');
    }
  }
);

export const createQuotationRequest = createAsyncThunk(
  'orderSupplier/createQuotationRequest',
  async (quotationData: CreateQuotationRequest, { rejectWithValue }) => {
    try {
      return await orderSupplierService.createQuotationRequest(quotationData);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create quotation request');
    }
  }
);

export const updateQuotationRequest = createAsyncThunk(
  'orderSupplier/updateQuotationRequest',
  async ({ id, data }: { id: number; data: UpdateQuotationRequest }, { rejectWithValue }) => {
    try {
      return await orderSupplierService.updateQuotationRequest(id, data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update quotation request');
    }
  }
);

export const deleteQuotationRequest = createAsyncThunk(
  'orderSupplier/deleteQuotationRequest',
  async (id: number, { rejectWithValue }) => {
    try {
      await orderSupplierService.deleteQuotationRequest(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete quotation request');
    }
  }
);

export const createOrderFromQuotation = createAsyncThunk(
  'orderSupplier/createOrderFromQuotation',
  async (quotationId: number, { rejectWithValue }) => {
    try {
      return await orderSupplierService.createOrderFromQuotation(quotationId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create order from quotation');
    }
  }
);

// Create the slice
const orderSupplierSlice = createSlice({
  name: 'orderSupplier',
  initialState,
  reducers: {
    setSelectedOrder: (state, action: PayloadAction<SupplierOrder | null>) => {
      state.selectedOrder = action.payload;
    },
    setSelectedQuotation: (state, action: PayloadAction<QuotationRequest | null>) => {
      state.selectedQuotation = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all supplier orders
      .addCase(fetchSupplierOrders.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSupplierOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.supplierOrders = action.payload;
        state.error = null;
      })
      .addCase(fetchSupplierOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch supplier order by ID
      .addCase(fetchSupplierOrderById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSupplierOrderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchSupplierOrderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create supplier order
      .addCase(createSupplierOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createSupplierOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.supplierOrders.unshift(action.payload);
        state.error = null;
      })
      .addCase(createSupplierOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update supplier order
      .addCase(updateSupplierOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateSupplierOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedOrder = action.payload;
        const index = state.supplierOrders.findIndex(order => order.id === updatedOrder.id);
        if (index !== -1) {
          state.supplierOrders[index] = updatedOrder;
        }
        if (state.selectedOrder?.id === updatedOrder.id) {
          state.selectedOrder = updatedOrder;
        }
        state.error = null;
      })
      .addCase(updateSupplierOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete supplier order
      .addCase(deleteSupplierOrder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteSupplierOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.supplierOrders = state.supplierOrders.filter(order => order.id !== action.payload);
        if (state.selectedOrder?.id === action.payload) {
          state.selectedOrder = null;
        }
        state.error = null;
      })
      .addCase(deleteSupplierOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Add order payment
      .addCase(addOrderPayment.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(addOrderPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        // The order will be updated through fetchSupplierOrderById or fetchSupplierOrders
        state.error = null;
      })
      .addCase(addOrderPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch all quotation requests
      .addCase(fetchQuotationRequests.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchQuotationRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.quotationRequests = action.payload;
        state.error = null;
      })
      .addCase(fetchQuotationRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch quotation request by ID
      .addCase(fetchQuotationRequestById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchQuotationRequestById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedQuotation = action.payload;
        state.error = null;
      })
      .addCase(fetchQuotationRequestById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create quotation request
      .addCase(createQuotationRequest.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createQuotationRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.quotationRequests.unshift(action.payload);
        state.error = null;
      })
      .addCase(createQuotationRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update quotation request
      .addCase(updateQuotationRequest.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateQuotationRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedQuotation = action.payload;
        const index = state.quotationRequests.findIndex(quotation => quotation.id === updatedQuotation.id);
        if (index !== -1) {
          state.quotationRequests[index] = updatedQuotation;
        }
        if (state.selectedQuotation?.id === updatedQuotation.id) {
          state.selectedQuotation = updatedQuotation;
        }
        state.error = null;
      })
      .addCase(updateQuotationRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete quotation request
      .addCase(deleteQuotationRequest.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteQuotationRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.quotationRequests = state.quotationRequests.filter(quotation => quotation.id !== action.payload);
        if (state.selectedQuotation?.id === action.payload) {
          state.selectedQuotation = null;
        }
        state.error = null;
      })
      .addCase(deleteQuotationRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create order from quotation
      .addCase(createOrderFromQuotation.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createOrderFromQuotation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.supplierOrders.unshift(action.payload);
        
        // Update the quotation status in the state
        const quotationId = action.meta.arg;
        const quotationIndex = state.quotationRequests.findIndex(quotation => quotation.id === quotationId);
        if (quotationIndex !== -1) {
          state.quotationRequests[quotationIndex].status = 'Converted';
        }
        
        state.error = null;
      })
      .addCase(createOrderFromQuotation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { setSelectedOrder, setSelectedQuotation, clearError } = orderSupplierSlice.actions;
export default orderSupplierSlice.reducer;

// Selectors
export const selectAllSupplierOrders = (state: RootState) => state.orderSupplier.supplierOrders;
export const selectSupplierOrderById = (state: RootState, orderId: number) => 
  state.orderSupplier.supplierOrders.find(order => order.id === orderId);
export const selectSelectedSupplierOrder = (state: RootState) => state.orderSupplier.selectedOrder;

export const selectAllQuotationRequests = (state: RootState) => state.orderSupplier.quotationRequests;
export const selectQuotationRequestById = (state: RootState, quotationId: number) => 
  state.orderSupplier.quotationRequests.find(quotation => quotation.id === quotationId);
export const selectSelectedQuotationRequest = (state: RootState) => state.orderSupplier.selectedQuotation;

export const selectOrderSupplierLoading = (state: RootState) => state.orderSupplier.isLoading;
export const selectOrderSupplierError = (state: RootState) => state.orderSupplier.error;