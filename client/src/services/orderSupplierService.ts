import { supabase } from '../supabaseClient';
import { inventoryService } from '../services/inventoryService';

// Define all the interfaces needed
export interface SupplierOrder {
  id?: number;
  order_id: string;
  supplier_id: number;
  date: string;
  status: string;
  total_amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  payment_plan?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  items: SupplierOrderItem[];
  payments?: OrderPayment[];
  suppliers?: Supplier;
}

export interface SupplierOrderItem {
  id?: number;
  order_id?: number;
  inventory_id: number;
  inventory_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  // Virtual field - not in database but used in UI
  item_type?: string; 
}

export interface QuotationRequest {
  id?: number;
  request_id: string;
  supplier_id: number;
  date: string;
  status: string;
  notes?: string;
  items: QuotationItem[];
  created_at?: string;
  updated_at?: string;
  suppliers?: Supplier;
}

export interface QuotationItem {
  id?: number;
  request_id?: number;
  inventory_id: number;
  inventory_name: string;
  quantity: number;
  expected_price?: number;
  notes?: string;
}

export interface OrderPayment {
  id?: number;
  order_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_at?: string;
}

// Define our own Supplier interface specific to OrderSupplier service
export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
}

export interface CreateSupplierOrder {
  order_id: string;
  supplier_id: number;
  date: string;
  status: string;
  total_amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  payment_plan?: string;
  notes?: string;
  items: Omit<SupplierOrderItem, 'id'>[];
}

export interface UpdateSupplierOrder {
  supplier_id?: number;
  date?: string;
  status?: string;
  total_amount?: number;
  paid_amount?: number;
  remaining_amount?: number;
  payment_plan?: string;
  notes?: string;
}

export interface CreateQuotationRequest {
  request_id: string;
  supplier_id: number;
  date: string;
  status: string;
  notes?: string;
  items: Omit<QuotationItem, 'id' | 'request_id'>[];
}

export interface UpdateQuotationRequest {
  supplier_id?: number;
  date?: string;
  status?: string;
  notes?: string;
}

export interface CreateOrderPayment {
  order_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
}

// Table names
const SUPPLIER_ORDERS_TABLE = 'supplier_purchase_orders';
const SUPPLIER_ORDER_ITEMS_TABLE = 'supplier_purchase_items';
const QUOTATION_REQUESTS_TABLE = 'supplier_quotation_requests';
const QUOTATION_ITEMS_TABLE = 'supplier_quotation_items';
const ORDER_PAYMENTS_TABLE = 'supplier_payment_records';

/**
 * Service for managing supplier orders and quotation requests in Supabase
 */
