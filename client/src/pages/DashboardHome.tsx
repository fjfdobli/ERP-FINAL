import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { fetchOrders } from '../redux/slices/ordersSlice';
import { fetchClients } from '../redux/slices/clientsSlice';
import { fetchInventory, fetchLowStockItems } from '../redux/slices/inventorySlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { fetchAttendance } from '../redux/slices/attendanceSlice';
import { fetchPayrolls } from '../redux/slices/payrollSlice';
import { fetchMachinery, fetchMachineryStats } from '../redux/slices/machinerySlice';
import { fetchSuppliers } from '../redux/slices/suppliersSlice';
import { fetchOrderRequests } from '../redux/slices/orderRequestSlice';
import { fetchSupplierOrders } from '../redux/slices/orderSupplierSlice';
import { fetchTechnicians } from '../redux/slices/techniciansSlice';
import { fetchProducts } from '../redux/slices/productProfileSlice';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isToday, isBefore } from 'date-fns';
import { 
  Box, Grid, Paper, Typography, Divider, List, ListItem, ListItemText, Card, CardContent, 
  CardHeader, Avatar, IconButton, Button, Chip, useTheme, LinearProgress, Alert,
  Stack, Badge, Tabs, Tab, ListItemAvatar, ListItemButton, Menu, MenuItem, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Skeleton, Link, Snackbar, Slide, Fade, Rating, Tooltip, Backdrop, AvatarGroup
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MuiTooltip, { TooltipProps } from '@mui/material/Tooltip';

import { 
  Assignment as OrdersIcon, People as ClientsIcon, People as PeopleIcon, Inventory as InventoryIcon, 
  Warning as WarningIcon, TrendingUp as TrendingUpIcon, MoreVert as MoreVertIcon, ChevronRight as ChevronRightIcon, 
  Circle as CircleIcon, CalendarMonth as CalendarIcon, Paid as PaidIcon, Build as BuildIcon, 
  Construction as ConstructionIcon, ShoppingCart as ShoppingCartIcon, Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon, PriorityHigh as PriorityHighIcon, Refresh as RefreshIcon, 
  DashboardCustomize as DashboardCustomizeIcon, FilterAlt as FilterAltIcon, DateRange as DateRangeIcon, 
  RequestQuote as RequestIcon, Sync as SyncIcon, Engineering as EngineeringIcon, Star as StarIcon,
  Print as PrintIcon, Category as CategoryIcon, LocalPrintshop as LocalPrintshopIcon, 
  HourglassEmpty as HourglassEmptyIcon, Assignment as AssignmentIcon
} from '@mui/icons-material';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Create a custom Tooltip component that wraps disabled buttons in a span
const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <MuiTooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  popper: {
    zIndex: theme.zIndex.tooltip,
  },
}));

// Custom Tooltip wrapper that handles disabled buttons correctly
const CustomTooltip = ({ children, ...props }: TooltipProps) => {
  // Type assertion for React element props with disabled property
  interface DisabledProps {
    disabled?: boolean;
    'aria-disabled'?: boolean;
  }
  
  const isDisabled = React.isValidElement(children) && 
                    ((children.props as DisabledProps).disabled || 
                     (children.props as DisabledProps)['aria-disabled'] === true);

  // If button is disabled, wrap it in a span to allow tooltip to work
  return (
    <StyledTooltip {...props}>
      {isDisabled ? (
        <span style={{ display: 'inline-block' }}>
          {children}
        </span>
      ) : (
        children
      )}
    </StyledTooltip>
  );
};

// Interface definitions
interface Order {
  id: string;
  orderId: string;
  clientId: string;
  client?: {
    name: string;
  };
  title: string;
  description?: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  createdAt?: string;
  updatedAt?: string;
}

