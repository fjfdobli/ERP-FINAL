import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Button, TextField, InputAdornment, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, Grid, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, 
  Chip, Tooltip, Tabs, Tab, Divider, LinearProgress, Card, CardContent
} from '@mui/material';
import { 
  Add as AddIcon, Search as SearchIcon, Refresh as RefreshIcon, Today as TodayIcon,
  History as HistoryIcon, CalendarMonth as CalendarMonthIcon, NoteAdd as NoteAddIcon,
  Schedule as ScheduleIcon, HourglassEmpty as HourglassEmptyIcon, CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon, Download as DownloadIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { 
  fetchAttendance, createAttendance, updateAttendance, deleteAttendance, bulkCreateAttendance 
} from '../redux/slices/attendanceSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { Attendance, AttendanceFilters } from '../services/attendanceService';
import { format, isToday, isYesterday, parseISO, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay } from 'date-fns';
import { Employee } from '../services/employeesService';
import * as XLSX from 'xlsx';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

// Utility function to parse time strings
const parseTimeString = (timeStr: string | null): Date | null => {
  if (!timeStr) return null;
  
  const today = new Date();
  
  // Check if time is in 12-hour format (e.g., "7:30 AM")
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const [timePart, meridiem] = timeStr.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    
    const date = new Date();
    let hour = hours;
    
    // Convert to 24-hour format if PM
    if (meridiem === 'PM' && hours < 12) {
      hour += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hour = 0;
    }
    
    date.setHours(hour, minutes || 0, 0, 0);
    return date;
  }
  
  // If it's already in 24-hour format (e.g., "14:30")
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes || 0, 0, 0);
  return date;
};

// Function to format dates in MM/DD/YYYY format
const formatDateMMDDYYYY = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MM/dd/yyyy');
};

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
      id={`attendance-tabpanel-${index}`}
      aria-labelledby={`attendance-tab-${index}`}
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

interface AttendanceFormData {
  employeeId: number | string;
  date: Date;
  morningTimeIn: Date | null;
  morningTimeOut: Date | null;
  afternoonTimeIn: Date | null;
  afternoonTimeOut: Date | null;
  status: 'Present' | 'Absent' | 'Late' | 'Half-day' | 'On Leave';
  overtime: number | null;
  notes: string;
}

interface BulkAttendanceRow {
  employeeId: number;
  employeeName: string;
  present: boolean;
  morningTimeIn: Date | null;
  morningTimeOut: Date | null;
  afternoonTimeIn: Date | null;
  afternoonTimeOut: Date | null;
  status: 'Present' | 'Absent' | 'Late' | 'Half-day' | 'On Leave';
  overtime: number | null;
  notes: string;
}

