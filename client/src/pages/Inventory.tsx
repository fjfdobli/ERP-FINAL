import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, Chip, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Grid, Divider } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchInventory, 
  fetchLowStockItems,
  updateInventoryItem, 
  addInventoryTransaction, 
  createInventoryItem,
  fetchActiveSuppliers,
  fetchActiveEmployees,
  selectAllInventoryItems,
  selectInventoryLoading,
  selectInventoryError,
  selectActiveSuppliers,
  selectActiveEmployees
} from '../redux/slices/inventorySlice';
import { InventoryItem } from '../services/inventoryService';
import { AppDispatch } from '../redux/store';

// Item types for a printing press
const itemTypes = [
  { id: 'paper', name: 'Paper' },
  { id: 'ink', name: 'Ink' },
  { id: 'plate', name: 'Printing Plate' },
  { id: 'chemical', name: 'Chemical' },
  { id: 'binding', name: 'Binding Material' },
  { id: 'spare', name: 'Spare Part' },
  { id: 'other', name: 'Other' }
];

const InventoryList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux state
  const inventoryItems = useSelector(selectAllInventoryItems);
  const isLoading = useSelector(selectInventoryLoading);
  const error = useSelector(selectInventoryError);
  const activeSuppliers = useSelector(selectActiveSuppliers);
  const activeEmployees = useSelector(selectActiveEmployees);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(1);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // State for new item form
  const [newItem, setNewItem] = useState({
    itemName: '',
    sku: '',
    itemType: '',
    quantity: 0,
    minStockLevel: 0,
    unitPrice: 0,
    supplierId: ''
  });

  useEffect(() => {
    // Fetch inventory data on component mount
    dispatch(fetchInventory());
    
    // Fetch active suppliers and employees
    dispatch(fetchActiveSuppliers());
    dispatch(fetchActiveEmployees());
  }, [dispatch]);

  // Show error in snackbar if fetch fails
  useEffect(() => {
    if (error) {
      setSnackbarMessage(`Error: ${error}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [error]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleLowStockFilter = () => {
    setShowLowStock(!showLowStock);
  };

  // Filter inventory items
  // First by low stock if that filter is active
  const lowStockFilteredItems = showLowStock
    ? inventoryItems.filter(item => item.quantity < item.minStockLevel)
    : inventoryItems;

  // Then by search term if one exists
  const filteredItems = searchTerm 
    ? lowStockFilteredItems.filter(item =>
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemType.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : lowStockFilteredItems;

  const handleOpenQuantityDialog = (item: InventoryItem, type: 'add' | 'remove') => {
    setSelectedItem(item);
    setAdjustmentType(type);
    setAdjustmentAmount(1);
    
    // Set default selections based on type
    if (type === 'add' && activeSuppliers.length > 0) {
      setSelectedSupplierId(String(activeSuppliers[0].id));
    } else if (type === 'remove' && activeEmployees.length > 0) {
      setSelectedEmployeeId(String(activeEmployees[0].id));
    }
    
    setQuantityDialogOpen(true);
  };

  const handleCloseQuantityDialog = () => {
    setQuantityDialogOpen(false);
    setSelectedItem(null);
    setSelectedSupplierId('');
    setSelectedEmployeeId('');
  };

  const handleOpenAddItemDialog = () => {
    setAddItemDialogOpen(true);
    // Set default supplier if available
    if (activeSuppliers.length > 0) {
      setNewItem(prev => ({ ...prev, supplierId: String(activeSuppliers[0].id) }));
    }
  };

  const handleCloseAddItemDialog = () => {
    setAddItemDialogOpen(false);
    // Reset form
    setNewItem({
      itemName: '',
      sku: '',
      itemType: '',
      quantity: 0,
      minStockLevel: 0,
      unitPrice: 0,
      supplierId: ''
    });
  };

  const handleAdjustmentAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 1) {
      setAdjustmentAmount(value);
    }
  };

  const handleSupplierChange = (event: SelectChangeEvent<string>) => {
    setSelectedSupplierId(event.target.value);
  };

  const handleEmployeeChange = (event: SelectChangeEvent<string>) => {
    setSelectedEmployeeId(event.target.value);
  };

  const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleNewItemNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setNewItem(prev => ({ ...prev, [name]: numValue }));
    }
  };

  const handleNewItemSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveNewItem = async () => {
    try {
      // Check required fields
      if (!newItem.itemName || !newItem.sku || !newItem.itemType) {
        setSnackbarMessage('Please fill in all required fields');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      // Convert to the proper format for creating an inventory item
      await dispatch(createInventoryItem({
        itemName: newItem.itemName,
        sku: newItem.sku,
        itemType: newItem.itemType,
        quantity: newItem.quantity,
        minStockLevel: newItem.minStockLevel,
        unitPrice: newItem.unitPrice,
        supplierId: newItem.supplierId ? Number(newItem.supplierId) : undefined
      })).unwrap();

      setSnackbarMessage('Inventory item created successfully');
      setSnackbarSeverity('success');
      handleCloseAddItemDialog();
    } catch (error) {
      console.error('Error creating inventory item:', error);
      setSnackbarMessage('Error creating inventory item');
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
    }
  };

  const handleAdjustQuantity = async () => {
    if (!selectedItem) return;

    try {
      const newQuantity = adjustmentType === 'add' 
        ? selectedItem.quantity + adjustmentAmount
        : Math.max(0, selectedItem.quantity - adjustmentAmount);

      // First, update the item quantity
      await dispatch(updateInventoryItem({
        id: selectedItem.id,
        data: { quantity: newQuantity }
      })).unwrap();

      // Then add a transaction record
      await dispatch(addInventoryTransaction({
        inventoryId: selectedItem.id,
        transactionData: {
          transactionType: adjustmentType === 'add' ? 'stock_in' : 'stock_out',
          quantity: adjustmentAmount,
          createdBy: Number(adjustmentType === 'add' ? selectedSupplierId : selectedEmployeeId),
          isSupplier: adjustmentType === 'add',
          notes: `${adjustmentType === 'add' ? 'Stock In' : 'Stock Out'} transaction`
        }
      })).unwrap();

      setSnackbarMessage(`Successfully ${adjustmentType === 'add' ? 'added' : 'removed'} ${adjustmentAmount} ${selectedItem.itemName}`);
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      setSnackbarMessage(`Error ${adjustmentType === 'add' ? 'adding' : 'removing'} inventory`);
      setSnackbarSeverity('error');
    } finally {
      setSnackbarOpen(true);
      handleCloseQuantityDialog();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Inventory
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpenAddItemDialog}
        >
          Add Item
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          placeholder="Search inventory..."
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
        <Button 
          variant={showLowStock ? "contained" : "outlined"} 
          color="error" 
          onClick={handleLowStockFilter}
          sx={{ mr: 1 }}
        >
          {showLowStock ? "All Items" : "Low Stock"}
        </Button>
      </Box>

      {isLoading && inventoryItems.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: 'background.paper' }}>
              <TableRow>
                <TableCell><strong>Item Name</strong></TableCell>
                <TableCell><strong>SKU</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Quantity</strong></TableCell>
                <TableCell><strong>Min Stock</strong></TableCell>
                <TableCell><strong>Current Stock</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    {showLowStock ? "No low stock items found" : "No items found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const quantity = item.quantity;
                  const minStock = item.minStockLevel;
                  const stockLevel = Math.min((quantity / Math.max(minStock, 1)) * 100, 100); // Capped at 100%
                  const isLowStock = quantity < minStock;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.itemType}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 100, mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={stockLevel} 
                              color={isLowStock ? "error" : "primary"} 
                            />
                          </Box>
                          <Typography>
                            {quantity}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{minStock}</TableCell>
                      <TableCell>{quantity}</TableCell>
                      <TableCell>
                        <Chip 
                          label={isLowStock ? 'Low Stock' : 'In Stock'} 
                          color={isLowStock ? 'error' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          variant="outlined"
                          color="primary"
                          onClick={() => handleOpenQuantityDialog(item, 'add')}
                          sx={{ mr: 1 }}
                          disabled={activeSuppliers.length === 0}
                        >
                          Stock In
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined"
                          color="error"
                          onClick={() => handleOpenQuantityDialog(item, 'remove')}
                          disabled={quantity <= 0 || activeEmployees.length === 0}
                        >
                          Stock Out
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

      {/* Quantity Adjustment Dialog */}
      <Dialog open={quantityDialogOpen} onClose={handleCloseQuantityDialog}>
        <DialogTitle>
          {adjustmentType === 'add' ? 'Stock In' : 'Stock Out'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, minWidth: 350 }}>
            <Typography variant="subtitle1" gutterBottom>
              {selectedItem?.itemName} (Current: {selectedItem?.quantity})
            </Typography>
            
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={adjustmentAmount}
              onChange={handleAdjustmentAmountChange}
              margin="normal"
              InputProps={{
                inputProps: { min: 1 }
              }}
              autoFocus
            />
            
            {adjustmentType === 'add' ? (
              <FormControl fullWidth margin="normal">
                <InputLabel id="supplier-select-label">Supplier</InputLabel>
                <Select
                  labelId="supplier-select-label"
                  value={selectedSupplierId}
                  label="Supplier"
                  onChange={handleSupplierChange}
                >
                  {activeSuppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                      </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth margin="normal">
                <InputLabel id="employee-select-label">Employee</InputLabel>
                <Select
                  labelId="employee-select-label"
                  value={selectedEmployeeId}
                  label="Employee"
                  onChange={handleEmployeeChange}
                >
                  {activeEmployees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {adjustmentType === 'remove' && selectedItem && adjustmentAmount > selectedItem.quantity && (
              <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>
                Warning: This will reduce inventory below zero.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuantityDialog}>Cancel</Button>
          <Button 
            onClick={handleAdjustQuantity} 
            color="primary" 
            variant="contained"
            disabled={
              adjustmentAmount <= 0 || 
              (adjustmentType === 'add' && !selectedSupplierId) || 
              (adjustmentType === 'remove' && !selectedEmployeeId)
            }
          >
            {adjustmentType === 'add' ? 'Stock In' : 'Stock Out'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add New Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={handleCloseAddItemDialog} maxWidth="md" fullWidth>
        <DialogTitle>Add New Inventory Item</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="itemName"
                  label="Item Name *"
                  value={newItem.itemName}
                  onChange={handleNewItemChange}
                  fullWidth
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="sku"
                  label="SKU *"
                  value={newItem.sku}
                  onChange={handleNewItemChange}
                  fullWidth
                  required
                  helperText="Unique identifier for this item"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel id="item-type-label">Item Type</InputLabel>
                  <Select
                    labelId="item-type-label"
                    name="itemType"
                    value={newItem.itemType}
                    label="Item Type *"
                    onChange={handleNewItemSelectChange}
                  >
                    {itemTypes.map(type => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="supplier-label">Supplier</InputLabel>
                  <Select
                    labelId="supplier-label"
                    name="supplierId"
                    value={newItem.supplierId}
                    label="Supplier"
                    onChange={handleNewItemSelectChange}
                  >
                    {activeSuppliers.map(supplier => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Stock Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  name="quantity"
                  label="Initial Quantity"
                  type="number"
                  value={newItem.quantity}
                  onChange={handleNewItemNumberChange}
                  fullWidth
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  name="minStockLevel"
                  label="Minimum Stock Level"
                  type="number"
                  value={newItem.minStockLevel}
                  onChange={handleNewItemNumberChange}
                  fullWidth
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                  helperText="Alert when below this level"
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  name="unitPrice"
                  label="Unit Price"
                  type="number"
                  value={newItem.unitPrice}
                  onChange={handleNewItemNumberChange}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseAddItemDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveNewItem} 
            variant="contained" 
            color="primary"
            disabled={!newItem.itemName || !newItem.sku || !newItem.itemType}
          >
            Save Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
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

export default InventoryList;