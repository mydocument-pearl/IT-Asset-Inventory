import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

export const db = getFirestore(app);