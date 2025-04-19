import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button, 
  TextField, 
  InputAdornment, 
  Chip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent, 
  Tabs, 
  Tab, 
  Snackbar, 
  Alert, 
  CircularProgress,
  Grid
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Add as AddIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { 
  fetchSuppliers, 
  selectAllSuppliers, 
  selectSuppliersStatus, 
  selectSuppliersError 
} from '../../redux/slices/suppliersSlice';
import { 
  fetchInventory, 
  addInventoryTransaction,
  selectAllInventoryItems, 
  selectInventoryLoading 
} from '../../redux/slices/inventorySlice';
import {
  fetchSupplierOrders,
  fetchQuotationRequests,
  updateSupplierOrder,
  updateQuotationRequest,
  addOrderPayment,
  createOrderFromQuotation,
  createSupplierOrder,
  createQuotationRequest,
  deleteSupplierOrder,
  deleteQuotationRequest,
  selectAllSupplierOrders,
  selectAllQuotationRequests,
  selectOrderSupplierLoading,
  selectOrderSupplierError
} from '../../redux/slices/orderSupplierSlice';
import { Supplier } from '../../services/suppliersService';
import { InventoryItem } from '../../services/inventoryService';
import { 
  SupplierOrder,
  SupplierOrderItem,
  QuotationRequest,
  QuotationItem,
  OrderPayment,
  CreateSupplierOrder,
  CreateQuotationRequest,
  UpdateSupplierOrder,
  UpdateQuotationRequest,
  Supplier as OrderSupplierServiceSupplier
} from '../../services/orderSupplierService';
import { AppDispatch } from '../../redux/store';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// TabPanel component for tab content
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

