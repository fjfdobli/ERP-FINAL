import { supabase } from '../supabaseClient';

export interface OrderRequestItem {
  id?: number;
  request_id?: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  serial_start?: string;
  serial_end?: string;
  created_at?: string;
}

export interface OrderRequest {
  id: number;
  request_id: string;
  client_id: number;
  date: string;
  type: string;
  status: string;
  total_amount: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExtendedOrderRequest extends OrderRequest {
  items?: OrderRequestItem[];
  clients?: {
    id: number;
    name: string;
    contactPerson: string;
    status: string;
  };
}

export const orderRequestsService = {
  // Get all order requests with client details
  async getOrderRequests(): Promise<ExtendedOrderRequest[]> {
    try {
      const { data: requests, error } = await supabase
        .from('order_requests')
        .select(`
          *,
          clients(id, name, "contactPerson", status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all items for all requests
      const { data: allItems, error: itemsError } = await supabase
        .from('order_request_items')
        .select('*');

      if (itemsError) throw itemsError;

      // Map items to their respective requests
      const extendedRequests = requests.map((request: any) => {
        const requestItems = allItems.filter((item: any) => item.request_id === request.id);
        return {
          ...request,
          items: requestItems
        };
      });

      return extendedRequests;
    } catch (error) {
      console.error('Error fetching order requests:', error);
      throw error;
    }
  },

  // Get a single order request with all items
  async getOrderRequestById(id: number): Promise<ExtendedOrderRequest | null> {
    try {
      const { data: request, error } = await supabase
        .from('order_requests')
        .select(`
          *,
          clients(id, name, "contactPerson", status)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!request) return null;

      // Get items for this request
      const { data: items, error: itemsError } = await supabase
        .from('order_request_items')
        .select('*')
        .eq('request_id', id);

      if (itemsError) throw itemsError;

      console.log(`Found ${items?.length || 0} items for request ${id}`);

      return {
        ...request,
        items: items || []
      };
    } catch (error) {
      console.error(`Error fetching order request with ID ${id}:`, error);
      throw error;
    }
  },

  // Create a new order request with items
  async createOrderRequest(
    orderRequest: Omit<OrderRequest, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<OrderRequestItem, 'id' | 'request_id' | 'created_at'>[]
  ): Promise<ExtendedOrderRequest> {
    try {
      // Calculate total amount from items
      const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
      const requestToCreate = {
        ...orderRequest,
        total_amount: totalAmount
      };

      // Insert the order request
      const { data: createdRequest, error } = await supabase
        .from('order_requests')
        .insert(requestToCreate)
        .select()
        .single();

      if (error) throw error;

      // Insert all items with the new request ID
      const itemsWithRequestId = items.map(item => ({
        ...item,
        request_id: createdRequest.id
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from('order_request_items')
        .insert(itemsWithRequestId)
        .select();

      if (itemsError) throw itemsError;
      
      console.log(`Created order request with ${createdItems?.length} items`);
      
      // Add history record for the creation
      await this.addOrderRequestHistory(
        createdRequest.id, 
        'Created', 
        'New order request created', 
        'System'
      );

      return {
        ...createdRequest,
        items: createdItems
      };
    } catch (error) {
      console.error('Error creating order request:', error);
      throw error;
    }
  },

  // Update an existing order request and its items
  async updateOrderRequest(
    id: number,
    orderRequest: Partial<OrderRequest>,
    items: OrderRequestItem[]
  ): Promise<ExtendedOrderRequest> {
    try {
      // Calculate total amount from items if not provided
      if (!orderRequest.total_amount) {
        orderRequest.total_amount = items.reduce((sum, item) => sum + item.total_price, 0);
      }

      // Update order request
      const { data: updatedRequest, error } = await supabase
        .from('order_requests')
        .update({ ...orderRequest, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('order_request_items')
        .delete()
        .eq('request_id', id);

      if (deleteError) throw deleteError;

      // Insert new items
      const itemsWithRequestId = items.map(item => ({
        ...item,
        request_id: id
      }));

      const { data: updatedItems, error: itemsError } = await supabase
        .from('order_request_items')
        .insert(itemsWithRequestId)
        .select();

      if (itemsError) throw itemsError;
      
      console.log(`Updated order request ${id} with ${updatedItems?.length} items`);
      
      // Add history record for the update
      await this.addOrderRequestHistory(
        id, 
        'Updated', 
        'Order request updated with new items', 
        'System'
      );

      return {
        ...updatedRequest,
        items: updatedItems
      };
    } catch (error) {
      console.error(`Error updating order request with ID ${id}:`, error);
      throw error;
    }
  },
  
  // Add history tracking
  async addOrderRequestHistory(requestId: number, status: string, notes?: string, changedBy?: string): Promise<void> {
    try {
      await supabase
        .from('order_history')
        .insert({
          request_id: requestId,
          status: status,
          notes: notes || `Status changed to ${status}`,
          changed_by: changedBy || 'System'
        });
    } catch (error) {
      console.error(`Error adding history for order request ${requestId}:`, error);
      // Don't throw the error to prevent blocking the main operation
    }
  },
  
  // Get order history
  async getOrderHistory(requestId?: number, orderId?: number): Promise<any[]> {
    try {
      let query = supabase
        .from('order_history')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (requestId) {
        query = query.eq('request_id', requestId);
      } else if (orderId) {
        query = query.eq('order_id', orderId);
      } else {
        return [];
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching order history:', error);
      return [];
    }
  },

  // Change order request status
  async changeOrderRequestStatus(id: number, status: string, changedBy?: string): Promise<OrderRequest> {
    try {
      console.log(`Changing request ${id} status to ${status}`);
      
      // Check if we're approving or rejecting - if so, we need to create a client order
      if (status === 'Approved' || status === 'Rejected') {
        // Get full order request with items
        const orderRequest = await this.getOrderRequestById(id);
        if (!orderRequest) throw new Error(`Order request with ID ${id} not found`);
        
        console.log(`Request has ${orderRequest.items?.length || 0} items`);

        // Check if a client order already exists for this request
        const { data: existingOrder, error: checkError } = await supabase
          .from('client_orders')
          .select('id')
          .eq('request_id', id)
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        let clientOrderId;
        
        if (!existingOrder) {
          console.log(`No existing client order for request ${id}, creating new one`);
          
          // Create client order if status is changing to approved or rejected
          const { data: clientOrder, error: orderError } = await supabase
            .from('client_orders')
            .insert({
              order_id: `CO-${Date.now()}`, // Generate a unique order ID
              client_id: orderRequest.client_id,
              date: orderRequest.date,
              amount: orderRequest.total_amount,
              status: status,
              notes: orderRequest.notes,
              request_id: id
            })
            .select()
            .single();

          if (orderError) throw orderError;
          
          clientOrderId = clientOrder.id;

          // Create client order items
          if (orderRequest.items && orderRequest.items.length > 0) {
            const orderItems = orderRequest.items.map(item => ({
              order_id: clientOrder.id,
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              serial_start: item.serial_start,
              serial_end: item.serial_end
            }));
            
            console.log(`Adding ${orderItems.length} items to new client order`);

            const { error: itemsError } = await supabase
              .from('client_order_items')
              .insert(orderItems);

            if (itemsError) throw itemsError;
          }
        } else {
          console.log(`Found existing client order ${existingOrder.id} for request ${id}, updating status`);
          
          clientOrderId = existingOrder.id;
          
          // Just update the status of the existing order
          const { error: updateError } = await supabase
            .from('client_orders')
            .update({ 
              status, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingOrder.id);
            
          if (updateError) throw updateError;
        }
        
        // Add history record for the client order creation/update
        await supabase
          .from('order_history')
          .insert({
            order_id: clientOrderId,
            status: status,
            notes: `Order ${status.toLowerCase()} from request ${orderRequest.request_id}`,
            changed_by: changedBy || 'System'
          });
      }

      // Update order request status
      const { data: updatedRequest, error } = await supabase
        .from('order_requests')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Add history record for the request status change
      await this.addOrderRequestHistory(id, status, `Status changed to ${status}`, changedBy);

      return updatedRequest;
    } catch (error) {
      console.error(`Error changing status for order request with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete an order request and its items
  async deleteOrderRequest(id: number): Promise<void> {
    try {
      // Delete order request items first (should cascade, but to be safe)
      const { error: itemsError } = await supabase
        .from('order_request_items')
        .delete()
        .eq('request_id', id);

      if (itemsError) throw itemsError;

      // Delete order request
      const { error } = await supabase
        .from('order_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting order request with ID ${id}:`, error);
      throw error;
    }
  },

  // Generate a new unique request ID
  async generateRequestId(): Promise<string> {
    const prefix = 'REQ-';
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // 4 random digits
    return `${prefix}${timestamp}-${randomDigits}`;
  }
};