interface InventoryItem {
  id: number;
  itemName: string;
  itemType: string;
  quantity: number;
  minStockLevel: number;
  sku?: string;
  unitPrice?: number | null;
  supplierId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface Notification {
  id: string;
  type: 'order' | 'inventory' | 'machinery' | 'payroll' | 'employee' | 'supplier';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface ChangeDetection {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  module: string;
}

// TabPanel component for tabbed interface
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Utility functions
const getStatusColor = (status: string): "success" | "info" | "warning" | "error" | "default" => {
  switch (status) {
    case 'Completed':
      return 'success';
    case 'In Progress':
      return 'info';
    case 'Pending':
      return 'warning';
    case 'Cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Generate real notifications based on actual data
const generateRealNotifications = (
  lowStockItems: any[],
  pendingOrders: number,
  pendingRequests: number,
  machinesNeedingMaintenance: number
): Notification[] => {
  const notifications: Notification[] = [];
  
  // Add low stock notifications
  if (lowStockItems.length > 0) {
    notifications.push({
      id: `inventory-${Date.now()}`,
      type: 'inventory',
      title: 'Low Stock Alert',
      message: `${lowStockItems.length} inventory item(s) are below minimum stock levels`,
      severity: 'warning',
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: '/inventory'
    });
  }
  
  // Add pending orders notifications
  if (pendingOrders > 0) {
    notifications.push({
      id: `orders-${Date.now()}`,
      type: 'order',
      title: 'Pending Orders',
      message: `${pendingOrders} order(s) are pending processing`,
      severity: 'info',
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: '/orders'
    });
  }
  
  // Add pending order requests notifications
  if (pendingRequests > 0) {
    notifications.push({
      id: `requests-${Date.now()}`,
      type: 'order',
      title: 'Order Requests',
      message: `${pendingRequests} order request(s) need review`,
      severity: 'info',
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: '/order-requests'
    });
  }
  
  // Add machinery maintenance notifications
  if (machinesNeedingMaintenance > 0) {
    notifications.push({
      id: `machinery-${Date.now()}`,
      type: 'machinery',
      title: 'Maintenance Due',
      message: `${machinesNeedingMaintenance} machine(s) require scheduled maintenance`,
      severity: 'warning',
      timestamp: new Date().toISOString(),
      read: false,
      actionUrl: '/machinery'
    });
  }
  
  return notifications;
};

const DashboardHome: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Redux state
  const { clientOrders: orders, error: ordersError } = useAppSelector(state => state.orders);
  const ordersLoading = useAppSelector(state => state.orders.loading || false);
  const { items: clients, error: clientsError } = useAppSelector(state => state.clients);
  const { inventoryItems, isLoading: inventoryLoading, error: inventoryError } = useAppSelector(state => state.inventory);
  const { employees, isLoading: employeesLoading } = useAppSelector(state => state.employees);
  const { attendanceRecords, isLoading: attendanceLoading } = useAppSelector(state => state.attendance || { attendanceRecords: [], isLoading: false });
  const { payrollRecords, isLoading: payrollLoading } = useAppSelector(state => state.payroll || { payrollRecords: [], isLoading: false });
  const { machinery, machineryStats, isLoading: machineryLoading } = useAppSelector(state => state.machinery || { machinery: [], machineryStats: null, isLoading: false });
  const suppliersState = useAppSelector(state => state.suppliers);
  const suppliers = suppliersState?.items || [];
  const suppliersLoading = suppliersState?.status === 'loading' || false;
  const { orderRequests, loading: orderRequestsLoading } = useAppSelector(state => state.orderRequest || { orderRequests: [], loading: false });
  const { supplierOrders, isLoading: supplierOrdersLoading } = useAppSelector(state => state.orderSupplier || { supplierOrders: [], isLoading: false });
  const { technicians, isLoading: techniciansLoading } = useAppSelector(state => state.technicians || { technicians: [], isLoading: false });
  const { products, isLoading: productsLoading } = useAppSelector(state => state.productProfile || { products: [], isLoading: false });
  
  // Local state
  const [tabValue, setTabValue] = useState(0);
  const [activeTimeFilter, setActiveTimeFilter] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsMenuAnchor, setNotificationsMenuAnchor] = useState<null | HTMLElement>(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [refreshIntervalMenuAnchor, setRefreshIntervalMenuAnchor] = useState<null | HTMLElement>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(60000); // 60 seconds default
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [toast, setToast] = useState<{open: boolean; message: string; type: 'success' | 'info' | 'warning' | 'error'}>({
    open: false,
    message: '',
    type: 'info'
  });
  
  // Calculate dashboard metrics - using useMemo for performance optimization
  // Calculate low stock items
  const lowStockItems = useMemo(() => {
    return inventoryItems?.filter((item: any) => item.quantity <= (item.minStockLevel || 0)) || [];
  }, [inventoryItems]);

  const dashboardMetrics = useMemo(() => {
    // Order metrics
    const pendingOrders: number = (orders || []).filter((order: any) => order.status === 'Pending').length;
    const inProgressOrders: number = (orders || []).filter((order: any) => order.status === 'In Progress').length;
    const completedOrders: number = (orders || []).filter((order: any) => order.status === 'Completed').length;
    const cancelledOrders: number = (orders || []).filter((order: any) => order.status === 'Cancelled').length;
    
    // Order request metrics
    const pendingRequests = (orderRequests || []).filter((req: any) => req.status === 'Pending').length;
    const approvedRequests = (orderRequests || []).filter((req: any) => req.status === 'Approved').length;
    const rejectedRequests = (orderRequests || []).filter((req: any) => req.status === 'Rejected').length;
    
    // Financial metrics
    const totalRevenue: number = (orders || []).reduce((sum: number, order: any) => sum + (order.amount || 0), 0);
    const outstandingRevenue: number = (orders || []).reduce((sum: number, order: any) => {
      const total = order.amount || 0;
      const paid = order.amountPaid || 0;
      return sum + (total - paid);
    }, 0);
    const currentMonthRevenue: number = (orders || [])
      .filter((order: any) => {
      if (!order.created_at) return false;
      const orderDate: Date = new Date(order.created_at);
      const currentMonth: number = new Date().getMonth();
      const currentYear: number = new Date().getFullYear();
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      })
      .reduce((sum: number, order: any) => sum + (order.amount || 0), 0);
      
    // Resource metrics
    const totalEmployees = employees?.length || 0;
    const totalPayroll = (payrollRecords || []).reduce((sum, record: any) => sum + (record.netSalary || 0), 0);
    const totalInventoryItems = inventoryItems?.length || 0;
    const totalLowStockItems = lowStockItems.length || 0;
    const totalMachinery = machinery?.length || 0;
    const totalSuppliers = suppliers?.length || 0;
    const totalClients = clients?.length || 0;
    
    // Maintenance metrics
    const machinesNeedingMaintenance = (machinery || []).filter((machine: any) => {
      if (!machine.nextMaintenanceDate) return false;
      const today = new Date();
      const nextMaintenanceDate = new Date(machine.nextMaintenanceDate);
      return nextMaintenanceDate <= today;
    }).length;
    
    // Attendance metrics
    const todayAttendanceCount = (attendanceRecords || []).filter((record: any) => {
      if (!record.date) return false;
      try {
        const recordDate = new Date(record.date);
        return isToday(recordDate);
      } catch (e) {
        return false;
      }
    }).length;
    
    return {
      pendingOrders, inProgressOrders, completedOrders, cancelledOrders, pendingRequests,
      approvedRequests, rejectedRequests, totalRevenue, outstandingRevenue, currentMonthRevenue,
      totalEmployees, totalPayroll, totalInventoryItems, totalLowStockItems, totalMachinery,
      totalSuppliers, totalClients, machinesNeedingMaintenance, todayAttendanceCount
    };
  }, [orders, orderRequests, employees, payrollRecords, inventoryItems, machinery, suppliers, clients, attendanceRecords]);
  
  const unreadNotificationsCount = notifications.filter(notification => !notification.read).length;

  // Get sorted lists for display - using useMemo for better performance
  const recentOrders = useMemo(() => {
    return [...(orders || [])].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 5);
  }, [orders]);
  
  const recentOrderRequests = useMemo(() => {
    return [...(orderRequests || [])].sort((a: any, b: any) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 5);
  }, [orderRequests]);
  
  const latestAttendance = useMemo(() => {
    return [...(attendanceRecords || [])].sort((a: any, b: any) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 5);
  }, [attendanceRecords]);

  const upcomingMaintenances = useMemo(() => {
    return [...(machinery || [])].filter((machine: any) => machine.nextMaintenanceDate)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.nextMaintenanceDate).getTime();
        const dateB = new Date(b.nextMaintenanceDate).getTime();
        return dateA - dateB;
      }).slice(0, 5);
  }, [machinery]);

  // Effect to fetch data - use React.useCallback to memoize the fetch function
  const fetchDashboardData = React.useCallback(async (silent: boolean = false) => {
    if (!silent) {
      setRefreshing(true);
    }
    
    try {
      // Get date range for queries
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const startDate = format(startOfMonth(subMonths(new Date(), 3)), 'yyyy-MM-dd');
      
      // Fetch data for all systems using Promise.all for parallel fetching
      await Promise.all([
        dispatch(fetchOrders()),
        dispatch(fetchClients()),
        dispatch(fetchInventory()),
        dispatch(fetchLowStockItems()),
        dispatch(fetchEmployees()),
        dispatch(fetchAttendance({ startDate, endDate })),
        dispatch(fetchPayrolls({ startDate, endDate })),
        dispatch(fetchMachinery({})),
        dispatch(fetchMachineryStats()),
        dispatch(fetchSuppliers()),
        dispatch(fetchOrderRequests()),
        dispatch(fetchSupplierOrders()),
        dispatch(fetchTechnicians({})),
        dispatch(fetchProducts())
      ]);
      
      // Log timestamp for monitoring refresh activity
      const currentTime = new Date();
      console.log(`Dashboard data refreshed at ${currentTime.toLocaleTimeString()}`);
      
      // Update last refresh time
      setLastUpdateTime(currentTime);
      
      // Show toast notification for silent updates
      if (silent) {
        setToast({
          open: true,
          message: 'Dashboard updated with latest data',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  }, [dispatch]);

  // Effect to fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  // Effect for auto-refresh functionality
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefreshEnabled) {
      intervalId = setInterval(() => {
        fetchDashboardData(true); // Silent refresh to avoid showing loading indicators
      }, refreshInterval);
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchDashboardData, autoRefreshEnabled, refreshInterval]);
  
  // Track previous state for comparison between refreshes
  const [prevState, setPrevState] = useState({
    lowStockItems: 0,
    pendingOrders: 0,
    pendingRequests: 0,
    machinesMaintenance: 0
  });
  
  // Calculate metrics
  const metrics = useMemo(() => {
    if (inventoryLoading || ordersLoading || orderRequestsLoading || machineryLoading) {
      return null; // Don't calculate metrics while data is loading
    }
    
    const pendingOrdersCount = (orders || []).filter((order: any) => order.status === 'Pending').length;
    const pendingRequestsCount = (orderRequests || []).filter((req: any) => req.status === 'Pending').length;
    const machinesNeedingMaintenanceCount = (machinery || []).filter((machine: any) => {
      if (!machine.nextMaintenanceDate) return false;
      const today = new Date();
      const nextMaintenanceDate = new Date(machine.nextMaintenanceDate);
      return nextMaintenanceDate <= today;
    }).length;
    const currentLowStockCount = lowStockItems.length;
    
    return {
      pendingOrders: pendingOrdersCount,
      pendingRequests: pendingRequestsCount,
      machinesMaintenance: machinesNeedingMaintenanceCount,
      lowStockItems: currentLowStockCount
    };
  }, [lowStockItems, orders, orderRequests, machinery, inventoryLoading, ordersLoading, orderRequestsLoading, machineryLoading]);
  
  // Generate notifications based on current data
  const notificationsData = useMemo(() => {
    if (!metrics) return null;
    
    return generateRealNotifications(
      lowStockItems,
      metrics.pendingOrders,
      metrics.pendingRequests,
      metrics.machinesMaintenance
    );
  }, [metrics, lowStockItems]);
  
  // Detect changes and show notifications
  useEffect(() => {
    if (!metrics || !metrics.lowStockItems) return;
    
    const changesDetected: ChangeDetection[] = [];
    
    // Check for inventory changes
    if (prevState.lowStockItems !== metrics.lowStockItems && prevState.lowStockItems > 0) {
      // Only show if there was a change and we had previous data
      const difference = prevState.lowStockItems - metrics.lowStockItems;
      if (difference !== 0) {
        const message = difference > 0 
          ? `${difference} item(s) are no longer low in stock`
          : `${Math.abs(difference)} new item(s) are now low in stock`;
        
        changesDetected.push({
          message,
          type: difference > 0 ? 'success' : 'warning',
          module: 'inventory'
        });
      }
    }
    
    // Check for pending orders changes
    if (prevState.pendingOrders !== metrics.pendingOrders && prevState.pendingOrders > 0) {
      const difference = prevState.pendingOrders - metrics.pendingOrders;
      if (difference !== 0) {
        const message = difference > 0 
          ? `${difference} order(s) no longer pending`
          : `${Math.abs(difference)} new pending order(s)`;
        
        changesDetected.push({
          message,
          type: difference > 0 ? 'success' : 'info',
          module: 'orders'
        });
      }
    }
    
    // Check for pending requests changes
    if (prevState.pendingRequests !== metrics.pendingRequests && prevState.pendingRequests > 0) {
      const difference = prevState.pendingRequests - metrics.pendingRequests;
      if (difference !== 0) {
        const message = difference > 0 
          ? `${difference} request(s) no longer pending`
          : `${Math.abs(difference)} new pending request(s)`;
        
        changesDetected.push({
          message,
          type: difference > 0 ? 'success' : 'info',
          module: 'requests'
        });
      }
    }
    
    // Check for machinery maintenance changes
    if (prevState.machinesMaintenance !== metrics.machinesMaintenance && prevState.machinesMaintenance > 0) {
      const difference = prevState.machinesMaintenance - metrics.machinesMaintenance;
      if (difference !== 0) {
        const message = difference > 0 
          ? `${difference} machine(s) no longer need maintenance`
          : `${Math.abs(difference)} new machine(s) need maintenance`;
        
        changesDetected.push({
          message,
          type: difference > 0 ? 'success' : 'warning',
          module: 'machinery'
        });
      }
    }
    
    // Show toast notification for the most significant change
    if (changesDetected.length > 0) {
      // Sort changes by priority (warnings first, then success, then info)
      const sortedChanges = changesDetected.sort((a, b) => {
        const priorityMap: Record<string, number> = { warning: 3, error: 2, success: 1, info: 0 };
        return priorityMap[b.type as string] - priorityMap[a.type as string];
      });
      
      // If multiple changes, summarize them
      if (sortedChanges.length > 1) {
        setToast({
          open: true,
          message: `${sortedChanges.length} modules updated with changes`,
          type: 'info'
        });
      } else {
        // Show the single change
        const change: ChangeDetection = sortedChanges[0];
        setToast({
          open: true,
          message: change.message,
          type: change.type
        });
      }
    }
    
    // Update previous state for next comparison
    setPrevState({
      lowStockItems: metrics.lowStockItems,
      pendingOrders: metrics.pendingOrders,
      pendingRequests: metrics.pendingRequests,
      machinesMaintenance: metrics.machinesMaintenance
    });
  }, [metrics]);
  
  // Update notifications when notificationsData changes
  useEffect(() => {
    if (notificationsData) {
      setNotifications(notificationsData);
    }
  }, [notificationsData]);

  // Handlers for UI interactions
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleTimeFilterChange = (filter: 'week' | 'month' | 'quarter' | 'year') => {
    setActiveTimeFilter(filter);
    setFilterMenuAnchor(null);
  };
  
  const handleRefresh = React.useCallback(() => {
    // Always trigger a visible refresh when manually clicked
    fetchDashboardData(false);
  }, [fetchDashboardData]);
  
  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsMenuAnchor(event.currentTarget);
  };
  
  const handleNotificationClose = () => {
    setNotificationsMenuAnchor(null);
  };
  
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setFilterMenuAnchor(null);
  };
  
  const markAllNotificationsAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
    handleNotificationClose();
  };

  const handleNotificationAction = (notification: Notification) => {
    // Mark as read
    setNotifications(notifications.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    ));
    
    // Navigate to the action URL if provided
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    
    handleNotificationClose();
  };

  // Chart data preparation - using multiple separate useMemos for better performance
  
  // Order status data - only depends on order metrics
  const orderStatusData = useMemo(() => [
    { name: 'Pending', value: dashboardMetrics.pendingOrders, color: theme.palette.warning.main },
    { name: 'In Progress', value: dashboardMetrics.inProgressOrders, color: theme.palette.info.main },
    { name: 'Completed', value: dashboardMetrics.completedOrders, color: theme.palette.success.main },
    { name: 'Cancelled', value: dashboardMetrics.cancelledOrders, color: theme.palette.error.main },
  ].filter(item => item.value > 0), [dashboardMetrics.pendingOrders, 
    dashboardMetrics.inProgressOrders, 
    dashboardMetrics.completedOrders, 
    dashboardMetrics.cancelledOrders,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.success.main,
    theme.palette.error.main]);
  
  // Order request status data - only depends on request metrics
  const orderRequestStatusData = useMemo(() => [
    { name: 'Pending', value: dashboardMetrics.pendingRequests, color: theme.palette.warning.main },
    { name: 'Approved', value: dashboardMetrics.approvedRequests, color: theme.palette.success.main },
    { name: 'Rejected', value: dashboardMetrics.rejectedRequests, color: theme.palette.error.main },
  ].filter(item => item.value > 0), [dashboardMetrics.pendingRequests, 
    dashboardMetrics.approvedRequests, 
    dashboardMetrics.rejectedRequests,
    theme.palette.warning.main,
    theme.palette.success.main,
    theme.palette.error.main]);

  // Monthly revenue and expense data - using real order data
  const monthlyRevenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    // Initialize the result array with zero values
    const result = Array.from({ length: 6 }, (_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      return {
        name: months[monthIndex],
        revenue: 0,
        expenses: 0,
        payrollExpenses: 0,
        supplierOrderExpenses: 0
      };
    });
    
    // Populate with real data from client orders (revenue)
    if (orders && orders.length > 0) {
      // Group by month and calculate revenue
      orders.forEach((order: any) => {
        if (!order.created_at) return;
        
        const orderDate = new Date(order.created_at);
        const orderMonth = orderDate.getMonth();
        const orderYear = orderDate.getFullYear();
        const currentYear = new Date().getFullYear();
        
        // Only consider orders from the last 6 months
        for (let i = 0; i < 6; i++) {
          const monthIndex = (currentMonth - 5 + i + 12) % 12;
          const yearOffset = monthIndex > currentMonth ? -1 : 0;
          
          if (orderMonth === monthIndex && orderYear === currentYear + yearOffset) {
            result[i].revenue += (order.amount || 0);
            break;
          }
        }
      });
    }
    
    // Add supplier orders as expenses (purchase orders)
    if (supplierOrders && supplierOrders.length > 0) {
      supplierOrders.forEach((order: any) => {
        if (!order.date) return;
        
        const orderDate = new Date(order.date);
        const orderMonth = orderDate.getMonth();
        const orderYear = orderDate.getFullYear();
        const currentYear = new Date().getFullYear();
        
        // Only consider orders from the last 6 months
        for (let i = 0; i < 6; i++) {
          const monthIndex = (currentMonth - 5 + i + 12) % 12;
          const yearOffset = monthIndex > currentMonth ? -1 : 0;
          
          if (orderMonth === monthIndex && orderYear === currentYear + yearOffset) {
            result[i].supplierOrderExpenses += (order.total_amount || 0);
            result[i].expenses += (order.total_amount || 0);
            break;
          }
        }
      });
    }
    
    // Add payroll expenses
    if (payrollRecords && payrollRecords.length > 0) {
      payrollRecords.forEach((record: any) => {
        if (!record.startDate || !record.endDate) return;
        
        // Use the end date of the payroll period
        const payrollDate = new Date(record.endDate);
        const payrollMonth = payrollDate.getMonth();
        const payrollYear = payrollDate.getFullYear();
        const currentYear = new Date().getFullYear();
        
        // Only consider payroll from the last 6 months
        for (let i = 0; i < 6; i++) {
          const monthIndex = (currentMonth - 5 + i + 12) % 12;
          const yearOffset = monthIndex > currentMonth ? -1 : 0;
          
          if (payrollMonth === monthIndex && payrollYear === currentYear + yearOffset) {
            result[i].payrollExpenses += (record.netSalary || 0);
            result[i].expenses += (record.netSalary || 0);
            break;
          }
        }
      });
    }
    
    return result;
  }, [orders, supplierOrders, payrollRecords]);

  // Real chart data based on actual data
  const realChartData = useMemo(() => {
    // Inventory category data - using real categories from inventory
    const inventoryCategoryData = inventoryItems ? (() => {
      // Group inventory items by type and count quantities
      const categoryMap: Record<string, number> = {};
      inventoryItems.forEach((item: any) => {
        const type = item.itemType || 'Other';
        categoryMap[type] = (categoryMap[type] || 0) + item.quantity;
      });
      
      // Convert to array format needed for chart
      const colors = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#ffc658', '#ff8042'];
      return Object.entries(categoryMap).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }));
    })() : [];
    
    // Suppliers activity data - using real suppliers data
    const suppliersActivityData = suppliers ? (() => {
      // Use the real suppliers to generate a performance radar chart
      // For this example, generating some metrics based on supplier data
      const supplierMetrics = [
        { name: 'Products', fullMark: 150 },
        { name: 'Delivery Time', fullMark: 150 },
        { name: 'Quality', fullMark: 150 },
        { name: 'Price', fullMark: 150 },
        { name: 'Service', fullMark: 150 },
        { name: 'Reliability', fullMark: 150 }
      ];
      
      // Return the metrics with 2 suppliers (if available) for comparison
      // Using supplier IDs as a seed for consistent pseudo-random values
      return supplierMetrics.map(metric => {
        const result: any = { name: metric.name, fullMark: metric.fullMark };
        
        // Add data for up to 2 suppliers for comparison
        suppliers.slice(0, 2).forEach((supplier: any, index: number) => {
          // Generate a pseudo-random value based on supplier ID and metric name
          const seed = supplier.id + metric.name.length;
          const randomValue = () => {
            const x = Math.sin(seed) * 10000;
            return 70 + Math.floor((x - Math.floor(x)) * 60); // Value between 70-130
          };
          
          result[index === 0 ? 'a' : 'b'] = randomValue();
        });
        
        return result;
      });
    })() : [];

    // Employee attendance data - using real attendance records
    const employeeAttendanceData = attendanceRecords ? (() => {
      // Sort attendance records by date (newest first)
      const sortedRecords = [...attendanceRecords].sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      // Group by date and count attendance status
      const dateGroups: Record<string, { present: number, absent: number, late: number }> = {};
      sortedRecords.forEach((record: any) => {
        if (!record.date) return;
        
        const dateStr = new Date(record.date).toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit' 
        });
        
        if (!dateGroups[dateStr]) {
          dateGroups[dateStr] = { present: 0, absent: 0, late: 0 };
        }
        
        if (record.status === 'Present') {
          dateGroups[dateStr].present++;
        } else if (record.status === 'Absent') {
          dateGroups[dateStr].absent++;
        } else if (record.status === 'Late') {
          dateGroups[dateStr].late++;
        }
      });
      
      // Get the 5 most recent dates with attendance records
      return Object.entries(dateGroups)
        .map(([date, counts]) => ({ date, ...counts }))
        .slice(0, 5)
        .reverse(); // Reverse to show oldest first for time series chart
    })() : [];

    // Maintenance cost data - using real maintenance records
    const maintenanceCostData = machinery ? (() => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      
      // Initialize with the last 6 months
      const result = Array.from({ length: 6 }, (_, i) => {
        const monthIndex = (currentMonth - 5 + i + 12) % 12;
        return {
          month: months[monthIndex],
          cost: 0
        };
      });
      
      // Sum maintenance costs from records
      // Note: In a real app we would use maintenanceRecords, but for this example
      // We'll generate costs based on machinery data
      machinery.forEach((machine: any) => {
        if (!machine.lastMaintenanceDate) return;
        
        const maintDate = new Date(machine.lastMaintenanceDate);
        const maintMonth = maintDate.getMonth();
        const maintYear = maintDate.getFullYear();
        const currentYear = new Date().getFullYear();
        
        // If maintenance was in the last 6 months, add a cost
        for (let i = 0; i < 6; i++) {
          const monthIndex = (currentMonth - 5 + i + 12) % 12;
          const yearOffset = monthIndex > currentMonth ? -1 : 0;
          
          if (maintMonth === monthIndex && maintYear === currentYear + yearOffset) {
            // Generate a maintenance cost based on machine purchase price or a default value
            const baseCost = machine.purchasePrice ? machine.purchasePrice * 0.05 : 5000;
            result[i].cost += baseCost;
            break;
          }
        }
      });
      
      return result;
    })() : [];

    // Payroll distribution data - using real payroll records
    const payrollDistributionData = payrollRecords ? (() => {
      // Calculate total values for each component
      let totalBaseSalary = 0;
      let totalOvertimePay = 0;
      let totalBonus = 0;
      let totalDeductions = 0;
      
      payrollRecords.forEach((record: any) => {
        totalBaseSalary += record.baseSalary || 0;
        totalOvertimePay += record.overtimePay || 0;
        totalBonus += record.bonus || 0;
        totalDeductions += record.deductions || 0;
      });
      
      // Create data for the pie chart
      return [
        { name: 'Base Salary', value: totalBaseSalary, color: '#0088FE' },
        { name: 'Overtime', value: totalOvertimePay, color: '#00C49F' },
        { name: 'Bonuses', value: totalBonus, color: '#FFBB28' },
        { name: 'Deductions', value: totalDeductions, color: '#FF8042' }
      ].filter(item => item.value > 0); // Only include components with values
    })() : [];
    
    // Department distribution data - using real employee records
    const departmentDistributionData = employees ? (() => {
      // Group employees by department
      const deptCount: Record<string, number> = {};
      employees.forEach((emp: any) => {
        const dept = emp.department || 'Other';
        deptCount[dept] = (deptCount[dept] || 0) + 1;
      });
      
      // Convert to chart data format
      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#83a6ed'];
      return Object.entries(deptCount).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }));
    })() : [];
    
    // Machinery status data
    const machineryStatusData = machinery ? (() => {
      // Count machines by status
      const statusCount: Record<string, number> = {};
      machinery.forEach((machine: any) => {
        const status = machine.status || 'Unknown';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      
      // Convert to chart data format with colors
      const statusColors: Record<string, string> = {
        'Operational': '#4caf50',
        'Maintenance': '#ff9800', 
        'Repair': '#f44336',
        'Offline': '#9e9e9e',
        'Retired': '#607d8b'
      };
      
      return Object.entries(statusCount).map(([name, value]) => ({
        name,
        value,
        color: statusColors[name] || '#9e9e9e'
      }));
    })() : [];
    
    return {
      inventoryCategoryData,
      suppliersActivityData,
      employeeAttendanceData,
      maintenanceCostData,
      payrollDistributionData,
      departmentDistributionData,
      machineryStatusData
    };
  }, [inventoryItems, suppliers, attendanceRecords, machinery, payrollRecords, employees]);

  // Combine all chart data
  const chartData = useMemo(() => ({
    orderStatusData,
    orderRequestStatusData,
    monthlyRevenueData,
    ...realChartData
  }), [orderStatusData, orderRequestStatusData, monthlyRevenueData, realChartData]);

  // Handle toast close
  const handleToastClose = () => {
    setToast({ ...toast, open: false });
  };

  return (
    <Box>
      {/* Toast notification for background updates */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={Slide}
      >
        <Alert 
          onClose={handleToastClose} 
          severity={toast.type} 
          variant="filled"
          sx={{ 
            width: '100%',
            alignItems: 'center',
            boxShadow: 3
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
      
      {/* Header with title, welcome message, and action buttons */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          mb: 4,
          pb: 3,
          borderBottom: '1px solid rgba(25, 118, 210, 0.1)',
          position: 'relative'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              fontSize: { xs: '1.75rem', sm: '2.25rem' },
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}
          >
            <PrintIcon 
              sx={{ 
                fontSize: { xs: '2rem', sm: '2.5rem' },
                bgcolor: 'primary.main',
                color: 'white',
                p: 0.8,
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)'
              }}
            />
            Dashboard
          </Typography>

          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' }
          }}>
            <Typography 
              variant="body1" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '1rem',
                fontWeight: 500,
                mb: { xs: 1.5, sm: 0 }
              }}
            >
              Welcome back! Here's an overview of your printing business performance.
            </Typography>
            
            <Stack 
              direction="row" 
              spacing={1.5} 
              sx={{ 
                ml: { xs: 0, sm: 2 },
                mt: { xs: 1, sm: 0 }
              }}
            >
              {autoRefreshEnabled && (
                <Chip 
                  size="small"
                  label={`Auto-refresh: ${refreshInterval/1000}s`}
                  color="primary"
                  icon={<SyncIcon fontSize="small" />}
                  sx={{ 
                    height: 28,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    animation: autoRefreshEnabled ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': { opacity: 0.8 },
                      '50%': { opacity: 1 },
                      '100%': { opacity: 0.8 }
                    },
                    bgcolor: 'rgba(25, 118, 210, 0.15)',
                    border: '1px solid rgba(25, 118, 210, 0.3)',
                    '& .MuiChip-icon': {
                      color: 'primary.main'
                    },
                    color: 'primary.main'
                  }}
                />
              )}
              
              {lastUpdateTime && (
                <Chip
                  size="small"
                  label={`Last updated: ${lastUpdateTime.toLocaleTimeString()}`}
                  variant="outlined"
                  icon={<RefreshIcon fontSize="small" />}
                  sx={{ 
                    height: 28,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                    bgcolor: 'rgba(0, 0, 0, 0.02)'
                  }}
                />
              )}
            </Stack>
          </Box>
        </Box>
        
        <Stack 
          direction="row" 
          spacing={1}
          sx={{
            '& .MuiIconButton-root': {
              transition: 'all 0.2s ease',
              borderRadius: 2,
              bgcolor: 'rgba(25, 118, 210, 0.05)',
              border: '1px solid rgba(25, 118, 210, 0.1)',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }
            }
          }}
        >
          <CustomTooltip title="Filter Data">
            <IconButton 
              onClick={handleFilterClick}
              sx={{ padding: 1.2 }}
            >
              <FilterAltIcon fontSize="small" />
            </IconButton>
          </CustomTooltip>
          
          <Menu
            anchorEl={filterMenuAnchor}
            open={Boolean(filterMenuAnchor)}
            onClose={handleFilterClose}
          >
            <MenuItem 
              onClick={() => handleTimeFilterChange('week')}
              selected={activeTimeFilter === 'week'}
            >
              Last Week
            </MenuItem>
            <MenuItem 
              onClick={() => handleTimeFilterChange('month')}
              selected={activeTimeFilter === 'month'}
            >
              Last Month
            </MenuItem>
            <MenuItem 
              onClick={() => handleTimeFilterChange('quarter')}
              selected={activeTimeFilter === 'quarter'}
            >
              Last Quarter
            </MenuItem>
            <MenuItem 
              onClick={() => handleTimeFilterChange('year')}
              selected={activeTimeFilter === 'year'}
            >
              Last Year
            </MenuItem>
          </Menu>
          
          <Badge 
            badgeContent={unreadNotificationsCount} 
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.6rem',
                height: '18px',
                minWidth: '18px',
                top: 8,
                right: 8,
                padding: '0 4px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
              }
            }}
          >
            <IconButton 
              onClick={handleNotificationClick}
              sx={{ padding: 1.2 }}
            >
              <NotificationsIcon fontSize="small" />
            </IconButton>
          </Badge>
          
          <Menu
            anchorEl={notificationsMenuAnchor}
            open={Boolean(notificationsMenuAnchor)}
            onClose={handleNotificationClose}
            PaperProps={{
              elevation: 3,
              sx: {
                maxHeight: 400,
                width: 360,
                overflow: 'visible',
                borderRadius: 2,
                mt: 1,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                '&::before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                  borderLeft: '1px solid rgba(0, 0, 0, 0.06)',
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box 
              sx={{ 
                px: 2.5, 
                py: 1.5, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                background: 'linear-gradient(to right, rgba(25, 118, 210, 0.05), rgba(25, 118, 210, 0.01))',
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2
              }}
            >
              <Typography 
                variant="subtitle1" 
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <NotificationsIcon fontSize="small" />
                Notifications
              </Typography>
              <Button 
                size="small" 
                onClick={markAllNotificationsAsRead}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
                  }
                }}
              >
                Mark all as read
              </Button>
            </Box>
            <Divider sx={{ m: 0 }} />
            {notifications.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No notifications
                </Typography>
              </Box>
            ) : (
              notifications.map((notification) => (
                <MenuItem 
                  key={notification.id} 
                  onClick={() => handleNotificationAction(notification)}
                  sx={{ 
                    py: 1.5,
                    backgroundColor: notification.read ? 'transparent' : 'action.hover',
                    borderLeft: notification.read ? 'none' : `4px solid ${theme.palette[notification.severity].main}`,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette[notification.severity].light }}>
                      {notification.severity === 'warning' && <WarningIcon color="warning" />}
                      {notification.severity === 'error' && <PriorityHighIcon color="error" />}
                      {notification.severity === 'info' && <NotificationsIcon color="info" />}
                      {notification.severity === 'success' && <CheckCircleIcon color="success" />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <Typography variant="body1" fontWeight={notification.read ? 'regular' : 'bold'}>
                        {notification.title}
                      </Typography>
                    }
                    secondary={
                      <Typography component="div">
                        <div>{notification.message}</div>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {formatDate(notification.timestamp)}
                        </Typography>
                      </Typography>
                    }
                  />
                </MenuItem>
              ))
            )}
          </Menu>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CustomTooltip title={autoRefreshEnabled ? "Auto-refresh enabled (click to disable)" : "Auto-refresh disabled (click to enable)"}>
              <IconButton 
                onClick={() => {
                  const newState = !autoRefreshEnabled;
                  setAutoRefreshEnabled(newState);
                  setToast({
                    open: true,
                    message: newState ? 'Auto-refresh enabled' : 'Auto-refresh disabled',
                    type: newState ? 'success' : 'info'
                  });
                }}
                color={autoRefreshEnabled ? "primary" : "default"}
                sx={{ 
                  mr: 0.5,
                  opacity: autoRefreshEnabled ? 1 : 0.5,
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <DashboardCustomizeIcon fontSize="small" />
              </IconButton>
            </CustomTooltip>
            
            {autoRefreshEnabled && (
              <>
                <CustomTooltip title="Change refresh interval">
                  <IconButton 
                    onClick={(e) => {
                      // Use a different anchor element for refresh menu
                      const element = e.currentTarget;
                      setRefreshIntervalMenuAnchor(element);
                    }}
                    size="small"
                    sx={{ mx: 0.5 }}
                  >
                    <DateRangeIcon fontSize="small" />
                  </IconButton>
                </CustomTooltip>
                
                <Menu
                  anchorEl={refreshIntervalMenuAnchor}
                  open={Boolean(refreshIntervalMenuAnchor)}
                  onClose={() => setRefreshIntervalMenuAnchor(null)}
                >
                  <MenuItem 
                    onClick={() => { 
                      setRefreshInterval(30000); 
                      setRefreshIntervalMenuAnchor(null);
                      setToast({
                        open: true,
                        message: 'Auto-refresh set to 30 seconds',
                        type: 'info'
                      });
                    }}
                    selected={refreshInterval === 30000}
                  >
                    Every 30 seconds
                  </MenuItem>
                  <MenuItem 
                    onClick={() => { 
                      setRefreshInterval(60000); 
                      setRefreshIntervalMenuAnchor(null);
                      setToast({
                        open: true,
                        message: 'Auto-refresh set to 1 minute',
                        type: 'info'
                      });
                    }}
                    selected={refreshInterval === 60000}
                  >
                    Every minute
                  </MenuItem>
                  <MenuItem 
                    onClick={() => { 
                      setRefreshInterval(300000); 
                      setRefreshIntervalMenuAnchor(null);
                      setToast({
                        open: true,
                        message: 'Auto-refresh set to 5 minutes',
                        type: 'info'
                      });
                    }}
                    selected={refreshInterval === 300000}
                  >
                    Every 5 minutes
                  </MenuItem>
                </Menu>
              </>
            )}
            
            <CustomTooltip title="Refresh now">
              <span>
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? (
                    <CircularProgress size={24} />
                  ) : (
                    <RefreshIcon />
                  )}
                </IconButton>
              </span>
            </CustomTooltip>
          </Box>
        </Stack>
      </Box>

      {/* Tabs for different dashboard sections */}
      <Paper sx={{ 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(25, 118, 210, 0.1)',
        mb: 4,
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(to right, rgba(25, 118, 210, 0.03), rgba(25, 118, 210, 0.01))'
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{
            style: {
              height: '3px',
              borderRadius: '3px',
              background: 'linear-gradient(90deg, #1565C0, #1976D2, #1E88E5)'
            }
          }}
          sx={{ 
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            '& .MuiTab-root': {
              minHeight: 56,
              fontWeight: 500,
              textTransform: 'none',
              letterSpacing: 0.3,
              fontSize: '0.95rem',
              opacity: 0.7,
              '&.Mui-selected': {
                opacity: 1,
                color: 'primary.main',
                fontWeight: 600
              },
              '&:hover': {
                opacity: 0.9,
                color: 'primary.main',
                backgroundColor: 'rgba(25, 118, 210, 0.04)'  
              },
            },
            px: 1
          }}
        >
          <Tab icon={<DashboardCustomizeIcon />} label="Overview" />
          <Tab icon={<OrdersIcon />} label="Orders & Clients" />
          <Tab icon={<InventoryIcon />} label="Inventory & Suppliers" />
          <Tab icon={<PeopleIcon />} label="Employees & Payroll" />
          <Tab icon={<BuildIcon />} label="Machinery" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Monthly Revenue Chart */}
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%', 
                  borderRadius: 3,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                  border: '1px solid rgba(25, 118, 210, 0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  overflow: 'hidden',
                  '&:hover': {
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
                    transform: 'translateY(-4px)'
                  },
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #1565C0, #1976D2, #1E88E5)',
                  }
                }}
              >
                <CardHeader
                  title={
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      fontSize: '1.1rem',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <TrendingUpIcon fontSize="small" /> Revenue vs Expenses
                    </Typography>
                  }
                  subheader={
                    <Typography variant="body2" sx={{ 
                      color: 'text.secondary',
                      fontSize: '0.85rem',
                      mt: 0.5
                    }}>
                      Monthly comparison
                    </Typography>
                  }
                  action={
                    <Tooltip title="Refresh data">
                      <IconButton 
                        size="small" 
                        onClick={handleRefresh}
                        sx={{ 
                          bgcolor: 'rgba(25, 118, 210, 0.08)',
                          '&:hover': {
                            bgcolor: 'rgba(25, 118, 210, 0.15)',
                          }
                        }}
                      >
                        <RefreshIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                  }
                  sx={{
                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                    background: 'linear-gradient(to right, rgba(25, 118, 210, 0.04), rgba(25, 118, 210, 0.01))',
                    pb: 1.5
                  }}
                />
                <CardContent sx={{ pt: 2 }}>
                  {refreshing ? (
                    <Box sx={{ 
                      height: 300, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" color="text.secondary">
                        Loading chart data...
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      height: 300,
                      pt: 1,
                      px: 1,
                      borderRadius: 2,
                      bgcolor: 'rgba(25, 118, 210, 0.02)'
                    }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData.monthlyRevenueData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: 'rgba(0, 0, 0, 0.7)', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
                            tickLine={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
                          />
                          <YAxis 
                            tickFormatter={(value) => `₱${value/1000}k`} 
                            tick={{ fill: 'rgba(0, 0, 0, 0.7)', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
                            tickLine={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
                          />
                          <RechartsTooltip 
                            formatter={(value) => formatCurrency(Number(value))}
                            contentStyle={{ 
                              borderRadius: '8px', 
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              border: 'none'
                            }}
                          />
                          <Legend 
                            iconType="circle" 
                            iconSize={10}
                            wrapperStyle={{ 
                              paddingTop: 15, 
                              fontSize: '12px' 
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stackId="1"
                            stroke={theme.palette.success.main} 
                            fill={theme.palette.success.light} 
                            name="Revenue"
                            strokeWidth={2}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="expenses" 
                            stackId="2"
                            stroke={theme.palette.error.main} 
                            fill={theme.palette.error.light} 
                            name="Expenses"
                            strokeWidth={2}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Order Status Pie Chart */}
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%', 
                  borderRadius: 3,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                  border: '1px solid rgba(25, 118, 210, 0.1)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  overflow: 'hidden',
                  '&:hover': {
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
                    transform: 'translateY(-4px)'
                  },
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #1565C0, #1976D2, #1E88E5)',
                  }
                }}
              >
                <CardHeader
                  title={
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      fontSize: '1.1rem',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <OrdersIcon fontSize="small" /> Order Status
                    </Typography>
                  }
                  subheader={
                    <Typography variant="body2" sx={{ 
                      color: 'text.secondary',
                      fontSize: '0.85rem',
                      mt: 0.5
                    }}>
                      Distribution of orders by status
                    </Typography>
                  }
                  action={
                    <Tooltip title="Refresh data">
                      <IconButton 
                        size="small" 
                        onClick={handleRefresh}
                        sx={{ 
                          bgcolor: 'rgba(25, 118, 210, 0.08)',
                          '&:hover': {
                            bgcolor: 'rgba(25, 118, 210, 0.15)',
                          }
                        }}
                      >
                        <RefreshIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                  }
                  sx={{
                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                    background: 'linear-gradient(to right, rgba(25, 118, 210, 0.04), rgba(25, 118, 210, 0.01))',
                    pb: 1.5
                  }}
                />
                <CardContent sx={{ pt: 2 }}>
                  {ordersLoading || refreshing ? (
                    <Box sx={{ 
                      height: 300, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" color="text.secondary">
                        Loading order data...
                      </Typography>
                    </Box>
                  ) : (chartData.orderStatusData.length === 0) ? (
                    <Box sx={{ 
                      height: 300, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexDirection: 'column',
                      bgcolor: 'rgba(25, 118, 210, 0.02)',
                      borderRadius: 2,
                      p: 3
                    }}>
                      <OrdersIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2, opacity: 0.7 }} />
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                        No orders found
                      </Typography>
                      <Button 
                        variant="contained" 
                        size="small" 
                        onClick={() => navigate('/orders/clients')}
                        sx={{
                          borderRadius: 2,
                          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                          px: 2,
                          py: 1,
                          textTransform: 'none',
                          fontWeight: 500
                        }}
                      >
                        Create New Order
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      height: 300, 
                      display: 'flex', 
                      justifyContent: 'center',
                      pt: 1,
                      px: 1,
                      borderRadius: 2,
                      bgcolor: 'rgba(25, 118, 210, 0.02)'
                    }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.orderStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {chartData.orderStatusData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color} 
                                stroke="rgba(255,255,255,0.5)"
                                strokeWidth={1}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => `${value} orders`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Recent Orders */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader
                  title="Recent Orders"
                  action={
                    <Button 
                      variant="outlined" 
                      endIcon={<ChevronRightIcon />}
                      onClick={() => navigate('/orders/clients')}
                      size="small"
                      color="primary"
                    >
                      View All
                    </Button>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  {ordersLoading ? (
                    <Box sx={{ py: 3 }}>
                      {[0, 1, 2].map((index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 1.5, px: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="60%" height={24} />
                            <Skeleton variant="text" width="80%" height={20} />
                          </Box>
                          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                        </Box>
                      ))}
                    </Box>
                  ) : ordersError ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        {process.env.NODE_ENV === 'development' 
                          ? 'API not available in development mode' 
                          : 'Could not load order data'}
                      </Typography>
                    </Box>
                  ) : recentOrders.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No orders found
                      </Typography>
                      <Button 
                        variant="contained" 
                        size="small" 
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/orders/clients')}
                      >
                        Create New Order
                      </Button>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {recentOrders.map((order) => (
                        <ListItemButton 
                          key={order.id}
                          onClick={() => navigate(`/orders/${order.id}`)}
                          sx={{ px: 0 }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body1" fontWeight="medium">
                                  {order.order_id}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={order.status}
                                  color={getStatusColor(order.status)}
                                  sx={{ ml: 1, minWidth: 90 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography component="div" variant="body2">
                                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap' }}>
                                  <span>{order.clients?.name || 'Unknown Client'} • </span>
                                  <span style={{ marginLeft: '4px' }}>{formatCurrency(order.amount || 0)}</span>
                                  <span style={{ marginLeft: '4px' }}>• {formatDate(order.created_at)}</span>
                                </Box>
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Recent Order Requests */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader
                  title="Recent Order Requests"
                  action={
                    <Button 
                      variant="outlined" 
                      endIcon={<ChevronRightIcon />}
                      onClick={() => navigate('/orders/requests')}
                      size="small"
                      color="warning"
                    >
                      View All
                    </Button>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  {orderRequestsLoading ? (
                    <Box sx={{ py: 3 }}>
                      {[0, 1, 2].map((index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 1.5, px: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="60%" height={24} />
                            <Skeleton variant="text" width="80%" height={20} />
                          </Box>
                          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                        </Box>
                      ))}
                    </Box>
                  ) : orderRequests?.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No order requests found
                      </Typography>
                      <Button 
                        variant="contained" 
                        color="warning"
                        size="small" 
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/orders/requests')}
                      >
                        Create Request
                      </Button>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {recentOrderRequests.map((request: any) => (
                        <ListItemButton 
                          key={request.id}
                          onClick={() => navigate(`/orders/requests/${request.id}`)}
                          sx={{ px: 0 }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body1" fontWeight="medium">
                                  {request.request_id || `Request #${request.id}`}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={request.status}
                                  color={
                                    request.status === 'Approved' ? 'success' :
                                    request.status === 'Rejected' ? 'error' : 'warning'
                                  }
                                  sx={{ ml: 1, minWidth: 90 }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography component="div" variant="body2">
                                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap' }}>
                                  <span>{request.clients?.name || 'Unknown Client'} • </span>
                                  <span style={{ marginLeft: '4px' }}>{formatCurrency(request.total_amount || 0)}</span>
                                  <span style={{ marginLeft: '4px' }}>• {formatDate(request.created_at)}</span>
                                </Box>
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Low Stock Items */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader
                  title="Low Stock Items"
                  action={
                    <Button 
                      variant="outlined" 
                      endIcon={<ChevronRightIcon />}
                      onClick={() => navigate('/inventory')}
                      size="small"
                      color="error"
                    >
                      View All
                    </Button>
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  {inventoryLoading ? (
                    <Box sx={{ py: 3 }}>
                      {[0, 1, 2].map((index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', py: 1.5, px: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="60%" height={24} />
                            <Skeleton variant="text" width="80%" height={20} />
                          </Box>
                          <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                        </Box>
                      ))}
                    </Box>
                  ) : inventoryError ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        {process.env.NODE_ENV === 'development' 
                          ? 'API not available in development mode' 
                          : 'Could not load inventory data'}
                      </Typography>
                    </Box>
                  ) : !lowStockItems || lowStockItems.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        All inventory items are at adequate stock levels
                      </Alert>
                      <Button 
                        variant="contained" 
                        size="small" 
                        color="primary"
                        onClick={() => navigate('/inventory')}
                      >
                        View Inventory
                      </Button>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {lowStockItems.slice(0, 5).map((item: any) => (
                      <ListItemButton 
                        key={item.id}
                        onClick={() => navigate(`/inventory/${item.id}`)}
                        sx={{ px: 0 }}
                      >
                        <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CircleIcon sx={{ fontSize: 12, mr: 1, color: 'error.main' }} />
                          <Typography variant="body1" fontWeight="medium">
                            {item.itemName}
                          </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography component="div" variant="body2">
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                              <span>Current: {item.quantity} • Min: {item.minStockLevel}</span>
                              <span style={{ marginLeft: '8px', fontWeight: 500, color: theme.palette.error.main }}>
                                • Restock needed
                              </span>
                            </Box>
                          </Typography>
                        }
                        />
                      </ListItemButton>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Supplier Performance */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader
                  title="Supplier Performance"
                  action={
                    <Button 
                      variant="outlined" 
                      endIcon={<ChevronRightIcon />}
                      onClick={() => navigate('/suppliers')}
                      size="small"
                    >
                      View All
                    </Button>
                  }
                />
                <CardContent>
                  {suppliersLoading ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : suppliers?.length === 0 ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                        No suppliers found
                      </Typography>
                      <Button 
                        variant="contained" 
                        size="small" 
                        onClick={() => navigate('/suppliers')}
                      >
                        Add Suppliers
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart 
                          outerRadius={100} 
                          width={500} 
                          height={300} 
                          data={chartData.suppliersActivityData}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" />
                          <PolarRadiusAxis angle={30} domain={[0, 150]} />
                          <Radar 
                            name="Paper Supplier" 
                            dataKey="a" 
                            stroke={theme.palette.primary.main} 
                            fill={theme.palette.primary.main} 
                            fillOpacity={0.6} 
                          />
                          <Radar 
                            name="Ink Supplier" 
                            dataKey="b" 
                            stroke={theme.palette.secondary.main} 
                            fill={theme.palette.secondary.main} 
                            fillOpacity={0.6} 
                          />
                          <Legend />
                          <RechartsTooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Orders & Clients Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* Order Status Distribution */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Order Status Distribution" 
                  action={
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  }
                />
                <CardContent>
                  {ordersLoading || refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.orderStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.orderStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => `${value} orders`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Order Request Status */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Order Request Status" 
                  action={
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  }
                />
                <CardContent>
                  {orderRequestsLoading || refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.orderRequestStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.orderRequestStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => `${value} requests`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly Revenue */}
            <Grid item xs={12} md={12}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Monthly Revenue" 
                  action={
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  }
                />
                <CardContent>
                  {refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData.monthlyRevenueData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `₱${value/1000}k`} />
                          <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke={theme.palette.primary.main} 
                            activeDot={{ r: 8 }}
                            name="Revenue"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="expenses" 
                            stroke={theme.palette.error.main}
                            name="Expenses"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Orders List */}
            <Grid item xs={12}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Recent Orders" 
                  action={
                    <Button 
                      variant="contained" 
                      color="primary"
                      size="small"
                      onClick={() => navigate('/orders')}
                    >
                      View All Orders
                    </Button>
                  }
                />
                <CardContent>
                  {ordersLoading ? (
                    <LinearProgress />
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Order ID</TableCell>
                            <TableCell>Client</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {recentOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>{order.order_id}</TableCell>
                              <TableCell>{order.clients?.name || 'Unknown'}</TableCell>
                              <TableCell>{formatDate(order.created_at)}</TableCell>
                              <TableCell>{formatCurrency(order.amount || 0)}</TableCell>
                              <TableCell>
                                <Chip
                                  label={order.status}
                                  color={getStatusColor(order.status)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Button 
                                  size="small" 
                                  variant="text"
                                  onClick={() => navigate(`/orders/${order.id}`)}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Inventory & Suppliers Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {/* Inventory Category Distribution */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Inventory Category Distribution" 
                  action={
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  }
                />
                <CardContent>
                  {inventoryLoading || refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.inventoryCategoryData}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.inventoryCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Low Stock Items */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Low Stock Items" 
                  action={
                    <Button 
                      variant="contained" 
                      color="error"
                      size="small"
                      onClick={() => navigate('/inventory')}
                    >
                      View All
                    </Button>
                  }
                />
                <CardContent>
                  {inventoryLoading ? (
                    <LinearProgress />
                  ) : lowStockItems && lowStockItems.length > 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Item Name</TableCell>
                            <TableCell>Current Stock</TableCell>
                            <TableCell>Min Level</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                            {lowStockItems.slice(0, 5).map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.itemName}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.minStockLevel}</TableCell>
                              <TableCell>
                              <Chip
                                label="Low Stock"
                                color="error"
                                size="small"
                              />
                              </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="success">All inventory items are at adequate stock levels.</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Suppliers Overview */}
            <Grid item xs={12}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Suppliers Performance Comparison" 
                  action={
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate('/suppliers')}
                    >
                      View All Suppliers
                    </Button>
                  }
                />
                <CardContent>
                  {suppliersLoading || refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : suppliers?.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        No supplier data available
                      </Typography>
                      <Button 
                        variant="contained" 
                        size="small" 
                        onClick={() => navigate('/suppliers')}
                      >
                        Add Suppliers
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart 
                          outerRadius={90} 
                          width={500} 
                          height={300} 
                          data={chartData.suppliersActivityData}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" />
                          <PolarRadiusAxis angle={30} domain={[0, 150]} />
                          {suppliers && suppliers.length > 0 && (
                            <Radar 
                              name={suppliers[0]?.name || 'Supplier 1'} 
                              dataKey="a" 
                              stroke={theme.palette.primary.main} 
                              fill={theme.palette.primary.main} 
                              fillOpacity={0.6} 
                            />
                          )}
                          {suppliers && suppliers.length > 1 && (
                            <Radar 
                              name={suppliers[1]?.name || 'Supplier 2'} 
                              dataKey="b" 
                              stroke={theme.palette.secondary.main} 
                              fill={theme.palette.secondary.main} 
                              fillOpacity={0.6} 
                            />
                          )}
                          <Legend />
                          <RechartsTooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Employees & Payroll Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            {/* Employee Attendance */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Employee Attendance (Last 5 Days)" 
                  action={
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  }
                />
                <CardContent>
                  {attendanceLoading || refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData.employeeAttendanceData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey="present" stackId="a" fill="#4CAF50" name="Present" />
                          <Bar dataKey="late" stackId="a" fill="#FFC107" name="Late" />
                          <Bar dataKey="absent" stackId="a" fill="#F44336" name="Absent" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Payroll Distribution */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Payroll Distribution" 
                  action={
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  }
                />
                <CardContent>
                  {payrollLoading || refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.payrollDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.payrollDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Attendance */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Recent Attendance" 
                  action={
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={() => navigate('/attendance')}
                    >
                      View All
                    </Button>
                  }
                />
                <CardContent>
                  {attendanceLoading ? (
                    <LinearProgress />
                  ) : latestAttendance && latestAttendance.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Employee</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Time In</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {latestAttendance.map((record: any) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.employeeName || `Employee #${record.employeeId}`}</TableCell>
                              <TableCell>{formatDate(record.date)}</TableCell>
                              <TableCell>{record.timeIn || 'N/A'}</TableCell>
                              <TableCell>
                                <Chip
                                  label={record.status || 'Present'}
                                  color={record.status === 'Absent' ? 'error' : record.status === 'Late' ? 'warning' : 'success'}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">No recent attendance records found.</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Department Distribution */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader title="Department Distribution" />
                <CardContent>
                  {employeesLoading || refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        {chartData.departmentDistributionData && chartData.departmentDistributionData.length > 0 ? (
                          <PieChart>
                            <Pie
                              data={chartData.departmentDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {chartData.departmentDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                          </PieChart>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography variant="body1" color="text.secondary">
                              No department data available
                            </Typography>
                          </Box>
                        )}
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Machinery Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            {/* Maintenance Costs */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Maintenance Costs (Last 6 Months)" 
                  action={
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  }
                />
                <CardContent>
                  {machineryLoading || refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData.maintenanceCostData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => `₱${value/1000}k`} />
                          <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Bar dataKey="cost" fill="#FF9800" name="Maintenance Cost" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Machinery Status */}
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Machinery Status" 
                  action={
                    <IconButton size="small" onClick={handleRefresh}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  }
                />
                <CardContent>
                  {machineryLoading || refreshing ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData.machineryStatusData}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {chartData.machineryStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Upcoming Maintenance */}
            <Grid item xs={12}>
              <Card sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <CardHeader 
                  title="Upcoming Maintenance" 
                  action={
                    <Button 
                      variant="contained" 
                      color="warning"
                      size="small"
                      onClick={() => navigate('/machinery')}
                    >
                      View All
                    </Button>
                  }
                />
                <CardContent>
                  {machineryLoading ? (
                    <LinearProgress />
                  ) : upcomingMaintenances && upcomingMaintenances.length > 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Machine Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Last Maintenance</TableCell>
                            <TableCell>Next Maintenance</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {upcomingMaintenances.map((machine: any) => {
                            const nextMaintenanceDate = new Date(machine.nextMaintenanceDate);
                            const today = new Date();
                            const daysUntilMaintenance = Math.ceil((nextMaintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            
                            let status = 'Scheduled';
                            let statusColor: "success" | "warning" | "error" = 'success';
                            
                            if (daysUntilMaintenance <= 0) {
                              status = 'Overdue';
                              statusColor = 'error';
                            } else if (daysUntilMaintenance <= 7) {
                              status = 'Due Soon';
                              statusColor = 'warning';
                            }
                            
                            return (
                              <TableRow key={machine.id}>
                                <TableCell>{machine.name}</TableCell>
                                <TableCell>{machine.type}</TableCell>
                                <TableCell>{formatDate(machine.lastMaintenanceDate)}</TableCell>
                                <TableCell>{formatDate(machine.nextMaintenanceDate)}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={status}
                                    color={statusColor}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="success">No upcoming maintenance required.</Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default DashboardHome;