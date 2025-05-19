import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
// Added for date filtering
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Tooltip,
  TextField, InputAdornment, Chip, Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, SelectChangeEvent, Tabs, Tab, Snackbar, Alert, CircularProgress,
  Grid
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Add as AddIcon, PictureAsPdf as PdfIcon, InfoOutlined } from '@mui/icons-material';
import { fetchSuppliers, selectAllSuppliers, selectSuppliersStatus, selectSuppliersError } from '../../redux/slices/suppliersSlice';
import { fetchInventory, addInventoryTransaction, selectAllInventoryItems, selectInventoryLoading } from '../../redux/slices/inventorySlice';
import {
  fetchSupplierOrders, fetchQuotationRequests, updateSupplierOrder, updateQuotationRequest, addOrderPayment,
  createOrderFromQuotation, createSupplierOrder, createQuotationRequest, deleteSupplierOrder, deleteQuotationRequest,
  selectAllSupplierOrders, selectAllQuotationRequests, selectOrderSupplierLoading, selectOrderSupplierError
} from '../../redux/slices/orderSupplierSlice';
import { Supplier } from '../../services/suppliersService';
import { InventoryItem } from '../../services/inventoryService';
import {
  SupplierOrder, SupplierOrderItem, QuotationRequest, QuotationItem, OrderPayment, CreateSupplierOrder,
  CreateQuotationRequest, UpdateSupplierOrder, UpdateQuotationRequest, Supplier as OrderSupplierServiceSupplier
} from '../../services/orderSupplierService';
import { orderSupplierService } from '../../services/orderSupplierService';
import { inventoryService } from '../../services/inventoryService';
import { AppDispatch } from '../../redux/store';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { truncateByDomain } from 'recharts/types/util/ChartUtils';

// Item types for a printing business
const itemTypes = [
  { id: 'piece', name: 'Per Piece' },
  { id: 'rim', name: 'Per Rim' },
  { id: 'box', name: 'Per Box' },
  { id: 'set', name: 'Per Set' },
  { id: 'roll', name: 'Per Roll' },
  { id: 'pack', name: 'Per Pack' },
  { id: 'sheet', name: 'Per Sheet' },
  { id: 'unit', name: 'Per Unit' },
  { id: 'other', name: 'Other' }
];

/* Date filter implementation is needed here */

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
  setSelectedOrder: Dispatch<SetStateAction<SupplierOrder | null>>;
  onAddPayment: (
    payment: {
      order_id: number;
      amount: number;
      payment_date: string;
      payment_method: string;
      notes?: string;
    },
    onSuccess?: () => void
  ) => void;
  suppliers?: Supplier[];
  inventoryItems?: InventoryItem[];
  onGeneratePDF?: (order: SupplierOrder) => void;
  currentEditItem: {
    index?: number;
    inventory_id: number;
    quantity: number;
    unit_price: number;
    item_type?: string;
    otherType?: string;
  } | null;
  setCurrentEditItem: React.Dispatch<React.SetStateAction<{
    index?: number;
    inventory_id: number;
    quantity: number;
    unit_price: number;
    item_type?: string;
    otherType?: string;
  } | null>>;
  handleUpdateOrderItem: () => void;
  handleCancelEditItem: () => void;

}


