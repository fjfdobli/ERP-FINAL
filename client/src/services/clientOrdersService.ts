import { supabase } from '../supabaseClient';
import { OrderRequestItem } from './orderRequestsService';

export interface PaymentRecord {
  id?: number;
  order_id: number;
  amount: number;
  payment_date: string;
  payment_method?: string;
  notes?: string;
  created_at?: string;
}

export interface ClientOrder {
  id: number;
  order_id: string;
  client_id: number;
  date: string;
  amount: number;
  status: string;
  notes?: string;
  request_id?: number | null;
  paid_amount?: number;
  remaining_amount?: number;
  payment_plan?: string;
  created_at?: string;
  updated_at?: string;
  clients?: {
    id: number;
    name: string;
    contactPerson: string;
    status: string;
  };
  payments?: PaymentRecord[];
}

export const clientOrdersService = {
  // Add a payment record to an order
  async addPayment(orderPayment: Omit<PaymentRecord, 'id' | 'created_at'>): Promise<PaymentRecord> {
    try {
      // Insert the payment record
      const { data: payment, error } = await supabase
        .from('order_payments')
        .insert({
          ...orderPayment,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Get the order to calculate the new paid and remaining amounts
      const { data: order, error: orderError } = await supabase
        .from('client_orders')
        .select('amount')
        .eq('id', orderPayment.order_id)
        .single();

      if (orderError) throw orderError;

      // Get all payments for this order to calculate total paid amount
      const { data: payments, error: paymentsError } = await supabase
        .from('order_payments')
        .select('amount')
        .eq('order_id', orderPayment.order_id);

      if (paymentsError) throw paymentsError;

      // Calculate total paid amount
      const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingAmount = order.amount - paidAmount;

      // Update the order with new payment information
      const status = remainingAmount <= 0 ? 'Completed' : 'Partially Paid';
      
      const { error: updateError } = await supabase
        .from('client_orders')
        .update({
          status,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderPayment.order_id);

      if (updateError) throw updateError;

      // Add history record
      await this.addOrderHistory(
        orderPayment.order_id,
        'Payment',
        `Payment of ₱${orderPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} recorded. ${remainingAmount <= 0 ? 'Order fully paid.' : ''}`,
        'Admin'
      );

      // If fully paid, add another history record for completion
      if (remainingAmount <= 0) {
        await this.addOrderHistory(
          orderPayment.order_id,
          'Completed',
          'Order automatically marked as completed after full payment',
          'System'
        );
      }

      return payment;
    } catch (error) {
      console.error('Error adding payment record:', error);
      throw error;
    }
  },

  // Update payment plan for an order
  async updatePaymentPlan(orderId: number, paymentPlan: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('client_orders')
        .update({
          payment_plan: paymentPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Add history record
      await this.addOrderHistory(
        orderId,
        'Update',
        `Payment plan updated: ${paymentPlan}`,
        'Admin'
      );
    } catch (error) {
      console.error(`Error updating payment plan for order ${orderId}:`, error);
      throw error;
    }
  },
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

  // Get a single client order with all items and payment history
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

      // Get payment records for this order
      const { data: payments, error: paymentsError } = await supabase
        .from('order_payments')
        .select('*')
        .eq('order_id', id)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Calculate paid amount and remaining amount
      const paidAmount = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const remainingAmount = order.amount - paidAmount;

      console.log(`Found ${items?.length || 0} items and ${payments?.length || 0} payments for order ${id}`);
      console.log(`Total amount: ${order.amount}, Paid: ${paidAmount}, Remaining: ${remainingAmount}`);

      return {
        ...order,
        items: items || [],
        payments: payments || [],
        paid_amount: paidAmount,
        remaining_amount: remainingAmount
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
  
  // Check if a client has active orders that would prevent new orders
  async hasActiveOrders(clientId: number): Promise<boolean> {
    try {
      console.log(`Directly checking database for active orders for client ${clientId}...`);
      
      // First, get all orders for this client for debugging
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('client_orders')
        .select('id, status')
        .eq('client_id', clientId);
      
      if (allOrdersError) throw allOrdersError;
      
      console.log(`All orders for client ${clientId}:`, allOrders);
      
      // Only check for Approved or Partially Paid orders
      const { data, error } = await supabase
        .from('client_orders')
        .select('id, status')
        .eq('client_id', clientId)
        .in('status', ['Approved', 'Partially Paid']);
      
      if (error) throw error;
      
      // If we found any active orders, the client cannot place new orders
      const hasRestrictions = (data && data.length > 0);
      console.log(`Client ${clientId} has active orders (Approved/Partially Paid): ${hasRestrictions}`);
      if (hasRestrictions) {
        console.log(`Active orders:`, data);
      }
      
      return hasRestrictions;
    } catch (error) {
      console.error(`Error checking active orders for client ${clientId}:`, error);
      throw error;
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