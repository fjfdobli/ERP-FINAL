import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, Avatar, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, Divider, FormControlLabel, Checkbox, Tab, Tabs, SelectChangeEvent } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Refresh as RefreshIcon, Person, Work, ContactPhone, Assignment, School } from '@mui/icons-material';
import { Employee, InsertEmployee } from '../services/employeesService';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchEmployees, searchEmployees, createEmployee, updateEmployee, deleteEmployee, 
  selectAllEmployees, selectEmployeesLoading, selectEmployeesError } from '../redux/slices/employeesSlice';
import { AppDispatch } from '../redux/store';
import { RootState } from '../redux/store';

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
      id={`employee-tabpanel-${index}`}
      aria-labelledby={`employee-tab-${index}`}
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

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  status: string;
  hireDate: Date | null;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  employeeId: string;
  notes: string;
  salary: number | string | null;
  bankDetails: string;
  taxId: string;
  birthDate: Date | null;
}

interface EmployeeViewDetailsProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}

// Tab components for View Details Dialog
const PersonalInfoTab = ({ employee }: { employee: Employee }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Full Name</Typography>
        <Typography variant="body1">{`${employee.firstName} ${employee.lastName}`}</Typography>
      </Grid>
      
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Birth Date</Typography>
        <Typography variant="body1">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString() : 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Tax ID</Typography>
        <Typography variant="body1">{employee.taxId || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight="bold">Address</Typography>
        <Typography variant="body1">{employee.address || 'Not specified'}</Typography>
      </Grid>
    </Grid>
  );
};

const EmploymentDetailsTab = ({ employee }: { employee: Employee }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Position</Typography>
        <Typography variant="body1">{employee.position || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Department</Typography>
        <Typography variant="body1">{employee.department || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Hire Date</Typography>
        <Typography variant="body1">{employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Status</Typography>
        <Chip 
          label={employee.status || 'Active'} 
          color={employee.status === 'Inactive' ? 'default' : 'primary'}
          size="small"
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Salary</Typography>
        <Typography variant="body1">{employee.salary ? `₱${employee.salary.toLocaleString()}` : 'Not specified'}</Typography>
      </Grid>
    </Grid>
  );
};

const ContactInfoTab = ({ employee }: { employee: Employee }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Email</Typography>
        <Typography variant="body1">{employee.email || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle1" fontWeight="bold">Phone</Typography>
        <Typography variant="body1">{employee.phone || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight="bold">Emergency Contact</Typography>
        <Typography variant="body1">{employee.emergencyContact || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight="bold">Emergency Phone</Typography>
        <Typography variant="body1">{employee.emergencyPhone || 'Not specified'}</Typography>
      </Grid>
    </Grid>
  );
};

const AdditionalInfoTab = ({ employee }: { employee: Employee }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="subtitle1" fontWeight="bold">Bank Details</Typography>
        <Typography variant="body1">{employee.bankDetails || 'Not specified'}</Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight="bold">Notes</Typography>
        <Typography variant="body1">{employee.notes || 'No notes'}</Typography>
      </Grid>
    </Grid>
  );
};

// Employee View Details Dialog Component
const EmployeeViewDetails: React.FC<EmployeeViewDetailsProps> = ({ open, employee, onClose }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Employee Details: {`${employee.firstName} ${employee.lastName}`}
        {employee.status === 'Inactive' && (
          <Chip 
            label="Inactive" 
            color="default"
            size="small" 
            sx={{ ml: 1 }}
          />
        )}
      </DialogTitle>
      <Divider />
      
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="employee details tabs" centered>
        <Tab icon={<Person />} label="Personal Info" />
        <Tab icon={<Work />} label="Employment Details" />
        <Tab icon={<ContactPhone />} label="Contact Info" />
        <Tab icon={<Assignment />} label="Additional Info" />
      </Tabs>
      
      <DialogContent>
        <TabPanel value={tabValue} index={0}>
          <PersonalInfoTab employee={employee} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <EmploymentDetailsTab employee={employee} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <ContactInfoTab employee={employee} />
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <AdditionalInfoTab employee={employee} />
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const EmployeesList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector(selectAllEmployees);
  const isLoading = useSelector(selectEmployeesLoading);
  const error = useSelector(selectEmployeesError);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [openViewDialog, setOpenViewDialog] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Default form data
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    status: 'Active',
    hireDate: new Date(),
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    employeeId: '',
    notes: '',
    salary: '',
    bankDetails: '',
    taxId: '',
    birthDate: null
  });
  
  // Department options
  const departments = [
    'Management',
    'HR',
    'Sales',
    'Marketing',
    'Finance',
    'IT',
    'Production',
    'Quality Control',
    'Logistics',
    'Customer Service',
    'Operations',
    'Other'
  ];
  
  // Position options by department
  const positionsByDepartment: {[key: string]: string[]} = {
    'Management': ['CEO', 'COO', 'CFO', 'CTO', 'General Manager', 'Operations Manager', 'Department Manager'],
    'HR': ['HR Manager', 'HR Officer', 'Recruitment Specialist', 'Training Coordinator', 'Payroll Officer'],
    'Sales': ['Sales Manager', 'Sales Representative', 'Account Manager', 'Business Development', 'Sales Assistant'],
    'Marketing': ['Marketing Manager', 'Marketing Coordinator', 'Graphic Designer', 'Social Media Specialist', 'Content Writer'],
    'Finance': ['Finance Manager', 'Accountant', 'Bookkeeper', 'Financial Analyst', 'Cashier'],
    'IT': ['IT Manager', 'Systems Administrator', 'Software Developer', 'Network Engineer', 'IT Support'],
    'Production': ['Production Manager', 'Press Operator', 'Bindery Operator', 'Production Assistant', 'Machine Operator'],
    'Quality Control': ['QC Manager', 'QC Inspector', 'QC Analyst'],
    'Logistics': ['Logistics Manager', 'Warehouse Supervisor', 'Delivery Driver', 'Inventory Clerk'],
    'Customer Service': ['Customer Service Manager', 'Customer Service Representative', 'Order Processing'],
    'Operations': ['Operations Manager', 'Shift Supervisor', 'Process Improvement Specialist'],
    'Other': ['Intern', 'Consultant', 'Contractor', 'Trainee', 'Other']
  };
  
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchEmployeesData = useCallback(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  useEffect(() => {
    fetchEmployeesData();
  }, [fetchEmployeesData]);

  // Show error in snackbar if fetch fails
  useEffect(() => {
    if (error) {
      showSnackbar(`Error: ${error}`, 'error');
    }
  }, [error, showSnackbar]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      dispatch(fetchEmployees());
      return;
    }
    
    dispatch(searchEmployees(searchQuery));
  };

  const handleDelete = async (employee: Employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      try {
        const employeeId = typeof employee.id === 'string' 
          ? parseInt(employee.id, 10) 
          : employee.id;
          
        await dispatch(deleteEmployee(employeeId));
        showSnackbar('Employee deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting employee:', error);
        showSnackbar('Failed to delete employee: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      }
    }
  };

  const handleOpenViewDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setSelectedEmployee(null);
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

  const handleDateChange = (name: string) => (date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setSelectedEmployee(employee);
      
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
        department: employee.department || '',
        status: employee.status || 'Active',
        hireDate: employee.hireDate ? new Date(employee.hireDate) : new Date(),
        address: employee.address || '',
        emergencyContact: employee.emergencyContact || '',
        emergencyPhone: employee.emergencyPhone || '',
        employeeId: employee.employeeId || '',
        notes: employee.notes || '',
        salary: employee.salary !== null && employee.salary !== undefined ? employee.salary : '',
        bankDetails: employee.bankDetails || '',
        taxId: employee.taxId || '',
        birthDate: employee.birthDate ? new Date(employee.birthDate) : null
      });
    } else {
      setSelectedEmployee(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        status: 'Active',
        hireDate: new Date(),
        address: '',
        emergencyContact: '',
        emergencyPhone: '',
        employeeId: '',
        notes: '',
        salary: '',
        bankDetails: '',
        taxId: '',
        birthDate: null
      });
    }
    setOpenDialog(true);
    setTabValue(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.position) {
      showSnackbar('First Name, Last Name, and Position are required', 'error');
      return;
    }

    try {
      let hireDateString: string | undefined = undefined;
      if (formData.hireDate) {
        hireDateString = formData.hireDate.toISOString().split('T')[0];
      }
      
      let birthDateString: string | undefined = undefined;
      if (formData.birthDate) {
        birthDateString = formData.birthDate.toISOString().split('T')[0];
      }
      
      const employeeData: InsertEmployee = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || '',
        phone: formData.phone || '',
        position: formData.position,
        department: formData.department || '',
        status: formData.status,
        hireDate: hireDateString,
        address: formData.address || null,
        emergencyContact: formData.emergencyContact || null,
        emergencyPhone: formData.emergencyPhone || null,
        employeeId: formData.employeeId || null,
        notes: formData.notes || null,
        salary: formData.salary ? Number(formData.salary) : null,
        bankDetails: formData.bankDetails || null,
        taxId: formData.taxId || null,
        birthDate: birthDateString
      };

      if (selectedEmployee && selectedEmployee.id) {
        const employeeId = typeof selectedEmployee.id === 'string' 
          ? parseInt(selectedEmployee.id, 10) 
          : selectedEmployee.id;
          
        await dispatch(updateEmployee({ id: employeeId, employee: employeeData }));
        showSnackbar('Employee updated successfully', 'success');
      } else {
        await dispatch(createEmployee(employeeData));
        showSnackbar('Employee created successfully', 'success');
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving employee:', error);
      showSnackbar('Failed to save employee: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName ? firstName[0] || '' : ''}${lastName ? lastName[0] || '' : ''}`.toUpperCase();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Employees
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Employee
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          placeholder="Search employees..."
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
          onClick={fetchEmployeesData}
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
                <TableCell><strong>Employee Name</strong></TableCell>
                <TableCell><strong>Position</strong></TableCell>
                <TableCell><strong>Department</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees && employees.length > 0 ? (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        opacity: employee.status === 'Inactive' ? 0.7 : 1
                      }}>
                        <Avatar sx={{ 
                          bgcolor: getAvatarColor(`${employee.firstName} ${employee.lastName}`), 
                          mr: 2,
                          opacity: employee.status === 'Inactive' ? 0.7 : 1
                        }}>
                          {getInitials(employee.firstName, employee.lastName)}
                        </Avatar>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          sx={{ 
                            textDecoration: employee.status === 'Inactive' ? 'line-through' : 'none',
                          }}
                        >
                          {`${employee.firstName} ${employee.lastName}`}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>
                      <Chip 
                        label={employee.status === 'Inactive' ? 'Inactive' : 'Active'} 
                        color={employee.status === 'Inactive' ? 'default' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        onClick={() => handleOpenViewDialog(employee)}
                        sx={{ mr: 1 }}
                      >
                        View
                      </Button>
                      <Button 
                        size="small"
                        onClick={() => handleOpenDialog(employee)}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="small"
                        onClick={() => handleDelete(employee)}
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
                    No employees found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Employee Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedEmployee ? `Edit Employee: ${selectedEmployee.firstName} ${selectedEmployee.lastName}` : 'Add New Employee'}
        </DialogTitle>
        
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="employee form tabs" centered>
          <Tab icon={<Person />} label="Personal Info" />
          <Tab icon={<Work />} label="Employment Details" />
          <Tab icon={<ContactPhone />} label="Contact Info" />
          <Tab icon={<Assignment />} label="Additional Info" />
        </Tabs>
        
        <DialogContent>
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Personal Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="firstName"
                  label="First Name"
                  fullWidth
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="lastName"
                  label="Last Name"
                  fullWidth
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Birth Date"
                    value={formData.birthDate}
                    onChange={handleDateChange('birthDate')}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="taxId"
                  label="Tax ID / TIN"
                  fullWidth
                  value={formData.taxId}
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
                  name="address"
                  label="Address"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter full address"
                />
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Employment Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="department-label">Department</InputLabel>
                  <Select
                    labelId="department-label"
                    name="department"
                    value={formData.department}
                    label="Department"
                    onChange={handleSelectChange}
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="position"
                  label="Position"
                  fullWidth
                  required
                  value={formData.position}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Hire Date"
                    value={formData.hireDate}
                    onChange={handleDateChange('hireDate')}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="status-label">Employee Status</InputLabel>
                  <Select
                    labelId="status-label"
                    name="status"
                    value={formData.status}
                    label="Employee Status"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="salary"
                  label="Salary"
                  type="number"
                  fullWidth
                  value={formData.salary}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Contact Information
                </Typography>
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
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Emergency Contact
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="emergencyContact"
                  label="Emergency Contact Name"
                  fullWidth
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="emergencyPhone"
                  label="Emergency Contact Phone"
                  fullWidth
                  value={formData.emergencyPhone}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Banking Information
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="bankDetails"
                  label="Bank Account Details"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.bankDetails}
                  onChange={handleInputChange}
                  placeholder="Enter bank name, account number, and other relevant details"
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
                  placeholder="Add any additional information about this employee."
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
            {isLoading ? <CircularProgress size={24} /> : (selectedEmployee ? 'Save Employee' : 'Add Employee')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Employee Details Dialog */}
      <EmployeeViewDetails 
        open={openViewDialog}
        employee={selectedEmployee}
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

export default EmployeesList;