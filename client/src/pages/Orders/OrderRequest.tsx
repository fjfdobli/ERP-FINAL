import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, Chip, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, CircularProgress, Snackbar, Alert, Grid, IconButton, SelectChangeEvent } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Client, clientsService } from '../../services/clientsService';
import { OrderRequestItem, ExtendedOrderRequest } from '../../services/orderRequestsService';
import { orderRequestsService } from '../../services/orderRequestsService';
import { 
  fetchOrderRequests, 
  createOrderRequest, 
  updateOrderRequest, 
  changeOrderRequestStatus,
  selectOrderRequests,
  selectOrderRequestLoading,
  selectOrderRequestError 
} from '../../redux/slices/orderRequestSlice';
import { selectAllClientOrders } from '../../redux/slices/clientOrdersSlice';
import { AppDispatch, RootState } from '../../redux/store';

interface Product {
  id: number;
  name: string;
  price: number;
}

const printingProducts: Product[] = [
  { id: 1, name: 'Government Forms', price: 2500 },
  { id: 2, name: 'Magazines / Manuals', price: 3500 },
  { id: 3, name: 'Souvenir Programs', price: 2800 },
  { id: 4, name: 'Receipts / Invoices', price: 1800 },
  { id: 5, name: 'Yearbooks', price: 4500 },
  { id: 6, name: 'Business Forms', price: 2000 },
  { id: 7, name: 'Brochures/Post Cards', price: 1500 },
  { id: 8, name: 'Election Handbills/Posters', price: 2200 },
  { id: 9, name: 'Letterheads', price: 1300 },
  { id: 10, name: 'Workbooks/Books', price: 3800 },
  { id: 11, name: 'Calling Cards', price: 800 },
  { id: 12, name: 'Tickets', price: 900 },
  { id: 13, name: 'News Papers', price: 2500 },
  { id: 14, name: 'Wedding Invitation', price: 1800 },
  { id: 15, name: 'Letter Envelope', price: 1200 },
  { id: 16, name: 'Labels', price: 1000 },
  { id: 17, name: 'Stickers / Boxes', price: 1400 },
  { id: 18, name: 'Memo Pads', price: 1100 },
  { id: 19, name: 'Posters', price: 1700 },
  { id: 20, name: 'Identification Cards', price: 950 },
  { id: 21, name: 'Calendars', price: 1600 }
];

interface OrderRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: any) => void;
  clients: Client[];
  products: Product[];
  initialData?: ExtendedOrderRequest | null;
  isEdit?: boolean;
  clientsWithOrders: Set<number>;
  getClientOrderStatus: (clientId: number) => { hasOngoingOrders: boolean, statusText: string };
}

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

