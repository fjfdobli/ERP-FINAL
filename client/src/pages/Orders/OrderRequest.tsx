import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, Chip, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, CircularProgress, Snackbar, Alert, Grid, IconButton, SelectChangeEvent } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Edit as EditIcon } from '@mui/icons-material';
import { Client, clientsService } from '../../services/clientsService';
import { OrderRequestItem as BaseOrderRequestItem, ExtendedOrderRequest } from '../../services/orderRequestsService';
import { orderRequestsService } from '../../services/orderRequestsService';
import { clientOrdersService } from '../../services/clientOrdersService';
import { productProfileService } from '../../services/productProfileService';
import { inventoryService } from '../../services/inventoryService';
import {
  fetchOrderRequests, createOrderRequest, updateOrderRequest, changeOrderRequestStatus,
  selectOrderRequests, selectOrderRequestLoading, selectOrderRequestError
} from '../../redux/slices/orderRequestSlice';
import { selectAllClientOrders, fetchClientOrders } from '../../redux/slices/clientOrdersSlice';
import { AppDispatch, RootState, store } from '../../redux/store';
import {
  fetchProducts,
  selectAllProducts
} from '../../redux/slices/productProfileSlice';
import {
  fetchInventory,
  updateInventoryItem,
  selectAllInventoryItems
} from '../../redux/slices/inventorySlice';
import {
  ExtendedProduct,
  ProductMaterial,
} from '../../services/productProfileService';
import { InventoryItem } from '../../services/inventoryService';



// Extended version of OrderRequestItem to include the actual product ID
interface OrderRequestItem extends BaseOrderRequestItem {
  product_actual_id?: number;
}

interface OrderRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: any) => void;
  clients: Client[];
  products: ExtendedProduct[];
  rawMaterials: InventoryItem[];
  initialData?: ExtendedOrderRequest | null;
  isEdit?: boolean;
  clientsWithOrders: Set<number>;
  clientEligibility: { [key: number]: boolean };
  getClientOrderStatus: (clientId: number) => { hasOngoingOrders: boolean, statusText: string };
  onInventoryUpdate: (updates: Array<{ id: number, newQuantity: number }>) => Promise<void>;
}

const getClientEligibilityMap = (
  clients: Client[],
  orderRequests: ExtendedOrderRequest[],
  clientOrders: any[]
): { [key: number]: boolean } => {
  const map: { [key: number]: boolean } = {};

  clients
    .filter(client => client.status === 'Active')
    .forEach(client => {
      const hasPendingRequest = orderRequests.some(
        req => req.client_id === client.id && req.status === 'Pending'
      );


      const hasActiveOrder = clientOrders.some(
        order => order.client_id === client.id &&
          ['Approved', 'Partially Paid'].includes(order.status)
      );

      map[client.id] = !hasPendingRequest && !hasActiveOrder;
    });

  return map;
};

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  let color: 'success' | 'info' | 'warning' | 'error' = 'info';

  switch (status.toLowerCase()) {
    case 'approved':
      color = 'success';
      break;
    case 'new':
      color = 'info';
      break;
    case 'pending':
      color = 'warning';
      break;
    case 'rejected':
      color = 'error';
      break;
    default:
      color = 'info';
  }

  return (
    <Chip
      label={status}
      color={color}
      size="small"
    />
  );
};

type InventoryAdjustment = {
  id: number;
  delta: number; //Positive for restores, negative for deductions if reused
};

