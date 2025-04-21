import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, Avatar, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Grid, FormControl, InputLabel, Select, MenuItem, Snackbar, Alert, SelectChangeEvent, Divider, FormControlLabel, Checkbox, Tab, Tabs } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Business, Person, Payments, Info, Refresh as RefreshIcon } from '@mui/icons-material';
import { Supplier, InsertSupplier } from '../services/suppliersService';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchSuppliers, searchSuppliers, createSupplier, updateSupplier, deleteSupplier,
  selectAllSuppliers, selectSuppliersStatus, selectSuppliersError } from '../redux/slices/suppliersSlice';
import { AppDispatch } from '../redux/store';

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
      id={`supplier-tabpanel-${index}`}
      aria-labelledby={`supplier-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: string;
  businessType: string;
  taxId: string;
  industry: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  alternatePhone: string;
  billingAddressSame: boolean;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  paymentTerms: string;
  leadTime: number | string;
  productCategories: string;
  taxExempt: boolean;
  relationship_since: Date | null;
  notes: string;
}

interface SupplierViewDetailsProps {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
}

// Business Info Tab Component
const BusinessInfoTab = ({ supplier }: { supplier: Supplier }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Business/Organization Name</Typography>
        <Typography variant="body1">{supplier.name}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Business Type</Typography>
        <Typography variant="body1">{supplier.businessType || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">TIN</Typography>
        <Typography variant="body1">{supplier.taxId || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Industry</Typography>
        <Typography variant="body1">{supplier.industry || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Supplier Since</Typography>
        <Typography variant="body1">{supplier.relationship_since || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Status</Typography>
        <Chip 
          label={supplier.status || 'Active'} 
          color={supplier.status === 'Inactive' ? 'default' : 'primary'}
          size="small"
        />
      </Grid>
    </Grid>
  );
};

// Contact Details Tab Component
const ContactDetailsTab = ({ supplier }: { supplier: Supplier }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Email</Typography>
        <Typography variant="body1">{supplier.email || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Phone</Typography>
        <Typography variant="body1">{supplier.phone || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Alternate Phone</Typography>
        <Typography variant="body1">{supplier.alternatePhone || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight="bold">Address</Typography>
        <Typography variant="body1">{supplier.address || 'Not specified'}</Typography>
      </Grid>
    </Grid>
  );
};

// Billing & Payment Tab Component
const BillingPaymentTab = ({ supplier }: { supplier: Supplier }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight="bold">Billing Address</Typography>
        {supplier.billingAddressSame ? (
          <Typography variant="body1">Same as business address</Typography>
        ) : (
          <Typography variant="body1">{supplier.billingAddress || 'Not specified'}</Typography>
        )}
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Payment Terms</Typography>
        <Typography variant="body1">{supplier.paymentTerms || 'Not specified'}</Typography>
      </Grid>
    </Grid>
  );
};

// Additional Info Tab Component
const AdditionalInfoTab = ({ supplier }: { supplier: Supplier }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight="bold">Product Categories</Typography>
        <Typography variant="body1">{supplier.productCategories || 'None specified'}</Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight="bold">Notes</Typography>
        <Typography variant="body1">{supplier.notes || 'No notes'}</Typography>
      </Grid>
    </Grid>
  );
};

// Supplier View Details Dialog Component
const SupplierViewDetails: React.FC<SupplierViewDetailsProps> = ({ open, supplier, onClose }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Supplier Details: {supplier.name}
        {supplier.status === 'Inactive' && (
          <Chip 
            label="Inactive" 
            color="default"
            size="small" 
            sx={{ ml: 1 }}
          />
        )}
      </DialogTitle>
      <Divider />
      
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="supplier details tabs" centered>
        <Tab icon={<Business />} label="Business Info" />
        <Tab icon={<Person />} label="Contact Details" />
        <Tab icon={<Payments />} label="Billing & Payment" />
        <Tab icon={<Info />} label="Additional Info" />
      </Tabs>
      
      <DialogContent>
        <TabPanel value={tabValue} index={0}>
          <BusinessInfoTab supplier={supplier} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ContactDetailsTab supplier={supplier} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <BillingPaymentTab supplier={supplier} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <AdditionalInfoTab supplier={supplier} />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const SuppliersList: React.FC = () => {
  // Use Redux state and dispatch
  const dispatch = useDispatch<AppDispatch>();
  const suppliers = useSelector(selectAllSuppliers);
  const status = useSelector(selectSuppliersStatus);
  const error = useSelector(selectSuppliersError);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [openViewDialog, setOpenViewDialog] = useState<boolean>(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    status: 'Active',
    businessType: 'Company',
    taxId: '',
    industry: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    alternatePhone: '',
    billingAddressSame: true,
    billing_address_line1: '',
    billing_address_line2: '',
    billing_city: '',
    billing_state: '',
    billing_postal_code: '',
    paymentTerms: '30 Days Term',
    leadTime: 7,
    productCategories: '',
    taxExempt: false,
    relationship_since: new Date(),
    notes: ''
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const businessTypes = ['Company', 'Corporation', 'LLC', 'Sole Proprietorship', 'Partnership', 'Other'];
  const industries = ['Printing Supplies', 'Paper', 'Ink', 'Machinery', 'Electronics', 'Tools', 'Packaging', 'Office Supplies', 'Other'];
  const paymentTerms = [
    'Cash on Delivery (COD)',
    'Cash Before Delivery (CBD)',
    '7 Days PDC',
    '15 Days PDC',
    '30 Days PDC',
    'Cash on Pickup (COP)',
    '50% DP, 50% on Delivery',
    '30% DP, 70% on Delivery',
    'Cash Terms',
    '7 Days Term',
    '15 Days Term',
    '30 Days Term',
    '60 Days Term',
    '90 Days Term',
    'GCash/Digital Payment',
    'Credit Card',
    'Monthly Direct Debit'
  ];

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Fetch suppliers on component mount
  const fetchSuppliersList = useCallback(() => {
    dispatch(fetchSuppliers());
  }, [dispatch]);

  useEffect(() => {
    fetchSuppliersList();
  }, [fetchSuppliersList]);

  // Show error in snackbar if fetch fails
  useEffect(() => {
    if (status === 'failed' && error) {
      showSnackbar(`Error: ${error}`, 'error');
    }
  }, [status, error, showSnackbar]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      dispatch(fetchSuppliers());
      return;
    }
    
    dispatch(searchSuppliers(searchQuery));
  };

  const handleOpenViewDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedSupplier(null);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (window.confirm(`Are you sure you want to delete ${supplier.name}?`)) {
      try {
        const supplierId = typeof supplier.id === 'string' 
          ? parseInt(supplier.id, 10) 
          : supplier.id;
          
        await dispatch(deleteSupplier(supplierId)).unwrap();
        showSnackbar('Supplier deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting supplier:', error);
        showSnackbar('Failed to delete supplier: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      }
    }
  };

  const parseAddress = (address?: string | null) => {
    if (!address) return { line1: '', line2: '', city: '', state: '', postalCode: '' };
    
    const parts = address.split(', ');
    return {
      line1: parts[0] || '',
      line2: parts.length > 4 ? parts[1] : '',
      city: parts.length > 4 ? parts[2] : (parts.length > 1 ? parts[1] : ''),
      state: parts.length > 4 ? parts[3] : (parts.length > 2 ? parts[2] : ''),
      postalCode: parts.length > 4 ? parts[4] : (parts.length > 3 ? parts[3] : '')
    };
  };

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      const mainAddress = parseAddress(supplier.address);
      const billingAddress = supplier.billingAddressSame ? 
        mainAddress : parseAddress(supplier.billingAddress);
      
      setSelectedSupplier(supplier);
      
      // For edit mode, make sure no values are undefined even if fields are missing
      // We provide default values for all required fields to prevent validation errors
      const updatedFormData = {
        name: supplier.name || 'Unnamed Supplier',
        contactPerson: supplier.contactPerson || 'Unknown Contact',
        email: supplier.email || '',
        phone: supplier.phone || '',
        status: supplier.status === 'Inactive' ? 'Inactive' : 'Active',
        businessType: supplier.businessType || 'Company',
        taxId: supplier.taxId || '',
        industry: supplier.industry || '',
        address_line1: mainAddress.line1 || '',
        address_line2: mainAddress.line2 || '',
        city: mainAddress.city || '',
        state: mainAddress.state || '',
        postal_code: mainAddress.postalCode || '',
        alternatePhone: supplier.alternatePhone || '',
        billingAddressSame: supplier.billingAddressSame !== false,
        billing_address_line1: billingAddress.line1 || '',
        billing_address_line2: billingAddress.line2 || '',
        billing_city: billingAddress.city || '',
        billing_state: billingAddress.state || '',
        billing_postal_code: billingAddress.postalCode || '',
        paymentTerms: supplier.paymentTerms || '30 Days Term',
        leadTime: supplier.leadTime !== null && supplier.leadTime !== undefined ? supplier.leadTime : 7,
        productCategories: supplier.productCategories || '',
        taxExempt: supplier.taxExempt || false,
        relationship_since: supplier.relationship_since ? new Date(supplier.relationship_since) : new Date(),
        notes: supplier.notes || ''
      };
      
      setFormData(updatedFormData);
    } else {
      setSelectedSupplier(null);
      setFormData({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        status: 'Active',
        businessType: 'Company',
        taxId: '',
        industry: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        alternatePhone: '',
        billingAddressSame: true,
        billing_address_line1: '',
        billing_address_line2: '',
        billing_city: '',
        billing_state: '',
        billing_postal_code: '',
        paymentTerms: '30 Days Term',
        leadTime: 7,
        productCategories: '',
        taxExempt: false,
        relationship_since: new Date(),
        notes: ''
      });
    }
    setOpenDialog(true);
    setTabValue(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSupplier(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
    
    if (name === 'billingAddressSame' && checked) {
      setFormData(prev => ({
        ...prev,
        billing_address_line1: prev.address_line1 || '',
        billing_address_line2: prev.address_line2 || '',
        billing_city: prev.city || '',
        billing_state: prev.state || '',
        billing_postal_code: prev.postal_code || ''
      }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    // Check if the date is valid before setting it
    if (date && !isNaN(date.getTime())) {
      setFormData(prev => ({
        ...prev,
        relationship_since: date
      }));
    } else {
      // If invalid date, set to null
      setFormData(prev => ({
        ...prev,
        relationship_since: null
      }));
    }
  };

  const handleSubmit = async () => {
    // Apply default values to ensure they are never empty
    const nameEmpty = !formData.name || formData.name.trim() === '';
    const contactPersonEmpty = !formData.contactPerson || formData.contactPerson.trim() === '';
    
    if (nameEmpty || contactPersonEmpty) {
      const updatedFormData = {...formData};
      
      if (nameEmpty) {
        updatedFormData.name = 'Unnamed Supplier';
      }
      
      if (contactPersonEmpty) {
        updatedFormData.contactPerson = 'Unknown Contact';
      }
      
      setFormData(updatedFormData);
    }

    try {
      const formattedAddress = formData.address_line1 ? 
        [
          formData.address_line1,
          formData.address_line2,
          formData.city,
          formData.state,
          formData.postal_code
        ].filter(Boolean).join(', ') : null;
      
      const formattedBillingAddress = !formData.billingAddressSame && formData.billing_address_line1 ? 
        [
          formData.billing_address_line1,
          formData.billing_address_line2,
          formData.billing_city,
          formData.billing_state,
          formData.billing_postal_code
        ].filter(Boolean).join(', ') : null;

      let relationshipSince: string | undefined = undefined;
      if (formData.relationship_since && formData.relationship_since instanceof Date && !isNaN(formData.relationship_since.getTime())) {
        relationshipSince = formData.relationship_since.toISOString().split('T')[0]; 
      }
      
      const supplierData: InsertSupplier = {
        name: formData.name,
        contactPerson: formData.contactPerson,
        email: formData.email || '',
        phone: formData.phone || '',
        status: formData.status, // This should be either 'Active' or 'Inactive'
        address: formattedAddress,
        notes: formData.notes || '',
        businessType: formData.businessType || 'Company',
        industry: formData.industry || '',
        taxId: formData.taxId || '',
        relationship_since: relationshipSince,
        alternatePhone: formData.alternatePhone || '',
        billingAddressSame: formData.billingAddressSame,
        billingAddress: formattedBillingAddress,
        paymentTerms: formData.paymentTerms || '30 Days Term',
        leadTime: Number(formData.leadTime) || 7,
        productCategories: formData.productCategories || '',
        taxExempt: Boolean(formData.taxExempt)
      };

      if (selectedSupplier && selectedSupplier.id) {
        const supplierId = typeof selectedSupplier.id === 'string' 
          ? parseInt(selectedSupplier.id, 10) 
          : selectedSupplier.id;
          
        await dispatch(updateSupplier({ id: supplierId, supplier: supplierData })).unwrap();
        showSnackbar('Supplier updated successfully', 'success');
      } else {
        await dispatch(createSupplier(supplierData)).unwrap();
        showSnackbar('Supplier created successfully', 'success');
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving supplier:', error);
      showSnackbar('Failed to save supplier: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 70%, 50%)`;
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isLoading = status === 'loading';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Suppliers
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Supplier
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          placeholder="Search suppliers..."
          variant="outlined"
          size="small"
          sx={{ width: 300, mr: 2 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button 
          variant="outlined"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchSuppliersList}
        >
          Refresh Data
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: 'background.paper' }}>
              <TableRow>
                <TableCell><strong>Supplier Name</strong></TableCell>
                <TableCell><strong>Contact Person</strong></TableCell>
                <TableCell><strong>Phone</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.length > 0 ? (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        opacity: supplier.status === 'Inactive' ? 0.7 : 1
                      }}>
                        <Avatar sx={{ 
                          bgcolor: getAvatarColor(supplier.name), 
                          mr: 2,
                          opacity: supplier.status === 'Inactive' ? 0.7 : 1
                        }}>
                          {getInitials(supplier.name)}
                        </Avatar>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          sx={{ 
                            textDecoration: supplier.status === 'Inactive' ? 'line-through' : 'none',
                          }}
                        >
                          {supplier.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{supplier.contactPerson}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell>
                      <Chip 
                        label={supplier.status === 'Inactive' ? 'Inactive' : 'Active'} 
                        color={supplier.status === 'Inactive' ? 'default' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        onClick={() => handleOpenViewDialog(supplier)}
                        sx={{ mr: 1 }}
                      >
                        View
                      </Button>
                      <Button 
                        size="small"
                        onClick={() => handleOpenDialog(supplier)}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="small" 
                        onClick={() => handleDelete(supplier)}
                        color="error"
                        sx={{ mr: 1 }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No suppliers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Supplier Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedSupplier ? `Edit Supplier: ${selectedSupplier.name}` : 'Add New Supplier'}
        </DialogTitle>
        
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="supplier form tabs" centered>
          <Tab icon={<Business />} label="Business Info" />
          <Tab icon={<Person />} label="Contact Details" />
          <Tab icon={<Payments />} label="Billing & Payment" />
          <Tab icon={<Info />} label="Additional Info" />
        </Tabs>
        
        <DialogContent>
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Business Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="name"
                  label="Business/Organization Name"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  error={!formData.name}
                  helperText={!formData.name ? "Name is required" : ""}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="business-type-label">Business Type</InputLabel>
                  <Select
                    labelId="business-type-label"
                    name="businessType"
                    value={formData.businessType}
                    label="Business Type"
                    onChange={handleSelectChange}
                  >
                    {businessTypes.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="taxId"
                  label="TIN"
                  fullWidth
                  value={formData.taxId}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="industry-label">Industry</InputLabel>
                  <Select
                    labelId="industry-label"
                    name="industry"
                    value={formData.industry}
                    label="Industry"
                    onChange={handleSelectChange}
                  >
                    {industries.map((industry) => (
                      <MenuItem key={industry} value={industry}>{industry}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="status-label">Supplier Status</InputLabel>
                  <Select
                    labelId="status-label"
                    name="status"
                    value={formData.status}
                    label="Supplier Status"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Relationship Since"
                    value={formData.relationship_since}
                    onChange={handleDateChange}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true,
                        inputProps: {
                          readOnly: true
                        }
                      } 
                    }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Primary Contact
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="contactPerson"
                  label="Contact Person Name"
                  fullWidth
                  required
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  error={!formData.contactPerson}
                  helperText={!formData.contactPerson ? "Contact Person is required" : ""}
                  />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="email"
                  label="Email Address"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="phone"
                  label="Phone Number"
                  fullWidth
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="alternatePhone"
                  label="Alternate Phone"
                  fullWidth
                  value={formData.alternatePhone}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Address
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="address_line1"
                  label="Address"
                  fullWidth
                  value={formData.address_line1}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  name="city"
                  label="City"
                  fullWidth
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  name="state"
                  label="State/Province"
                  fullWidth
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  name="postal_code"
                  label="Postal Code"
                  fullWidth
                  value={formData.postal_code}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Billing Information
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.billingAddressSame}
                      onChange={handleCheckboxChange}
                      name="billingAddressSame"
                      color="primary"
                    />
                  }
                  label="Billing address same as business address"
                />
              </Grid>
              
              {!formData.billingAddressSame && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      name="billing_address_line1"
                      label="Billing Address Line 1"
                      fullWidth
                      value={formData.billing_address_line1}
                      onChange={handleInputChange}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      name="billing_city"
                      label="City"
                      fullWidth
                      value={formData.billing_city}
                      onChange={handleInputChange}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      name="billing_state"
                      label="State/Province"
                      fullWidth
                      value={formData.billing_state}
                      onChange={handleInputChange}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                   <TextField
                     name="billing_postal_code"
                     label="Postal Code"
                     fullWidth
                     value={formData.billing_postal_code}
                     onChange={handleInputChange}
                   />
                 </Grid>
               </>
             )}
             
             <Grid item xs={12}>
               <Divider sx={{ my: 2 }} />
               <Typography variant="h6" gutterBottom>
                 Payment Details
               </Typography>
             </Grid>
             
             <Grid item xs={12} md={6}>
               <FormControl fullWidth>
                 <InputLabel id="payment-terms-label">Payment Terms</InputLabel>
                 <Select
                   labelId="payment-terms-label"
                   name="paymentTerms"
                   value={formData.paymentTerms}
                   label="Payment Terms"
                   onChange={handleSelectChange}
                 >
                   {paymentTerms.map((term) => (
                     <MenuItem key={term} value={term}>{term}</MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Grid>
             
           </Grid>
         </TabPanel>
         
         <TabPanel value={tabValue} index={3}>
           <Grid container spacing={3}>
             <Grid item xs={12}>
               <Typography variant="h6" gutterBottom>
                 Product Information
               </Typography>
             </Grid>
             
             <Grid item xs={12}>
               <TextField
                 name="productCategories"
                 label="Product Categories"
                 multiline
                 rows={2}
                 fullWidth
                 value={formData.productCategories}
                 onChange={handleInputChange}
                 placeholder="Enter product categories, separated by commas"
               />
             </Grid>
             
             <Grid item xs={12}>
               <Divider sx={{ my: 2 }} />
               <Typography variant="h6" gutterBottom>
                 Notes
               </Typography>
             </Grid>
             
             <Grid item xs={12}>
               <TextField
                 name="notes"
                 label="General Notes"
                 multiline
                 rows={4}
                 fullWidth
                 value={formData.notes}
                 onChange={handleInputChange}
                 placeholder="Add any additional information about this supplier's specific products, history, or other important details."
               />
             </Grid>
           </Grid>
         </TabPanel>
       </DialogContent>
       <DialogActions>
         <Button onClick={handleCloseDialog}>Cancel</Button>
         <Button 
           onClick={handleSubmit} 
           variant="contained" 
           color="primary"
           disabled={isLoading}
         >
           {isLoading ? <CircularProgress size={24} /> : (selectedSupplier ? 'Save Supplier' : 'Add Supplier')}
         </Button>
       </DialogActions>
     </Dialog>

      {/* View Supplier Details Dialog */}
      <SupplierViewDetails 
        open={openViewDialog}
        supplier={selectedSupplier}
        onClose={handleCloseViewDialog}
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

export default SuppliersList;