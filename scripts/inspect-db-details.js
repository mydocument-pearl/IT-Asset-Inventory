import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function inspect() {
  try {
    const q = query(collection(db, 'assignedAssets'), where('assetType', '==', 'SIM Card'));
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} SIM card assignments in Firestore:`);
    querySnapshot.forEach(doc => {
      console.log(`Doc ID: ${doc.id}`);
      console.log(doc.data());
    });
  } catch (err) {
    console.error("Failed to inspect:", err);
  }
  process.exit(0);
}

inspect();