const OrderRequestForm: React.FC<OrderRequestFormProps> = ({
  open,
  onClose,
  onSubmit,
  clients,
  products,
  rawMaterials,
  initialData = null,
  isEdit = false,
  clientsWithOrders,
  clientEligibility,
  getClientOrderStatus,
  onInventoryUpdate
}) => {
  const [clientId, setClientId] = useState<number>(initialData?.client_id || 0);
  const [items, setItems] = useState<OrderRequestItem[]>(initialData?.items || []);
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<OrderRequestItem | null>(null);
  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [showCustomProductInput, setShowCustomProductInput] = useState<boolean>(false);
  const inventoryRestoresRef = useRef<InventoryAdjustment[]>([]);
  const initialInventorySnapshot = useRef<{ [id: number]: number }>({});
  const [customProduct, setCustomProduct] = useState<{ name: string; price: number }>({
    name: '',
    price: 0
  });

  const filteredClients = useMemo(() => {
    const selectedClient = clients.find(c => c.id === clientId);
    const eligibleClients = clients.filter(client => {
      if (client.status !== 'Active') return false;
      return clientEligibility[client.id] !== false;
    });

    // Ensure selected client appears even if no longer eligible
    if (selectedClient && !eligibleClients.some(c => c.id === selectedClient.id)) {
      return [...eligibleClients, selectedClient];
    }

    return eligibleClients;
  }, [clients, clientEligibility, clientId]);



  const usedProductIds = useMemo(() => {
    return items.map(item => item.product_actual_id).filter(id => id !== undefined);
  }, [items]);

  useEffect(() => {
    if (!clients.length || Object.keys(clientEligibility).length === 0) return;

    if (open && initialData) {
      console.log('[OrderRequestForm] Reloading form with initialData:', initialData);
      setClientId(initialData.client_id || 0);
      const resolvedItems = (initialData.items || []).map(item => {
        const typedItem = item as Partial<OrderRequestItem>;
        const matchedProduct = products.find(p => p.name === item.product_name);

        //Resolve product ID
        const productId = matchedProduct?.id || typedItem.product_actual_id;

        //Track original inventory snapshot
        if (productId) {
          const product = products.find(p => p.id === productId);
          if (product) {
            product.materials.forEach(material => {
              const currentRM = rawMaterials.find(r => r.id === material.materialId);
              const usedQty = material.quantityRequired * item.quantity;

              if (currentRM && !(material.materialId in initialInventorySnapshot.current)) {
                // Take actual inventory before any deduction
                initialInventorySnapshot.current[material.materialId] = currentRM.quantity + usedQty;
              }
            });
          }
        }

        return {
          ...item,
          product_actual_id: productId
        };
      });
      setItems(resolvedItems);
      setNotes(initialData.notes || '');
    } else if (open && !initialData) {
      const firstEligible = clients.find(c => clientEligibility[c.id]);
      if (firstEligible) {
        setClientId(firstEligible.id);
      } else {
        console.warn('[OrderForm] No eligible clients available');
        setClientId(-1);
      }
      setItems([]);
      setNotes('');
    }
  }, [open, initialData, clients, clientEligibility]);



  const handleClientChange = (event: SelectChangeEvent<number>) => {
    setClientId(event.target.value as number);
  };

  const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNotes(event.target.value);
  };

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleAddItem = () => {
    setCurrentItem({
      product_id: 0,
      product_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      serial_start: '',
      serial_end: '',
      product_actual_id: undefined
    });
    setItemIndex(null);
    setItemDialogOpen(true);
    setShowCustomProductInput(false);
    setCustomProduct({ name: '', price: 0 });
  };

  const handleEditItem = (item: OrderRequestItem, index: number) => {
    const matchedProduct = products.find(p => p.name === item.product_name);
    const actualId = matchedProduct?.id || item.product_actual_id;

    setCurrentItem({
      ...item,
      product_actual_id: actualId,
    });

    setItemIndex(index);
    setItemDialogOpen(true);
    setShowCustomProductInput(false);
    setCustomProduct({ name: '', price: 0 });

    //Always trigger quantity check after state is set
    setTimeout(() => {
      const quantityEvent = {
        target: { value: item.quantity.toString() }
      } as React.ChangeEvent<HTMLInputElement>;

      // Wait until state is committed before validation
      requestAnimationFrame(() => {
        handleQuantityChange(quantityEvent);
      });
    }, 0);
  };



  const handleDeleteItem = async (index: number) => {
    const itemToDelete = items[index];
    if (!itemToDelete) return;

    if (itemToDelete.product_actual_id) {
      const product = products.find(p => p.id === itemToDelete.product_actual_id);
      if (product) {
        const { materialRequirements } = checkInventoryForProduct(product, itemToDelete.quantity);

        for (const req of materialRequirements) {
          const liveItem = await inventoryService.getInventoryItemById(req.materialId);
          if (liveItem) {
            const restoredQty = liveItem.quantity + req.quantityNeeded;
            await onInventoryUpdate([{ id: req.materialId, newQuantity: restoredQty }]);
            console.log(`[🟢 RESTORED] ${req.quantityNeeded} to Material ${req.materialId} → Total: ${restoredQty}`);
          }
        }
      }
    }

    const newItems = [...items];
    newItems.splice(index, 1);

    if (newItems.length === 0) {
      alert("You must have at least one product in the request items.");
      return;
    }

    setItems(newItems);
  };


  const handleCloseItemDialog = () => {
    setItemDialogOpen(false);
    setCurrentItem(null);
    setItemIndex(null);
    setShowCustomProductInput(false);
    setCustomProduct({ name: '', price: 0 });
  };

  const handleSaveItem = async () => {
    if (!currentItem) return;

    const quantity = Number(currentItem.quantity || 0);
    const product = products.find(p => p.id === currentItem.product_actual_id);
    if (!product) return;

    // 🧠 Track inventory snapshot if item is NEW (not being edited)
    if (itemIndex === null && currentItem && product) {
      for (const material of product.materials) {
        if (!(material.materialId in initialInventorySnapshot.current)) {
          try {
            const liveItem = await inventoryService.getInventoryItemById(material.materialId);
            if (liveItem) {
              const usedQty = material.quantityRequired * Number(currentItem.quantity || 0);
              initialInventorySnapshot.current[material.materialId] = liveItem.quantity + usedQty;
            }
          } catch (error) {
            console.warn(`Failed to snapshot inventory for material ${material.materialId}`, error);
          }
        }
      }
    }

    // Restore inventory from original quantity if editing
    const previousQuantity = (itemIndex !== null && items[itemIndex])
      ? items[itemIndex].quantity
      : 0;

    const virtualInventory = rawMaterials.map(rm => {
      const matchedMaterial = product.materials.find(m => m.materialId === rm.id);
      if (matchedMaterial) {
        return {
          ...rm,
          quantity: rm.quantity + matchedMaterial.quantityRequired * previousQuantity
        };
      }
      return rm;
    });

    // Undo any previously tracked restore for this product
    product.materials.forEach(material => {
      const deltaToRemove = material.quantityRequired * previousQuantity;

      const existing = inventoryRestoresRef.current.find(r => r.id === material.materialId);
      if (existing) {
        existing.delta -= deltaToRemove;

        if (existing.delta <= 0) {
          inventoryRestoresRef.current = inventoryRestoresRef.current.filter(
            r => r.id !== material.materialId
          );
        }
      }
    });

    const { hasEnoughInventory, lowStockItems, outOfStockItems } =
      checkInventoryForProduct(product, quantity, virtualInventory);

    if (!hasEnoughInventory) {
      alert(`Not enough inventory for ${product.name}:\n${outOfStockItems.join('\n')}`);
      return;
    }

    if (lowStockItems.length > 0) {
      alert(`Warning: Stock will fall low for ${product.name}:\n${lowStockItems.join('\n')}`);
    }

    const newItem = {
      ...currentItem,
      quantity,
      total_price: product.price * quantity
    };

    const updatedItems = [...items];
    if (itemIndex !== null) {
      updatedItems[itemIndex] = newItem;
    } else {
      updatedItems.push(newItem);
    }

    setItems(updatedItems);
    handleCloseItemDialog();
  };

  // Check if we have enough inventory for a product
  const checkInventoryForProduct = (
    product: ExtendedProduct,
    quantity: number,
    materialsOverride?: InventoryItem[]
  ): {
    hasEnoughInventory: boolean,
    lowStockItems: string[],
    outOfStockItems: string[],
    materialRequirements: Array<{ materialId: number, quantityNeeded: number, available: number }>
  } => {
    const lowStockItems: string[] = [];
    const outOfStockItems: string[] = [];
    const materialRequirements: Array<{
      materialId: number,
      quantityNeeded: number,
      available: number
    }> = [];

    const inventory = materialsOverride || rawMaterials;

    for (const material of product.materials) {
      const inventoryItem = inventory.find(item => item.id === material.materialId);
      if (!inventoryItem) {
        outOfStockItems.push(`${material.materialName} (not found in inventory)`);
        continue;
      }

      const quantityNeeded = material.quantityRequired * quantity;
      const available = inventoryItem.quantity;

      materialRequirements.push({
        materialId: material.materialId,
        quantityNeeded,
        available
      });

      if (available < quantityNeeded) {
        outOfStockItems.push(`${material.materialName} (need ${quantityNeeded}, have ${available})`);
      } else if (available <= inventoryItem.minStockLevel + quantityNeeded) {
        lowStockItems.push(`${material.materialName} (low stock: ${available})`);
      }
    }

    return {
      hasEnoughInventory: outOfStockItems.length === 0,
      lowStockItems,
      outOfStockItems,
      materialRequirements
    };
  };


  const handleProductChange = (event: SelectChangeEvent<number | string>) => {
    const value = event.target.value;

    if (value === 'custom') {
      setShowCustomProductInput(true);
      return;
    }

    setShowCustomProductInput(false);

    const productId = value as number;
    const product = products.find(p => p.id === productId);

    if (!currentItem || !product) return;

    const unitPrice = product.price;
    const totalPrice = unitPrice * (currentItem.quantity || 1);

    // Check inventory
    const { hasEnoughInventory, lowStockItems, outOfStockItems } =
      checkInventoryForProduct(product, currentItem.quantity || 1);

    if (!hasEnoughInventory) {
      alert(`Insufficient inventory for ${product.name}:\n${outOfStockItems.join('\n')}`);
      return;
    }

    if (lowStockItems.length > 0) {
      alert(`Warning: Low stock for ${product.name}:\n${lowStockItems.join('\n')}`);
    }

    setCurrentItem({
      ...currentItem,
      product_id: productId,
      product_name: product.name,
      unit_price: unitPrice,
      total_price: totalPrice,
      // Store the product's ID for later reference
      product_actual_id: product.id
    });
  };

  const handleAddCustomProduct = () => {
    if (!currentItem || !customProduct.name || customProduct.price <= 0) return;
    const tempId = -Math.floor(Math.random() * 1000) - 1;
    const totalPrice = customProduct.price * (currentItem.quantity || 1);

    setCurrentItem({
      ...currentItem,
      product_id: tempId,
      product_name: customProduct.name,
      unit_price: customProduct.price,
      total_price: totalPrice,
      // Set to undefined since it's a custom product
      product_actual_id: undefined
    });

    setShowCustomProductInput(false);
    setCustomProduct({ name: '', price: 0 });
  };

  const handleQuantityChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentItem) return;

    const quantity = parseInt(event.target.value) || 0;
    const totalPrice = currentItem.unit_price * quantity;

    setCurrentItem(prev => ({
      ...prev!,
      quantity,
      total_price: totalPrice
    }));

    if (currentItem.product_actual_id) {
      const product = products.find(p => p.id === currentItem.product_actual_id);
      if (product) {
        try {
          const productProfile = await productProfileService.getProductById(product.id);
          if (productProfile && productProfile.materials) {
            const lowStockWarnings: string[] = [];
            const outOfStockErrors: string[] = [];

            for (const material of productProfile.materials) {
              const perUnitQty = material.quantityRequired;

              //Optional safeguard (debugging aid)
              if (perUnitQty > 1000) {
                console.warn(`[MATERIAL WARNING] Possible misconfigured material quantity for "${material.materialName}". Required per unit: ${perUnitQty}`);
              }

              const requiredQty = perUnitQty * quantity;

              const rawMaterial = (() => {
                const base = rawMaterials.find(i => i.id === material.materialId);
                if (!base) return null;

                const existingItem = items.find(i => i.product_actual_id === currentItem.product_actual_id);
                const previousQty = existingItem ? existingItem.quantity : 0;

                const restoredQty = base.quantity + (material.quantityRequired * previousQty);
                return { ...base, quantity: restoredQty };
              })();

              if (!rawMaterial) {
                outOfStockErrors.push(`${material.materialName} (not found in inventory)`);
                continue;
              }

              const remainingStock = rawMaterial.quantity;
              if (requiredQty > remainingStock) {
                outOfStockErrors.push(`${material.materialName} (need ${requiredQty}, have ${remainingStock})`);
              } else if (remainingStock - requiredQty <= rawMaterial.minStockLevel) {
                lowStockWarnings.push(`${material.materialName} (low stock: ${remainingStock})`);
              }
            }

            if (outOfStockErrors.length > 0) {
              alert(`Cannot set quantity to ${quantity}. Insufficient inventory:\n${outOfStockErrors.join('\n')}`);
              return; // ❌ Stop here, do not update currentItem
            }

            if (lowStockWarnings.length > 0) {
              alert(`Warning: This quantity will result in low stock:\n${lowStockWarnings.join('\n')}`);
            }

            //Update state ONLY if no inventory problems
            setCurrentItem(prev => ({
              ...prev!,
              quantity,
              total_price: totalPrice
            }));
          }
        } catch (error) {
          console.error("Failed to validate raw materials", error);
        }
      }
    } else {
      // Custom product or no product — update freely
      setCurrentItem({
        ...currentItem,
        quantity,
        total_price: totalPrice
      });
    }
  };

  const handleSerialChange = (field: 'serial_start' | 'serial_end', value: string) => {
    if (!currentItem) return;

    setCurrentItem({
      ...currentItem,
      [field]: value
    });
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      alert('You must have at least one item in the order request.');
      return;
    }

    const requestData = {
      ...(initialData || {}),
      client_id: clientId,
      items: items.map(({ id, ...rest }) => rest),
      notes,
      total_amount: calculateTotal(),
      type: items.length > 0 ? items[0].product_name : 'Other',
      status: initialData?.status || 'Pending',
      date: initialData?.date || new Date().toISOString().split('T')[0]
    };

    const inventoryDeductions: Array<{ id: number, newQuantity: number }> = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.product_actual_id);
      if (!product) continue;
    
      const check = checkInventoryForProduct(product, item.quantity);
      if (!check.hasEnoughInventory) {
        alert(`Cannot submit: Not enough inventory for ${item.product_name}:\n${check.outOfStockItems.join('\n')}`);
        return;
      }
    
      for (const req of check.materialRequirements) {
        const alreadyRestored = inventoryRestoresRef.current.some(r => r.id === req.materialId);
        if (alreadyRestored) continue; // skip deduction if already restored on delete
    
        inventoryDeductions.push({
          id: req.materialId,
          newQuantity: req.available - req.quantityNeeded
        });
      }
    }

    const currentInventory = store.getState().inventory.inventoryItems;

    const finalInventoryUpdates: Array<{ id: number, newQuantity: number }> = [...inventoryDeductions];

    //Merge restores from deleted items
    inventoryRestoresRef.current.forEach(r => {
      const index = finalInventoryUpdates.findIndex(u => u.id === r.id);
      if (index !== -1) {
        // Replace with correct restored quantity from snapshot if available
        const fromSnapshot = initialInventorySnapshot.current[r.id];
        if (typeof fromSnapshot === 'number') {
          finalInventoryUpdates[index].newQuantity = fromSnapshot;
        } else {
          // fallback if snapshot is not available
          finalInventoryUpdates[index].newQuantity += r.delta;
        }
      } else {
        // Handle new material IDs that aren't in the deduction list
        const fromSnapshot = initialInventorySnapshot.current[r.id];
        if (typeof fromSnapshot === 'number') {
          finalInventoryUpdates.push({
            id: r.id,
            newQuantity: fromSnapshot
          });
        } else {
          const current = currentInventory.find(i => i.id === r.id);
          if (current) {
            finalInventoryUpdates.push({
              id: r.id,
              newQuantity: current.quantity + r.delta
            });
          }
        }
      }
    });

    console.log('[✔] FINAL INVENTORY UPDATES:', finalInventoryUpdates);
    console.log('[🧪 RESTORE DELTAS]', inventoryRestoresRef.current);

    try {
      await onInventoryUpdate(finalInventoryUpdates); //Persist inventory changes
      inventoryRestoresRef.current = []; //Reset restore tracker after successful write
    } catch (error) {
      alert('Inventory update failed. Please try again.');
      console.error('Inventory update error:', error);
      return;
    }

    onSubmit({ ...requestData, finalInventoryUpdates });
    onClose();
  };

  const isClientInactive = (clientId: number): boolean => {
    const client = clients.find(c => c.id === clientId);
    return client?.status === 'Inactive';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Order Request' : 'Create New Order Request'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3, mt: 1 }}>
          <FormControl fullWidth required>
            <InputLabel id="client-label">Client</InputLabel>
            <Select
              labelId="client-label"
              value={clientId && clientId > 0 ? clientId : ''}
              onChange={handleClientChange}
              label="Client"
              disabled={isEdit}
            >
              {filteredClients.map((client) => {
                const canPlaceOrders = clientEligibility[client.id] !== false;
                const clientStatus = getClientOrderStatus(client.id);
                const hasOngoingOrders = !canPlaceOrders;

                return (
                  <MenuItem
                    key={client.id}
                    value={client.id}
                    disabled={!isEdit && hasOngoingOrders}
                    sx={{
                      opacity: !isEdit && hasOngoingOrders ? 0.5 : 1,
                      '&.Mui-disabled': {
                        opacity: 0.5,
                      }
                    }}
                  >
                    {client.name}
                    {client.status === 'Inactive' && ' (Inactive)'}
                    {hasOngoingOrders && ` (${clientStatus.statusText})`}
                    {!hasOngoingOrders && ' (Can place orders)'}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

        </Box>

        <Typography variant="h6" sx={{ mb: 2 }}>Request Items</Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Product</strong></TableCell>
                <TableCell align='center'><strong>Serial</strong></TableCell>
                <TableCell align='center'><strong>Unit Price</strong></TableCell>
                <TableCell align='center'><strong>Quantity</strong></TableCell>
                <TableCell align='center'><strong>Total</strong></TableCell>
                <TableCell align='center'><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No items added
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell align='center'>
                      {item.serial_start && item.serial_end
                        ? `${item.serial_start} - ${item.serial_end}`
                        : 'start - end'}
                    </TableCell>
                    <TableCell align='center'>₱{item.unit_price.toLocaleString()}</TableCell>
                    <TableCell align='center'>{item.quantity}</TableCell>
                    <TableCell align='center'>₱{item.total_price.toLocaleString()}</TableCell>
                    <TableCell align='center'>
                      <IconButton
                        size="small"
                        onClick={() => handleEditItem(item, index)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteItem(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>

                  </TableRow>
                ))
              )}
              <TableRow>
                <TableCell colSpan={4} align="right">
                  <Typography variant="subtitle1"><strong>Total:</strong></Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle1"><strong>₱{calculateTotal().toLocaleString()}</strong></Typography>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddItem}
          >
            ADD ITEM
          </Button>
        </Box>

        <TextField
          label="Notes"
          multiline
          rows={4}
          fullWidth
          value={notes}
          onChange={handleNotesChange}
          variant="outlined"
        />
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="primary">
          CANCEL
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={clientId === 0 || items.length === 0 || isClientInactive(clientId)}
        >
          {isEdit ? 'SAVE CHANGES' : 'CREATE'}
        </Button>
      </DialogActions>

      <Dialog open={itemDialogOpen} onClose={handleCloseItemDialog} maxWidth="md">
        <DialogTitle>
          {itemIndex !== null ? 'Edit Item' : 'Add Item'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Product</InputLabel>
                <Select
                  value={currentItem?.product_id || ''}
                  onChange={handleProductChange}
                  label="Product"
                  disabled={itemIndex !== null} //Lock dropdown in edit mode
                >
                  {products.map(product => {
                    const isSelected = items.some(item =>
                      item.product_actual_id === product.id || item.product_id === product.id
                    );

                    const isBeingEdited = currentItem?.product_id === product.id;

                    return (
                      <MenuItem
                        key={product.id}
                        value={product.id}
                        disabled={isSelected && !isBeingEdited}
                      >
                        {`${product.name} - ₱${product.price.toLocaleString()}`}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>

            {showCustomProductInput && (
              <>
                <Grid item xs={12}>
                  <TextField
                    label="Custom Product Name"
                    fullWidth
                    required
                    value={customProduct.name}
                    onChange={(e) => setCustomProduct({ ...customProduct, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Price"
                    type="number"
                    fullWidth
                    required
                    value={customProduct.price}
                    onChange={(e) => setCustomProduct({ ...customProduct, price: Number(e.target.value) })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={!customProduct.name || customProduct.price <= 0}
                    onClick={handleAddCustomProduct}
                  >
                    Add This Product
                  </Button>
                </Grid>
              </>
            )}

            {!showCustomProductInput && (
              <>
                <Grid item xs={12}>
                  <TextField
                    label="Quantity"
                    type="number"
                    fullWidth
                    required
                    value={currentItem?.quantity || ''}
                    onChange={handleQuantityChange}
                    InputProps={{
                      inputProps: { min: 1 }
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Unit Price"
                    fullWidth
                    disabled
                    value={currentItem?.unit_price ? `₱${currentItem.unit_price.toLocaleString()}` : '₱0'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Total Price"
                    fullWidth
                    disabled
                    value={currentItem?.total_price ? `₱${currentItem.total_price.toLocaleString()}` : '₱0'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Start"
                    fullWidth
                    value={currentItem?.serial_start || ''}
                    onChange={(e) => handleSerialChange('serial_start', e.target.value)}
                    placeholder="Starting #"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial End"
                    fullWidth
                    value={currentItem?.serial_end || ''}
                    onChange={(e) => handleSerialChange('serial_end', e.target.value)}
                    placeholder="Ending #"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseItemDialog}>CANCEL</Button>
          {!showCustomProductInput && (
            <Button
              onClick={handleSaveItem}
              variant="contained"
              disabled={
                !currentItem?.product_actual_id || // product id check
                Number(currentItem.quantity) <= 0 // invalid quantity
              }
            >
              {itemIndex !== null ? 'UPDATE' : 'ADD'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

// Main component for order requests list
const OrderRequestsList: React.FC = () => {
  // Use Redux instead of local state
  const dispatch = useDispatch<AppDispatch>();
  const orderRequests = useSelector(selectOrderRequests);
  const isLoading = useSelector(selectOrderRequestLoading);
  const reduxError = useSelector(selectOrderRequestError);
  const clientOrders = useSelector(selectAllClientOrders); // Get client orders properly

  // Redux state
  const reduxProducts = useSelector(selectAllProducts);
  const rawMaterials = useSelector(selectAllInventoryItems);

  // Local state for UI
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // Default to current month (YYYY-MM)
  const [formOpen, setFormOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<ExtendedOrderRequest | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState<boolean>(false);
  const [clientEligibility, setClientEligibility] = useState<{ [key: number]: boolean }>({});


  useEffect(() => {
    const fetchData = async () => {
      try {
        //Fetch static resources in parallel
        const [freshClients] = await Promise.all([
          clientsService.getClients(),
          dispatch(fetchProducts()),
          dispatch(fetchInventory())
        ]);

        setClients(freshClients); // store immediately

        //Fetch stateful data with unwrapped Redux calls
        const orderRequestsResult = await dispatch(fetchOrderRequests()).unwrap();
        const clientOrdersResult = await dispatch(fetchClientOrders()).unwrap();

        //Final eligibility calculation once all is ready
        const eligibilityMap = getClientEligibilityMap(freshClients, orderRequestsResult, clientOrdersResult);
        setClientEligibility(eligibilityMap);
      } catch (error) {
        console.error('Error loading data:', error);
        setSnackbarMessage('Failed to load order request data');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };

    fetchData();
  }, [dispatch]);

  const clientsWithOrders = useMemo(() => {
    const clientIds = new Set<number>();

    //Block if order request is Pending or Approved
    orderRequests.forEach(request => {
      if (request.client_id > 0 && ['Pending', 'Approved'].includes(request.status)) {
        clientIds.add(request.client_id);
      }
    });

    //Block if client order is Approved or Partially Paid
    clientOrders.forEach(order => {
      if (order.client_id > 0 && ['Approved', 'Partially Paid'].includes(order.status)) {
        clientIds.add(order.client_id);
      }
    });

    //Don't add clients with Completed/Rejected orders — they are free to order again

    return clientIds;
  }, [orderRequests, clientOrders]);



  const availableClients = useMemo(() => {
    return clients.filter(client => !clientsWithOrders.has(client.id) && client.status !== 'Inactive');
  }, [clients, clientsWithOrders]);

  // Helper function to get client order status
  const getClientOrderStatus = (clientId: number): { hasOngoingOrders: boolean, statusText: string } => {
    console.log(`Checking status for client ${clientId}...`);

    // Check for pending or approved requests
    const hasPendingRequest = orderRequests.some(
      req => req.client_id === clientId &&
        (req.status === 'Pending' || req.status === 'Approved')
    );
    console.log(`Client ${clientId} - Has pending request: ${hasPendingRequest}`);

    // Check for approved or partially paid orders
    const hasApprovedOrder = clientOrders.some(
      order => order.client_id === clientId &&
        (order.status === 'Approved' || order.status === 'Partially Paid')
    );
    console.log(`Client ${clientId} - Has approved/partially paid order: ${hasApprovedOrder}`);

    // Check for completed orders (for informational purposes)
    const hasCompletedOrder = clientOrders.some(
      order => order.client_id === clientId && order.status === 'Completed'
    );
    console.log(`Client ${clientId} - Has completed order: ${hasCompletedOrder}`);

    // Check for rejected orders
    const hasRejectedOrder = clientOrders.some(
      order => order.client_id === clientId && order.status === 'Rejected'
    );
    console.log(`Client ${clientId} - Has rejected order: ${hasRejectedOrder}`);

    if (hasPendingRequest) {
      return {
        hasOngoingOrders: true,
        statusText: 'Has pending request'
      };
    } else if (hasApprovedOrder) {
      const partiallyPaidOrder = clientOrders.some(
        order => order.client_id === clientId && order.status === 'Partially Paid'
      );

      return {
        hasOngoingOrders: true,
        statusText: partiallyPaidOrder ? 'Has partially paid order' : 'Has approved order'
      };
    } else if (hasCompletedOrder) {
      return {
        hasOngoingOrders: false,
        statusText: 'Has completed orders (can place new orders)'
      };
    } else if (hasRejectedOrder) {
      return {
        hasOngoingOrders: false,
        statusText: 'Has rejected orders (can place new orders)'
      };
    } else {
      return {
        hasOngoingOrders: false,
        statusText: 'No active orders'
      };
    }
  };

  const isClientInactive = (clientId: number): boolean => {
    const client = clients.find(c => c.id === clientId);
    return client?.status === 'Inactive';
  };

  // Add a refresh button and function to manually refresh the data
  const refreshData = async () => {
    // This will fetch the latest client orders data
    setSnackbarMessage('Refreshing data...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    try {
      // Get fresh clients
      const freshClients = await clientsService.getClients();
      setClients(freshClients);

      // Fetch order data
      await Promise.all([
        dispatch(fetchOrderRequests()),
        dispatch(fetchClientOrders())
      ]);

      // Directly check database for each active client's eligibility
      const activeClients = freshClients.filter(client => client.status === 'Active');

      const eligibilityChecks = await Promise.all(
        activeClients.map(async (client) => {
          const hasActiveOrders = await clientOrdersService.hasActiveOrders(client.id);
          const hasPendingRequests = await orderRequestsService.hasPendingRequests(client.id);
          return {
            clientId: client.id,
            canPlaceOrders: !hasActiveOrders && !hasPendingRequests
          };
        })
      );

      // Update client eligibility state
      const eligibilityMap: { [key: number]: boolean } = {};
      eligibilityChecks.forEach(check => {
        eligibilityMap[check.clientId] = check.canPlaceOrders;
      });

      setClientEligibility(eligibilityMap);

      console.log("UPDATED CLIENT ELIGIBILITY:", eligibilityMap);

      setSnackbarMessage('Data refreshed successfully. Client eligibility updated.');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setSnackbarMessage('Error refreshing data');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Update products state when redux products change
  useEffect(() => {
    setProducts(reduxProducts);
  }, [reduxProducts]);

  // Add function to fetch order history
  const fetchOrderHistory = async (requestId: number) => {
    try {
      const history = await orderRequestsService.getOrderHistory(requestId);
      setRequestHistory(history);
      setHistoryDialogOpen(true);
    } catch (error) {
      console.error('Error fetching order history:', error);
      setSnackbarMessage('Error fetching order history');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const filteredRequests = orderRequests.filter(request => {
    // First filter by date
    if (filterMonth && request.date.substring(0, 7) !== filterMonth) {
      return false;
    }
    
    // Then filter by search term
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const requestIdMatch = request.request_id.toLowerCase().includes(searchLower);
    const client = clients.find(c => c.id === request.client_id);
    const clientNameMatch = client ? client.name.toLowerCase().includes(searchLower) : false;
    const typeMatch = request.type.toLowerCase().includes(searchLower);
    const statusMatch = request.status.toLowerCase().includes(searchLower);

    return requestIdMatch || clientNameMatch || typeMatch || statusMatch;
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterMonth(e.target.value);
  };

  // Function to update inventory quantities
  const handleInventoryUpdate = async (
    updates: Array<{ id: number; newQuantity: number }>
  ): Promise<void> => {
    console.log('[📦 DISPATCHING INVENTORY PATCH]', updates);

    for (const update of updates) {
      try {
        await dispatch(updateInventoryItem({
          id: update.id,
          data: { quantity: update.newQuantity }
        })).unwrap();
        console.log(`[✔] Inventory updated for ID ${update.id}: ${update.newQuantity}`);
      } catch (error) {
        console.error(`[❌] Failed to update item ${update.id}:`, error);
        throw error;
      }
    }
  };

  const handleOpenCreateForm = async () => {
    setSnackbarMessage('Preparing form...');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);

    try {
      const eligibilityMap = getClientEligibilityMap(clients, orderRequests, clientOrders);
      setClientEligibility(eligibilityMap);

      const activeClients = clients.filter(c => c.status === 'Active');
      const activeAvailableClients = activeClients.filter(c => eligibilityMap[c.id]);

      if (activeAvailableClients.length === 0) {
        const busyClients = activeClients.filter(c => !eligibilityMap[c.id]);
        let message = 'All active clients already have ongoing orders. ';
        if (busyClients.length > 0) {
          message += 'Busy: ' + busyClients.map(c => c.name).join(', ');
        }
        setSnackbarMessage(message);
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
        return;
      }

      const newRequestId = await orderRequestsService.generateRequestId();

      setCurrentRequest({
        id: 0,
        request_id: newRequestId,
        client_id: activeAvailableClients[0]?.id || 0,
        date: new Date().toISOString().split('T')[0],
        type: '',
        status: 'Pending',
        created_at: new Date().toISOString(),
        items: [],
        notes: '',
        total_amount: 0
      });

      setFormOpen(true);
    } catch (error) {
      console.error('Error opening form:', error);
      setSnackbarMessage('Failed to open form');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleOpenEditForm = async (request: ExtendedOrderRequest) => {
    if (isClientInactive(request.client_id)) {
      setSnackbarMessage('Cannot edit order for inactive client');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setCurrentRequest({
      ...request,
      items: request.items || [],
      notes: request.notes || ''
    });
    setFormOpen(true);
  };

  const isEdit = !!currentRequest?.id;

  const handleCloseForm = () => {
    setFormOpen(false);
    setCurrentRequest(null);
  };

  // Update the handleOpenStatusDialog function to also fetch history
  const handleOpenStatusDialog = async (requestId: number) => {
    const request = orderRequests.find(r => r.id === requestId);
    if (request && isClientInactive(request.client_id)) {
      setSnackbarMessage('Cannot change status for order with inactive client');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setSelectedRequestId(requestId);
    setStatusDialogOpen(true);
  };

  const handleCloseStatusDialog = () => {
    setStatusDialogOpen(false);
    setSelectedRequestId(null);
  };

  // Update the handleChangeStatus function to pass the changed_by parameter
  const handleChangeStatus = async (status: string) => {
    if (selectedRequestId) {
      try {
        await dispatch(changeOrderRequestStatus({
          id: selectedRequestId,
          status,
          changedBy: 'Admin'
        })).unwrap();

        let message = `Request status updated to ${status}`;
        if (status === 'Approved') {
          message += ' and raw materials were deducted from inventory.';
        }

        setSnackbarMessage(message);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Error updating status:', error);
        setSnackbarMessage('Error updating request status');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        handleCloseStatusDialog();
      }
    }
  };

  const handleSubmitRequest = async (requestData: any) => {
    try {
      const {
        client_id,
        items,
        notes,
        date,
        type,
        status,
        finalInventoryUpdates = []
      } = requestData;

      console.log('[🔥 SUBMIT] Received finalInventoryUpdates:', finalInventoryUpdates);

      if (isClientInactive(client_id)) {
        throw new Error('Cannot create or update order for inactive client');
      }

      //Restore raw materials here before saving the order
      if (finalInventoryUpdates.length > 0) {
        console.log('Applying inventory delta updates...', finalInventoryUpdates);
        await handleInventoryUpdate(finalInventoryUpdates);
      }

      const cleanedItems = items.map((item: any) => {
        const { product_actual_id, ...rest } = item;
        return rest;
      });

      if (currentRequest && currentRequest.id) {
        await dispatch(updateOrderRequest({
          id: currentRequest.id,
          orderRequest: { client_id, date, type, status, notes },
          items: cleanedItems
        })).unwrap();

        setSnackbarMessage('Request updated successfully');
        setSnackbarSeverity('success');
      } else {
        await dispatch(createOrderRequest({
          orderRequest: {
            request_id: requestData.request_id,
            client_id,
            date,
            type,
            status: 'Pending',
            notes,
            total_amount: 0
          },
          items: cleanedItems
        })).unwrap();

        setSnackbarMessage('Request created successfully');
        setSnackbarSeverity('success');
      }

      await dispatch(fetchInventory());
      setSnackbarOpen(true);
      handleCloseForm();

    } catch (error: any) {
      console.error('Error submitting request:', error);
      setSnackbarMessage(error.message || 'Error submitting request');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };


  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    handleChangeStatus(event.target.value);
  };

  const getClientName = (clientId: number): string => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : `Client ID: ${clientId}`;
  };

  // Helper function to get chip color based on status
  const getChipColor = (status: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'completed':
        return 'info';
      case 'created':
        return 'info';
      case 'updated':
        return 'info';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Create a new OrderHistoryDialog component
  const OrderHistoryDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    history: any[];
    requestId: string;
  }> = ({ open, onClose, history, requestId }) => {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Order History: {requestId}</DialogTitle>
        <DialogContent>
          {history.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No history available for this order request.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Updated By</strong></TableCell>
                    <TableCell><strong>Notes</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.status}
                          color={getChipColor(entry.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{entry.changed_by || 'System'}</TableCell>
                      <TableCell>{entry.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Order Requests
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshData}
            disabled={isLoading}
            sx={{ mr: 2 }}
          >
            Refresh Data
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateForm}
            disabled={isLoading}
          >
            New Request
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search requests..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearch}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Filter by Month"
          type="month"
          value={filterMonth}
          onChange={handleMonthChange}
          variant="outlined"
          size="small"
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {isLoading && orderRequests.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: 'background.paper' }}>
              <TableRow>
                <TableCell><strong>Request ID</strong></TableCell>
                <TableCell><strong>Client</strong></TableCell>
                <TableCell align='center'><strong>Date</strong></TableCell>
                <TableCell><strong>Items</strong></TableCell>
                <TableCell align='center'><strong>Total</strong></TableCell>
                <TableCell align='center'><strong>Status</strong></TableCell>
                <TableCell align='center'><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {isLoading ? 'Loading requests...' : 'No requests found'}
                  </TableCell>
                </TableRow>
              ) : (
                // Filter out Approved and Rejected requests that have been moved to Client Orders
                filteredRequests
                  .filter(request => request.status === 'Pending' || request.status === 'New')
                  .map((request) => {
                    const totalAmount = request.total_amount || (request.items
                      ? request.items.reduce((sum, item) => sum + item.total_price, 0)
                      : 0);

                    return (
                      <TableRow
                        key={request.id}
                        sx={{
                          opacity: isClientInactive(request.client_id) ? 0.5 : 1,
                          backgroundColor: isClientInactive(request.client_id) ? 'rgba(0, 0, 0, 0.05)' : 'inherit',
                          '&:hover': {
                            cursor: isClientInactive(request.client_id) ? 'not-allowed' : 'pointer',
                            backgroundColor: isClientInactive(request.client_id) ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.04)'
                          }
                        }}
                      >
                        <TableCell>{request.request_id}</TableCell>
                        <TableCell>
                          {getClientName(request.client_id)}
                          {isClientInactive(request.client_id) && (
                            <Chip
                              label="Inactive"
                              size="small"
                              color="default"
                              sx={{ ml: 1, fontSize: '0.7rem' }}
                            />
                          )}
                        </TableCell>
                        <TableCell align='center'>{new Date(request.date).toLocaleDateString()}</TableCell>
                        <TableCell>{request.items ? request.items.length : 0} items</TableCell>
                        <TableCell align='center'>₱{totalAmount.toLocaleString()}</TableCell>
                        <TableCell align='center'>
                          <StatusChip status={request.status} />
                        </TableCell>
                        <TableCell align='center'>
                          <Button
                            size="small"
                            onClick={() => handleOpenEditForm(request)}
                            sx={{ mr: 1 }}
                            disabled={isClientInactive(request.client_id) || request.status === 'Approved' || request.status === 'Rejected'}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleOpenStatusDialog(request.id)}
                            disabled={isClientInactive(request.client_id)}
                            color={request.status === 'Pending' ? 'primary' : 'secondary'}
                            sx={{ mr: 1 }}
                          >
                            Change Status
                          </Button>
                          <Button
                            size="small"
                            onClick={() => fetchOrderHistory(request.id)}
                            color="info"
                          >
                            History
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {formOpen && (
        <OrderRequestForm
          open={formOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmitRequest}
          clients={isEdit ? clients : clients}
          products={products}
          rawMaterials={rawMaterials}
          initialData={currentRequest}
          isEdit={isEdit}
          clientsWithOrders={clientsWithOrders}
          clientEligibility={clientEligibility}
          getClientOrderStatus={getClientOrderStatus}
          onInventoryUpdate={handleInventoryUpdate}
        />
      )}

      <Dialog open={statusDialogOpen} onClose={handleCloseStatusDialog}>
        <DialogTitle>Change Request Status</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Typography variant="body1">
              Changing the status to "Approved" or "Rejected" will move this request to the Client Orders section.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              • "Approved" status means the order is accepted and being processed.
              <br />
              • "Rejected" status means the order is declined.
              <br />
              • Once moved to Client Orders, you can mark it as "Partially Paid" for orders with partial payment.
              <br />
              • Clients cannot place new orders while they have "Approved" or "Partially Paid" orders.
              <br />
              • Only when marked as "Completed" or "Rejected" can the client place new orders.
            </Typography>
          </Box>
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={orderRequests.find(r => r.id === selectedRequestId)?.status || ''}
              label="Status"
              onChange={handleStatusChange}
            >
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatusDialog}>Cancel</Button>
          <Button
            onClick={() => {
              const request = orderRequests.find(r => r.id === selectedRequestId);
              if (request) {
                handleChangeStatus(request.status === 'Pending' ? 'Approved' : 'Pending');
              }
            }}
            variant="contained"
            color="primary"
          >
            Apply Status Change
          </Button>
        </DialogActions>
      </Dialog>

      <OrderHistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        history={requestHistory}
        requestId={orderRequests.find(r => r.id === selectedRequestId)?.request_id || ''}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrderRequestsList;