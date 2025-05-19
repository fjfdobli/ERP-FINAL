import { supabase } from '../supabaseClient';
import { OrderRequestItem } from './orderRequestsService';
import { inventoryService } from './inventoryService';
import { productProfileService } from './productProfileService';



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

      // Get the order with client info to calculate the new paid and remaining amounts
      const { data: order, error: orderError } = await supabase
        .from('client_orders')
        .select(`
          *,
          clients(id, name, "contactPerson", status)
        `)
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
      const paidAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const previousPaidAmount = paidAmount - orderPayment.amount; // Amount before this payment
      const remainingAmount = (order.amount || 0) - paidAmount;
      
      console.log(`Payment details: Previous paid: ${previousPaidAmount}, Current payment: ${orderPayment.amount}, Total paid: ${paidAmount}, Total: ${order.amount || 0}, Remaining: ${remainingAmount}`);

      // Calculate payment ratios for inventory adjustment
      const previousRatio = order.amount && order.amount > 0 ? previousPaidAmount / order.amount : 0;
      const currentRatio = order.amount && order.amount > 0 ? paidAmount / order.amount : 0;
      console.log(`Payment ratios: Previous: ${(previousRatio * 100).toFixed(1)}%, Current: ${(currentRatio * 100).toFixed(1)}%`);

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
      const finalMethod = orderPayment.payment_method ?? 'Unknown';

      await this.addOrderHistory(
        orderPayment.order_id,
        'Payment',
        `Payment of ₱${orderPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} via ${finalMethod}`,
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
      
      // Handle inventory adjustments for partial payments
      // Only do this if order status is already Approved or Partially Paid
      if (order.status === 'Approved' || order.status === 'Partially Paid') {
        console.log(`Processing inventory adjustments for order ${order.id} after payment`);
        
        // Get order items
        const { data: orderItems, error: itemsError } = await supabase
          .from('client_order_items')
          .select('*')
          .eq('order_id', order.id);

        if (itemsError) {
          console.error(`Error fetching order items for client order ${order.id}:`, itemsError);
        } else if (orderItems && orderItems.length > 0) {
          console.log(`Found ${orderItems.length} items to process for partial stock-out after payment`);
          
          // Process each item in the order
          for (const item of orderItems) {
            console.log(`Processing item: ${item.product_name} (ID: ${item.product_id}), Quantity: ${item.quantity}`);
            
            try {
              // Get the product profile
              const productProfile = await productProfileService.getProductById(item.product_id);
              
              if (!productProfile || !productProfile.materials || productProfile.materials.length === 0) {
                console.log(`No materials defined for product ${item.product_name}`);
                continue;
              }
              
              // Process each material
              for (const material of productProfile.materials) {
                const materialId = material.materialId;
                const materialName = material.materialName || 'Unknown Material';
                const requiredPerUnit = Number(material.quantityRequired) || 0;
                
                if (requiredPerUnit <= 0) continue;
                
                const totalQtyNeeded = requiredPerUnit * item.quantity;
                
                // Calculate what should be stocked out based on payment ratios
                const shouldHaveBeenStockedOut = Math.floor(totalQtyNeeded * (previousRatio || 0));
                const shouldBeStockedOut = Math.floor(totalQtyNeeded * (currentRatio || 0));
                const qtyToStockOut = Math.max(0, shouldBeStockedOut - shouldHaveBeenStockedOut);
                
                console.log(`Material ${materialName}: Total needed: ${totalQtyNeeded}, Previously stocked out: ${shouldHaveBeenStockedOut}, Should be stocked out now: ${shouldBeStockedOut}`);
                console.log(`Need to stock out additional ${qtyToStockOut} units`);
                
                if (qtyToStockOut <= 0) {
                  console.log(`No additional stock-out needed for ${materialName}`);
                  continue;
                }
                
                // Get current inventory
                const inventoryItem = await inventoryService.getInventoryItemById(materialId);
                if (!inventoryItem) {
                  console.error(`Inventory item not found for material ID ${materialId}`);
                  continue;
                }
                
                const currentQty = inventoryItem.quantity || 0;
                
                // Update inventory
                const newQty = Math.max(0, currentQty - qtyToStockOut);
                await inventoryService.updateInventoryItem(materialId, {
                  quantity: newQty
                });
                
                // Record transaction
                const systemUserId = 1;
                const clientName = order.clients?.name || 'Unknown Client';
                const paymentPercentage = `${((currentRatio || 0) * 100).toFixed(1)}%`;
                
                await inventoryService.addTransaction({
                  inventoryId: materialId,
                  transactionType: 'stock_out',
                  quantity: qtyToStockOut,
                  createdBy: systemUserId,
                  isSupplier: false,
                  type: 'partial_payment',
                  reason: `Additional stock-out after payment (${paymentPercentage} paid total) by ${clientName}`,
                  notes: `Additional stock-out for payment on order ${order.order_id} — Client: ${clientName}, Product: ${item.product_name}`,
                  transactionDate: new Date().toISOString()
                });
                
                console.log(`Successfully stocked out ${qtyToStockOut} additional units of ${materialName}`);
              }
            } catch (error) {
              console.error(`Error processing partial stock-out for ${item.product_name}:`, error);
            }
          }
        }
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
      const currentOrder = await this.getClientOrderById(id);
      console.log(`Changing order ${id} status to ${status}`);
      console.log(`Current order has ${currentOrder.items?.length || 0} items`);

      // Perform stock-out only on approval
      if (status === 'Approved') {
        console.log(`Performing stock-out for approved order ${id}`);
        
        // Get order items from the database to ensure we have the most up-to-date information
        const { data: orderItems, error: itemsError } = await supabase
          .from('client_order_items')
          .select('*')
          .eq('order_id', id);

        if (itemsError) {
          console.error(`Error fetching order items for client order ${id}:`, itemsError);
          throw itemsError;
        }
        
        console.log(`Found ${orderItems?.length || 0} items to process for stock-out`);

        // Process each item in the order
        for (const item of orderItems || []) {
          console.log(`Processing item: ${item.product_name} (ID: ${item.product_id}), Quantity: ${item.quantity}`);
          
          try {
            // Get the product profile to find required materials
            const productProfile = await productProfileService.getProductById(item.product_id);
            
            if (!productProfile) {
              console.error(`Product profile not found for product ID ${item.product_id}`);
              continue;
            }
            
            console.log(`Product profile details:`, JSON.stringify(productProfile, null, 2));
            
            if (!productProfile.materials || productProfile.materials.length === 0) {
              console.log(`No materials defined for product ${item.product_name} (ID: ${item.product_id})`);
              continue;
            }
            
            console.log(`Product ${item.product_name} requires ${productProfile.materials.length} materials:`, 
                        JSON.stringify(productProfile.materials.map(m => ({
                          id: m.materialId,
                          name: m.materialName,
                          qty: m.quantityRequired
                        })), null, 2));

            // Process each required material for the product
            for (const material of productProfile.materials) {
              const materialId = material.materialId;
              const materialName = material.materialName || 'Unknown Material';
              const requiredPerUnit = Number(material.quantityRequired) || 0;
              
              if (requiredPerUnit <= 0) {
                console.warn(`Required quantity for material ${materialName} is zero or invalid. Skipping.`);
                continue;
              }
              
              // Calculate total quantity needed
              const totalDeductQty = requiredPerUnit * item.quantity;
              
              console.log(`Material: ${materialName} (ID: ${materialId}), Required: ${requiredPerUnit} per unit × ${item.quantity} ordered = ${totalDeductQty} total needed`);
              
              // Calculate payment ratio for partial stock-out
              // For orders that have already received payments
              let deductQty = totalDeductQty;
              
              // Check if we need to apply partial payment logic
              if (currentOrder.paid_amount !== undefined && currentOrder.paid_amount > 0 && currentOrder.amount > 0) {
                const paymentRatio = currentOrder.paid_amount / currentOrder.amount;
                console.log(`Order has payment ratio: ${paymentRatio.toFixed(4)} (${currentOrder.paid_amount} / ${currentOrder.amount})`);
                
                // Check if this is a subsequent partial payment (already has some stock-out)
                const { data: existingTransactions, error: txError } = await supabase
                  .from('inventory_transactions')
                  .select('quantity')
                  .eq('inventoryId', materialId)
                  .eq('transactionType', 'stock_out')
                  .like('notes', `%${currentOrder.order_id}%`);
                  
                if (txError) {
                  console.error(`Error checking existing transactions for material ${materialId}:`, txError);
                } else {
                  // Calculate what has already been stocked out
                  const alreadyDeducted = existingTransactions?.reduce((sum, tx) => sum + tx.quantity, 0) || 0;
                  console.log(`Already deducted ${alreadyDeducted} units of ${materialName} for this order`);
                  
                  // Calculate what should be deducted in total based on payment ratio
                  const shouldBeDeducted = Math.floor(totalDeductQty * paymentRatio);
                  console.log(`Should have deducted ${shouldBeDeducted} units based on payment ratio ${paymentRatio}`);
                  
                  // Calculate what needs to be deducted now
                  deductQty = Math.max(0, shouldBeDeducted - alreadyDeducted);
                  console.log(`Need to deduct ${deductQty} more units in this transaction`);
                }
              } else {
                console.log(`No partial payments - deducting full quantity: ${deductQty}`);
              }
              
              // Skip if nothing to deduct (already deducted for previous payments)
              if (deductQty <= 0) {
                console.log(`Nothing to deduct for ${materialName} - already deducted for previous payments`);
                continue;
              }

              // Get current inventory level for this material
              const inventoryItem = await inventoryService.getInventoryItemById(materialId);
              
              if (!inventoryItem) {
                console.error(`Inventory item not found for material ID ${materialId}`);
                continue;
              }
              
              const currentQty = inventoryItem.quantity || 0;
              console.log(`Current inventory for ${materialName}: ${currentQty} units`);
              
              if (currentQty < deductQty) {
                console.warn(`WARNING: Insufficient inventory for ${materialName}. Needed: ${deductQty}, Available: ${currentQty}`);
                // Continue with stock-out even if insufficient - this is a business decision
                // Alternatively, we could throw an error here to prevent approval with insufficient inventory
              }

              // Update inventory level
              const newQty = Math.max(0, currentQty - deductQty); // Prevent negative inventory
              console.log(`Updating inventory for ${materialName} (ID: ${materialId}) from ${currentQty} to ${newQty}`);
              
              try {
                const result = await inventoryService.updateInventoryItem(materialId, {
                  quantity: newQty
                });
                console.log(`Inventory update result:`, result);
              } catch (invError) {
                console.error(`Error updating inventory for ${materialName}:`, invError);
                continue;
              }

              // Record the transaction
              const clientName = currentOrder.clients?.name || 'Unknown Client';
              try {
                // Use a system/administrator ID instead of client_id for automated transactions
                // This could be a special user ID reserved for the system (e.g., ID 1 for "System")
                // or you could use the ID of the person who approved the order (if available)
                const systemUserId = 1; // Assuming ID 1 is reserved for "System" or "Admin"
                
                // Determine if this is a partial stock-out
                const isPartial = currentOrder.paid_amount !== undefined && 
                                 currentOrder.amount > 0 && 
                                 currentOrder.paid_amount < currentOrder.amount;
                
                const paymentInfo = isPartial 
                  ? ` (Partial: ${(((currentOrder.paid_amount || 0) / currentOrder.amount) * 100).toFixed(1)}% paid)`
                  : '';
                
                await inventoryService.addTransaction({
                  inventoryId: materialId,
                  transactionType: 'stock_out',
                  quantity: deductQty,
                  createdBy: systemUserId, // Use system ID instead of client_id
                  isSupplier: false,
                  type: isPartial ? 'partial_client_order' : 'client_order',
                  reason: `Auto stock-out for client order ${currentOrder.order_id} - ${item.product_name}${paymentInfo}`,
                  notes: `Automated stock-out for order ${currentOrder.order_id}${paymentInfo} — Client: ${clientName}, Product: ${item.product_name}${changedBy ? `, Approved by: ${changedBy}` : ''}`,
                  transactionDate: new Date().toISOString()
                });
                console.log(`Recorded stock-out transaction for ${materialName}: ${deductQty} units`);
              } catch (txError) {
                console.error(`Error recording transaction for ${materialName}:`, txError);
              }
            }
          } catch (error) {
            console.error(`Error processing product ${item.product_name} for stock-out:`, error);
          }
        }
        
        console.log(`Completed stock-out processing for order ${id}`);
      }

      // Restore inventory for Pending or Rejected
      if (status === 'Pending' || status === 'Rejected') {
        console.log(`Restoring inventory for order ${id} changing to ${status}`);
        
        const { data: orderItems, error: itemsError } = await supabase
          .from('client_order_items')
          .select('*')
          .eq('order_id', id);

        if (itemsError) {
          console.error(`Error fetching order items for client order ${id}:`, itemsError);
          throw itemsError;
        }
        
        console.log(`Found ${orderItems?.length || 0} items to process for inventory restoration`);

        for (const item of orderItems || []) {
          console.log(`Processing item for restoration: ${item.product_name} (ID: ${item.product_id}), Quantity: ${item.quantity}`);
          
          const productProfile = await productProfileService.getProductById(item.product_id);
          
          if (!productProfile || !productProfile.materials) {
            console.log(`No materials defined for product ${item.product_name} (ID: ${item.product_id})`);
            continue;
          }

          for (const material of productProfile.materials) {
            const materialId = material.materialId;
            const materialName = material.materialName || 'Unknown Material';
            const returnQty = material.quantityRequired * item.quantity;
            
            console.log(`Material for restoration: ${materialName} (ID: ${materialId}), Returning: ${returnQty} units`);

            const inventoryItem = await inventoryService.getInventoryItemById(materialId);
            
            if (!inventoryItem) {
              console.error(`Inventory item not found for material ID ${materialId}`);
              continue;
            }
            
            const currentQty = inventoryItem.quantity || 0;
            const newQty = currentQty + returnQty;
            
            // Update inventory level
            await inventoryService.updateInventoryItem(materialId, {
              quantity: newQty
            });
            
            console.log(`Updated inventory for ${materialName} from ${currentQty} to ${newQty}`);

            // Record the transaction
            const clientName = currentOrder.clients?.name || 'Unknown Client';
            const reason = status === 'Pending' 
              ? `Stock restored due to client order reverting to Pending — Client: ${clientName}`
              : `Stock restored due to client order being rejected — Client: ${clientName}`;
            
            // Use a system/administrator ID for automated transactions
            const systemUserId = 1; // Assuming ID 1 is reserved for "System" or "Admin"
              
            await inventoryService.addTransaction({
              inventoryId: materialId,
              transactionType: 'stock_in',
              quantity: returnQty,
              createdBy: systemUserId, // Use system ID instead of client_id
              isSupplier: false,
              type: 'revert',
              reason: reason,
              notes: `Automated stock return for ${status.toLowerCase()} client order ${currentOrder.order_id}, Product: ${item.product_name}${changedBy ? `, Changed by: ${changedBy}` : ''}`,
              transactionDate: new Date().toISOString()
            });
            
            console.log(`Recorded stock-in revert transaction for ${materialName}: ${returnQty} units`);
          }
        }

        // Restore request if reverting to Pending
        if (status === 'Pending' && currentOrder.request_id) {
          console.log(`Restoring order request for order ${id} with request_id ${currentOrder.request_id}`);
          
          const { data: existingRequest, error: requestError } = await supabase
            .from('order_requests')
            .select('*')
            .eq('id', currentOrder.request_id)
            .single();

          if (requestError && requestError.code !== 'PGRST116') throw requestError;

          if (existingRequest) {
            console.log(`Found existing request ${currentOrder.request_id}, updating it`);
            
            await supabase
              .from('order_requests')
              .update({
                status: 'Pending',
                updated_at: new Date().toISOString()
              })
              .eq('id', currentOrder.request_id);

            await supabase
              .from('order_request_items')
              .delete()
              .eq('request_id', currentOrder.request_id);

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

              await supabase.from('order_request_items').insert(orderRequestItems);

              const totalAmount = orderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
              await supabase
                .from('order_requests')
                .update({ total_amount: totalAmount })
                .eq('id', currentOrder.request_id);
                
              console.log(`Restored ${orderRequestItems.length} items to request ${currentOrder.request_id}`);
            }
          } else {
            console.log(`Request ${currentOrder.request_id} not found, creating a new request`);
            
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
            
            console.log(`Created new request with ID ${newRequest.id}`);

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

              await supabase.from('order_request_items').insert(orderRequestItems);
              console.log(`Added ${orderRequestItems.length} items to new request ${newRequest.id}`);
            }

            await supabase
              .from('client_orders')
              .update({ request_id: newRequest.id })
              .eq('id', id);
              
            console.log(`Updated client order ${id} with new request_id ${newRequest.id}`);
          }
        }
      }

      // Final status update
      console.log(`Updating client order ${id} status to ${status}`);
      
      const { error: updateError } = await supabase
        .from('client_orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await this.addOrderHistory(id, status, `Status changed to ${status}`, changedBy || 'Admin');
      console.log(`Successfully updated client order ${id} status to ${status}`);

      return this.getClientOrderById(id);
    } catch (error) {
      console.error(`Error changing client order status for ID ${id}:`, error);
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