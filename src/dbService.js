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
    const localRaw = JSON.parse(localStorage.getItem('assets')) || [];
    const localSeen = new Set();
    const local = [];
    localRaw.forEach(item => {
      const code = (item.assetCode || '').toLowerCase().trim();
      if (code && !localSeen.has(code)) {
        localSeen.add(code);
        local.push(item);
      }
    });
    localStorage.setItem('assets', JSON.stringify(local));

    if (!isFirebaseEnabled()) return local;

    try {
      const querySnapshot = await getDocs(collection(db, 'assets'));
      const fbAssets = [];
      querySnapshot.forEach((doc) => {
        fbAssets.push({ id: doc.id, ...doc.data() });
      });
      
      const seenCodes = new Set();
      const uniqueFbAssets = [];
      const duplicateDocs = [];

      fbAssets.forEach(item => {
        const code = (item.assetCode || '').toLowerCase().trim();
        if (code && !seenCodes.has(code)) {
          seenCodes.add(code);
          uniqueFbAssets.push(item);
        } else {
          duplicateDocs.push(item);
        }
      });

      // Background clean up of duplicate documents in firestore
      if (duplicateDocs.length > 0) {
        duplicateDocs.forEach(async (dup) => {
          if (dup.id) {
            try {
              await deleteDoc(doc(db, 'assets', dup.id));
            } catch (delErr) {
              console.error("Firestore asset duplicate delete failed:", delErr);
            }
          }
        });
      }

      // Sync local storage with latest Firestore (always sync if online)
      localStorage.setItem('assets', JSON.stringify(uniqueFbAssets));
      return uniqueFbAssets;
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
    const existingCodes = new Set(local.map(item => (item.assetCode || '').toLowerCase().trim()));
    const dedupedNew = newAssets.filter(item => {
      const code = (item.assetCode || '').toLowerCase().trim();
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        return true;
      }
      return false;
    });

    const updated = [...local, ...dedupedNew];
    localStorage.setItem('assets', JSON.stringify(updated));

    if (isFirebaseEnabled() && dedupedNew.length > 0) {
      try {
        const promises = dedupedNew.map(asset => addDoc(collection(db, 'assets'), asset));
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

  async deleteAsset(assetCode) {
    // 1. Delete from assets
    const localAssets = JSON.parse(localStorage.getItem('assets')) || [];
    const updatedAssets = localAssets.filter(asset => asset.assetCode !== assetCode);
    localStorage.setItem('assets', JSON.stringify(updatedAssets));

    // 2. Delete from assignedAssets
    const localAssigned = JSON.parse(localStorage.getItem('assignedAssets')) || [];
    const updatedAssigned = localAssigned.filter(item => item.assetCode !== assetCode);
    localStorage.setItem('assignedAssets', JSON.stringify(updatedAssigned));

    // 3. Delete from assetHistory
    const localHistory = JSON.parse(localStorage.getItem('assetHistory')) || [];
    const updatedHistory = localHistory.filter(item => item.assetCode !== assetCode);
    localStorage.setItem('assetHistory', JSON.stringify(updatedHistory));

    if (isFirebaseEnabled()) {
      try {
        // Delete from 'assets' in Firestore
        const q1 = query(collection(db, 'assets'), where('assetCode', '==', assetCode));
        const s1 = await getDocs(q1);
        s1.forEach(async (document) => {
          await deleteDoc(doc(db, 'assets', document.id));
        });

        // Delete from 'assignedAssets' in Firestore
        const q2 = query(collection(db, 'assignedAssets'), where('assetCode', '==', assetCode));
        const s2 = await getDocs(q2);
        s2.forEach(async (document) => {
          await deleteDoc(doc(db, 'assignedAssets', document.id));
        });

        // Delete from 'assetHistory' in Firestore
        const q3 = query(collection(db, 'assetHistory'), where('assetCode', '==', assetCode));
        const s3 = await getDocs(q3);
        s3.forEach(async (document) => {
          await deleteDoc(doc(db, 'assetHistory', document.id));
        });
      } catch (error) {
        console.error("Firestore cascaded delete failed:", error);
      }
    }
    return {
      assets: updatedAssets,
      assignedAssets: updatedAssigned,
      assetHistory: updatedHistory
    };
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

      localStorage.setItem('assignedAssets', JSON.stringify(fbAssigned));
      return fbAssigned;
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

      localStorage.setItem('assetHistory', JSON.stringify(fbHistory));
      return fbHistory;
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
    const localRaw = JSON.parse(localStorage.getItem('mobileAssets')) || [];

    const localSeen = new Set();
    const local = [];
    localRaw.forEach(item => {
      const code = (item.assetCode || '').toLowerCase().trim();
      if (code && !localSeen.has(code)) {
        localSeen.add(code);
        local.push(item);
      }
    });
    localStorage.setItem('mobileAssets', JSON.stringify(local));

    if (!isFirebaseEnabled()) return local;

    try {
      const querySnapshot = await getDocs(collection(db, 'mobileAssets'));
      const fbMobile = [];
      querySnapshot.forEach((doc) => {
        fbMobile.push({ id: doc.id, ...doc.data() });
      });

      const seenCodes = new Set();
      const uniqueFbMobile = [];
      const duplicateDocs = [];

      fbMobile.forEach(item => {
        const code = (item.assetCode || '').toLowerCase().trim();
        if (code && !seenCodes.has(code)) {
          seenCodes.add(code);
          uniqueFbMobile.push(item);
        } else {
          duplicateDocs.push(item);
        }
      });

      // Background clean up of duplicate documents in firestore
      if (duplicateDocs.length > 0) {
        duplicateDocs.forEach(async (dup) => {
          if (dup.id) {
            try {
              await deleteDoc(doc(db, 'mobileAssets', dup.id));
            } catch (delErr) {
              console.error("Firestore duplicate delete failed:", delErr);
            }
          }
        });
      }

      localStorage.setItem('mobileAssets', JSON.stringify(uniqueFbMobile));
      return uniqueFbMobile;
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
    const existingCodes = new Set(local.map(item => (item.assetCode || '').toLowerCase().trim()));
    const dedupedNew = newItems.filter(item => {
      const code = (item.assetCode || '').toLowerCase().trim();
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        return true;
      }
      return false;
    });

    let currentLength = local.length;
    const itemsWithSr = dedupedNew.map((item, index) => ({
      ...item,
      sr: currentLength + index + 1
    }));
    const updated = [...local, ...itemsWithSr];
    localStorage.setItem('mobileAssets', JSON.stringify(updated));

    if (isFirebaseEnabled() && itemsWithSr.length > 0) {
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

  async deleteMobileAsset(assetCode) {
    // 1. Delete from mobileAssets
    const localMobile = JSON.parse(localStorage.getItem('mobileAssets')) || [];
    const updatedMobile = localMobile.filter(item => item.assetCode !== assetCode);
    localStorage.setItem('mobileAssets', JSON.stringify(updatedMobile));

    // 2. Delete from assignedAssets
    const localAssigned = JSON.parse(localStorage.getItem('assignedAssets')) || [];
    const updatedAssigned = localAssigned.filter(item => item.assetCode !== assetCode);
    localStorage.setItem('assignedAssets', JSON.stringify(updatedAssigned));

    // 3. Delete from assetHistory
    const localHistory = JSON.parse(localStorage.getItem('assetHistory')) || [];
    const updatedHistory = localHistory.filter(item => item.assetCode !== assetCode);
    localStorage.setItem('assetHistory', JSON.stringify(updatedHistory));

    if (isFirebaseEnabled()) {
      try {
        // Delete from 'mobileAssets' in Firestore
        const q1 = query(collection(db, 'mobileAssets'), where('assetCode', '==', assetCode));
        const s1 = await getDocs(q1);
        s1.forEach(async (document) => {
          await deleteDoc(doc(db, 'mobileAssets', document.id));
        });

        // Delete from 'assignedAssets' in Firestore
        const q2 = query(collection(db, 'assignedAssets'), where('assetCode', '==', assetCode));
        const s2 = await getDocs(q2);
        s2.forEach(async (document) => {
          await deleteDoc(doc(db, 'assignedAssets', document.id));
        });

        // Delete from 'assetHistory' in Firestore
        const q3 = query(collection(db, 'assetHistory'), where('assetCode', '==', assetCode));
        const s3 = await getDocs(q3);
        s3.forEach(async (document) => {
          await deleteDoc(doc(db, 'assetHistory', document.id));
        });
      } catch (error) {
        console.error("Firestore mobile cascaded delete failed:", error);
      }
    }
    return {
      mobileAssets: updatedMobile,
      assignedAssets: updatedAssigned,
      assetHistory: updatedHistory
    };
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

  // ------------------ EMPLOYEES ------------------
  async getEmployees() {
    const local = JSON.parse(localStorage.getItem('employees')) || [];
    if (!isFirebaseEnabled()) return local;

    try {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const fbEmployees = [];
      querySnapshot.forEach((doc) => {
        fbEmployees.push({ id: doc.id, ...doc.data() });
      });

      localStorage.setItem('employees', JSON.stringify(fbEmployees));
      return fbEmployees;
    } catch (error) {
      console.warn("Firestore fetch failed for employees, using local storage:", error);
      return local;
    }
  },

  async saveBulkEmployees(newEmployees) {
    const local = JSON.parse(localStorage.getItem('employees')) || [];
    // Filter out duplicates based on lowercased name + id combination
    const existingKeys = new Set(local.map(e => `${(e.name || '').trim().toLowerCase()}_${(e.id || '').trim().toLowerCase()}`));
    const dedupedNew = newEmployees.filter(emp => {
      const key = `${(emp.name || '').trim().toLowerCase()}_${(emp.id || '').trim().toLowerCase()}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        return true;
      }
      return false;
    });

    const updated = [...local, ...dedupedNew];
    localStorage.setItem('employees', JSON.stringify(updated));

    if (isFirebaseEnabled() && dedupedNew.length > 0) {
      try {
        const promises = dedupedNew.map(emp => addDoc(collection(db, 'employees'), emp));
        await Promise.all(promises);
      } catch (error) {
        console.error("Firestore bulk write failed for employees, saved locally:", error);
      }
    }
    return updated;
  },

  async deleteAssetHistoryRecord(id, timestamp, assetCode) {
    const local = JSON.parse(localStorage.getItem('assetHistory')) || [];
    const updated = local.filter(item => {
      if (id && item.id === id) return false;
      if (timestamp && item.timestamp === timestamp) return false;
      if (!id && !timestamp && item.assetCode === assetCode) return false;
      return true;
    });
    localStorage.setItem('assetHistory', JSON.stringify(updated));

    if (isFirebaseEnabled()) {
      try {
        if (id) {
          const docRef = doc(db, 'assetHistory', id);
          await deleteDoc(docRef);
        } else {
          const q = query(
            collection(db, 'assetHistory'),
            where('assetCode', '==', assetCode)
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(async (document) => {
            const data = document.data();
            if (!timestamp || data.timestamp === timestamp) {
              await deleteDoc(doc(db, 'assetHistory', document.id));
            }
          });
        }
      } catch (error) {
        console.error("Firestore history delete failed:", error);
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