// Order Details Dialog component
interface OrderDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  order: SupplierOrder | null;
  onStatusChange: (orderId: number, status: string) => void;
  onAddPayment: (payment: { 
    order_id: number; 
    amount: number; 
    payment_date: string; 
    payment_method: string; 
    notes?: string 
  }) => void;
  suppliers?: Supplier[];
  inventoryItems?: InventoryItem[];
  onGeneratePDF?: (order: SupplierOrder) => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ 
  open, 
  onClose, 
  order, 
  onStatusChange,
  onAddPayment,
  suppliers = [],
  inventoryItems = [],
  onGeneratePDF
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [tabValue, setTabValue] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentPlan, setPaymentPlan] = useState<string>('');
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

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
      
      // Generate basic history entries
      const historyEntries = [
        {
          date: order.created_at,
          status: 'Created',
          updatedBy: 'System',
          notes: 'Order created'
        }
      ];
      
      // Add entry for status changes if updated_at is different from created_at
      if (order.updated_at && order.created_at && 
          new Date(order.updated_at).getTime() !== new Date(order.created_at).getTime()) {
        historyEntries.push({
          date: order.updated_at,
          status: order.status,
          updatedBy: 'Admin',
          notes: `Status changed to ${order.status}`
        });
      }
      
      // Add entries for payments
      if (order.payments && order.payments.length > 0) {
        order.payments.forEach(payment => {
          historyEntries.push({
            date: payment.created_at || payment.payment_date,
            status: 'Payment',
            updatedBy: 'Admin',
            notes: `Payment of ₱${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} via ${payment.payment_method}`
          });
        });
      }
      
      // Sort history by date
      historyEntries.sort((a, b) => {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });
      
      setOrderHistory(historyEntries);
    }
  }, [order, open]);

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setSelectedStatus(event.target.value);
  };

  const handleSaveStatus = () => {
    if (order && selectedStatus && order.status !== selectedStatus) {
      onStatusChange(order.id!, selectedStatus);
      onClose();
    } else {
      onClose();
    }
  };

  const handleRecordPayment = () => {
    if (!order || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      return;
    }
    
    onAddPayment({
      order_id: order.id!,
      amount: parseFloat(paymentAmount),
      payment_date: paymentDate,
      payment_method: paymentMethod,
      notes: paymentNotes || undefined
    });
    
    // Clear fields after submission
    setPaymentAmount('');
    setPaymentNotes('');
  };

  if (!order) return null;

  const getChipColor = (status: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'partially paid':
        return 'warning';
      case 'completed':
        return 'info';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Helper function to handle stock in when order is received
  const handleReceiveItems = async () => {
    try {
      // Create an inventory transaction for each item
      for (const item of order.items) {
        await dispatch(addInventoryTransaction({
          inventoryId: item.inventory_id,
          transactionData: {
            transactionType: 'stock_in',
            quantity: item.quantity,
            createdBy: order.supplier_id,
            isSupplier: true,
            notes: `Stock in from Purchase Order ${order.order_id}`
          }
        })).unwrap();
      }
      
      // Change order status to Received
      onStatusChange(order.id!, 'Received');
      onClose();
    } catch (error) {
      console.error('Error receiving items:', error);
      alert('Failed to process inventory. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Purchase Order Details: {order.order_id}
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
            <Typography variant="subtitle1" fontWeight="bold">Supplier</Typography>
            <Typography variant="body1">{order.suppliers?.name || (suppliers.find(s => s.id === order.supplier_id)?.name || 'N/A')}</Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Contact Person</Typography>
            <Typography variant="body1">{order.suppliers?.contactPerson || (suppliers.find(s => s.id === order.supplier_id)?.contactPerson || 'N/A')}</Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Date</Typography>
            <Typography variant="body1">
              {order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Amount</Typography>
            <Typography variant="body1">₱{order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
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
            <Typography variant="subtitle1" fontWeight="bold">Status</Typography>
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel id="order-status-label">Order Status</InputLabel>
              <Select
                labelId="order-status-label"
                value={selectedStatus}
                onChange={handleStatusChange}
                label="Order Status"
              >
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Partially Paid">Partially Paid</MenuItem>
                <MenuItem value="Shipped">Shipped</MenuItem>
                <MenuItem value="Received">Received</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Notes</Typography>
            <Typography variant="body1">{order.notes || 'No notes available'}</Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">Order Items</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Item</strong></TableCell>
                    <TableCell><strong>Quantity</strong></TableCell>
                    <TableCell><strong>Unit Price</strong></TableCell>
                    <TableCell><strong>Total Price</strong></TableCell>
                    <TableCell><strong>Expected Delivery</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.inventory_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₱{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>₱{item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        {item.expected_delivery_date 
                          ? new Date(item.expected_delivery_date).toLocaleDateString() 
                          : 'Not specified'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right"><strong>Total:</strong></TableCell>
                    <TableCell colSpan={2}>
                      <strong>₱{order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          
          {order.status === 'Shipped' && (
            <Box sx={{ mt: 3 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleReceiveItems}
                fullWidth
              >
                Receive Items & Update Inventory
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This will add all items to inventory and change order status to "Received".
              </Typography>
            </Box>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Payment Summary</Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Total Amount:</Typography>
                <Typography variant="body1" fontWeight="bold">₱{order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Paid Amount:</Typography>
                <Typography variant="body1" color="success.main">₱{(order.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1">Remaining Balance:</Typography>
                <Typography variant="body1" color={order.remaining_amount && order.remaining_amount > 0 ? 'error.main' : 'success.main'} fontWeight="bold">
                  ₱{(order.remaining_amount || order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                if (order.id && paymentPlan !== order.payment_plan) {
                  onStatusChange(order.id, order.status);
                  // Update payment plan through a different mechanism
                  // For now, we'll just refresh the orders which will update the UI
                  dispatch(fetchSupplierOrders());
                }
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
              onClick={handleRecordPayment}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSaveStatus} 
          variant="contained" 
          color="primary"
          disabled={order.status === selectedStatus}
          sx={{ mr: 1 }}
        >
          Save Changes
        </Button>
        {onGeneratePDF && (
          <Button
            startIcon={<PdfIcon />}
            onClick={() => onGeneratePDF(order)}
            variant="outlined"
            color="secondary"
          >
            Generate PDF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Quotation Dialog component
interface QuotationDialogProps {
  open: boolean;
  onClose: () => void;
  quotation: QuotationRequest | null;
  onStatusChange: (requestId: number, status: string) => void;
  onCreateOrderFromQuotation: (quotationId: number) => void;
  suppliers?: Supplier[];
  inventoryItems?: InventoryItem[];
  onGeneratePDF?: (quotation: QuotationRequest) => void;
}

const QuotationDialog: React.FC<QuotationDialogProps> = ({
  open,
  onClose,
  quotation,
  onStatusChange,
  onCreateOrderFromQuotation,
  suppliers = [],
  inventoryItems = [],
  onGeneratePDF
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    if (quotation && open) {
      setSelectedStatus(quotation.status);
    }
  }, [quotation, open]);

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setSelectedStatus(event.target.value);
  };

  const handleSaveStatus = () => {
    if (quotation && selectedStatus && quotation.status !== selectedStatus) {
      onStatusChange(quotation.id!, selectedStatus);
      onClose();
    } else {
      onClose();
    }
  };

  if (!quotation) return null;

  const getChipColor = (status: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'sent':
        return 'info';
      case 'pending':
        return 'warning';
      case 'received':
        return 'success';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Request for Quotation: {quotation.request_id}
        <Chip 
          label={quotation.status} 
          color={getChipColor(quotation.status)}
          size="small"
          sx={{ ml: 2 }}
        />
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">Supplier</Typography>
          <Typography variant="body1">{quotation.suppliers?.name || (suppliers.find(s => s.id === quotation.supplier_id)?.name || 'N/A')}</Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">Contact Person</Typography>
          <Typography variant="body1">{quotation.suppliers?.contactPerson || (suppliers.find(s => s.id === quotation.supplier_id)?.contactPerson || 'N/A')}</Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">Date</Typography>
          <Typography variant="body1">
            {quotation.date ? new Date(quotation.date).toLocaleDateString() : 'N/A'}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">Status</Typography>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="quotation-status-label">Quotation Status</InputLabel>
            <Select
              labelId="quotation-status-label"
              value={selectedStatus}
              onChange={handleStatusChange}
              label="Quotation Status"
            >
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Sent">Sent</MenuItem>
              <MenuItem value="Received">Received</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
              <MenuItem value="Converted">Converted to Order</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">Notes</Typography>
          <Typography variant="body1">{quotation.notes || 'No notes available'}</Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">Requested Items</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Item</strong></TableCell>
                  <TableCell><strong>Quantity</strong></TableCell>
                  <TableCell><strong>Expected Price</strong></TableCell>
                  <TableCell><strong>Notes</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quotation.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.inventory_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {item.expected_price 
                        ? `₱${item.expected_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        : 'To be quoted'}
                    </TableCell>
                    <TableCell>{item.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        
        {quotation.status === 'Received' && (
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => onCreateOrderFromQuotation(quotation.id!)}
              fullWidth
            >
              Create Purchase Order
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSaveStatus} 
          variant="contained" 
          color="primary"
          disabled={quotation.status === selectedStatus}
          sx={{ mr: 1 }}
        >
          Save Changes
        </Button>
        {onGeneratePDF && (
          <Button
            startIcon={<PdfIcon />}
            onClick={() => onGeneratePDF(quotation)}
            variant="outlined"
            color="secondary"
          >
            Generate PDF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// Main component
const OrderSupplier: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const suppliers = useSelector(selectAllSuppliers);
  const inventoryItems = useSelector(selectAllInventoryItems);
  const supplierOrders = useSelector(selectAllSupplierOrders);
  const quotationRequests = useSelector(selectAllQuotationRequests);
  
  const suppliersLoading = useSelector(selectSuppliersStatus) === 'loading';
  const inventoryLoading = useSelector(selectInventoryLoading);
  const orderSupplierLoading = useSelector(selectOrderSupplierLoading);
  const loading = suppliersLoading || inventoryLoading || orderSupplierLoading;
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRequest | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    dispatch(fetchSuppliers());
    dispatch(fetchInventory());
    dispatch(fetchSupplierOrders());
    dispatch(fetchQuotationRequests());
  }, [dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filterOrders = (orders: SupplierOrder[]) => {
    if (!searchTerm.trim()) return orders;
    
    const searchLower = searchTerm.toLowerCase();
    return orders.filter(order => {
      const orderIdMatch = order.order_id.toLowerCase().includes(searchLower);
      const supplierMatch = suppliers.find(s => s.id === order.supplier_id)?.name.toLowerCase().includes(searchLower) || false;
      const statusMatch = order.status.toLowerCase().includes(searchLower);
      
      return orderIdMatch || supplierMatch || statusMatch;
    });
  };
  
  const filterQuotations = (quotations: QuotationRequest[]) => {
    if (!searchTerm.trim()) return quotations;
    
    const searchLower = searchTerm.toLowerCase();
    return quotations.filter(quotation => {
      const requestIdMatch = quotation.request_id.toLowerCase().includes(searchLower);
      const supplierMatch = suppliers.find(s => s.id === quotation.supplier_id)?.name.toLowerCase().includes(searchLower) || false;
      const statusMatch = quotation.status.toLowerCase().includes(searchLower);
      
      return requestIdMatch || supplierMatch || statusMatch;
    });
  };

  const handleViewOrderDetails = (order: SupplierOrder) => {
    // Enrich order with supplier details if not already present
    const supplierData = suppliers.find(s => s.id === order.supplier_id);
    const enrichedOrder = {
      ...order,
      suppliers: order.suppliers || (supplierData 
        ? {
            id: supplierData?.id || 0,
            name: supplierData?.name || '',
            contactPerson: supplierData?.contactPerson,
            email: supplierData?.email || undefined,
            phone: supplierData?.phone || undefined,
            address: supplierData?.address || undefined,
            paymentTerms: supplierData?.paymentTerms || undefined
          } as OrderSupplierServiceSupplier
        : undefined)
    };
    setSelectedOrder(enrichedOrder);
    setOrderDialogOpen(true);
  };
  
  const handleViewQuotationDetails = (quotation: QuotationRequest) => {
    // Enrich quotation with supplier details if not already present
    const supplierData = suppliers.find(s => s.id === quotation.supplier_id);
    const enrichedQuotation = {
      ...quotation,
      suppliers: quotation.suppliers || (supplierData 
        ? {
            id: supplierData?.id || 0,
            name: supplierData?.name || '',
            contactPerson: supplierData?.contactPerson,
            email: supplierData?.email || undefined,
            phone: supplierData?.phone || undefined,
            address: supplierData?.address || undefined,
            paymentTerms: supplierData?.paymentTerms || undefined
          } as OrderSupplierServiceSupplier
        : undefined)
    };
    setSelectedQuotation(enrichedQuotation);
    setQuotationDialogOpen(true);
  };

  const handleCloseOrderDialog = () => {
    setOrderDialogOpen(false);
    setSelectedOrder(null);
  };
  
  const handleCloseQuotationDialog = () => {
    setQuotationDialogOpen(false);
    setSelectedQuotation(null);
  };

  const handleOrderStatusChange = (orderId: number, newStatus: string, paymentPlan?: string) => {
    const updateData: any = {
      status: newStatus
    };
    
    if (paymentPlan !== undefined) {
      updateData.payment_plan = paymentPlan;
    }
    
    dispatch(updateSupplierOrder({ id: orderId, data: updateData }))
      .unwrap()
      .then(() => {
        setSnackbar({
          open: true,
          message: `Order updated successfully`,
          severity: 'success'
        });
        dispatch(fetchSupplierOrders());
      })
      .catch(error => {
        setSnackbar({
          open: true,
          message: `Error updating order: ${error}`,
          severity: 'error'
        });
      });
  };
  
  const handleQuotationStatusChange = (requestId: number, newStatus: string) => {
    dispatch(updateQuotationRequest({ id: requestId, data: { status: newStatus } }))
      .unwrap()
      .then(() => {
        setSnackbar({
          open: true,
          message: `Quotation status changed to ${newStatus}`,
          severity: 'success'
        });
        dispatch(fetchQuotationRequests());
      })
      .catch(error => {
        setSnackbar({
          open: true,
          message: `Error updating quotation: ${error}`,
          severity: 'error'
        });
      });
  };
  
  const handleAddOrderPayment = (payment: { 
    order_id: number; 
    amount: number; 
    payment_date: string; 
    payment_method: string; 
    notes?: string 
  }) => {
    dispatch(addOrderPayment(payment))
      .unwrap()
      .then(() => {
        setSnackbar({
          open: true,
          message: `Payment recorded successfully`,
          severity: 'success'
        });
        dispatch(fetchSupplierOrders());
      })
      .catch(error => {
        setSnackbar({
          open: true,
          message: `Error recording payment: ${error}`,
          severity: 'error'
        });
      });
  };
  
  const handleCreateOrderFromQuotation = (quotationId: number) => {
    dispatch(createOrderFromQuotation(quotationId))
      .unwrap()
      .then(() => {
        setSnackbar({
          open: true,
          message: `Purchase order created successfully`,
          severity: 'success'
        });
        dispatch(fetchQuotationRequests());
        dispatch(fetchSupplierOrders());
        handleCloseQuotationDialog();
      })
      .catch(error => {
        setSnackbar({
          open: true,
          message: `Error creating order: ${error}`,
          severity: 'error'
        });
      });
  };

  // Edit and Delete Functions for Purchase Orders
  const [editOrderDialogOpen, setEditOrderDialogOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<SupplierOrder | null>(null);
  const [deleteOrderConfirmOpen, setDeleteOrderConfirmOpen] = useState(false);
  const [orderIdToDelete, setOrderIdToDelete] = useState<number | null>(null);

  const handleEditOrder = (order: SupplierOrder) => {
    // Deep copy the order to avoid reference issues
    setOrderToEdit({...order, items: [...order.items]});
    // Open edit dialog with current order data
    setEditOrderDialogOpen(true);
  };

  // For managing edited items
  const [currentEditItem, setCurrentEditItem] = useState<{
    index: number;
    inventory_id: number;
    quantity: number;
    unit_price: number;
    expected_delivery_date?: string;
  } | null>(null);

  const handleEditOrderItem = (item: SupplierOrderItem, index: number) => {
    setCurrentEditItem({
      index,
      inventory_id: item.inventory_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      expected_delivery_date: item.expected_delivery_date
    });
  };

  const handleUpdateOrderItem = () => {
    if (!currentEditItem || !orderToEdit) return;
    
    const selectedItem = inventoryItems.find(item => item.id === currentEditItem.inventory_id);
    if (!selectedItem) return;
    
    const updatedItems = [...orderToEdit.items];
    updatedItems[currentEditItem.index] = {
      ...updatedItems[currentEditItem.index],
      inventory_id: currentEditItem.inventory_id,
      inventory_name: selectedItem.itemName,
      quantity: currentEditItem.quantity,
      unit_price: currentEditItem.unit_price,
      total_price: currentEditItem.quantity * currentEditItem.unit_price,
      expected_delivery_date: currentEditItem.expected_delivery_date
    };

    // Calculate new total amount
    const newTotalAmount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    setOrderToEdit({
      ...orderToEdit,
      items: updatedItems,
      total_amount: newTotalAmount,
      remaining_amount: orderToEdit.paid_amount ? newTotalAmount - orderToEdit.paid_amount : newTotalAmount
    });
    
    setCurrentEditItem(null);
  };

  const handleCancelEditItem = () => {
    setCurrentEditItem(null);
  };

  const handleSaveEditedOrder = async (editedOrder: UpdateSupplierOrder) => {
    if (!orderToEdit || !orderToEdit.id) return;
    
    // Prepare updated order data
    const updatedOrder: UpdateSupplierOrder = {
      ...editedOrder,
      total_amount: orderToEdit.total_amount,
      remaining_amount: orderToEdit.remaining_amount
    };
    
    try {
      // First update the order
      await dispatch(updateSupplierOrder({ 
        id: orderToEdit.id, 
        data: updatedOrder 
      })).unwrap();
      
      // Then update all the order items if any have changed
      // Note: In a real application, this would be handled in a transaction in the backend
      // For this example, we're just updating each item separately
      for (let i = 0; i < orderToEdit.items.length; i++) {
        const item = orderToEdit.items[i];
        if (item.id) {
          // Update existing item
          // Note: This would require an additional API endpoint for updating order items
          // For this example, we'll assume it's handled by the backend when updating the order
        }
      }
      
      setSnackbar({
        open: true,
        message: "Purchase order updated successfully",
        severity: 'success'
      });
      
      // Refresh orders list and close dialog
      dispatch(fetchSupplierOrders());
      setEditOrderDialogOpen(false);
      setOrderToEdit(null);
    } catch (error) {
      console.error('Error updating purchase order:', error);
      setSnackbar({
        open: true,
        message: `Error updating purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleDeleteOrder = (orderId: number) => {
    setOrderIdToDelete(orderId);
    setDeleteOrderConfirmOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderIdToDelete) return;
    
    try {
      await dispatch(deleteSupplierOrder(orderIdToDelete)).unwrap();
      
      setSnackbar({
        open: true,
        message: "Purchase order deleted successfully",
        severity: 'success'
      });
      
      // Refresh orders list and close dialog
      dispatch(fetchSupplierOrders());
      setDeleteOrderConfirmOpen(false);
      setOrderIdToDelete(null);
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      setSnackbar({
        open: true,
        message: `Error deleting purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  // Edit and Delete Functions for Quotation Requests
  const [editQuotationDialogOpen, setEditQuotationDialogOpen] = useState(false);
  const [quotationToEdit, setQuotationToEdit] = useState<QuotationRequest | null>(null);
  const [deleteQuotationConfirmOpen, setDeleteQuotationConfirmOpen] = useState(false);
  const [quotationIdToDelete, setQuotationIdToDelete] = useState<number | null>(null);

  const handleEditQuotation = (quotation: QuotationRequest) => {
    // Deep copy the quotation to avoid reference issues
    setQuotationToEdit({...quotation, items: [...quotation.items]});
    // Open edit dialog with current quotation data
    setEditQuotationDialogOpen(true);
  };

  // For managing edited quotation items
  const [currentEditQuotationItem, setCurrentEditQuotationItem] = useState<{
    index: number;
    inventory_id: number;
    quantity: number;
    expected_price?: number;
    notes?: string;
  } | null>(null);

  const handleEditQuotationItem = (item: QuotationItem, index: number) => {
    setCurrentEditQuotationItem({
      index,
      inventory_id: item.inventory_id,
      quantity: item.quantity,
      expected_price: item.expected_price,
      notes: item.notes
    });
  };

  const handleUpdateQuotationItem = () => {
    if (!currentEditQuotationItem || !quotationToEdit) return;
    
    const selectedItem = inventoryItems.find(item => item.id === currentEditQuotationItem.inventory_id);
    if (!selectedItem) return;
    
    const updatedItems = [...quotationToEdit.items];
    updatedItems[currentEditQuotationItem.index] = {
      ...updatedItems[currentEditQuotationItem.index],
      inventory_id: currentEditQuotationItem.inventory_id,
      inventory_name: selectedItem.itemName,
      quantity: currentEditQuotationItem.quantity,
      expected_price: currentEditQuotationItem.expected_price,
      notes: currentEditQuotationItem.notes
    };
    
    setQuotationToEdit({
      ...quotationToEdit,
      items: updatedItems
    });
    
    setCurrentEditQuotationItem(null);
  };

  const handleCancelEditQuotationItem = () => {
    setCurrentEditQuotationItem(null);
  };

  const handleSaveEditedQuotation = async (editedQuotation: UpdateQuotationRequest) => {
    if (!quotationToEdit || !quotationToEdit.id) return;
    
    try {
      // Update the quotation request
      await dispatch(updateQuotationRequest({ 
        id: quotationToEdit.id, 
        data: editedQuotation 
      })).unwrap();
      
      // In a real application, we would also update the items here
      // For this example, we'll assume the backend handles it
      
      setSnackbar({
        open: true,
        message: "Quotation request updated successfully",
        severity: 'success'
      });
      
      // Refresh quotations list and close dialog
      dispatch(fetchQuotationRequests());
      setEditQuotationDialogOpen(false);
      setQuotationToEdit(null);
    } catch (error) {
      console.error('Error updating quotation request:', error);
      setSnackbar({
        open: true,
        message: `Error updating quotation request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleDeleteQuotation = (quotationId: number) => {
    setQuotationIdToDelete(quotationId);
    setDeleteQuotationConfirmOpen(true);
  };

  const confirmDeleteQuotation = async () => {
    if (!quotationIdToDelete) return;
    
    try {
      await dispatch(deleteQuotationRequest(quotationIdToDelete)).unwrap();
      
      setSnackbar({
        open: true,
        message: "Quotation request deleted successfully",
        severity: 'success'
      });
      
      // Refresh quotations list and close dialog
      dispatch(fetchQuotationRequests());
      setDeleteQuotationConfirmOpen(false);
      setQuotationIdToDelete(null);
    } catch (error) {
      console.error('Error deleting quotation request:', error);
      setSnackbar({
        open: true,
        message: `Error deleting quotation request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleRefresh = () => {
    dispatch(fetchSuppliers());
    dispatch(fetchInventory());
    dispatch(fetchSupplierOrders());
    dispatch(fetchQuotationRequests());
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // Function to generate PDF for Purchase Order
  const handleGeneratePurchaseOrderPDF = (order: SupplierOrder) => {
    // Get supplier details
    const supplier = suppliers.find(s => s.id === order.supplier_id);
    
    try {
      // Create new jsPDF instance (A4 page)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set some basic styles and colors
      const textColor = '#333333';
      const primaryColor = '#1976d2';
      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'normal');

      // Add title - left aligned but balanced
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(primaryColor);
      doc.text('PURCHASE ORDER', 20, 20);
      
      // Add company name and document ID
      doc.setFontSize(12);
      doc.text("Opzon's Printers", 20, 30);
      doc.setTextColor(textColor);
      doc.text(`Order ID: ${order.order_id}`, 200, 20, { align: 'right' });
      doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, 200, 25, { align: 'right' });
      
      // Draw a line separator
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.5);
      doc.line(10, 35, 200, 35);
      
      // Company and Supplier Information
      const leftColX = 15;
      let yPos = 45;
      
      // Company info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor);
      doc.text('FROM:', leftColX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor);
      doc.setFontSize(10);
      yPos += 6;
      doc.text("Opzon's Printers", leftColX, yPos);
      yPos += 5;
      doc.text("123 Printing Avenue", leftColX, yPos);
      yPos += 5;
      doc.text("Makati City, Philippines", leftColX, yPos);
      yPos += 5;
      doc.text("Phone: (02) 1234-5678", leftColX, yPos);
      yPos += 5;
      doc.text("Email: info@opzonsprinters.com", leftColX, yPos);
      
      // Supplier info
      const rightColX = 110;
      yPos = 45;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('TO:', rightColX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor);
      yPos += 6;
      doc.text(supplier?.name || 'N/A', rightColX, yPos);
      yPos += 5;
      doc.text(`Contact: ${supplier?.contactPerson || 'N/A'}`, rightColX, yPos);
      yPos += 5;
      doc.text(`Phone: ${supplier?.phone || 'N/A'}`, rightColX, yPos);
      yPos += 5;
      doc.text(`Email: ${supplier?.email || 'N/A'}`, rightColX, yPos);
      yPos += 5;
      doc.text(`Address: ${supplier?.address || 'N/A'}`, rightColX, yPos);
      
      // Order information
      yPos = 85;
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(10, yPos, 190, 20, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      yPos += 5;
      doc.text('ORDER INFORMATION:', 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor);
      yPos += 5;
      doc.text(`Status: ${order.status}`, 15, yPos);
      doc.text(`Payment Terms: ${supplier?.paymentTerms || 'Net 30 days'}`, 100, yPos);
      yPos += 5;
      doc.text(`Notes: ${order.notes || 'N/A'}`, 15, yPos);
      
      // Order items table
      yPos = 115;
      
      // Transform order items array to table format for jspdf-autotable
      const tableHeaders = [
        { header: 'Item Description', dataKey: 'inventory_name' as const },
        { header: 'Quantity', dataKey: 'quantity' as const },
        { header: 'Unit Price', dataKey: 'unit_price' as const },
        { header: 'Total Price', dataKey: 'total_price' as const },
        { header: 'Expected Delivery', dataKey: 'expected_delivery_date' as const }
      ];
      
      const tableRows = order.items.map(item => ({
        inventory_name: item.inventory_name,
        quantity: item.quantity.toString(),
        unit_price: item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        total_price: item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        expected_delivery_date: item.expected_delivery_date 
          ? new Date(item.expected_delivery_date).toLocaleDateString() 
          : 'Not specified'
      }));
      
      // Draw the table
      autoTable(doc, {
        startY: yPos,
        head: [tableHeaders.map(h => h.header)],
        body: tableRows.map(row => 
          tableHeaders.map(h => {
            const key = h.dataKey;
            return row[key] || '';
          })
        ),
        theme: 'grid',
        headStyles: {
          fillColor: [25, 118, 210],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' }, 
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 40 }
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });
      
      // Get the final Y position after the table
      const finalY = (doc as any).__autoTableLastHookData?.finalY;
      yPos = finalY ? finalY + 10 : yPos + 40;
      
      // Add totals without currency symbols
      doc.setFontSize(10);
      doc.text('Subtotal:', 140, yPos);
      doc.text(order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), 190, yPos, { align: 'right' });
      yPos += 5;
      doc.text('Tax:', 140, yPos);
      doc.text('0.00', 190, yPos, { align: 'right' });
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Grand Total:', 140, yPos);
      doc.text(order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), 190, yPos, { align: 'right' });
      
      if (order.paid_amount !== undefined) {
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.text('Paid Amount:', 140, yPos);
        doc.text(order.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), 190, yPos, { align: 'right' });
      }
      
      if (order.remaining_amount !== undefined) {
        yPos += 5;
        doc.text('Remaining Balance:', 140, yPos);
        doc.text(order.remaining_amount.toLocaleString(undefined, { minimumFractionDigits: 2 }), 190, yPos, { align: 'right' });
      }
      
      // Signatures
      yPos += 20;
      doc.setDrawColor(100, 100, 100);
      doc.line(30, yPos + 15, 80, yPos + 15);
      doc.line(120, yPos + 15, 170, yPos + 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Approved by:', 30, yPos);
      doc.text('Accepted by:', 120, yPos);
      
      doc.text('Authorized Signature', 55, yPos + 20, { align: 'center' });
      doc.text('Supplier Signature', 145, yPos + 20, { align: 'center' });
      
      doc.text('Purchasing Manager', 55, yPos + 25, { align: 'center' });
      doc.text('Date: ________________', 145, yPos + 25, { align: 'center' });
      
      // Footer
      yPos = 270;
      doc.setDrawColor(180, 180, 180);
      doc.line(10, yPos, 200, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('This is a computer-generated document. No signature is required.', 105, yPos, { align: 'center' });
      yPos += 4;
      doc.text('For questions regarding this purchase order, please contact our purchasing department.', 105, yPos, { align: 'center' });
      
      // Save the PDF
      doc.save(`PurchaseOrder_${order.order_id}.pdf`);
      
      // Show success message
      setSnackbar({
        open: true,
        message: `Downloaded Purchase Order ${order.order_id}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setSnackbar({
        open: true,
        message: `Error generating PDF: ${error}`,
        severity: 'error'
      });
    }
  };


  const [purchaseOrderDialogOpen, setPurchaseOrderDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderItems, setOrderItems] = useState<{
    inventory_id: number;
    inventory_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    expected_delivery_date?: string;
  }[]>([]);
  const [currentItem, setCurrentItem] = useState<{
    inventory_id: number;
    quantity: number;
    unit_price: number;
    expected_delivery_date?: string;
  }>({
    inventory_id: 0,
    quantity: 1,
    unit_price: 0
  });

  const handleCreatePurchaseOrder = () => {
    setPurchaseOrderDialogOpen(true);
  };

  const handleClosePurchaseOrderDialog = () => {
    setPurchaseOrderDialogOpen(false);
    setSelectedSupplier('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setOrderNotes('');
    setOrderItems([]);
    setCurrentItem({
      inventory_id: 0,
      quantity: 1,
      unit_price: 0
    });
  };

  const handleAddOrderItem = () => {
    if (currentItem.inventory_id === 0) {
      setSnackbar({
        open: true,
        message: "Please select an inventory item",
        severity: 'error'
      });
      return;
    }

    if (currentItem.quantity <= 0) {
      setSnackbar({
        open: true,
        message: "Quantity must be greater than 0",
        severity: 'error'
      });
      return;
    }

    if (currentItem.unit_price <= 0) {
      setSnackbar({
        open: true,
        message: "Unit price must be greater than 0",
        severity: 'error'
      });
      return;
    }

    const selectedItem = inventoryItems.find(item => item.id === currentItem.inventory_id);
    
    if (!selectedItem) {
      setSnackbar({
        open: true,
        message: "Selected inventory item not found",
        severity: 'error'
      });
      return;
    }

    const newItem = {
      inventory_id: currentItem.inventory_id,
      inventory_name: selectedItem.itemName,
      quantity: currentItem.quantity,
      unit_price: currentItem.unit_price,
      total_price: currentItem.quantity * currentItem.unit_price,
      expected_delivery_date: currentItem.expected_delivery_date
    };

    setOrderItems([...orderItems, newItem]);
    setCurrentItem({
      inventory_id: 0,
      quantity: 1,
      unit_price: 0
    });
  };

  const handleRemoveOrderItem = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems.splice(index, 1);
    setOrderItems(updatedItems);
  };

  const handleSubmitPurchaseOrder = async () => {
    if (!selectedSupplier) {
      setSnackbar({
        open: true,
        message: "Please select a supplier",
        severity: 'error'
      });
      return;
    }

    if (orderItems.length === 0) {
      setSnackbar({
        open: true,
        message: "Please add at least one item to the order",
        severity: 'error'
      });
      return;
    }

    try {
      // Generate order ID
      const orderIdPrefix = `PO-${new Date().getFullYear()}-`;
      const orderNumber = Math.floor(Math.random() * 9000) + 1000; // Simple random number for demo
      const orderId = `${orderIdPrefix}${orderNumber}`;

      // Calculate total amount
      const totalAmount = orderItems.reduce((sum, item) => sum + item.total_price, 0);

      // Prepare order data
      const orderData: CreateSupplierOrder = {
        order_id: orderId,
        supplier_id: Number(selectedSupplier),
        date: orderDate,
        status: 'Pending',
        total_amount: totalAmount,
        remaining_amount: totalAmount,
        notes: orderNotes,
        items: orderItems
      };

      // Create the order
      await dispatch(createSupplierOrder(orderData)).unwrap();

      // Show success message
      setSnackbar({
        open: true,
        message: "Purchase order created successfully",
        severity: 'success'
      });

      // Close dialog and reset form
      handleClosePurchaseOrderDialog();

      // Refresh orders list
      dispatch(fetchSupplierOrders());
    } catch (error) {
      console.error('Error creating purchase order:', error);
      setSnackbar({
        open: true,
        message: `Error creating purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };
  
  // Function to generate PDF for RFQ
  const handleGenerateRFQPDF = (quotation: QuotationRequest) => {
    // Get supplier details
    const supplier = suppliers.find(s => s.id === quotation.supplier_id);
    
    try {
      // Create new jsPDF instance (A4 page)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Set some basic styles and colors
      const textColor = '#333333';
      const primaryColor = '#1976d2';
      doc.setTextColor(textColor);
      doc.setFont('helvetica', 'normal');
      
      // Add title - left aligned but balanced
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(primaryColor);
      doc.text('REQUEST FOR QUOTATION', 20, 20);
      
      // Add company name and document ID
      doc.setFontSize(12);
      doc.text("Opzon's Printers", 20, 30);
      doc.setTextColor(textColor);
      doc.text(`RFQ ID: ${quotation.request_id}`, 200, 20, { align: 'right' });
      doc.text(`Date: ${new Date(quotation.date).toLocaleDateString()}`, 200, 25, { align: 'right' });
      
      // Draw a line separator
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.5);
      doc.line(10, 35, 200, 35);
      
      // Company and Supplier Information
      const leftColX = 15;
      let yPos = 45;
      
      // Company info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor);
      doc.text('FROM:', leftColX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor);
      doc.setFontSize(10);
      yPos += 6;
      doc.text("Opzon's Printers", leftColX, yPos);
      yPos += 5;
      doc.text("123 Printing Avenue", leftColX, yPos);
      yPos += 5;
      doc.text("Makati City, Philippines", leftColX, yPos);
      yPos += 5;
      doc.text("Phone: (02) 1234-5678", leftColX, yPos);
      yPos += 5;
      doc.text("Email: info@opzonsprinters.com", leftColX, yPos);
      
      // Supplier info
      const rightColX = 110;
      yPos = 45;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('TO:', rightColX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor);
      yPos += 6;
      doc.text(supplier?.name || 'N/A', rightColX, yPos);
      yPos += 5;
      doc.text(`Contact: ${supplier?.contactPerson || 'N/A'}`, rightColX, yPos);
      yPos += 5;
      doc.text(`Phone: ${supplier?.phone || 'N/A'}`, rightColX, yPos);
      yPos += 5;
      doc.text(`Email: ${supplier?.email || 'N/A'}`, rightColX, yPos);
      yPos += 5;
      doc.text(`Address: ${supplier?.address || 'N/A'}`, rightColX, yPos);
      
      // RFQ Information
      yPos = 85;
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(10, yPos, 190, 25, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      yPos += 5;
      doc.text('RFQ INFORMATION:', 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor);
      yPos += 5;
      doc.text(`Status: ${quotation.status}`, 15, yPos);
      
      // Calculate response date (7 days from quotation date)
      const responseDate = new Date(new Date(quotation.date).getTime() + 7 * 24 * 60 * 60 * 1000);
      doc.text(`Response Required By: ${responseDate.toLocaleDateString()}`, 100, yPos);
      
      yPos += 5;
      doc.text(`Reference: RFQ-${new Date().getFullYear()}-${quotation.id}`, 15, yPos);
      yPos += 5;
      doc.text(`Notes: ${quotation.notes || 'N/A'}`, 15, yPos);
      
      // Terms and Conditions
      yPos = 120;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.setFontSize(11);
      doc.text('Terms and Conditions:', 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor);
      doc.setFontSize(9);
      yPos += 6;
      doc.text('1. Please quote your lowest price for the items specified.', 15, yPos);
      yPos += 5;
      doc.text('2. The quotation should include delivery timeframe, payment terms, and any applicable warranties.', 15, yPos);
      yPos += 5;
      doc.text('3. Prices quoted should be valid for at least 30 days from the date of submission.', 15, yPos);
      yPos += 5;
      doc.text('4. Please indicate delivery lead time for each item quoted.', 15, yPos);
      yPos += 5;
      doc.text('5. Opzon\'s Printers reserves the right to accept or reject any quotation either in whole or in part.', 15, yPos);
      yPos += 5;
      doc.text('6. Please attach detailed specifications, brochures, or samples if available.', 15, yPos);
      
      // RFQ Description
      yPos += 10;
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(249, 249, 249);
      doc.roundedRect(10, yPos, 190, 15, 2, 2, 'F');
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'We kindly request your best quotation for the following items. Please complete the pricing information and return this document at your earliest convenience. Your prompt response will be greatly appreciated.',
        105, yPos, { align: 'center', maxWidth: 180 }
      );
      
      // Items table
      yPos = 175;
      
      // Transform quotation items array to table format
      const tableHeaders = [
        { header: 'Item Description', dataKey: 'inventory_name' as const },
        { header: 'Quantity', dataKey: 'quantity' as const },
        { header: 'Unit', dataKey: 'unit' as const },
        { header: 'Expected Price', dataKey: 'expected_price' as const },
        { header: 'Quoted Price', dataKey: 'quoted_price' as const },
        { header: 'Total', dataKey: 'total' as const }
      ];
      
      const tableRows = quotation.items.map(item => ({
        inventory_name: item.inventory_name,
        quantity: item.quantity.toString(),
        unit: 'Pcs',
        expected_price: item.expected_price 
          ? item.expected_price.toLocaleString(undefined, { minimumFractionDigits: 2 })
          : 'To be quoted',
        quoted_price: '________',
        total: '________'
      }));
      
      // Add summary rows
      tableRows.push(
        {
          inventory_name: '',
          quantity: '',
          unit: '',
          expected_price: 'Subtotal:',
          quoted_price: '',
          total: '________'
        },
        {
          inventory_name: '',
          quantity: '',
          unit: '',
          expected_price: 'Tax:',
          quoted_price: '',
          total: '________'
        },
        {
          inventory_name: '',
          quantity: '',
          unit: '',
          expected_price: 'Grand Total:',
          quoted_price: '',
          total: '________'
        }
      );
      
      // Draw the table
      autoTable(doc, {
        startY: yPos,
        head: [tableHeaders.map(h => h.header)],
        body: tableRows.map(row => 
          tableHeaders.map(h => {
            const key = h.dataKey;
            return row[key] || '';
          })
        ),
        theme: 'grid',
        headStyles: {
          fillColor: [25, 118, 210],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'center' },
          5: { cellWidth: 30, halign: 'center' }
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        // Special style for the summary rows using didParseCell hook
        didParseCell: function(data) {
          if (data.row.index >= quotation.items.length && data.cell) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      
      // Get the final Y position after the table
      const finalY = (doc as any).__autoTableLastHookData?.finalY;
      yPos = finalY ? finalY + 15 : yPos + 40;
      
      // Signatures
      // Add a header for the signature section
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.setFontSize(11);
      doc.text('Signatures:', 15, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textColor);
      
      // Add more spacing before signature lines
      yPos += 15;
      
      doc.setDrawColor(100, 100, 100);
      doc.line(30, yPos + 15, 80, yPos + 15);
      doc.line(120, yPos + 15, 170, yPos + 15);
      
      doc.setFontSize(9);
      doc.text('Requested by:', 30, yPos);
      
      doc.text('Authorized Signature', 55, yPos + 20, { align: 'center' });
      doc.text('Supplier Signature', 145, yPos + 20, { align: 'center' });
      
      doc.text('Purchasing Officer', 55, yPos + 25, { align: 'center' });
      doc.text('Date: ________________', 145, yPos + 25, { align: 'center' });
      
      // Footer
      yPos = 270;
      doc.setDrawColor(180, 180, 180);
      doc.line(10, yPos, 200, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Please send your quotation to: purchasing@opzonsprinters.com', 105, yPos, { align: 'center' });
      yPos += 4;
      doc.text('For inquiries, contact our purchasing department at (02) 1234-5678', 105, yPos, { align: 'center' });
      
      // Save the PDF
      doc.save(`QuotationRequest_${quotation.request_id}.pdf`);
      
      // Show success message
      setSnackbar({
        open: true,
        message: `Downloaded Request for Quotation ${quotation.request_id}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setSnackbar({
        open: true,
        message: `Error generating PDF: ${error}`,
        severity: 'error'
      });
    }
  };

  // New RFQ Dialog
  const [rfqDialogOpen, setRfqDialogOpen] = useState(false);
  const [rfqSupplier, setRfqSupplier] = useState<number | ''>('');
  const [rfqDate, setRfqDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rfqNotes, setRfqNotes] = useState('');
  const [rfqItems, setRfqItems] = useState<{
    inventory_id: number;
    inventory_name: string;
    quantity: number;
    expected_price?: number;
    notes?: string;
  }[]>([]);
  const [currentRfqItem, setCurrentRfqItem] = useState<{
    inventory_id: number;
    quantity: number;
    expected_price?: number;
    notes?: string;
  }>({
    inventory_id: 0,
    quantity: 1
  });

  const handleCreateQuotationRequest = () => {
    setRfqDialogOpen(true);
  };

  const handleCloseRfqDialog = () => {
    setRfqDialogOpen(false);
    setRfqSupplier('');
    setRfqDate(new Date().toISOString().split('T')[0]);
    setRfqNotes('');
    setRfqItems([]);
    setCurrentRfqItem({
      inventory_id: 0,
      quantity: 1
    });
  };

  const handleAddRfqItem = () => {
    if (currentRfqItem.inventory_id === 0) {
      setSnackbar({
        open: true,
        message: "Please select an inventory item",
        severity: 'error'
      });
      return;
    }

    if (currentRfqItem.quantity <= 0) {
      setSnackbar({
        open: true,
        message: "Quantity must be greater than 0",
        severity: 'error'
      });
      return;
    }

    const selectedItem = inventoryItems.find(item => item.id === currentRfqItem.inventory_id);
    
    if (!selectedItem) {
      setSnackbar({
        open: true,
        message: "Selected inventory item not found",
        severity: 'error'
      });
      return;
    }

    const newItem = {
      inventory_id: currentRfqItem.inventory_id,
      inventory_name: selectedItem.itemName,
      quantity: currentRfqItem.quantity,
      expected_price: currentRfqItem.expected_price,
      notes: currentRfqItem.notes
    };

    setRfqItems([...rfqItems, newItem]);
    setCurrentRfqItem({
      inventory_id: 0,
      quantity: 1
    });
  };

  const handleRemoveRfqItem = (index: number) => {
    const updatedItems = [...rfqItems];
    updatedItems.splice(index, 1);
    setRfqItems(updatedItems);
  };

  const handleSubmitRfq = async () => {
    if (!rfqSupplier) {
      setSnackbar({
        open: true,
        message: "Please select a supplier",
        severity: 'error'
      });
      return;
    }

    if (rfqItems.length === 0) {
      setSnackbar({
        open: true,
        message: "Please add at least one item to the request",
        severity: 'error'
      });
      return;
    }

    try {
      // Generate request ID
      const requestIdPrefix = `RFQ-${new Date().getFullYear()}-`;
      const requestNumber = Math.floor(Math.random() * 9000) + 1000; // Simple random number for demo
      const requestId = `${requestIdPrefix}${requestNumber}`;

      // Prepare request data
      const rfqData: CreateQuotationRequest = {
        request_id: requestId,
        supplier_id: Number(rfqSupplier),
        date: rfqDate,
        status: 'Draft',
        notes: rfqNotes,
        items: rfqItems
      };

      // Create the quotation request
      await dispatch(createQuotationRequest(rfqData)).unwrap();

      // Show success message
      setSnackbar({
        open: true,
        message: "Request for Quotation created successfully",
        severity: 'success'
      });

      // Close dialog and reset form
      handleCloseRfqDialog();

      // Refresh quotation requests list
      dispatch(fetchQuotationRequests());
    } catch (error) {
      console.error('Error creating quotation request:', error);
      setSnackbar({
        open: true,
        message: `Error creating quotation request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const getChipColor = (status: string): 'success' | 'info' | 'warning' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'partially paid':
        return 'warning';
      case 'shipped':
        return 'info';
      case 'received':
        return 'info';
      case 'completed':
        return 'info';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'sent':
        return 'info';
      case 'draft':
        return 'default';
      default:
        return 'default';
    }
  };

  const renderOrdersTable = (orders: SupplierOrder[]) => (
    <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)', mb: 4 }}>
      <Table>
        <TableHead sx={{ backgroundColor: 'background.paper' }}>
          <TableRow>
            <TableCell><strong>Order ID</strong></TableCell>
            <TableCell><strong>Supplier</strong></TableCell>
            <TableCell><strong>Date</strong></TableCell>
            <TableCell><strong>Amount</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filterOrders(orders).length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No purchase orders found
              </TableCell>
            </TableRow>
          ) : (
            filterOrders(orders).map((order) => {
              const supplier = suppliers.find(s => s.id === order.supplier_id);
              return (
                <TableRow key={order.id}>
                  <TableCell>{order.order_id}</TableCell>
                  <TableCell>{supplier?.name || `Supplier ${order.supplier_id}`}</TableCell>
                  <TableCell>
                    {order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>₱{order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Chip 
                      label={order.status} 
                      color={getChipColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small"
                      onClick={() => handleViewOrderDetails(order)}
                      sx={{ mr: 1 }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleEditOrder(order)}
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleDeleteOrder(order.id!)}
                      color="error"
                      sx={{ mr: 1 }}
                    >
                      Delete
                    </Button>
                    <Button
                      size="small"
                      startIcon={<PdfIcon />}
                      onClick={() => handleGeneratePurchaseOrderPDF(order)}
                      color="secondary"
                    >
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  const renderQuotationsTable = (quotations: QuotationRequest[]) => (
    <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)', mb: 4 }}>
      <Table>
        <TableHead sx={{ backgroundColor: 'background.paper' }}>
          <TableRow>
            <TableCell><strong>Request ID</strong></TableCell>
            <TableCell><strong>Supplier</strong></TableCell>
            <TableCell><strong>Date</strong></TableCell>
            <TableCell><strong>Items</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filterQuotations(quotations).length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                No quotation requests found
              </TableCell>
            </TableRow>
          ) : (
            filterQuotations(quotations).map((quotation) => {
              const supplier = suppliers.find(s => s.id === quotation.supplier_id);
              return (
                <TableRow key={quotation.id}>
                  <TableCell>{quotation.request_id}</TableCell>
                  <TableCell>{supplier?.name || `Supplier ${quotation.supplier_id}`}</TableCell>
                  <TableCell>
                    {quotation.date ? new Date(quotation.date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>{quotation.items.length} items</TableCell>
                  <TableCell>
                    <Chip 
                      label={quotation.status} 
                      color={getChipColor(quotation.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small"
                      onClick={() => handleViewQuotationDetails(quotation)}
                      sx={{ mr: 1 }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleEditQuotation(quotation)}
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleDeleteQuotation(quotation.id!)}
                      color="error"
                      sx={{ mr: 1 }}
                    >
                      Delete
                    </Button>
                    <Button
                      size="small"
                      startIcon={<PdfIcon />}
                      onClick={() => handleGenerateRFQPDF(quotation)}
                      color="secondary"
                    >
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Supplier Orders
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={activeTab === 0 ? handleCreatePurchaseOrder : handleCreateQuotationRequest}
            disabled={loading}
            color="primary"
          >
            {activeTab === 0 ? 'New Purchase Order' : 'New RFQ'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          placeholder="Search..."
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
              <Tab label="Purchase Orders" />
              <Tab label="Requests for Quotation" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            {renderOrdersTable(supplierOrders)}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            {renderQuotationsTable(quotationRequests)}
          </TabPanel>
        </>
      )}

      {/* Order Details Dialog */}
      <OrderDetailsDialog 
        open={orderDialogOpen}
        onClose={handleCloseOrderDialog}
        order={selectedOrder}
        onStatusChange={handleOrderStatusChange}
        onAddPayment={handleAddOrderPayment}
        suppliers={suppliers}
        inventoryItems={inventoryItems}
        onGeneratePDF={handleGeneratePurchaseOrderPDF}
      />
      
      {/* Quotation Details Dialog */}
      <QuotationDialog 
        open={quotationDialogOpen}
        onClose={handleCloseQuotationDialog}
        quotation={selectedQuotation}
        onStatusChange={handleQuotationStatusChange}
        onCreateOrderFromQuotation={handleCreateOrderFromQuotation}
        suppliers={suppliers}
        inventoryItems={inventoryItems}
        onGeneratePDF={handleGenerateRFQPDF}
      />

      {/* Create Purchase Order Dialog */}
      <Dialog open={purchaseOrderDialogOpen} onClose={handleClosePurchaseOrderDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Purchase Order</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="supplier-label">Supplier</InputLabel>
                <Select
                  labelId="supplier-label"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value as number | '')}
                  label="Supplier"
                  required
                >
                  <MenuItem value="">
                    <em>Select a supplier</em>
                  </MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Order Date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>

          <TextField
            label="Notes"
            multiline
            rows={3}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
          />
          
          <Typography variant="h6" gutterBottom>Order Items</Typography>
          
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="inventory-item-label">Inventory Item</InputLabel>
                  <Select
                    labelId="inventory-item-label"
                    value={currentItem.inventory_id || ''}
                    onChange={(e) => setCurrentItem({
                      ...currentItem,
                      inventory_id: e.target.value as number
                    })}
                    label="Inventory Item"
                  >
                    <MenuItem value="">
                      <em>Select an item</em>
                    </MenuItem>
                    {inventoryItems.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.itemName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="Quantity"
                  type="number"
                  inputProps={{ min: 1 }}
                  size="small"
                  fullWidth
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({
                    ...currentItem,
                    quantity: parseInt(e.target.value) || 0
                  })}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="Unit Price"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  size="small"
                  fullWidth
                  value={currentItem.unit_price}
                  onChange={(e) => setCurrentItem({
                    ...currentItem,
                    unit_price: parseFloat(e.target.value) || 0
                  })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Expected Delivery Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  fullWidth
                  value={currentItem.expected_delivery_date || ''}
                  onChange={(e) => setCurrentItem({
                    ...currentItem,
                    expected_delivery_date: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={6} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleAddOrderItem}
                  size="small"
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </Paper>
          
          {orderItems.length > 0 ? (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Item</strong></TableCell>
                    <TableCell><strong>Quantity</strong></TableCell>
                    <TableCell><strong>Unit Price</strong></TableCell>
                    <TableCell><strong>Total Price</strong></TableCell>
                    <TableCell><strong>Expected Delivery</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.inventory_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₱{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>₱{item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        {item.expected_delivery_date ? new Date(item.expected_delivery_date).toLocaleDateString() : 'Not specified'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          color="error" 
                          onClick={() => handleRemoveOrderItem(index)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right"><strong>Total:</strong></TableCell>
                    <TableCell colSpan={3}>
                      <strong>₱{orderItems.reduce((sum, item) => sum + item.total_price, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No items added to this order yet. Add items using the form above.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePurchaseOrderDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitPurchaseOrder} 
            variant="contained" 
            color="primary"
            disabled={!selectedSupplier || orderItems.length === 0}
          >
            Create Purchase Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create RFQ Dialog */}
      <Dialog open={rfqDialogOpen} onClose={handleCloseRfqDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Request for Quotation</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="rfq-supplier-label">Supplier</InputLabel>
                <Select
                  labelId="rfq-supplier-label"
                  value={rfqSupplier}
                  onChange={(e) => setRfqSupplier(e.target.value as number | '')}
                  label="Supplier"
                  required
                >
                  <MenuItem value="">
                    <em>Select a supplier</em>
                  </MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Request Date"
                type="date"
                value={rfqDate}
                onChange={(e) => setRfqDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                required
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>

          <TextField
            label="Notes"
            multiline
            rows={3}
            value={rfqNotes}
            onChange={(e) => setRfqNotes(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
          />
          
          <Typography variant="h6" gutterBottom>Requested Items</Typography>
          
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel id="rfq-inventory-item-label">Inventory Item</InputLabel>
                  <Select
                    labelId="rfq-inventory-item-label"
                    value={currentRfqItem.inventory_id || ''}
                    onChange={(e) => setCurrentRfqItem({
                      ...currentRfqItem,
                      inventory_id: e.target.value as number
                    })}
                    label="Inventory Item"
                  >
                    <MenuItem value="">
                      <em>Select an item</em>
                    </MenuItem>
                    {inventoryItems.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.itemName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="Quantity"
                  type="number"
                  inputProps={{ min: 1 }}
                  size="small"
                  fullWidth
                  value={currentRfqItem.quantity}
                  onChange={(e) => setCurrentRfqItem({
                    ...currentRfqItem,
                    quantity: parseInt(e.target.value) || 0
                  })}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Expected Price (optional)"
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  size="small"
                  fullWidth
                  value={currentRfqItem.expected_price || ''}
                  onChange={(e) => setCurrentRfqItem({
                    ...currentRfqItem,
                    expected_price: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  label="Notes"
                  size="small"
                  fullWidth
                  value={currentRfqItem.notes || ''}
                  onChange={(e) => setCurrentRfqItem({
                    ...currentRfqItem,
                    notes: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={6} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleAddRfqItem}
                  size="small"
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </Paper>
          
          {rfqItems.length > 0 ? (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Item</strong></TableCell>
                    <TableCell><strong>Quantity</strong></TableCell>
                    <TableCell><strong>Expected Price</strong></TableCell>
                    <TableCell><strong>Notes</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rfqItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.inventory_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {item.expected_price 
                          ? `₱${item.expected_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : 'To be quoted'
                        }
                      </TableCell>
                      <TableCell>{item.notes || '-'}</TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          color="error" 
                          onClick={() => handleRemoveRfqItem(index)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No items added to this request yet. Add items using the form above.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRfqDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitRfq} 
            variant="contained" 
            color="primary"
            disabled={!rfqSupplier || rfqItems.length === 0}
          >
            Create Request for Quotation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Purchase Order Dialog */}
      <Dialog open={editOrderDialogOpen} onClose={() => setEditOrderDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Purchase Order</DialogTitle>
        <DialogContent>
          {orderToEdit && (
            <>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Order ID"
                    value={orderToEdit.order_id}
                    fullWidth
                    disabled
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="edit-supplier-label">Supplier</InputLabel>
                    <Select
                      labelId="edit-supplier-label"
                      value={orderToEdit.supplier_id}
                      onChange={(e) => setOrderToEdit(prev => prev ? {...prev, supplier_id: e.target.value as number} : null)}
                      label="Supplier"
                      required
                    >
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Order Date"
                    type="date"
                    value={orderToEdit.date}
                    onChange={(e) => setOrderToEdit(prev => prev ? {...prev, date: e.target.value} : null)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    required
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="edit-status-label">Status</InputLabel>
                    <Select
                      labelId="edit-status-label"
                      value={orderToEdit.status}
                      onChange={(e) => setOrderToEdit(prev => prev ? {...prev, status: e.target.value} : null)}
                      label="Status"
                    >
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Approved">Approved</MenuItem>
                      <MenuItem value="Partially Paid">Partially Paid</MenuItem>
                      <MenuItem value="Shipped">Shipped</MenuItem>
                      <MenuItem value="Received">Received</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Payment Plan"
                    value={orderToEdit.payment_plan || ''}
                    onChange={(e) => setOrderToEdit(prev => prev ? {...prev, payment_plan: e.target.value} : null)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Notes"
                multiline
                rows={3}
                value={orderToEdit.notes || ''}
                onChange={(e) => setOrderToEdit(prev => prev ? {...prev, notes: e.target.value} : null)}
                fullWidth
                sx={{ mb: 3 }}
              />
              
              <Typography variant="subtitle1" gutterBottom>
                Order Items
              </Typography>
              
              {currentEditItem ? (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="edit-inventory-item-label">Inventory Item</InputLabel>
                        <Select
                          labelId="edit-inventory-item-label"
                          value={currentEditItem.inventory_id}
                          onChange={(e) => setCurrentEditItem({
                            ...currentEditItem,
                            inventory_id: e.target.value as number
                          })}
                          label="Inventory Item"
                        >
                          {inventoryItems.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.itemName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <TextField
                        label="Quantity"
                        type="number"
                        inputProps={{ min: 1 }}
                        size="small"
                        fullWidth
                        value={currentEditItem.quantity}
                        onChange={(e) => setCurrentEditItem({
                          ...currentEditItem,
                          quantity: parseInt(e.target.value) || 0
                        })}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <TextField
                        label="Unit Price"
                        type="number"
                        inputProps={{ min: 0, step: 0.01 }}
                        size="small"
                        fullWidth
                        value={currentEditItem.unit_price}
                        onChange={(e) => setCurrentEditItem({
                          ...currentEditItem,
                          unit_price: parseFloat(e.target.value) || 0
                        })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <TextField
                        label="Expected Delivery Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        fullWidth
                        value={currentEditItem.expected_delivery_date || ''}
                        onChange={(e) => setCurrentEditItem({
                          ...currentEditItem,
                          expected_delivery_date: e.target.value
                        })}
                      />
                    </Grid>
                    <Grid item xs={6} md={2} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleUpdateOrderItem}
                        size="small"
                      >
                        Update
                      </Button>
                      <Button 
                        variant="outlined"
                        onClick={handleCancelEditItem}
                        size="small"
                      >
                        Cancel
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              ) : null}
              
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Item</strong></TableCell>
                      <TableCell><strong>Quantity</strong></TableCell>
                      <TableCell><strong>Unit Price</strong></TableCell>
                      <TableCell><strong>Total Price</strong></TableCell>
                      <TableCell><strong>Expected Delivery</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderToEdit.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">No items in this order</TableCell>
                      </TableRow>
                    ) : (
                      orderToEdit.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.inventory_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₱{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>₱{item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            {item.expected_delivery_date ? new Date(item.expected_delivery_date).toLocaleDateString() : 'Not specified'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              onClick={() => handleEditOrderItem(item, index)}
                              color="primary"
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow>
                      <TableCell colSpan={3} align="right"><strong>Total:</strong></TableCell>
                      <TableCell colSpan={3}>
                        <strong>₱{orderToEdit.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOrderDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => orderToEdit && handleSaveEditedOrder({
              supplier_id: orderToEdit.supplier_id,
              date: orderToEdit.date,
              status: orderToEdit.status,
              payment_plan: orderToEdit.payment_plan,
              notes: orderToEdit.notes
            })} 
            variant="contained" 
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Quotation Request Dialog */}
      <Dialog open={editQuotationDialogOpen} onClose={() => setEditQuotationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Quotation Request</DialogTitle>
        <DialogContent>
          {quotationToEdit && (
            <>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Request ID"
                    value={quotationToEdit.request_id}
                    fullWidth
                    disabled
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="edit-rfq-supplier-label">Supplier</InputLabel>
                    <Select
                      labelId="edit-rfq-supplier-label"
                      value={quotationToEdit.supplier_id}
                      onChange={(e) => setQuotationToEdit(prev => prev ? {...prev, supplier_id: e.target.value as number} : null)}
                      label="Supplier"
                      required
                    >
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Request Date"
                    type="date"
                    value={quotationToEdit.date}
                    onChange={(e) => setQuotationToEdit(prev => prev ? {...prev, date: e.target.value} : null)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    required
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="edit-quotation-status-label">Status</InputLabel>
                <Select
                  labelId="edit-quotation-status-label"
                  value={quotationToEdit.status}
                  onChange={(e) => setQuotationToEdit(prev => prev ? {...prev, status: e.target.value} : null)}
                  label="Status"
                >
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Sent">Sent</MenuItem>
                  <MenuItem value="Received">Received</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                  <MenuItem value="Converted">Converted to Order</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Notes"
                multiline
                rows={3}
                value={quotationToEdit.notes || ''}
                onChange={(e) => setQuotationToEdit(prev => prev ? {...prev, notes: e.target.value} : null)}
                fullWidth
                sx={{ mb: 3 }}
              />
              
              <Typography variant="subtitle1" gutterBottom>
                Requested Items
              </Typography>
              
              {currentEditQuotationItem ? (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="edit-rfq-item-label">Inventory Item</InputLabel>
                        <Select
                          labelId="edit-rfq-item-label"
                          value={currentEditQuotationItem.inventory_id}
                          onChange={(e) => setCurrentEditQuotationItem({
                            ...currentEditQuotationItem,
                            inventory_id: e.target.value as number
                          })}
                          label="Inventory Item"
                        >
                          {inventoryItems.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.itemName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <TextField
                        label="Quantity"
                        type="number"
                        inputProps={{ min: 1 }}
                        size="small"
                        fullWidth
                        value={currentEditQuotationItem.quantity}
                        onChange={(e) => setCurrentEditQuotationItem({
                          ...currentEditQuotationItem,
                          quantity: parseInt(e.target.value) || 0
                        })}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <TextField
                        label="Expected Price"
                        type="number"
                        inputProps={{ min: 0, step: 0.01 }}
                        size="small"
                        fullWidth
                        value={currentEditQuotationItem.expected_price || ''}
                        onChange={(e) => setCurrentEditQuotationItem({
                          ...currentEditQuotationItem,
                          expected_price: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <TextField
                        label="Notes"
                        size="small"
                        fullWidth
                        value={currentEditQuotationItem.notes || ''}
                        onChange={(e) => setCurrentEditQuotationItem({
                          ...currentEditQuotationItem,
                          notes: e.target.value
                        })}
                      />
                    </Grid>
                    <Grid item xs={6} md={2} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleUpdateQuotationItem}
                        size="small"
                      >
                        Update
                      </Button>
                      <Button 
                        variant="outlined"
                        onClick={handleCancelEditQuotationItem}
                        size="small"
                      >
                        Cancel
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              ) : null}
              
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Item</strong></TableCell>
                      <TableCell><strong>Quantity</strong></TableCell>
                      <TableCell><strong>Expected Price</strong></TableCell>
                      <TableCell><strong>Notes</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quotationToEdit.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">No items in this request</TableCell>
                      </TableRow>
                    ) : (
                      quotationToEdit.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.inventory_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {item.expected_price 
                              ? `₱${item.expected_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : 'To be quoted'
                            }
                          </TableCell>
                          <TableCell>{item.notes || '-'}</TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              onClick={() => handleEditQuotationItem(item, index)}
                              color="primary"
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditQuotationDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => quotationToEdit && handleSaveEditedQuotation({
              supplier_id: quotationToEdit.supplier_id,
              date: quotationToEdit.date,
              status: quotationToEdit.status,
              notes: quotationToEdit.notes
            })} 
            variant="contained" 
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <Dialog open={deleteOrderConfirmOpen} onClose={() => setDeleteOrderConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this purchase order? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOrderConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteOrder} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteQuotationConfirmOpen} onClose={() => setDeleteQuotationConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this quotation request? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteQuotationConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteQuotation} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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

export default OrderSupplier;