const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  open,
  onClose,
  order,
  onStatusChange,
  onAddPayment,
  setSelectedOrder,
  suppliers = [],
  inventoryItems = [],
  onGeneratePDF
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [tabValue, setTabValue] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [otherPaymentMethod, setOtherPaymentMethod] = useState<string>('');
  const [paymentCode, setPaymentCode] = useState<string>('');
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

  const handleRecordPayment = async () => {
    if (!order) return;

    const paymentAmt = parseFloat(paymentAmount);

    // ✅ Validation checks
    if (isNaN(paymentAmt) || paymentAmt <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    if (typeof order.remaining_amount !== 'number') {
      alert("Invalid order remaining balance.");
      return;
    }

    if (paymentAmt > order.remaining_amount) {
      alert(
        `Payment exceeds remaining balance of ₱${order.remaining_amount.toLocaleString(undefined, {
          minimumFractionDigits: 2
        })}`
      );
      return;
    }

    try {
      //Submit payment and refresh the dialog
      await onAddPayment(
        {
          order_id: order.id!,
          amount: paymentAmt,
          payment_date: paymentDate,
          payment_method: paymentMethod === 'Other' ? otherPaymentMethod : paymentMethod,
          notes: ['Crypto', 'Coins.ph'].includes(otherPaymentMethod)
            ? `__code:${paymentCode}__ ${paymentNotes}`
            : paymentNotes || undefined,
        },
        async () => {
          const refreshedOrder = await orderSupplierService.getSupplierOrderById(order.id!);
          if (refreshedOrder) {
            setSelectedOrder(refreshedOrder); //update dialog with latest payment state
          }
        }
      );

      //Reset form after success
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentCode('');
      setOtherPaymentMethod('');
      setPaymentMethod('Cash');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment. Please try again.');
    }
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
      const isFullPayment = (order.remaining_amount ?? 0) <= 0;
      const paidAmount = order.paid_amount ?? 0;
      const paymentText = isFullPayment
        ? 'for full payment'
        : `for partial payment of ₱${paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

      for (const item of order.items) {
        await dispatch(addInventoryTransaction({
          inventoryId: item.inventory_id,
          transactionData: {
            transactionType: 'stock_in',
            quantity: item.quantity,
            createdBy: order.supplier_id,
            isSupplier: true,
            type: 'supplier_order',
            reason: `Auto stock-in from supplier ${order.suppliers?.name || 'Unknown'} ${paymentText}`,
            notes: `Received item for PO ${order.order_id} — ${paymentText}`,
            transactionDate: new Date().toISOString()
          }
        })).unwrap();
      }

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
                {(() => {
                  const getFilteredStatuses = (currentStatus: string): string[] => {
                    const allowedMap: Record<string, string[]> = {
                      'Pending': ['Approved', 'Partially Paid', 'Rejected'],
                      'Approved': ['Partially Paid', 'Paid', 'Pending'],
                      'Partially Paid': ['Paid', 'Pending'],
                      'Paid': ['Completed'],
                      'Completed': [],
                      'Rejected': []
                    };
                    const allowed = allowedMap[currentStatus] || [];
                    return Array.from(new Set([currentStatus, ...allowed]));
                  };

                  const visibleStatuses = getFilteredStatuses(order.status);

                  return visibleStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ));
                })()}
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
                    <TableCell align="center"><strong>Item</strong></TableCell>
                    <TableCell align="center"><strong>Type</strong></TableCell>
                    <TableCell align="center"><strong>Quantity</strong></TableCell>
                    <TableCell align="center"><strong>Unit Price</strong></TableCell>
                    <TableCell align="center"><strong>Total Price</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell align="center">{item.inventory_name}</TableCell>
                      <TableCell align="center">{item.item_type || 'Per Piece'}</TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="center">₱{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="center">₱{item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} align="right"><strong>Total:</strong></TableCell>
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
                <Typography
                  variant="body1"
                  color={(order.remaining_amount || 0) > 0 ? 'error.main' : 'success.main'}
                  fontWeight="bold"
                >
                  ₱{Math.max(0, order.remaining_amount || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2
                  })}
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
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value >= 0 || isNaN(value)) {
                    setPaymentAmount(e.target.value);
                  }
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  inputProps: { min: 0 }
                }}
                disabled={(order.remaining_amount ?? 0) <= 0}
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
              {paymentMethod === 'Other' && (
                <FormControl fullWidth size="small">
                  <InputLabel>Other Payment Method</InputLabel>
                  <Select
                    value={otherPaymentMethod}
                    onChange={(e) => setOtherPaymentMethod(e.target.value)}
                    label="Other Payment Method"
                  >
                    {[
                      'PayPal', 'Maya (PayMaya)', 'Coins.ph', 'Crypto', 'Remittance Center',
                      'Post-Dated Check', 'Wire Transfer', 'Cash on Delivery (COD)',
                      'Company Account', 'In-Kind',
                    ].map((method) => (
                      <MenuItem key={method} value={method}>{method}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            {paymentMethod === 'Other' && ['Crypto', 'Coins.ph'].includes(otherPaymentMethod) && (
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={`${otherPaymentMethod} Code or Wallet Address`}
                  value={paymentCode}
                  onChange={(e) => setPaymentCode(e.target.value)}
                  placeholder={`Enter ${otherPaymentMethod} code here`}
                />
              </Box>
            )}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                multiline
                rows={2}
              />
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={handleRecordPayment}
              disabled={
                !paymentAmount ||
                parseFloat(paymentAmount) <= 0 ||
                (order.remaining_amount ?? 0) <= 0
              }
            >
              Record Payment
            </Button>
          </Box>

          {order.payments && order.payments.length > 0 ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Payment History</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{ '& th, & td': { padding: '6px 8px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center"><strong>Date</strong></TableCell>
                      <TableCell align="center"><strong>Amount</strong></TableCell>
                      <TableCell align="center"><strong>Method</strong></TableCell>
                      <TableCell align="center"><strong>Code</strong></TableCell>
                      <TableCell align="center"><strong>Notes</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...order.payments]
                      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                      .map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell align="center">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="center">
                            ₱{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="center">
                            {payment.payment_method}
                          </TableCell>
                          <TableCell align="center">
                            {payment.notes?.match(/__code:(.*?)__/i)?.[1]?.trim() || '-'}
                          </TableCell>
                          <TableCell align="center">
                            {payment.notes?.replace(/__code:.*?__/, '').trim() || '-'}
                          </TableCell>
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
                    <TableCell align='center'><strong>Status</strong></TableCell>
                    <TableCell align='center'><strong>Updated By</strong></TableCell>
                    <TableCell><strong>Notes</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderHistory.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {entry.date ? new Date(entry.date).toLocaleString() : 'N/A'}
                      </TableCell>
                      <TableCell align='center'>
                        <Chip
                          label={entry.status}
                          color={getChipColor(entry.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align='center'>{entry.updatedBy}</TableCell>
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
  const isConverted = quotation.status === 'Converted';

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

        <FormControl
          fullWidth
          margin="normal"
          size="small"
          disabled={quotation.status === 'Converted'}
        >
          <InputLabel id="quotation-status-label">Quotation Status</InputLabel>
          <Select
            labelId="quotation-status-label"
            value={selectedStatus}
            onChange={handleStatusChange}
            label="Quotation Status"
          >
            {quotation.status === 'Converted'
              ? <MenuItem value="Converted">Converted</MenuItem>
              : ['Draft', 'Sent', 'Approved', 'Rejected'].map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
          </Select>
        </FormControl>


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
          disabled={quotation.status === 'Converted' || quotation.status === selectedStatus}
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
  const [currentEditItem, setCurrentEditItem] = useState<{
    index?: number;
    inventory_id: number;
    quantity: number;
    unit_price: number;
    item_type?: string;
    otherType?: string;
  } | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const suppliers = useSelector(selectAllSuppliers);
  const inventoryItems = useSelector(selectAllInventoryItems);
  const supplierOrders = useSelector(selectAllSupplierOrders);
  const quotationRequests = useSelector(selectAllQuotationRequests);

  const suppliersLoading = useSelector(selectSuppliersStatus) === 'loading';
  const [stockedInOrders, setStockedInOrders] = useState<Set<number>>(new Set());
  const inventoryLoading = useSelector(selectInventoryLoading);
  const orderSupplierLoading = useSelector(selectOrderSupplierLoading);
  const loading = suppliersLoading || inventoryLoading || orderSupplierLoading;
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRequest | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info' as 'info' | 'success' | 'error' | 'warning'
  });

  useEffect(() => {
    dispatch(fetchSuppliers());
    dispatch(fetchInventory());
    dispatch(fetchSupplierOrders());
    dispatch(fetchQuotationRequests());
  }, [dispatch]);

  const handleUpdateOrderItem = () => {
    if (!currentEditItem || !orderToEdit) return;

    const { inventory_id, quantity, unit_price, index, item_type, otherType } = currentEditItem;

    // Determine the final item type value
    const finalItemType = item_type === 'other' && otherType ? otherType : item_type || 'piece';

    // Create deep copy of items array
    const updatedItems = orderToEdit.items.map(item => ({ ...item }));

    const existingIndex = updatedItems.findIndex(
      (item, i) => item.inventory_id === inventory_id && i !== index
    );

    if (typeof index === 'number') {
      if (existingIndex !== -1) {
        const existingItem = updatedItems[existingIndex];

        // Replace merged version at existingIndex
        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
          total_price: (existingItem.quantity + quantity) * unit_price,
        };

        // Remove the duplicate (the one you were editing)
        updatedItems.splice(index, 1);
      } else {
        // Update the item in-place safely (copied object)
        updatedItems[index] = {
          ...updatedItems[index],
          quantity,
          unit_price,
          total_price: quantity * unit_price,
          inventory_id,
          item_type: finalItemType,
          inventory_name:
            inventoryItems.find(i => i.id === inventory_id)?.itemName || ''
        };
      }
    } else {
      // New item logic
      const duplicate = updatedItems.find(i => i.inventory_id === inventory_id);
      if (duplicate) {
        setSnackbar({
          open: true,
          message: "this item is already in the requested item below.",
          severity: 'warning'
        });
        return;
      }

      updatedItems.push({
        inventory_id,
        inventory_name: inventoryItems.find(i => i.id === inventory_id)?.itemName || '',
        quantity,
        unit_price,
        item_type: finalItemType,
        total_price: quantity * unit_price
      });
    }

    setOrderToEdit({
      ...orderToEdit,
      items: updatedItems,
      total_amount: updatedItems.reduce((sum, item) => sum + item.total_price, 0)
    });

    setCurrentEditItem(null);
  };

  const handleCancelEditItem = () => {
    setCurrentEditItem(null);
  };

  const getEligibleSuppliers = (): Supplier[] => {
    return suppliers.filter(supplier => {
      const latestOrder = supplierOrders
        .filter(order => order.supplier_id === supplier.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      return !latestOrder || ['Completed', 'Rejected', 'Paid'].includes(latestOrder.status);
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setCurrentEditQuotationItem(null);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterMonth(e.target.value);
  };

  const filterOrders = (orders: SupplierOrder[]) => {
    const searchLower = searchTerm.toLowerCase();

    // First, filter by month (if set)
    const filteredByDate = filterMonth
      ? orders.filter(order => order.date?.substring(0, 7) === filterMonth)
      : orders;

    // Then, filter by search term
    if (!searchLower.trim()) return filteredByDate;

    return filteredByDate.filter(order => {
      const orderIdMatch = order.order_id.toLowerCase().includes(searchLower);
      const supplierMatch = suppliers.find(s => s.id === order.supplier_id)?.name.toLowerCase().includes(searchLower) || false;
      const statusMatch = order.status.toLowerCase().includes(searchLower);
      return orderIdMatch || supplierMatch || statusMatch;
    });
  };

  const filteredOrders = filterOrders(supplierOrders);

  const filterQuotations = (quotations: QuotationRequest[]) => {
    const searchLower = searchTerm.toLowerCase();

    const filteredByDate = filterMonth
      ? quotations.filter(q => q.date?.substring(0, 7) === filterMonth)
      : quotations;

    if (!searchLower.trim()) return filteredByDate;

    return filteredByDate.filter(quotation => {
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
    setCurrentEditItem(null);
  };

  const handleCloseQuotationDialog = () => {
    setQuotationDialogOpen(false);
    setSelectedQuotation(null);
  };

  const handleOrderStatusChange = async (orderId: number, newStatus: string, paymentPlan?: string) => {
    const updateData: any = { status: newStatus };
    if (paymentPlan !== undefined) {
      updateData.payment_plan = paymentPlan;
    }

    try {
      //Update status
      await dispatch(updateSupplierOrder({ id: orderId, data: updateData })).unwrap();

      //Fetch full PO with items
      const fullOrder = await orderSupplierService.getSupplierOrderById(orderId);

      //Stock in if paid and not already processed
      if (
        newStatus === 'Paid' &&
        fullOrder?.items?.length &&
        !stockedInOrders.has(fullOrder.id!)
      ) {
        for (const item of fullOrder.items) {
          const currentItem = inventoryItems.find(i => i.id === item.inventory_id);
          const newQty = (currentItem?.quantity || 0) + item.quantity;

          await inventoryService.updateInventoryItem(item.inventory_id, { quantity: newQty });

          await dispatch(addInventoryTransaction({
            inventoryId: item.inventory_id,
            transactionData: {
              transactionType: 'stock_in',
              quantity: item.quantity,
              createdBy: fullOrder.supplier_id,
              isSupplier: true,
              type: 'supplier_order',
              reason: `Auto stock-in from completed payment — Supplier: ${fullOrder.suppliers?.name || 'Unknown'}`,
              notes: `Stocked in for fully paid order ${fullOrder.order_id}`,
              transactionDate: new Date().toISOString()
            }
          })).unwrap();
        }

        setStockedInOrders(prev => new Set(prev).add(fullOrder.id!));

        //Show snackbar for stock-in success
        setSnackbar({
          open: true,
          message: `Order marked as Completed. Items have been stocked in to inventory.`,
          severity: 'success'
        });
      } else {
        // Regular update success feedback
        setSnackbar({
          open: true,
          message: `Order updated to "${newStatus}"`,
          severity: 'success'
        });
      }

      dispatch(fetchSupplierOrders());
    } catch (error) {
      console.error('Failed to update order:', error);
      setSnackbar({
        open: true,
        message: `Error updating order: ${error}`,
        severity: 'error'
      });
    }
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

        // Auto-create PO when status is Approved
        if (newStatus === 'Approved') {
          console.log('Auto-creating PO from quotation ${requestedId')
          dispatch(createOrderFromQuotation(requestId))
            .unwrap()
            .then(() => {
              dispatch(fetchSupplierOrders());
              setSnackbar({
                open: true,
                message: 'Purchase Order automatically created!',
                severity: 'info'
              });
            })
            .catch(error => {
              setSnackbar({
                open: true,
                message: `Failed to create PO: ${error}`,
                severity: 'error'
              });
            });
        }

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


  const handleAddOrderPayment = async (
    payment: OrderPayment,
    onSuccess?: () => void
  ) => {
    dispatch(addOrderPayment(payment))
      .unwrap()
      .then(() => {
        dispatch(fetchSupplierOrders()).then(() => {
          if (onSuccess) onSuccess();
        });
      })
      .catch((error) => {
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

  const handleEditOrder = (order: SupplierOrder) => {
    // Deep copy the order to avoid reference issues
    setOrderToEdit({ ...order, items: [...order.items] });
    // Open edit dialog with current order data
    setEditOrderDialogOpen(true);
  };

  useEffect(() => {
    if (!editOrderDialogOpen) {
      setCurrentEditItem(null);
    }
  }, [editOrderDialogOpen]);

  const handleEditOrderItem = (item: SupplierOrderItem, index: number) => {
    setCurrentEditItem({
      index,
      inventory_id: item.inventory_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
  };

  const handleRemoveEditOrderItem = (index: number) => {
    if (!orderToEdit) return;

    const updatedItems = [...orderToEdit.items];
    updatedItems.splice(index, 1);

    setOrderToEdit({
      ...orderToEdit,
      items: updatedItems,
      total_amount: updatedItems.reduce((sum, item) => sum + item.total_price, 0)
    });
  };


  const handleAddItemClick = () => {
    setCurrentEditItem({
      inventory_id: 0,
      quantity: 1,
      unit_price: 0,
      item_type: 'piece',
      index: undefined
    });
  };

  const handleSaveEditedOrder = async (editedOrder: UpdateSupplierOrder) => {
    if (!orderToEdit || !orderToEdit.id) return;

    const originalOrder = supplierOrders.find(order => order.id === orderToEdit.id);
    const originalIds = originalOrder?.items?.map(item => item.id).filter(Boolean) || [];
    const totalAmount = orderToEdit.items.reduce((sum, item) => sum + item.total_price, 0);

    // Prepare updated order data
    const updatedOrder: UpdateSupplierOrder = {
      ...editedOrder,
      total_amount: totalAmount,
      remaining_amount: 0
    };

    try {
      // First update the order
      await dispatch(updateSupplierOrder({
        id: orderToEdit.id,
        data: {
          status: orderToEdit.status,
          notes: orderToEdit.notes,
          payment_plan: orderToEdit.payment_plan,
          total_amount: orderToEdit.total_amount,
          remaining_amount: orderToEdit.remaining_amount
        }
      })).unwrap();

      //Identify and delete removed items
      const originalIds = originalOrder?.items?.map((i: any) => i.id).filter(Boolean) || [];
      const updatedIds = orderToEdit.items.map(i => i.id).filter(Boolean);

      const deletedIds = originalIds.filter(id => !updatedIds.includes(id));

      for (const id of deletedIds) {
        await orderSupplierService.deleteOrderItem(id);
      }

      // Now persist items
      for (const item of orderToEdit.items) {
        if (item.id) {
          await orderSupplierService.updateOrderItem(item.id, item);
        } else {
          await orderSupplierService.addOrderItem(orderToEdit.id, item);
        }
      }

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

  //Edit and Delete Functions for Quotation Requests
  const [editQuotationDialogOpen, setEditQuotationDialogOpen] = useState(false);
  const [quotationToEdit, setQuotationToEdit] = useState<QuotationRequest | null>(null);
  const isConverted = quotationToEdit?.status === 'Converted';



  useEffect(() => {
    if (!editQuotationDialogOpen) {
      setCurrentEditQuotationItem(null);
    }
  }, [editQuotationDialogOpen]);

  const handleEditQuotation = (quotation: QuotationRequest) => {
    //Deep copy the quotation to avoid reference issues
    setQuotationToEdit({ ...quotation, items: [...quotation.items] });
    //Open edit dialog with current quotation data
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

  const handleRemoveEditQuotationItem = (index: number) => {
    if (!quotationToEdit) return;

    const updatedItems = [...quotationToEdit.items];
    updatedItems.splice(index, 1);

    setQuotationToEdit({
      ...quotationToEdit,
      items: updatedItems
    });
  };

  const handleUpdateQuotationItem = () => {
    if (!currentEditQuotationItem || !quotationToEdit) return;

    const selectedItem = inventoryItems.find(item => item.id === currentEditQuotationItem.inventory_id);
    if (!selectedItem) return;

    const newItem = {
      inventory_id: currentEditQuotationItem.inventory_id,
      inventory_name: selectedItem.itemName,
      quantity: currentEditQuotationItem.quantity,
      expected_price: currentEditQuotationItem.expected_price,
      notes: currentEditQuotationItem.notes
    };

    const updatedItems = [...quotationToEdit.items];

    if (
      typeof currentEditQuotationItem.index === 'number' &&
      currentEditQuotationItem.index >= 0 &&
      currentEditQuotationItem.index < updatedItems.length
    ) {
      //Update existing item
      updatedItems[currentEditQuotationItem.index] = newItem;
    } else {
      //Add new item
      updatedItems.push(newItem);
    }

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
      //Update the main quotation request
      await dispatch(updateQuotationRequest({
        id: quotationToEdit.id,
        data: editedQuotation
      })).unwrap();

      //Delete all existing items first
      await orderSupplierService.deleteQuotationItemsByRequestId(quotationToEdit.id);

      //Insert the updated items
      for (const item of quotationToEdit.items) {
        await orderSupplierService.addQuotationItem(quotationToEdit.id, item);
      }

      setSnackbar({
        open: true,
        message: "Quotation request updated successfully",
        severity: 'success'
      });

      //Refresh list and close dialog
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
      doc.text("197 Kalantas St, Phase V,", leftColX, yPos);
      yPos += 5;
      doc.text("Hillside Subd, Bajada, Davao City", leftColX, yPos);
      yPos += 5;
      doc.text("Telephone: 2344716", leftColX, yPos);
      yPos += 5;
      doc.text("Email: opzonprinters@yahoo.com.ph", leftColX, yPos);

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
        { header: 'Type', dataKey: 'item_type' as const },
        { header: 'Quantity', dataKey: 'quantity' as const },
        { header: 'Unit Price', dataKey: 'unit_price' as const },
        { header: 'Total Price', dataKey: 'total_price' as const },
      ];

      const tableRows = order.items.map(item => ({
        inventory_name: item.inventory_name,
        item_type: item.item_type || 'Per Piece',
        quantity: item.quantity.toString(),
        unit_price: item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        total_price: item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })
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
          0: { cellWidth: 50 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
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
    item_type?: string;
  }[]>([]);
  const [currentItem, setCurrentItem] = useState<{
    inventory_id: number;
    quantity: number;
    unit_price: number;
    item_type: string;
    otherType?: string;
  }>({
    inventory_id: 0,
    quantity: 1,
    unit_price: 0,
    item_type: 'piece'
  });

  useEffect(() => {
    if (editIndex !== null && currentItem.inventory_id === 0) {
      setEditIndex(null);
    }
  }, [currentItem.inventory_id, editIndex]);

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
      unit_price: 0,
      item_type: 'piece'
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

    const itemType = currentItem.item_type === 'other' && currentItem.otherType
      ? currentItem.otherType
      : currentItem.item_type;

    const newItem = {
      inventory_id: currentItem.inventory_id,
      inventory_name: selectedItem.itemName,
      quantity: currentItem.quantity,
      unit_price: currentItem.unit_price,
      total_price: currentItem.quantity * currentItem.unit_price,
      item_type: itemType
    };

    let updatedItems = [...orderItems];

    if (editIndex !== null) {
      updatedItems[editIndex] = newItem;
      setEditIndex(null);
    } else {
      updatedItems.push(newItem);
    }

    setOrderItems(updatedItems);

    setCurrentItem({
      inventory_id: 0,
      quantity: 1,
      unit_price: 0,
      item_type: 'piece'
    });
  };


  const handleRemoveOrderItem = (index: number) => {
    const updatedItems = [...orderItems];
    updatedItems.splice(index, 1);
    setOrderItems(updatedItems);
  };

  const handleEditDraftItem = (index: number) => {
    const item = orderItems[index];
    setCurrentItem({
      inventory_id: item.inventory_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_type: item.item_type || 'piece'
    });
    setEditIndex(index);
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
      doc.text("197 Kalantas St, Phase V,", leftColX, yPos);
      yPos += 5;
      doc.text("Hillside Subd, Bajada, Davao City", leftColX, yPos);
      yPos += 5;
      doc.text("Telephone: 2344716", leftColX, yPos);
      yPos += 5;
      doc.text("Email: opzonprinters@yahoo.com.ph", leftColX, yPos);

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
        didParseCell: function (data) {
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
      doc.text('For inquiries, contact our purchasing department at: 2344716', 105, yPos, { align: 'center' });

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
  const [editRfqIndex, setEditRfqIndex] = useState<number | null>(null);
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

  const handleEditRfqItem = (index: number) => {
    const item = rfqItems[index];
    setCurrentRfqItem({
      inventory_id: item.inventory_id,
      quantity: item.quantity,
      expected_price: item.expected_price,
      notes: item.notes,
    });
    setEditRfqIndex(index);
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

    if (editRfqIndex !== null) {
      const updatedItems = [...rfqItems];
      updatedItems[editRfqIndex] = newItem;
      setRfqItems(updatedItems);
      setEditRfqIndex(null);
    } else {
      const alreadyExists = rfqItems.some(item => item.inventory_id === currentRfqItem.inventory_id);
      if (alreadyExists) {
        setSnackbar({
          open: true,
          message: "This item is already in the requested items.",
          severity: 'warning'
        });
        return;
      }
      setRfqItems([...rfqItems, newItem]);
    }

    // Reset form
    setCurrentRfqItem({
      inventory_id: 0,
      quantity: 1,
      expected_price: undefined,
      notes: ''
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
            <TableCell align='center'><strong>Date</strong></TableCell>
            <TableCell align='center'><strong>Amount</strong></TableCell>
            <TableCell align='center'><strong>Status</strong></TableCell>
            <TableCell align='center' sx={{ minWidth: 240 }}><strong>Actions</strong></TableCell>
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
            filterOrders(supplierOrders).map((order) => {
              const supplier = suppliers.find(s => s.id === order.supplier_id);
              return (
                <TableRow key={order.id}>
                  <TableCell>{order.order_id}</TableCell>
                  <TableCell>{supplier?.name || `Supplier ${order.supplier_id}`}</TableCell>
                  <TableCell align='center'>
                    {order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell align='center'>₱{order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell align='center'>
                    <Chip
                      label={order.status}
                      color={getChipColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align='center'>
                    <Box display='flex' justifyContent='center' alignItems='center' gap={1} flexWrap='wrap'>
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
                        startIcon={<PdfIcon />}
                        onClick={() => handleGeneratePurchaseOrderPDF(order)}
                        color="secondary"
                        sx={{ mr: 1 }}
                      >
                        PDF
                      </Button>
                    </Box>
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
            <TableCell align='center'><strong>Date</strong></TableCell>
            <TableCell align='center'><strong>Items</strong></TableCell>
            <TableCell align='center'><strong>Status</strong></TableCell>
            <TableCell align='center'><strong>Actions</strong></TableCell>
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
                  <TableCell align='center'>
                    {quotation.date ? new Date(quotation.date).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell align='center'>{quotation.items.length} items</TableCell>
                  <TableCell align='center'>
                    <Chip
                      label={quotation.status}
                      color={getChipColor(quotation.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align='center'>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: '1' }}>
                      <Button
                        size="small"
                        onClick={() => handleViewQuotationDetails(quotation)}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleEditQuotation(quotation)}
                        color="primary"
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        startIcon={<PdfIcon />}
                        onClick={() => handleGenerateRFQPDF(quotation)}
                        color="secondary"
                      >
                        PDF
                      </Button>
                    </Box>
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
        <TextField
          label="Filter by Month"
          type="month"
          value={filterMonth}
          onChange={handleMonthChange}
          size="small"
          sx={{ minWidth: 160 }}
          InputLabelProps={{ shrink: true }}
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
        currentEditItem={currentEditItem}
        setCurrentEditItem={setCurrentEditItem}
        handleUpdateOrderItem={handleUpdateOrderItem}
        handleCancelEditItem={handleCancelEditItem}
        setSelectedOrder={setSelectedOrder}

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
              <Box>
                <FormControl fullWidth required>
                  <InputLabel id="supplier-label">Supplier</InputLabel>
                  <Select
                    labelId="supplier-label"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(Number(e.target.value))}
                    label="Supplier"
                  >
                    {getEligibleSuppliers().map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    mt: 0.5,
                    mb: 2,
                    pl: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <InfoOutlined fontSize="small" />
                  Only suppliers without ongoing purchase orders can be selected.
                </Typography>
              </Box>
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
                    value={currentItem.inventory_id}
                    onChange={(e) => {
                      const id = parseInt(e.target.value as string, 10);
                      const selected = inventoryItems.find((item) => item.id === id);
                      setCurrentItem({
                        ...currentItem,
                        inventory_id: id,
                        unit_price: selected?.unitPrice || 0,
                      });
                    }}
                    disabled={editIndex !== null}
                    label="Inventory Item"
                  >
                    <MenuItem value="">
                      <em>Select an item</em>
                    </MenuItem>

                    {inventoryItems.map((item) => {
                      const alreadySelected = orderItems.some(
                        (orderItem) => orderItem.inventory_id === item.id
                      );
                      return (
                        <MenuItem
                          key={item.id}
                          value={item.id}
                          disabled={alreadySelected}
                          style={alreadySelected ? { color: 'gray' } : undefined}
                        >
                          {item.itemName}
                        </MenuItem>
                      );
                    })}
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
                <FormControl fullWidth size="small">
                  <InputLabel id="item-type-label">Type</InputLabel>
                  <Select
                    labelId="item-type-label"
                    value={currentItem.item_type}
                    onChange={(e) => setCurrentItem({
                      ...currentItem,
                      item_type: e.target.value as string,
                      otherType: e.target.value === 'other' ? currentItem.otherType : undefined
                    })}
                    label="Type"
                  >
                    {itemTypes.map(type => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {currentItem.item_type === 'other' && (
                  <TextField
                    label="Specify Type"
                    value={currentItem.otherType || ''}
                    onChange={(e) => setCurrentItem({
                      ...currentItem,
                      otherType: e.target.value
                    })}
                    fullWidth
                    size="small"
                    margin="dense"
                  />
                )}
              </Grid>
              <Grid item xs={6} md={2}>
                <Tooltip title="Unit price is automatically set from inventory and cannot be edited.">
                  <TextField
                    label="Unit Price"
                    value={(() => {
                      const selectedItem = inventoryItems.find(inv => inv.id === currentItem.inventory_id);
                      const price = selectedItem?.unitPrice;
                      return price != null ? `₱${price.toFixed(2)}` : '';
                    })()}
                    fullWidth
                    size="small"
                    inputProps={{ readOnly: true }}
                  />
                </Tooltip>
              </Grid>

              <Grid item xs={6} md={2} sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddOrderItem}
                  fullWidth
                >
                  {editIndex !== null ? 'Update' : 'Add'}
                </Button>

                {editIndex !== null && (
                  <Button
                    variant="text"
                    color="error"
                    onClick={() => {
                      setEditIndex(null);
                      setCurrentItem({
                        inventory_id: 0,
                        quantity: 1,
                        unit_price: 0,
                        item_type: 'piece'
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </Grid>
            </Grid>
          </Paper>

          {orderItems.length > 0 ? (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Item</strong></TableCell>
                    <TableCell align='center'><strong>Type</strong></TableCell>
                    <TableCell align='center'><strong>Quantity</strong></TableCell>
                    <TableCell align='center'><strong>Unit Price</strong></TableCell>
                    <TableCell align='center'><strong>Total Price</strong></TableCell>
                    <TableCell align='center' sx={{ width: '180px' }}><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.inventory_name}</TableCell>
                      <TableCell align='center'>
                        {item.item_type || 'Per Piece'}
                      </TableCell>
                      <TableCell align='center'>{item.quantity}</TableCell>
                      <TableCell align='center'>₱{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align='center'>₱{item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align='center' sx={{ whiteSpace: 'nowrap' }}>
                        <Button onClick={() => handleEditDraftItem(index)} color="primary" size="small">Edit</Button>
                        <Button onClick={() => handleRemoveOrderItem(index)} color="error" size="small">Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} align="right"><strong>Total:</strong></TableCell>
                    <TableCell colSpan={2}>
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
          <Button
            onClick={handleClosePurchaseOrderDialog}
            variant="text"
            color="error"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitPurchaseOrder}
            variant="contained"
            color="primary"
            disabled={
              !selectedSupplier ||
              !orderDate ||
              orderItems.length === 0
            }
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
                  {getEligibleSuppliers().map(supplier => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mt: -1,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  pl: 0.5
                }}
              >
                <InfoOutlined fontSize="small" />
                Only suppliers without ongoing purchase orders can be selected.
              </Typography>
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
                    onChange={(e) =>
                      setCurrentRfqItem({
                        ...currentRfqItem,
                        inventory_id: e.target.value as number
                      })
                    }
                    label="Inventory Item"
                    disabled={editRfqIndex !== null}
                  >
                    {inventoryItems.map((item) => {
                      const alreadySelected = rfqItems.some((rfqItem) => rfqItem.inventory_id === item.id);
                      return (
                        <MenuItem
                          key={item.id}
                          value={item.id}
                          disabled={alreadySelected}
                          style={alreadySelected ? { color: 'gray' } : undefined}
                        >
                          {item.itemName}
                        </MenuItem>
                      );
                    })}
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
                    <TableCell align='center'><strong>Quantity</strong></TableCell>
                    <TableCell align='center'><strong>Expected Price</strong></TableCell>
                    <TableCell align='center'><strong>Notes</strong></TableCell>
                    <TableCell align='center'><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rfqItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.inventory_name}</TableCell>
                      <TableCell align='center'>{item.quantity}</TableCell>
                      <TableCell align='center'>
                        {item.expected_price
                          ? `₱${item.expected_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : 'To be quoted'
                        }
                      </TableCell>
                      <TableCell align='center'>{item.notes || '-'}</TableCell>
                      <TableCell align='center' sx={{ whiteSpace: 'nowrap' }}>
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => handleEditRfqItem(index)}
                        >
                          Edit
                        </Button>
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
                      disabled
                      onChange={(e) => setOrderToEdit(prev => prev ? { ...prev, supplier_id: e.target.value as number } : null)}
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
                    onChange={(e) => setOrderToEdit(prev => prev ? { ...prev, date: e.target.value } : null)}
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
                      onChange={(e) => setOrderToEdit(prev => prev ? { ...prev, status: e.target.value } : null)}
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
                    onChange={(e) => setOrderToEdit(prev => prev ? { ...prev, payment_plan: e.target.value } : null)}
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
                onChange={(e) => setOrderToEdit(prev => prev ? { ...prev, notes: e.target.value } : null)}
                fullWidth
                sx={{ mb: 3 }}
              />
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1">Order Items</Typography>
                {!currentEditItem && (
                  <Button
                    variant="outlined"
                    size='small'
                    onClick={handleAddItemClick}
                    startIcon={<AddIcon />}
                  >
                    Add Item
                  </Button>
                )}
              </Box>
              {currentEditItem && (
                <Grid container spacing={2} alignItems="center" sx={{ mb: 2, mt: 2 }}>
                  <Grid item xs={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Inventory Item</InputLabel>
                      <Select
                        value={currentEditItem.inventory_id}
                        onChange={(e) => {
                          const selectedId = Number(e.target.value);
                          const selectedItem = inventoryItems.find(i => i.id === selectedId);
                          setCurrentEditItem({
                            ...currentEditItem,
                            inventory_id: selectedId,
                            unit_price: selectedItem?.unitPrice || 0
                          });
                        }}
                        label="Inventory Item"
                        disabled={typeof currentEditItem.index === 'number' && currentEditItem.index >= 0}
                      >
                        {inventoryItems.map((item) => {
                          const alreadySelected = orderToEdit?.items.some((orderItem, i) =>
                            orderItem.inventory_id === item.id &&
                            i !== currentEditItem?.index // allow current one to remain editable
                          );

                          return (
                            <MenuItem
                              key={item.id}
                              value={item.id}
                              disabled={alreadySelected}
                              style={alreadySelected ? { color: 'gray' } : undefined}
                            >
                              {item.itemName}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="edit-item-type-label">Type</InputLabel>
                      <Select
                        labelId="edit-item-type-label"
                        value={currentEditItem.item_type || 'piece'}
                        onChange={(e) => setCurrentEditItem({
                          ...currentEditItem,
                          item_type: e.target.value as string,
                        })}
                        label="Type"
                      >
                        {itemTypes.map(type => (
                          <MenuItem key={type.id} value={type.id}>
                            {type.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {currentEditItem.item_type === 'other' && (
                      <TextField
                        label="Specify Type"
                        value={currentEditItem.otherType || ''}
                        onChange={(e) => setCurrentEditItem({
                          ...currentEditItem,
                          otherType: e.target.value
                        })}
                        fullWidth
                        size="small"
                        margin="dense"
                      />
                    )}
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      type="number"
                      label="Quantity"
                      size="small"
                      value={currentEditItem.quantity}
                      onChange={(e) =>
                        setCurrentEditItem({ ...currentEditItem, quantity: Number(e.target.value) })
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      type="number"
                      label="Unit Price"
                      size="small"
                      value={currentEditItem.unit_price}
                      disabled
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Box display="flex" gap={1}>
                      <Button
                        onClick={handleUpdateOrderItem}
                        variant="contained"
                        color="primary"
                        disabled={currentEditItem.inventory_id === 0}
                        fullWidth
                      >
                        {typeof currentEditItem.index === 'number' ? 'Update' : 'Add'}
                      </Button>
                      <Button
                        onClick={handleCancelEditItem}
                        variant="text"
                        color="error"
                        fullWidth
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              )}
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Item</strong></TableCell>
                      <TableCell align='center'><strong>Type</strong></TableCell>
                      <TableCell align='center'><strong>Quantity</strong></TableCell>
                      <TableCell align='center'><strong>Unit Price</strong></TableCell>
                      <TableCell align='center'><strong>Total Price</strong></TableCell>
                      <TableCell align='center' sx={{ width: '180px' }}><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderToEdit.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">No items in this order</TableCell>
                      </TableRow>
                    ) : (
                      orderToEdit.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.inventory_name}</TableCell>
                          <TableCell align='center'>{item.item_type || 'Per Piece'}</TableCell>
                          <TableCell align='center'>{item.quantity}</TableCell>
                          <TableCell align='center'>₱{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align='center'>₱{item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell align='center' sx={{ width: '180px' }} >
                            <Box display="flex" justifyContent='center'>
                              <Button onClick={() => handleEditOrderItem(item, index)} size="small" color='primary' sx={{ minWidth: 0 }}>
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleRemoveEditOrderItem(index)}
                                size="small"
                                color="error"
                                sx={{ minWidth: 0 }}
                              >
                                Remove
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow>
                      <TableCell colSpan={4} align="right"><strong>Total:</strong></TableCell>
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
          <Button variant='text' color='error' onClick={() => setEditOrderDialogOpen(false)}>Cancel</Button>
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
                  <Tooltip title={isConverted ? "This RFQ is converted and the request ID cannot be changed." : ""}>
                    <span>
                      <TextField
                        label="Request ID"
                        value={quotationToEdit.request_id}
                        disabled={isConverted}
                        fullWidth
                        sx={{ mb: 2 }}
                      />
                    </span>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Tooltip title={isConverted ? "This RFQ is converted and the supplier cannot be changed." : ""}>
                    <span>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="edit-rfq-supplier-label">Supplier</InputLabel>
                        <Select
                          labelId="edit-rfq-supplier-label"
                          value={quotationToEdit.supplier_id}
                          disabled={isConverted}
                          onChange={(e) => setQuotationToEdit(prev => prev ? { ...prev, supplier_id: e.target.value as number } : null)}
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
                    </span>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Tooltip title={isConverted ? "This RFQ is converted and the request date cannot be changed." : " "}>
                    <span>
                      <TextField
                        label="Request Date"
                        type="date"
                        value={quotationToEdit.date}
                        disabled={isConverted}
                        onChange={(e) => setQuotationToEdit(prev => prev ? { ...prev, date: e.target.value } : null)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        required
                        sx={{ mb: 2 }}
                      />
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>
              <Tooltip title={isConverted ? "This RFQ is converted and the status cannot be changed." : " "} >
                <span>
                  <FormControl fullWidth sx={{ mb: 2 }} disabled={isConverted}>
                    <InputLabel id="edit-quotation-status-label">Status</InputLabel>
                    <Select
                      labelId="edit-quotation-status-label"
                      value={quotationToEdit.status}
                      onChange={(e) => setQuotationToEdit(prev => prev ? { ...prev, status: e.target.value } : null)}
                      label="Status"
                    >
                      {isConverted
                        ? <MenuItem value="Converted">Converted</MenuItem>
                        : ['Draft', 'Approved', 'Rejected'].map(status => (
                          <MenuItem key={status} value={status}>{status}</MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </span>
              </Tooltip>
              <Tooltip title={isConverted ? "This RFQ is converted and the notes cannot be changed." : " "} >
                <span>
                  <TextField
                    label="Notes"
                    multiline
                    rows={3}
                    disabled={isConverted}
                    value={quotationToEdit.notes || ''}
                    onChange={(e) => setQuotationToEdit(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    fullWidth
                    sx={{ mb: 3 }}
                  />
                </span>
              </Tooltip>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" gutterBottom>
                  Requested Items
                </Typography>
                {!currentEditQuotationItem && (
                  <Button
                    onClick={() => {
                      if (isConverted) {
                        setSnackbar({
                          open: true,
                          message: 'This RFQ has already been converted and can no longer be edited.',
                          severity: 'warning'
                        });
                      } else {
                        handleAddItemClick();
                      }
                    }}
                  >
                    + Add Item
                  </Button>


                )}
              </Box>
              {currentEditQuotationItem ? (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="edit-rfq-item-label">Inventory Item</InputLabel>
                        <Select
                          labelId="edit-rfq-item-label"
                          value={currentEditQuotationItem.inventory_id}
                          onChange={(e) =>
                            setCurrentEditQuotationItem({
                              ...currentEditQuotationItem,
                              inventory_id: e.target.value as number
                            })
                          }
                          label="Inventory Item"
                          disabled={typeof currentEditQuotationItem.index === 'number' && currentEditQuotationItem.index >= 0} // disable editing
                        >
                          {inventoryItems.map((item) => {
                            const alreadySelected = quotationToEdit.items.some((qItem, i) =>
                              qItem.inventory_id === item.id &&
                              i !== currentEditQuotationItem.index //allow current item to stay editable
                            );

                            return (
                              <MenuItem
                                key={item.id}
                                value={item.id}
                                disabled={alreadySelected}
                                style={alreadySelected ? { color: 'gray' } : undefined}
                              >
                                {item.itemName}
                              </MenuItem>
                            );
                          })}
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
                        disabled={isConverted}
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
                        disabled={isConverted}
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
                        disabled={isConverted}
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
                        variant="text"
                        color="error"
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
                      <TableCell align='center'><strong>Quantity</strong></TableCell>
                      <TableCell align='center'><strong>Expected Price</strong></TableCell>
                      <TableCell><strong>Notes</strong></TableCell>
                      <TableCell align='center'><strong>Actions</strong></TableCell>
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
                          <TableCell align='center'>{item.quantity}</TableCell>
                          <TableCell align='center'>
                            {item.expected_price
                              ? `₱${item.expected_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : 'To be quoted'
                            }
                          </TableCell>
                          <TableCell>{item.notes || '-'}</TableCell>
                          <TableCell align='center'>
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                              <Button
                                onClick={() => {
                                  if (isConverted) {
                                    setSnackbar({
                                      open: true,
                                      message: 'This RFQ has already been converted and can no longer be edited.',
                                      severity: 'warning'
                                    });
                                  } else {
                                    handleEditQuotationItem(item, index);
                                  }
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                onClick={() => {
                                  if (isConverted) {
                                    setSnackbar({
                                      open: true,
                                      message: 'This RFQ has already been converted and can no longer be edited.',
                                      severity: 'warning'
                                    });
                                  } else {
                                    handleRemoveEditQuotationItem(index);
                                  }
                                }}
                              >
                                Remove
                              </Button>
                            </Box>
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
          <Button onClick={() => setEditQuotationDialogOpen(false)}
            variant='text'
            color='error'
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (isConverted) {
                setSnackbar({
                  open: true,
                  message: 'This RFQ has been converted and cannot be edited.',
                  severity: 'warning'
                });
              } else if (quotationToEdit) {
                handleSaveEditedQuotation({
                  supplier_id: quotationToEdit.supplier_id,
                  date: quotationToEdit.date,
                  status: quotationToEdit.status,
                  notes: quotationToEdit.notes
                });
              }
            }}
            variant="contained"
            color="primary"
          >
            Save Changes
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