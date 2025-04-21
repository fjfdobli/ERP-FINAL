import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, InputAdornment, CircularProgress, Grid, Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, Card, CardContent, CardHeader, Divider, List, ListItem, ListItemText, Chip, Tabs, Tab, IconButton, Tooltip } from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Download as DownloadIcon, PictureAsPdf as PdfIcon, InsertDriveFile as ExcelIcon, Dashboard as DashboardIcon, ReceiptLong as ReceiptIcon, Description as ReportIcon, CalendarMonth as CalendarIcon, ShoppingCart as OrdersIcon, Inventory as InventoryIcon, People as PeopleIcon, Build as BuildIcon, AttachMoney as MoneyIcon, Visibility as ViewIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { format as formatDate, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, formatDistance, isWithinInterval, isAfter, isBefore } from 'date-fns';
import { fetchPayrolls } from '../redux/slices/payrollSlice';
import { fetchEmployees } from '../redux/slices/employeesSlice';
import { fetchInventory } from '../redux/slices/inventorySlice';
import { fetchClientOrders } from '../redux/slices/clientOrdersSlice';
import { fetchClients } from '../redux/slices/clientsSlice';
import { fetchSuppliers } from '../redux/slices/suppliersSlice';
import { fetchMachinery, fetchMachineryStats, fetchMaintenanceRecords } from '../redux/slices/machinerySlice';
import { fetchAttendance } from '../redux/slices/attendanceSlice';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

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
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
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

// Report templates and document interfaces
interface ReportFilter {
  startDate: Date;
  endDate: Date;
  type: string;
  format: 'pdf' | 'excel' | 'csv';
  employeeId?: number | 'all';
  clientId?: number | 'all';
  supplierId?: number | 'all';
  status?: string | 'all';
}

// Create a wrapper for format function to avoid collision with 'format' property 
const formatFunc = (date: Date | number, formatStr: string) => {
  // When using format inside a function that uses the 'format' parameter
  // we need to make sure we're using the date-fns function, not the parameter
  return formatDate(date, formatStr);
};

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  availableFormats: ('pdf' | 'excel' | 'csv')[];
  generateReport: (
    data: any, 
    format: 'pdf' | 'excel' | 'csv', 
    startDate: Date, 
    endDate: Date,
    filters?: any
  ) => void;
  extraFilters?: string[];
}

interface ReportTemplate {
  title: string;
  subtitle: string;
  headerFields: string[];
  footerText: string;
  logo?: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }[];
}