export const orderSupplierService = {
  /**
   * Fetch all supplier orders
   */
  async getSupplierOrders(): Promise<SupplierOrder[]> {
    try {
      // 1. First fetch all supplier orders
      const { data: ordersData, error: ordersError } = await supabase
        .from(SUPPLIER_ORDERS_TABLE)
        .select('*')
        .order('date', { ascending: false });

      if (ordersError) throw ordersError;

      const orders = ordersData || [];

      // 2. Fetch items and payments for each order
      for (const order of orders) {
        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from(SUPPLIER_ORDER_ITEMS_TABLE)
          .select('*')
          .eq('order_id', order.id);

        if (itemsError) throw itemsError;

        // Add console log to debug the item_type values
        console.log('Order items from DB:', JSON.stringify(itemsData));
        
        order.items = itemsData || [];

        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from(ORDER_PAYMENTS_TABLE)
          .select('*')
          .eq('order_id', order.id);

        if (paymentsError) throw paymentsError;

        order.payments = paymentsData || [];
      }

      return orders;
    } catch (error) {
      console.error('Error fetching supplier orders:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch supplier orders');
    }
  },

  /**
   * Fetch supplier order by ID
   */
  async getSupplierOrderById(id: number): Promise<SupplierOrder | null> {
    try {
      // 1. Fetch the order
      const { data: orderData, error: orderError } = await supabase
        .from(SUPPLIER_ORDERS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      if (!orderData) return null;

      // 2. Fetch the order items
      const { data: itemsData, error: itemsError } = await supabase
        .from(SUPPLIER_ORDER_ITEMS_TABLE)
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      // 3. Fetch the payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from(ORDER_PAYMENTS_TABLE)
        .select('*')
        .eq('order_id', id);

      if (paymentsError) throw paymentsError;

      // 4. Combine the data
      const order = {
        ...orderData,
        items: itemsData || [],
        payments: paymentsData || []
      };

      return order;
    } catch (error) {
      console.error(`Error fetching supplier order with ID ${id}:`, error);
      throw new Error(error instanceof Error ? error.message : `Failed to fetch supplier order with ID ${id}`);
    }
  },

  /**
 * Update an individual order item
 */
  updateOrderItem: async (itemId: number, updates: Partial<SupplierOrderItem>) => {
    // Ensure item_type has a value if present
    const updatesWithType = {
      ...updates,
      item_type: updates.item_type || 'piece'
    };
    
    const { data, error } = await supabase
      .from('supplier_purchase_items')
      .update(updatesWithType)
      .eq('id', itemId);

    if (error) throw new Error(`Failed to update item ${itemId}: ${error.message}`);
    return data;
  },

  /**
  * Add a new order item
  */
  addOrderItem: async (orderId: number, item: SupplierOrderItem) => {
    // Ensure item type is included
    const itemWithType = {
      ...item,
      item_type: item.item_type || 'piece',
      order_id: orderId
    };
    
    const { data, error } = await supabase
      .from('supplier_purchase_items')
      .insert([itemWithType]);

    if (error) throw new Error(`Failed to add item to order ${orderId}: ${error.message}`);
    return data;
  },

  async deleteQuotationItemsByRequestId(requestId: number) {
    const { error } = await supabase
      .from('supplier_quotation_items')
      .delete()
      .eq('request_id', requestId);
    if (error) throw error;
  },

  async addQuotationItem(requestId: number, item: QuotationItem) {
    const { error } = await supabase
      .from('supplier_quotation_items')
      .insert([{
        request_id: requestId,
        inventory_id: item.inventory_id,
        inventory_name: item.inventory_name,
        quantity: item.quantity,
        expected_price: item.expected_price,
        notes: item.notes
      }]);
    if (error) throw error;
  },

  /**
  * Delete an individual item
  */
  deleteOrderItem: async (id: number) => {
    const { error } = await supabase
      .from('supplier_purchase_items')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Failed to delete iitem $(id): ${errror.message}');
  },

  /**
   * Create a new supplier order with its items
   */
  async createSupplierOrder(orderData: CreateSupplierOrder): Promise<SupplierOrder> {
    // Use the existing supabase client
    const connection = supabase;

    try {
      //Insert the order
      const orderToInsert = {
        order_id: orderData.order_id,
        supplier_id: orderData.supplier_id,
        date: orderData.date,
        status: orderData.status,
        total_amount: orderData.total_amount,
        paid_amount: orderData.paid_amount || 0,
        remaining_amount: orderData.remaining_amount || orderData.total_amount,
        payment_plan: orderData.payment_plan,
        notes: orderData.notes
      };

      const { data: orderResult, error: orderError } = await connection
        .from(SUPPLIER_ORDERS_TABLE)
        .insert([orderToInsert])
        .select()
        .single();

      if (orderError) throw orderError;

      //Insert the order items
      const orderItems = orderData.items.map(item => ({
        order_id: orderResult.id,
        inventory_id: item.inventory_id,
        inventory_name: item.inventory_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        item_type: item.item_type || 'piece'
      }));

      const { data: itemsResult, error: itemsError } = await connection
        .from(SUPPLIER_ORDER_ITEMS_TABLE)
        .insert(orderItems)
        .select();

      if (itemsError) throw itemsError;

      // Return the complete order with items
      return {
        ...orderResult,
        items: itemsResult || []
      };
    } catch (error) {
      console.error('Error creating supplier order:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create supplier order');
    }
  },

  /**
   * Update a supplier order
   */
  async updateSupplierOrder(id: number, updates: UpdateSupplierOrder): Promise<SupplierOrder> {
    const { data, error } = await supabase
      .from(SUPPLIER_ORDERS_TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating supplier order with ID ${id}:`, error);
      throw new Error(error.message);
    }

    // Fetch the updated order with items to return
    return this.getSupplierOrderById(id) as Promise<SupplierOrder>;
  },

  /**
   * Delete a supplier order
   */
  async deleteSupplierOrder(id: number): Promise<void> {
    // Use the existing supabase client
    const connection = supabase;

    try {
      // 1. Delete the order items
      const { error: itemsError } = await connection
        .from(SUPPLIER_ORDER_ITEMS_TABLE)
        .delete()
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      // 2. Delete the payments
      const { error: paymentsError } = await connection
        .from(ORDER_PAYMENTS_TABLE)
        .delete()
        .eq('order_id', id);

      if (paymentsError) throw paymentsError;

      // 3. Delete the order
      const { error: orderError } = await connection
        .from(SUPPLIER_ORDERS_TABLE)
        .delete()
        .eq('id', id);

      if (orderError) throw orderError;
    } catch (error) {
      console.error(`Error deleting supplier order with ID ${id}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete supplier order');
    }
  },

  /**
   * Add payment to an order
   */
  async addOrderPayment(payment: CreateOrderPayment): Promise<OrderPayment> {
    try {
      // 1. Insert the payment
      const { data: paymentResult, error: paymentError } = await supabase
        .from(ORDER_PAYMENTS_TABLE)
        .insert([payment])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 2. Get the updated order details with items
      const { data: orderData, error: orderError } = await supabase
        .from(SUPPLIER_ORDERS_TABLE)
        .select('*, items:supplier_purchase_items(*)')  // <== must match your actual items table alias
        .eq('id', payment.order_id)
        .single();

      if (orderError || !orderData) throw orderError;

      const newPaidAmount = (orderData.paid_amount || 0) + payment.amount;
      const newRemainingAmount = orderData.total_amount - newPaidAmount;

      // 3. Update payment totals and status
      let newStatus = orderData.status;
      if (newRemainingAmount <= 0) {
        newStatus = 'Paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'Partially Paid';
      }

      await supabase
        .from(SUPPLIER_ORDERS_TABLE)
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus
        })
        .eq('id', payment.order_id);

      //Auto partial stock-in
      for (const item of orderData.items || []) {
        const unitPrice = item.unit_price;
        const totalQty = item.quantity;
        const maxQtyByPayment = Math.floor(newPaidAmount / unitPrice);

        //Check existing stock-in transactions for this order
        const { data: stockIns, error: stockError } = await supabase
          .from('inventory_transactions')
          .select('quantity')
          .eq('inventoryId', item.inventory_id)
          .eq('transactionType', 'stock_in')
          .like('notes', `%PO ${orderData.order_id}%`);

        const alreadyStocked = stockIns?.reduce((sum, tx) => sum + tx.quantity, 0) || 0;
        const toStockNow = Math.min(maxQtyByPayment - alreadyStocked, totalQty - alreadyStocked);

        if (toStockNow > 0) {
          const inventoryItem = await inventoryService.getInventoryItemById(item.inventory_id);
          const currentQty = inventoryItem?.quantity || 0;

          await inventoryService.updateInventoryItem(item.inventory_id, {
            quantity: currentQty + toStockNow
          });

          await inventoryService.addTransaction({
            inventoryId: item.inventory_id,
            transactionType: 'stock_in',
            quantity: toStockNow,
            createdBy: orderData.supplier_id,
            isSupplier: true,
            notes: `Auto partial stock-in from PO ${orderData.order_id}`,
            transactionDate: new Date().toISOString()
          });
        }
      }

      return paymentResult;
    } catch (error) {
      console.error('Error adding order payment:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to add order payment');
    }
  },

  /**
   * Fetch all quotation requests
   */
  async getQuotationRequests(): Promise<QuotationRequest[]> {
    try {
      // 1. First fetch all quotation requests
      const { data: requestsData, error: requestsError } = await supabase
        .from(QUOTATION_REQUESTS_TABLE)
        .select('*')
        .order('date', { ascending: false });

      if (requestsError) throw requestsError;

      const requests = requestsData || [];

      // 2. Fetch items for each request
      for (const request of requests) {
        const { data: itemsData, error: itemsError } = await supabase
          .from(QUOTATION_ITEMS_TABLE)
          .select('*')
          .eq('request_id', request.id);

        if (itemsError) throw itemsError;

        request.items = itemsData || [];
      }

      return requests;
    } catch (error) {
      console.error('Error fetching quotation requests:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch quotation requests');
    }
  },

  /**
   * Fetch quotation request by ID
   */
  async getQuotationRequestById(id: number): Promise<QuotationRequest | null> {
    try {
      // 1. Fetch the quotation request
      const { data: requestData, error: requestError } = await supabase
        .from(QUOTATION_REQUESTS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (requestError) throw requestError;
      if (!requestData) return null;

      // 2. Fetch the quotation items
      const { data: itemsData, error: itemsError } = await supabase
        .from(QUOTATION_ITEMS_TABLE)
        .select('*')
        .eq('request_id', id);

      if (itemsError) throw itemsError;

      // 3. Combine the data
      const request = {
        ...requestData,
        items: itemsData || []
      };

      return request;
    } catch (error) {
      console.error(`Error fetching quotation request with ID ${id}:`, error);
      throw new Error(error instanceof Error ? error.message : `Failed to fetch quotation request with ID ${id}`);
    }
  },

  /**
   * Create a new quotation request with its items
   */
  async createQuotationRequest(quotationData: CreateQuotationRequest): Promise<QuotationRequest> {
    // Use the existing supabase client
    const connection = supabase;

    try {
      // 1. Insert the quotation request
      const quotationToInsert = {
        request_id: quotationData.request_id,
        supplier_id: quotationData.supplier_id,
        date: quotationData.date,
        status: quotationData.status,
        notes: quotationData.notes
      };

      const { data: quotationResult, error: quotationError } = await connection
        .from(QUOTATION_REQUESTS_TABLE)
        .insert([quotationToInsert])
        .select()
        .single();

      if (quotationError) throw quotationError;

      // 2. Insert the quotation items
      const quotationItems = quotationData.items.map(item => ({
        request_id: quotationResult.id,
        inventory_id: item.inventory_id,
        inventory_name: item.inventory_name,
        quantity: item.quantity,
        expected_price: item.expected_price,
        notes: item.notes
      }));

      const { data: itemsResult, error: itemsError } = await connection
        .from(QUOTATION_ITEMS_TABLE)
        .insert(quotationItems)
        .select();

      if (itemsError) throw itemsError;

      // Return the complete quotation with items
      return {
        ...quotationResult,
        items: itemsResult || []
      };
    } catch (error) {
      console.error('Error creating quotation request:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create quotation request');
    }
  },

  /**
   * Update a quotation request
   */
  async updateQuotationRequest(id: number, updates: UpdateQuotationRequest): Promise<QuotationRequest> {
    const { data, error } = await supabase
      .from(QUOTATION_REQUESTS_TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating quotation request with ID ${id}:`, error);
      throw new Error(error.message);
    }

    // Fetch the updated quotation with items to return
    return this.getQuotationRequestById(id) as Promise<QuotationRequest>;
  },

  /**
   * Delete a quotation request
   */
  async deleteQuotationRequest(id: number): Promise<void> {
    // Use the existing supabase client
    const connection = supabase;

    try {
      // 1. Delete the quotation items
      const { error: itemsError } = await connection
        .from(QUOTATION_ITEMS_TABLE)
        .delete()
        .eq('request_id', id);

      if (itemsError) throw itemsError;

      // 2. Delete the quotation request
      const { error: quotationError } = await connection
        .from(QUOTATION_REQUESTS_TABLE)
        .delete()
        .eq('id', id);

      if (quotationError) throw quotationError;
    } catch (error) {
      console.error(`Error deleting quotation request with ID ${id}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete quotation request');
    }
  },



  /**
   * Create a supplier order from a quotation request
   */
  async createOrderFromQuotation(quotationId: number): Promise<SupplierOrder> {
    try {
      // 1. Get the quotation request
      const quotation = await this.getQuotationRequestById(quotationId);
      if (!quotation) {
        throw new Error(`Quotation request with ID ${quotationId} not found`);
      }

      // 2. Generate a new order ID
      const orderIdPrefix = `PO-${new Date().getFullYear()}-`;
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from(SUPPLIER_ORDERS_TABLE)
        .select('order_id')
        .ilike('order_id', `${orderIdPrefix}%`)
        .order('order_id', { ascending: false })
        .limit(1)
        .single();

      if (maxOrderError && maxOrderError.code !== 'PGRST116') {
        // PGRST116 is the error code for "no rows returned", which is fine
        throw maxOrderError;
      }

      let orderNumber = 1;
      if (maxOrderData) {
        const lastOrderNumber = parseInt(maxOrderData.order_id.split('-').pop() || '0', 10);
        orderNumber = lastOrderNumber + 1;
      }
      const newOrderId = `${orderIdPrefix}${orderNumber.toString().padStart(3, '0')}`;

      // 3. Calculate total amount and prepare order items
      let totalAmount = 0;
      const orderItems = quotation.items.map(item => {
        const price = item.expected_price || 0;
        const totalPrice = price * item.quantity;
        totalAmount += totalPrice;

        return {
          inventory_id: item.inventory_id,
          inventory_name: item.inventory_name,
          quantity: item.quantity,
          unit_price: price,
          total_price: totalPrice
        };
      });

      // 4. Create the order
      const newOrder: CreateSupplierOrder = {
        order_id: newOrderId,
        supplier_id: quotation.supplier_id,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        total_amount: totalAmount,
        remaining_amount: totalAmount,
        notes: `Created from RFQ: ${quotation.request_id}`,
        items: orderItems
      };

      const createdOrder = await this.createSupplierOrder(newOrder);

      // 5. Update the quotation status
      await this.updateQuotationRequest(quotationId, {
        status: 'Converted'
      });

      return createdOrder;
    } catch (error) {
      console.error(`Error creating order from quotation with ID ${quotationId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create order from quotation');
    }
  }
};