// Daily Attendance Banner Component
const DailyAttendanceBanner: React.FC<{
  filters: AttendanceFilters;
  filteredRecords: Attendance[];
  employees: any[];
  applyDateRange: (range: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth') => void;
  openBulkDialog: () => void;
  setBulkDate: (date: Date) => void;
  setBulkAttendanceData: (data: BulkAttendanceRow[]) => void;
  setIsBulkMode: (mode: boolean) => void;
  setOpenDialog: (open: boolean) => void;
  getEmployeeName: (employeeId: number) => string;
}> = ({
  filters,
  filteredRecords,
  employees,
  applyDateRange,
  openBulkDialog,
  setBulkDate,
  setBulkAttendanceData,
  setIsBulkMode,
  setOpenDialog,
  getEmployeeName
}) => {
  const activeEmployees = employees?.filter(e => e.status !== 'Inactive') || [];
  const currentDate = filters.startDate ? parseISO(filters.startDate) : new Date();
  const isCurrentDay = isSameDay(currentDate, new Date());
  
  // Calculate employees with missing attendance for today
  const employeesWithAttendance = new Set(filteredRecords.map(r => r.employeeId));
  const missingEmployees = activeEmployees.filter(emp => !employeesWithAttendance.has(Number(emp.id)));
  
  // Function to repeat attendance pattern from selected date
  const repeatAttendancePattern = () => {
    // Get employees present on the selected date
    const dateToRepeat = filters.startDate || '';
    const recordsToRepeat = filteredRecords.filter(r => 
      r.status === 'Present' || r.status === 'Late'
    );
    
    // Initialize bulk attendance with these employees
    if (recordsToRepeat.length > 0) {
      const initialData = recordsToRepeat.map(record => {
        // Parse time strings to Date objects
        const morningIn = record.timeIn ? parseTimeString(record.timeIn) : null;
        const afternoonOut = record.timeOut ? parseTimeString(record.timeOut) : null;
        
        // Extract morning and afternoon times from notes if available
        let morningOut = null;
        let afternoonIn = null;
        
        if (record.notes && record.notes.includes('Morning:')) {
          const noteParts = record.notes.split('\n');
          const timeParts = noteParts[0].split(',');
          
          // Extract morning times
          if (timeParts[0].includes('Morning:')) {
            const morningTimes = timeParts[0].replace('Morning:', '').trim().split('-');
            if (morningTimes.length === 2 && morningTimes[1].trim() !== 'N/A') {
              morningOut = parseTimeString(morningTimes[1].trim());
            }
          }
          
          // Extract afternoon times
          if (timeParts.length > 1 && timeParts[1].includes('Afternoon:')) {
            const afternoonTimes = timeParts[1].replace('Afternoon:', '').trim().split('-');
            if (afternoonTimes.length === 2 && afternoonTimes[0].trim() !== 'N/A') {
              afternoonIn = parseTimeString(afternoonTimes[0].trim());
            }
          }
        }
        
        return {
          employeeId: record.employeeId,
          employeeName: record.employeeName || getEmployeeName(record.employeeId),
          present: true,
          morningTimeIn: morningIn,
          morningTimeOut: morningOut,
          afternoonTimeIn: afternoonIn,
          afternoonTimeOut: afternoonOut,
          status: record.status as any,
          overtime: record.overtime || 0,
          notes: `Pattern repeated from ${formatDateMMDDYYYY(dateToRepeat)}`,
        };
      });
      
      setBulkAttendanceData(initialData);
      setBulkDate(new Date());
      setIsBulkMode(true);
      setOpenDialog(true);
    }
  };
  
  // Create quick buttons for handling missing employees
  const handleAddMissingEmployees = () => {
    if (missingEmployees.length === 0) return;
    
    const initialData: BulkAttendanceRow[] = missingEmployees.map(emp => ({
      employeeId: Number(emp.id),
      employeeName: `${emp.firstName} ${emp.lastName}`,
      present: true,
      morningTimeIn: new Date(new Date().setHours(7, 0, 0, 0)),
      morningTimeOut: new Date(new Date().setHours(12, 0, 0, 0)),
      afternoonTimeIn: new Date(new Date().setHours(13, 0, 0, 0)),
      afternoonTimeOut: new Date(new Date().setHours(18, 0, 0, 0)),
      status: 'Present' as const,
      overtime: 0,
      notes: '',
    }));
    
    setBulkAttendanceData(initialData);
    setBulkDate(new Date());
    setIsBulkMode(true);
    setOpenDialog(true);
  };
  
  return (
    <Paper sx={{ p: 2, mb: 3, bgcolor: isCurrentDay ? 'primary.light' : 'background.paper' }}>
      <Grid container alignItems="center" spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" color={isCurrentDay ? 'primary.contrastText' : 'primary'}>
            {isCurrentDay ? 
              "Today's Attendance" : 
              isYesterday(currentDate) ?
                "Yesterday's Attendance" :
                `Attendance for ${formatDateMMDDYYYY(currentDate)}`
            }
          </Typography>
          
          <Box sx={{ mt: 1 }}>
            {filteredRecords?.length > 0 && activeEmployees?.length > 0 && (
              <Typography variant="body2" color={isCurrentDay ? 'primary.contrastText' : 'text.secondary'}>
                <strong>{filteredRecords.length}</strong> of <strong>{activeEmployees.length}</strong> employees recorded
                {missingEmployees.length > 0 && isCurrentDay && (
                  <Button 
                    variant="text" 
                    size="small"
                    color="inherit"
                    onClick={handleAddMissingEmployees}
                    sx={{ ml: 1, textDecoration: 'underline' }}
                  >
                    Add {missingEmployees.length} missing
                  </Button>
                )}
              </Typography>
            )}
            
            {!filteredRecords?.length && (
              <Typography variant="body2" color={isCurrentDay ? 'primary.contrastText' : 'error'}>
                No attendance records found for this date.
              </Typography>
            )}
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
            <Button 
              variant={isCurrentDay ? "contained" : "outlined"}
              color={isCurrentDay ? "secondary" : "primary"}
              onClick={() => applyDateRange('today')}
            >
              Today
            </Button>
            
            <Button 
              variant={isYesterday(currentDate) ? "contained" : "outlined"}
              color={isYesterday(currentDate) ? "secondary" : "primary"}
              onClick={() => applyDateRange('yesterday')}
            >
              Yesterday
            </Button>
            
            {!isCurrentDay && filteredRecords.length > 0 && (
              <Button 
                variant="outlined"
                color="primary"
                onClick={repeatAttendancePattern}
                startIcon={<RefreshIcon />}
              >
                Use This Pattern Today
              </Button>
            )}
            
            {isCurrentDay && (
              <Button 
                variant="contained"
                color="primary"
                onClick={openBulkDialog}
                startIcon={<AddIcon />}
              >
                Bulk Entry
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

// Missing Employees Component
const MissingEmployeesSection: React.FC<{
  employees: any[];
  filteredRecords: Attendance[];
  currentDate: Date;
  handleAddMissingEmployees: () => void;
}> = ({
  employees,
  filteredRecords,
  currentDate,
  handleAddMissingEmployees
}) => {
  // Only show for today's date
  if (!isSameDay(currentDate, new Date())) return null;
  
  const activeEmployees = employees?.filter(e => e.status !== 'Inactive') || [];
  
  // Calculate employees with missing attendance
  const employeesWithAttendance = new Set(filteredRecords.map(r => r.employeeId));
  const missingEmployees = activeEmployees.filter(emp => !employeesWithAttendance.has(Number(emp.id)));
  
  // Don't show if no missing employees
  if (missingEmployees.length === 0) return null;
  
  return (
    <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.light' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" color="warning.contrastText">
            Employees Missing Attendance: {missingEmployees.length}
          </Typography>
          <Typography variant="body2" color="warning.contrastText">
            The following employees don't have attendance records for today:
          </Typography>
        </Box>
        
        <Button 
          variant="contained" 
          color="warning"
          onClick={handleAddMissingEmployees}
        >
          Add All Missing
        </Button>
      </Box>
      
      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {missingEmployees.slice(0, 10).map((emp) => (
          <Chip 
            key={emp.id}
            label={`${emp.firstName} ${emp.lastName}`}
            color="default"
            variant="outlined"
          />
        ))}
        {missingEmployees.length > 10 && (
          <Chip 
            label={`+${missingEmployees.length - 10} more`}
            color="default"
            variant="outlined"
          />
        )}
      </Box>
    </Paper>
  );
};

// Custom color palette for charts
const CHART_COLORS = {
  present: '#4caf50',
  absent: '#f44336',
  late: '#ff9800',
  halfDay: '#2196f3',
  onLeave: '#9e9e9e',
  primary: '#3f51b5',
  secondary: '#f50057'
};

const AttendanceLists: React.FC = () => {
  const dispatch = useAppDispatch();
  const { attendanceRecords, isLoading: attendanceLoading } = useAppSelector((state: any) => state.attendance || { attendanceRecords: [], isLoading: false });
  const { employees, isLoading: employeesLoading } = useAppSelector((state: any) => state.employees);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [bulkDate, setBulkDate] = useState<Date>(new Date());
  const [bulkAttendanceData, setBulkAttendanceData] = useState<BulkAttendanceRow[]>([]);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<AttendanceFilters>({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Chart data states
  const [attendanceStats, setAttendanceStats] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [reportPeriod, setReportPeriod] = useState<string>('thisMonth');
  
  const [formData, setFormData] = useState<AttendanceFormData>({
    employeeId: '',
    date: new Date(),
    morningTimeIn: null,
    morningTimeOut: null,
    afternoonTimeIn: null,
    afternoonTimeOut: null,
    status: 'Present',
    overtime: null,
    notes: '',
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

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await dispatch(fetchEmployees()).unwrap();
      await dispatch(fetchAttendance(filters)).unwrap();
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

  // Process attendance data for charts when records change
  useEffect(() => {
    if (attendanceRecords && attendanceRecords.length > 0) {
      // Process status statistics for pie chart
      const statusCounts = {
        'Present': 0,
        'Absent': 0,
        'Late': 0,
        'Half-day': 0,
        'On Leave': 0
      };
      
      attendanceRecords.forEach((record: Attendance) => {
        if (statusCounts[record.status as keyof typeof statusCounts] !== undefined) {
          statusCounts[record.status as keyof typeof statusCounts]++;
        }
      });
      
      const pieData = Object.entries(statusCounts).map(([status, count]) => ({
        name: status,
        value: count
      }));
      
      setAttendanceStats(pieData);
      
      // Process monthly trends for line chart
      const dateMap = new Map();
      
      // Get the start and end dates from filters
      const startDate = new Date(filters.startDate || '');
      const endDate = new Date(filters.endDate || '');
      
      // Create date range array
      const dateRange: Date[] = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Initialize data for each date
      dateRange.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        dateMap.set(dateStr, {
          date: dateStr,
          displayDate: format(date, 'MM/dd'),
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          onLeave: 0
        });
      });
      
      // Count attendance by date and status
      attendanceRecords.forEach((record: Attendance) => {
        const data = dateMap.get(record.date);
        if (data) {
          switch (record.status) {
            case 'Present':
              data.present++;
              break;
            case 'Absent':
              data.absent++;
              break;
            case 'Late':
              data.late++;
              break;
            case 'Half-day':
              data.halfDay++;
              break;
            case 'On Leave':
              data.onLeave++;
              break;
          }
        }
      });
      
      // Convert map to array and sort by date
      const trendsData = Array.from(dateMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
      // For large date ranges, aggregate by week or month
      const aggregatedData = trendsData.length > 31 
        ? aggregateByWeek(trendsData) 
        : trendsData;
      
      setMonthlyTrends(aggregatedData);
    }
  }, [attendanceRecords, filters]);

  // Helper function to aggregate data by week
  const aggregateByWeek = (dailyData: any[]) => {
    const weeklyData = new Map();
    
    dailyData.forEach(day => {
      const date = new Date(day.date);
      const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekKey = `${format(date, 'MM/dd')}-${format(endOfWeek(date, { weekStartsOn: 1 }), 'MM/dd')}`;
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          date: `${weekStart} to ${weekEnd}`,
          displayDate: weekKey,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          onLeave: 0
        });
      }
      
      const weekData = weeklyData.get(weekKey);
      weekData.present += day.present;
      weekData.absent += day.absent;
      weekData.late += day.late;
      weekData.halfDay += day.halfDay;
      weekData.onLeave += day.onLeave;
    });
    
    return Array.from(weeklyData.values());
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDialog = (attendance?: Attendance) => {
    if (attendance) {
      setSelectedAttendance(attendance);
      
      // Convert string times to Date objects for morning and afternoon times
      let morningTimeIn = null;
      let morningTimeOut = null;
      let afternoonTimeIn = null;
      let afternoonTimeOut = null;
      
      if (attendance.timeIn) {
        // Assuming timeIn is AM (morning)
        const timeInDate = new Date();
        const [hours, minutes] = attendance.timeIn.split(':').map(Number);
        timeInDate.setHours(hours, minutes);
        morningTimeIn = timeInDate;
      }
      
      if (attendance.timeOut) {
        const timeOutDate = new Date();
        const [hours, minutes] = attendance.timeOut.split(':').map(Number);
        timeOutDate.setHours(hours, minutes);
        
        if (hours < 13) {
          morningTimeOut = timeOutDate;
        } else {
          afternoonTimeOut = timeOutDate;
        }
      }
      
      if (!afternoonTimeIn && attendance.status === 'Present') {
        const defaultAfternoonIn = new Date();
        defaultAfternoonIn.setHours(13, 0);
        afternoonTimeIn = defaultAfternoonIn;
      }
      
      setFormData({
        employeeId: attendance.employeeId,
        date: parseISO(attendance.date),
        morningTimeIn,
        morningTimeOut,
        afternoonTimeIn,
        afternoonTimeOut,
        status: attendance.status as any || 'Present',
        overtime: attendance.overtime,
        notes: attendance.notes || '',
      });
    } else {
      setSelectedAttendance(null);
      setFormData({
        employeeId: '',
        date: new Date(),
        morningTimeIn: null,
        morningTimeOut: null,
        afternoonTimeIn: null,
        afternoonTimeOut: null,
        status: 'Present',
        overtime: null,
        notes: '',
      });
    }
    setOpenDialog(true);
    setIsBulkMode(false);
  };

  const handleOpenBulkDialog = () => {
    // Initialize bulk attendance data with all active employees
    if (employees && employees.length > 0) {
      const initialData: BulkAttendanceRow[] = employees
        .filter((emp: any) => emp.status !== 'Inactive')
        .map((emp: any) => ({
          employeeId: Number(emp.id),
          employeeName: `${emp.firstName} ${emp.lastName}`,
          present: true,
          morningTimeIn: new Date(new Date().setHours(7, 0, 0, 0)),
          morningTimeOut: new Date(new Date().setHours(12, 0, 0, 0)),
          afternoonTimeIn: new Date(new Date().setHours(13, 0, 0, 0)),
          afternoonTimeOut: new Date(new Date().setHours(18, 0, 0, 0)),
          status: 'Present' as const,
          overtime: 0,
          notes: '',
        }));
      
      setBulkAttendanceData(initialData);
    }
    
    setBulkDate(new Date());
    setIsBulkMode(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAttendance(null);
    setIsBulkMode(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        date
      }));
    }
  };

  const handleBulkDateChange = (date: Date | null) => {
    if (date) {
      setBulkDate(date);
    }
  };

  const handleTimeChange = (name: 'morningTimeIn' | 'morningTimeOut' | 'afternoonTimeIn' | 'afternoonTimeOut') => (time: Date | null) => {
    setFormData(prev => ({
      ...prev,
      [name]: time
    }));
  };

  const handleBulkInputChange = (index: number, field: keyof BulkAttendanceRow, value: any) => {
    const updatedData = [...bulkAttendanceData];
    updatedData[index] = {
      ...updatedData[index],
      [field]: value
    };
    
    // Update status automatically based on present field
    if (field === 'present') {
      updatedData[index].status = value ? 'Present' : 'Absent';
      
      // Clear times if absent
      if (!value) {
        updatedData[index].morningTimeIn = null;
        updatedData[index].morningTimeOut = null;
        updatedData[index].afternoonTimeIn = null;
        updatedData[index].afternoonTimeOut = null;
        updatedData[index].overtime = 0;
      } else {
        // Set default times if changed to present
        updatedData[index].morningTimeIn = new Date(new Date().setHours(7, 0, 0, 0));
        updatedData[index].morningTimeOut = new Date(new Date().setHours(12, 0, 0, 0));
        updatedData[index].afternoonTimeIn = new Date(new Date().setHours(13, 0, 0, 0));
        updatedData[index].afternoonTimeOut = new Date(new Date().setHours(18, 0, 0, 0));
      }
    }
    
    setBulkAttendanceData(updatedData);
  };

  const handleFilterChange = (name: keyof AttendanceFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateFilterChange = (name: 'startDate' | 'endDate') => (date: Date | null) => {
    if (date) {
      setFilters(prev => ({
        ...prev,
        [name]: format(date, 'yyyy-MM-dd')
      }));
    }
  };

  const applyDateRange = (range: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth') => {
    const today = new Date();
    let start: Date, end: Date;
    
    switch (range) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start = subDays(today, 1);
        end = subDays(today, 1);
        break;
      case 'thisWeek':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'lastWeek':
        start = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        end = subDays(endOfWeek(today, { weekStartsOn: 1 }), 7);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      default:
        return;
    }
    
    setFilters(prev => ({
      ...prev,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    }));
  };

  const handleReportPeriodChange = (event: any) => {
    const value = event.target.value;
    setReportPeriod(value);
    
    // Update date filters based on selected period
    const today = new Date();
    let start: Date, end: Date;
    
    switch (value) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'thisWeek':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'last3Months':
        start = startOfMonth(subMonths(today, 2));
        end = endOfMonth(today);
        break;
      default:
        return;
    }
    
    setFilters(prev => ({
      ...prev,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      if (isBulkMode) {
        // Handle bulk attendance submission
        const attendanceRecords = bulkAttendanceData
          .filter(row => row.present || row.status !== 'Present')
          .map(row => {
            // Combine morning and afternoon times into the format expected by backend
            // Morning time in will be used as timeIn
            // Afternoon time out will be used as timeOut
            const morningIn = row.morningTimeIn ? format(row.morningTimeIn, 'hh:mm a') : null;
            const afternoonOut = row.afternoonTimeOut ? format(row.afternoonTimeOut, 'hh:mm a') : null;
            
            return {
              employeeId: row.employeeId,
              date: format(bulkDate, 'yyyy-MM-dd'),
              timeIn: morningIn,
              timeOut: afternoonOut,
              // Store all times in notes for display purposes
              notes: `Morning: ${morningIn || 'N/A'} - ${row.morningTimeOut ? format(row.morningTimeOut, 'hh:mm a') : 'N/A'}, 
                    Afternoon: ${row.afternoonTimeIn ? format(row.afternoonTimeIn, 'hh:mm a') : 'N/A'} - ${afternoonOut || 'N/A'}
                    ${row.notes ? `\nNotes: ${row.notes}` : ''}`,
              status: row.status,
              overtime: row.overtime
            };
          });
        
        await dispatch(bulkCreateAttendance(attendanceRecords as any)).unwrap();
        showSnackbar(`Successfully recorded attendance for ${attendanceRecords.length} employees`, 'success');
      } else {
        // Handle single attendance record
        const { employeeId, date, morningTimeIn, morningTimeOut, afternoonTimeIn, afternoonTimeOut, status, overtime, notes } = formData;
        
        if (!employeeId) {
          showSnackbar('Please select an employee', 'error');
          setLoading(false);
          return;
        }
        
        // Combine morning and afternoon times into notes for display
        const morningIn = morningTimeIn ? format(morningTimeIn, 'hh:mm a') : 'N/A';
        const morningOut = morningTimeOut ? format(morningTimeOut, 'hh:mm a') : 'N/A';
        const afternoonIn = afternoonTimeIn ? format(afternoonTimeIn, 'hh:mm a') : 'N/A';
        const afternoonOut = afternoonTimeOut ? format(afternoonTimeOut, 'hh:mm a') : 'N/A';
        
        const combinedNotes = `Morning: ${morningIn} - ${morningOut}, Afternoon: ${afternoonIn} - ${afternoonOut}${notes ? `\nNotes: ${notes}` : ''}`;
        
        const attendanceData = {
          employeeId: Number(employeeId),
          date: format(date, 'yyyy-MM-dd'),
          // Morning time in will be used as timeIn
          timeIn: morningTimeIn ? format(morningTimeIn, 'hh:mm a') : null,
          // Afternoon time out will be used as timeOut
          timeOut: afternoonTimeOut ? format(afternoonTimeOut, 'hh:mm a') : null,
          status,
          overtime,
          notes: combinedNotes
        };
        
        if (selectedAttendance) {
          await dispatch(updateAttendance({ id: selectedAttendance.id, data: attendanceData as any })).unwrap();
          showSnackbar('Attendance record updated successfully', 'success');
        } else {
          await dispatch(createAttendance(attendanceData as any)).unwrap();
          showSnackbar('Attendance record created successfully', 'success');
        }
      }
      
      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      showSnackbar(error.message || 'Failed to save attendance record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      setLoading(true);
      try {
        await dispatch(deleteAttendance(id)).unwrap();
        showSnackbar('Attendance record deleted successfully', 'success');
        fetchData();
      } catch (error: any) {
        console.error('Error deleting attendance:', error);
        showSnackbar(error.message || 'Failed to delete attendance record', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSearch = () => {
    // We're already handling the search filter directly in the filteredRecords computation
    console.log("Search term applied:", searchTerm);
  };

  const getStatusChip = (status: string) => {
    let color: 'default' | 'success' | 'error' | 'warning' | 'info' = 'default';
    let icon = null;
    
    switch (status) {
      case 'Present':
        color = 'success';
        icon = <CheckCircleIcon fontSize="small" />;
        break;
      case 'Absent':
        color = 'error';
        icon = <CancelIcon fontSize="small" />;
        break;
      case 'Late':
        color = 'warning';
        icon = <ScheduleIcon fontSize="small" />;
        break;
      case 'Half-day':
        color = 'info';
        icon = <HourglassEmptyIcon fontSize="small" />;
        break;
      case 'On Leave':
        color = 'default';
        icon = <TodayIcon fontSize="small" />;
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

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return formatDateMMDDYYYY(date);
    }
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = employees?.find((emp: any) => Number(emp.id) === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  // Function to handle adding missing employees to attendance
  const handleAddMissingEmployees = () => {
    if (employees?.length === 0) return;
    
    // Create a list of employees without attendance records
    const employeesWithAttendance: Set<number> = new Set(filteredRecords.map((r: Attendance) => r.employeeId));
    interface MissingEmployee {
      employeeId: number;
      employeeName: string;
      present: boolean;
      morningTimeIn: Date;
      morningTimeOut: Date;
      afternoonTimeIn: Date;
      afternoonTimeOut: Date;
      status: 'Present';
      overtime: number;
      notes: string;
    }

    interface MissingEmployee {
      employeeId: number;
      employeeName: string;
      present: boolean;
      morningTimeIn: Date;
      morningTimeOut: Date;
      afternoonTimeIn: Date;
      afternoonTimeOut: Date;
      status: 'Present';
      overtime: number;
      notes: string;
    }

    const missingEmployees: MissingEmployee[] = employees
      .filter((emp: { id: number; status: string; firstName: string; lastName: string }) => emp.status !== 'Inactive' && !employeesWithAttendance.has(Number(emp.id)))
      .map((emp: { id: number; firstName: string; lastName: string }) => ({
      employeeId: Number(emp.id),
      employeeName: `${emp.firstName} ${emp.lastName}`,
      present: true,
      morningTimeIn: new Date(new Date().setHours(7, 0, 0, 0)),
      morningTimeOut: new Date(new Date().setHours(12, 0, 0, 0)),
      afternoonTimeIn: new Date(new Date().setHours(13, 0, 0, 0)),
      afternoonTimeOut: new Date(new Date().setHours(18, 0, 0, 0)),
      status: 'Present' as const,
      overtime: 0,
      notes: '',
      }));
    
    if (missingEmployees.length > 0) {
      setBulkAttendanceData(missingEmployees);
      setBulkDate(new Date());
      setIsBulkMode(true);
      setOpenDialog(true);
    }
  };

  // Excel Export Functions
  const exportAttendanceSummary = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      showSnackbar('No attendance data to export', 'error');
      return;
    }
    
    // Group by employees
    const employeeMap = new Map();
    
    attendanceRecords.forEach((record: Attendance) => {
      const empId = record.employeeId;
      const empName = record.employeeName || getEmployeeName(empId);
      
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employeeId: empId,
          name: empName,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          onLeave: 0,
          overtime: 0,
          totalDays: 0
        });
      }
      
      const employee = employeeMap.get(empId);
      employee.totalDays++;
      
      switch (record.status) {
        case 'Present':
          employee.present++;
          break;
        case 'Absent':
          employee.absent++;
          break;
        case 'Late':
          employee.late++;
          break;
        case 'Half-day':
          employee.halfDay++;
          break;
        case 'On Leave':
          employee.onLeave++;
          break;
      }
      
      if (record.overtime) {
        employee.overtime += record.overtime;
      }
    });
    
    const summaryData = Array.from(employeeMap.values());
    
    // Calculate percentages
    summaryData.forEach(employee => {
      employee.attendanceRate = employee.totalDays > 0 
        ? ((employee.present + employee.late + employee.halfDay) / employee.totalDays * 100).toFixed(2) + '%'
        : '0%';
    });
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(summaryData);
    
    // Add headers and styling
    const headers = [
      'Employee ID', 'Employee Name', 'Present Days', 'Absent Days', 'Late Days', 
      'Half Days', 'Leave Days', 'Total Days', 'Overtime Hours', 'Attendance Rate'
    ];
    
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });
    
    // Set column widths
    const colWidths = [15, 30, 15, 15, 15, 15, 15, 15, 15, 15];
    ws['!cols'] = colWidths.map(width => ({ width }));
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary');
    
    // Generate a report title with date range
    const reportTitle = `Attendance Summary (${formatDateMMDDYYYY(filters.startDate || '')} to ${formatDateMMDDYYYY(filters.endDate || '')})`;
    
    // Save to file
    XLSX.writeFile(wb, `${reportTitle}.xlsx`);
  };

  const exportEmployeeTimesheet = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      showSnackbar('No attendance data to export', 'error');
      return;
    }
    
    // Group by employees
    const employeeMap = new Map();
    
    attendanceRecords.forEach((record: Attendance) => {
      const empId = record.employeeId;
      const empName = record.employeeName || getEmployeeName(empId);
      
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employeeId: empId,
          name: empName,
          records: []
        });
      }
      
      const employee = employeeMap.get(empId);
      
      // Parse the time details from notes
      let morningIn = record.timeIn || 'N/A';
      let morningOut = 'N/A';
      let afternoonIn = 'N/A';
      let afternoonOut = record.timeOut || 'N/A';
      let notes = '';
      
      if (record.notes && record.notes.includes('Morning:')) {
        const noteParts = record.notes.split('\n');
        const timeParts = noteParts[0].split(',');
        
        // Extract morning times
        if (timeParts[0].includes('Morning:')) {
          const morningTimes = timeParts[0].replace('Morning:', '').trim().split('-');
          if (morningTimes.length === 2) {
            morningIn = morningTimes[0].trim() !== 'N/A' ? morningTimes[0].trim() : 'N/A';
            morningOut = morningTimes[1].trim() !== 'N/A' ? morningTimes[1].trim() : 'N/A';
          }
        }
        
        // Extract afternoon times
        if (timeParts.length > 1 && timeParts[1].includes('Afternoon:')) {
          const afternoonTimes = timeParts[1].replace('Afternoon:', '').trim().split('-');
          if (afternoonTimes.length === 2) {
            afternoonIn = afternoonTimes[0].trim() !== 'N/A' ? afternoonTimes[0].trim() : 'N/A';
            afternoonOut = afternoonTimes[1].trim() !== 'N/A' ? afternoonTimes[1].trim() : 'N/A';
          }
        }
        
        // Extract actual notes
        if (noteParts.length > 1 && noteParts[1].includes('Notes:')) {
          notes = noteParts[1].replace('Notes:', '').trim();
        }
      }
      
      employee.records.push({
        date: record.date,
        formattedDate: formatDateMMDDYYYY(parseISO(record.date)),
        morningIn,
        morningOut,
        afternoonIn,
        afternoonOut,
        status: record.status,
        overtime: record.overtime || 0,
        notes
      });
    });
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // For each employee, create a separate sheet
    employeeMap.forEach((employee, empId) => {
      // Sort records by date
      const sortedRecords = employee.records.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Prepare data for Excel
      const sheetData = sortedRecords.map((record: any) => ({
        'Date': record.formattedDate,
        'Morning In': record.morningIn,
        'Morning Out': record.morningOut,
        'Afternoon In': record.afternoonIn,
        'Afternoon Out': record.afternoonOut,
        'Status': record.status,
        'Overtime (hrs)': record.overtime,
        'Notes': record.notes || ''
      }));
      
      // Create a worksheet
      const ws = XLSX.utils.json_to_sheet(sheetData);
      
      // Set column widths
      const colWidths = [18, 15, 15, 15, 15, 15, 15, 30];
      ws['!cols'] = colWidths.map(width => ({ width }));
      
      // Add employee summary at the top
      const summaryData = [
        ['Employee Timesheet'],
        ['Employee Name:', employee.name],
        ['Employee ID:', empId],
        ['Report Period:', `${formatDateMMDDYYYY(filters.startDate || '')} to ${formatDateMMDDYYYY(filters.endDate || '')}`],
        ['Total Days:', sortedRecords.length.toString()],
        ['']  // Empty row before the data
      ];
      
      // Insert summary at the top
      XLSX.utils.sheet_add_aoa(ws, summaryData, { origin: 'A1' });
      
      // Adjust the data to start after the summary
      ws['!ref'] = `A1:H${sheetData.length + summaryData.length}`;
      
      // Add the worksheet to the workbook - use a safe sheet name (max 31 chars)
      const sheetName = employee.name.substring(0, 30).replace(/[\\*?:/[\]]/g, '');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    // Save to file with date range in the filename
    const reportTitle = `Employee Timesheets (${formatDateMMDDYYYY(filters.startDate || '')} to ${formatDateMMDDYYYY(filters.endDate || '')})`;
    XLSX.writeFile(wb, `${reportTitle}.xlsx`);
  };

  const exportOvertimeReport = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      showSnackbar('No attendance data to export', 'error');
      return;
    }
    
    // Group by employees and calculate overtime
    const employeeMap = new Map();
    
    attendanceRecords.forEach((record: Attendance) => {
      if (!record.overtime || record.overtime <= 0) return;
      
      const empId = record.employeeId;
      const empName = record.employeeName || getEmployeeName(empId);
      
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employeeId: empId,
          name: empName,
          overtimeRecords: []
        });
      }
      
      const employee = employeeMap.get(empId);
      
      employee.overtimeRecords.push({
        date: record.date,
        formattedDate: formatDateMMDDYYYY(parseISO(record.date)),
        hours: record.overtime,
        status: record.status,
        notes: record.notes || ''
      });
    });
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Summary worksheet
    const summaryData = Array.from(employeeMap.values()).map(employee => {
      const totalOvertime = employee.overtimeRecords.reduce((sum: number, record: any) => sum + record.hours, 0);
      const daysWithOvertime = employee.overtimeRecords.length;
      
      return {
        'Employee ID': employee.employeeId,
        'Employee Name': employee.name,
        'Total Overtime Hours': totalOvertime,
        'Days with Overtime': daysWithOvertime,
        'Average Overtime per Day': (totalOvertime / daysWithOvertime).toFixed(2)
      };
    });
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    
    // Set column widths for summary
    const summaryColWidths = [15, 30, 20, 20, 25];
    summaryWs['!cols'] = summaryColWidths.map(width => ({ width }));
    
    // Add title and date range
    XLSX.utils.sheet_add_aoa(summaryWs, [
      ['Overtime Summary Report'],
      [`Period: ${formatDateMMDDYYYY(filters.startDate || '')} to ${formatDateMMDDYYYY(filters.endDate || '')}`],
      ['']  // Empty row
    ], { origin: 'A1' });
    
    // Adjust the data to start after the title
    summaryWs['!ref'] = `A1:E${summaryData.length + 3}`;
    
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Overtime Summary');
    
    // Create detailed sheet
    const detailedData: any[] = [];
    
    employeeMap.forEach(employee => {
      // Sort records by date
      const sortedRecords = employee.overtimeRecords.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Add each overtime record with employee info
      sortedRecords.forEach((record: { formattedDate: string; hours: number; status: string; notes: string }) => {
        detailedData.push({
          'Date': record.formattedDate,
          'Employee ID': employee.employeeId,
          'Employee Name': employee.name,
          'Overtime Hours': record.hours,
          'Status': record.status,
          'Notes': record.notes
        });
      });
    });
    
    // If we have detailed records, add them to a separate sheet
    if (detailedData.length > 0) {
      const detailedWs = XLSX.utils.json_to_sheet(detailedData);
      
      // Set column widths
      const detailedColWidths = [18, 15, 30, 15, 15, 30];
      detailedWs['!cols'] = detailedColWidths.map(width => ({ width }));
      
      XLSX.utils.book_append_sheet(wb, detailedWs, 'Detailed Overtime');
    }
    
    // Save to file with date range in the filename
    const reportTitle = `Overtime Report (${formatDateMMDDYYYY(filters.startDate || '')} to ${formatDateMMDDYYYY(filters.endDate || '')})`;
    XLSX.writeFile(wb, `${reportTitle}.xlsx`);
  };

  // Filter displayed records based on search term
  const filteredRecords = searchTerm.trim() 
    ? attendanceRecords?.filter((record: Attendance) => {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          (record.employeeName?.toLowerCase().includes(lowerSearch)) ||
          record.status.toLowerCase().includes(lowerSearch) ||
          (record.notes && record.notes.toLowerCase().includes(lowerSearch))
        );
      })
    : attendanceRecords;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Attendance
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<NoteAddIcon />}
            onClick={handleOpenBulkDialog}
            sx={{ mr: 1 }}
          >
            Bulk Entry
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Record
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="attendance management tabs">
          <Tab label="Attendance Records" icon={<HistoryIcon />} />
          <Tab label="Reports & Analytics" icon={<CalendarMonthIcon />} />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          {/* Daily Attendance Banner */}
          <DailyAttendanceBanner
            filters={filters}
            filteredRecords={filteredRecords}
            employees={employees}
            applyDateRange={applyDateRange}
            openBulkDialog={handleOpenBulkDialog}
            setBulkDate={setBulkDate}
            setBulkAttendanceData={setBulkAttendanceData}
            setIsBulkMode={setIsBulkMode}
            setOpenDialog={setOpenDialog}
            getEmployeeName={getEmployeeName}
          />
          
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  placeholder="Search employees or status..."
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={7}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="From Date"
                      value={filters.startDate ? parseISO(filters.startDate) : null}
                      onChange={handleDateFilterChange('startDate')}
                      slotProps={{ textField: { size: 'small', sx: { mr: 1 } } }}
                    />
                    <DatePicker
                      label="To Date"
                      value={filters.endDate ? parseISO(filters.endDate) : null}
                      onChange={handleDateFilterChange('endDate')}
                      slotProps={{ textField: { size: 'small', sx: { mr: 1 } } }}
                    />
                  </LocalizationProvider>
                  
                  <FormControl size="small" sx={{ minWidth: 120, mr: 1 }}>
                    <InputLabel id="status-filter-label">Status</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      value={filters.status || ''}
                      label="Status"
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="Present">Present</MenuItem>
                      <MenuItem value="Absent">Absent</MenuItem>
                      <MenuItem value="Late">Late</MenuItem>
                      <MenuItem value="Half-day">Half-day</MenuItem>
                      <MenuItem value="On Leave">On Leave</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Button 
                    variant="outlined"
                    color="primary"
                    onClick={() => fetchData()}
                    startIcon={<RefreshIcon />}
                  >
                    Apply
                  </Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    onClick={() => applyDateRange('today')}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Today
                  </Button>
                  <Button
                    onClick={() => applyDateRange('thisWeek')}
                    size="small"
                  >
                    This Week
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
          
          {/* Missing Employees Section */}
          {isToday(parseISO(filters.startDate || '')) && filteredRecords && (
            <MissingEmployeesSection
              employees={employees}
              filteredRecords={filteredRecords}
              currentDate={parseISO(filters.startDate || '')}
              handleAddMissingEmployees={handleAddMissingEmployees}
            />
          )}
          
          {(loading || attendanceLoading || employeesLoading) ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Employee</strong></TableCell>
                    <TableCell><strong>Morning In</strong></TableCell>
                    <TableCell><strong>Morning Out</strong></TableCell>
                    <TableCell><strong>Afternoon In</strong></TableCell>
                    <TableCell><strong>Afternoon Out</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Overtime</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords && filteredRecords.length > 0 ? (
                    filteredRecords.map((record: Attendance) => {
                      // Extract morning and afternoon times from notes if available
                      let morningIn = record.timeIn || '-';
                      let morningOut = '-';
                      let afternoonIn = '-';
                      let afternoonOut = record.timeOut || '-';
                      let notes = '';
                      
                      // Try to parse the notes to extract all time periods if available
                      if (record.notes && record.notes.includes('Morning:')) {
                        const noteParts = record.notes.split('\n');
                        const timeParts = noteParts[0].split(',');
                        
                        // Extract morning times
                        if (timeParts[0].includes('Morning:')) {
                          const morningTimes = timeParts[0].replace('Morning:', '').trim().split('-');
                          if (morningTimes.length === 2) {
                            morningIn = morningTimes[0].trim() !== 'N/A' ? morningTimes[0].trim() : '-';
                            morningOut = morningTimes[1].trim() !== 'N/A' ? morningTimes[1].trim() : '-';
                          }
                        }
                        
                        // Extract afternoon times
                        if (timeParts.length > 1 && timeParts[1].includes('Afternoon:')) {
                          const afternoonTimes = timeParts[1].replace('Afternoon:', '').trim().split('-');
                          if (afternoonTimes.length === 2) {
                            afternoonIn = afternoonTimes[0].trim() !== 'N/A' ? afternoonTimes[0].trim() : '-';
                            afternoonOut = afternoonTimes[1].trim() !== 'N/A' ? afternoonTimes[1].trim() : '-';
                          }
                        }
                        
                        // Extract actual notes
                        if (noteParts.length > 1 && noteParts[1].includes('Notes:')) {
                          notes = noteParts[1].replace('Notes:', '').trim();
                        }
                      } else {
                        // Fallback for records that don't have the new format
                        notes = record.notes || '';
                      }
                      
                      return (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>
                            {record.employeeName || getEmployeeName(record.employeeId)}
                          </TableCell>
                          <TableCell>{morningIn}</TableCell>
                          <TableCell>{morningOut}</TableCell>
                          <TableCell>{afternoonIn}</TableCell>
                          <TableCell>{afternoonOut}</TableCell>
                          <TableCell>{getStatusChip(record.status)}</TableCell>
                          <TableCell>
                            {record.overtime ? `${record.overtime} hours` : '-'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              onClick={() => handleOpenDialog(record)}
                              sx={{ mr: 1 }}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="small" 
                              onClick={() => handleDelete(record.id)}
                              color="error"
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No attendance records found
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
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Attendance Overview
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Time Period</InputLabel>
                      <Select
                        value={reportPeriod}
                        label="Time Period"
                        onChange={handleReportPeriodChange}
                      >
                        <MenuItem value="today">Today</MenuItem>
                        <MenuItem value="thisWeek">This Week</MenuItem>
                        <MenuItem value="thisMonth">This Month</MenuItem>
                        <MenuItem value="lastMonth">Last Month</MenuItem>
                        <MenuItem value="last3Months">Last 3 Months</MenuItem>
                      </Select>
                    </FormControl>
                    
                    {/* Pie Chart for Status Distribution */}
                    <Box sx={{ height: 250, mt: 2 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={attendanceStats}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {attendanceStats.map((entry, index) => {
                              const color = 
                                entry.name === 'Present' ? CHART_COLORS.present :
                                entry.name === 'Absent' ? CHART_COLORS.absent :
                                entry.name === 'Late' ? CHART_COLORS.late :
                                entry.name === 'Half-day' ? CHART_COLORS.halfDay : 
                                CHART_COLORS.onLeave;
                              
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Pie>
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    
                    {/* Status Counts */}
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                        <Typography variant="body2">Present:</Typography>
                        <Chip 
                          label={`${attendanceRecords?.filter((r: Attendance) => r.status === 'Present').length || 0}`} 
                          color="success" 
                          size="small" 
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Absent:</Typography>
                        <Chip 
                          label={`${attendanceRecords?.filter((r: Attendance) => r.status === 'Absent').length || 0}`} 
                          color="error" 
                          size="small" 
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Late:</Typography>
                        <Chip 
                          label={`${attendanceRecords?.filter((r: Attendance) => r.status === 'Late').length || 0}`} 
                          color="warning" 
                          size="small" 
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Half-day:</Typography>
                        <Chip 
                          label={`${attendanceRecords?.filter((r: Attendance) => r.status === 'Half-day').length || 0}`} 
                          color="info" 
                          size="small" 
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">On Leave:</Typography>
                        <Chip 
                          label={`${attendanceRecords?.filter((r: Attendance) => r.status === 'On Leave').length || 0}`} 
                          color="default" 
                          size="small" 
                        />
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Attendance Trends
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {monthlyTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyTrends}
                          margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="displayDate" 
                            angle={-30} 
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="present" 
                            name="Present" 
                            stroke={CHART_COLORS.present} 
                            activeDot={{ r: 8 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="absent" 
                            name="Absent" 
                            stroke={CHART_COLORS.absent} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="late" 
                            name="Late" 
                            stroke={CHART_COLORS.late} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="halfDay" 
                            name="Half-day" 
                            stroke={CHART_COLORS.halfDay} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="onLeave" 
                            name="On Leave" 
                            stroke={CHART_COLORS.onLeave} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No data available for the selected period
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: '100%', mt: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Employee Attendance Rate
                  </Typography>
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Employee</strong></TableCell>
                          <TableCell><strong>Present Days</strong></TableCell>
                          <TableCell><strong>Absent Days</strong></TableCell>
                          <TableCell><strong>Attendance Rate</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {employees && employees.slice(0, 5).map((employee: any) => {
                          const employeeRecords = attendanceRecords?.filter((r: Attendance) => 
                            r.employeeId === Number(employee.id)
                          ) || [];
                          
                          const presentCount: number = employeeRecords.filter((r: Attendance) => 
                            r.status === 'Present' || r.status === 'Late'
                          ).length;
                          
                          const absentCount: number = employeeRecords.filter((r: Attendance) => 
                            r.status === 'Absent'
                          ).length;
                          
                          const attendanceRate = employeeRecords.length > 0 
                            ? Math.round((presentCount / employeeRecords.length) * 100) 
                            : 0;
                            
                          return (
                            <TableRow key={employee.id}>
                              <TableCell>{`${employee.firstName} ${employee.lastName}`}</TableCell>
                              <TableCell>{presentCount}</TableCell>
                              <TableCell>{absentCount}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: '60%', mr: 1 }}>
                                    <LinearProgress 
                                      variant="determinate" 
                                      value={attendanceRate} 
                                      color={attendanceRate > 70 ? "success" : attendanceRate > 50 ? "warning" : "error"}
                                    />
                                  </Box>
                                  <Typography variant="body2">{`${attendanceRate}%`}</Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: '100%', mt: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Monthly Overtime Summary
                  </Typography>
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Employee</strong></TableCell>
                          <TableCell><strong>Total Overtime</strong></TableCell>
                          <TableCell><strong>Days with Overtime (OT)</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {employees && employees.slice(0, 5).map((employee: any) => {
                          const employeeRecords = attendanceRecords?.filter((r: Attendance) => 
                            r.employeeId === Number(employee.id)
                          ) || [];
                          
                          const totalOvertime: number = employeeRecords.reduce((total: number, record: Attendance) => 
                            total + (record.overtime || 0), 0
                          );
                          
                          const daysWithOvertime: number = employeeRecords.filter((r: Attendance) => 
                            r.overtime && r.overtime > 0
                          ).length;
                            
                          return (
                            <TableRow key={employee.id}>
                              <TableCell>{`${employee.firstName} ${employee.lastName}`}</TableCell>
                              <TableCell>{`${totalOvertime} hours`}</TableCell>
                              <TableCell>{daysWithOvertime}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" color="primary">
                      Export Reports
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Button 
                        variant="outlined" 
                        fullWidth
                        startIcon={<DownloadIcon />}
                        onClick={exportAttendanceSummary}
                      >
                        Attendance Summary
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Button 
                        variant="outlined" 
                        fullWidth
                        startIcon={<DownloadIcon />}
                        onClick={exportEmployeeTimesheet}
                      >
                        Employee Timesheet
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Button 
                        variant="outlined" 
                        fullWidth
                        startIcon={<DownloadIcon />}
                        onClick={exportOvertimeReport}
                      >
                        Overtime Report
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* Add/Edit Attendance Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth={isBulkMode ? "lg" : "md"} fullWidth>
        <DialogTitle>
          {isBulkMode ? 'Bulk Attendance Entry' : (selectedAttendance ? 'Edit Attendance Record' : 'Add New Attendance Record')}
        </DialogTitle>
        
        <DialogContent>
          {isBulkMode ? (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ mb: 3, mt: 2 }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Attendance Date"
                      value={bulkDate}
                      onChange={handleBulkDateChange}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <FormControl size="small" sx={{ width: 200 }}>
                    <InputLabel>Preset Times</InputLabel>
                    <Select
                      value=""
                      label="Preset Times"
                      onChange={(e) => {
                        // Apply preset times to all present employees
                        const updatedData = [...bulkAttendanceData];
                        const presetValue = e.target.value as string;
                        
                        updatedData.forEach((row, idx) => {
                          if (row.present) {
                            if (presetValue === "standard") {
                              // Standard 8-hour shift (7am-12pm, 1pm-5pm)
                              const morningIn = new Date();
                              morningIn.setHours(7, 0, 0, 0);
                              
                              const morningOut = new Date();
                              morningOut.setHours(12, 0, 0, 0);
                              
                              const afternoonIn = new Date();
                              afternoonIn.setHours(13, 0, 0, 0);
                              
                              const afternoonOut = new Date();
                              afternoonOut.setHours(17, 0, 0, 0);
                              
                              updatedData[idx].morningTimeIn = morningIn;
                              updatedData[idx].morningTimeOut = morningOut;
                              updatedData[idx].afternoonTimeIn = afternoonIn;
                              updatedData[idx].afternoonTimeOut = afternoonOut;
                            }
                            else if (presetValue === "extended") {
                              // Extended 9-hour shift (7am-12pm, 1pm-6pm)
                              const morningIn = new Date();
                              morningIn.setHours(7, 0, 0, 0);
                              
                              const morningOut = new Date();
                              morningOut.setHours(12, 0, 0, 0);
                              
                              const afternoonIn = new Date();
                              afternoonIn.setHours(13, 0, 0, 0);
                              
                              const afternoonOut = new Date();
                              afternoonOut.setHours(18, 0, 0, 0);
                              
                              updatedData[idx].morningTimeIn = morningIn;
                              updatedData[idx].morningTimeOut = morningOut;
                              updatedData[idx].afternoonTimeIn = afternoonIn;
                              updatedData[idx].afternoonTimeOut = afternoonOut;
                            }
                            else if (presetValue === "late") {
                              // Late arrival shift (8am-12pm, 1pm-6pm)
                              const morningIn = new Date();
                              morningIn.setHours(8, 0, 0, 0);
                              
                              const morningOut = new Date();
                              morningOut.setHours(12, 0, 0, 0);
                              
                              const afternoonIn = new Date();
                              afternoonIn.setHours(13, 0, 0, 0);
                              
                              const afternoonOut = new Date();
                              afternoonOut.setHours(18, 0, 0, 0);
                              
                              updatedData[idx].morningTimeIn = morningIn;
                              updatedData[idx].morningTimeOut = morningOut;
                              updatedData[idx].afternoonTimeIn = afternoonIn;
                              updatedData[idx].afternoonTimeOut = afternoonOut;
                              updatedData[idx].status = "Late";
                            }
                          }
                        });
                        
                        setBulkAttendanceData(updatedData);
                      }}
                    >
                      <MenuItem value="">Select preset</MenuItem>
                      <MenuItem value="standard">Standard (7am-5pm)</MenuItem>
                      <MenuItem value="extended">Extended (7am-6pm)</MenuItem>
                      <MenuItem value="late">Late Arrival (8am-6pm)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <TableContainer sx={{ maxHeight: 500 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ minWidth: 150 }}><strong>Employee</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell colSpan={2} align="center" sx={{ bgcolor: 'rgba(0, 150, 136, 0.1)' }}>
                          <Typography variant="subtitle2" color="primary">Morning Session</Typography>
                        </TableCell>
                        <TableCell colSpan={2} align="center" sx={{ bgcolor: 'rgba(63, 81, 181, 0.1)' }}>
                          <Typography variant="subtitle2" color="primary">Afternoon Session</Typography>
                        </TableCell>
                        <TableCell><strong>OT (hrs)</strong></TableCell>
                        <TableCell><strong>Notes</strong></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(0, 150, 136, 0.05)' }}><strong>Time In</strong></TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(0, 150, 136, 0.05)' }}><strong>Time Out</strong></TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(63, 81, 181, 0.05)' }}><strong>Time In</strong></TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(63, 81, 181, 0.05)' }}><strong>Time Out</strong></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bulkAttendanceData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {row.employeeName}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select
                                value={row.status}
                                onChange={(e) => handleBulkInputChange(index, 'status', e.target.value)}
                                renderValue={(value) => (
                                  <Chip
                                    label={value}
                                    color={
                                      value === "Present" ? "success" : 
                                      value === "Late" ? "warning" : 
                                      value === "Half-day" ? "info" : 
                                      value === "Absent" ? "error" : "default"
                                    }
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              >
                                <MenuItem value="Present">Present</MenuItem>
                                <MenuItem value="Late">Late</MenuItem>
                                <MenuItem value="Half-day">Half-day</MenuItem>
                                <MenuItem value="Absent">Absent</MenuItem>
                                <MenuItem value="On Leave">On Leave</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell sx={{ bgcolor: 'rgba(0, 150, 136, 0.03)' }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                              <TimePicker
                                value={row.morningTimeIn}
                                onChange={(newTime) => handleBulkInputChange(index, 'morningTimeIn', newTime)}
                                disabled={row.status === 'Absent' || row.status === 'On Leave'}
                                slotProps={{ 
                                  textField: { 
                                    size: 'small',
                                    placeholder: '7:00 AM',
                                    sx: { width: '100%' }
                                  }
                                }}
                                ampm={true}
                              />
                            </LocalizationProvider>
                          </TableCell>
                          <TableCell sx={{ bgcolor: 'rgba(0, 150, 136, 0.03)' }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                              <TimePicker
                                value={row.morningTimeOut}
                                onChange={(newTime) => handleBulkInputChange(index, 'morningTimeOut', newTime)}
                                disabled={row.status === 'Absent' || row.status === 'On Leave'}
                                slotProps={{ 
                                  textField: { 
                                    size: 'small',
                                    placeholder: '12:00 PM',
                                    sx: { width: '100%' }
                                  } 
                                }}
                                ampm={true}
                              />
                            </LocalizationProvider>
                          </TableCell>
                          <TableCell sx={{ bgcolor: 'rgba(63, 81, 181, 0.03)' }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                              <TimePicker
                                value={row.afternoonTimeIn}
                                onChange={(newTime) => handleBulkInputChange(index, 'afternoonTimeIn', newTime)}
                                disabled={row.status === 'Absent' || row.status === 'On Leave'}
                                slotProps={{ 
                                  textField: { 
                                    size: 'small',
                                    placeholder: '1:00 PM',
                                    sx: { width: '100%' }
                                  } 
                                }}
                                ampm={true}
                              />
                            </LocalizationProvider>
                          </TableCell>
                          <TableCell sx={{ bgcolor: 'rgba(63, 81, 181, 0.03)' }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                              <TimePicker
                                value={row.afternoonTimeOut}
                                onChange={(newTime) => handleBulkInputChange(index, 'afternoonTimeOut', newTime)}
                                disabled={row.status === 'Absent' || row.status === 'On Leave'}
                                slotProps={{ 
                                  textField: { 
                                    size: 'small',
                                    placeholder: '6:00 PM',
                                    sx: { width: '100%' }
                                  } 
                                }}
                                ampm={true}
                              />
                            </LocalizationProvider>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={row.overtime || 0}
                              onChange={(e) => handleBulkInputChange(index, 'overtime', Number(e.target.value))}
                              disabled={row.status === 'Absent' || row.status === 'On Leave'}
                              size="small"
                              sx={{ width: 60 }}
                              InputProps={{
                                inputProps: { min: 0, max: 12 }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              value={row.notes}
                              onChange={(e) => handleBulkInputChange(index, 'notes', e.target.value)}
                              size="small"
                              placeholder="Optional notes"
                              sx={{ minWidth: 120 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          ) : (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="employee-label">Employee</InputLabel>
                  <Select
                    labelId="employee-label"
                    name="employeeId"
                    value={formData.employeeId}
                    label="Employee"
                    onChange={handleSelectChange}
                    required
                  >
                    {employees && employees.length > 0 ? 
                      employees
                        .filter((emp: any) => emp.status !== 'Inactive')
                        .map((employee: any) => (
                          <MenuItem key={employee.id} value={employee.id}>
                            {`${employee.firstName} ${employee.lastName}`}
                          </MenuItem>
                        )) : 
                      <MenuItem disabled>No employees available</MenuItem>
                    }
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Attendance Date"
                    value={formData.date}
                    onChange={handleDateChange}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    name="status"
                    value={formData.status}
                    label="Status"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="Present">Present</MenuItem>
                    <MenuItem value="Absent">Absent</MenuItem>
                    <MenuItem value="Late">Late</MenuItem>
                    <MenuItem value="Half-day">Half-day</MenuItem>
                    <MenuItem value="On Leave">On Leave</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  name="overtime"
                  label="Overtime Hours"
                  type="number"
                  fullWidth
                  value={formData.overtime === null ? '' : formData.overtime}
                  onChange={handleInputChange}
                  disabled={formData.status === 'Absent' || formData.status === 'On Leave'}
                  InputProps={{
                    inputProps: { min: 0, max: 12 }
                  }}
                />
              </Grid>
              
              {/* Morning Attendance Card */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Morning Attendance
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <TimePicker
                            label="Morning Time In"
                            value={formData.morningTimeIn}
                            onChange={handleTimeChange('morningTimeIn')}
                            disabled={formData.status === 'Absent' || formData.status === 'On Leave'}
                            slotProps={{ 
                              textField: { 
                                fullWidth: true,
                                size: "small",
                              } 
                            }}
                            ampm={true}
                          />
                        </LocalizationProvider>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <TimePicker
                            label="Morning Time Out"
                            value={formData.morningTimeOut}
                            onChange={handleTimeChange('morningTimeOut')}
                            disabled={formData.status === 'Absent' || formData.status === 'On Leave'}
                            slotProps={{ 
                              textField: { 
                                fullWidth: true,
                                size: "small",
                              } 
                            }}
                            ampm={true}
                          />
                        </LocalizationProvider>
                      </Grid>
                      
                      {formData.morningTimeIn && formData.morningTimeOut && (
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Morning Duration:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {formData.morningTimeIn && formData.morningTimeOut ? 
                                `${Math.round((formData.morningTimeOut.getTime() - formData.morningTimeIn.getTime()) / (1000 * 60 * 60) * 10) / 10} hours` : 
                                '-'}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Afternoon Attendance Card */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Afternoon Attendance
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <TimePicker
                            label="Afternoon Time In"
                            value={formData.afternoonTimeIn}
                            onChange={handleTimeChange('afternoonTimeIn')}
                            disabled={formData.status === 'Absent' || formData.status === 'On Leave'}
                            slotProps={{ 
                              textField: { 
                                fullWidth: true,
                                size: "small",
                              } 
                            }}
                            ampm={true}
                          />
                        </LocalizationProvider>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <TimePicker
                            label="Afternoon Time Out"
                            value={formData.afternoonTimeOut}
                            onChange={handleTimeChange('afternoonTimeOut')}
                            disabled={formData.status === 'Absent' || formData.status === 'On Leave'}
                            slotProps={{ 
                              textField: { 
                                fullWidth: true,
                                size: "small",
                              } 
                            }}
                            ampm={true}
                          />
                        </LocalizationProvider>
                      </Grid>
                      
                      {formData.afternoonTimeIn && formData.afternoonTimeOut && (
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Afternoon Duration:
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {formData.afternoonTimeIn && formData.afternoonTimeOut ? 
                                `${Math.round((formData.afternoonTimeOut.getTime() - formData.afternoonTimeIn.getTime()) / (1000 * 60 * 60) * 10) / 10} hours` : 
                                '-'}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Total Hours Summary */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ mb: 2, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Total Working Hours:
                      </Typography>
                      <Typography variant="subtitle1" fontWeight="bold" color="primary">
                        {(() => {
                          let totalHours = 0;
                          
                          // Add morning hours if both in and out are set
                          if (formData.morningTimeIn && formData.morningTimeOut) {
                            totalHours += (formData.morningTimeOut.getTime() - formData.morningTimeIn.getTime()) / (1000 * 60 * 60);
                          }
                          
                          // Add afternoon hours if both in and out are set
                          if (formData.afternoonTimeIn && formData.afternoonTimeOut) {
                            totalHours += (formData.afternoonTimeOut.getTime() - formData.afternoonTimeIn.getTime()) / (1000 * 60 * 60);
                          }
                          
                          return totalHours > 0 ? `${Math.round(totalHours * 10) / 10} hours` : '-';
                        })()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="notes"
                  label="Notes"
                  multiline
                  rows={3}
                  fullWidth
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any notes about this attendance record"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
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

export default AttendanceLists;