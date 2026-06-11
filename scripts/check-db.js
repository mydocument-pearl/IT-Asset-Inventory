import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

const collections = ['assets', 'mobileAssets', 'assignedAssets', 'assetHistory', 'activityLogs', 'employees'];

async function check() {
  console.log("Analyzing Firestore database...");
  for (const name of collections) {
    try {
      const querySnapshot = await getDocs(collection(db, name));
      console.log(`\nCollection "${name}": ${querySnapshot.size} documents.`);
      
      const codes = {};
      const imeis = {};
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const code = data.assetCode || data.id || '';
        const imei = data.imei || data.serialNumber || data.simNumber || '';
        const empName = data.employeeName || data.employee || data.name || '';

        if (code) {
          codes[code] = (codes[code] || 0) + 1;
        }
        if (imei && imei !== '-') {
          imeis[imei] = (imeis[imei] || []).concat([{ id: doc.id, empName, code }]);
        }
      });

      const duplicateCodes = Object.keys(codes).filter(c => codes[c] > 1);
      if (duplicateCodes.length > 0) {
        console.log(`  -> Duplicate codes found: ${duplicateCodes.join(', ')}`);
      }

      const duplicateImeis = Object.keys(imeis).filter(i => imeis[i].length > 1);
      if (duplicateImeis.length > 0) {
        console.log(`  -> Duplicate IMEIs/Serials/Numbers found:`);
        duplicateImeis.forEach(imei => {
          console.log(`     IMEI: "${imei}" appears ${imeis[imei].length} times:`);
          imeis[imei].forEach(occ => {
            console.log(`       - DocID: ${occ.id}, Code: ${occ.code}, Employee: ${occ.empName}`);
          });
        });
      }
    } catch (err) {
      console.error(`Error reading "${name}":`, err.message);
    }
  }
  process.exit(0);
}

check();
