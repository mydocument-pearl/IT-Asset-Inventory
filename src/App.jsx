import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import {
  LayoutDashboard,
  Laptop,
  Smartphone,
  Users,
  Building2,
  FileText,
  Settings as SettingsIcon,
  Search,
  ArrowUpDown,
  TrendingUp,
  Download,
  AlertCircle,
  Database,
  CheckCircle,
  Plus,
  LogOut,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  UserCheck,
  Eye,
  KeyRound,
  Trash2
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

import { dbService } from './dbService'
import { generateOtp, formatDate, formatDateTime } from './utils'
import AddAsset from './AddAsset'
import MobileSimInventory from './MobileSimInventory'
import AddMobileAsset from './AddMobileAsset'
import AssignAsset from './AssignAsset'
import Login from './Login'
import EmployeeDirectory from './EmployeeDirectory'

function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser')
    return saved ? JSON.parse(saved) : null
  })

  // Database States
  const [assets, setAssets] = useState([])
  const [mobileAssets, setMobileAssets] = useState([])
  const [assignedAssets, setAssignedAssets] = useState([])
  const [assetHistory, setAssetHistory] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [systemUsers, setSystemUsers] = useState([])
  const [employees, setEmployees] = useState([])
  
  // App UI States
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [isFirebaseOnline, setIsFirebaseOnline] = useState(false)
  const [toasts, setToasts] = useState([])
  
  // IT Assets Filters
  const [itSearch, setItSearch] = useState('')
  const [itFilterType, setItFilterType] = useState('all')
  const [itFilterStatus, setItFilterStatus] = useState('all')
  const [itSortField, setItSortField] = useState('assetCode')
  const [itSortAsc, setItSortAsc] = useState(true)

  // Media Preview Modal
  const [previewImage, setPreviewImage] = useState(null)

  // Asset return modal states
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [returnForm, setReturnForm] = useState({
    leavingDate: '',
    returnDate: '',
    remarks: '',
    damages: '',
    dispositionStatus: 'Available'
  })
  
  // Return OTP Authentication
  const [returnOtpSent, setReturnOtpSent] = useState(false)
  const [returnOtpCode, setReturnOtpCode] = useState('')
  const [returnOtpInput, setReturnOtpInput] = useState('')
  const [returnOtpError, setReturnOtpError] = useState('')

  // Search/Filter states for Reports
  const [searchAssetCode, setSearchAssetCode] = useState('')
  const [searchSerial, setSearchSerial] = useState('')
  const [searchEmployee, setSearchEmployee] = useState('')
  const [searchAssetType, setSearchAssetType] = useState('')

  // Search/Filter states for Currently Assigned Deployments
  const [deploymentsSearch, setDeploymentsSearch] = useState('')
  const [deploymentsTypeFilter, setDeploymentsTypeFilter] = useState('all')

  // System mode
  const [dbMode, setDbMode] = useState('sync')

  // Notification helper
  const showNotification = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  // Dynamic Employee lookups
  const getEmployeePhone = (empName, fallbackPhone) => {
    if (!empName) return fallbackPhone || '-';
    const emp = employees.find(e => e.name.toLowerCase().trim() === empName.toLowerCase().trim());
    return emp?.phone && emp.phone !== '-' ? emp.phone : (fallbackPhone || '-');
  };

  const getEmployeeId = (empName, fallbackId) => {
    if (!empName) return fallbackId || '-';
    const emp = employees.find(e => e.name.toLowerCase().trim() === empName.toLowerCase().trim());
    return emp?.id && emp.id !== '-' ? emp.id : (fallbackId || '-');
  };

  // Load database on authentication
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const online = await dbService.checkConnection();
        setIsFirebaseOnline(online);

        const [loadedAssets, loadedMobile, loadedAssigned, loadedHistory, loadedLogs, loadedUsers, loadedEmployees] = await Promise.all([
          dbService.getAssets(),
          dbService.getMobileAssets(),
          dbService.getAssignedAssets(),
          dbService.getAssetHistory(),
          dbService.getActivityLogs(),
          dbService.getUsers(),
          dbService.getEmployees()
        ]);

        setAssets(loadedAssets);
        setMobileAssets(loadedMobile);
        setAssignedAssets(loadedAssigned);
        setAssetHistory(loadedHistory);
        setActivityLogs(loadedLogs);
        setSystemUsers(loadedUsers);
        setEmployees(loadedEmployees || []);
      } catch (err) {
        console.error("Failed to load inventory:", err);
        showNotification("Failed to connect to database. Falling back to local storage.", "error");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentUser])

  // Monitor network changes
  useEffect(() => {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      setIsFirebaseOnline(isOnline);
      showNotification(
        isOnline ? "Connected back online. Firebase Sync active." : "Network disconnected. Working offline.",
        isOnline ? "success" : "error"
      );
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    }
  }, [])

  // Admin approves a pending user account
  const handleApproveUser = async (usernameToApprove) => {
    if (currentUser?.role !== 'admin') {
      showNotification("Access Denied: Only Admins can approve accounts.", "error");
      return;
    }
    try {
      const updatedUsers = await dbService.approveUser(usernameToApprove);
      setSystemUsers(updatedUsers);
      showNotification(`Account for '${usernameToApprove}' has been approved!`, "success");
      
      // Save audit log
      const updatedLogs = await dbService.saveActivityLog({
        member: `${currentUser.name} (Admin)`,
        action: 'Approved User Account',
        details: `Activated login status for username: ${usernameToApprove}.`
      });
      setActivityLogs(updatedLogs);
    } catch (err) {
      console.error(err);
      showNotification("Failed to approve user account.", "error");
    }
  }

  // Populate sandbox values
  const generateMockData = async () => {
    if (currentUser?.role !== 'admin') {
      showNotification("Access Denied: Only admins can seed sample data.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const mockAssets = [
        { assetCode: "LP001", assetType: "Laptop", assetName: "ThinkPad T14", brand: "Lenovo", serialNumber: "L3N9901X", status: "Assigned", vendorName: "Lenovo Store", poNumber: "PO-991", organizationName: "On2Cook India Pvt. Ltd.", createdBy: "System Admin" },
        { assetCode: "LP002", assetType: "Laptop", assetName: "MacBook Pro M3", brand: "Apple", serialNumber: "C02F123X", status: "Available", vendorName: "Imagine", poNumber: "PO-992", organizationName: "InventIndia Innovations Pvt. Ltd.", createdBy: "System Admin" },
        { assetCode: "LP003", assetType: "Laptop", assetName: "EliteBook 840", brand: "HP", serialNumber: "HP223401", status: "Available", vendorName: "Vijay Sales", poNumber: "PO-993", organizationName: "On2Cook India Pvt. Ltd.", createdBy: "System Admin" },
        { assetCode: "MN001", assetType: "Monitor", assetName: "UltraSharp 27", brand: "Dell", serialNumber: "DL27189A", status: "Assigned", vendorName: "Dell Direct", poNumber: "PO-994", organizationName: "On2Cook India Pvt. Ltd.", createdBy: "System Admin" },
        { assetCode: "MN002", assetType: "Monitor", assetName: "Gaming 24 Inch", brand: "LG", serialNumber: "LG249912", status: "Under Repair", vendorName: "Vijay Sales", poNumber: "PO-995", organizationName: "InventIndia Innovations Pvt. Ltd.", createdBy: "System Admin" },
        { assetCode: "PR001", assetType: "Printer", assetName: "LaserJet Pro", brand: "HP", serialNumber: "HPLJ771A", status: "Available", vendorName: "Vijay Sales", poNumber: "PO-996", organizationName: "On2Cook India Pvt. Ltd.", createdBy: "System Admin" }
      ];

      const mockAssigned = [
        { employeeName: "Rahul Sharma", employeeId: "O2C-409", employeePhone: "9876543210", department: "Accounts", assetType: "Laptop", assetName: "ThinkPad T14", assetCode: "LP001", brand: "Lenovo", serialNumber: "L3N9901X", allocationDate: "2025-11-15", returnDate: "", status: "Assigned", remarks: "Standard issue accounts laptop", createdBy: "System Admin" },
        { employeeName: "Priya Mehta", employeeId: "II-201", employeePhone: "9123456780", department: "Design", assetType: "Monitor", assetName: "UltraSharp 27", assetCode: "MN001", brand: "Dell", serialNumber: "DL27189A", allocationDate: "2025-12-01", returnDate: "", status: "Assigned", remarks: "Dual monitor workspace upgrade", createdBy: "System Admin" }
      ];

      const mockHistory = [
        { assetCode: "MS001", assetType: "Mouse", assetName: "Wireless Mouse M331", serialNumber: "MS7789A", employeeName: "Amit Kumar", department: "Operations", assignedDate: "2025-01-10", returnDate: "2025-04-12", leavingDate: "2025-04-12", remarks: "Employee resigned, returned mouse in working order", status: "Returned", returnedOn: "2025-04-12T10:00:00.000Z" }
      ];

      localStorage.setItem('assets', JSON.stringify(mockAssets));
      localStorage.setItem('assignedAssets', JSON.stringify(mockAssigned));
      localStorage.setItem('assetHistory', JSON.stringify(mockHistory));

      if (isFirebaseOnline) {
        for (const item of mockAssets) await dbService.saveAsset(item);
        for (const item of mockAssigned) await dbService.saveAssignedAsset(item);
        for (const item of mockHistory) await dbService.saveAssetHistory(item);
      }

      setAssets(mockAssets);
      setAssignedAssets(mockAssigned);
      setAssetHistory(mockHistory);

      // Log action
      const updatedLogs = await dbService.saveActivityLog({
        member: `${currentUser.name} (Admin)`,
        action: 'Seeded Mock Database',
        details: 'Populated default hardware inventory, histories, and layouts.'
      });
      setActivityLogs(updatedLogs);

      showNotification("Demo Database populated successfully!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Failed to seed demo data.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  const clearAllData = () => {
    if (currentUser?.role !== 'admin') {
      showNotification("Access Denied: Only Admins can clear database caches.", "error");
      return;
    }

    if (window.confirm("Are you sure you want to delete all local inventory records? This will not delete remote Firestore data.")) {
      localStorage.removeItem('assets');
      localStorage.removeItem('assignedAssets');
      localStorage.removeItem('assetHistory');
      localStorage.removeItem('mobileAssets');
      localStorage.removeItem('activityLogs');
      localStorage.removeItem('employees');
      setAssets([]);
      setAssignedAssets([]);
      setAssetHistory([]);
      setMobileAssets([]);
      setActivityLogs([]);
      setEmployees([]);
      showNotification("Local database cleared.", "success");
    }
  }

  const handleDeleteAsset = async (assetCode) => {
    if (!isUserAdmin) return;
    if (window.confirm(`Are you sure you want to delete asset ${assetCode}? This will also delete any active assignments and lifecycle history logs associated with it.`)) {
      try {
        const result = await dbService.deleteAsset(assetCode);
        setAssets(result.assets);
        setAssignedAssets(result.assignedAssets);
        setAssetHistory(result.assetHistory);
        showNotification(`Asset ${assetCode} and its logs deleted successfully.`, "success");
        
        await dbService.saveActivityLog({
          member: `${currentUser.name} (${currentUser.role})`,
          action: 'Deleted Asset (Cascaded)',
          details: `Deleted IT hardware asset ${assetCode} along with active assignments and history.`
        });
      } catch (err) {
        console.error(err);
        showNotification("Failed to delete asset.", "error");
      }
    }
  };

  const handleDeleteAssignment = async (assetCode, employeeName) => {
    if (!isUserAdmin) return;
    if (window.confirm(`Are you sure you want to delete the active assignment record for asset ${assetCode}?`)) {
      try {
        const updated = await dbService.removeAssignedAsset(assetCode);
        setAssignedAssets(updated);
        showNotification(`Assignment record for ${assetCode} deleted successfully.`, "success");
        
        await dbService.saveActivityLog({
          member: `${currentUser.name} (${currentUser.role})`,
          action: 'Deleted Assignment Record',
          details: `Manually deleted active assignment entry of ${assetCode} assigned to ${employeeName}.`
        });
      } catch (err) {
        console.error(err);
        showNotification("Failed to delete assignment record.", "error");
      }
    }
  };

  const handleDeleteHistoryRecord = async (id, timestamp, assetCode) => {
    if (!isUserAdmin) return;
    if (window.confirm(`Are you sure you want to delete this history log record for asset ${assetCode}?`)) {
      try {
        const updated = await dbService.deleteAssetHistoryRecord(id, timestamp, assetCode);
        setAssetHistory(updated);
        showNotification("History log record deleted successfully.", "success");
        
        await dbService.saveActivityLog({
          member: `${currentUser.name} (${currentUser.role})`,
          action: 'Deleted History Entry',
          details: `Deleted historical log entry for ${assetCode}.`
        });
      } catch (err) {
        console.error(err);
        showNotification("Failed to delete history record.", "error");
      }
    }
  };



  const handleLogout = async () => {
    try {
      await dbService.saveActivityLog({
        member: `${currentUser.name} (${currentUser.role})`,
        action: 'Member Logged Out',
        details: 'User session closed successfully.'
      });
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  }

  // --- DYNAMIC CALCULATIONS FOR DASHBOARD ---
  const totalAssetsCount = assets.length + mobileAssets.length;
  
  const laptopCount = assets.filter(a => a.assetType === 'Laptop').length;
  const monitorCount = assets.filter(a => a.assetType === 'Monitor').length;
  const printerCount = assets.filter(a => a.assetType === 'Printer').length;
  
  const mobileCount = mobileAssets.filter(m => m.assetType === 'Mobile').length;
  const simCount = mobileAssets.filter(m => m.assetType === 'SIM Card').length;

  const assignedCount = assignedAssets.length;
  const availableCount = assets.filter(a => a.status === 'Available').length + mobileAssets.filter(m => m.status === 'Available').length;
  const availableMobileCount = mobileAssets.filter(m => m.status === 'Available' && m.assetType === 'Mobile').length;
  const repairCount = assets.filter(a => a.status === 'Under Repair').length + mobileAssets.filter(m => m.status === 'Under Repair').length;

  const stats = [
    { title: 'Total Assets', value: totalAssetsCount, icon: Database, color: 'text-gray-900' },
    { title: 'Laptops', value: laptopCount, icon: Laptop, color: 'text-red-600' },
    { title: 'Monitors', value: monitorCount, icon: Laptop, color: 'text-blue-500' },
    { title: 'Printers', value: printerCount, icon: FileText, color: 'text-emerald-500' },
    { title: 'Mobile Devices', value: mobileCount, icon: Smartphone, color: 'text-purple-500' },
    { title: 'SIM Cards', value: simCount, icon: Smartphone, color: 'text-amber-500' },
    { title: 'Assigned Assets', value: assignedCount, icon: Users, color: 'text-indigo-600' },
    { title: 'Available Mobile Assets', value: availableMobileCount, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Under Repair', value: repairCount, icon: AlertCircle, color: 'text-yellow-600' },
  ]

  const pieData = [
    { name: 'Laptops', value: laptopCount },
    { name: 'Monitors', value: monitorCount },
    { name: 'Mobiles', value: mobileCount },
    { name: 'SIM Cards', value: simCount },
  ].filter(item => item.value > 0);

  const barData = [
    { name: 'Assigned', value: assignedCount },
    { name: 'Available', value: availableMobileCount },
    { name: 'Repair', value: repairCount },
  ]

  // --- SORTED & FILTERED ASSIGNED DEPLOYMENTS ---
  const sortedAndFilteredDeployments = assignedAssets
    .filter(item => {
      const name = (item.employeeName || '').toLowerCase();
      const code = (item.assetCode || '').toLowerCase();
      const serial = (item.serialNumber || '').toLowerCase();
      const type = (item.assetType || '').toLowerCase();
      const assetName = (item.assetName || item.asset || '').toLowerCase();
      const queryStr = deploymentsSearch.toLowerCase();

      const matchesSearch = 
        name.includes(queryStr) ||
        code.includes(queryStr) ||
        serial.includes(queryStr) ||
        assetName.includes(queryStr);

      const matchesType = 
        deploymentsTypeFilter === 'all' || 
        type === deploymentsTypeFilter.toLowerCase() ||
        (deploymentsTypeFilter === 'SIM Card' && type === 'sim card') ||
        (deploymentsTypeFilter === 'Mobile' && type === 'mobile');

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      const nameA = (a.employeeName || '').toLowerCase().trim();
      const nameB = (b.employeeName || '').toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });

  const COLORS = ['#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b']

  // Excel Export
  const exportToExcel = () => {
    if (assignedAssets.length === 0) {
      showNotification("No assigned assets to export.", "error");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(assignedAssets.map((asset) => ({
      'Employee Name': asset.employeeName,
      'Employee ID': getEmployeeId(asset.employeeName, asset.employeeId),
      'Phone Number': getEmployeePhone(asset.employeeName, asset.employeePhone),
      'Department': asset.department,
      'Asset Type': asset.assetType,
      'Asset Name': asset.assetName,
      'Asset Code': asset.assetCode,
      'Brand': asset.brand,
      'Serial Number': asset.serialNumber,
      'Allocation Date': asset.allocationDate,
      'Return Date': asset.returnDate,
      'Status': asset.status,
      'Remarks': asset.remarks || ''
    })));

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assignments')

    if (assets.length > 0) {
      const inventoryWorksheet = XLSX.utils.json_to_sheet(assets);
      XLSX.utils.book_append_sheet(workbook, inventoryWorksheet, 'Hardware Inventory');
    }

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    })

    saveAs(data, `IT_Asset_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
    showNotification("Excel report downloaded successfully!", "success")
  }

  // PDF Print Trigger
  const triggerPdfPrint = () => {
    window.print();
  }

  // --- ASSETS TABLE FILTER/SORT LOGIC ---
  const handleSort = (field) => {
    if (itSortField === field) {
      setItSortAsc(!itSortAsc)
    } else {
      setItSortField(field)
      setItSortAsc(true)
    }
  }

  const sortedAndFilteredAssets = assets
    .filter((item) => {
      const matchesSearch = 
        item.assetName?.toLowerCase().includes(itSearch.toLowerCase()) ||
        item.assetCode?.toLowerCase().includes(itSearch.toLowerCase()) ||
        item.brand?.toLowerCase().includes(itSearch.toLowerCase()) ||
        item.serialNumber?.toLowerCase().includes(itSearch.toLowerCase());
      
      const matchesType = itFilterType === 'all' || item.assetType === itFilterType;
      const matchesStatus = itFilterStatus === 'all' || item.status === itFilterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      let valA = a[itSortField] || '';
      let valB = b[itSortField] || '';
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return itSortAsc ? -1 : 1;
      if (valA > valB) return itSortAsc ? 1 : -1;
      return 0;
    });

  // --- RETURN ASSET OTP & VALIDATION PROCESS ---
  const handleStartReturnFlow = (item) => {
    setSelectedAsset(item)
    setReturnForm({ leavingDate: '', returnDate: '', remarks: '', damages: '', dispositionStatus: 'Available' })
    setReturnOtpSent(false)
    setReturnOtpCode('')
    setReturnOtpInput('')
    setReturnOtpError('')
    setShowReturnModal(true)
  }

  const handleSendReturnOtp = () => {
    const resolvedPhone = getEmployeePhone(selectedAsset.employeeName, selectedAsset.employeePhone);
    const phone = resolvedPhone && resolvedPhone !== '-' ? resolvedPhone : '9876543210';
    const code = generateOtp()
    setReturnOtpCode(code)
    setReturnOtpSent(true)
    setReturnOtpError('')

    showNotification(`[SMS Sim] Return OTP code: ${code} sent to +91 ${phone}`, 'success')
    console.log(`%c[SMS API Simulator] Return OTP code for ${selectedAsset.employeeName} (+91 ${phone}) is: ${code}`, 'background: #222; color: #ff8800; font-size: 14px; padding: 4px;');
  }

  const handleSubmitReturn = async () => {
    if (!returnForm.returnDate) {
      showNotification("Please select return date.", "error");
      return;
    }

    if (!returnOtpSent) {
      showNotification("Please request and verify the return OTP code first.", "error");
      return;
    }

    if (returnOtpInput !== returnOtpCode) {
      setReturnOtpError("Incorrect OTP verification code.");
      return;
    }

    try {
      // 1. Remove from assigned assets collection
      const updatedAssigned = await dbService.removeAssignedAsset(selectedAsset.assetCode);
      setAssignedAssets(updatedAssigned);

      const dispStatus = returnForm.dispositionStatus || 'Available';

      // 2. Mark source asset as the selected status (Available, Lost, Stolen, Under Repair)
      const isMobile = selectedAsset.assetCode?.startsWith('MB') || selectedAsset.assetCode?.startsWith('SM') || selectedAsset.assetType === 'Mobile' || selectedAsset.assetType === 'SIM Card';
      if (isMobile) {
        const updatedMobile = await dbService.updateMobileAssetStatus(selectedAsset.assetCode, dispStatus, '-', '-');
        setMobileAssets(updatedMobile);
      } else {
        const updatedAssets = await dbService.updateAssetStatus(selectedAsset.assetCode, dispStatus);
        setAssets(updatedAssets);
      }

      // 3. Log history record
      const historyRecord = {
        assetCode: selectedAsset.assetCode,
        assetType: selectedAsset.assetType || 'Laptop',
        assetName: selectedAsset.assetName || selectedAsset.asset || 'Hardware Asset',
        serialNumber: selectedAsset.serialNumber,
        employeeName: selectedAsset.employeeName,
        department: selectedAsset.department,
        assignedDate: selectedAsset.allocationDate,
        returnDate: returnForm.returnDate,
        leavingDate: returnForm.leavingDate,
        remarks: returnForm.remarks,
        damages: returnForm.damages || 'None',
        status: dispStatus === 'Available' ? 'Returned' : dispStatus,
        returnedOn: new Date().toISOString()
      };

      const updatedHistory = await dbService.saveAssetHistory(historyRecord);
      setAssetHistory(updatedHistory);

      // 4. Save audit log
      const actionText = dispStatus === 'Available' ? 'Returned Asset (OTP Verified)' : `Marked Asset as ${dispStatus} (OTP Verified)`;
      const detailsText = dispStatus === 'Available' 
        ? `Returned ${selectedAsset.assetType} [${selectedAsset.assetCode}] from employee ${selectedAsset.employeeName}.` 
        : `Marked ${selectedAsset.assetType} [${selectedAsset.assetCode}] assigned to ${selectedAsset.employeeName} as ${dispStatus}.`;

      const updatedLogs = await dbService.saveActivityLog({
        member: `${currentUser.name} (${currentUser.role})`,
        action: actionText,
        details: detailsText
      });
      setActivityLogs(updatedLogs);

      showNotification(`Asset ${selectedAsset.assetCode} return processed successfully as ${dispStatus}.`, "success");
      setShowReturnModal(false);
      setSelectedAsset(null);
      setReturnForm({ leavingDate: '', returnDate: '', remarks: '', damages: '', dispositionStatus: 'Available' });
    } catch (err) {
      console.error(err);
      showNotification("Failed to process asset return.", "error");
    }
  }

  // Quick Action navigation
  const triggerQuickAction = (tabName) => {
    setActiveTab(tabName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Force Authenticate
  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const isUserAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-800">
      
      {/* Print stylesheet helper */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:full-width {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .glass-panel {
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            border: 1px solid #e2e8f0 !important;
            width: 100% !important;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 8px !important;
          }
        }
      `}</style>

      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none print:hidden">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 animate-fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />}
            <div>
              <p className="text-sm font-semibold">{toast.type === 'success' ? 'Success' : 'Alert'}</p>
              <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-auto text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <div className="w-72 bg-gray-950 text-slate-200 p-6 flex flex-col justify-between shrink-0 shadow-xl print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-red-600 h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-red-600/30">
              IT
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none text-white font-mono">IT Inventory</h1>
              <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Enterprise</span>
            </div>
          </div>

          {/* Connected User Profile widget */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-3.5 mb-6 flex items-center gap-3">
            <div className="bg-red-500/10 border border-red-500/30 h-9 w-9 rounded-full flex items-center justify-center font-bold text-red-500 text-xs">
              {currentUser.name.split(' ').map(n=>n[0]).join('')}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={11} className={isUserAdmin ? 'text-red-500' : 'text-slate-400'} />
                {currentUser.role}
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 cursor-pointer text-left text-sm font-semibold transition duration-150 ${
                activeTab === 'dashboard'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 active-nav-glow font-bold'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('itassets')}
              className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 cursor-pointer text-left text-sm font-semibold transition duration-150 ${
                activeTab === 'itassets'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 active-nav-glow font-bold'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Laptop size={18} />
              IT Assets
            </button>

            <button
              onClick={() => setActiveTab('mobile')}
              className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 cursor-pointer text-left text-sm font-semibold transition duration-150 ${
                activeTab === 'mobile'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 active-nav-glow font-bold'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone size={18} />
              Mobile & SIM
            </button>

            <button
              onClick={() => setActiveTab('allocation')}
              className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 cursor-pointer text-left text-sm font-semibold transition duration-150 ${
                activeTab === 'allocation'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 active-nav-glow font-bold'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={18} />
              Employee Allocation
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 cursor-pointer text-left text-sm font-semibold transition duration-150 ${
                activeTab === 'employees'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 active-nav-glow font-bold'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck size={18} />
              Employee Directory
            </button>

            <button
              onClick={() => setActiveTab('vendors')}
              className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 cursor-pointer text-left text-sm font-semibold transition duration-150 ${
                activeTab === 'vendors'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 active-nav-glow font-bold'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 size={18} />
              Vendors Registry
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 cursor-pointer text-left text-sm font-semibold transition duration-150 ${
                activeTab === 'reports'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 active-nav-glow font-bold'
                  : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText size={18} />
              Reports & History
            </button>

            {isUserAdmin && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3.5 rounded-xl px-4 py-3 cursor-pointer text-left text-sm font-semibold transition duration-150 ${
                  activeTab === 'settings'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 active-nav-glow font-bold'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <SettingsIcon size={18} />
                System Settings
              </button>
            )}
          </nav>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 rounded-xl px-4 py-3 text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-left text-sm font-semibold cursor-pointer transition"
          >
            <LogOut size={18} />
            Sign Out
          </button>

          <div className="border-t border-slate-900 pt-4 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Database size={14} className={isFirebaseOnline ? 'text-emerald-500' : 'text-slate-600'} />
              <span>Mode: {isFirebaseOnline ? 'Firestore Sync' : 'Local Storage'}</span>
            </div>
            <span className={`h-2 w-2 rounded-full ${isFirebaseOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8 print:full-width print:p-0">
        
        {/* Top Header */}
        <header className="flex justify-between items-center mb-8 border-b border-slate-200 pb-5 print:hidden">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight capitalize">
              {activeTab === 'itassets' ? 'IT Inventory' : activeTab === 'allocation' ? 'Asset Assignments' : activeTab === 'mobile' ? 'Mobile / SIM Suite' : activeTab === 'vendors' ? 'Vendors Registry' : activeTab === 'reports' ? 'Reports & History' : activeTab === 'employees' ? 'Employee Directory' : activeTab}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === 'dashboard' && `Welcome, ${currentUser.name}! Monitor and deploy company assets in real-time.`}
              {activeTab === 'itassets' && 'Add, filter, and track laptops, monitors, accessories, and components.'}
              {activeTab === 'mobile' && 'Track company cellular networks, SIM keys, and mobile inventory.'}
              {activeTab === 'allocation' && 'Assign company hardware assets to registered workers.'}
              {activeTab === 'employees' && 'Register and manage company employee records, departments, and organizations.'}
              {activeTab === 'vendors' && 'Manage procurement contacts, purchase routes, and vendor listings.'}
              {activeTab === 'reports' && 'Review lifecycle logs, returned assets, and member audit trails.'}
              {activeTab === 'settings' && 'Configure database connections and approve pending user registrations.'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
            <span>Server Time: {formatDate(new Date())}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
            <span>Role: {currentUser.role.toUpperCase()}</span>
          </div>
        </header>

        {isLoading ? (
          <div className="min-h-[400px] flex items-center justify-center flex-col gap-3 text-slate-500">
            <div className="h-8 w-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold">Synchronizing Inventory Datasets...</p>
          </div>
        ) : (
          <>
            {/* ---------------- DASHBOARD TAB ---------------- */}
            {activeTab === 'dashboard' && (
              <div className="space-y-10 animate-fade-in print:hidden">
                
                {/* KPI cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {stats.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={index}
                        className="glass-panel rounded-2xl p-6 hover:shadow-lg transition duration-200 hover:-translate-y-0.5 flex justify-between items-start"
                      >
                        <div>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                            {item.title}
                          </p>
                          <h3 className="text-4xl font-extrabold text-slate-900 mt-2">
                            {item.value}
                          </h3>
                        </div>
                        <div className={`p-3 rounded-xl bg-slate-100/80 ${item.color}`}>
                          <Icon size={24} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Dashboard Charts & Insights */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Asset Category Distribution (Pie Chart) */}
                  <div className="glass-panel rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-red-500" size={18} />
                        Asset Distribution
                      </h3>
                      <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full font-semibold text-slate-500">
                        By Category
                      </span>
                    </div>

                    <div className="h-80 flex items-center justify-center">
                      {pieData.length === 0 ? (
                        <p className="text-slate-400 text-sm font-medium">Add assets to view distribution</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={85}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} Assets`, 'Count']} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Status Overview (Bar Chart) */}
                  <div className="glass-panel rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-red-500" size={18} />
                        Asset Status Overview
                      </h3>
                      <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full font-semibold text-slate-500">
                        Deployability
                      </span>
                    </div>

                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" fontSize={12} />
                          <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                          <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Bottom row: Recent Activity & Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Activity Log */}
                  <div className="glass-panel rounded-2xl p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-800 mb-5">
                      Recent Activity Log
                    </h3>
                    <div className="space-y-4">
                      {assetHistory.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-sm text-slate-400 font-medium">No actions logged yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Assign and return hardware to build logs.</p>
                        </div>
                      ) : (
                        assetHistory.slice(-4).reverse().map((activity, index) => (
                          <div key={index} className="flex gap-4 items-start pb-4 border-b border-slate-100 last:border-b-0 last:pb-0">
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                              activity.status === 'Returned' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              <CheckCircle size={16} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-800">
                                {activity.assetName} ({activity.assetCode}) - {activity.status}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Logged by worker {activity.employeeName} ({activity.department})
                              </p>
                              {activity.remarks && (
                                <p className="text-xs bg-slate-50 border border-slate-100 text-slate-500 rounded p-1.5 mt-2 italic">
                                  &quot;{activity.remarks}&quot;
                                </p>
                              )}
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                              {activity.returnedOn ? new Date(activity.returnedOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Quick Actions Panel */}
                  <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-5">Quick Actions</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => triggerQuickAction('itassets')}
                          className="w-full bg-red-600 hover:bg-red-700 hover:shadow-md transition text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus size={16} />
                          Add Hardware Asset
                        </button>
                        <button
                          onClick={() => triggerQuickAction('mobile')}
                          className="w-full bg-slate-900 hover:bg-black hover:shadow-md transition text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus size={16} />
                          Add Mobile / SIM
                        </button>
                        <button
                          onClick={() => triggerQuickAction('allocation')}
                          className="w-full border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition text-slate-700 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Users size={16} />
                          Assign Hardware
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={exportToExcel}
                      className="w-full mt-6 bg-white border border-slate-200 hover:border-red-500 hover:text-red-600 hover:shadow-sm text-slate-600 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition duration-150"
                    >
                      <Download size={16} />
                      Generate Excel Report
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- IT ASSETS TAB ---------------- */}
            {activeTab === 'itassets' && (
              <div className="space-y-8 animate-fade-in print:hidden">
                {/* Form to Add Asset */}
                <AddAsset assets={assets} setAssets={setAssets} showNotification={showNotification} />

                {/* Table of Assets */}
                <div className="glass-panel rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        Saved Hardware Assets
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage all physical inventory cards here.
                      </p>
                    </div>

                    {/* Table Filters */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="relative w-full md:w-56">
                        <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                        <input
                          type="text"
                          value={itSearch}
                          onChange={(e) => setItSearch(e.target.value)}
                          placeholder="Search assets..."
                          className="glass-input w-full rounded-xl pl-10 pr-4 py-2 text-sm outline-none"
                        />
                      </div>

                      <select
                        value={itFilterType}
                        onChange={(e) => setItFilterType(e.target.value)}
                        className="glass-input rounded-xl px-3 py-2 text-sm outline-none"
                      >
                        <option value="all">All Types</option>
                        <option>Laptop</option>
                        <option>Monitor</option>
                        <option>Printer</option>
                        <option>CPU</option>
                        <option>Keyboard</option>
                        <option>Mouse</option>
                      </select>

                      <select
                        value={itFilterStatus}
                        onChange={(e) => setItFilterStatus(e.target.value)}
                        className="glass-input rounded-xl px-3 py-2 text-sm outline-none"
                      >
                        <option value="all">All Statuses</option>
                        <option>Available</option>
                        <option>Assigned</option>
                        <option>Under Repair</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                        <tr>
                          <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('assetCode')}>
                            <div className="flex items-center gap-1.5">
                              Asset Code
                              <ArrowUpDown size={14} className="text-slate-400" />
                            </div>
                          </th>
                          <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('assetName')}>
                            <div className="flex items-center gap-1.5">
                              Asset Name
                              <ArrowUpDown size={14} className="text-slate-400" />
                            </div>
                          </th>
                          <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('brand')}>
                            <div className="flex items-center gap-1.5">
                              Brand
                              <ArrowUpDown size={14} className="text-slate-400" />
                            </div>
                          </th>
                          <th className="p-4 font-bold">Serial Number</th>
                          <th className="p-4 font-bold">Organization</th>
                          <th className="p-4 font-bold text-center">Invoice</th>
                          <th className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition" onClick={() => handleSort('status')}>
                            <div className="flex items-center gap-1.5">
                              Status
                              <ArrowUpDown size={14} className="text-slate-400" />
                            </div>
                          </th>
                          {isUserAdmin && <th className="p-4 font-bold text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedAndFilteredAssets.length === 0 ? (
                          <tr>
                            <td colSpan={isUserAdmin ? 8 : 7} className="p-8 text-center text-slate-400 font-medium">
                              No hardware assets found matching the criteria.
                            </td>
                          </tr>
                        ) : (
                          sortedAndFilteredAssets.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/50 transition">
                              <td className="p-4 font-mono font-bold text-slate-800">{item.assetCode}</td>
                              <td className="p-4 font-medium text-slate-700">{item.assetName}</td>
                              <td className="p-4 text-slate-600">{item.brand}</td>
                              <td className="p-4 text-slate-600 font-mono text-xs">{item.serialNumber}</td>
                              <td className="p-4 text-slate-500 text-xs">{item.organizationName || '-'}</td>
                              <td className="p-4 text-center">
                                {item.invoiceImage ? (
                                  <button
                                    onClick={() => setPreviewImage(item.invoiceImage)}
                                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-bold cursor-pointer"
                                  >
                                    <Eye size={13} />
                                    View
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  item.status === 'Assigned'
                                    ? 'bg-rose-100 text-rose-800'
                                    : item.status === 'Available'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.status === 'Lost' || item.status === 'Stolen'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              {isUserAdmin && (
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleDeleteAsset(item.assetCode)}
                                    className="text-red-600 hover:text-red-800 hover:scale-110 active:scale-95 transition duration-150 cursor-pointer"
                                    title="Delete Asset"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- MOBILE & SIM TAB ---------------- */}
            {activeTab === 'mobile' && (
              <div className="space-y-8 animate-fade-in print:hidden">
                <AddMobileAsset mobileAssets={mobileAssets} onMobileAssetAdded={setMobileAssets} showNotification={showNotification} />
                <MobileSimInventory
                  mobileAssets={mobileAssets}
                  setMobileAssets={setMobileAssets}
                  setAssignedAssets={setAssignedAssets}
                  setAssetHistory={setAssetHistory}
                  showNotification={showNotification}
                  isUserAdmin={isUserAdmin}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* ---------------- ALLOCATION TAB ---------------- */}
            {activeTab === 'allocation' && (
              <div className="space-y-8 animate-fade-in print:hidden">
                <AssignAsset
                  assets={assets}
                  setAssets={setAssets}
                  mobileAssets={mobileAssets}
                  setMobileAssets={setMobileAssets}
                  assignedAssets={assignedAssets}
                  employees={employees}
                  showNotification={showNotification}
                  addAssignedAsset={(data) => {
                    const updated = [...assignedAssets, data];
                    setAssignedAssets(updated);
                  }}
                />

                {/* Assigned Assets Table */}
                <div className="glass-panel rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        Currently Assigned Deployments
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Live map of workers deploying active hardware.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search deployments..."
                          value={deploymentsSearch}
                          onChange={(e) => setDeploymentsSearch(e.target.value)}
                          className="glass-input text-xs pl-8 pr-3 py-2 rounded-xl w-60 outline-none"
                        />
                        <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                      </div>

                      {/* Type Filter */}
                      <select
                        value={deploymentsTypeFilter}
                        onChange={(e) => setDeploymentsTypeFilter(e.target.value)}
                        className="glass-input text-xs px-3 py-2 rounded-xl outline-none text-slate-655 font-medium"
                      >
                        <option value="all">All Categories</option>
                        <option value="Mobile">Mobiles Only</option>
                        <option value="SIM Card">SIM Cards Only</option>
                        <option value="Laptop">Laptops Only</option>
                        <option value="Monitor">Monitors Only</option>
                        <option value="Printer">Printers Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                        <tr>
                          <th className="p-4 font-bold">Employee</th>
                          <th className="p-4 font-bold">Department</th>
                          <th className="p-4 font-bold">Asset Type</th>
                          <th className="p-4 font-bold">Asset Code</th>
                          <th className="p-4 font-bold">Serial / Phone</th>
                          <th className="p-4 font-bold">Allocation Date</th>
                          <th className="p-4 font-bold">Status</th>
                          <th className="p-4 font-bold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedAndFilteredDeployments.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                              {deploymentsSearch ? "No matching deployments found." : "No assets currently assigned to employees."}
                            </td>
                          </tr>
                        ) : (
                          sortedAndFilteredDeployments.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/50 transition">
                              <td className="p-4">
                                <div className="font-semibold text-slate-800">{item.employeeName}</div>
                                <div className="text-xs text-slate-400 font-mono">{getEmployeeId(item.employeeName, item.employeeId)}</div>
                              </td>
                              <td className="p-4 text-slate-600 font-medium">{item.department}</td>
                              <td className="p-4 text-slate-600">{item.assetName || item.asset || 'Laptop'}</td>
                              <td className="p-4 font-mono font-bold text-slate-700">{item.assetCode}</td>
                              <td className="p-4">
                                <div className="text-xs text-slate-600 font-mono">{item.serialNumber}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{getEmployeePhone(item.employeeName, item.employeePhone)}</div>
                              </td>
                              <td className="p-4 text-slate-600 font-medium">
                                  {item.allocationDate ? formatDate(item.allocationDate) : '-'}
                              </td>
                              <td className="p-4">
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleStartReturnFlow(item)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3.5 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer"
                                  >
                                    Return Asset
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- EMPLOYEE DIRECTORY TAB ---------------- */}
            {activeTab === 'employees' && (
              <EmployeeDirectory
                employees={employees}
                setEmployees={setEmployees}
                showNotification={showNotification}
                currentUser={currentUser}
              />
            )}

            {/* ---------------- VENDORS TAB ---------------- */}
            {activeTab === 'vendors' && (
              <div className="glass-panel rounded-2xl p-6 animate-fade-in print:hidden">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Verified Vendors Registry</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Procurement pipelines and distributor details.</p>
                  </div>
                  <button
                    onClick={() => showNotification("Vendor registrations can be added under Settings.", "error")}
                    className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    Register Vendor
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {[
                    { name: 'Vijay Sales', contact: 'orders@vijaysales.com', phone: '+91 22 6108 4444', items: 'Laptops, Monitors, Keyboards, Accessories', status: 'Preferred' },
                    { name: 'Reliance Digital', contact: 'corporate@reliancedigital.in', phone: '+91 22 4001 2233', items: 'Mobiles, SIM Plans, Tablets', status: 'Active' },
                    { name: 'Dell Corporate Store', contact: 'in_corporate_sales@dell.com', phone: '1800-425-4026', items: 'Latitude Laptops, Optiplex CPUs', status: 'Active' },
                    { name: 'Imagine Apple Premium Reseller', contact: 'apple_orders@imagine.com', phone: '+91 99012 34567', items: 'MacBooks, iPads, iPhones', status: 'Active' }
                  ].map((vendor, idx) => (
                    <div key={idx} className="border border-slate-100 bg-white rounded-xl p-5 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <h4 className="text-base font-bold text-slate-800">{vendor.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          vendor.status === 'Preferred' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>{vendor.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold mt-2">{vendor.items}</p>
                      
                      <div className="mt-4 pt-4 border-t border-slate-50 space-y-1 text-xs text-slate-400">
                        <div>Email: <span className="text-slate-600 font-semibold">{vendor.contact}</span></div>
                        <div>Phone: <span className="text-slate-600 font-semibold font-mono">{vendor.phone}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------- REPORTS & HISTORY TAB ---------------- */}
            {activeTab === 'reports' && (
              <div className="space-y-10 animate-fade-in print:full-width">
                
                {/* Reports Header / Toolbox */}
                <div className="glass-panel rounded-2xl p-6 print:hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Historical Lifecycle Logs</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Database log of completed loops, returns, and disposals.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={triggerPdfPrint}
                        className="bg-red-600 hover:bg-red-700 hover:shadow-md transition text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer size={14} />
                        Print PDF Report
                      </button>
                      <button
                        onClick={exportToExcel}
                        className="border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition duration-150"
                      >
                        <FileSpreadsheet size={14} />
                        Export to Excel
                      </button>
                    </div>
                  </div>

                  {/* Filter inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Asset Code</label>
                      <input
                        type="text"
                        placeholder="Filter LP001..."
                        value={searchAssetCode}
                        onChange={(e) => setSearchAssetCode(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Serial Number</label>
                      <input
                        type="text"
                        placeholder="Filter serial..."
                        value={searchSerial}
                        onChange={(e) => setSearchSerial(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Employee Name</label>
                      <input
                        type="text"
                        placeholder="Filter worker..."
                        value={searchEmployee}
                        onChange={(e) => setSearchEmployee(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Asset Type</label>
                      <input
                        type="text"
                        placeholder="Filter Laptop..."
                        value={searchAssetType}
                        onChange={(e) => setSearchAssetType(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Printable Layout Wrapper */}
                <div className="glass-panel rounded-2xl overflow-hidden print:border-none print:shadow-none">
                  <div className="p-6 border-b border-slate-100 hidden print:block">
                    <h1 className="text-2xl font-bold text-slate-900">IT Asset Lifecycle History Report</h1>
                    <p className="text-xs text-slate-500 mt-1">Generated by: {currentUser.name} ({currentUser.role}) on {formatDate(new Date())}</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 font-bold">Asset Code</th>
                          <th className="px-4 py-3 font-bold">Asset Type</th>
                          <th className="px-4 py-3 font-bold">Asset Name</th>
                          <th className="px-4 py-3 font-bold">Serial Number</th>
                          <th className="px-4 py-3 font-bold">Employee</th>
                          <th className="px-4 py-3 font-bold">Department</th>
                          <th className="px-4 py-3 font-bold">Assign Date</th>
                          <th className="px-4 py-3 font-bold">Return Date</th>
                          <th className="px-4 py-3 font-bold">Remarks</th>
                          <th className="px-4 py-3 font-bold">Damages</th>
                          <th className="px-4 py-3 font-bold">Status</th>
                          {isUserAdmin && <th className="px-4 py-3 font-bold text-right print:hidden">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {assetHistory
                          .filter((item) => {
                            const matchesCode = (item.assetCode || '').toLowerCase().includes(searchAssetCode.toLowerCase());
                            const matchesSerial = String(item.serialNumber || '').toLowerCase().includes(searchSerial.toLowerCase());
                            const matchesEmployee = (item.employeeName || '').toLowerCase().includes(searchEmployee.toLowerCase());
                            const matchesType = (item.assetType || '').toLowerCase().includes(searchAssetType.toLowerCase());
                            return matchesCode && matchesSerial && matchesEmployee && matchesType;
                          })
                          .map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/50 transition">
                              <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{item.assetCode}</td>
                              <td className="px-4 py-3.5 text-slate-600 font-semibold">{item.assetType}</td>
                              <td className="px-4 py-3.5 text-slate-700 font-medium">{item.assetName}</td>
                              <td className="px-4 py-3.5 text-slate-500 font-mono">{item.serialNumber}</td>
                              <td className="px-4 py-3.5 text-slate-800 font-semibold">{item.employeeName}</td>
                              <td className="px-4 py-3.5 text-slate-600">{item.department}</td>
                              <td className="px-4 py-3.5 text-slate-600">
                                {item.assignedDate ? formatDate(item.assignedDate) : ''}
                              </td>
                              <td className="px-4 py-3.5 text-slate-600">
                                {item.returnDate ? formatDate(item.returnDate) : ''}
                              </td>
                              <td className="px-4 py-3.5 text-slate-500 italic max-w-xs truncate">{item.remarks}</td>
                              <td className="px-4 py-3.5 text-rose-600 font-semibold max-w-xs truncate">{item.damages || 'None'}</td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                                  {item.status || 'Returned'}
                                </span>
                              </td>
                              {isUserAdmin && (
                                <td className="px-4 py-3.5 text-right print:hidden">
                                  <button
                                    onClick={() => handleDeleteHistoryRecord(item.id, item.timestamp, item.assetCode)}
                                    className="p-1.5 text-red-650 hover:text-red-800 transition duration-150 cursor-pointer hover:scale-110 active:scale-95"
                                    title="Delete History Log Entry"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        {assetHistory.length === 0 && (
                          <tr>
                            <td colSpan={isUserAdmin ? 12 : 11} className="p-8 text-center text-slate-400 font-medium">
                              No log events captured.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Trail Log - Only for System Admin Interface, hidden in Print */}
                {isUserAdmin && (
                  <div className="glass-panel rounded-2xl p-6 print:hidden">
                    <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                      <UserCheck className="text-red-500" size={20} />
                      Member Activity & Security Audit Logs
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-100 text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                          <tr>
                            <th className="p-3 font-bold">Timestamp</th>
                            <th className="p-3 font-bold">Authorized Account</th>
                            <th className="p-3 font-bold">Action Type</th>
                            <th className="p-3 font-bold">Logged Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {activityLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                                No system activities recorded yet.
                              </td>
                            </tr>
                          ) : (
                            activityLogs.slice().reverse().map((log, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition">
                                <td className="p-3 font-mono text-slate-400">
                                  {formatDateTime(log.timestamp)}
                                </td>
                                <td className="p-3 font-semibold text-slate-700">{log.member}</td>
                                <td className="p-3">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full font-bold ${
                                    log.action.includes('OTP') || log.action.includes('Logged')
                                      ? 'bg-blue-50 text-blue-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 font-medium">{log.details}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ---------------- SYSTEM SETTINGS TAB ---------------- */}
            {activeTab === 'settings' && isUserAdmin && (
              <div className="glass-panel rounded-2xl p-6 space-y-8 animate-fade-in print:hidden">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">System Preferences</h3>
                  <p className="text-xs text-slate-400 mt-1">Configure sync parameters and local caching drivers.</p>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-6">
                  
                  {/* Account Approval Panel - Admin Only */}
                  {isUserAdmin && (
                    <div className="space-y-4 pb-6 border-b border-slate-100">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <UserCheck className="text-red-500" size={18} />
                        Pending Member Registrations
                      </h4>
                      <p className="text-xs text-slate-400">
                        Approve signup requests submitted by inventory officers to grant database access.
                      </p>
                      
                      <div className="grid grid-cols-1 gap-3 max-w-xl">
                        {systemUsers.filter(u => u.status === 'Pending').length === 0 ? (
                          <div className="p-4 text-center bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 font-semibold">
                            No pending sign-up requests.
                          </div>
                        ) : (
                          systemUsers.filter(u => u.status === 'Pending').map((user, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                              <div>
                                <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                <p className="text-xs text-slate-400 font-mono">username: {user.username}</p>
                              </div>
                              <button
                                onClick={() => handleApproveUser(user.username)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm"
                              >
                                Approve Account
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}



                  {/* Database Sync Mode Option */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">Database Driver Integration</label>
                    <p className="text-xs text-slate-400 mt-1">Tweak client routing rules between live remote database services and local caches.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div
                        onClick={() => setDbMode('sync')}
                        className={`border rounded-xl p-4 cursor-pointer transition ${
                          dbMode === 'sync'
                            ? 'bg-red-50 border-red-500 shadow-sm shadow-red-500/5'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                          <Database className="text-red-500" size={16} />
                          Hybrid Firestore Mode
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          Synchronizes changes continuously with remote Firestore endpoints. Automatically falls back to localized buffers when network signals decay.
                        </p>
                      </div>

                      <div
                        onClick={() => {
                          setDbMode('local');
                          showNotification("Local-Only driver selected. Data remains locally scoped.", "error");
                        }}
                        className={`border rounded-xl p-4 cursor-pointer transition ${
                          dbMode === 'local'
                            ? 'bg-red-50 border-red-500 shadow-sm shadow-red-500/5'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                          <Database className="text-slate-400" size={16} />
                          Offline Cache Only
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          Locks write permissions within localized sandbox. Saves performance overheads, but disables remote dashboards from viewing adjustments.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Seed / Factory Mock Actions */}
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800">Demo Testing Suite (Restricted to Admin)</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Use these utilities to mock out complete registries in sandbox containers for UI evaluations or presentations.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-4">
                      <button
                        onClick={generateMockData}
                        disabled={!isUserAdmin}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                          isUserAdmin 
                            ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer hover:shadow-md' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Populate Demo Data
                      </button>
                      <button
                        onClick={clearAllData}
                        disabled={!isUserAdmin}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition ${
                          isUserAdmin 
                            ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 cursor-pointer' 
                            : 'border-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        Purge Local Cache
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------------- RETURN ASSET MODAL with OTP ---------------- */}
      {showReturnModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in print:hidden">
          <div className="glass-panel bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                Process Return: {selectedAsset.assetCode}
              </h3>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1 text-xs">
                <div>Asset Code: <span className="font-mono font-bold text-slate-700">{selectedAsset.assetCode}</span></div>
                <div>Asset Name: <span className="font-semibold text-slate-700">{selectedAsset.assetName || selectedAsset.asset}</span></div>
                <div>Deployer: <span className="font-semibold text-slate-700">{selectedAsset.employeeName}</span></div>
                <div>Phone: <span className="font-mono font-semibold text-slate-700">{getEmployeePhone(selectedAsset.employeeName, selectedAsset.employeePhone)}</span></div>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Leaving Date (Optional)</label>
                <input
                  type="date"
                  value={returnForm.leavingDate}
                  onChange={(e) => setReturnForm({ ...returnForm, leavingDate: e.target.value })}
                  className="w-full glass-input p-3 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Return Date *</label>
                <input
                  type="date"
                  value={returnForm.returnDate}
                  onChange={(e) => setReturnForm({ ...returnForm, returnDate: e.target.value })}
                  className="w-full glass-input p-3 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Return Status / Asset Condition *</label>
                <select
                  value={returnForm.dispositionStatus}
                  onChange={(e) => setReturnForm({ ...returnForm, dispositionStatus: e.target.value })}
                  className="w-full glass-input p-3 rounded-xl text-sm outline-none bg-white text-slate-700 font-medium"
                >
                  <option value="Available">Available (Returned to Stock)</option>
                  <option value="Lost">Lost (Misplaced / Missing)</option>
                  <option value="Stolen">Stolen (Theft / Burglary)</option>
                  <option value="Under Repair">Under Repair (Faulty / Damaged)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Remarks / Diagnostics Notes</label>
                <textarea
                  rows="2"
                  placeholder="Note physical damage, reason of return, or diagnostic issues..."
                  value={returnForm.remarks}
                  onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                  className="w-full glass-input p-3 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-500 uppercase">Damages / Defect Notes (If any)</label>
                <textarea
                  rows="2"
                  placeholder="E.g. cracked screen, missing charger, or type 'None'..."
                  value={returnForm.damages}
                  onChange={(e) => setReturnForm({ ...returnForm, damages: e.target.value })}
                  className="w-full glass-input p-3 rounded-xl text-sm outline-none"
                />
              </div>

              {/* OTP Authentication Layer */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase">Employee Authentication *</label>
                
                {!returnOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendReturnOtp}
                    className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-sm"
                  >
                    <KeyRound size={14} />
                    Send Return OTP to Employee
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400">OTP code dispatched. Enter code to authorize return.</p>
                    
                    <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-center text-xs font-semibold font-mono text-amber-700 mb-2 animate-pulse">
                      TESTING OTP: {returnOtpCode}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={returnOtpInput}
                        onChange={(e) => setReturnOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter 6-digit OTP"
                        className="flex-1 glass-input rounded-xl px-3 py-2 text-sm font-semibold tracking-wider font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSendReturnOtp}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-500 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Resend
                      </button>
                    </div>
                    {returnOtpError && (
                      <p className="text-[10px] text-red-500 font-semibold">{returnOtpError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowReturnModal(false)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
              >
                Close Window
              </button>
              <button
                onClick={handleSubmitReturn}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
              >
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- INVOICE PICTURE MODAL preview ---------------- */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full bg-white/10 rounded-2xl overflow-hidden p-2 shadow-2xl border border-white/10 animate-fade-in" onClick={e=>e.stopPropagation()}>
            <img src={previewImage} alt="Invoice Document" className="w-full h-auto max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-black/80 transition"
            >
              &times;
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default App