import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, Avatar, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Grid, FormControl, InputLabel, Select, MenuItem, Snackbar, Alert, SelectChangeEvent, Divider, FormControlLabel, Checkbox, Tab, Tabs } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Business, Person, Payments, Info, Refresh as RefreshIcon } from '@mui/icons-material';
import { Client, InsertClient } from '../services/clientsService';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchClients, 
  searchClients, 
  createClient, 
  updateClient,
  deleteClient,
  selectAllClients,
  selectClientsStatus,
  selectClientsError 
} from '../redux/slices/clientsSlice';
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
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
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

interface ClientFormData {
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
  creditLimit: number | string;
  taxExempt: boolean;
  specialRequirements: string;
  acquisition_date: Date | null;
  notes: string;
}

interface ClientViewDetailsProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
}

// Business Info Tab Component
const BusinessInfoTab = ({ client }: { client: Client }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Business/Organization Name</Typography>
        <Typography variant="body1">{client.name}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Business Type</Typography>
        <Typography variant="body1">{client.businessType || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">TIN</Typography>
        <Typography variant="body1">{client.taxId || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Industry</Typography>
        <Typography variant="body1">{client.industry || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Client Since</Typography>
        <Typography variant="body1">{client.clientSince || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Status</Typography>
        <Chip 
          label={client.status || 'Active'} 
          color={client.status === 'Inactive' ? 'default' : 'primary'}
          size="small"
        />
      </Grid>
    </Grid>
  );
};

// Contact Details Tab Component
const ContactDetailsTab = ({ client }: { client: Client }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Email</Typography>
        <Typography variant="body1">{client.email || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Phone</Typography>
        <Typography variant="body1">{client.phone || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Alternate Phone</Typography>
        <Typography variant="body1">{client.alternatePhone || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight="bold">Address</Typography>
        <Typography variant="body1">{client.address || 'Not specified'}</Typography>
      </Grid>
    </Grid>
  );
};

// Billing & Payment Tab Component
const BillingPaymentTab = ({ client }: { client: Client }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight="bold">Billing Address</Typography>
        {client.billingAddressSame ? (
          <Typography variant="body1">Same as business address</Typography>
        ) : (
          <Typography variant="body1">{client.billingAddress || 'Not specified'}</Typography>
        )}
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Payment Terms</Typography>
        <Typography variant="body1">{client.paymentTerms || 'Not specified'}</Typography>
      </Grid>
      
      
    </Grid>
  );
};

// Additional Info Tab Component
const AdditionalInfoTab = ({ client }: { client: Client }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight="bold">Special Requirements or Preferences</Typography>
        <Typography variant="body1">{client.specialRequirements || 'None specified'}</Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight="bold">Notes</Typography>
        <Typography variant="body1">{client.notes || 'No notes'}</Typography>
      </Grid>
    </Grid>
  );
};

// Client View Details Dialog Component
const ClientViewDetails: React.FC<ClientViewDetailsProps> = ({ open, client, onClose }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Client Details: {client.name}
        {client.status === 'Inactive' && (
          <Chip 
            label="Inactive" 
            color="default"
            size="small" 
            sx={{ ml: 1 }}
          />
        )}
      </DialogTitle>
      <Divider />
      
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="client details tabs" centered>
        <Tab icon={<Business />} label="Business Info" />
        <Tab icon={<Person />} label="Contact Details" />
        <Tab icon={<Payments />} label="Billing & Payment" />
        <Tab icon={<Info />} label="Additional Info" />
      </Tabs>
      
      <DialogContent>
        <TabPanel value={tabValue} index={0}>
          <BusinessInfoTab client={client} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ContactDetailsTab client={client} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <BillingPaymentTab client={client} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <AdditionalInfoTab client={client} />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const ClientsList: React.FC = () => {
  // Use Redux state and dispatch
  const dispatch = useDispatch<AppDispatch>();
  const clients = useSelector(selectAllClients);
  const status = useSelector(selectClientsStatus);
  const error = useSelector(selectClientsError);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [openViewDialog, setOpenViewDialog] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<ClientFormData>({
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
    creditLimit: 5000,
    taxExempt: false,
    specialRequirements: '',
    acquisition_date: new Date(),
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

  const businessTypes = ['Company', 'Organization', 'Government', 'Educational', 'Individual', 'Other'];
  const industries = ['Publishing', 'Marketing', 'Advertising', 'Education', 'Government', 'Retail', 'Healthcare', 'Financial', 'Technology', 'Manufacturing', 'Nonprofit', 'Other'];


  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Fetch clients on component mount
  const fetchClientsList = useCallback(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  useEffect(() => {
    fetchClientsList();
  }, [fetchClientsList]);

  // Show error in snackbar if fetch fails
  useEffect(() => {
    if (status === 'failed' && error) {
      showSnackbar(`Error: ${error}`, 'error');
    }
  }, [status, error, showSnackbar]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      dispatch(fetchClients());
      return;
    }
    
    dispatch(searchClients(searchQuery));
  };

  const handleOpenViewDialog = (client: Client) => {
    setSelectedClient(client);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedClient(null);
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

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      const mainAddress = parseAddress(client.address);
      const billingAddress = client.billingAddressSame ? 
        mainAddress : parseAddress(client.billingAddress);
      
      setSelectedClient(client);
      setFormData({
        name: client.name,
        contactPerson: client.contactPerson,
        email: client.email || '',
        phone: client.phone || '',
        status: client.status === 'Inactive' ? 'Inactive' : 'Active',
        businessType: client.businessType || 'Company',
        taxId: client.taxId || '',
        industry: client.industry || '',
        address_line1: mainAddress.line1,
        address_line2: mainAddress.line2,
        city: mainAddress.city,
        state: mainAddress.state,
        postal_code: mainAddress.postalCode,
        alternatePhone: client.alternatePhone || '',
        billingAddressSame: client.billingAddressSame !== false,
        billing_address_line1: billingAddress.line1,
        billing_address_line2: billingAddress.line2,
        billing_city: billingAddress.city,
        billing_state: billingAddress.state,
        billing_postal_code: billingAddress.postalCode,
        paymentTerms: client.paymentTerms || '30 Days Term',
        creditLimit: client.creditLimit !== null && client.creditLimit !== undefined ? client.creditLimit : 5000,
        taxExempt: client.taxExempt || false,
        specialRequirements: client.specialRequirements || '',
        acquisition_date: client.clientSince ? new Date(client.clientSince) : new Date(),
        notes: client.notes || ''
      });
    } else {
      setSelectedClient(null);
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
        creditLimit: 5000,
        taxExempt: false,
        specialRequirements: '',
        acquisition_date: new Date(),
        notes: ''
      });
    }
    setOpenDialog(true);
    setTabValue(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedClient(null);
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
    setFormData(prev => ({
      ...prev,
      acquisition_date: date
    }));
  };

  const handleDelete = async (client: Client) => {
    if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
      try {
        const clientId = typeof client.id === 'string' 
          ? parseInt(client.id, 10) 
          : client.id;
          
        await dispatch(deleteClient(clientId)).unwrap();
        showSnackbar('Client deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting client:', error);
        showSnackbar('Failed to delete client: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.contactPerson) {
      showSnackbar('Client name and contact person are required', 'error');
      return;
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

      let clientSince: string | undefined = undefined;
      if (formData.acquisition_date) {
        clientSince = formData.acquisition_date.toISOString().split('T')[0]; 
      }
      
      const clientData: InsertClient = {
        name: formData.name,
        contactPerson: formData.contactPerson,
        email: formData.email || '',
        phone: formData.phone || '',
        status: formData.status,
        address: formattedAddress,
        notes: formData.notes || '',
        businessType: formData.businessType || 'Company',
        industry: formData.industry || '',
        taxId: formData.taxId || '',
        clientSince: clientSince,
        alternatePhone: formData.alternatePhone || '',
        billingAddressSame: formData.billingAddressSame,
        billingAddress: formattedBillingAddress,
        paymentTerms: formData.paymentTerms || '30 Days Term',
        creditLimit: Number(formData.creditLimit) || 5000,
        taxExempt: Boolean(formData.taxExempt),
        specialRequirements: formData.specialRequirements || ''
      };

      if (selectedClient && selectedClient.id) {
        const clientId = typeof selectedClient.id === 'string' 
          ? parseInt(selectedClient.id, 10) 
          : selectedClient.id;
          
        await dispatch(updateClient({ id: clientId, client: clientData })).unwrap();
        showSnackbar('Client updated successfully', 'success');
      } else {
        await dispatch(createClient(clientData)).unwrap();
        showSnackbar('Client created successfully', 'success');
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving client:', error);
      showSnackbar('Failed to save client: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
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
          Clients
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Client
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          placeholder="Search clients..."
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
          onClick={fetchClientsList}
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
                <TableCell><strong>Client Name</strong></TableCell>
                <TableCell><strong>Contact Person</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.length > 0 ? (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        opacity: client.status === 'Inactive' ? 0.7 : 1
                      }}>
                        <Avatar sx={{ 
                          bgcolor: getAvatarColor(client.name), 
                          mr: 2,
                          opacity: client.status === 'Inactive' ? 0.7 : 1
                        }}>
                          {getInitials(client.name)}
                        </Avatar>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          sx={{ 
                            textDecoration: client.status === 'Inactive' ? 'line-through' : 'none',
                          }}
                        >
                          {client.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{client.contactPerson}</TableCell>
                    <TableCell>
                      <Chip 
                        label={client.status === 'Inactive' ? 'Inactive' : 'Active'} 
                        color={client.status === 'Inactive' ? 'default' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        onClick={() => handleOpenViewDialog(client)}
                        sx={{ mr: 1 }}
                      >
                        View
                      </Button>
                      <Button 
                        size="small"
                        onClick={() => handleOpenDialog(client)}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="small"
                        onClick={() => handleDelete(client)}
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
                  <TableCell colSpan={4} align="center">
                    No clients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Client Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedClient ? `Edit Client: ${selectedClient.name}` : 'Add New Client'}
        </DialogTitle>
        
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="client form tabs" centered>
          <Tab icon={<Business />} label="Business Info" />
          <Tab icon={<Person />} label="Contact Details" />
          <Tab icon={<Payments />} label="Billing Address" />
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
                  <InputLabel id="status-label">Client Status</InputLabel>
                  <Select
                    labelId="status-label"
                    name="status"
                    value={formData.status}
                    label="Client Status"
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
                    label="Client Since"
                    value={formData.acquisition_date}
                    onChange={handleDateChange}
                    slotProps={{ textField: { fullWidth: true } }}
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
            
             </Grid>
           </TabPanel>
           
           <TabPanel value={tabValue} index={3}>
             <Grid container spacing={3}>
               <Grid item xs={12}>
                 <Typography variant="h6" gutterBottom>
                   Printing Preferences
                 </Typography>
               </Grid>
               
               <Grid item xs={12}>
                 <TextField
                   name="specialRequirements"
                   label="Special Requirements or Preferences"
                   multiline
                   rows={4}
                   fullWidth
                   value={formData.specialRequirements}
                   onChange={handleInputChange}
                   placeholder="Enter any special requirements or preferences for printing jobs"
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
                   placeholder="Add any additional information about this client's specific needs, history, or other important details."
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
             {isLoading ? <CircularProgress size={24} /> : (selectedClient ? 'Save Client' : 'Add Client')}
           </Button>
         </DialogActions>
       </Dialog>
  
        {/* View Client Details Dialog */}
        <ClientViewDetails 
          open={openViewDialog}
          client={selectedClient}
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
  
  export default ClientsList;