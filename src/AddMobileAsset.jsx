import { useState } from 'react'
import { dbService } from './dbService'
import { compressImage } from './utils'
import { FileImage, Upload, Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AddMobileAsset({ mobileAssets = [], onMobileAssetAdded, showNotification }) {
  const [assetType, setAssetType] = useState('')
  const [assetCode, setAssetCode] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [organizationName, setOrganizationName] = useState('')
  const [invoiceImage, setInvoiceImage] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)
  
  // Mobile specific
  const [mobileBrand, setMobileBrand] = useState('')
  const [mobileModel, setMobileModel] = useState('')
  const [imei1, setImei1] = useState('')
  const [imei2, setImei2] = useState('')

  // SIM specific
  const [simCompany, setSimCompany] = useState('')
  const [simNumber, setSimNumber] = useState('')
  const [simImei, setSimImei] = useState('')

  const [excelFile, setExcelFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { role: 'member', name: 'Unknown' };
  const isAdmin = currentUser.role === 'admin';

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Asset Code': 'MB003',
        'Asset Type': 'Mobile',
        'Brand': 'Samsung',
        'Model': 'Galaxy S23',
        'IMEI 1': '358901234567890',
        'IMEI 2': '358901234567891',
        'SIM Company': '',
        'SIM Number': '',
        'SIM IMEI': '',
        'Vendor Name': 'Vijay Sales',
        'Invoice Number': 'VS-4491-26',
        'Purchase Date': '2026-06-01',
        'Invoice Date': '2026-06-01',
        'Amount': 75000,
        'Organization Name': 'On2Cook India Pvt. Ltd.'
      },
      {
        'Asset Code': 'SM002',
        'Asset Type': 'SIM Card',
        'Brand': '',
        'Model': '',
        'IMEI 1': '',
        'IMEI 2': '',
        'SIM Company': 'Airtel',
        'SIM Number': '9876543210',
        'SIM IMEI': '89911234567890123456',
        'Vendor Name': 'Reliance Digital',
        'Invoice Number': 'RD-9988-26',
        'Purchase Date': '2026-06-02',
        'Invoice Date': '2026-06-02',
        'Amount': 250,
        'Organization Name': 'InventIndia Innovations Pvt. Ltd.'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mobile SIM Template')
    
    const maxLens = sampleData.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        const valLen = String(row[key] || '').length
        const keyLen = key.length
        acc[key] = Math.max(acc[key] || 0, valLen, keyLen)
      })
      return acc
    }, {})
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }))

    XLSX.writeFile(workbook, 'Mobile_SIM_Bulk_Upload_Template.xlsx')
    if (showNotification) {
      showNotification('Mobile/SIM Excel Template downloaded!', 'success')
    }
  }

  const handleUploadExcel = async (e) => {
    e.preventDefault()
    if (!excelFile) {
      if (showNotification) showNotification('Please select an Excel file.', 'error')
      return
    }

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result
        const workbook = XLSX.read(bstr, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json(worksheet)

        if (rawRows.length === 0) {
          if (showNotification) showNotification('The spreadsheet is empty.', 'error')
          setIsUploading(false)
          return
        }

        const newItems = []
        const skippedRows = []
        const existingCodes = new Set(mobileAssets.map(a => (a.assetCode || '').toLowerCase().trim()))

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i]

          const getVal = (possibleKeys) => {
            for (const key of possibleKeys) {
              const exactKey = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_-]/g, '') === key.toLowerCase().replace(/[\s_-]/g, ''))
              if (exactKey !== undefined && row[exactKey] !== undefined) {
                return String(row[exactKey]).trim()
              }
            }
            return ''
          }

          const rawCode = getVal(['Asset Code', 'assetCode', 'Code'])
          const rawType = getVal(['Asset Type', 'assetType', 'Type'])
          const brand = getVal(['Brand', 'MobileBrand', 'SIMCompany', 'Company'])
          const model = getVal(['Model', 'MobileModel'])
          const imei_1 = getVal(['IMEI 1', 'imei1', 'IMEI'])
          const imei_2 = getVal(['IMEI 2', 'imei2'])
          const simComp = getVal(['SIM Company', 'simCompany', 'SIMCompany'])
          const simNo = getVal(['SIM Number', 'simNumber', 'SIMNo', 'Number'])
          const sImei = getVal(['SIM IMEI', 'simImei', 'SIMSerialNumber', 'SIMSerial'])
          const vendor = getVal(['Vendor Name', 'vendorName', 'Vendor'])
          const invoiceNum = getVal(['Invoice Number', 'invoiceNumber', 'Invoice'])
          const pDate = getVal(['Purchase Date', 'purchaseDate', 'Purchase'])
          const iDate = getVal(['Invoice Date', 'invoiceDate', 'InvoiceDate'])
          const amt = getVal(['Amount', 'Price', 'Cost'])
          const org = getVal(['Organization Name', 'organizationName', 'Organization'])

          if (!rawCode || !rawType) {
            skippedRows.push({ index: i + 2, reason: 'Missing Asset Code or Type' })
            continue
          }

          const typeLower = rawType.toLowerCase()
          const isMobile = typeLower.includes('mobile') || typeLower === 'phone'
          const isSIM = typeLower.includes('sim')

          if (!isMobile && !isSIM) {
            skippedRows.push({ index: i + 2, reason: `Invalid Type: ${rawType} (must be Mobile or SIM Card)` })
            continue
          }

          const cleanCode = rawCode.toUpperCase()
          if (existingCodes.has(cleanCode.toLowerCase())) {
            skippedRows.push({ index: i + 2, reason: `Duplicate Code: ${cleanCode}` })
            continue
          }

          if (newItems.some(a => a.assetCode === cleanCode)) {
            skippedRows.push({ index: i + 2, reason: `Duplicate Code in sheet: ${cleanCode}` })
            continue
          }

          const payload = {
            assetType: isMobile ? 'Mobile' : 'SIM Card',
            assetCode: cleanCode,
            vendorName: vendor || '-',
            invoiceNumber: invoiceNum || '-',
            purchaseDate: pDate || '',
            invoiceDate: iDate || '',
            amount: amt ? Number(amt) : '',
            quantity: 1,
            organizationName: org || '-',
            invoiceImage: '',
            status: 'Available',
            employee: '-',
            department: '-',
            brand: isMobile ? (brand || '-') : '-',
            model: isMobile ? (model || '-') : '-',
            imei: isMobile ? (imei_1 || '-') : '-',
            imei2: isMobile ? (imei_2 || '-') : '-',
            simCompany: isSIM ? (simComp || brand || '-') : '-',
            simNumber: isSIM ? (simNo || '-') : '-',
            simImei: isSIM ? (sImei || '-') : '-',
            createdBy: currentUser.name,
            createdAt: new Date().toISOString()
          }

          newItems.push(payload)
        }

        if (newItems.length === 0) {
          if (showNotification) {
            showNotification(`Import failed. 0 items loaded. Errors: ${skippedRows.map(r=>`Row ${r.index} (${r.reason})`).join(', ')}`, 'error')
          }
          setIsUploading(false)
          return
        }

        const updatedMobile = await dbService.saveBulkMobileAssets(newItems)
        if (onMobileAssetAdded) {
          onMobileAssetAdded(updatedMobile)
        }

        await dbService.saveActivityLog({
          member: `${currentUser.name} (${currentUser.role})`,
          action: 'Bulk Mobile Upload',
          details: `Imported ${newItems.length} Mobile/SIM devices via Excel upload. (Skipped: ${skippedRows.length}).`
        })

        if (showNotification) {
          let msg = `Successfully imported ${newItems.length} Mobile/SIM assets!`
          if (skippedRows.length > 0) {
            msg += ` Skipped ${skippedRows.length} rows due to duplicates or validation errors.`
          }
          showNotification(msg, 'success')
        }

        setExcelFile(null)
        const fileInput = document.getElementById('bulk-mobile-excel-input')
        if (fileInput) fileInput.value = ''

      } catch (error) {
        console.error(error)
        if (showNotification) showNotification('Failed to parse spreadsheet file.', 'error')
      } finally {
        setIsUploading(false)
      }
    }

    reader.readAsBinaryString(excelFile)
  }

  const handleAssetTypeChange = (type) => {
    setAssetType(type)
    if (!type) {
      setAssetCode('')
      return
    }
    const prefix = type === 'mobile' ? 'MB' : 'SM'
    const matches = mobileAssets.filter((item) => {
      const itemType = (item.assetType || '').toLowerCase()
      return type === 'mobile' ? itemType === 'mobile' : (itemType === 'sim card' || itemType === 'sim');
    })
    const nextNum = matches.length + 1
    setAssetCode(prefix + String(nextNum).padStart(3, '0'))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsCompressing(true)
    try {
      const base64Str = await compressImage(file, 50)
      setInvoiceImage(base64Str)
      if (showNotification) {
        showNotification('Invoice compressed (<50KB) and attached.', 'success')
      }
    } catch (err) {
      console.error(err)
      if (showNotification) {
        showNotification('Failed to process image compression.', 'error')
      }
    } finally {
      setIsCompressing(false)
    }
  }

  const handleSave = async () => {
    if (!assetType) {
      if (showNotification) {
        showNotification('Please select Asset Type.', 'error')
      } else {
        alert('Please select Asset Type.')
      }
      return
    }

    if (assetType === 'mobile' && (!mobileBrand || !mobileModel || !imei1)) {
      if (showNotification) {
        showNotification('Please fill in Mobile Brand, Model, and IMEI-1.', 'error')
      } else {
        alert('Please fill in Mobile Brand, Model, and IMEI-1.')
      }
      return
    }

    if (assetType === 'sim' && (!simCompany || !simNumber || !simImei)) {
      if (showNotification) {
        showNotification('Please fill in SIM Company, Number, and SIM IMEI.', 'error')
      } else {
        alert('Please fill in SIM Company, Number, and SIM IMEI.')
      }
      return
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { name: 'Unknown Member' }

    const payload = {
      assetCode,
      assetType: assetType === 'mobile' ? 'Mobile' : 'SIM Card',
      vendor: vendorName,
      invoiceNumber,
      purchaseDate,
      invoiceDate,
      amount: amount ? Number(amount) : '',
      quantity: quantity ? Number(quantity) : 1,
      organizationName,
      invoiceImage,
      status: 'Available',
      employee: '-',
      department: '-',
      brand: assetType === 'mobile' ? mobileBrand : '-',
      model: assetType === 'mobile' ? mobileModel : '-',
      imei: assetType === 'mobile' ? imei1 : simImei,
      imei2: assetType === 'mobile' ? imei2 : '-',
      simCompany: assetType === 'sim' ? simCompany : '-',
      simNumber: assetType === 'sim' ? simNumber : '-',
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    }

    try {
      const updated = await dbService.saveMobileAsset(payload)
      
      if (onMobileAssetAdded) {
        onMobileAssetAdded(updated)
      }

      // Save audit log
      await dbService.saveActivityLog({
        member: `${currentUser.name} (${currentUser.role || 'Member'})`,
        action: `Added Mobile/SIM`,
        details: `Created mobile/SIM card ${assetCode} - ${payload.brand} ${payload.model || ''} (IMEI/No: ${payload.imei}).`
      })

      if (showNotification) {
        showNotification('Mobile/SIM Asset saved successfully!', 'success')
      } else {
        alert('Mobile/SIM Asset saved successfully!')
      }

      // Reset Form
      setAssetType('')
      setAssetCode('')
      setVendorName('')
      setInvoiceNumber('')
      setPurchaseDate('')
      setInvoiceDate('')
      setAmount('')
      setQuantity('1')
      setOrganizationName('')
      setMobileBrand('')
      setMobileModel('')
      setImei1('')
      setImei2('')
      setSimCompany('')
      setSimNumber('')
      setSimImei('')
      setInvoiceImage('')

    } catch (error) {
      console.error(error)
      if (showNotification) {
        showNotification('Failed to save Mobile/SIM asset.', 'error')
      } else {
        alert('Failed to save Mobile/SIM asset.')
      }
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6 mt-10 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500"></span>
        Add Mobile & SIM Asset
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Type *
          </label>
          <select
            value={assetType}
            onChange={(e) => handleAssetTypeChange(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          >
            <option value="">Select</option>
            <option value="mobile">Mobile</option>
            <option value="sim">SIM Card</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Code
          </label>
          <input
            type="text"
            value={assetCode}
            readOnly
            placeholder="Auto-generated"
            className="w-full bg-gray-100/50 border border-gray-200 text-gray-500 rounded-xl px-4 py-3 outline-none cursor-not-allowed font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vendor Name
          </label>
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Enter vendor name"
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Number
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Enter invoice number"
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice Date
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (INR)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Organization Name
          </label>
          <select
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          >
            <option value="">Select Organization</option>
            <option>On2Cook India Pvt. Ltd.</option>
            <option>InventIndia Innovations Pvt. Ltd.</option>
          </select>
        </div>

        {/* Dynamic section based on Asset Type */}
        {assetType === 'mobile' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Brand *
              </label>
              <input
                type="text"
                value={mobileBrand}
                onChange={(e) => setMobileBrand(e.target.value)}
                placeholder="Samsung / Apple / OnePlus"
                className="w-full glass-input rounded-xl px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Model *
              </label>
              <input
                type="text"
                value={mobileModel}
                onChange={(e) => setMobileModel(e.target.value)}
                placeholder="Galaxy S23 / iPhone 15"
                className="w-full glass-input rounded-xl px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Mobile IMEI-1 *
              </label>
              <input
                type="text"
                value={imei1}
                onChange={(e) => setImei1(e.target.value)}
                placeholder="Enter IMEI Number-1"
                className="w-full glass-input rounded-xl px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Mobile IMEI-2
              </label>
              <input
                type="text"
                value={imei2}
                onChange={(e) => setImei2(e.target.value)}
                placeholder="Enter IMEI Number-2"
                className="w-full glass-input rounded-xl px-4 py-3 outline-none"
              />
            </div>
          </>
        )}

        {assetType === 'sim' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SIM Company *
              </label>
              <select
                value={simCompany}
                onChange={(e) => setSimCompany(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 outline-none"
              >
                <option value="">Select Company</option>
                <option>Airtel</option>
                <option>Jio</option>
                <option>Vodafone Idea</option>
                <option>BSNL</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SIM Number *
              </label>
              <input
                type="text"
                value={simNumber}
                onChange={(e) => setSimNumber(e.target.value)}
                placeholder="Enter SIM Phone Number"
                className="w-full glass-input rounded-xl px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SIM IMEI *
              </label>
              <input
                type="text"
                value={simImei}
                onChange={(e) => setSimImei(e.target.value)}
                placeholder="Enter SIM IMEI (20-digit)"
                className="w-full glass-input rounded-xl px-4 py-3 outline-none"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attach Invoice Image (Max 50KB)
          </label>
          <div className="flex items-center gap-3">
            <label className="glass-input rounded-xl px-4 py-3 text-slate-500 cursor-pointer hover:bg-slate-100 flex items-center gap-2 text-xs font-semibold shrink-0">
              <FileImage size={16} />
              Choose File
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {isCompressing && (
              <span className="text-[10px] text-red-500 font-bold animate-pulse">
                Compressing to 50KB...
              </span>
            )}
            {invoiceImage && (
              <div className="flex items-center gap-2">
                <img
                  src={invoiceImage}
                  alt="Invoice thumbnail"
                  className="h-10 w-10 object-cover rounded-xl border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setInvoiceImage('')}
                  className="text-[10px] text-red-500 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="mt-8 bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20 text-white px-8 py-3 rounded-xl font-medium transition duration-200 cursor-pointer"
      >
        Save Mobile Asset
      </button>

      {/* Bulk Upload panel - Admin Only */}
      {isAdmin && (
        <div className="mt-12 pt-8 border-t border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileSpreadsheet className="text-red-500" size={20} />
            Bulk Import Mobile & SIM Assets
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Upload multiple company mobile phones or cellular SIM cards at once using our spreadsheet template.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start bg-slate-50/60 border border-slate-100 rounded-2xl p-6">
            {/* Step 1: Download template */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-red-100 text-red-600 text-[11px] font-bold flex items-center justify-center">1</span>
                Download Standard Template
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Start by downloading our Mobile/SIM template. It contains sample rows for both Mobile and SIM Card layouts.
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download size={14} />
                Download Mobile/SIM Template
              </button>
            </div>

            {/* Step 2: Upload File */}
            <form onSubmit={handleUploadExcel} className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-red-100 text-red-600 text-[11px] font-bold flex items-center justify-center">2</span>
                Upload Populated Spreadsheet
              </h4>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  id="bulk-mobile-excel-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black file:cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Accepted formats: .xlsx, .xls, .csv</p>
              </div>

              <button
                type="submit"
                disabled={isUploading || !excelFile}
                className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  isUploading || !excelFile
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                    : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md shadow-red-500/10'
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    Importing Records...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Upload & Sync Devices
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}