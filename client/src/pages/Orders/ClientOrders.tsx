import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, Chip, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Tabs, Tab, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { 
  fetchClientOrders,
  changeClientOrderStatus,
  addOrderPayment,
  updateOrderPaymentPlan,
  selectAllClientOrders,
  selectApprovedOrders,
  selectPartiallyPaidOrders,
  selectCompletedOrders,
  selectRejectedOrders,
  selectClientOrdersLoading,
  selectClientOrdersError
} from '../../redux/slices/clientOrdersSlice';
import { ClientOrder } from '../../services/clientOrdersService';
import { clientOrdersService } from '../../services/clientOrdersService';
import { OrderRequestItem } from '../../services/orderRequestsService';
import { AppDispatch } from '../../redux/store';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`order-tabpanel-${index}`}
      aria-labelledby={`order-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface ExtendedClientOrder extends ClientOrder {
  items?: OrderRequestItem[];
  order_type?: string;
}

interface OrderDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  order: ExtendedClientOrder | null;
  onStatusChange: (orderId: number, status: string) => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ open, onClose, order, onStatusChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [tabValue, setTabValue] = useState(0);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [completeOrderHistory, setCompleteOrderHistory] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentPlan, setPaymentPlan] = useState<string>('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (order && open) {
      setSelectedStatus(order.status);
      setPaymentAmount('');
      setPaymentMethod('Cash');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentNotes('');
      setPaymentPlan(order.payment_plan || '');
      
      // Fetch complete order history from the database
      const fetchOrderHistory = async () => {
        try {
          const history = await clientOrdersService.getOrderHistory(undefined, order.id);
          setCompleteOrderHistory(history);
          
          if (history.length === 0) {
            // Generate basic history entries if no database history found
            const historyEntries = [
              {
                date: order.created_at,
                status: 'Created',
                updatedBy: 'System',
                notes: 'Order created'
              }
            ];
            
            // Add entry for status changes if updated_at is different from created_at
            // Make sure to handle potential undefined values
            if (order.updated_at && order.created_at && 
                new Date(order.updated_at).getTime() !== new Date(order.created_at).getTime()) {
              historyEntries.push({
                date: order.updated_at,
                status: order.status,
                updatedBy: 'Admin',
                notes: `Status changed to ${order.status}`
              });
            }
            
            setOrderHistory(historyEntries);
          } else {
            // Format database history for display
            const formattedHistory = history.map(entry => ({
              date: entry.created_at,
              status: entry.status,
              updatedBy: entry.changed_by,
              notes: entry.notes
            }));
            
            // Add the initial creation event if not in history
            if (!history.some(h => h.status === 'Created')) {
              formattedHistory.push({
                date: order.created_at,
                status: 'Created',
                updatedBy: 'System',
                notes: 'Order created'
              });
            }
            
            // Sort by date (newest to oldest)
            formattedHistory.sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            
            setOrderHistory(formattedHistory);
          }
        } catch (error) {
          console.error('Error fetching order history:', error);
          
          // Fallback to generated history
          const historyEntries = [
            {
              date: order.created_at,
              status: 'Created',
              updatedBy: 'System',
              notes: 'Order created'
            }
          ];
          
          if (order.updated_at && order.created_at && 
              new Date(order.updated_at).getTime() !== new Date(order.created_at).getTime()) {
            historyEntries.push({
              date: order.updated_at,
              status: order.status,
              updatedBy: 'Admin',
              notes: `Status changed to ${order.status}`
            });
          }
          
          setOrderHistory(historyEntries);
        }
      };
      
      fetchOrderHistory();
    }
  }, [order, open]);

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    const newStatus = event.target.value;
    
    // If changing to Pending, show a confirmation dialog
    if (newStatus === 'Pending' && order?.status !== 'Pending') {
      if (window.confirm('This will move the order back to Order Requests for further modifications. The order will be removed from Client Orders. Continue?')) {
        setSelectedStatus(newStatus);
      } else {
        // User cancelled, revert to current status
        setSelectedStatus(order?.status || '');
      }
    } 
    // If changing to Completed, show a confirmation dialog
    else if (newStatus === 'Completed' && order?.status !== 'Completed') {
      if (window.confirm('Marking this order as Completed will finalize it and allow the client to place new orders. Continue?')) {
        setSelectedStatus(newStatus);
      } else {
        // User cancelled, revert to current status
        setSelectedStatus(order?.status || '');
      }
    }
    else {
      setSelectedStatus(newStatus);
    }
  };

  const handleSaveStatus = () => {
    if (order && selectedStatus && order.status !== selectedStatus) {
      onStatusChange(order.id, selectedStatus);
      onClose();
    } else {
      onClose();
    }
  };

  if (!order) return null;

  const getChipColor = (status: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'partially paid':
        return 'warning';
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Order Details: {order.order_id}
        <Chip 
          label={order.status} 
          color={getChipColor(order.status)}
          size="small"
          sx={{ ml: 2 }}
        />
      </DialogTitle>
      
      <Tabs value={tabValue} onChange={handleTabChange} centered>
        <Tab label="Basic Info" />
        <Tab label="Payment Details" />
        <Tab label="Order History" />
      </Tabs>
      
      <DialogContent>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Client</Typography>
            <Typography variant="body1">{order.clients?.name || 'N/A'}</Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Contact Person</Typography>
            <Typography variant="body1">{order.clients?.contactPerson || 'N/A'}</Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Date</Typography>
            <Typography variant="body1">
              {order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Order Type</Typography>
            <Typography variant="body1">{order.order_type || 'General Order'}</Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Amount</Typography>
            <Typography variant="body1">₱{order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          </Box>
          
          {order.paid_amount !== undefined && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold">Paid Amount</Typography>
              <Typography variant="body1">₱{order.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </Box>
          )}
          
          {order.remaining_amount !== undefined && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold">Remaining Amount</Typography>
              <Typography variant="body1" color={order.remaining_amount > 0 ? 'error.main' : 'success.main'}>
                ₱{order.remaining_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          )}
          
          {order.payment_plan && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold">Payment Plan</Typography>
              <Typography variant="body1">{order.payment_plan}</Typography>
            </Box>
          )}
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Changing status to "Pending" will move this order back to Order Requests for modification.
              Changing to "Completed" will mark the order as fulfilled and allow the client to place new orders.
              Changing to "Rejected" will cancel the order and allow the client to place new orders.
              Orders with "Approved" or "Partially Paid" status indicate ongoing transactions and prevent the client from creating new orders.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Status</Typography>
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel id="order-status-label">Order Status</InputLabel>
              <Select
                labelId="order-status-label"
                value={selectedStatus}
                onChange={handleStatusChange}
                label="Order Status"
              >
                <MenuItem value="Pending">Pending (Move to Order Requests)</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Partially Paid">Partially Paid</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Notes</Typography>
            <Typography variant="body1">{order.notes || 'No notes available'}</Typography>
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Payment Summary</Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Total Amount:</Typography>
                <Typography variant="body1" fontWeight="bold">₱{order.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Paid Amount:</Typography>
                <Typography variant="body1" color="success.main">₱{(order.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">Remaining Balance:</Typography>
                <Typography variant="body1" color={order.remaining_amount && order.remaining_amount > 0 ? 'error.main' : 'success.main'} fontWeight="bold">
                  ₱{(order.remaining_amount || order.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Paper>
          </Box>
            
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Payment Plan</Typography>
            <TextField
              fullWidth
              label="Payment Plan Details"
              multiline
              rows={3}
              value={paymentPlan}
              onChange={(e) => setPaymentPlan(e.target.value)}
              placeholder="Enter installment details, due dates, etc."
              variant="outlined"
              size="small"
              sx={{ mb: 2 }}
            />
            <Button 
              variant="outlined" 
              onClick={() => {
                dispatch(updateOrderPaymentPlan({ 
                  orderId: order.id, 
                  paymentPlan: paymentPlan 
                }));
              }}
              disabled={!paymentPlan || paymentPlan === order.payment_plan}
            >
              Update Payment Plan
            </Button>
          </Box>
            
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Record New Payment</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Amount (₱)"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                }}
                fullWidth
                size="small"
              />
              <TextField
                label="Payment Date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                  <MenuItem value="Check">Check</MenuItem>
                  <MenuItem value="GCash">GCash</MenuItem>
                  <MenuItem value="Credit Card">Credit Card</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                fullWidth
                size="small"
              />
            </Box>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
                if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
                  alert('Please enter a valid payment amount');
                  return;
                }
                
                dispatch(addOrderPayment({
                  order_id: order.id,
                  amount: parseFloat(paymentAmount),
                  payment_date: paymentDate,
                  payment_method: paymentMethod,
                  notes: paymentNotes
                }));
                
                // Clear fields after submission
                setPaymentAmount('');
                setPaymentNotes('');
              }}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              Record Payment
            </Button>
          </Box>
            
          {order.payments && order.payments.length > 0 ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Payment History</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Amount</strong></TableCell>
                      <TableCell><strong>Method</strong></TableCell>
                      <TableCell><strong>Notes</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.payments.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>₱{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No payment records found.
            </Typography>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          {orderHistory.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No order history available.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
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
                  {orderHistory.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {entry.date ? new Date(entry.date).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={entry.status} 
                          color={getChipColor(entry.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{entry.updatedBy}</TableCell>
                      <TableCell>{entry.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          {order.items && order.items.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Product</strong></TableCell>
                    <TableCell><strong>Quantity</strong></TableCell>
                    <TableCell><strong>Unit Price</strong></TableCell>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell><strong>Serial Numbers</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item: OrderRequestItem, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₱{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>₱{item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        {item.serial_start && item.serial_end 
                          ? `${item.serial_start} - ${item.serial_end}`
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Total Amount:</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>₱{order.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
              No items found for this order.
            </Typography>
          )}
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSaveStatus} 
          variant="contained" 
          color="primary"
          disabled={order.status === selectedStatus}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main component for client orders list
const ClientOrdersList: React.FC = () => {
  // Use Redux for state management
  const dispatch = useDispatch<AppDispatch>();
  const approvedOrders = useSelector(selectApprovedOrders);
  const partiallyPaidOrders = useSelector(selectPartiallyPaidOrders);
  const completedOrders = useSelector(selectCompletedOrders);
  const rejectedOrders = useSelector(selectRejectedOrders);
  const loading = useSelector(selectClientOrdersLoading);
  const error = useSelector(selectClientOrdersError);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<ExtendedClientOrder | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Fetch orders when component mounts
  useEffect(() => {
    dispatch(fetchClientOrders());
  }, [dispatch]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filterOrders = (orders: ExtendedClientOrder[]) => {
    if (!searchTerm.trim()) return orders;
    
    const searchLower = searchTerm.toLowerCase();
    return orders.filter(order => {
      const orderIdMatch = order.order_id.toLowerCase().includes(searchLower);
      const clientNameMatch = order.clients?.name?.toLowerCase().includes(searchLower) || false;
      const statusMatch = order.status.toLowerCase().includes(searchLower);
      
      return orderIdMatch || clientNameMatch || statusMatch;
    });
  };

  const handleViewDetails = (order: ExtendedClientOrder) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (!selectedOrder) return;
    
    try {
      // Use Redux action to update status
      await dispatch(changeClientOrderStatus({ 
        id: orderId, 
        status: newStatus,
        changedBy: 'Admin' // Or use actual user name/role
      })).unwrap();
      
      // If the status is changed to Pending, the order will be moved to Order Requests
      // and removed from client orders list
      if (newStatus === 'Pending') {
        setSnackbar({
          open: true,
          message: `Order moved back to Order Requests for modification`,
          severity: 'info'
        });
      } else if (newStatus === 'Completed') {
        setSnackbar({
          open: true,
          message: `Order marked as Completed. Client can now place new orders.`,
          severity: 'success'
        });
      } else if (newStatus === 'Partially Paid') {
        setSnackbar({
          open: true,
          message: `Order marked as Partially Paid. Client cannot place new orders until fully paid.`,
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Order status changed to ${newStatus}`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error changing order status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to change order status. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleRefresh = () => {
    dispatch(fetchClientOrders());
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const renderOrdersTable = (orders: ExtendedClientOrder[]) => (
    <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)', mb: 4 }}>
      <Table>
        <TableHead sx={{ backgroundColor: 'background.paper' }}>
          <TableRow>
            <TableCell><strong>Order ID</strong></TableCell>
            <TableCell><strong>Client</strong></TableCell>
            <TableCell><strong>Date</strong></TableCell>
            <TableCell><strong>Amount</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            filterOrders(orders).map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.order_id}</TableCell>
                <TableCell>{order.clients?.name || `Client ${order.client_id}`}</TableCell>
                <TableCell>
                  {order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>₱{order.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Chip 
                    label={order.status} 
                    color={
                      order.status === 'Approved' ? 'success' : 
                      order.status === 'Partially Paid' ? 'warning' : 
                      order.status === 'Completed' ? 'info' : 
                      order.status === 'Rejected' ? 'error' : 'default'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    size="small"
                    onClick={() => handleViewDetails(order)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Client Orders
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          placeholder="Search orders..."
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ width: '100%', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange} centered>
              <Tab label={`Approved Orders (${approvedOrders.length})`} />
              <Tab label={`Partially Paid Orders (${partiallyPaidOrders.length})`} />
              <Tab label={`Completed Orders (${completedOrders.length})`} />
              <Tab label={`Rejected Orders (${rejectedOrders.length})`} />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            {renderOrdersTable(approvedOrders)}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            {renderOrdersTable(partiallyPaidOrders)}
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            {renderOrdersTable(completedOrders)}
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            {renderOrdersTable(rejectedOrders)}
          </TabPanel>
        </>
      )}

      <OrderDetailsDialog 
        open={detailsDialogOpen}
        onClose={handleCloseDetailsDialog}
        order={selectedOrder}
        onStatusChange={handleStatusChange}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientOrdersList;