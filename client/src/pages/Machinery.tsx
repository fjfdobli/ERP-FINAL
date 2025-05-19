import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Snackbar, Alert, FormControl, InputLabel, Select, SelectChangeEvent, MenuItem, Chip, IconButton, Tooltip, Tabs, Tab, Divider, Card, CardContent, List, ListItem, ListItemText, ListItemIcon, Link, LinearProgress, Avatar, ImageList, ImageListItem, Portal } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Refresh as RefreshIcon, History as HistoryIcon, ConstructionOutlined as ConstructionIcon, ReceiptLong as ReceiptLongIcon, Build as BuildIcon, Edit as EditIcon, Delete as DeleteIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon, Error as ErrorIcon, Info as InfoIcon, DoDisturb as DoDisturbIcon, EventNote as EventNoteIcon, Engineering as EngineeringIcon, Handyman as HandymanIcon, PhotoCamera as PhotoCameraIcon, CloudUpload as CloudUploadIcon, SwapHoriz as SwapHorizIcon, Timer as TimerIcon, Person as PersonIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchMachinery, createMachinery, updateMachinery, deleteMachinery, fetchMaintenanceRecords, createMaintenanceRecord, updateMaintenanceRecord, deleteMaintenanceRecord, fetchMachineryStats, fetchMaintenanceCostSummary, uploadMachineryImage, uploadMultipleMachineryImages, fetchStatusHistory, createStatusHistory, updateStatusHistory, deleteStatusHistory } from '../redux/slices/machinerySlice';
import { selectAllTechnicians, fetchTechnicians, assignMachineryToTechnician, getAssignedMachinery } from '../redux/slices/techniciansSlice';
import { selectAllEmployees, fetchEmployees } from '../redux/slices/employeesSlice';
import { Machinery as MachineryType, MachineryFilters, MaintenanceRecord, StatusHistoryRecord } from '../services/machineryService';
import { format, parseISO, addMonths, isBefore, isAfter, formatDistance } from 'date-fns';

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
      id={`machinery-tabpanel-${index}`}
      aria-labelledby={`machinery-tab-${index}`}
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

interface MachineryFormData {
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  purchaseDate: Date | null;
  purchasePrice: number | null;
  lastMaintenanceDate: Date | null;
  nextMaintenanceDate: Date | null;
  status: 'Operational' | 'Maintenance' | 'Repair' | 'Offline' | 'Retired';
  location: string;
  specifications: string;
  notes: string;
  imageUrl: string | null; // Main image (for backward compatibility)
  imageUrls: string[] | null; // Array of multiple image URLs
}

interface MaintenanceFormData {
  machineryId: number;
  date: Date;
  type: 'Scheduled' | 'Repair' | 'Inspection' | 'Emergency';
  description: string;
  cost: number;
  performedBy: string;
  notes: string;
  imageUrls?: string[] | null;
}

interface StatusHistoryFormData {
  machineryId: number;
  date: Date;
  previousStatus: 'Operational' | 'Maintenance' | 'Repair' | 'Offline' | 'Retired';
  newStatus: 'Operational' | 'Maintenance' | 'Repair' | 'Offline' | 'Retired';
  reason: string;
  changedBy: string;
  notes: string;
  imageUrls?: string[] | null;
}

const MachineryList: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    machinery, currentMachinery, maintenanceRecords, statusHistory,
    machineryStats, isLoading
  } = useAppSelector((state: any) => state.machinery || {
    machinery: [],
    currentMachinery: null,
    maintenanceRecords: [],
    statusHistory: [],
    machineryStats: null,
    isLoading: false
  });

  // Get technicians and employees data for dropdown selections
  const technicians = useAppSelector(selectAllTechnicians);
  const employees = useAppSelector(selectAllEmployees);

  const [loading, setLoading] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<MachineryFilters>({});
  const [machineryDialogOpen, setMachineryDialogOpen] = useState<boolean>(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState<boolean>(false);
  const [statusHistoryDialogOpen, setStatusHistoryDialogOpen] = useState<boolean>(false);
  const [selectedMachinery, setSelectedMachinery] = useState<MachineryType | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRecord | null>(null);
  const [selectedStatusHistory, setSelectedStatusHistory] = useState<StatusHistoryRecord | null>(null);
  const [machineryDetailsOpen, setMachineryDetailsOpen] = useState<boolean>(false);
  const [customType, setCustomType] = useState('');
  const [customManufacturer, setCustomManufacturer] = useState('');


  const [machineryForm, setMachineryForm] = useState<MachineryFormData>({
    name: '',
    type: '',
    model: '',
    serialNumber: '',
    manufacturer: '',
    purchaseDate: null,
    purchasePrice: null,
    lastMaintenanceDate: null,
    nextMaintenanceDate: null,
    status: 'Operational',
    location: '',
    specifications: '',
    notes: '',
    imageUrl: null,
    imageUrls: []
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormData>({
    machineryId: 0,
    date: new Date(),
    type: 'Scheduled',
    description: '',
    cost: 0,
    performedBy: '',
    notes: '',
    imageUrls: []
  });

  const [statusHistoryForm, setStatusHistoryForm] = useState<StatusHistoryFormData>({
    machineryId: 0,
    date: new Date(),
    previousStatus: 'Operational',
    newStatus: 'Maintenance',
    reason: '',
    changedBy: '',
    notes: '',
    imageUrls: []
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Machinery types
  const machineryTypes = [
    'Offset Press',
    'Digital Press',
    'Large Format Printer',
    'Cutting Machine',
    'Binding Machine',
    'Folding Machine',
    'Laminating Machine',
    'Creasing Machine',
    'Scoring Machine',
    'Perforating Machine',
    'Packaging Machine',
    'Plate Maker',
    'Scanner',
    'Computer',
    'Other'
  ];

  // Machinery status
  const machineryStatuses = [
    'Operational',
    'Maintenance',
    'Repair',
    'Offline',
    'Retired'
  ];

  // Common manufacturers
  const manufacturers = [
    'Heidelberg',
    'Konica Minolta',
    'Canon',
    'HP',
    'Epson',
    'Xerox',
    'Roland',
    'Mimaki',
    'Muller Martini',
    'Polar',
    'Morgana',
    'GBC',
    'Duplo',
    'Horizon',
    'Other'
  ];

  // Maintenance types
  const maintenanceTypes = [
    'Scheduled',
    'Repair',
    'Inspection',
    'Emergency'
  ];

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await dispatch(fetchMachinery(filters)).unwrap();
      await dispatch(fetchMachineryStats()).unwrap();
      await dispatch(fetchMaintenanceCostSummary()).unwrap();

      // Fetch technicians and employees data for records
      await dispatch(fetchTechnicians({})).unwrap();
      await dispatch(fetchEmployees()).unwrap();

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showSnackbar(error.message || 'Failed to load data', 'error');
      setLoading(false);
    }
  }, [dispatch, filters, showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenMachineryDialog = (machinery?: MachineryType) => {
    if (machinery) {
      setSelectedMachinery(machinery);

      const isOtherType = !machineryTypes.includes(machinery.type);
      const isOtherManufacturer = !machinery.manufacturer || !manufacturers.includes(machinery.manufacturer);

      setMachineryForm({
        name: machinery.name,
        type: isOtherType ? 'Other' : machinery.type,
        model: machinery.model,
        serialNumber: machinery.serialNumber,
        manufacturer: isOtherManufacturer ? 'Other' : (machinery.manufacturer || ''),
        purchaseDate: machinery.purchaseDate ? parseISO(machinery.purchaseDate) : null,
        purchasePrice: machinery.purchasePrice,
        lastMaintenanceDate: machinery.lastMaintenanceDate ? parseISO(machinery.lastMaintenanceDate) : null,
        nextMaintenanceDate: machinery.nextMaintenanceDate ? parseISO(machinery.nextMaintenanceDate) : null,
        status: machinery.status as any,
        location: machinery.location || '',
        specifications: machinery.specifications || '',
        notes: machinery.notes || '',
        // Handle both single imageUrl for backwards compatibility and the new imageUrls array
        imageUrl: machinery.imageUrl,
        imageUrls: machinery.imageUrls || (machinery.imageUrl ? [machinery.imageUrl] : [])
      });

      setCustomManufacturer(isOtherManufacturer ? (machinery.manufacturer || '') : '');
      setCustomType(isOtherType ? machinery.type : '');


    } else {
      setSelectedMachinery(null);
      setMachineryForm({
        name: '',
        type: '',
        model: '',
        serialNumber: '',
        manufacturer: '',
        purchaseDate: null,
        purchasePrice: null,
        lastMaintenanceDate: null,
        nextMaintenanceDate: null,
        status: 'Operational',
        location: '',
        specifications: '',
        notes: '',
        imageUrl: null,
        imageUrls: []
      });
    }
    setImageFiles([]);
    setMachineryDialogOpen(true);
  };

  const handleCloseMachineryDialog = () => {
    setMachineryDialogOpen(false);
    setSelectedMachinery(null);
  };

  const handleMachineryInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMachineryForm(prev => ({
      ...prev,
      [name]: name === 'purchasePrice' ? (value === '' ? null : Number(value)) : value
    }));
  };

  const handleMachinerySelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;

    if (name === 'type') {
      if (value === 'Other') setCustomType('');
    }

    if (name === 'manufacturer') {
      if (value === 'Other') setCustomManufacturer('');
    }

    setMachineryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMachineryDateChange = (name: 'purchaseDate' | 'lastMaintenanceDate' | 'nextMaintenanceDate') => (date: Date | null) => {
    setMachineryForm(prev => ({
      ...prev,
      [name]: date
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to array and add to existing files
      const newFiles = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...newFiles]);

      // Create preview URLs for the new images
      const newImageUrls = newFiles.map(file => URL.createObjectURL(file));

      // Update the form with new image URLs
      setMachineryForm(prev => {
        const updatedImageUrls = [...(prev.imageUrls || []), ...newImageUrls];
        return {
          ...prev,
          // Set the first image as the main imageUrl for backward compatibility
          imageUrl: updatedImageUrls[0] || null,
          imageUrls: updatedImageUrls
        };
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    // Remove the image file
    setImageFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });

    // Remove the image URL from the form
    setMachineryForm(prev => {
      const newImageUrls = [...(prev.imageUrls || [])];
      newImageUrls.splice(index, 1);
      return {
        ...prev,
        // Update the main imageUrl if needed
        imageUrl: newImageUrls[0] || null,
        imageUrls: newImageUrls
      };
    });
  };

  const handleUploadImages = async (machineryId: number) => {
    if (imageFiles.length === 0) return null;

    setImageUploading(true);
    try {
      // Use the multiple image upload function
      const imageUrls = await dispatch(uploadMultipleMachineryImages({
        files: imageFiles,
        machineryId
      })).unwrap();

      setImageUploading(false);
      showSnackbar(`${imageUrls.length} images uploaded successfully`, 'success');
      return imageUrls;
    } catch (error: any) {
      setImageUploading(false);
      showSnackbar(error.message || 'Failed to upload images', 'error');
      return null;
    }
  };

  const handleMachinerySubmit = async () => {
    setLoading(true);

    try {
      const {
        name, model, serialNumber, purchaseDate, purchasePrice,
        lastMaintenanceDate, nextMaintenanceDate, status, location, specifications, notes,
        imageUrls
      } = machineryForm;

      const type = machineryForm.type === 'Other' ? customType : machineryForm.type;
      const manufacturer = machineryForm.manufacturer === 'Other' ? customManufacturer : machineryForm.manufacturer;

      if (!name || !type || !model || !serialNumber) {
        showSnackbar('Name, Type, Model, and Serial Number are required', 'error');
        setLoading(false);
        return;
      }

      let finalImageUrls = imageUrls || [];
      let finalMainImageUrl = finalImageUrls[0] || null;

      if (selectedMachinery) {
        // For existing machinery, check if we need to upload new images
        if (imageFiles.length > 0) {
          const newImageUrls = await handleUploadImages(selectedMachinery.id);
          if (newImageUrls && newImageUrls.length > 0) {
            // Combine existing persisted images with new uploaded ones
            const existingPersistedImages = (selectedMachinery.imageUrls || [])
              .filter(url => !url.startsWith('blob:')); // Filter out any blob URLs

            finalImageUrls = [...existingPersistedImages, ...newImageUrls];
            finalMainImageUrl = finalImageUrls[0];
          }
        } else {
          // No new images to upload, keep existing persisted images
          finalImageUrls = (selectedMachinery.imageUrls || [])
            .filter(url => !url.startsWith('blob:'));

          if (selectedMachinery.imageUrl && !selectedMachinery.imageUrl.startsWith('blob:')) {
            // Make sure the main image is included if it's not a blob URL
            if (!finalImageUrls.includes(selectedMachinery.imageUrl)) {
              finalImageUrls = [selectedMachinery.imageUrl, ...finalImageUrls];
            }
          }

          finalMainImageUrl = finalImageUrls[0] || null;
        }

        const machineryData = {
          name,
          type,
          model,
          serialNumber,
          manufacturer,
          purchaseDate: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : null,
          purchasePrice,
          lastMaintenanceDate: lastMaintenanceDate ? format(lastMaintenanceDate, 'yyyy-MM-dd') : null,
          nextMaintenanceDate: nextMaintenanceDate ? format(nextMaintenanceDate, 'yyyy-MM-dd') : null,
          status,
          location: location || null,
          specifications: specifications || null,
          notes: notes || null,
          imageUrl: finalMainImageUrl,
          imageUrls: finalImageUrls
        };

        await dispatch(updateMachinery({ id: selectedMachinery.id, data: machineryData as any })).unwrap();
        showSnackbar('Machinery updated successfully', 'success');
      } else {
        // For new machinery, first create the record, then upload the images if they exist
        const machineryData = {
          name,
          type,
          model,
          serialNumber,
          manufacturer,
          purchaseDate: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : null,
          purchasePrice,
          lastMaintenanceDate: lastMaintenanceDate ? format(lastMaintenanceDate, 'yyyy-MM-dd') : null,
          nextMaintenanceDate: nextMaintenanceDate ? format(nextMaintenanceDate, 'yyyy-MM-dd') : null,
          status,
          location: location || null,
          specifications: specifications || null,
          notes: notes || null,
          imageUrl: null, // Initially created without image
          imageUrls: [] // Initially created without images
        };

        const createdMachinery = await dispatch(createMachinery(machineryData as any)).unwrap();

        // Now upload the images if available
        if (imageFiles.length > 0 && createdMachinery.id) {
          finalImageUrls = await handleUploadImages(createdMachinery.id) || [];
          finalMainImageUrl = finalImageUrls[0] || null;

          // Update the newly created machinery with the image URLs
          if (finalImageUrls.length > 0) {
            await dispatch(updateMachinery({
              id: createdMachinery.id,
              data: {
                imageUrl: finalMainImageUrl,
                imageUrls: finalImageUrls
              }
            })).unwrap();
          }
        }

        showSnackbar('Machinery created successfully', 'success');
      }

      handleCloseMachineryDialog();
      fetchData();
    } catch (error: any) {
      console.error('Error saving machinery:', error);
      showSnackbar(error.message || 'Failed to save machinery', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMaintenanceDialog = (machineryId: number, maintenance?: MaintenanceRecord) => {
    const machine = machinery.find((m: MachineryType) => m.id === machineryId);
    if (!machine) {
      showSnackbar('Machinery not found', 'error');
      return;
    }

    setSelectedMachinery(machine);

    //Block new maintenance if there is an uncompleted one
    if (!maintenance) {
      const hasOngoing = maintenanceRecords.some(
        (r: MaintenanceRecord) =>
          r.machineryId === machineryId && !r.is_completed
      );

      if (hasOngoing) {
        showSnackbar(
          'This machinery is already under maintenance and cannot have another record until it is completed.',
          'warning'
        );
        return;
      }
    }

    if (maintenance) {
      setSelectedMaintenance(maintenance);

      setMaintenanceForm({
        machineryId: maintenance.machineryId,
        date: parseISO(maintenance.date),
        type: maintenance.type as any,
        description: maintenance.description,
        cost: maintenance.cost,
        performedBy: maintenance.performedBy,
        notes: maintenance.notes || ''
      });
    } else {
      setSelectedMaintenance(null);
      setMaintenanceForm({
        machineryId: machineryId,
        date: new Date(),
        type: 'Scheduled',
        description: '',
        cost: 0,
        performedBy: '',
        notes: ''
      });
    }

    setMaintenanceDialogOpen(true);
  };


  const handleCloseMaintenanceDialog = () => {
    setMaintenanceDialogOpen(false);
    setSelectedMaintenance(null);
  };

  const handleMaintenanceInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    setMaintenanceForm(prev => ({
      ...prev,
      [name]: name === 'cost' ? Number(value) : value
    }));
  };

  const handleMaintenanceSelectChange = (e: any) => {
    const { name, value } = e.target;
    setMaintenanceForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMaintenanceDateChange = (date: Date | null) => {
    if (date) {
      setMaintenanceForm(prev => ({
        ...prev,
        date
      }));
    }
  };

  const handleOpenStatusHistoryDialog = (machineryId: number, statusHistory?: StatusHistoryRecord) => {
    // First, get the machinery details
    const machine = machinery.find((m: MachineryType) => m.id === machineryId);
    if (!machine) {
      showSnackbar('Machinery not found', 'error');
      return;
    }

    setSelectedMachinery(machine);

    if (statusHistory) {
      setSelectedStatusHistory(statusHistory);

      setStatusHistoryForm({
        machineryId: statusHistory.machineryId,
        date: parseISO(statusHistory.date),
        previousStatus: statusHistory.previousStatus as any,
        newStatus: statusHistory.newStatus as any,
        reason: statusHistory.reason,
        changedBy: statusHistory.changedBy,
        notes: statusHistory.notes || '',
        imageUrls: statusHistory.imageUrls || []
      });
    } else {
      setSelectedStatusHistory(null);
      setStatusHistoryForm({
        machineryId: machineryId,
        date: new Date(),
        previousStatus: machine.status as any,
        newStatus: 'Operational',
        reason: '',
        changedBy: '',
        notes: '',
        imageUrls: []
      });
    }
    setStatusHistoryDialogOpen(true);
  };

  const handleCloseStatusHistoryDialog = () => {
    setStatusHistoryDialogOpen(false);
    setSelectedStatusHistory(null);
  };

  const handleStatusHistoryInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    setStatusHistoryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusHistorySelectChange = (e: any) => {
    const { name, value } = e.target;
    setStatusHistoryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusHistoryDateChange = (date: Date | null) => {
    if (date) {
      setStatusHistoryForm(prev => ({
        ...prev,
        date
      }));
    }
  };

  const handleStatusHistorySubmit = async () => {
    setLoading(true);

    try {
      const { machineryId, date, previousStatus, newStatus, reason, changedBy, notes, imageUrls } = statusHistoryForm;

      if (!reason || !changedBy) {
        showSnackbar('Reason and Changed By are required', 'error');
        setLoading(false);
        return;
      }

      const statusHistoryData = {
        machineryId,
        date: format(date, 'yyyy-MM-dd'),
        previousStatus,
        newStatus,
        reason,
        changedBy,
        notes: notes || null,
        imageUrls: imageUrls || []
      };

      let statusUpdateSuccess = false;

      try {
        if (selectedStatusHistory) {
          await dispatch(updateStatusHistory({
            id: selectedStatusHistory.id,
            data: statusHistoryData as any
          })).unwrap();
          showSnackbar('Status history record updated successfully', 'success');
          statusUpdateSuccess = true;
        } else {
          await dispatch(createStatusHistory(statusHistoryData as any)).unwrap();
          showSnackbar('Status history record created successfully', 'success');
          statusUpdateSuccess = true;
        }
      } catch (statusError: any) {
        console.error('Error saving to status history:', statusError);
        if (statusError.message && statusError.message.includes('does not exist')) {
          showSnackbar('Status history table not found in database. The machinery status will still be updated.', 'warning');
          // Continue with updating the machinery status even if status history fails
          statusUpdateSuccess = false;
        } else {
          throw statusError; // Re-throw if it's a different error
        }
      }

      // Always update the machinery's status when adding a new status record
      if (!selectedStatusHistory && selectedMachinery) {
        try {
          await dispatch(updateMachinery({
            id: selectedMachinery.id,
            data: {
              status: newStatus
            }
          })).unwrap();
          showSnackbar('Machinery status updated successfully', 'success');
        } catch (machineryError: any) {
          console.error('Error updating machinery status:', machineryError);
          showSnackbar(machineryError.message || 'Failed to update machinery status', 'error');
        }
      }

      handleCloseStatusHistoryDialog();
      // Refresh machinery data to get updated status
      fetchData();

      // Only try to refresh status history if the previous operation was successful
      if (statusUpdateSuccess && currentMachinery) {
        try {
          dispatch(fetchStatusHistory(currentMachinery.id));
        } catch (error) {
          console.warn('Could not fetch status history after update:', error);
        }
      }
    } catch (error: any) {
      console.error('Error in status history workflow:', error);
      showSnackbar(error.message || 'Failed to save status history record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceSubmit = async () => {
    setLoading(true);

    try {
      const { machineryId, date, type, description, cost, performedBy, notes, imageUrls } = maintenanceForm;

      if (!description || !performedBy) {
        showSnackbar('Description and Performed By are required', 'error');
        setLoading(false);
        return;
      }

      const maintenanceData = {
        machineryId,
        date: format(date, 'yyyy-MM-dd'),
        type,
        description,
        cost,
        performedBy,
        notes: notes || null,
        imageUrls: imageUrls || []
      };

      if (selectedMaintenance) {
        await dispatch(updateMaintenanceRecord({
          id: selectedMaintenance.id,
          data: maintenanceData
        })).unwrap();
        showSnackbar('Maintenance record updated successfully', 'success');
      } else {
        await dispatch(createMaintenanceRecord(maintenanceData)).unwrap();
        showSnackbar('Maintenance record created successfully', 'success');

        // ✅ Update maintenance dates on machinery
        if (selectedMachinery) {
          await dispatch(updateMachinery({
            id: selectedMachinery.id,
            data: {
              lastMaintenanceDate: format(date, 'yyyy-MM-dd'),
              nextMaintenanceDate: format(addMonths(date, 3), 'yyyy-MM-dd')
            }
          })).unwrap();
        }
      }

      // ✅ Match technician accurately by full name
      const selectedTechnician = technicians.find(tech =>
        `${tech.first_name ?? tech.firstName} ${tech.last_name ?? tech.lastName}` === performedBy
      );

      if (selectedMachinery) {
        const otherTechnicians = technicians.filter(tech => tech.id !== selectedTechnician?.id);
        for (const tech of otherTechnicians) {
          if (tech.assigned_machinery?.includes(selectedMachinery.id)) {
            const updatedMachinery = tech.assigned_machinery.filter(id => id !== selectedMachinery.id);
            await dispatch(assignMachineryToTechnician({
              technicianId: tech.id,
              machineryIds: updatedMachinery
            })).unwrap();
          }
        }
      }

      // ✅ Assign if needed AND fetch their assigned machinery
      if (selectedMachinery && selectedTechnician) {
        const alreadyAssigned = selectedTechnician.assigned_machinery?.includes(selectedMachinery.id);

        if (!alreadyAssigned) {
          await dispatch(assignMachineryToTechnician({
            technicianId: selectedTechnician.id,
            machineryIds: [
              ...(selectedTechnician.assigned_machinery || []),
              selectedMachinery.id
            ]
          })).unwrap();

          showSnackbar(`Machinery assigned to ${performedBy}`, 'info');
        }

        // 🆕 Ensure technician profile reflects latest assignments & maintenance
        await dispatch(getAssignedMachinery(selectedTechnician.id)).unwrap();
        await dispatch(fetchMaintenanceRecords(selectedMachinery.id)).unwrap();
      }

      handleCloseMaintenanceDialog();
      fetchData(); // refresh full app state
    } catch (error: any) {
      console.error('Error saving maintenance record:', error);
      showSnackbar(error.message || 'Failed to save maintenance record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMachineryDetails = async (machinery: MachineryType) => {
    try {
      setLoading(true);
      setSelectedMachinery(machinery);

      // Fetch maintenance records first
      await dispatch(fetchMaintenanceRecords(machinery.id)).unwrap();

      // Try to fetch status history, but continue even if it fails
      try {
        await dispatch(fetchStatusHistory(machinery.id)).unwrap();
      } catch (statusError) {
        console.warn('Could not fetch status history, table might not exist yet:', statusError);
        // Clear status history to avoid showing stale data
        dispatch({ type: 'machinery/fetchStatusHistory/fulfilled', payload: [] });
      }

      setMachineryDetailsOpen(true);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching machinery details:', error);
      showSnackbar(error.message || 'Failed to fetch machinery details', 'error');
      setLoading(false);
    }
  };

  const handleCloseMachineryDetails = () => {
    setMachineryDetailsOpen(false);
    setSelectedMachinery(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this machinery? This action cannot be undone.')) {
      setLoading(true);
      try {
        await dispatch(deleteMachinery(id)).unwrap();
        showSnackbar('Machinery deleted successfully', 'success');
        fetchData();
      } catch (error: any) {
        console.error('Error deleting machinery:', error);
        showSnackbar(error.message || 'Failed to delete machinery', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteMaintenanceRecord = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this maintenance record?')) {
      setLoading(true);
      try {
        await dispatch(deleteMaintenanceRecord(id)).unwrap();

        // Unassign machinery from technician if it was linked
        const record = maintenanceRecords.find((r: MaintenanceRecord) => r.id === id);

        if (record) {
          const tech = technicians.find(t =>
            `${t.first_name || t.firstName} ${t.last_name || t.lastName}` === record.performedBy
          );

          if (tech && tech.assigned_machinery?.includes(record.machineryId)) {
            const updatedMachinery = tech.assigned_machinery.filter(mid => mid !== record.machineryId);

            await dispatch(assignMachineryToTechnician({
              technicianId: tech.id,
              machineryIds: updatedMachinery
            })).unwrap();

            showSnackbar(`Machinery unassigned from ${record.performedBy}`, 'info');
          }
        }

        showSnackbar('Maintenance record deleted successfully', 'success');

        // Refresh maintenance records if we're viewing a specific machinery
        if (selectedMachinery) {
          dispatch(fetchMaintenanceRecords(selectedMachinery.id));
        }
      } catch (error: any) {
        console.error('Error deleting maintenance record:', error);
        showSnackbar(error.message || 'Failed to delete maintenance record', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteStatusHistory = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this status history record?')) {
      setLoading(true);
      try {
        await dispatch(deleteStatusHistory(id)).unwrap();
        showSnackbar('Status history record deleted successfully', 'success');

        // Refresh status history records if we're viewing a specific machinery
        if (selectedMachinery) {
          dispatch(fetchStatusHistory(selectedMachinery.id));
        }
      } catch (error: any) {
        console.error('Error deleting status history record:', error);
        showSnackbar(error.message || 'Failed to delete status history record', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFilterChange = (name: keyof MachineryFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusChip = (status: string) => {
    let color: 'default' | 'success' | 'error' | 'warning' | 'info' = 'default';
    let icon = null;

    switch (status) {
      case 'Operational':
        color = 'success';
        icon = <CheckCircleIcon fontSize="small" />;
        break;
      case 'Maintenance':
        color = 'info';
        icon = <BuildIcon fontSize="small" />;
        break;
      case 'Repair':
        color = 'warning';
        icon = <WarningIcon fontSize="small" />;
        break;
      case 'Offline':
        color = 'error';
        icon = <ErrorIcon fontSize="small" />;
        break;
      case 'Retired':
        color = 'default';
        icon = <DoDisturbIcon fontSize="small" />;
        break;
    }

    return (
      <Chip
        label={status}
        color={color}
        size="small"
        variant="outlined"
        icon={icon as React.ReactElement}
      />
    );
  };

  const getMaintenanceTypeChip = (type: string) => {
    let color: 'default' | 'success' | 'error' | 'warning' | 'info' = 'default';
    let icon = null;

    switch (type) {
      case 'Scheduled':
        color = 'info';
        icon = <EventNoteIcon fontSize="small" />;
        break;
      case 'Repair':
        color = 'warning';
        icon = <BuildIcon fontSize="small" />;
        break;
      case 'Inspection':
        color = 'success';
        icon = <CheckCircleIcon fontSize="small" />;
        break;
      case 'Emergency':
        color = 'error';
        icon = <WarningIcon fontSize="small" />;
        break;
    }

    return (
      <Chip
        label={type}
        color={color}
        size="small"
        icon={icon as React.ReactElement}
        variant="outlined"
      />
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getMaintenanceStatusText = (machinery: MachineryType) => {
    if (!machinery.nextMaintenanceDate) {
      return { text: 'No scheduled maintenance', color: 'text.secondary' };
    }

    const today = new Date();
    const nextDate = parseISO(machinery.nextMaintenanceDate);

    if (isBefore(nextDate, today)) {
      return {
        text: `Overdue by ${formatDistance(nextDate, today)}`,
        color: 'error.main'
      };
    }

    // Check if due within 30 days
    const thirtyDaysFromNow = addMonths(today, 1);
    if (isBefore(nextDate, thirtyDaysFromNow)) {
      return {
        text: `Due in ${formatDistance(today, nextDate)}`,
        color: 'warning.main'
      };
    }

    return {
      text: `Scheduled for ${format(nextDate, 'MMM d, yyyy')}`,
      color: 'success.main'
    };
  };

  // Filter machinery based on search term and filters
  const filteredMachinery = machinery?.filter((machine: MachineryType) => {
    // Apply search term
    if (searchTerm && !machine.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !machine.model.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !machine.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !(machine.manufacturer && machine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }

    // Apply filters
    if (filters.type && machine.type !== filters.type) {
      return false;
    }
    if (filters.status && machine.status !== filters.status) {
      return false;
    }
    if (filters.manufacturer && machine.manufacturer !== filters.manufacturer) {
      return false;
    }

    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Machinery
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenMachineryDialog()}
        >
          Add Machinery
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="machinery management tabs">
          <Tab icon={<ConstructionIcon />} label="Machinery List" />
          <Tab icon={<HistoryIcon />} label="Maintenance History" />
          <Tab icon={<SwapHorizIcon />} label="Status History" />
          <Tab icon={<ReceiptLongIcon />} label="Overview & Stats" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  placeholder="Search machinery..."
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="type-filter-label">Type</InputLabel>
                  <Select
                    labelId="type-filter-label"
                    value={filters.type || ''}
                    label="Type"
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {machineryTypes.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="status-filter-label">Status</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    value={filters.status || ''}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    {machineryStatuses.map(status => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={fetchData}
                  startIcon={<RefreshIcon />}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </Box>

          {(loading || isLoading) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Image</strong></TableCell>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell align='center'><strong>Type</strong></TableCell>
                    <TableCell align='center'><strong>Model</strong></TableCell>
                    <TableCell align='center'><strong>Serial Number</strong></TableCell>
                    <TableCell align='center'><strong>Status</strong></TableCell>
                    <TableCell align='center'><strong>Next Maintenance</strong></TableCell>
                    <TableCell align='center'><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMachinery && filteredMachinery.length > 0 ? (
                    filteredMachinery.map((machine: MachineryType) => {
                      const maintenanceStatus = getMaintenanceStatusText(machine);

                      return (
                        <TableRow key={machine.id}>
                          <TableCell>
                            {machine.imageUrl ? (
                              <Avatar
                                src={machine.imageUrl}
                                alt={machine.name}
                                variant="rounded"
                                sx={{ width: 40, height: 40 }}
                              />
                            ) : (
                              <Avatar
                                variant="rounded"
                                sx={{ width: 40, height: 40, bgcolor: 'grey.300' }}
                              >
                                <EngineeringIcon color="disabled" />
                              </Avatar>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link
                              component="button"
                              variant="body1"
                              onClick={() => handleOpenMachineryDetails(machine)}
                              underline="hover"
                              sx={{ fontWeight: 'medium' }}
                            >
                              {machine.name}
                            </Link>
                          </TableCell>
                          <TableCell align='center'>{machine.type}</TableCell>
                          <TableCell align='center'>{machine.model}</TableCell>
                          <TableCell align='center'>{machine.serialNumber}</TableCell>
                          <TableCell align='center'>{getStatusChip(machine.status)}</TableCell>
                          <TableCell align='center'>
                            <Typography variant="body2" color={maintenanceStatus.color}>
                              {maintenanceStatus.text}
                            </Typography>
                          </TableCell>
                          <TableCell align='center'>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                              <Button
                                size="small"
                                color="info"
                                variant="outlined"
                                onClick={() => handleOpenMaintenanceDialog(machine.id)}
                              >
                                Maintenance
                              </Button>
                              <Button
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={() => handleOpenMachineryDialog(machine)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() => handleDelete(machine.id)}
                              >
                                Delete
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No machinery found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Maintenance Records
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Select a machinery from the Machinery List tab to view its maintenance history, or view all maintenance records below.
            </Typography>

            <Button
              variant="outlined"
              onClick={() => dispatch(fetchMaintenanceRecords(undefined))}
              startIcon={<RefreshIcon />}
              sx={{ mt: 2 }}
            >
              Load All Maintenance Records
            </Button>
          </Box>

          {(loading || isLoading) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Machinery</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Performed By</strong></TableCell>
                    <TableCell><strong>Cost</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {maintenanceRecords && maintenanceRecords.length > 0 ? (
                    maintenanceRecords.map((record: MaintenanceRecord) => {
                      const machineInfo = machinery?.find((m: MachineryType) => m.id === record.machineryId);

                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            {machineInfo ? (
                              <Link
                                component="button"
                                variant="body1"
                                onClick={() => handleOpenMachineryDetails(machineInfo)}
                                underline="hover"
                              >
                                {machineInfo.name}
                              </Link>
                            ) : record.machineryId}
                          </TableCell>
                          <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{getMaintenanceTypeChip(record.type)}</TableCell>
                          <TableCell>
                            {record.description.length > 50 ?
                              `${record.description.substring(0, 50)}...` :
                              record.description}
                          </TableCell>
                          <TableCell>{record.performedBy}</TableCell>
                          <TableCell>{formatCurrency(record.cost)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={() => record.machineryId && handleOpenMaintenanceDialog(record.machineryId, record)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() => handleDeleteMaintenanceRecord(record.id)}
                              >
                                Delete
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No maintenance records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Status History Records
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Select a machinery from the Machinery List tab to view its status history, or view all status history records below.
            </Typography>

            <Button
              variant="outlined"
              onClick={() => {
                try {
                  dispatch(fetchStatusHistory(undefined));
                } catch (error) {
                  console.warn('Could not fetch status history, table might not exist yet:', error);
                  showSnackbar('Status history table may not exist yet in the database', 'error');
                }
              }}
              startIcon={<RefreshIcon />}
              sx={{ mt: 2 }}
            >
              Load All Status History Records
            </Button>
          </Box>

          {(loading || isLoading) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Machinery</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Previous Status</strong></TableCell>
                    <TableCell><strong>New Status</strong></TableCell>
                    <TableCell><strong>Reason</strong></TableCell>
                    <TableCell><strong>Changed By</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statusHistory && statusHistory.length > 0 ? (
                    statusHistory.map((record: StatusHistoryRecord) => {
                      const machineInfo = machinery?.find((m: MachineryType) => m.id === record.machineryId);

                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            {machineInfo ? (
                              <Link
                                component="button"
                                variant="body1"
                                onClick={() => handleOpenMachineryDetails(machineInfo)}
                                underline="hover"
                              >
                                {machineInfo.name}
                              </Link>
                            ) : record.machineryId}
                          </TableCell>
                          <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{getStatusChip(record.previousStatus)}</TableCell>
                          <TableCell>{getStatusChip(record.newStatus)}</TableCell>
                          <TableCell>
                            {record.reason.length > 50 ?
                              `${record.reason.substring(0, 50)}...` :
                              record.reason}
                          </TableCell>
                          <TableCell>{record.changedBy}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={() => record.machineryId && handleOpenStatusHistoryDialog(record.machineryId, record)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() => handleDeleteStatusHistory(record.id)}
                              >
                                Delete
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No status history records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Machinery Stats
              </Typography>

              {machineryStats ? (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Total Machinery
                        </Typography>
                        <Typography variant="h4" color="primary.main">
                          {machineryStats.total}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Operational
                        </Typography>
                        <Typography variant="h4" color="success.main">
                          {machineryStats.operational}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Maintenance Due
                        </Typography>
                        <Typography variant="h4" color="warning.main">
                          {machineryStats.maintenanceDue}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          In Maintenance
                        </Typography>
                        <Typography variant="h5" color="info.main">
                          {machineryStats.maintenance}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          In Repair
                        </Typography>
                        <Typography variant="h5" color="warning.main">
                          {machineryStats.repair}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Offline
                        </Typography>
                        <Typography variant="h5" color="error.main">
                          {machineryStats.offline}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary">
                          Retired
                        </Typography>
                        <Typography variant="h5" color="text.secondary">
                          {machineryStats.retired}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Machinery by Type
                </Typography>

                {machinery && machinery.length > 0 ? (
                  <>
                    {machineryTypes.map(type => {
                      const count = machinery.filter((m: MachineryType) => m.type === type).length;
                      if (count === 0) return null;

                      const percentage = (count / machinery.length) * 100;

                      return (
                        <Box key={type} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">{type}</Typography>
                            <Typography variant="body2">{count} ({percentage.toFixed(1)}%)</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={percentage}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      );
                    })}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center">
                    No machinery data available
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Maintenance Due Soon
                </Typography>

                {machinery && machinery.length > 0 ? (
                  <List>
                    {machinery
                      .filter((machine: MachineryType) => {
                        if (!machine.nextMaintenanceDate) return false;

                        const today = new Date();
                        const nextMonth = addMonths(today, 1);
                        const nextDate = parseISO(machine.nextMaintenanceDate);

                        return isBefore(nextDate, nextMonth) && machine.status !== 'Retired';
                      })
                      .sort((a: MachineryType, b: MachineryType) => {
                        const dateA = a.nextMaintenanceDate ? parseISO(a.nextMaintenanceDate) : new Date(9999, 11, 31);
                        const dateB = b.nextMaintenanceDate ? parseISO(b.nextMaintenanceDate) : new Date(9999, 11, 31);
                        return dateA.getTime() - dateB.getTime();
                      })
                      .slice(0, 5)
                      .map((machine: MachineryType) => {
                        const maintenanceStatus = getMaintenanceStatusText(machine);

                        return (
                          <ListItem
                            key={machine.id}
                            divider
                            secondaryAction={
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<BuildIcon />}
                                onClick={() => handleOpenMaintenanceDialog(machine.id)}
                              >
                                Log Maintenance
                              </Button>
                            }
                          >
                            <ListItemIcon>
                              <EngineeringIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={machine.name}
                              secondary={
                                <Typography variant="body2" color={maintenanceStatus.color}>
                                  {maintenanceStatus.text}
                                </Typography>
                              }
                            />
                          </ListItem>
                        );
                      })
                    }

                    {machinery.filter((machine: MachineryType) => {
                      if (!machine.nextMaintenanceDate) return false;

                      const today = new Date();
                      const nextMonth = addMonths(today, 1);
                      const nextDate = parseISO(machine.nextMaintenanceDate);

                      return isBefore(nextDate, nextMonth) && machine.status !== 'Retired';
                    }).length === 0 && (
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                          No machinery due for maintenance soon
                        </Typography>
                      )}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    No machinery data available
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Recent Maintenances
                </Typography>

                {maintenanceRecords && maintenanceRecords.length > 0 ? (
                  <List>
                    {maintenanceRecords
                      .slice(0, 5)
                      .map((record: MaintenanceRecord) => {
                        const machineInfo = machinery?.find((m: MachineryType) => m.id === record.machineryId);

                        return (
                          <ListItem key={record.id} divider>
                            <ListItemIcon>
                              <HandymanIcon color="info" />
                            </ListItemIcon>
                            <ListItemText
                              primary={machineInfo?.name || `Machine ID: ${record.machineryId}`}
                              secondary={
                                <>
                                  <Typography variant="body2">
                                    {format(parseISO(record.date), 'MMM d, yyyy')} - {record.type}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {record.description.substring(0, 30)}
                                    {record.description.length > 30 ? '...' : ''}
                                  </Typography>
                                </>
                              }
                            />
                          </ListItem>
                        );
                      })
                    }

                    {maintenanceRecords.length === 0 && (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        No recent maintenance records
                      </Typography>
                    )}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                    No maintenance records available
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Machinery Dialog */}
      <Dialog open={machineryDialogOpen} onClose={handleCloseMachineryDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedMachinery ? `Edit Machinery: ${selectedMachinery.name}` : 'Add New Machinery'}
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Multiple Image Upload Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Machinery Images
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                {/* Image Gallery */}
                <Box sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  justifyContent: 'center',
                  mb: 2,
                  width: '100%'
                }}>
                  {(machineryForm.imageUrls && machineryForm.imageUrls.length > 0) ? (
                    machineryForm.imageUrls.map((imageUrl, index) => (
                      <Box key={index} sx={{ position: 'relative' }}>
                        <Avatar
                          src={imageUrl}
                          alt={`${machineryForm.name} image ${index + 1}`}
                          variant="rounded"
                          sx={{ width: 120, height: 120, border: '1px solid #eee' }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveImage(index)}
                          sx={{
                            position: 'absolute',
                            top: -10,
                            right: -10,
                            bgcolor: 'background.paper',
                            boxShadow: 1,
                            '&:hover': { bgcolor: 'error.light', color: 'white' }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))
                  ) : (
                    <Box
                      sx={{
                        width: 120,
                        height: 120,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed #ccc',
                        borderRadius: 1
                      }}
                    >
                      <PhotoCameraIcon color="disabled" sx={{ fontSize: 40 }} />
                    </Box>
                  )}

                  {/* Add New Image Box */}
                  <Box
                    component="label"
                    htmlFor="image-upload"
                    sx={{
                      width: 120,
                      height: 120,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed #ccc',
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <AddIcon sx={{ fontSize: 30, mb: 1, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      Add Image
                    </Typography>
                  </Box>
                </Box>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  aria-label="Upload machinery images"
                  style={{ display: 'none' }}
                  id="image-upload"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />

                <Button
                  variant="outlined"
                  component="label"
                  htmlFor="image-upload"
                  startIcon={<CloudUploadIcon />}
                  disabled={imageUploading}
                >
                  {imageUploading ? 'Uploading...' : 'Add Images'}
                </Button>

                {imageUploading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Uploading images...
                    </Typography>
                  </Box>
                )}

                <Typography variant="caption" color="text.secondary" mt={1}>
                  You can upload multiple images of the machinery, including close-ups of specific parts.
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Machinery Name"
                fullWidth
                required
                value={machineryForm.name}
                onChange={handleMachineryInputChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="type-label">Type</InputLabel>
                <Select
                  labelId="type-label"
                  name="type"
                  value={machineryForm.type}
                  label="Type"
                  onChange={handleMachinerySelectChange}
                >
                  {machineryTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>


              {machineryForm.type === 'Other' && (
                <TextField
                  name="customType"
                  label="Specify Other Type"
                  fullWidth
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  margin='normal'
                  size='small'
                />
              )}
            </Grid>


            <Grid item xs={12} md={6}>
              <TextField
                name="model"
                label="Model"
                fullWidth
                required
                value={machineryForm.model}
                onChange={handleMachineryInputChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="serialNumber"
                label="Serial Number"
                fullWidth
                required
                value={machineryForm.serialNumber}
                onChange={handleMachineryInputChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="manufacturer-label">Manufacturer</InputLabel>
                <Select
                  labelId="manufacturer-label"
                  name="manufacturer"
                  value={machineryForm.manufacturer}
                  label="Manufacturer"
                  onChange={handleMachinerySelectChange}
                >
                  {manufacturers.map(manufacturer => (
                    <MenuItem key={manufacturer} value={manufacturer}>{manufacturer}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {machineryForm.manufacturer === 'Other' && (
                <TextField
                  name="customManufacturer"
                  label="Specify Other Manufacturer"
                  fullWidth
                  value={customManufacturer}
                  onChange={(e) => setCustomManufacturer(e.target.value)}
                  margin='normal'
                  size='small'
                />
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={machineryForm.status}
                  label="Status"
                  onChange={handleMachinerySelectChange}
                >
                  {machineryStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                Purchase & Maintenance Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Purchase Date"
                  value={machineryForm.purchaseDate}
                  onChange={handleMachineryDateChange('purchaseDate')}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="purchasePrice"
                label="Purchase Price"
                type="number"
                fullWidth
                value={machineryForm.purchasePrice === null ? '' : machineryForm.purchasePrice}
                onChange={handleMachineryInputChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Last Maintenance Date"
                  value={machineryForm.lastMaintenanceDate}
                  onChange={handleMachineryDateChange('lastMaintenanceDate')}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Next Maintenance Due"
                  value={machineryForm.nextMaintenanceDate}
                  onChange={handleMachineryDateChange('nextMaintenanceDate')}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                Additional Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="location"
                label="Location"
                fullWidth
                value={machineryForm.location}
                onChange={handleMachineryInputChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="specifications"
                label="Technical Specifications"
                multiline
                rows={3}
                fullWidth
                value={machineryForm.specifications}
                onChange={handleMachineryInputChange}
                placeholder="Enter technical specifications, capabilities, and other details"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes"
                multiline
                rows={2}
                fullWidth
                value={machineryForm.notes}
                onChange={handleMachineryInputChange}
                placeholder="Add any additional notes about this machinery"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMachineryDialog}>Cancel</Button>
          <Button
            onClick={handleMachinerySubmit}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (selectedMachinery ? 'Save Changes' : 'Add Machinery')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Maintenance Record Dialog */}
      <Dialog open={maintenanceDialogOpen} onClose={handleCloseMaintenanceDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedMaintenance ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
        </DialogTitle>
        {selectedMachinery && (
          <Box sx={{ px: 3, mt: -2, mb: 2 }}>
            <Typography variant="subtitle1" color="text.secondary">
              for {selectedMachinery.name}
            </Typography>
          </Box>
        )}

        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Maintenance Date"
                  value={maintenanceForm.date}
                  onChange={handleMaintenanceDateChange}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="maintenance-type-label">Maintenance Type</InputLabel>
                <Select
                  labelId="maintenance-type-label"
                  name="type"
                  value={maintenanceForm.type}
                  label="Maintenance Type"
                  onChange={handleMaintenanceSelectChange}
                >
                  {maintenanceTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="description"
                label="Maintenance Description"
                multiline
                rows={3}
                fullWidth
                required
                value={maintenanceForm.description}
                onChange={handleMaintenanceInputChange}
                placeholder="Describe the maintenance work performed"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="performed-by-label">Performed By</InputLabel>
                <Select
                  labelId="performed-by-label"
                  name="performedBy"
                  value={maintenanceForm.performedBy}
                  onChange={handleMaintenanceInputChange}
                  label="Performed By"
                >
                  {technicians.map((technician) => (
                    <MenuItem
                      key={technician.id}
                      value={`${technician.firstName || technician.first_name} ${technician.lastName || technician.last_name}`}
                    >
                      {technician.firstName || technician.first_name} {technician.lastName || technician.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="cost"
                label="Cost"
                type="number"
                fullWidth
                value={maintenanceForm.cost}
                onChange={handleMaintenanceInputChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Images (Optional)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add images showing the maintenance work or parts replaced.
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {/* Display existing images */}
                {maintenanceForm.imageUrls && maintenanceForm.imageUrls.map((url, index) => (
                  <Box key={index} sx={{ position: 'relative' }}>
                    <Avatar
                      src={url}
                      alt={`Maintenance documentation ${index + 1}`}
                      variant="rounded"
                      sx={{ width: 100, height: 100, border: '1px solid #eee' }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setMaintenanceForm(prev => ({
                          ...prev,
                          imageUrls: prev.imageUrls?.filter((_, i) => i !== index) || []
                        }));
                      }}
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        bgcolor: 'background.paper',
                        boxShadow: 1
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}

                {/* Image upload placeholder */}
                <Box
                  component="label"
                  htmlFor="maintenance-image-upload"
                  sx={{
                    width: 100,
                    height: 100,
                    border: '1px dashed #ccc',
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <AddIcon sx={{ color: 'text.secondary', mb: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Add Image
                  </Typography>
                </Box>

                <input
                  type="file"
                  accept="image/*"
                  id="maintenance-image-upload"
                  aria-label="Upload maintenance images"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      try {
                        setLoading(true);
                        const file = e.target.files[0];

                        // We need to actually upload the image to get a permanent URL
                        if (selectedMachinery) {
                          const imageUrl = await dispatch(uploadMachineryImage({
                            file,
                            machineryId: selectedMachinery.id
                          })).unwrap();

                          // Add the real URL from the server
                          setMaintenanceForm(prev => ({
                            ...prev,
                            imageUrls: [...(prev.imageUrls || []), imageUrl]
                          }));

                          showSnackbar('Image uploaded successfully', 'success');
                        } else {
                          showSnackbar('Please select a machinery first', 'error');
                        }
                      } catch (error: any) {
                        console.error('Error uploading image:', error);
                        showSnackbar(error.message || 'Failed to upload image', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes"
                multiline
                rows={2}
                fullWidth
                value={maintenanceForm.notes}
                onChange={handleMaintenanceInputChange}
                placeholder="Any additional notes about this maintenance"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMaintenanceDialog}>Cancel</Button>
          <Button
            onClick={handleMaintenanceSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (selectedMaintenance ? 'Update Record' : 'Save Record')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status History Dialog */}
      <Dialog open={statusHistoryDialogOpen} onClose={handleCloseStatusHistoryDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedStatusHistory ? 'Edit Status History Record' : 'Add Status Change Record'}
        </DialogTitle>
        {selectedMachinery && (
          <Box sx={{ px: 3, mt: -2, mb: 2 }}>
            <Typography variant="subtitle1" color="text.secondary">
              for {selectedMachinery.name}
            </Typography>
          </Box>
        )}

        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Status Change Date"
                  value={statusHistoryForm.date}
                  onChange={handleStatusHistoryDateChange}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="changed-by-label">Changed By</InputLabel>
                <Select
                  labelId="changed-by-label"
                  name="changedBy"
                  value={statusHistoryForm.changedBy}
                  onChange={handleStatusHistoryInputChange}
                  label="Changed By"
                  startAdornment={<InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment>}
                >
                  {employees.map((employee) => (
                    <MenuItem
                      key={employee.id}
                      value={`${employee.firstName} ${employee.lastName}`}
                    >
                      {employee.firstName} {employee.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required disabled>
                <InputLabel id="previous-status-label">Previous Status</InputLabel>
                <Select
                  labelId="previous-status-label"
                  name="previousStatus"
                  value={statusHistoryForm.previousStatus}
                  label="Previous Status"
                  onChange={handleStatusHistorySelectChange}
                >
                  {machineryStatuses.map(status => (
                    <MenuItem key={status} value={status}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusChip(status)}
                        <span>{status}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="new-status-label">New Status</InputLabel>
                <Select
                  labelId="new-status-label"
                  name="newStatus"
                  value={statusHistoryForm.newStatus}
                  label="New Status"
                  onChange={handleStatusHistorySelectChange}
                >
                  {machineryStatuses.map(status => (
                    <MenuItem key={status} value={status}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusChip(status)}
                        <span>{status}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="reason"
                label="Reason for Status Change"
                multiline
                rows={3}
                fullWidth
                required
                value={statusHistoryForm.reason}
                onChange={handleStatusHistoryInputChange}
                placeholder="Explain why the status was changed"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Images (Optional)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add images showing the machinery condition or other visual documentation.
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {/* Display existing images */}
                {statusHistoryForm.imageUrls && statusHistoryForm.imageUrls.map((url, index) => (
                  <Box key={index} sx={{ position: 'relative' }}>
                    <Avatar
                      src={url}
                      alt={`Status documentation ${index + 1}`}
                      variant="rounded"
                      sx={{ width: 100, height: 100, border: '1px solid #eee' }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setStatusHistoryForm(prev => ({
                          ...prev,
                          imageUrls: prev.imageUrls?.filter((_, i) => i !== index) || []
                        }));
                      }}
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        bgcolor: 'background.paper',
                        boxShadow: 1
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}

                {/* Image upload placeholder */}
                <Box
                  component="label"
                  htmlFor="status-image-upload"
                  sx={{
                    width: 100,
                    height: 100,
                    border: '1px dashed #ccc',
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <AddIcon sx={{ color: 'text.secondary', mb: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Add Image
                  </Typography>
                </Box>

                <input
                  type="file"
                  accept="image/*"
                  id="status-image-upload"
                  aria-label="Upload status change images"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      try {
                        setLoading(true);
                        const file = e.target.files[0];

                        // We need to actually upload the image to get a permanent URL
                        if (selectedMachinery) {
                          const imageUrl = await dispatch(uploadMachineryImage({
                            file,
                            machineryId: selectedMachinery.id
                          })).unwrap();

                          // Add the real URL from the server
                          setStatusHistoryForm(prev => ({
                            ...prev,
                            imageUrls: [...(prev.imageUrls || []), imageUrl]
                          }));

                          showSnackbar('Image uploaded successfully', 'success');
                        } else {
                          showSnackbar('Please select a machinery first', 'error');
                        }
                      } catch (error: any) {
                        console.error('Error uploading image:', error);
                        showSnackbar(error.message || 'Failed to upload image', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Additional Notes"
                multiline
                rows={2}
                fullWidth
                value={statusHistoryForm.notes}
                onChange={handleStatusHistoryInputChange}
                placeholder="Any additional information about this status change"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatusHistoryDialog}>Cancel</Button>
          <Button
            onClick={handleStatusHistorySubmit}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (selectedStatusHistory ? 'Update Record' : 'Save Record')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Machinery Details Dialog */}
      <Dialog open={machineryDetailsOpen} onClose={handleCloseMachineryDetails} maxWidth="lg" fullWidth>
        {selectedMachinery && (
          <>
            <DialogTitle>
              {selectedMachinery.name}
              <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={selectedMachinery.type}
                  size="small"
                  color="primary"
                />
                {getStatusChip(selectedMachinery.status)}
              </Box>
            </DialogTitle>

            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Machine Details
                    </Typography>

                    {/* Display machinery images gallery if available */}
                    {((selectedMachinery.imageUrls && selectedMachinery.imageUrls.length > 0) || selectedMachinery.imageUrl) && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Machinery Images
                        </Typography>

                        <Box sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 2,
                          justifyContent: 'flex-start'
                        }}>
                          {/* Display images from imageUrls array if available */}
                          {selectedMachinery.imageUrls && selectedMachinery.imageUrls.map((imageUrl, index) => (
                            <Box
                              key={index}
                              component="img"
                              src={imageUrl}
                              alt={`${selectedMachinery.name} image ${index + 1}`}
                              sx={{
                                width: 150,
                                height: 150,
                                objectFit: 'cover',
                                borderRadius: 1,
                                boxShadow: 1,
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                '&:hover': {
                                  transform: 'scale(1.05)'
                                }
                              }}
                            />
                          ))}

                          {/* If no imageUrls but has imageUrl (backward compatibility) */}
                          {(!selectedMachinery.imageUrls || selectedMachinery.imageUrls.length === 0) && selectedMachinery.imageUrl && (
                            <Box
                              component="img"
                              src={selectedMachinery.imageUrl}
                              alt={selectedMachinery.name}
                              sx={{
                                width: 150,
                                height: 150,
                                objectFit: 'cover',
                                borderRadius: 1,
                                boxShadow: 1
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    )}

                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Model</Typography>
                        <Typography variant="body1">{selectedMachinery.model}</Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Serial Number</Typography>
                        <Typography variant="body1">{selectedMachinery.serialNumber}</Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Manufacturer</Typography>
                        <Typography variant="body1">{selectedMachinery.manufacturer}</Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Location</Typography>
                        <Typography variant="body1">{selectedMachinery.location || 'Not specified'}</Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Purchase Date</Typography>
                        <Typography variant="body1">
                          {selectedMachinery.purchaseDate ?
                            format(parseISO(selectedMachinery.purchaseDate), 'MMM d, yyyy') :
                            'Not specified'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Purchase Price</Typography>
                        <Typography variant="body1">
                          {selectedMachinery.purchasePrice ?
                            formatCurrency(selectedMachinery.purchasePrice) :
                            'Not specified'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Last Maintenance</Typography>
                        <Typography variant="body1">
                          {selectedMachinery.lastMaintenanceDate ?
                            format(parseISO(selectedMachinery.lastMaintenanceDate), 'MMM d, yyyy') :
                            'Not recorded'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Next Maintenance Due</Typography>
                        <Typography
                          variant="body1"
                          color={getMaintenanceStatusText(selectedMachinery).color}
                        >
                          {getMaintenanceStatusText(selectedMachinery).text}
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">Technical Specifications</Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                          {selectedMachinery.specifications || 'No specifications provided'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">Notes</Typography>
                        <Typography variant="body1">
                          {selectedMachinery.notes || 'No notes provided'}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<BuildIcon />}
                        onClick={() => handleOpenMaintenanceDialog(selectedMachinery.id)}
                      >
                        Add Maintenance Record
                      </Button>

                      <Button
                        variant="outlined"
                        startIcon={<SwapHorizIcon />}
                        onClick={() => handleOpenStatusHistoryDialog(selectedMachinery.id)}
                      >
                        Add Status Change
                      </Button>

                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => {
                          handleCloseMachineryDetails();
                          handleOpenMachineryDialog(selectedMachinery);
                        }}
                      >
                        Edit Machine
                      </Button>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Maintenance History
                      </Typography>

                      <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => dispatch(fetchMaintenanceRecords(selectedMachinery.id))}
                      >
                        Refresh
                      </Button>
                    </Box>

                    {isLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        {maintenanceRecords && maintenanceRecords.length > 0 ? (
                          <List sx={{ mt: 2 }}>
                            {maintenanceRecords.map((record: MaintenanceRecord) => (
                              <Paper key={record.id} elevation={1} sx={{ mb: 2, p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Box>
                                    <Typography variant="subtitle1" fontWeight="medium">
                                      {format(parseISO(record.date), 'MMM d, yyyy')}
                                    </Typography>
                                    <Box sx={{ mt: 0.5, mb: 1 }}>
                                      {getMaintenanceTypeChip(record.type)}
                                    </Box>
                                  </Box>

                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {formatCurrency(record.cost)}
                                  </Typography>
                                </Box>

                                <Typography variant="body2" paragraph>
                                  {record.description}
                                </Typography>

                                {record.imageUrls && record.imageUrls.length > 0 && (
                                  <Box sx={{ mt: 2, mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                      Images:
                                    </Typography>
                                    <ImageList sx={{ width: '100%', maxHeight: 200 }} cols={3} rowHeight={100}>
                                      {record.imageUrls.map((url, index) => (
                                        <ImageListItem key={index}>
                                          <img
                                            src={url}
                                            alt={`Maintenance documentation ${index + 1}`}
                                            loading="lazy"
                                            style={{ objectFit: 'cover', height: '100%', width: '100%', borderRadius: 4 }}
                                          />
                                        </ImageListItem>
                                      ))}
                                    </ImageList>
                                  </Box>
                                )}

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Performed by: {record.performedBy}
                                  </Typography>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                      {!record.is_completed && (
                                        <Button
                                          size="small"
                                          color="primary"
                                          variant="outlined"
                                          onClick={() =>
                                            record.machineryId &&
                                            handleOpenMaintenanceDialog(record.machineryId, record)
                                          }
                                        >
                                          Edit
                                        </Button>
                                      )}
                                      {record.is_completed && (
                                        <Chip
                                          label="Completed"
                                          icon={<CheckCircleIcon />}
                                          color="success"
                                          size="small"
                                          variant="outlined"
                                        />
                                      )}
                                      <Button
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        onClick={() => handleDeleteMaintenanceRecord(record.id)}
                                      >
                                        Delete
                                      </Button>
                                    </Box>
                                  </TableCell>
                                </Box>
                                {record.notes && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                                    Note: {record.notes}
                                  </Typography>
                                )}
                              </Paper>
                            ))}
                          </List>
                        ) : (
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography variant="body1" color="text.secondary">
                              No maintenance records found for this machinery.
                            </Typography>
                            <Button
                              variant="outlined"
                              sx={{ mt: 2 }}
                              startIcon={<BuildIcon />}
                              onClick={() => handleOpenMaintenanceDialog(selectedMachinery.id)}
                            >
                              Add First Maintenance Record
                            </Button>
                          </Box>
                        )}
                      </>
                    )}
                  </Paper>

                  <Paper sx={{ p: 2, mt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Status History
                      </Typography>

                      <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                          try {
                            dispatch(fetchStatusHistory(selectedMachinery.id));
                          } catch (error) {
                            console.warn('Could not fetch status history, table might not exist yet:', error);
                            showSnackbar('Status history table may not exist yet in the database', 'info');
                          }
                        }}
                      >
                        Refresh
                      </Button>
                    </Box>

                    {isLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <>
                        {statusHistory && statusHistory.length > 0 ? (
                          <List sx={{ mt: 2 }}>
                            {statusHistory.map((record: StatusHistoryRecord) => (
                              <Paper key={record.id} elevation={1} sx={{ mb: 2, p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <Box>
                                    <Typography variant="subtitle1" fontWeight="medium">
                                      {format(parseISO(record.date), 'MMM d, yyyy')}
                                    </Typography>
                                    <Box sx={{ mt: 0.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {getStatusChip(record.previousStatus)}
                                      <SwapHorizIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                      {getStatusChip(record.newStatus)}
                                    </Box>
                                  </Box>

                                  <Typography variant="subtitle2" color="text.secondary">
                                    By: {record.changedBy}
                                  </Typography>
                                </Box>

                                <Typography variant="body2" paragraph>
                                  <strong>Reason:</strong> {record.reason}
                                </Typography>

                                {record.imageUrls && record.imageUrls.length > 0 && (
                                  <Box sx={{ mt: 2, mb: 2 }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                      Images:
                                    </Typography>
                                    <ImageList sx={{ width: '100%', maxHeight: 200 }} cols={3} rowHeight={100}>
                                      {record.imageUrls.map((url, index) => (
                                        <ImageListItem key={index}>
                                          <img
                                            src={url}
                                            alt={`Status change documentation ${index + 1}`}
                                            loading="lazy"
                                            style={{ objectFit: 'cover', height: '100%', width: '100%', borderRadius: 4 }}
                                          />
                                        </ImageListItem>
                                      ))}
                                    </ImageList>
                                  </Box>
                                )}

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  {record.notes && (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      Note: {record.notes}
                                    </Typography>
                                  )}

                                  <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                    <Tooltip title="Editing status history is not allowed">
                                      <span>
                                        <Button size="small" disabled>Edit</Button>
                                      </span>
                                    </Tooltip>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="outlined"
                                      onClick={() => handleDeleteStatusHistory(record.id)}
                                    >
                                      Delete
                                    </Button>
                                  </Box>
                                </Box>
                              </Paper>
                            ))}
                          </List>
                        ) : (
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography variant="body1" color="text.secondary">
                              No status history records found for this machinery.
                            </Typography>
                            <Button
                              variant="outlined"
                              sx={{ mt: 2 }}
                              startIcon={<SwapHorizIcon />}
                              onClick={() => handleOpenStatusHistoryDialog(selectedMachinery.id)}
                            >
                              Add First Status Change Record
                            </Button>
                          </Box>
                        )}
                      </>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseMachineryDetails}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      <Portal>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ zIndex: 14000 }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Portal>
    </Box>
  );
};

export default MachineryList;