const OrderRequestForm: React.FC<OrderRequestFormProps> = ({ 
  open, 
  onClose, 
  onSubmit, 
  clients, 
  products, 
  initialData = null, 
  isEdit = false, 
  clientsWithOrders,
  getClientOrderStatus
}) => {
  const [clientId, setClientId] = useState<number>(initialData?.client_id || 0);
  const [items, setItems] = useState<OrderRequestItem[]>(initialData?.items || []);
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<OrderRequestItem | null>(null);
  const [itemIndex, setItemIndex] = useState<number | null>(null);
  const [showCustomProductInput, setShowCustomProductInput] = useState<boolean>(false);
  const [customProduct, setCustomProduct] = useState<{name: string; price: number}>({
    name: '',
    price: 0
  });
  
  useEffect(() => {
    if (initialData) {
      setClientId(initialData.client_id || 0);
      setItems(initialData.items || []);
      setNotes(initialData.notes || '');
    } else {
      setClientId(0);
      setItems([]);
      setNotes('');
    }
  }, [initialData]);

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
      serial_end: ''
    });
    setItemIndex(null);
    setItemDialogOpen(true);
    setShowCustomProductInput(false);
    setCustomProduct({ name: '', price: 0 });
  };

  const handleEditItem = (item: OrderRequestItem, index: number) => {
    setCurrentItem({ ...item });
    setItemIndex(index);
    setItemDialogOpen(true);
    setShowCustomProductInput(false);
    setCustomProduct({ name: '', price: 0 });
  };

  const handleDeleteItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleCloseItemDialog = () => {
    setItemDialogOpen(false);
    setCurrentItem(null);
    setItemIndex(null);
    setShowCustomProductInput(false);
    setCustomProduct({ name: '', price: 0 });
  };

  const handleSaveItem = () => {
    if (!currentItem) return;
    
    const newItems = [...items];
    
    if (itemIndex !== null) {
      newItems[itemIndex] = currentItem;
    } else {
      newItems.push(currentItem);
    }
    
    setItems(newItems);
    handleCloseItemDialog();
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
    
    setCurrentItem({
      ...currentItem,
      product_id: productId,
      product_name: product.name,
      unit_price: unitPrice,
      total_price: totalPrice
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
      total_price: totalPrice
    });
    
    setShowCustomProductInput(false);
    setCustomProduct({ name: '', price: 0 });
  };

  const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentItem) return;
    
    const quantity = parseInt(event.target.value) || 0;
    const totalPrice = currentItem.unit_price * quantity;
    
    setCurrentItem({
      ...currentItem,
      quantity,
      total_price: totalPrice
    });
  };

  const handleSerialChange = (field: 'serial_start' | 'serial_end', value: string) => {
    if (!currentItem) return;
    
    setCurrentItem({
      ...currentItem,
      [field]: value
    });
  };

  const handleSubmit = () => {
    const requestData = {
      ...(initialData || {}),
      client_id: clientId,
      items,
      notes,
      total_amount: calculateTotal(),
      type: items.length > 0 ? items[0].product_name : 'Other',
      status: initialData?.status || 'Pending', // Set initial status to Pending instead of New
      date: initialData?.date || new Date().toISOString().split('T')[0]
    };
    
    onSubmit(requestData);
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
              value={clientId || ''}
              onChange={handleClientChange}
              label="Client"
            >
              {clients
                .filter(client => {
                  // In edit mode, show the current client even if inactive
                  // In create mode, only show active clients
                  return (isEdit && client.id === clientId) || 
                         (client.status !== 'Inactive' && (!clientsWithOrders.has(client.id) || client.id === initialData?.client_id));
                })
                .map((client) => {
                  const clientStatus = getClientOrderStatus(client.id);
                  return (
                    <MenuItem 
                      key={client.id} 
                      value={client.id}
                      disabled={client.status === 'Inactive' || (!isEdit && clientStatus.hasOngoingOrders)}
                      sx={{
                        opacity: client.status === 'Inactive' || clientStatus.hasOngoingOrders ? 0.5 : 1,
                        '&.Mui-disabled': {
                          opacity: 0.5,
                        }
                      }}
                    >
                      {client.name} 
                      {client.status === 'Inactive' && ' (Inactive)'}
                      {client.status !== 'Inactive' && clientStatus.hasOngoingOrders && ` (${clientStatus.statusText})`}
                      {client.status !== 'Inactive' && !clientStatus.hasOngoingOrders && clientStatus.statusText && ` (${clientStatus.statusText})`}
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
                <TableCell><strong>Serial</strong></TableCell>
                <TableCell><strong>Unit Price</strong></TableCell>
                <TableCell><strong>Quantity</strong></TableCell>
                <TableCell><strong>Total</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
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
                    <TableCell>
                      {item.serial_start && item.serial_end 
                        ? `${item.serial_start} - ${item.serial_end}`
                        : 'start - end'}
                    </TableCell>
                    <TableCell>₱{item.unit_price.toLocaleString()}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>₱{item.total_price.toLocaleString()}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditItem(item, index)}
                        sx={{ mr: 1 }}
                      >
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
                  value={showCustomProductInput ? 'custom' : (currentItem?.product_id || '')}
                  onChange={handleProductChange}
                  label="Product"
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name} - ₱{product.price.toLocaleString()}
                    </MenuItem>
                  ))}
                  <MenuItem value="custom" divider>
                    <em>Add Custom Product</em>
                  </MenuItem>
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
                    onChange={(e) => setCustomProduct({...customProduct, name: e.target.value})}
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
                    onChange={(e) => setCustomProduct({...customProduct, price: Number(e.target.value)})}
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
              disabled={!currentItem?.product_id || !currentItem?.quantity}
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
  
  // Local state for UI
  const [clients, setClients] = useState<Client[]>([]);
  const [products] = useState<Product[]>(printingProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<ExtendedOrderRequest | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState<boolean>(false);
  
  const clientsWithOrders = useMemo(() => {
    const clientIds = new Set<number>();
    
    // Only restrict clients that have Pending or Approved order requests
    orderRequests.forEach(request => {
      if (request.client_id > 0 && 
          (request.status === 'Pending' || request.status === 'Approved')) { 
        clientIds.add(request.client_id);
      }
    });
    
    // Only restrict clients with Approved orders (not with Completed or Rejected)
    clientOrders.forEach(order => {
      // If an order is Approved (not Completed or Rejected), the client cannot make new requests
      if (order.client_id > 0 && order.status === 'Approved') {
        clientIds.add(order.client_id);
      }
      // Clients with Completed or Rejected orders can make new requests
      // So we don't add them to clientIds
    });
    
    return clientIds;
  }, [orderRequests, clientOrders]);
  
  const availableClients = useMemo(() => {
    return clients.filter(client => !clientsWithOrders.has(client.id) && client.status !== 'Inactive');
  }, [clients, clientsWithOrders]);

  // Helper function to get client order status
  const getClientOrderStatus = (clientId: number): { hasOngoingOrders: boolean, statusText: string } => {
    // Check for pending or approved requests
    const hasPendingRequest = orderRequests.some(
      req => req.client_id === clientId && 
             (req.status === 'Pending' || req.status === 'Approved')
    );
    
    // Check for approved orders
    const hasApprovedOrder = clientOrders.some(
      order => order.client_id === clientId && order.status === 'Approved'
    );
    
    // Check for completed orders (for informational purposes)
    const hasCompletedOrder = clientOrders.some(
      order => order.client_id === clientId && order.status === 'Completed'
    );
    
    // Check for rejected orders
    const hasRejectedOrder = clientOrders.some(
      order => order.client_id === clientId && order.status === 'Rejected'
    );
    
    if (hasPendingRequest) {
      return { 
        hasOngoingOrders: true, 
        statusText: 'Has pending request' 
      };
    } else if (hasApprovedOrder) {
      return { 
        hasOngoingOrders: true, 
        statusText: 'Has approved order' 
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

  useEffect(() => {
    // Fetch data on component mount
    const fetchData = async () => {
      try {
        // Fetch clients from service
        const fetchedClients = await clientsService.getClients();
        setClients(fetchedClients);
        
        // Fetch order requests from Redux
        dispatch(fetchOrderRequests());
      } catch (error) {
        console.error('Error fetching clients:', error);
        setClients([]);
        setSnackbarMessage('Error fetching clients');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };
    
    fetchData();
  }, [dispatch]);  

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

  const handleOpenCreateForm = async () => {
    try {
      const activeAvailableClients = clients.filter(client => 
        client.status === 'Active' && !clientsWithOrders.has(client.id)
      );

      if (activeAvailableClients.length === 0) {
        // Provide a more informative message about client eligibility
        const clientsWithOngoingTransactions = clients.filter(client => 
          client.status === 'Active' && clientsWithOrders.has(client.id)
        );
        
        let message = 'All active clients already have pending or approved orders. ';
        
        if (clientsWithOngoingTransactions.length > 0) {
          message += 'The following clients have ongoing transactions and cannot create new orders: ';
          message += clientsWithOngoingTransactions.map(c => c.name).join(', ') + '. ';
          message += 'Complete or reject their current orders to allow new order requests.';
        } else {
          message += 'Please add new clients or activate existing ones to create more orders.';
        }
        
        setSnackbarMessage(message);
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
        return;
      }
      
      // Use your service to generate a request ID
      const newRequestId = await orderRequestsService.generateRequestId();
      
      setCurrentRequest({
        id: 0,
        request_id: newRequestId,
        client_id: activeAvailableClients.length > 0 ? activeAvailableClients[0].id : 0,
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
      console.error('Error generating request ID:', error);
      setSnackbarMessage('Error generating request ID');
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
        // Use Redux action to change status
        await dispatch(changeOrderRequestStatus({ 
          id: selectedRequestId, 
          status,
          changedBy: 'Admin' // Or use the actual user name/role
        })).unwrap();
        
        // When status is Approved or Rejected, it will be moved to Client Orders and removed from here
        // This is handled in the Redux thunk and backend logic
        
        setSnackbarMessage(`Request status updated to ${status}`);
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
      const { client_id, items, notes, date, type, status } = requestData;

      if (isClientInactive(client_id)) {
        throw new Error('Cannot create or update order for inactive client');
      }
      
      if (currentRequest && currentRequest.id) {
        // Update existing request
        await dispatch(updateOrderRequest({
          id: currentRequest.id,
          orderRequest: { client_id, date, type, status, notes },
          items
        })).unwrap();
        
        setSnackbarMessage('Request updated successfully');
        setSnackbarSeverity('success');
      } else {
        // Create new request
        await dispatch(createOrderRequest({
          orderRequest: {
            request_id: requestData.request_id,
            client_id,
            date,
            type,
            status: 'Pending', // Always Pending for new requests
            notes,
            total_amount: 0 // This will be calculated in the service
          },
          items
        })).unwrap();
        
        setSnackbarMessage('Request created successfully');
        setSnackbarSeverity('success');
      }
      
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
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpenCreateForm}
          disabled={isLoading}
        >
          New Request
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          placeholder="Search requests..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearch}
          sx={{ width: 300, mr: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
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
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Items</strong></TableCell>
                <TableCell><strong>Total</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
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
                        <TableCell>{new Date(request.date).toLocaleDateString()}</TableCell>
                        <TableCell>{request.items ? request.items.length : 0} items</TableCell>
                        <TableCell>₱{totalAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <StatusChip status={request.status} />
                        </TableCell>
                        <TableCell>
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
          initialData={currentRequest}
          isEdit={isEdit}
          clientsWithOrders={clientsWithOrders}
          getClientOrderStatus={getClientOrderStatus}
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
              • Once moved to Client Orders, you can mark it as "Completed" to allow the client to place new orders.
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