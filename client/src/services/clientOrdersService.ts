import { supabase } from '../supabaseClient';
import { OrderRequestItem } from './orderRequestsService';

export interface ClientOrder {
  id: number;
  order_id: string;
  client_id: number;
  date: string;
  amount: number;
  status: string;
  notes?: string;
  request_id?: number | null;
  created_at?: string;
  updated_at?: string;
  clients?: {
    id: number;
    name: string;
    contactPerson: string;
    status: string;
  };
}

export const clientOrdersService = {
  // Get all client orders with client details
  async getClientOrders(): Promise<ClientOrder[]> {
    try {
      const { data: orders, error } = await supabase
        .from('client_orders')
        .select(`
          *,
          clients(id, name, "contactPerson", status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return orders;
    } catch (error) {
      console.error('Error fetching client orders:', error);
      throw error;
    }
  },

  // Get a single client order with all items
  async getClientOrderById(id: number): Promise<ClientOrder & { items?: OrderRequestItem[] }> {
    try {
      const { data: order, error } = await supabase
        .from('client_orders')
        .select(`
          *,
          clients(id, name, "contactPerson", status)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!order) throw new Error(`Order with ID ${id} not found`);

      // Get items for this order
      const { data: items, error: itemsError } = await supabase
        .from('client_order_items')
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      console.log(`Found ${items?.length || 0} items for order ${id}`);

      return {
        ...order,
        items: items || []
      };
    } catch (error) {
      console.error(`Error fetching client order with ID ${id}:`, error);
      throw error;
    }
  },

  // Change order status (e.g., to Completed, Rejected, or back to Pending)
  async changeOrderStatus(id: number, status: string, changedBy?: string): Promise<ClientOrder> {
    try {
      // Get the current order with all items before updating
      const currentOrder = await this.getClientOrderById(id);
      console.log(`Changing order ${id} status to ${status}`);
      console.log(`Current order has ${currentOrder.items?.length || 0} items`);
      
      // If changing to Pending, we need to move it back to Order Requests
      if (status === 'Pending') {
        // First, check if this order was created from an order request
        if (currentOrder.request_id) {
          // Get all items from this order
          const { data: orderItems, error: itemsError } = await supabase
            .from('client_order_items')
            .select('*')
            .eq('order_id', id);
            
          if (itemsError) throw itemsError;
          console.log(`Retrieved ${orderItems?.length || 0} items from client order`);
          
          // Check if the original order request still exists
          const { data: existingRequest, error: requestError } = await supabase
            .from('order_requests')
            .select('*')
            .eq('id', currentOrder.request_id)
            .single();
            
          if (requestError && requestError.code !== 'PGRST116') { // PGRST116 is "not found"
            throw requestError;
          }
          
          if (existingRequest) {
            console.log(`Order request ${currentOrder.request_id} exists, updating it`);
            // The order request still exists, update it back to pending
            const { error: updateError } = await supabase
              .from('order_requests')
              .update({
                status: 'Pending',
                updated_at: new Date().toISOString()
              })
              .eq('id', currentOrder.request_id);
              
            if (updateError) throw updateError;
            
            // Delete existing items for the order request
            const { error: deleteItemsError } = await supabase
              .from('order_request_items')
              .delete()
              .eq('request_id', currentOrder.request_id);
              
            if (deleteItemsError) throw deleteItemsError;
            
            // Insert new items based on the current order items
            if (orderItems && orderItems.length > 0) {
              const orderRequestItems = orderItems.map((item: any) => ({
                request_id: currentOrder.request_id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                serial_start: item.serial_start,
                serial_end: item.serial_end
              }));
              
              console.log(`Adding ${orderRequestItems.length} items to order request`);
              
              const { error: insertItemsError } = await supabase
                .from('order_request_items')
                .insert(orderRequestItems);
                
              if (insertItemsError) throw insertItemsError;
              
              // Update the total amount based on the items
              const totalAmount = orderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
              const { error: updateAmountError } = await supabase
                .from('order_requests')
                .update({ total_amount: totalAmount })
                .eq('id', currentOrder.request_id);
                
              if (updateAmountError) throw updateAmountError;
            }
          } else {
            console.log(`Order request ${currentOrder.request_id} doesn't exist, creating new one`);
            // The original order request doesn't exist anymore, create a new one
            // Calculate total amount from items
            const totalAmount = orderItems?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
            
            const { data: newRequest, error: createError } = await supabase
              .from('order_requests')
              .insert({
                request_id: `REQ-${Date.now()}`,
                client_id: currentOrder.client_id,
                date: currentOrder.date,
                type: orderItems && orderItems.length > 0 ? orderItems[0].product_name : 'General Order',
                status: 'Pending',
                total_amount: totalAmount,
                notes: currentOrder.notes,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
              
            if (createError) throw createError;
            
            // Insert new items for the new order request
            if (orderItems && orderItems.length > 0) {
              const orderRequestItems = orderItems.map((item: any) => ({
                request_id: newRequest.id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                serial_start: item.serial_start,
                serial_end: item.serial_end
              }));
              
              console.log(`Adding ${orderRequestItems.length} items to new order request`);
              
              const { error: insertItemsError } = await supabase
                .from('order_request_items')
                .insert(orderRequestItems);
                
              if (insertItemsError) throw insertItemsError;
            }
          }
          
          // Add a history record for moving back to pending
          await this.addOrderHistory(
            id, 
            'MovedToPending', 
            'Order moved back to Order Requests for modification', 
            changedBy || 'System'
          );
          
          // Now delete the client order as it's moved back to order requests
          const { error: deleteOrderError } = await supabase
            .from('client_orders')
            .delete()
            .eq('id', id);
            
          if (deleteOrderError) throw deleteOrderError;
          
          // Return the deleted order with updated status for UI refresh
          return {
            ...currentOrder,
            status: 'Pending'
          };
        }
      }
      
      // For any other status changes (not to Pending), just update the status
      const { data: updatedOrder, error } = await supabase
        .from('client_orders')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Add history record for the status change
      await this.addOrderHistory(id, status, `Status changed to ${status}`, changedBy);
      
      return updatedOrder;
    } catch (error) {
      console.error(`Error changing status for client order with ID ${id}:`, error);
      throw error;
    }
  },

  // Get orders by status
  async getOrdersByStatus(status: string): Promise<ClientOrder[]> {
    try {
      const { data: orders, error } = await supabase
        .from('client_orders')
        .select(`
          *,
          clients(id, name, "contactPerson", status)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return orders;
    } catch (error) {
      console.error(`Error fetching client orders with status ${status}:`, error);
      throw error;
    }
  },
  
  // Add history tracking
  async addOrderHistory(orderId: number, status: string, notes?: string, changedBy?: string): Promise<void> {
    try {
      await supabase
        .from('order_history')
        .insert({
          order_id: orderId,
          status: status,
          notes: notes || `Status changed to ${status}`,
          changed_by: changedBy || 'System'
        });
    } catch (error) {
      console.error(`Error adding history for client order ${orderId}:`, error);
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
  }
};