import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, TextField, IconButton,
  Divider, Card, CardContent, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Alert, List, ListItem, Avatar,
  ListItemText, ListItemSecondaryAction, FormControl, InputLabel,
  Select, MenuItem, useTheme, useMediaQuery, Tabs, Tab, Skeleton,
  LinearProgress, CircularProgress
} from '@mui/material';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Checkbox from '@mui/material/Checkbox';
import {
  Add as AddIcon, Save as SaveIcon, Search as SearchIcon,
  Phone as PhoneIcon, Email as EmailIcon,
  Work as WorkIcon, Close as CloseIcon,
  Business as BusinessIcon, 
  Engineering as EngineeringIcon, Build as BuildIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  fetchTechnicians, createTechnician, updateTechnician,
  deleteTechnician, selectAllTechnicians, selectTechniciansLoading,
  selectTechniciansError, getAssignedMachinery, selectAssignedMachinery, assignMachineryToTechnician
} from '../redux/slices/techniciansSlice';
import { fetchMachinery, fetchMachineryById, selectAllMachinery } from '../redux/slices/machinerySlice';
import { supabase } from '../supabaseClient';

// Interface for Technician data
interface Technician {
  id: number;
  // Database column names (snake_case)
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  experience: number; // in years
  bio: string | null;
  join_date?: string;
  status: 'Active' | 'On Leave' | 'Unavailable' | 'Former';
  assigned_machinery?: number[]; // IDs of machinery this technician is qualified to service
  type: 'Company' | 'External'; // Whether technician is company employee or external contractor
  company: string | null; // Company name if from external company
  created_at?: string;
  updated_at?: string;

  // Frontend property names (camelCase)
  firstName?: string;
  lastName?: string;
  joinDate?: string;
  assignedMachinery?: number[];
  createdAt?: string;
  updatedAt?: string;
}

// Form data interface
interface TechnicianFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experience: number | '';
  bio: string;
  status: string;
  type: string;
  company: string;
}

const TechnicianProfile: React.FC = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useAppDispatch();
  const technicians = useAppSelector(selectAllTechnicians);
  const loading = useAppSelector(selectTechniciansLoading);
  const error = useAppSelector(selectTechniciansError);
  const assignedMachinery = useAppSelector(selectAssignedMachinery);
  const allMachinery = useAppSelector(selectAllMachinery);

  // Local state
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [loadingMachinery, setLoadingMachinery] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [machineDetailsOpen, setMachineDetailsOpen] = useState(false);

  // State for UI controls
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignMachineryDialogOpen, setAssignMachineryDialogOpen] = useState(false);
  const [selectedMachineryIds, setSelectedMachineryIds] = useState<number[]>([]);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Form state
  const [formData, setFormData] = useState<TechnicianFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    experience: '',
    bio: '',
    status: 'Active',
    type: 'Company',
    company: ''
  });

  // Fetch technicians and machinery data on component mount
  useEffect(() => {
    dispatch(fetchTechnicians({}));
    dispatch(fetchMachinery({}));
  }, [dispatch]);

  // Additional useEffect to ensure machinery data is available when needed
  useEffect(() => {
    // If we have technicians and a selected technician but no machinery data, fetch machinery
    if (technicians.length > 0 && selectedTechnician && allMachinery.length === 0) {
      console.log('Fetching machinery data as it was not available');
      dispatch(fetchMachinery({}));
    }
  }, [dispatch, technicians, selectedTechnician, allMachinery.length]);

  // Ensure machinery data is refreshed when viewing a technician
  useEffect(() => {
    // Always fetch machinery data when a technician is selected to get the latest data
    if (selectedTechnician) {
      console.log('Refreshing machinery data when viewing technician:', selectedTechnician.id);
      dispatch(fetchMachinery({}));
    }
  }, [dispatch, selectedTechnician]);

  // Display error notification if redux operation fails
  useEffect(() => {
    if (error) {
      setNotification({
        show: true,
        message: `Error: ${error}`,
        type: 'error'
      });
    }
  }, [error]);

  // Fetch assigned machinery and ensure all machinery is loaded when a technician is selected
  useEffect(() => {
    if (selectedTechnician) {
      setLoadingMachinery(true);

      // Create a sequence of actions to ensure data is correctly loaded
      const fetchData = async () => {
        try {
          // Step 1: Ensure we have all machinery loaded
          if (allMachinery.length === 0) {
            console.log('Fetching all machinery first since none is loaded');
            await dispatch(fetchMachinery({})).unwrap();
          }

          // Step 2: Fetch the assigned machinery for this technician
          const assignedIds = await dispatch(getAssignedMachinery(selectedTechnician.id)).unwrap();
          console.log('Assigned machinery IDs:', assignedIds);
          console.log('All machinery available:', allMachinery.map(m => m.id));

          // Step 3: If we have assigned machinery but still no machinery data, fetch machinery again
          if (assignedIds.length > 0 && (allMachinery.length === 0 || !assignedIds.some(id => allMachinery.find(m => Number(m.id) === Number(id))))) {
            console.log('Fetching machinery again to ensure we have all assigned machinery data');
            await dispatch(fetchMachinery({})).unwrap();
          }

          // Step 4: Clean up any references to deleted machinery
          if (assignedIds.length > 0) {
            // Ensure we have the latest machinery data
            await dispatch(fetchMachinery({})).unwrap();

            // Get all valid machinery IDs (convert to numbers for consistent comparison)
            const validMachineryIds = allMachinery.map(m => Number(m.id));
            console.log('Valid machinery IDs after refresh:', validMachineryIds);

            // Identify which assigned machinery IDs no longer exist
            const deletedMachineryIds = assignedIds.filter(id => !validMachineryIds.includes(Number(id)));

            if (deletedMachineryIds.length > 0) {
              console.log('Found references to deleted machinery:', deletedMachineryIds);

              // Remove the deleted machinery from assignments
              const validAssignments = assignedIds.filter(id => validMachineryIds.includes(Number(id)));
              console.log('Updating technician with valid machinery assignments only:', validAssignments);

              try {
                // Update the technician's assignment directly in Supabase for immediate effect
                const { error } = await supabase
                  .from('technicians')
                  .update({ assigned_machinery: validAssignments })
                  .eq('id', selectedTechnician.id);

                if (error) {
                  console.error('Error updating technician assignments in Supabase:', error);
                  throw error;
                }

                console.log('Successfully removed deleted machinery references from technician in Supabase');

                // Also update via Redux for state consistency
                await dispatch(assignMachineryToTechnician({
                  technicianId: selectedTechnician.id,
                  machineryIds: validAssignments
                })).unwrap();

                // Clear and reload the assigned machinery data
                await dispatch(getAssignedMachinery(selectedTechnician.id)).unwrap();
              } catch (updateError) {
                console.error('Error cleaning up deleted machinery references:', updateError);
              }
            }
          }
        } catch (error) {
          console.error('Error in fetching sequence:', error);
        } finally {
          setLoadingMachinery(false);
        }
      };

      fetchData();
    }
  }, [dispatch, selectedTechnician, allMachinery.length]);
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select input changes
  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'type') {
      // If the type is changing, update the company field accordingly
      setFormData(prev => ({
        ...prev,
        [name]: value,
        company: value === 'Company' ? "Opzon's Printers" : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Open dialog to add new technician
  const handleAddTechnician = () => {
    setIsEditing(false);
    setSelectedTechnician(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      experience: '',
      bio: '',
      status: 'Active',
      type: 'Company',
      company: "Opzon's Printers" // Default company name for Company type
    });
    setOpenDialog(true);
  };
  
  // Open dialog to edit existing technician
  const handleEditTechnician = (technician: Technician) => {
    setIsEditing(true);
    setSelectedTechnician(technician);
    // If technician type is Company, set company name to Opzon's Printers
    const techType = technician.type || 'Company';
    setFormData({
      firstName: technician.firstName ?? technician.first_name ?? '',
      lastName: technician.lastName ?? technician.last_name ?? '',
      email: technician.email,
      phone: technician.phone,
      experience: technician.experience,
      bio: technician.bio || '',
      status: technician.status,
      type: techType,
      company: techType === 'Company' ? "Opzon's Printers" : (technician.company || '')
    });
    setOpenDialog(true);
  };

  // View technician details
  const handleViewTechnicianDetails = (technician: Technician) => {
    setSelectedTechnician(technician);
    setCurrentTab(1); // Switch to details tab
  };
  
  // Handle dialog close
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare technician data for submission - using snake_case for DB columns
    const technicianData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      experience: formData.experience === '' ? 0 : Number(formData.experience),
      bio: formData.bio || null,
      status: formData.status,
      type: formData.type as 'Company' | 'External',
      company: formData.type === 'External' ? formData.company : "Opzon's Printers"
    };

    try {
      if (isEditing && selectedTechnician) {
        // Update existing technician
        await dispatch(updateTechnician({
          id: selectedTechnician.id,
          data: technicianData
        })).unwrap();

        setNotification({
          show: true,
          message: 'Technician updated successfully',
          type: 'success'
        });
      } else {
        // Create new technician - using snake_case for DB columns
        await dispatch(createTechnician({
          ...technicianData,
          join_date: new Date().toISOString(),
          assigned_machinery: []
        })).unwrap();

        setNotification({
          show: true,
          message: 'Technician added successfully',
          type: 'success'
        });
      }

      // Close dialog after successful operation
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving technician:', error);
      setNotification({
        show: true,
        message: isEditing ? 'Failed to update technician' : 'Failed to add technician',
        type: 'error'
      });
    }
  };

  // Handle technician deletion
  const handleDeleteTechnician = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this technician?')) return;

    try {
      await dispatch(deleteTechnician(id)).unwrap();

      // If the deleted technician was selected, clear selection
      if (selectedTechnician && selectedTechnician.id === id) {
        setSelectedTechnician(null);
      }

      setNotification({
        show: true,
        message: 'Technician deleted successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting technician:', error);
      setNotification({
        show: true,
        message: 'Failed to delete technician',
        type: 'error'
      });
    }
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  // Handle opening the assign machinery dialog
  const handleOpenAssignMachineryDialog = () => {
    if (!selectedTechnician) return;

    // Initialize with currently assigned machinery
    setSelectedMachineryIds(assignedMachinery || []);
    setAssignMachineryDialogOpen(true);
  };

  // Handle machinery assignment
  const handleAssignMachinery = async () => {
    if (!selectedTechnician) return;

    try {
      setLoadingMachinery(true);

      await dispatch(assignMachineryToTechnician({
        technicianId: selectedTechnician.id,
        machineryIds: selectedMachineryIds
      })).unwrap();

      // Refresh the assigned machinery data
      await dispatch(getAssignedMachinery(selectedTechnician.id)).unwrap();

      setNotification({
        show: true,
        message: 'Equipment assigned successfully',
        type: 'success'
      });

      setAssignMachineryDialogOpen(false);
    } catch (error) {
      console.error('Error assigning machinery:', error);
      setNotification({
        show: true,
        message: 'Failed to assign equipment',
        type: 'error'
      });
    } finally {
      setLoadingMachinery(false);
    }
  };
  
  // Filter technicians based on search query
  const filteredTechnicians = technicians.filter(tech => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (tech.firstName || tech.first_name || '').toLowerCase().includes(searchLower) ||
      (tech.lastName || tech.last_name || '').toLowerCase().includes(searchLower) ||
      tech.email.toLowerCase().includes(searchLower) ||
      (tech.company && tech.company.toLowerCase().includes(searchLower)) ||
      tech.type.toLowerCase().includes(searchLower)
    );
  });
  
  // Function to get initials for avatar
  const getInitials = (firstNameOrFirstName: string, lastNameOrLastName: string) => {
    const first = firstNameOrFirstName[0] || '';
    const last = lastNameOrLastName[0] || '';
    return `${first}${last}`.toUpperCase();
  };
  
  // Render list of technicians
  const renderTechniciansList = () => {
    if (loading) {
      return Array(5).fill(0).map((_, i) => (
        <ListItem key={i} sx={{ mb: 1, borderRadius: 2, bgcolor: 'background.paper' }}>
          <ListItemText 
            primary={<Skeleton width="60%" />} 
            secondary={<Skeleton width="40%" />} 
          />
        </ListItem>
      ));
    }
    
    if (filteredTechnicians.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No technicians found. Add technicians to see them here.
          </Typography>
        </Box>
      );
    }
    
    return filteredTechnicians.map(technician => (
      <ListItem
        key={technician.id}
        onClick={() => handleViewTechnicianDetails(technician)}
        sx={{
          mb: 1,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 0,
          bgcolor: 'background.paper',
          borderBottom: '1px solid var(--border-color)',
          '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.04)' },
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          width: '100%',
          gap: 2
        }}>
          {/* Avatar for the technician */}
          <Avatar
            sx={{
              bgcolor: technician.type === 'Company' ? 'primary.main' : 'secondary.main',
              width: { xs: 40, sm: 50 },
              height: { xs: 40, sm: 50 },
              fontSize: { xs: '1.2rem', sm: '1.5rem' }
            }}
          >
            {(technician.firstName?.[0] || technician.first_name?.[0] || '') +
            (technician.lastName?.[0] || technician.last_name?.[0] || '')}
          </Avatar>

          {/* Main content */}
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              mb: 0.5
            }}>
              <Typography
                component="span"
                variant="subtitle1"
                fontWeight="medium"
                sx={{ mr: 1 }}
              >
                {technician.firstName ?? technician.first_name} {technician.lastName ?? technician.last_name}
              </Typography>
              <Chip
                label={technician.type}
                size="small"
                color={technician.type === 'Company' ? 'primary' : 'secondary'}
                variant="outlined"
                sx={{ height: 20 }}
              />
              <Chip
                label={technician.status}
                size="small"
                color={
                  technician.status === 'Active' ? 'success' :
                  technician.status === 'On Leave' ? 'warning' :
                  technician.status === 'Unavailable' ? 'error' : 'default'
                }
                sx={{ height: 20 }}
              />
            </Box>

            <Box sx={{
              display: 'flex',
              gap: { xs: 1, md: 3 },
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  minWidth: '130px'
                }}
              >
                <WorkIcon fontSize="small" /> {technician.experience || 0} years experience
              </Typography>

              {technician.company && (
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <BusinessIcon fontSize="small" /> {technician.company}
                </Typography>
              )}

              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <EmailIcon fontSize="small" /> {technician.email}
              </Typography>
            </Box>
          </Box>

          {/* Action buttons */}
          <Box sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            alignSelf: { xs: 'flex-end', sm: 'center' }
          }}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={(e) => {
                e.stopPropagation(); // Prevent click from bubbling to parent ListItem
                handleEditTechnician(technician);
              }}
            >
              Edit
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={(e) => {
                e.stopPropagation(); // Prevent click from bubbling to parent ListItem
                handleDeleteTechnician(technician.id);
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </ListItem>
    ));
  };
  
  // Render technician details
  const renderTechnicianDetails = () => {
    if (!selectedTechnician) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Select a technician to view details.
          </Typography>
        </Box>
      );
    }
    
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: selectedTechnician.type === 'Company' ? 'primary.main' : 'secondary.main',
                width: 60,
                height: 60,
                fontSize: '1.8rem'
              }}
            >
              {(selectedTechnician.firstName?.[0] || selectedTechnician.first_name?.[0] || '') +
              (selectedTechnician.lastName?.[0] || selectedTechnician.last_name?.[0] || '')}
            </Avatar>

            <Box>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {selectedTechnician.firstName ?? selectedTechnician.first_name} {selectedTechnician.lastName ?? selectedTechnician.last_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip
                  label={selectedTechnician.status}
                  size="small"
                  color={
                    selectedTechnician.status === 'Active' ? 'success' :
                    selectedTechnician.status === 'On Leave' ? 'warning' :
                    selectedTechnician.status === 'Unavailable' ? 'error' : 'default'
                  }
                />
                <Chip
                  label={selectedTechnician.type}
                  size="small"
                  color={selectedTechnician.type === 'Company' ? 'primary' : 'secondary'}
                />
                <Chip
                  label={`${selectedTechnician.experience || 0} years experience`}
                  size="small"
                  variant="outlined"
                  icon={<WorkIcon fontSize="small" />}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              color="primary"
              onClick={() => {
                if (selectedTechnician) {
                  handleEditTechnician(selectedTechnician);
                }
              }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={() => {
                if (selectedTechnician) {
                  handleDeleteTechnician(selectedTechnician.id);
                  setCurrentTab(0); // Return to list view after deletion
                }
              }}
            >
              Delete
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCurrentTab(0)}
            >
              Back to List
            </Button>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Contact Information Card */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ height: '100%', boxShadow: 'rgba(0, 0, 0, 0.04) 0px 3px 5px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{
                    bgcolor: 'primary.lighter',
                    borderRadius: '50%',
                    p: 1.2,
                    display: 'flex',
                    mr: 2
                  }}>
                    <PhoneIcon color="primary" />
                  </Box>
                  <Typography variant="h6" color="primary.main">
                    Contact Information
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Email Address
                        </Typography>
                        <Typography variant="body1">
                          {selectedTechnician.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Phone Number
                        </Typography>
                        <Typography variant="body1">
                          {selectedTechnician.phone}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Bio & Additional Information */}
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ height: '100%', boxShadow: 'rgba(0, 0, 0, 0.04) 0px 3px 5px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{
                    bgcolor: 'info.lighter',
                    borderRadius: '50%',
                    p: 1.2,
                    display: 'flex',
                    mr: 2
                  }}>
                    <WorkIcon color="info" />
                  </Box>
                  <Typography variant="h6" color="info.main">
                    Professional Information
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Experience
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedTechnician.experience || 0} years
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Join Date
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedTechnician.joinDate || selectedTechnician.join_date || 'Not specified'}
                      </Typography>
                    </Box>
                  </Grid>

                  {selectedTechnician.company && (
                    <Grid item xs={12}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Company
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedTechnician.company}
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Box sx={{
                      p: 2,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Typography variant="subtitle2" color="text.primary" gutterBottom>
                        Bio
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedTechnician.bio || 'No bio provided.'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Assigned Machinery Card */}
          <Grid item xs={12}>
            <Card elevation={0} sx={{ boxShadow: 'rgba(0, 0, 0, 0.04) 0px 3px 5px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{
                      bgcolor: 'success.lighter',
                      borderRadius: '50%',
                      p: 1.2,
                      display: 'flex',
                      mr: 2
                    }}>
                      <BuildIcon color="success" />
                    </Box>
                    <Typography variant="h6" color="success.main">
                      Assigned Equipment
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    color="success"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAssignMachineryDialog}
                  >
                    Assign Equipment
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                {(() => {
                  console.log('Rendering assigned machinery section:');
                  console.log('- loadingMachinery:', loadingMachinery);
                  console.log('- assignedMachinery:', assignedMachinery);
                  console.log('- allMachinery count:', allMachinery.length);

                  return loadingMachinery ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <LinearProgress />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading assigned equipment...
                      </Typography>
                    </Box>
                  ) : assignedMachinery && assignedMachinery.length > 0 ? (
                    <Grid container spacing={2}>
                      {assignedMachinery.map(machineryId => {
                        console.log(`Checking machinery ID: ${machineryId}`);
                        // Convert both IDs to numbers to ensure correct comparison
                        const machine = allMachinery.find(m => Number(m.id) === Number(machineryId));
                        console.log(`Found machine: ${machine ? 'Yes' : 'No'}, machineryId: ${machineryId}, type: ${typeof machineryId}`);
                        console.log('Available machinery IDs:', allMachinery.map(m => `${m.id} (${typeof m.id})`));

                        // Log deleted machinery references but don't display them
                        if (!machine) {
                          console.warn(`No matching machinery found for ID: ${machineryId}`);
                          console.warn(`All machinery IDs: ${JSON.stringify(allMachinery.map(m => ({id: m.id, typeofId: typeof m.id})))}`);

                          // Clean up the assignment asynchronously
                          (async () => {
                            try {
                              if (selectedTechnician) {
                                // Get current assignments
                                const currentAssignedIds = await dispatch(getAssignedMachinery(selectedTechnician.id)).unwrap();

                                // Remove the invalid ID
                                const newAssignments = currentAssignedIds.filter(id => Number(id) !== Number(machineryId));

                                // Update directly in the database
                                await supabase
                                  .from('technicians')
                                  .update({ assigned_machinery: newAssignments })
                                  .eq('id', selectedTechnician.id);

                                console.log(`Removed invalid machinery ID ${machineryId} from assignments`);
                              }
                            } catch (error) {
                              console.error('Error cleaning up individual assignment:', error);
                            }
                          })();

                          // Skip rendering the deleted machinery
                          return null;
                        }

                      return (
                        <Grid item xs={12} sm={6} md={4} key={machineryId}>
                          <Box sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Avatar
                                sx={{
                                  bgcolor:
                                    machine.status === 'Operational' ? 'success.main' :
                                    machine.status === 'Maintenance' ? 'warning.main' :
                                    machine.status === 'Repair' ? 'error.main' :
                                    'grey.500',
                                  width: 40,
                                  height: 40,
                                  mr: 1.5
                                }}
                              >
                                <EngineeringIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle1" fontWeight="medium">
                                  {machine.name}
                                </Typography>
                                <Chip
                                  label={machine.status}
                                  size="small"
                                  color={
                                    machine.status === 'Operational' ? 'success' :
                                    machine.status === 'Maintenance' ? 'warning' :
                                    machine.status === 'Repair' ? 'error' :
                                    'default'
                                  }
                                  sx={{ height: 20 }}
                                />
                              </Box>
                            </Box>

                            <Divider sx={{ my: 1 }} />

                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Model
                              </Typography>
                              <Typography variant="body2" gutterBottom>
                                {machine.model}
                              </Typography>

                              <Typography variant="caption" color="text.secondary">
                                Serial Number
                              </Typography>
                              <Typography variant="body2" gutterBottom>
                                {machine.serialNumber}
                              </Typography>

                              <Typography variant="caption" color="text.secondary">
                                Location
                              </Typography>
                              <Typography variant="body2">
                                {machine.location || 'N/A'}
                              </Typography>
                            </Box>

                            <Box sx={{ mt: 'auto', pt: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                fullWidth
                                sx={{ mt: 1 }}
                                onClick={async () => {
                                  // Fetch the latest machine data before showing the dialog
                                  try {
                                    setLoadingMachinery(true);

                                    // Force a rebuild of the cache when fetching directly from Supabase
                                    // by including the current timestamp to prevent using any cache
                                    const timestamp = new Date().getTime();
                                    console.log(`Fetching fresh data for machine ID ${machine.id} with timestamp ${timestamp}`);

                                    // First refresh all machinery - this is critical to get the latest data
                                    await dispatch(fetchMachinery({})).unwrap();

                                    // 1. First try: Direct from Supabase with no caching
                                    const response = await supabase
                                      .from('machinery')
                                      .select('*')
                                      .eq('id', machine.id)
                                      .single();

                                    if (response.error) {
                                      throw response.error;
                                    }

                                    if (response.data) {
                                      console.log('Got fresh data directly from Supabase:', response.data);

                                      // Use the fresh data
                                      setSelectedMachine(response.data);
                                      setMachineDetailsOpen(true);
                                    } else {
                                      throw new Error('No data returned from Supabase');
                                    }
                                  } catch (error) {
                                    console.error('Error fetching directly from Supabase:', error);

                                    // 2. Second try: Get data through Redux machineryService
                                    try {
                                      console.log('Trying to fetch via Redux machineryService...');

                                      // Fetch the specific machinery with refreshed data
                                      const refreshedMachine = await dispatch(
                                        fetchMachineryById(machine.id)
                                      ).unwrap();

                                      console.log('Got fresh data via Redux:', refreshedMachine);
                                      setSelectedMachine(refreshedMachine);
                                      setMachineDetailsOpen(true);
                                    } catch (secondError) {
                                      console.error('Error fetching via Redux:', secondError);

                                      // 3. Last resort: Use the machine data we already have
                                      console.warn('Using cached machine data as fallback');
                                      setSelectedMachine(machine);
                                      setMachineDetailsOpen(true);
                                    }
                                  } finally {
                                    setLoadingMachinery(false);
                                  }
                                }}
                              >
                                View Details
                              </Button>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        No equipment assigned to this technician.
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        All assigned equipment for this technician will be listed here.
                      </Typography>
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </>
    );
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            Technician Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage technicians and their qualifications
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTechnician}
          sx={{ borderRadius: 2 }}
        >
          Add Technician
        </Button>
      </Box>

      <Box sx={{ display: 'flex', mb: 3, gap: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexGrow: 1
          }}
        >
          <SearchIcon color="action" />
          <TextField
            fullWidth
            variant="standard"
            placeholder="Search by name, email, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ disableUnderline: true }}
          />
        </Paper>

        {/* Status filter could be added here if needed */}
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          mb: 3
        }}
      >
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
          variant="fullWidth"
        >
          <Tab
            label="All Technicians"
            icon={<EngineeringIcon />}
            iconPosition="start"
          />
          <Tab
            label="Technician Details"
            icon={<WorkIcon />}
            iconPosition="start"
            disabled={!selectedTechnician}
          />
        </Tabs>
      </Paper>
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {currentTab === 0 && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid var(--border-color)',
              overflow: 'hidden'
            }}
          >
            {loading && <LinearProgress />}
            <List sx={{ p: 0 }}>
              {renderTechniciansList()}
            </List>
            {!loading && filteredTechnicians.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No technicians found. Add technicians to see them here.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddTechnician}
                  sx={{ mt: 2 }}
                >
                  Add Technician
                </Button>
              </Box>
            )}
          </Paper>
        )}

        {currentTab === 1 && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              p: 3
            }}
          >
            {renderTechnicianDetails()}
          </Paper>
        )}
      </Box>

      {/* Machinery Details Dialog */}
      <Dialog
        open={machineDetailsOpen}
        onClose={() => setMachineDetailsOpen(false)}
        TransitionProps={{
          onEntered: async () => {
            // Force refresh imagery when dialog enters
            if (selectedMachine) {
              console.log("Dialog entered, forcefully refreshing machinery data for ID:", selectedMachine.id);

              try {
                // Re-fetch all machinery to ensure we have the latest data
                await dispatch(fetchMachinery({})).unwrap();

                // Directly fetch from Supabase to bypass any caching
                const { data, error } = await supabase
                  .from('machinery')
                  .select('*')
                  .eq('id', selectedMachine.id)
                  .single();

                if (error) {
                  console.error("Error refreshing machinery in dialog:", error);
                  // Fallback to Redux fetch
                  const refreshedData = await dispatch(fetchMachineryById(selectedMachine.id)).unwrap();
                  setSelectedMachine(refreshedData);
                } else if (data) {
                  console.log("Dialog refresh successful, updating selected machine with fresh data");
                  setSelectedMachine(data);
                }
              } catch (error) {
                console.error("Failed to refresh machinery data in dialog:", error);
                // Just let it continue with existing data
              }
            }
          }
        }}
        fullWidth
        maxWidth="md"
      >
        {loadingMachinery ? (
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading latest equipment data...
            </Typography>
          </DialogContent>
        ) : selectedMachine && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  {selectedMachine.name} Details
                </Typography>
                <IconButton onClick={() => setMachineDetailsOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ height: '100%', boxShadow: 'rgba(0, 0, 0, 0.04) 0px 3px 5px' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{
                          bgcolor: 'primary.lighter',
                          borderRadius: '50%',
                          p: 1.2,
                          display: 'flex',
                          mr: 2
                        }}>
                          <EngineeringIcon color="primary" />
                        </Box>
                        <Typography variant="h6" color="primary.main">
                          Machine Information
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Name
                          </Typography>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedMachine.name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Type
                          </Typography>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedMachine.type}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Model
                          </Typography>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedMachine.model}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Serial Number
                          </Typography>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedMachine.serialNumber}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Status
                          </Typography>
                          <Box>
                            <Chip
                              label={selectedMachine.status}
                              color={
                                selectedMachine.status === 'Operational' ? 'success' :
                                selectedMachine.status === 'Maintenance' ? 'warning' :
                                selectedMachine.status === 'Repair' ? 'error' :
                                'default'
                              }
                              size="small"
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Location
                          </Typography>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedMachine.location || 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ height: '100%', boxShadow: 'rgba(0, 0, 0, 0.04) 0px 3px 5px' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{
                          bgcolor: 'info.lighter',
                          borderRadius: '50%',
                          p: 1.2,
                          display: 'flex',
                          mr: 2
                        }}>
                          <WorkIcon color="info" />
                        </Box>
                        <Typography variant="h6" color="info.main">
                          Additional Details
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Manufacturer
                          </Typography>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedMachine.manufacturer || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Purchase Date
                          </Typography>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedMachine.purchaseDate || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Last Maintenance
                          </Typography>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedMachine.lastMaintenanceDate || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Next Maintenance
                          </Typography>
                          <Typography variant="body1" fontWeight="medium" gutterBottom>
                            {selectedMachine.nextMaintenanceDate || 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {selectedMachine.specifications && (
                  <Grid item xs={12}>
                    <Card elevation={0} sx={{ boxShadow: 'rgba(0, 0, 0, 0.04) 0px 3px 5px' }}>
                      <CardContent>
                        <Typography variant="h6" color="text.primary" gutterBottom>
                          Specifications
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {selectedMachine.specifications}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedMachine.notes && (
                  <Grid item xs={12}>
                    <Card elevation={0} sx={{ boxShadow: 'rgba(0, 0, 0, 0.04) 0px 3px 5px' }}>
                      <CardContent>
                        <Typography variant="h6" color="text.primary" gutterBottom>
                          Notes
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {selectedMachine.notes}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setMachineDetailsOpen(false)} color="inherit">
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog for adding/editing technicians */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {isEditing ? 'Edit Technician' : 'Add New Technician'}
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Years of Experience"
                  name="experience"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={formData.experience}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    label="Status"
                    onChange={handleSelectChange}
                    required
                  >
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="On Leave">On Leave</MenuItem>
                    <MenuItem value="Unavailable">Unavailable</MenuItem>
                    <MenuItem value="Former">Former</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Technician Type</InputLabel>
                  <Select
                    name="type"
                    value={formData.type}
                    label="Technician Type"
                    onChange={handleSelectChange}
                    required
                  >
                    <MenuItem value="Company">Company Employee</MenuItem>
                    <MenuItem value="External">External Contractor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="company"
                  value={formData.type === 'Company' ? "Opzon's Printers" : formData.company}
                  onChange={handleInputChange}
                  disabled={formData.type !== 'External'}
                  helperText={formData.type === 'External' ? "Enter contractor's company name" : "Company employee at Opzon's Printers"}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            startIcon={isEditing ? <SaveIcon /> : <AddIcon />}
          >
            {isEditing ? 'Save Changes' : 'Add Technician'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={notification.show}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.type}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Dialog for assigning machinery to technician */}
      <Dialog
        open={assignMachineryDialogOpen}
        onClose={() => setAssignMachineryDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedTechnician ?
              `Assign Equipment to ${selectedTechnician.firstName ?? selectedTechnician.first_name} ${selectedTechnician.lastName ?? selectedTechnician.last_name}` :
              'Assign Equipment to Technician'
            }
            <IconButton onClick={() => setAssignMachineryDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {loadingMachinery ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                Select the equipment you want to assign to this technician. They will be able to service and maintain this equipment.
              </Typography>

              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search equipment by name, model, or serial number"
                  InputProps={{
                    startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  onChange={(e) => {
                    // Here you could implement equipment search functionality if needed
                  }}
                  sx={{ mb: 2 }}
                />

                <Paper variant="outlined" sx={{ maxHeight: 350, overflow: 'auto' }}>
                  <List dense>
                    {allMachinery.map((machine) => (
                      <ListItem key={machine.id} disablePadding>
                        <ListItemButton
                          dense
                          onClick={() => {
                            // Toggle selection
                            setSelectedMachineryIds(prev => {
                              const numId = Number(machine.id);
                              if (prev.includes(numId)) {
                                return prev.filter(id => id !== numId);
                              } else {
                                return [...prev, numId];
                              }
                            });
                          }}
                        >
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={selectedMachineryIds.includes(Number(machine.id))}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={<Typography variant="subtitle2">{machine.name}</Typography>}
                            secondary={
                              <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="caption" component="span">
                                  Model: {machine.model}
                                </Typography>
                                <Typography variant="caption" component="span">
                                  SN: {machine.serialNumber}
                                </Typography>
                              </Box>
                            }
                          />
                          <Chip
                            label={machine.status}
                            size="small"
                            color={
                              machine.status === 'Operational' ? 'success' :
                              machine.status === 'Maintenance' ? 'warning' :
                              machine.status === 'Repair' ? 'error' :
                              'default'
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}

                    {allMachinery.length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="No equipment found"
                          secondary="Add machinery in the Machinery management page first."
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Selected {selectedMachineryIds.length} out of {allMachinery.length} equipment items
              </Typography>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAssignMachineryDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAssignMachinery}
            disabled={loadingMachinery}
            startIcon={loadingMachinery ? <CircularProgress size={20} /> : null}
          >
            Assign Equipment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TechnicianProfile;