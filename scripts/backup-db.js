/* eslint-env node */
/**
 * SECURE FIREBASE FIRESTORE AES-256 ENCRYPTED BACKUP UTILITY
 * 
 * This CLI utility securely exports your inventory collections from Firebase Firestore,
 * serializes them into JSON, and encrypts the output locally using AES-256-CBC.
 * This guarantees that even if your backups are stored in a public bucket or local drive,
 * they remain completely unreadable without your master passphrase.
 * 
 * PRE-REQUISITES:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Download your Firebase Service Account JSON from:
 *    Firebase Console > Project Settings > Service Accounts > Generate new private key.
 * 3. Save the key in your project root as `service-account.json` (Add to .gitignore!).
 * 
 * USAGE:
 * - Backup (Encrypt):
 *   node scripts/backup-db.js backup <passphrase>
 * 
 * - Restore / Decrypt:
 *   node scripts/backup-db.js decrypt <passphrase> <encrypted-file-path>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// CLI Commands
const command = process.argv[2];
const passphrase = process.argv[3];
const targetFilePath = process.argv[4];

if (!command || !passphrase) {
  console.log(`
Usage:
  Backup & Encrypt:  node scripts/backup-db.js backup <passphrase>
  Decrypt Backup:    node scripts/backup-db.js decrypt <passphrase> <encrypted-file-path>
  `);
  process.exit(1);
}

// AES-256 Configurations
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits

// Derive a secure 32-byte key from the user-provided passphrase using PBKDF2
function deriveKey(pass, salt) {
  return crypto.pbkdf2Sync(pass, salt, 100000, KEY_LENGTH, 'sha256');
}

// ------------------ BACKUP & ENCRYPT COMMAND ------------------
async function runBackup() {
  const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(`\nError: Service account key not found at ${serviceAccountPath}`);
    console.error('Please generate a private key in the Firebase Console and save it as "service-account.json" to continue.');
    process.exit(1);
  }

  console.log('Initializing Firebase Admin connection...');
  const admin = require('firebase-admin');
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();
  const collections = ['assets', 'mobileAssets', 'assignedAssets', 'assetHistory'];
  const snapshotData = {};

  console.log('Fetching Firestore collections...');
  for (const collectionName of collections) {
    try {
      const querySnapshot = await db.collection(collectionName).get();
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      snapshotData[collectionName] = documents;
      console.log(`- Retrieved ${documents.length} records from collection: "${collectionName}"`);
    } catch (err) {
      console.warn(`Warning: Could not fetch collection "${collectionName}":`, err.message);
    }
  }

  // Encrypt JSON
  const rawJSON = JSON.stringify(snapshotData);
  console.log('Generating encryption variables...');
  
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(passphrase, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(rawJSON, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Format backup payload: salt (32 hex) + iv (32 hex) + encryptedData
  const backupPayload = salt.toString('hex') + iv.toString('hex') + encrypted;

  // Save to file
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir);
  }

  const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
  const backupFileName = `inventory_backup_${timestamp}.enc`;
  const backupPath = path.join(backupsDir, backupFileName);

  fs.writeFileSync(backupPath, backupPayload, 'utf8');

  console.log(`\n======================================================`);
  console.log(`SUCCESS: Encrypted backup saved to:`);
  console.log(`👉 ${backupPath}`);
  console.log(`This backup is fully encrypted. Keep your passphrase safe!`);
  console.log(`======================================================`);
}

// ------------------ DECRYPT COMMAND ------------------
function runDecrypt() {
  if (!targetFilePath) {
    console.error('Error: Decrypt command requires the path to the encrypted file.');
    console.error('Usage: node scripts/backup-db.js decrypt <passphrase> <file-path>');
    process.exit(1);
  }

  const absolutePath = path.resolve(targetFilePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: Backup file not found at ${absolutePath}`);
    process.exit(1);
  }

  console.log(`Reading backup file from ${absolutePath}...`);
  const rawPayload = fs.readFileSync(absolutePath, 'utf8').trim();

  try {
    // Parse Payload: salt(32 chars) + iv(32 chars) + data
    const saltHex = rawPayload.slice(0, 32);
    const ivHex = rawPayload.slice(32, 64);
    const encryptedData = rawPayload.slice(64);

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const key = deriveKey(passphrase, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const restoredData = JSON.parse(decrypted);
    
    // Save readable JSON snapshot
    const outputJsonPath = absolutePath.replace(/\.enc$/, '_decrypted.json');
    fs.writeFileSync(outputJsonPath, JSON.stringify(restoredData, null, 2), 'utf8');

    console.log(`\n======================================================`);
    console.log(`SUCCESS: Decryption complete!`);
    console.log(`Decrypted data written to:`);
    console.log(`👉 ${outputJsonPath}`);
    console.log(`======================================================`);

  } catch (err) {
    console.error('\nDecryption Failed: Invalid passphrase or corrupted backup file.', err.message);
    process.exit(1);
  }
}

// Command router
if (command === 'backup') {
  runBackup();
} else if (command === 'decrypt') {
  runDecrypt();
} else {
  console.error(`Error: Unknown command "${command}". Use "backup" or "decrypt".`);
  process.exit(1);
}
