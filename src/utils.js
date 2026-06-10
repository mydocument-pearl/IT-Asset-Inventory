/**
 * Helper Utilities for IT Asset Inventory
 */

/**
 * Generate a random 6-digit numeric OTP
 * @returns {string}
 */
export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Compress an image file to under target size (KB) using Canvas resizing and quality scaling.
 * Returns a Base64 encoded string.
 * @param {File} file 
 * @param {number} targetSizeKB 
 * @returns {Promise<string>}
 */
export function compressImage(file, targetSizeKB = 50) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension constraints to keep memory low
        const maxDimension = 800;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress iteratively by reducing quality
        let quality = 0.9;
        let base64 = canvas.toDataURL('image/jpeg', quality);
        
        // Calculate approximate size in KB
        // base64 size = (binary length * 4) / 3. So size in bytes is roughly (length * 0.75)
        let sizeKB = (base64.length * 0.75) / 1024;

        while (sizeKB > targetSizeKB && quality > 0.1) {
          quality -= 0.15;
          base64 = canvas.toDataURL('image/jpeg', quality);
          sizeKB = (base64.length * 0.75) / 1024;
        }

        resolve(base64);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Format date string into DD-MM-YYYY format
 * @param {string|Date} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  
  // If it's already in DD-MM-YYYY format, keep it consistent with dashes
  if (typeof dateStr === 'string') {
    const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    const match = dateStr.match(dmyRegex);
    if (match) {
      const dd = match[1].padStart(2, '0');
      const mm = match[2].padStart(2, '0');
      const yyyy = match[3];
      return `${dd}-${mm}-${yyyy}`;
    }
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format timestamp into DD-MM-YYYY HH:MM:SS format
 * @param {string|number} timestamp 
 * @returns {string}
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return String(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Robustly parse an Excel cell value into standard YYYY-MM-DD string
 * @param {any} val
 * @returns {string}
 */
export function excelDateToDateString(val) {
  if (val === undefined || val === null) return '';
  
  // If it is an Excel date serial (numeric representation of dates, usually 5 digits like 46174)
  const numVal = Number(val);
  if (!isNaN(numVal) && numVal > 10000 && numVal < 100000) {
    const date = new Date(Math.round((numVal - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const str = String(val).trim();
  if (!str) return '';

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
  const dmyMatch = str.match(dmyRegex);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback to JS standard parsing
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return str;
}
