import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyBXGKo1UXlvNeRr28tueApjKYnNe7FRjc0",
  authDomain: "it-asset-inventory-b5a30.firebaseapp.com",
  projectId: "it-asset-inventory-b5a30",
  storageBucket: "it-asset-inventory-b5a30.firebasestorage.app",
  messagingSenderId: "520131335850",
  appId: "1:520131335850:web:6515c8b345bd385bd762d3",
  measurementId: "G-GGKF063WD1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const filePath = process.argv[2];
if (!filePath) {
  console.error("\nError: Please provide the path to the Excel file.");
  console.error("Usage: node scripts/import-assignments.js <excel-file-path>\n");
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`\nError: File not found at ${absolutePath}\n`);
  process.exit(1);
}

function parseDateString(val) {
  if (!val) return '';
  if (!isNaN(val)) {
    try {
      const dateObj = XLSX.SSF.parse_date_code(Number(val));
      const y = dateObj.y;
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch {}
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const y = match[3];
    return `${y}-${m}-${d}`;
  }
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}
  return str;
}

async function runImport() {
  try {
    console.log("Loading Excel spreadsheet...");
    const workbook = XLSX.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet);

    if (rawRows.length === 0) {
      console.error("Error: The spreadsheet sheet is empty.");
      process.exit(1);
    }

    console.log(`Found ${rawRows.length} rows. Loading current Firestore records...`);

    // Fetch existing codes to prevent conflicts & detect duplicates
    const mobileSnapshot = await getDocs(collection(db, 'mobileAssets'));
    const imeiMap = new Map();
    const simNoMap = new Map();
    const existingCodes = [];

    mobileSnapshot.forEach(doc => {
      const data = doc.data();
      const code = data.assetCode || '';
      existingCodes.push(code);

      const imei = (data.imei || '').toLowerCase().trim();
      const simNo = (data.simNumber || '').toLowerCase().trim();
      const simImei = (data.simImei || '').toLowerCase().trim();

      if (imei && imei !== '-') {
        if (data.assetType === 'SIM Card') {
          simNoMap.set(imei, { docId: doc.id, ...data });
        } else {
          imeiMap.set(imei, { docId: doc.id, ...data });
        }
      }
      if (simNo && simNo !== '-') {
        simNoMap.set(simNo, { docId: doc.id, ...data });
      }
      if (simImei && simImei !== '-') {
        simNoMap.set(simImei, { docId: doc.id, ...data });
      }
    });

    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    const existingEmployees = [];
    employeesSnapshot.forEach(doc => {
      const d = doc.data();
      existingEmployees.push(`${(d.name || '').toLowerCase()}_${(d.id || '').toLowerCase()}`);
    });

    // Helper to find next code
    const getNextCode = (prefix) => {
      let maxNum = 0;
      const allCodes = [...existingCodes].filter(c => c.startsWith(prefix));
      allCodes.forEach(code => {
        const numPart = code.substring(prefix.length);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      });
      return prefix + String(maxNum + 1).padStart(3, '0');
    };

    console.log("Processing and writing records to Firestore...");

    let successCount = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const getVal = (possibleKeys) => {
        for (const key of possibleKeys) {
          const exactKey = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_-]/g, '') === key.toLowerCase().replace(/[\s_-]/g, ''));
          if (exactKey !== undefined && row[exactKey] !== undefined) {
            return String(row[exactKey]).trim();
          }
        }
        return '';
      };

      const employeeName = getVal(['Employee Name', 'Name', 'EmployeeName']);
      const employeeId = getVal(['Employee ID', 'EmployeeCode', 'ID', 'Code']);
      const employeePhone = getVal(['Phone Number', 'Phone', 'Mobile', 'MobileNumber']);
      const department = getVal(['Department', 'Dept']);
      const organization = getVal(['Organization Name', 'Organization', 'Company', 'Org']);
      const rawType = getVal(['Asset Type', 'assetType', 'Type']);
      let brand = getVal(['Brand', 'MobileBrand', 'SIMCompany', 'Company']);
      const model = getVal(['Model', 'MobileModel']);
      const imei = getVal(['IMEI 1', 'imei1', 'IMEI', 'SIM Number', 'SIMNo', 'Number']);
      const simImei = getVal(['SIM IMEI', 'simImei', 'SIMSerialNumber', 'SIMSerial', 'IMEI 2', 'imei2']);
      const dateRaw = getVal(['Allocation Date', 'allocationDate', 'Date', 'Purchase Date']);
      const amount = getVal(['Amount', 'Price', 'Cost']);
      const vendor = getVal(['Vendor Name', 'vendorName', 'Vendor']);
      const invoice = getVal(['Invoice Number', 'invoiceNumber', 'Invoice']);

      if (!rawType) {
        console.warn(`- Skipping Row ${i + 2}: Missing Asset Type.`);
        continue;
      }

      const hasEmployee = employeeName && employeeName.trim() !== '';

      const typeLower = rawType.toLowerCase();
      const isMobile = typeLower.includes('mobile') || typeLower === 'phone';
      const isSIM = typeLower.includes('sim');

      if (!isMobile && !isSIM) {
        console.warn(`- Skipping Row ${i + 2}: Invalid Asset Type "${rawType}".`);
        continue;
      }

      const cleanDate = parseDateString(dateRaw) || new Date().toISOString().split('T')[0];

      // Check if device already exists in DB
      let existingDevice = null;
      const deviceIdentifier = isMobile ? imei : (simImei || imei);
      if (isMobile && deviceIdentifier && deviceIdentifier !== '-') {
        existingDevice = imeiMap.get(deviceIdentifier.toLowerCase().trim());
      } else if (isSIM && deviceIdentifier && deviceIdentifier !== '-') {
        existingDevice = simNoMap.get(deviceIdentifier.toLowerCase().trim());
      }

      let cleanCode = '';
      let deviceDocId = '';

      if (existingDevice) {
        cleanCode = existingDevice.assetCode;
        deviceDocId = existingDevice.docId;
        console.log(`- Device with Identifier "${deviceIdentifier}" already exists (Code: ${cleanCode}). Updating status.`);
      } else {
        const assetPrefix = isMobile ? 'MB' : 'SM';
        cleanCode = getNextCode(assetPrefix);
        existingCodes.push(cleanCode);
      }

      // 1. Add Employee to Directory if not already present
      if (hasEmployee) {
        const empKey = `${employeeName.toLowerCase()}_${(employeeId || '').toLowerCase()}`;
        if (!existingEmployees.includes(empKey)) {
          const empPayload = {
            name: employeeName,
            id: employeeId || '-',
            phone: employeePhone || '-',
            gender: '-',
            department: department || '-',
            organization: organization || 'On2Cook India Pvt. Ltd.'
          };
          await addDoc(collection(db, 'employees'), empPayload);
          existingEmployees.push(empKey);
        }
      }

      // 2. Save or Update Mobile Asset Inventory Item
      if (existingDevice) {
        const deviceRef = doc(db, 'mobileAssets', deviceDocId);
        await updateDoc(deviceRef, {
          status: hasEmployee ? 'Allocated' : 'Available',
          employee: hasEmployee ? employeeName : '-',
          department: hasEmployee ? (department || '-') : '-',
          organizationName: organization || existingDevice.organizationName || '-'
        });
      } else {
        const mobileAssetPayload = {
          assetType: isMobile ? 'Mobile' : 'SIM Card',
          assetCode: cleanCode,
          vendorName: vendor || '-',
          invoiceNumber: invoice || '-',
          purchaseDate: cleanDate,
          invoiceDate: cleanDate,
          amount: amount ? Number(amount) : 0,
          quantity: 1,
          organizationName: organization || '-',
          invoiceImage: '',
          status: hasEmployee ? 'Allocated' : 'Available',
          employee: hasEmployee ? employeeName : '-',
          department: hasEmployee ? (department || '-') : '-',
          brand: isMobile ? (brand || '-') : '-',
          model: isMobile ? (model || '-') : '-',
          imei: deviceIdentifier || '-',
          imei2: '-',
          simCompany: isSIM ? (brand || 'SIM') : '-',
          simNumber: '-',
          simImei: isSIM ? (deviceIdentifier || '-') : '-',
          createdBy: 'System Importer',
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'mobileAssets'), mobileAssetPayload);
        // Cache this new device so next rows can match it too if needed
        const newDeviceData = { docId: docRef.id, ...mobileAssetPayload };
        if (isMobile && deviceIdentifier && deviceIdentifier !== '-') imeiMap.set(deviceIdentifier.toLowerCase().trim(), newDeviceData);
        if (isSIM && deviceIdentifier && deviceIdentifier !== '-') simNoMap.set(deviceIdentifier.toLowerCase().trim(), newDeviceData);
      }

      if (hasEmployee) {
        // 3. Save Active Assignment
        const assignmentPayload = {
          employeeName,
          employeeId: employeeId || '-',
          employeePhone: employeePhone || '-',
          department: department || '-',
          assetType: isMobile ? 'Mobile' : 'SIM Card',
          assetName: isMobile ? `${brand} ${model}` : `${brand || 'SIM'} (${deviceIdentifier})`,
          assetCode: cleanCode,
          serialNumber: deviceIdentifier || '-',
          allocationDate: cleanDate,
          returnDate: '',
          remarks: 'Imported from backend spreadsheet',
          status: 'Assigned',
          createdBy: 'System Importer',
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'assignedAssets'), assignmentPayload);

        // 4. Log Lifecycle History
        const historyPayload = {
          assetCode: cleanCode,
          assetType: isMobile ? 'Mobile' : 'SIM Card',
          assetName: isMobile ? `${brand} ${model}` : `${brand || 'SIM'} (${deviceIdentifier})`,
          serialNumber: deviceIdentifier || '-',
          employeeName,
          department: department || '-',
          assignedDate: cleanDate,
          returnDate: '',
          leavingDate: '',
          remarks: 'Bulk imported allocation record',
          status: 'Assigned',
          timestamp: new Date().toISOString()
        };
        await addDoc(collection(db, 'assetHistory'), historyPayload);
      }

      successCount++;
    }

    console.log(`\n======================================================`);
    console.log(`SUCCESS: Successfully imported ${successCount} allocations.`);
    console.log(`======================================================`);
    process.exit(0);
  } catch (err) {
    console.error("Import failed with error:", err);
    process.exit(1);
  }
}

runImport();
