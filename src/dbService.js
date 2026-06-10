import { db } from './firebase'
import { collection, getDocs, addDoc, doc, updateDoc, query, where, deleteDoc } from 'firebase/firestore'

// Fallback checking helper
const isFirebaseEnabled = () => {
  return typeof window !== 'undefined' && navigator.onLine;
}

export const dbService = {
  // Sync status indicator
  async checkConnection() {
    if (!isFirebaseEnabled()) return false;
    try {
      // Access db app config to perform a light check
      return !!db.app;
    } catch {
      return false;
    }
  },

  // ------------------ ASSETS ------------------
  async getAssets() {
    const local = JSON.parse(localStorage.getItem('assets')) || [];
    if (!isFirebaseEnabled()) return local;

    try {
      const querySnapshot = await getDocs(collection(db, 'assets'));
      const fbAssets = [];
      querySnapshot.forEach((doc) => {
        fbAssets.push({ id: doc.id, ...doc.data() });
      });
      
      // Sync local storage with latest Firestore if Firestore has data
      if (fbAssets.length > 0) {
        localStorage.setItem('assets', JSON.stringify(fbAssets));
        return fbAssets;
      }
      return local;
    } catch (error) {
      console.warn("Firestore fetch failed, using local storage:", error);
      return local;
    }
  },

  async saveAsset(asset) {
    const local = JSON.parse(localStorage.getItem('assets')) || [];
    const updated = [...local, asset];
    localStorage.setItem('assets', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        await addDoc(collection(db, 'assets'), asset);
      } catch (error) {
        console.error("Firestore write failed, saved locally:", error);
      }
    }
    return updated;
  },

  async saveBulkAssets(newAssets) {
    const local = JSON.parse(localStorage.getItem('assets')) || [];
    const updated = [...local, ...newAssets];
    localStorage.setItem('assets', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        const promises = newAssets.map(asset => addDoc(collection(db, 'assets'), asset));
        await Promise.all(promises);
      } catch (error) {
        console.error("Firestore bulk write failed, saved locally:", error);
      }
    }
    return updated;
  },

  async updateAssetStatus(assetCode, newStatus) {
    const local = JSON.parse(localStorage.getItem('assets')) || [];
    const updated = local.map(asset => 
      asset.assetCode === assetCode ? { ...asset, status: newStatus } : asset
    );
    localStorage.setItem('assets', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        const q = query(collection(db, 'assets'), where('assetCode', '==', assetCode));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          const assetRef = doc(db, 'assets', document.id);
          await updateDoc(assetRef, { status: newStatus });
        });
      } catch (error) {
        console.error("Firestore update failed, updated locally:", error);
      }
    }
    return updated;
  },

  // ------------------ ASSIGNED ASSETS ------------------
  async getAssignedAssets() {
    const local = JSON.parse(localStorage.getItem('assignedAssets')) || [];
    if (!isFirebaseEnabled()) return local;

    try {
      const querySnapshot = await getDocs(collection(db, 'assignedAssets'));
      const fbAssigned = [];
      querySnapshot.forEach((doc) => {
        fbAssigned.push({ id: doc.id, ...doc.data() });
      });

      if (fbAssigned.length > 0) {
        localStorage.setItem('assignedAssets', JSON.stringify(fbAssigned));
        return fbAssigned;
      }
      return local;
    } catch (error) {
      console.warn("Firestore fetch failed, using local storage:", error);
      return local;
    }
  },

  async saveAssignedAsset(assignedAsset) {
    const local = JSON.parse(localStorage.getItem('assignedAssets')) || [];
    const updated = [...local, assignedAsset];
    localStorage.setItem('assignedAssets', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        await addDoc(collection(db, 'assignedAssets'), assignedAsset);
      } catch (error) {
        console.error("Firestore write failed, saved locally:", error);
      }
    }
    return updated;
  },

  async removeAssignedAsset(assetCode) {
    const local = JSON.parse(localStorage.getItem('assignedAssets')) || [];
    const updated = local.filter(asset => asset.assetCode !== assetCode);
    localStorage.setItem('assignedAssets', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        const q = query(collection(db, 'assignedAssets'), where('assetCode', '==', assetCode));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          const docRef = doc(db, 'assignedAssets', document.id);
          await deleteDoc(docRef);
        });
      } catch (error) {
        console.error("Firestore delete failed, updated locally:", error);
      }
    }
    return updated;
  },

  // ------------------ ASSET HISTORY ------------------
  async getAssetHistory() {
    const local = JSON.parse(localStorage.getItem('assetHistory')) || [];
    if (!isFirebaseEnabled()) return local;

    try {
      const querySnapshot = await getDocs(collection(db, 'assetHistory'));
      const fbHistory = [];
      querySnapshot.forEach((doc) => {
        fbHistory.push({ id: doc.id, ...doc.data() });
      });

      if (fbHistory.length > 0) {
        localStorage.setItem('assetHistory', JSON.stringify(fbHistory));
        return fbHistory;
      }
      return local;
    } catch (error) {
      console.warn("Firestore fetch failed, using local storage:", error);
      return local;
    }
  },

  async saveAssetHistory(historyRecord) {
    const local = JSON.parse(localStorage.getItem('assetHistory')) || [];
    const updated = [...local, historyRecord];
    localStorage.setItem('assetHistory', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        await addDoc(collection(db, 'assetHistory'), historyRecord);
      } catch (error) {
        console.error("Firestore write failed, saved locally:", error);
      }
    }
    return updated;
  },

  // ------------------ MOBILE ASSETS ------------------
  async getMobileAssets() {
    const local = JSON.parse(localStorage.getItem('mobileAssets')) || [
      {
        sr: 1,
        assetCode: 'MB001',
        assetType: 'Mobile',
        employee: 'Rahul Sharma',
        department: 'Accounts',
        brand: 'Samsung',
        model: 'Galaxy S23',
        imei: '352478965214785',
        simCompany: 'Airtel',
        simNumber: '9876543210',
        status: 'Allocated',
        vendor: 'Vijay Sales',
        organizationName: 'On2Cook India Pvt. Ltd.',
        invoiceNumber: 'INV-9988',
        purchaseDate: '2025-01-10',
        invoiceDate: '2025-01-10',
        amount: 75000,
        quantity: 1
      },
      {
        sr: 2,
        assetCode: 'SM001',
        assetType: 'SIM Card',
        employee: 'Priya Mehta',
        department: 'HR',
        brand: '-',
        model: '-',
        imei: '874512369874563',
        simCompany: 'Jio',
        simNumber: '9123456780',
        status: 'Available',
        vendor: 'Reliance Digital',
        organizationName: 'InventIndia Innovations Pvt. Ltd.',
        invoiceNumber: 'INV-1122',
        purchaseDate: '2025-02-15',
        invoiceDate: '2025-02-15',
        amount: 500,
        quantity: 5
      }
    ];

    if (!isFirebaseEnabled()) return local;

    try {
      const querySnapshot = await getDocs(collection(db, 'mobileAssets'));
      const fbMobile = [];
      querySnapshot.forEach((doc) => {
        fbMobile.push({ id: doc.id, ...doc.data() });
      });

      if (fbMobile.length > 0) {
        localStorage.setItem('mobileAssets', JSON.stringify(fbMobile));
        return fbMobile;
      } else {
        // If Firestore is empty, seed it with default data
        for (const item of local) {
          await addDoc(collection(db, 'mobileAssets'), item);
        }
        return local;
      }
    } catch (error) {
      console.warn("Firestore fetch failed, using local storage:", error);
      return local;
    }
  },

  async saveMobileAsset(mobileAsset) {
    const local = JSON.parse(localStorage.getItem('mobileAssets')) || [];
    const nextSr = local.length + 1;
    const itemWithSr = { ...mobileAsset, sr: nextSr };
    const updated = [...local, itemWithSr];
    localStorage.setItem('mobileAssets', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        await addDoc(collection(db, 'mobileAssets'), itemWithSr);
      } catch (error) {
        console.error("Firestore write failed, saved locally:", error);
      }
    }
    return updated;
  },

  async saveBulkMobileAssets(newItems) {
    const local = JSON.parse(localStorage.getItem('mobileAssets')) || [];
    let currentLength = local.length;
    const itemsWithSr = newItems.map((item, index) => ({
      ...item,
      sr: currentLength + index + 1
    }));
    const updated = [...local, ...itemsWithSr];
    localStorage.setItem('mobileAssets', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        const promises = itemsWithSr.map(item => addDoc(collection(db, 'mobileAssets'), item));
        await Promise.all(promises);
      } catch (error) {
        console.error("Firestore bulk write failed, saved locally:", error);
      }
    }
    return updated;
  },

  async updateMobileAssetStatus(identifier, status, employee = '-', department = '-') {
    const local = JSON.parse(localStorage.getItem('mobileAssets')) || [];
    const updated = local.map(item => 
      (item.assetCode === identifier || item.imei === identifier || item.simNumber === identifier)
        ? { ...item, status, employee, department }
        : item
    );
    localStorage.setItem('mobileAssets', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        const q1 = query(collection(db, 'mobileAssets'), where('assetCode', '==', identifier));
        const s1 = await getDocs(q1);
        s1.forEach(async (document) => {
          const docRef = doc(db, 'mobileAssets', document.id);
          await updateDoc(docRef, { status, employee, department });
        });

        const q2 = query(collection(db, 'mobileAssets'), where('imei', '==', identifier));
        const s2 = await getDocs(q2);
        s2.forEach(async (document) => {
          const docRef = doc(db, 'mobileAssets', document.id);
          await updateDoc(docRef, { status, employee, department });
        });
      } catch (error) {
        console.error("Firestore update failed for mobile asset:", error);
      }
    }
    return updated;
  },

  // ------------------ USERS ------------------
  async getUsers() {
    const defaultUsers = [
      { username: 'admin', password: 'password123', name: 'System Admin', role: 'admin', status: 'Approved' },
      { username: 'member', password: 'password123', name: 'Inventory Officer', role: 'member', status: 'Approved' }
    ];
    const local = JSON.parse(localStorage.getItem('users')) || defaultUsers;
    
    // Write back defaults if not set in local
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify(defaultUsers));
    }

    if (!isFirebaseEnabled()) return local;

    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fbUsers = [];
      querySnapshot.forEach((doc) => {
        fbUsers.push({ id: doc.id, ...doc.data() });
      });

      if (fbUsers.length > 0) {
        // Sync local storage
        localStorage.setItem('users', JSON.stringify(fbUsers));
        return fbUsers;
      } else {
        // Seed remote
        for (const u of local) {
          await addDoc(collection(db, 'users'), u);
        }
        return local;
      }
    } catch (error) {
      console.warn("Firestore user fetch failed, using local storage:", error);
      return local;
    }
  },

  async saveUser(user) {
    const local = await this.getUsers();
    // Check if user already exists
    if (local.some(u => u.username === user.username)) {
      throw new Error("Username already taken.");
    }
    const updated = [...local, user];
    localStorage.setItem('users', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        await addDoc(collection(db, 'users'), user);
      } catch (error) {
        console.error("Firestore user write failed:", error);
      }
    }
    return updated;
  },

  async approveUser(username) {
    const local = await this.getUsers();
    const updated = local.map(u => u.username === username ? { ...u, status: 'Approved' } : u);
    localStorage.setItem('users', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (document) => {
          const docRef = doc(db, 'users', document.id);
          await updateDoc(docRef, { status: 'Approved' });
        });
      } catch (error) {
        console.error("Firestore user approval failed:", error);
      }
    }
    return updated;
  },

  // ------------------ ACTIVITY LOGS ------------------
  async getActivityLogs() {
    const local = JSON.parse(localStorage.getItem('activityLogs')) || [];
    if (!isFirebaseEnabled()) return local;

    try {
      const querySnapshot = await getDocs(collection(db, 'activityLogs'));
      const fbLogs = [];
      querySnapshot.forEach((doc) => {
        fbLogs.push({ id: doc.id, ...doc.data() });
      });

      if (fbLogs.length > 0) {
        localStorage.setItem('activityLogs', JSON.stringify(fbLogs));
        return fbLogs;
      }
      return local;
    } catch (error) {
      console.warn("Firestore logs fetch failed, using local:", error);
      return local;
    }
  },

  async saveActivityLog(logRecord) {
    const local = JSON.parse(localStorage.getItem('activityLogs')) || [];
    const itemWithTime = {
      ...logRecord,
      timestamp: new Date().toISOString()
    };
    const updated = [...local, itemWithTime];
    localStorage.setItem('activityLogs', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        await addDoc(collection(db, 'activityLogs'), itemWithTime);
      } catch (error) {
        console.error("Firestore log write failed:", error);
      }
    }
    return updated;
  }
}
