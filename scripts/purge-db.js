import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function purge() {
  console.log("Starting Firebase Firestore purge...");
  for (const name of collections) {
    try {
      const colRef = collection(db, name);
      const querySnapshot = await getDocs(colRef);
      console.log(`Deleting ${querySnapshot.size} documents from collection "${name}"...`);
      const promises = [];
      querySnapshot.forEach((document) => {
        promises.push(deleteDoc(doc(db, name, document.id)));
      });
      await Promise.all(promises);
      console.log(`Cleared collection "${name}".`);
    } catch (err) {
      console.error(`Failed to clear collection "${name}":`, err.message);
    }
  }
  console.log("Firebase Firestore purge complete!");
  process.exit(0);
}

purge();