const ReportsList: React.FC = () => {
  const dispatch = useAppDispatch();
  const payrollState = useAppSelector((state) => state.payroll || {});
  const employeesState = useAppSelector((state) => state.employees || {});
  const clientsState = useAppSelector((state) => state.clients || {});
  const suppliersState = useAppSelector((state) => state.suppliers || {});
  const inventoryState = useAppSelector((state) => state.inventory || {});
  const clientOrdersState = useAppSelector((state) => state.orders || {});
  const machineryState = useAppSelector((state) => state.machinery || {});
  const attendanceState = useAppSelector((state) => state.attendance || {});
  
  const [loading, setLoading] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState(0);
  const [reportFilters, setReportFilters] = useState<ReportFilter>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    type: 'all',
    format: 'pdf',
    employeeId: 'all',
    clientId: 'all',
    supplierId: 'all',
    status: 'all'
  });
  
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Common templates
  const commonTemplate: ReportTemplate = {
    title: "Printing Press ERP",
    subtitle: "Generated Report",
    headerFields: [],
    footerText: "© Printing Press ERP System. This is a system-generated report."
  };

  // Document generation utilities
  const generatePDF = (
    data: any[],
    columns: { header: string, dataKey: string }[],
    title: string,
    subtitle: string = '',
    orientation: 'portrait' | 'landscape' = 'portrait'
  ): jsPDF => {
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const pageHeight = orientation === 'portrait' ? 297 : 210;
    
    // Add company header with logo placeholder
    // Top border
    doc.setDrawColor(41, 128, 185); // Blue border
    doc.setLineWidth(1);
    doc.line(10, 10, pageWidth - 10, 10);
    
    // Company name and logo
    doc.setFillColor(245, 245, 245); // Light gray background
    doc.rect(10, 11, pageWidth - 20, 20, 'F');
    
    // // Logo placeholder
    // doc.setDrawColor(200, 200, 200);
    // doc.setFillColor(240, 240, 240);
    // doc.roundedRect(15, 13, 15, 15, 1, 1, 'FD');
    
    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(51, 51, 51);
    doc.text('Opzons Printers', 15, 21);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('197 Kalantas St, Phase V, Hillside Subd, Bajada, Davao City • 2344716 • opzonprinters@yahoo.com.ph', 15, 26);
    
    // Report title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text(title, pageWidth / 2, 40, { align: 'center' });
    
    // Report subtitle with date information
    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitle, pageWidth / 2, 46, { align: 'center' });
    }
    
    // Add date range in a box
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(pageWidth / 2 - 50, 48, 100, 10, 2, 2, 'F');
    
    const dateRange = `Period: ${formatDate(reportFilters.startDate, 'MMM dd, yyyy')} - ${formatDate(reportFilters.endDate, 'MMM dd, yyyy')}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(dateRange, pageWidth / 2, 54, { align: 'center' });
    
    // Add report generation info
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated on: ${formatDate(new Date(), 'MMM dd, yyyy, HH:mm')}`, pageWidth - 15, 65, { align: 'right' });
    
    // Add table manually if autoTable is not available
    try {
      // Try using autoTable if it's available
      if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable({
          startY: 70,
          head: [columns.map(col => col.header)],
          body: data.map(item => columns.map(col => item[col.dataKey] !== undefined ? item[col.dataKey] : '')),
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          },
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [200, 200, 200]
          },
          margin: { top: 70, right: 14, bottom: 25, left: 14 }
        });
      } else {
        // Manual table implementation as fallback
        console.warn("autoTable not available, drawing manual table");
        const margin = 14;
        const tableTop = 70;
        const tableWidth = pageWidth - 2 * margin;
        const colWidth = tableWidth / columns.length;
        const rowHeight = 10;
        
        // Draw header
        doc.setFillColor(41, 128, 185);
        doc.rect(margin, tableTop, tableWidth, rowHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        
        columns.forEach((col, i) => {
          doc.text(col.header, margin + i * colWidth + colWidth / 2, tableTop + rowHeight / 2 + 3, { align: 'center' });
        });
        
        // Draw rows
        let y = tableTop + rowHeight;
        
        data.forEach((row, rowIndex) => {
          // Alternate row colors
          if (rowIndex % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, y, tableWidth, rowHeight, 'F');
          }
          
          doc.setTextColor(80, 80, 80);
          doc.setFont('helvetica', 'normal');
          
          columns.forEach((col, colIndex) => {
            const cellContent = row[col.dataKey] !== undefined ? row[col.dataKey] : '';
            doc.text(String(cellContent), margin + colIndex * colWidth + colWidth / 2, y + rowHeight / 2 + 3, { align: 'center' });
          });
          
          y += rowHeight;
          
          // Check if we need a new page
          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
          }
        });
      }
    } catch (error) {
      console.error("Error generating table in PDF:", error);
      
      // Fallback to basic text content
      const margin = 14; // Define margin for fallback text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Error generating table. Basic data below:", margin, 70);
      
      let y = 80;
      data.forEach((row, rowIndex) => {
        let rowText = '';
        columns.forEach((col) => {
          const cellContent = row[col.dataKey] !== undefined ? row[col.dataKey] : '';
          rowText += `${col.header}: ${cellContent} | `;
        });
        
        doc.text(rowText, margin, y);
        y += 7;
        
        // Check if we need a new page
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
      });
    }
    
    // Add footer with border
    doc.setDrawColor(41, 128, 185); // Blue border
    doc.setLineWidth(0.5);
    doc.line(10, pageHeight - 18, pageWidth - 10, pageHeight - 18);
    
    // Footer text
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 20,
        pageHeight - 10,
        { align: 'right' }
      );
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        commonTemplate.footerText,
        15,
        pageHeight - 10
      );
    }
    
    try {
      // Create a safe filename
      const safeTitle = title.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      // Save the PDF
      doc.save(`${safeTitle}_report.pdf`);
    } catch (error) {
      console.error("Error saving PDF:", error);
      // Fallback: open in new window
      const blob = doc.output('blob');
      window.open(URL.createObjectURL(blob));
    }
    
    return doc;
  };

  const generateExcel = (
    data: any[],
    columns: { header: string, dataKey: string }[],
    sheetName: string,
    fileName: string
  ): void => {
    try {
      const worksheetData = [
        columns.map(col => col.header),
        ...data.map(item => columns.map(col => item[col.dataKey] !== undefined ? item[col.dataKey] : ''))
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      
      // Add metadata
      workbook.Props = {
        Title: fileName,
        Subject: `Report generated on ${formatDate(new Date(), 'yyyy-MM-dd')}`,
        Author: "Opzons Printers ERP System",
        CreatedDate: new Date()
      };
      
      // Add custom header styling for Excel
      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellRef]) worksheet[cellRef] = { v: '' };
        worksheet[cellRef].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '2980B9' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      
      // Auto-size columns (simple approach)
      const colWidths = columns.map(col => ({
        wch: Math.max(
          col.header.length,
          ...data.map(row => String(row[col.dataKey] || '').length)
        )
      }));
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Create a safe filename
      const safeFilename = fileName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      XLSX.writeFile(workbook, `${safeFilename}_report.xlsx`);
    } catch (error: any) {
      console.error("Error generating Excel file:", error);
      showSnackbar(`Failed to generate Excel file: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const generateCSV = (
    data: any[],
    columns: { header: string, dataKey: string }[],
    fileName: string
  ): void => {
    try {
      const worksheetData = [
        columns.map(col => col.header),
        ...data.map(item => columns.map(col => item[col.dataKey] !== undefined ? item[col.dataKey] : ''))
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      // Create a safe filename
      const safeFilename = fileName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      // Method 1: Using download attribute
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${safeFilename}_report.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error: unknown) {
      console.error("Error generating CSV file:", error);
      showSnackbar(`Failed to generate CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      
      // Try alternative method
      try {
        const alternativeData = [
          columns.map(col => `"${col.header}"`).join(','),
          ...data.map(item => 
            columns.map(col => {
              const value = item[col.dataKey];
              return value !== undefined ? `"${value}"` : '""';
            }).join(',')
          )
        ].join('\n');
        
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(alternativeData));
        element.setAttribute('download', `${fileName.toLowerCase().replace(/\s+/g, '_')}_report.csv`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      } catch (e) {
        console.error("Alternative CSV generation failed:", e);
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    return amount.toString()
  };

  // Report generation functions
  const generateSalesSummaryReport = (
    data: any,
    outputFormat: 'pdf' | 'excel' | 'csv',
    startDate: Date,
    endDate: Date,
    filters: any = {}
  ): void => {
    const clientOrders = data.clientOrders || [];
    
    // Filter orders in the date range
    let filteredOrders = clientOrders.filter((order: any) => {
      if (!order.date && !order.created_at && !order.orderDate) return false;
      
      const orderDate = order.date ? parseISO(order.date) : 
                       (order.created_at ? parseISO(order.created_at) : 
                       parseISO(order.orderDate));
      
      return isWithinInterval(orderDate, { start: startDate, end: endDate });
    });
    
    // Apply additional filters if provided
    if (filters.clientId && filters.clientId !== 'all') {
      filteredOrders = filteredOrders.filter((order: any) => {
        return order.client_id === filters.clientId || order.clientId === filters.clientId;
      });
    }
    
    if (filters.status && filters.status !== 'all') {
      filteredOrders = filteredOrders.filter((order: any) => {
        return order.status === filters.status;
      });
    }
    
    // Process data for the report
    const reportData = filteredOrders.map((order: any) => ({
      orderNumber: order.order_id || order.orderNumber || order.id,
      clientName: order.clientName || (order.clients ? order.clients.name : 'Unknown'),
      orderDate: formatDate(
        parseISO(order.date || order.created_at || order.orderDate),
        'MMM dd, yyyy'
      ),
      deliveryDate: order.deliveryDate ? 
        formatDate(parseISO(order.deliveryDate), 'MMM dd, yyyy') : 'N/A',
      status: order.status,
      totalAmount: formatCurrency(order.amount || order.totalAmount || 0),
      paymentStatus: order.paymentStatus || 'N/A'
    }));
    
    // Define columns for the report
    const columns = [
      { header: 'Order #', dataKey: 'orderNumber' },
      { header: 'Client', dataKey: 'clientName' },
      { header: 'Order Date', dataKey: 'orderDate' },
      { header: 'Delivery Date', dataKey: 'deliveryDate' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Amount', dataKey: 'totalAmount' },
      { header: 'Payment', dataKey: 'paymentStatus' }
    ];
    
    // Summary calculations
    const totalSales = filteredOrders.reduce((sum: number, order: any) => 
      sum + (order.amount || order.totalAmount || 0), 0);
    
    const paidOrders = filteredOrders.filter((order: any) => 
      order.paymentStatus === 'Paid').length;
    
    const pendingOrders = filteredOrders.filter((order: any) => 
      order.paymentStatus !== 'Paid').length;
    
    // Add summary to the report data
    reportData.push(
      { orderNumber: '', clientName: '', orderDate: '', deliveryDate: '', status: '', totalAmount: '', paymentStatus: '' },
      { orderNumber: 'Summary', clientName: '', orderDate: '', deliveryDate: '', status: '', totalAmount: '', paymentStatus: '' },
      { orderNumber: 'Total Orders', clientName: filteredOrders.length, orderDate: '', deliveryDate: '', status: '', totalAmount: '', paymentStatus: '' },
      { orderNumber: 'Total Sales', clientName: '', orderDate: '', deliveryDate: '', status: '', totalAmount: formatCurrency(totalSales), paymentStatus: '' },
      { orderNumber: 'Paid Orders', clientName: paidOrders, orderDate: '', deliveryDate: '', status: '', totalAmount: '', paymentStatus: '' },
      { orderNumber: 'Pending Orders', clientName: pendingOrders, orderDate: '', deliveryDate: '', status: '', totalAmount: '', paymentStatus: '' }
    );
    
    const title = "Sales Summary Report";
    const subtitle = `From ${formatDate(startDate, 'MMM dd, yyyy')} to ${formatDate(endDate, 'MMM dd, yyyy')}`;
    
    // Generate report in the selected format
    if (outputFormat === 'pdf') {
      generatePDF(reportData, columns, title, subtitle, 'landscape');
    } else if (outputFormat === 'excel') {
      generateExcel(reportData, columns, 'Sales Summary', title);
    } else if (outputFormat === 'csv') {
      generateCSV(reportData, columns, title);
    }
  };

  const generateInventoryReport = (
    data: any,
    outputFormat: 'pdf' | 'excel' | 'csv',
    startDate: Date,
    endDate: Date,
    filters: any = {}
  ): void => {
    const inventory = data.inventory || [];
    
    // Filter inventory data based on additional filters if needed
    let filteredInventory = [...inventory];
    
    if (filters.supplierId && filters.supplierId !== 'all') {
      filteredInventory = filteredInventory.filter((item: any) => 
        item.supplierId === filters.supplierId);
    }
    
    if (filters.status === 'lowStock') {
      filteredInventory = filteredInventory.filter((item: any) => 
        (item.quantity || item.currentStock) <= (item.minStockLevel || item.reorderLevel));
    }
    
    // Process data for the report
    const reportData = filteredInventory.map((item: any) => ({
      itemCode: item.sku || item.itemCode || item.id,
      itemName: item.itemName,
      category: item.itemType || item.category || 'N/A',
      currentStock: item.quantity || item.currentStock || 0,
      reorderLevel: item.minStockLevel || item.reorderLevel || 0,
      unitPrice: formatCurrency(item.unitPrice || 0),
      value: formatCurrency((item.quantity || item.currentStock || 0) * (item.unitPrice || 0)),
      status: (item.quantity || item.currentStock || 0) <= (item.minStockLevel || item.reorderLevel || 0) 
        ? 'Low Stock' 
        : 'In Stock'
    }));
    
    // Define columns for the report
    const columns = [
      { header: 'Item Code', dataKey: 'itemCode' },
      { header: 'Item Name', dataKey: 'itemName' },
      { header: 'Category', dataKey: 'category' },
      { header: 'Current Stock', dataKey: 'currentStock' },
      { header: 'Reorder Level', dataKey: 'reorderLevel' },
      { header: 'Unit Price', dataKey: 'unitPrice' },
      { header: 'Total Value', dataKey: 'value' },
      { header: 'Status', dataKey: 'status' }
    ];
    
    // Summary calculations
    const totalItems = filteredInventory.length;
    const lowStockItems = filteredInventory.filter((item: any) => 
      (item.quantity || item.currentStock || 0) <= (item.minStockLevel || item.reorderLevel || 0)).length;
    
    const totalValue = filteredInventory.reduce((sum: number, item: any) => 
      sum + ((item.quantity || item.currentStock || 0) * (item.unitPrice || 0)), 0);
    
    // Add summary to the report data
    reportData.push(
      { itemCode: '', itemName: '', category: '', currentStock: '', reorderLevel: '', unitPrice: '', value: '', status: '' },
      { itemCode: 'Summary', itemName: '', category: '', currentStock: '', reorderLevel: '', unitPrice: '', value: '', status: '' },
      { itemCode: 'Total Items', itemName: totalItems, category: '', currentStock: '', reorderLevel: '', unitPrice: '', value: '', status: '' },
      { itemCode: 'Low Stock Items', itemName: lowStockItems, category: '', currentStock: '', reorderLevel: '', unitPrice: '', value: '', status: '' },
      { itemCode: 'Total Inventory Value', itemName: '', category: '', currentStock: '', reorderLevel: '', unitPrice: '', value: formatCurrency(totalValue), status: '' }
    );
    
    const title = "Inventory Status Report";
    const subtitle = `Generated on ${formatDate(new Date(), 'MMM dd, yyyy')}`;
    
    // Generate report in the selected format
    if (outputFormat === 'pdf') {
      generatePDF(reportData, columns, title, subtitle, 'landscape');
    } else if (outputFormat === 'excel') {
      generateExcel(reportData, columns, 'Inventory', title);
    } else if (outputFormat === 'csv') {
      generateCSV(reportData, columns, title);
    }
  };

  const generateAttendanceReport = (
    data: any,
    outputFormat: 'pdf' | 'excel' | 'csv',
    startDate: Date,
    endDate: Date,
    filters: any = {}
  ): void => {
    const attendance = data.attendance || data.attendanceRecords || [];
    const employees = data.employees || [];
    
    // Filter attendance records in the date range
    let filteredAttendance = attendance.filter((record: any) => {
      const recordDate = parseISO(record.date);
      return isWithinInterval(recordDate, { start: startDate, end: endDate });
    });
    
    // Apply additional filters
    if (filters.employeeId && filters.employeeId !== 'all') {
      filteredAttendance = filteredAttendance.filter((record: any) => {
        return record.employeeId === filters.employeeId;
      });
    }
    
    if (filters.status && filters.status !== 'all') {
      filteredAttendance = filteredAttendance.filter((record: any) => {
        return record.status === filters.status;
      });

    }
    
    // Get employee details
    const employeeMap = employees.reduce((map: any, employee: any) => {
      map[employee.id] = employee;
      return map;
    }, {});
    
    // Process data for the report
    const reportData = filteredAttendance.map((record: any) => {
      const employee = employeeMap[record.employeeId] || {};
      return {
        employeeId: record.employeeId,
        employeeName: employee.fullName || record.employeeName || `${employee.firstName || ''} ${employee.lastName || ''}`,
        department: employee.department || 'N/A',
        date: formatDate(parseISO(record.date), 'MMM dd, yyyy'),
        timeIn: record.timeIn || 'N/A',
        timeOut: record.timeOut || 'N/A',
        status: record.status || 'Present',
        hoursWorked: record.hoursWorked || 'N/A',
        overtime: record.overtime || '0'
      };
    });
    
    // Define columns for the report
    const columns = [
      { header: 'Employee ID', dataKey: 'employeeId' },
      { header: 'Employee Name', dataKey: 'employeeName' },
      { header: 'Department', dataKey: 'department' },
      { header: 'Date', dataKey: 'date' },
      { header: 'Time In', dataKey: 'timeIn' },
      { header: 'Time Out', dataKey: 'timeOut' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Hours Worked', dataKey: 'hoursWorked' },
      { header: 'Overtime', dataKey: 'overtime' }
    ];
    
    // Calculate summary statistics
    const presentCount = filteredAttendance.filter((record: { status: string }) => record.status === 'Present').length;
    const lateCount = filteredAttendance.filter((record: { status: string }) => record.status === 'Late').length;
    const absentCount = filteredAttendance.filter((record: { status: string }) => record.status === 'Absent').length;
    
    // Add summary to the report data
    reportData.push(
      { employeeId: '', employeeName: '', department: '', date: '', timeIn: '', timeOut: '', status: '', hoursWorked: '', overtime: '' },
      { employeeId: 'Summary', employeeName: '', department: '', date: '', timeIn: '', timeOut: '', status: '', hoursWorked: '', overtime: '' },
      { employeeId: 'Total Records', employeeName: filteredAttendance.length, department: '', date: '', timeIn: '', timeOut: '', status: '', hoursWorked: '', overtime: '' },
      { employeeId: 'Present', employeeName: presentCount, department: '', date: '', timeIn: '', timeOut: '', status: '', hoursWorked: '', overtime: '' },
      { employeeId: 'Late', employeeName: lateCount, department: '', date: '', timeIn: '', timeOut: '', status: '', hoursWorked: '', overtime: '' },
      { employeeId: 'Absent', employeeName: absentCount, department: '', date: '', timeIn: '', timeOut: '', status: '', hoursWorked: '', overtime: '' }
    );
    
    const title = "Employee Attendance Report";
    const subtitle = `From ${formatDate(startDate, 'MMM dd, yyyy')} to ${formatDate(endDate, 'MMM dd, yyyy')}`;
    
    // Generate report in the selected format
    if (outputFormat === 'pdf') {
      generatePDF(reportData, columns, title, subtitle, 'landscape');
    } else if (outputFormat === 'excel') {
      generateExcel(reportData, columns, 'Attendance', title);
    } else if (outputFormat === 'csv') {
      generateCSV(reportData, columns, title);
    }
  };

  const generateMachineryReport = (
    data: any,
    outputFormat: 'pdf' | 'excel' | 'csv',
    startDate: Date,
    endDate: Date,
    filters: any = {}
  ): void => {
    const machinery = data.machinery || [];
    const maintenanceRecords = data.machineryStats?.maintenanceRecords || data.maintenanceRecords || [];
    
    // Filter maintenance records in the date range
    let filteredMaintenance = maintenanceRecords.filter((record: any) => {
      if (!record.date) return false;
      const recordDate = parseISO(record.date);
      return isWithinInterval(recordDate, { start: startDate, end: endDate });
    });
    
    // Apply additional filters
    if (filters.type && filters.type !== 'all') {
      filteredMaintenance = filteredMaintenance.filter((record: any) => {
        return record.type === filters.type || record.maintenanceType === filters.type;
      });
    }
    
    // Get machinery details
    const machineryMap = machinery.reduce((map: any, machine: any) => {
      map[machine.id] = machine;
      return map;
    }, {});
    
    // Process data for the report
    const reportData = filteredMaintenance.map((record: any) => {
      const machine = machineryMap[record.machineryId] || {};
      return {
        machineryId: record.machineryId,
        machineryName: machine.name || 'Unknown',
        maintenanceType: record.type || record.maintenanceType || 'Routine',
        date: formatDate(parseISO(record.date), 'MMM dd, yyyy'),
        performedBy: record.performedBy || 'N/A',
       cost: formatCurrency(record.cost || 0),
       details: record.description || record.details || 'N/A',
       nextMaintenanceDate: machine.nextMaintenanceDate ? 
         formatDate(parseISO(machine.nextMaintenanceDate), 'MMM dd, yyyy') : 'N/A',
     };
   });
   
   // Define columns for the report
   const columns = [
     { header: 'Machinery ID', dataKey: 'machineryId' },
     { header: 'Machinery Name', dataKey: 'machineryName' },
     { header: 'Maintenance Type', dataKey: 'maintenanceType' },
     { header: 'Date', dataKey: 'date' },
     { header: 'Performed By', dataKey: 'performedBy' },
     { header: 'Cost', dataKey: 'cost' },
     { header: 'Details', dataKey: 'details' },
     { header: 'Next Maintenance', dataKey: 'nextMaintenanceDate' }
   ];
   
   // Calculate summary statistics
  // Define interface for maintenance records
  interface MaintenanceRecord {
    machineryId: number;
    type?: string;
    maintenanceType?: string;
    date: string;
    performedBy?: string;
    cost?: number;
    description?: string;
    details?: string;
  }

  const totalCost: number = filteredMaintenance.reduce((sum: number, record: MaintenanceRecord) => 
    sum + (record.cost || 0), 0);
  // Interface for tracking maintenance types counts
  interface MaintenanceTypeCount {
    [key: string]: number;
  }

  const typeCount: MaintenanceTypeCount = filteredMaintenance.reduce((count: MaintenanceTypeCount, record: MaintenanceRecord) => {
    const type = record.type || record.maintenanceType || 'Routine';
    count[type] = (count[type] || 0) + 1;
    return count;
  }, {});
   
   // Add summary to the report data
   reportData.push(
     { machineryId: '', machineryName: '', maintenanceType: '', date: '', performedBy: '', cost: '', details: '', nextMaintenanceDate: '' },
     { machineryId: 'Summary', machineryName: '', maintenanceType: '', date: '', performedBy: '', cost: '', details: '', nextMaintenanceDate: '' },
     { machineryId: 'Total Records', machineryName: filteredMaintenance.length, maintenanceType: '', date: '', performedBy: '', cost: '', details: '', nextMaintenanceDate: '' },
     { machineryId: 'Total Cost', machineryName: '', maintenanceType: '', date: '', performedBy: '', cost: formatCurrency(totalCost), details: '', nextMaintenanceDate: '' }
   );
   
   // Add maintenance type counts to the summary
   Object.entries(typeCount).forEach(([type, count]) => {
     reportData.push({
       machineryId: `${type} Count`,
       machineryName: count,
       maintenanceType: '',
       date: '',
       performedBy: '',
       cost: '',
       details: '',
       nextMaintenanceDate: ''
     });
   });
   
   const title = "Machinery Maintenance Report";
   const subtitle = `From ${formatDate(startDate, 'MMM dd, yyyy')} to ${formatDate(endDate, 'MMM dd, yyyy')}`;
   
   // Generate report in the selected format
   if (outputFormat === 'pdf') {
     generatePDF(reportData, columns, title, subtitle, 'landscape');
   } else if (outputFormat === 'excel') {
     generateExcel(reportData, columns, 'Machinery Maintenance', title);
   } else if (outputFormat === 'csv') {
     generateCSV(reportData, columns, title);
   }
 };

 const generatePayrollReport = (
   data: any,
   outputFormat: 'pdf' | 'excel' | 'csv',
   startDate: Date,
   endDate: Date,
   filters: any = {}
 ): void => {
   const payrollRecords = data.payrollRecords || [];
   const employees = data.employees || [];
   
   // Filter payroll records in the date range
   let filteredPayroll = payrollRecords.filter((record: any) => {
     if (!record.startDate || !record.endDate) return false;
     
     const payPeriodEnd = parseISO(record.endDate);
     return isWithinInterval(payPeriodEnd, { start: startDate, end: endDate });
   });
   
   // Apply additional filters
   if (filters.employeeId && filters.employeeId !== 'all') {
     filteredPayroll = filteredPayroll.filter((record: any) => {
       return record.employeeId === filters.employeeId;
     });
   }
   
   if (filters.status && filters.status !== 'all') {
     filteredPayroll = filteredPayroll.filter((record: any) => {
       return record.status === filters.status;
     });
   }
   
   // Get employee details
   const employeeMap = employees.reduce((map: any, employee: any) => {
     map[employee.id] = employee;
     return map;
   }, {});
   
   // Process data for the report
   const reportData = filteredPayroll.map((record: any) => {
     const employee = employeeMap[record.employeeId] || {};
     return {
       employeeId: record.employeeId,
       employeeName: record.employeeName || employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`,
       department: employee.department || 'N/A',
       position: employee.position || 'N/A',
       payPeriod: `${formatDate(parseISO(record.startDate), 'MMM dd')} - ${formatDate(parseISO(record.endDate), 'MMM dd, yyyy')}`,
       basicSalary: formatCurrency(record.baseSalary || 0),
       overtime: formatCurrency(record.overtimePay || 0),
       deductions: formatCurrency(record.deductions || 0),
       netSalary: formatCurrency(record.netSalary || 0)
     };
   });
   
   // Define columns for the report
   const columns = [
     { header: 'Employee ID', dataKey: 'employeeId' },
     { header: 'Employee Name', dataKey: 'employeeName' },
     { header: 'Department', dataKey: 'department' },
     { header: 'Position', dataKey: 'position' },
     { header: 'Pay Period', dataKey: 'payPeriod' },
     { header: 'Basic Salary', dataKey: 'basicSalary' },
     { header: 'Overtime', dataKey: 'overtime' },
     { header: 'Deductions', dataKey: 'deductions' },
     { header: 'Net Salary', dataKey: 'netSalary' }
   ];
   
   // Summary calculations
  // Interface for payroll records
  interface PayrollRecord {
    baseSalary?: number;
    overtimePay?: number;
    deductions?: number;
    netSalary?: number;
    employeeId?: number;
  }
  
  const totalBasicSalary: number = filteredPayroll.reduce((sum: number, record: PayrollRecord) => 
    sum + (record.baseSalary || 0), 0);
  const totalOvertimePay: number = filteredPayroll.reduce((sum: number, record: PayrollRecord) => 
    sum + (record.overtimePay || 0), 0);
  const totalDeductions: number = filteredPayroll.reduce((sum: number, record: PayrollRecord) => 
    sum + (record.deductions || 0), 0);
  const totalNetSalary: number = filteredPayroll.reduce((sum: number, record: PayrollRecord) => 
    sum + (record.netSalary || 0), 0);
   
   // Add summary to the report data
   reportData.push(
     { employeeId: '', employeeName: '', department: '', position: '', payPeriod: '', basicSalary: '', overtime: '', deductions: '', netSalary: '' },
     { employeeId: 'Summary', employeeName: '', department: '', position: '', payPeriod: '', basicSalary: '', overtime: '', deductions: '', netSalary: '' },
     { employeeId: 'Total Employees', employeeName: filteredPayroll.length, department: '', position: '', payPeriod: '', basicSalary: '', overtime: '', deductions: '', netSalary: '' },
     { employeeId: 'Totals', employeeName: '', department: '', position: '', payPeriod: '', basicSalary: formatCurrency(totalBasicSalary), overtime: formatCurrency(totalOvertimePay), deductions: formatCurrency(totalDeductions), netSalary: formatCurrency(totalNetSalary) }
   );
   
   const title = "Payroll Report";
   const subtitle = `From ${formatDate(startDate, 'MMM dd, yyyy')} to ${formatDate(endDate, 'MMM dd, yyyy')}`;
   
   // Generate report in the selected format
   if (outputFormat === 'pdf') {
     generatePDF(reportData, columns, title, subtitle, 'landscape');
   } else if (outputFormat === 'excel') {
     generateExcel(reportData, columns, 'Payroll', title);
   } else if (outputFormat === 'csv') {
     generateCSV(reportData, columns, title);
   }
 };

 const generateDTR = (
   data: any,
   outputFormat: 'pdf' | 'excel' | 'csv',
   startDate: Date,
   endDate: Date,
   filters: any = {}
 ): void => {
   const attendance = data.attendance || data.attendanceRecords || [];
   const employees = data.employees || [];
   
   // Filter by employee if specified
   let filteredEmployees = [...employees];
   if (filters.employeeId && filters.employeeId !== 'all') {
     filteredEmployees = filteredEmployees.filter(employee => employee.id === filters.employeeId);
   }
   
   // Group attendance by employee
   const attendanceByEmployee: { [key: string]: any[] } = {};
   
   attendance.forEach((record: any) => {
     if (!record.date) return;
     
     const recordDate = parseISO(record.date);
     if (isWithinInterval(recordDate, { start: startDate, end: endDate })) {
       if (!attendanceByEmployee[record.employeeId]) {
         attendanceByEmployee[record.employeeId] = [];
       }
       attendanceByEmployee[record.employeeId].push(record);
     }
   });
   
   // Get employee details
   const employeeMap = employees.reduce((map: any, employee: any) => {
     map[employee.id] = employee;
     return map;
   }, {});
   
   // Generate a DTR for each employee
   filteredEmployees.forEach((employee) => {
     const employeeId = employee.id;
     const employeeRecords = attendanceByEmployee[employeeId] || [];
     
     if (employeeRecords.length === 0) {
       showSnackbar(`No attendance records found for ${employee.firstName} ${employee.lastName} in the selected period.`, 'info');
       return;
     }
     
     // Sort records by date
     employeeRecords.sort((a: any, b: any) => {
       return new Date(a.date).getTime() - new Date(b.date).getTime();
     });
     
     // Process data for the report
     const reportData = employeeRecords.map((record: any) => ({
       date: formatDate(parseISO(record.date), 'MMM dd, yyyy'),
       day: formatDate(parseISO(record.date), 'EEEE'),
       timeIn: record.timeIn || 'N/A',
       timeOut: record.timeOut || 'N/A',
       hoursWorked: record.hoursWorked || 'N/A',
       overtime: record.overtime || '0',
       status: record.status || 'Present',
       remarks: record.notes || record.remarks || ''
     }));
     
     // Define columns for the report
     const columns = [
       { header: 'Date', dataKey: 'date' },
       { header: 'Day', dataKey: 'day' },
       { header: 'Time In', dataKey: 'timeIn' },
       { header: 'Time Out', dataKey: 'timeOut' },
       { header: 'Hours', dataKey: 'hoursWorked' },
       { header: 'OT', dataKey: 'overtime' },
       { header: 'Status', dataKey: 'status' },
       { header: 'Remarks', dataKey: 'remarks' }
     ];
     
     // Summary calculations
     const totalHours = employeeRecords.reduce((sum: number, record: any) => 
       sum + (parseFloat(record.hoursWorked) || 0), 0);
     
     const totalOvertime = employeeRecords.reduce((sum: number, record: any) => 
       sum + (parseFloat(record.overtime) || 0), 0);
     
     const presentDays = employeeRecords.filter((record: any) => 
       record.status === 'Present').length;
     
     const absentDays = employeeRecords.filter((record: any) => 
       record.status === 'Absent').length;
     
     const lateDays = employeeRecords.filter((record: any) => 
       record.status === 'Late').length;
     
     // Add summary to the report data
     reportData.push(
       { date: '', day: '', timeIn: '', timeOut: '', hoursWorked: '', overtime: '', status: '', remarks: '' },
       { date: 'Summary', day: '', timeIn: '', timeOut: '', hoursWorked: '', overtime: '', status: '', remarks: '' },
       { date: 'Total Days', day: String(employeeRecords.length), timeIn: '', timeOut: '', hoursWorked: '', overtime: '', status: '', remarks: '' },
       { date: 'Present Days', day: String(presentDays), timeIn: '', timeOut: '', hoursWorked: '', overtime: '', status: '', remarks: '' },
       { date: 'Late Days', day: String(lateDays), timeIn: '', timeOut: '', hoursWorked: '', overtime: '', status: '', remarks: '' },
       { date: 'Absent Days', day: String(absentDays), timeIn: '', timeOut: '', hoursWorked: '', overtime: '', status: '', remarks: '' },
       { date: 'Total Hours', day: '', timeIn: '', timeOut: '', hoursWorked: totalHours.toFixed(2), overtime: '', status: '', remarks: '' },
       { date: 'Total Overtime', day: '', timeIn: '', timeOut: '', hoursWorked: '', overtime: totalOvertime.toFixed(2), status: '', remarks: '' }
     );
     
     const employeeName = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`;
     const title = `Daily Time Record (DTR)`;
     const subtitle = `${employeeName} - ${employee.position || 'Employee'} - ${formatDate(startDate, 'MMM dd')} to ${formatDate(endDate, 'MMM dd, yyyy')}`;
     
     // Generate report in the selected format
     if (outputFormat === 'pdf') {
       const doc = generatePDF(reportData, columns, title, subtitle, 'portrait');
       
       // Add employee information on the PDF
       doc.setPage(1);
       
       // Add employee info box
       doc.setFillColor(240, 240, 240);
       const docPageWidth = doc.internal.pageSize.getWidth();
       doc.roundedRect(14, 70, docPageWidth - 28, 25, 2, 2, 'F');
       
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(11);
       doc.setTextColor(41, 128, 185);
       doc.text('Employee Information', 20, 78);
       
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(10);
       doc.setTextColor(80, 80, 80);
       doc.text(`Employee Name: ${employeeName}`, 20, 85);
       doc.text(`Position: ${employee.position || 'N/A'}`, 20, 90);
       
       doc.text(`Department: ${employee.department || 'N/A'}`, docPageWidth - 80, 85);
       doc.text(`Employee ID: ${employeeId}`, docPageWidth - 80, 90);
     } else if (outputFormat === 'excel') {
       generateExcel(reportData, columns, `DTR - ${employeeName}`, title);
     } else if (outputFormat === 'csv') {
       generateCSV(reportData, columns, `DTR - ${employeeName}`);
     }
   });
 };

 // New report generation function for printing job report
 const generatePrintingJobReport = (
   data: any,
   outputFormat: 'pdf' | 'excel' | 'csv',
   startDate: Date,
   endDate: Date,
   filters: any = {}
 ): void => {
   const clientOrders = data.clientOrders || [];
   
   // Filter orders in the date range
   let filteredOrders = clientOrders.filter((order: any) => {
     if (!order.date && !order.created_at && !order.orderDate) return false;
     
     const orderDate = order.date ? parseISO(order.date) : 
                      (order.created_at ? parseISO(order.created_at) : 
                      parseISO(order.orderDate));
     
     return isWithinInterval(orderDate, { start: startDate, end: endDate });
   });
   
   // Apply additional filters if provided
   if (filters.clientId && filters.clientId !== 'all') {
     filteredOrders = filteredOrders.filter((order: any) => {
       return order.client_id === filters.clientId || order.clientId === filters.clientId;
     });
   }
   
   if (filters.status && filters.status !== 'all') {
     filteredOrders = filteredOrders.filter((order: any) => {
       return order.status === filters.status;
     });
   }
   
   // Get all order items
   const orderItems = filteredOrders.flatMap((order: any) => {
     const items = order.items || [];
     return items.map((item: any) => ({
       ...item,
       orderNumber: order.order_id || order.orderNumber || order.id,
       orderDate: order.date || order.created_at || order.orderDate,
       clientName: order.clientName || (order.clients ? order.clients.name : 'Unknown'),
       status: order.status
     }));
   });
   
   // Process data for the report
   const reportData = orderItems.map((item: any) => ({
     orderNumber: item.orderNumber,
     clientName: item.clientName,
     productName: item.product_name || item.productName,
     quantity: item.quantity || 0,
     unitPrice: formatCurrency(item.unit_price || item.unitPrice || 0),
     totalPrice: formatCurrency(item.total_price || item.totalPrice || 0),
     orderDate: formatDate(parseISO(item.orderDate), 'MMM dd, yyyy'),
     status: item.status
   }));
   
   // Define columns for the report
   const columns = [
     { header: 'Order #', dataKey: 'orderNumber' },
     { header: 'Client', dataKey: 'clientName' },
     { header: 'Product', dataKey: 'productName' },
     { header: 'Quantity', dataKey: 'quantity' },
     { header: 'Unit Price', dataKey: 'unitPrice' },
     { header: 'Total Price', dataKey: 'totalPrice' },
     { header: 'Order Date', dataKey: 'orderDate' },
     { header: 'Status', dataKey: 'status' }
   ];
   
   // Summary calculations
   const totalItems = reportData.length;
  interface OrderItem {
    quantity?: number;
    total_price?: number;
    totalPrice?: number;
    product_name?: string;
    productName?: string;
    unit_price?: number;
    unitPrice?: number;
    orderNumber?: string | number;
    orderDate?: string;
    clientName?: string;
    status?: string;
  }
  
  const totalQuantity: number = orderItems.reduce((sum: number, item: OrderItem) => sum + (item.quantity || 0), 0);
  const totalValue: number = orderItems.reduce((sum: number, item: OrderItem) => 
    sum + (item.total_price || item.totalPrice || 0), 0);
   
   // Product category counts
  interface ProductCounts {
    [key: string]: number;
  }
  
  const productCounts: ProductCounts = orderItems.reduce((count: ProductCounts, item: OrderItem) => {
    const product = item.product_name || item.productName || 'Unknown';
    count[product] = (count[product] || 0) + (item.quantity || 0);
    return count;
  }, {});
   
   // Add summary to the report data
   reportData.push(
     { orderNumber: '', clientName: '', productName: '', quantity: '', unitPrice: '', totalPrice: '', orderDate: '', status: '' },
     { orderNumber: 'Summary', clientName: '', productName: '', quantity: '', unitPrice: '', totalPrice: '', orderDate: '', status: '' },
     { orderNumber: 'Total Job Items', clientName: totalItems, productName: '', quantity: '', unitPrice: '', totalPrice: '', orderDate: '', status: '' },
     { orderNumber: 'Total Quantity', clientName: '', productName: '', quantity: totalQuantity, unitPrice: '', totalPrice: '', orderDate: '', status: '' },
     { orderNumber: 'Total Value', clientName: '', productName: '', quantity: '', unitPrice: '', totalPrice: formatCurrency(totalValue), orderDate: '', status: '' }
   );
   
   // Add product category counts
   Object.entries(productCounts).forEach(([product, count]) => {
     reportData.push({
       orderNumber: 'Product Count',
       clientName: '',
       productName: product,
       quantity: count,
       unitPrice: '',
       totalPrice: '',
       orderDate: '',
       status: ''
     });
   });
   
   const title = "Printing Jobs Report";
   const subtitle = `From ${formatDate(startDate, 'MMM dd, yyyy')} to ${formatDate(endDate, 'MMM dd, yyyy')}`;
   
   // Generate report in the selected format
   if (outputFormat === 'pdf') {
     generatePDF(reportData, columns, title, subtitle, 'landscape');
   } else if (outputFormat === 'excel') {
     generateExcel(reportData, columns, 'Printing Jobs', title);
   } else if (outputFormat === 'csv') {
     generateCSV(reportData, columns, title);
   }
 };

 // Dashboard metrics
 const [dashboardData, setDashboardData] = useState({
   totalEmployees: 0,
   totalClients: 0,
   totalSuppliers: 0,
   totalMachinery: 0,
   activeOrders: 0,
   revenueThisMonth: 0,
   expensesThisMonth: 0,
   pendingPayments: 0,
   lowStockItems: 0,
   upcomingMaintenance: 0
 });

 // List of available reports with their generation functions
 const reportTypes: ReportType[] = [
   {
     id: 'sales_summary',
     name: 'Sales Summary',
     description: 'Summary of all sales transactions within the selected period',
     icon: <MoneyIcon color="primary" />,
     availableFormats: ['pdf', 'excel', 'csv'],
     generateReport: generateSalesSummaryReport,
     extraFilters: ['clientId', 'status']
   },
   {
     id: 'inventory',
     name: 'Inventory Status Report',
     description: 'Current inventory levels, reorder suggestions, and inventory movements',
     icon: <InventoryIcon color="primary" />,
     availableFormats: ['pdf', 'excel', 'csv'],
     generateReport: generateInventoryReport,
     extraFilters: ['supplierId', 'status']
   },
   {
     id: 'employee_attendance',
     name: 'Employee Attendance',
     description: 'Employee attendance records and summary for the selected period',
     icon: <PeopleIcon color="primary" />,
     availableFormats: ['pdf', 'excel', 'csv'],
     generateReport: generateAttendanceReport,
     extraFilters: ['employeeId', 'status']
   },
   {
     id: 'machinery_maintenance',
     name: 'Machinery Maintenance',
     description: 'Report on machinery maintenance activities and upcoming maintenance schedules',
     icon: <BuildIcon color="primary" />,
     availableFormats: ['pdf', 'excel', 'csv'],
     generateReport: generateMachineryReport,
     extraFilters: ['type']
    },
    {
      id: 'payroll',
      name: 'Payroll Report',
      description: 'Employee payroll information including overtime, bonuses, and deductions',
      icon: <ReceiptIcon color="primary" />,
      availableFormats: ['pdf', 'excel', 'csv'],
      generateReport: generatePayrollReport,
      extraFilters: ['employeeId', 'status']
    },
    {
      id: 'dtr',
      name: 'Daily Time Record (DTR)',
      description: 'Individual employee daily time records with attendance summary',
      icon: <CalendarIcon color="primary" />,
      availableFormats: ['pdf', 'excel', 'csv'],
      generateReport: generateDTR,
      extraFilters: ['employeeId']
    },
    {
      id: 'printing_jobs',
      name: 'Printing Jobs Report',
      description: 'Detailed report of printing jobs with quantities, prices, and statuses',
      icon: <OrdersIcon color="primary" />,
      availableFormats: ['pdf', 'excel', 'csv'],
      generateReport: generatePrintingJobReport,
      extraFilters: ['clientId', 'status']
    }
  ];
 
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  }, []);
 
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get current month data
      const startDate = formatDate(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = formatDate(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      // Fetch all data for dashboard
      await Promise.all([
        dispatch(fetchEmployees()),
        dispatch(fetchClients()),
        dispatch(fetchSuppliers()),
        dispatch(fetchMachinery({})),
        dispatch(fetchMachineryStats()),
        dispatch(fetchMaintenanceRecords()),
        dispatch(fetchClientOrders()),
        dispatch(fetchInventory()),
        dispatch(fetchPayrolls({ startDate, endDate })),
        dispatch(fetchAttendance({ startDate, endDate }))
      ]);
      
      // Update dashboard data
      updateDashboardData();
      
      setLoading(false);
      showSnackbar('Data refreshed successfully', 'success');
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      showSnackbar(error.message || 'Failed to load dashboard data', 'error');
      setLoading(false);
    }
  }, [dispatch, showSnackbar]);
 
  const updateDashboardData = () => {
    // Calculate dashboard metrics from the fetched data
    const employees = employeesState.employees || [];
    const clients = clientsState.items || [];
    const suppliers = suppliersState.items || [];
    const machinery = machineryState.machinery || [];
    const clientOrders = clientOrdersState.clientOrders || [];
    const inventory = inventoryState.inventoryItems || [];
    
    // Calculate active orders
    const activeOrders = clientOrders.filter((order: any) => 
      order.status !== 'Completed' && order.status !== 'Cancelled' && 
      order.status !== 'Delivered'
    ).length;
    
    // Calculate revenue this month from completed orders
    const revenueThisMonth = clientOrders.reduce((sum: number, order: any) => {
      if ((order.status === 'Completed' || order.status === 'Delivered') && 
          order.date && isWithinInterval(parseISO(order.date), {
            start: startOfMonth(new Date()),
            end: endOfMonth(new Date())
          })) {
        return sum + (order.amount || order.totalAmount || 0);
      }
      return sum;
    }, 0);
    
    // Calculate expenses this month from payroll
    const payrollExpenses = (payrollState.payrollRecords || []).reduce((sum: number, record: any) => 
      sum + (record.netSalary || 0), 0);
    
    // Calculate pending payments
    const pendingPayments = clientOrders.reduce((sum: number, order: any) => {
      if (order.paymentStatus === 'Pending' || order.paymentStatus === 'Partial') {
        return sum + (order.amount || order.totalAmount || 0) - (order.amountPaid || 0);
      }
      return sum;
    }, 0);
    
    // Count low stock items
    const lowStockItems = inventory.filter((item: any) => 
      (item.quantity || item.currentStock || 0) <= (item.minStockLevel || item.reorderLevel || 0)
    ).length;
    
    // Count machinery needing maintenance
    const today = new Date();
    const nextMonth = addMonths(today, 1);
    
    const upcomingMaintenance = machinery.filter((machine: any) => {
      if (!machine.nextMaintenanceDate) return false;
      const nextMaintenanceDate = parseISO(machine.nextMaintenanceDate);
      return isWithinInterval(nextMaintenanceDate, { start: today, end: nextMonth });
    }).length;
    
    // Update dashboard data
    setDashboardData({
      totalEmployees: employees.length,
      totalClients: clients.length,
      totalSuppliers: suppliers.length,
      totalMachinery: machinery.length,
      activeOrders,
      revenueThisMonth,
      expensesThisMonth: payrollExpenses,
      pendingPayments,
      lowStockItems,
      upcomingMaintenance
    });
  };
 
  useEffect(() => {
    fetchData();
  }, [fetchData]);
 
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
 
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
 
  const handleFilterChange = (field: keyof ReportFilter, value: any) => {
    setReportFilters({
      ...reportFilters,
      [field]: value
    });
  };
 
  const handleDateChange = (field: 'startDate' | 'endDate') => (date: Date | null) => {
    if (date) {
      setReportFilters({
        ...reportFilters,
        [field]: date
      });
    }
  };
 
  // Handle report generation with error catching
  const handleGenerateReport = (reportType: string) => {
    const selectedReport = reportTypes.find(report => report.id === reportType);
    
    if (!selectedReport) {
      showSnackbar('Invalid report type selected', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if jsPDF-AutoTable is properly loaded for PDF reports
      if (selectedReport.availableFormats.includes('pdf') && reportFilters.format === 'pdf') {
        // Try to detect if autoTable is available
        if (typeof (jsPDF.prototype as any).autoTable !== 'function') {
          console.warn("jsPDF autoTable plugin is not properly initialized. Attempting to use fallback method.");
        }
      }
      
      // Gather all necessary data for the report
      const reportData = {
        clientOrders: clientOrdersState.clientOrders || [],
        inventory: inventoryState.inventoryItems || [],
        employees: employeesState.employees || [],
        machinery: machineryState.machinery || [],
        machineryStats: machineryState.machineryStats || {},
        maintenanceRecords: machineryState.maintenanceRecords || [],
        attendance: attendanceState.attendanceRecords || [],
        payrollRecords: payrollState.payrollRecords || [],
        clients: clientsState.items || [],
        suppliers: suppliersState.items || []
      };
      
      // Get filters for this report type
      const reportFiltersToUse: any = {};
      if (selectedReport.extraFilters) {
        selectedReport.extraFilters.forEach(filterName => {
          reportFiltersToUse[filterName] = reportFilters[filterName as keyof ReportFilter];
        });
      }
      
      // Call the report generation function
      selectedReport.generateReport(
        reportData,
        reportFilters.format as 'pdf' | 'excel' | 'csv',
        reportFilters.startDate,
        reportFilters.endDate,
        reportFiltersToUse
      );
      
      setLoading(false);
      showSnackbar(`${selectedReport.name} generated successfully.`, 'success');
    } catch (error: any) {
      console.error('Error generating report:', error);
      setLoading(false);
      
      if (error.message && error.message.includes('autoTable')) {
        showSnackbar(`PDF generation failed: AutoTable plugin issue. Try Excel or CSV format instead.`, 'error');
      } else {
        showSnackbar(`Failed to generate report: ${error.message || 'Unknown error'}`, 'error');
      }
    }
  };
 
  const handleGenerateSelectedReport = () => {
    if (reportFilters.type === 'all') {
      showSnackbar('Please select a report type', 'error');
      return;
    }
    
    handleGenerateReport(reportFilters.type);
  };
 
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Reports & Document Generation
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </Box>
 
      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="reports tabs">
          <Tab icon={<DashboardIcon />} label="Dashboard" />
          <Tab icon={<ReportIcon />} label="Generate Reports" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Employees
                      </Typography>
                      <Typography variant="h4" color="primary.main">
                        {dashboardData.totalEmployees}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Active Orders
                      </Typography>
                      <Typography variant="h4" color="primary.main">
                        {dashboardData.activeOrders}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Low Stock Items
                      </Typography>
                      <Typography variant="h4" color={dashboardData.lowStockItems > 0 ? 'error.main' : 'primary.main'}>
                        {dashboardData.lowStockItems}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Machinery Due Maintenance
                      </Typography>
                      <Typography variant="h4" color={dashboardData.upcomingMaintenance > 0 ? 'warning.main' : 'primary.main'}>
                        {dashboardData.upcomingMaintenance}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Financial Overview (Current Month)" />
                    <Divider />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Revenue
                          </Typography>
                          <Typography variant="h5" color="success.main">
                            {formatCurrency(dashboardData.revenueThisMonth)}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Expenses
                          </Typography>
                          <Typography variant="h5" color="error.main">
                            {formatCurrency(dashboardData.expensesThisMonth)}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            Profit/Loss
                          </Typography>
                          <Typography 
                            variant="h5" 
                            color={dashboardData.revenueThisMonth - dashboardData.expensesThisMonth >= 0 ? 'success.main' : 'error.main'}
                          >
                            {formatCurrency(dashboardData.revenueThisMonth - dashboardData.expensesThisMonth)}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            Pending Payments
                          </Typography>
                          <Typography variant="h5" color="warning.main">
                            {formatCurrency(dashboardData.pendingPayments)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Business Overview" />
                    <Divider />
                    <CardContent>
                      <List>
                        <ListItem divider>
                          <ListItemText 
                            primary="Clients" 
                            secondary={`${dashboardData.totalClients} registered clients`} 
                          />
                          <Chip label={dashboardData.totalClients} color="primary" />
                        </ListItem>
                        
                        <ListItem divider>
                          <ListItemText 
                            primary="Suppliers" 
                            secondary={`${dashboardData.totalSuppliers} registered suppliers`} 
                          />
                          <Chip label={dashboardData.totalSuppliers} color="primary" />
                        </ListItem>
                        
                        <ListItem divider>
                          <ListItemText 
                            primary="Machinery" 
                            secondary={`${dashboardData.totalMachinery} registered machinery`} 
                          />
                          <Chip label={dashboardData.totalMachinery} color="primary" />
                        </ListItem>
                        
                        <ListItem>
                          <ListItemText 
                            primary="Orders This Month" 
                            secondary="Client orders for the current month" 
                          />
                          <Chip 
                            label={(clientOrdersState.clientOrders || []).length} 
                            color="primary" 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card>
                    <CardHeader 
                      title="Quick Reports" 
                      subheader="Generate common reports with a single click" 
                    />
                    <Divider />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <Button 
                            variant="outlined" 
                            startIcon={<ExcelIcon />}
                            fullWidth
                            onClick={() => {
                              // Set format to Excel for quick reports to avoid PDF issues
                              setReportFilters(prev => ({...prev, format: 'excel'}));
                              handleGenerateReport('sales_summary');
                            }}
                            sx={{ py: 1 }}
                          >
                            Monthly Sales Report
                          </Button>
                        </Grid>
                        
                        <Grid item xs={12} md={3}>
                          <Button 
                            variant="outlined" 
                            startIcon={<ExcelIcon />}
                            fullWidth
                            onClick={() => {
                              setReportFilters(prev => ({...prev, format: 'excel'}));
                              handleGenerateReport('inventory');
                            }}
                            sx={{ py: 1 }}
                          >
                            Inventory Status Report
                          </Button>
                        </Grid>
                        
                        <Grid item xs={12} md={3}>
                          <Button 
                            variant="outlined" 
                            startIcon={<ExcelIcon />}
                            fullWidth
                            onClick={() => {
                              setReportFilters(prev => ({...prev, format: 'excel'}));
                              handleGenerateReport('printing_jobs');
                            }}
                            sx={{ py: 1 }}
                          >
                            Printing Jobs Report
                          </Button>
                        </Grid>
                        
                        <Grid item xs={12} md={3}>
                          <Button 
                            variant="outlined" 
                            startIcon={<ExcelIcon />}
                            fullWidth
                            onClick={() => {
                              setReportFilters(prev => ({...prev, format: 'excel'}));
                              handleGenerateReport('dtr');
                            }}
                            sx={{ py: 1 }}
                          >
                            Generate DTR
                          </Button>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Report Generation
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Start Date"
                        value={reportFilters.startDate}
                        onChange={handleDateChange('startDate')}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="End Date"
                        value={reportFilters.endDate}
                        onChange={handleDateChange('endDate')}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </LocalizationProvider>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel id="report-type-label">Report Type</InputLabel>
                      <Select
                        labelId="report-type-label"
                        value={reportFilters.type}
                        label="Report Type"
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                      >
                        <MenuItem value="all">Select Report Type</MenuItem>
                        {reportTypes.map((report) => (
                          <MenuItem key={report.id} value={report.id}>
                            {report.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel id="report-format-label">Report Format</InputLabel>
                      <Select
                        labelId="report-format-label"
                        value={reportFilters.format}
                        label="Report Format"
                        onChange={(e) => handleFilterChange('format', e.target.value as 'pdf' | 'excel' | 'csv')}
                      >
                        <MenuItem value="excel">Excel</MenuItem>
                        <MenuItem value="csv">CSV</MenuItem>
                        <MenuItem value="pdf">PDF</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
 
                  {/* Dynamic additional filters based on selected report type */}
                  {reportFilters.type !== 'all' && 
                    reportTypes.find(report => report.id === reportFilters.type)?.extraFilters?.includes('employeeId') && (
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel id="employee-filter-label">Employee</InputLabel>
                        <Select
                          labelId="employee-filter-label"
                          value={reportFilters.employeeId || 'all'}
                          label="Employee"
                          onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                        >
                          <MenuItem value="all">All Employees</MenuItem>
                          {(employeesState.employees || []).map((employee: any) => (
                            <MenuItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
 
                  {reportFilters.type !== 'all' && 
                    reportTypes.find(report => report.id === reportFilters.type)?.extraFilters?.includes('clientId') && (
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel id="client-filter-label">Client</InputLabel>
                        <Select
                          labelId="client-filter-label"
                          value={reportFilters.clientId || 'all'}
                          label="Client"
                          onChange={(e) => handleFilterChange('clientId', e.target.value)}
                        >
                          <MenuItem value="all">All Clients</MenuItem>
                          {(clientsState.items || []).map((client: any) => (
                            <MenuItem key={client.id} value={client.id}>
                              {client.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
 
                  {reportFilters.type !== 'all' && 
                    reportTypes.find(report => report.id === reportFilters.type)?.extraFilters?.includes('supplierId') && (
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel id="supplier-filter-label">Supplier</InputLabel>
                        <Select
                          labelId="supplier-filter-label"
                          value={reportFilters.supplierId || 'all'}
                          label="Supplier"
                          onChange={(e) => handleFilterChange('supplierId', e.target.value)}
                        >
                          <MenuItem value="all">All Suppliers</MenuItem>
                          {(suppliersState.items || []).map((supplier: any) => (
                            <MenuItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
 
                  {reportFilters.type !== 'all' && 
                    reportTypes.find(report => report.id === reportFilters.type)?.extraFilters?.includes('status') && (
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel id="status-filter-label">Status</InputLabel>
                        <Select
                          labelId="status-filter-label"
                          value={reportFilters.status || 'all'}
                          label="Status"
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                          <MenuItem value="all">All Statuses</MenuItem>
                          {reportFilters.type === 'inventory' ? (
                            <MenuItem value="lowStock">Low Stock Only</MenuItem>
                          ) : reportFilters.type === 'employee_attendance' ? (
                            <>
                              <MenuItem value="Present">Present</MenuItem>
                              <MenuItem value="Absent">Absent</MenuItem>
                              <MenuItem value="Late">Late</MenuItem>
                            </>
                          ) : reportFilters.type === 'payroll' ? (
                            <>
                              <MenuItem value="Draft">Draft</MenuItem>
                              <MenuItem value="Pending">Pending</MenuItem>
                              <MenuItem value="Approved">Approved</MenuItem>
                              <MenuItem value="Paid">Paid</MenuItem>
                            </>
                          ) : (
                            <>
                              <MenuItem value="Pending">Pending</MenuItem>
                              <MenuItem value="Approved">Approved</MenuItem>
                              <MenuItem value="In Progress">In Progress</MenuItem>
                              <MenuItem value="Completed">Completed</MenuItem>
                              <MenuItem value="Cancelled">Cancelled</MenuItem>
                            </>
                          )}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Button 
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={handleGenerateSelectedReport}
                      disabled={reportFilters.type === 'all' || loading}
                      fullWidth
                      sx={{ py: 1.5 }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Selected Report'}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Report Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Available Formats</TableCell>
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportTypes.map(report => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {report.icon}
                            <Typography sx={{ ml: 1 }}>
                              {report.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{report.description}</TableCell>
                        <TableCell>
                          <Box>
                            {report.availableFormats.includes('excel') && (
                              <Chip 
                                icon={<ExcelIcon />} 
                                label="Excel" 
                                size="small" 
                                sx={{ mr: 0.5 }} 
                              />
                            )}
                            {report.availableFormats.includes('csv') && (
                              <Chip 
                                icon={<ExcelIcon />} 
                                label="CSV" 
                                size="small" 
                                sx={{ mr: 0.5 }} 
                              />
                            )}
                            {report.availableFormats.includes('pdf') && (
                              <Chip 
                                icon={<PdfIcon />} 
                                label="PDF" 
                                size="small" 
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<ExcelIcon />}
                            onClick={() => {
                              // Default to Excel for direct generation to avoid PDF issues
                              setReportFilters(prev => ({...prev, format: 'excel'}));
                              handleGenerateReport(report.id);
                            }}
                            disabled={loading}
                            sx={{ mr: 1 }}
                          >
                            {loading && reportFilters.type === report.id ? 
                              <CircularProgress size={20} color="inherit" /> : 'Generate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
 
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
 
 export default ReportsList;