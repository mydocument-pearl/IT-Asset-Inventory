import { useState } from 'react'
import { dbService } from './dbService'
import { compressImage, excelDateToDateString } from './utils'
import { FileImage, Upload, Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AddAsset({ assets, setAssets, showNotification }) {
  const [assetType, setAssetType] = useState('')
  const [assetCode, setAssetCode] = useState('')
  const [assetName, setAssetName] = useState('')
  const [brand, setBrand] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [poNumber, setPoNumber] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [invoiceImage, setInvoiceImage] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)

  const [excelFile, setExcelFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { role: 'member', name: 'Unknown' };
  const isAdmin = currentUser.role === 'admin';

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Asset Type': 'Laptop',
        'Asset Name': 'MacBook Pro 14',
        'Brand': 'Apple',
        'Serial Number': 'C02F1234Q05D',
        'Vendor Name': 'Vijay Sales',
        'Invoice Number': 'VS-9988-26',
        'Purchase Date': '01-06-2026',
        'Invoice Date': '01-06-2026',
        'Amount': 125000,
        'PO Number': 'PO-O2C-2026-88',
        'Organization Name': 'On2Cook India Pvt. Ltd.'
      },
      {
        'Asset Type': 'Monitor',
        'Asset Name': 'UltraSharp U2723QE',
        'Brand': 'Dell',
        'Serial Number': 'CN-0ABCDE-12345-678-90AB',
        'Vendor Name': 'Reliance Digital',
        'Invoice Number': 'RD-5566-26',
        'Purchase Date': '02-06-2026',
        'Invoice Date': '02-06-2026',
        'Amount': 38000,
        'PO Number': 'PO-II-2026-44',
        'Organization Name': 'InventIndia Innovations Pvt. Ltd.'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'IT Assets Template')
    
    const maxLens = sampleData.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        const valLen = String(row[key] || '').length
        const keyLen = key.length
        acc[key] = Math.max(acc[key] || 0, valLen, keyLen)
      })
      return acc
    }, {})
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }))

    XLSX.writeFile(workbook, 'IT_Asset_Bulk_Upload_Template.xlsx')
    if (showNotification) {
      showNotification('Excel Template downloaded successfully!', 'success')
    }
  }

  const handleUploadExcel = async (e) => {
    e.preventDefault()
    if (!excelFile) {
      if (showNotification) showNotification('Please choose an Excel file first.', 'error')
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
          if (showNotification) showNotification('The Excel file is empty.', 'error')
          setIsUploading(false)
          return
        }

        const newAssetsList = []
        const skippedRows = []
        const existingCodes = new Set(assets.map(a => (a.assetCode || '').toLowerCase().trim()))

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
          const type = getVal(['Asset Type', 'assetType', 'Type'])
          const name = getVal(['Asset Name', 'assetName', 'Name'])
          const rowBrand = getVal(['Brand'])
          const serial = getVal(['Serial Number', 'serialNumber', 'SerialNumber', 'Serial'])
          const vendor = getVal(['Vendor Name', 'vendorName', 'Vendor'])
          const invoiceNum = getVal(['Invoice Number', 'invoiceNumber', 'InvoiceNum', 'Invoice'])
          const pDate = excelDateToDateString(getVal(['Purchase Date', 'purchaseDate', 'Purchase']))
          const iDate = excelDateToDateString(getVal(['Invoice Date', 'invoiceDate', 'InvoiceDate']))
          const amt = getVal(['Amount', 'Price', 'Value'])
          const po = getVal(['PO Number', 'poNumber', 'PO'])
          const org = getVal(['Organization Name', 'organizationName', 'Organization', 'Org'])

          if (!type || !name) {
            skippedRows.push({ index: i + 2, reason: 'Missing Type or Name' })
            continue
          }

          let cleanCode = rawCode ? rawCode.toUpperCase().trim() : '';

          if (!cleanCode) {
            const prefixMap = {
              Laptop: 'LP',
              Monitor: 'MN',
              CPU: 'CPU',
              Printer: 'PR',
              Keyboard: 'KB',
              Mouse: 'MS',
              Headphone: 'HP',
              RAM: 'RM',
              'Laptop Stand': 'LS',
              'Laptop Battery': 'LB',
              'Laptop Charger': 'LC',
              'External HD': 'EH',
              Hardisk: 'HD',
              'HDMI Cable': 'HC',
              'Power Cable': 'PC',
            }
            const prefix = prefixMap[type] || 'AS'
            const allCodes = [
              ...assets.map(a => a.assetCode || ''),
              ...newAssetsList.map(a => a.assetCode || '')
            ].filter(code => code.startsWith(prefix))

            let maxNum = 0
            allCodes.forEach(code => {
              const numPart = code.substring(prefix.length)
              const parsed = parseInt(numPart, 10)
              if (!isNaN(parsed) && parsed > maxNum) {
                maxNum = parsed
              }
            })
            cleanCode = prefix + String(maxNum + 1).padStart(3, '0')
          } else {
            if (existingCodes.has(cleanCode.toLowerCase())) {
              skippedRows.push({ index: i + 2, reason: `Duplicate Code in database: ${cleanCode}` })
              continue
            }
            if (newAssetsList.some(a => a.assetCode === cleanCode)) {
              skippedRows.push({ index: i + 2, reason: `Duplicate Code in sheet: ${cleanCode}` })
              continue
            }
          }

          const payload = {
            assetType: type,
            assetCode: cleanCode,
            assetName: name,
            brand: rowBrand || '-',
            serialNumber: serial || '-',
            vendorName: vendor || '-',
            invoiceNumber: invoiceNum || '-',
            purchaseDate: pDate || '',
            invoiceDate: iDate || '',
            amount: amt ? Number(amt) : '',
            quantity: 1,
            poNumber: po || '-',
            organizationName: org || '-',
            invoiceImage: '',
            status: 'Available',
            createdBy: currentUser.name,
            createdAt: new Date().toISOString()
          }

          newAssetsList.push(payload)
        }

        if (newAssetsList.length === 0) {
          if (showNotification) {
            showNotification(`Import failed. 0 assets loaded. Errors: ${skippedRows.map(r=>`Row ${r.index} (${r.reason})`).join(', ')}`, 'error')
          }
          setIsUploading(false)
          return
        }

        const updatedAssets = await dbService.saveBulkAssets(newAssetsList)
        setAssets(updatedAssets)

        await dbService.saveActivityLog({
          member: `${currentUser.name} (${currentUser.role})`,
          action: 'Bulk Asset Upload',
          details: `Imported ${newAssetsList.length} assets via Excel file upload. (Skipped rows: ${skippedRows.length}).`
        })

        if (showNotification) {
          let msg = `Successfully uploaded ${newAssetsList.length} assets!`
          if (skippedRows.length > 0) {
            msg += ` Skipped ${skippedRows.length} rows due to duplicate codes or missing fields.`
          }
          showNotification(msg, 'success')
        }

        setExcelFile(null)
        const fileInput = document.getElementById('bulk-excel-input')
        if (fileInput) fileInput.value = ''

      } catch (error) {
        console.error(error)
        if (showNotification) showNotification('Failed to parse Excel file. Ensure valid excel format.', 'error')
      } finally {
        setIsUploading(false)
      }
    }

    reader.readAsBinaryString(excelFile)
  }

  const handleAssetTypeChange = (value) => {
    setAssetType(value)
    
    const prefixMap = {
      Laptop: 'LP',
      Monitor: 'MN',
      CPU: 'CPU',
      Printer: 'PR',
      Keyboard: 'KB',
      Mouse: 'MS',
      Headphone: 'HP',
      RAM: 'RM',
      'Laptop Stand': 'LS',
      'Laptop Battery': 'LB',
      'Laptop Charger': 'LC',
      'External HD': 'EH',
      Hardisk: 'HD',
      'HDMI Cable': 'HC',
      'Power Cable': 'PC',
    }

    const prefix = prefixMap[value] || 'AS'
    const filteredAssets = assets.filter((item) =>
      item.assetCode?.startsWith(prefix)
    )

    const nextNumber = filteredAssets.length + 1
    const generatedCode = prefix + String(nextNumber).padStart(3, '0')
    setAssetCode(generatedCode)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsCompressing(true)
    try {
      const base64Str = await compressImage(file, 50) // Compress under 50KB
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
    if (!assetName || !assetType || !serialNumber || !brand) {
      if (showNotification) {
        showNotification('Please fill in Asset Name, Asset Type, Brand, and Serial Number.', 'error')
      } else {
        alert('Please fill in Asset Name, Asset Type, Brand, and Serial Number.')
      }
      return
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { name: 'Unknown Member' }

    const newAsset = {
      assetCode,
      assetType,
      assetName,
      brand,
      serialNumber,
      vendorName,
      invoiceNumber,
      purchaseDate,
      invoiceDate,
      amount: amount ? Number(amount) : '',
      quantity: quantity ? Number(quantity) : 1,
      poNumber,
      organizationName,
      invoiceImage,
      status: 'Available',
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    }

    try {
      const updated = await dbService.saveAsset(newAsset)
      setAssets(updated)
      
      // Save audit log
      await dbService.saveActivityLog({
        member: `${currentUser.name} (${currentUser.role || 'Member'})`,
        action: 'Added IT Asset',
        details: `Created hardware card ${assetCode} - ${assetName} (Brand: ${brand}).`
      })

      if (showNotification) {
        showNotification('Asset Saved Successfully!', 'success')
      } else {
        alert('Asset Saved Successfully!')
      }

      // Reset form
      setAssetType('')
      setAssetCode('')
      setAssetName('')
      setBrand('')
      setSerialNumber('')
      setVendorName('')
      setInvoiceNumber('')
      setPurchaseDate('')
      setInvoiceDate('')
      setAmount('')
      setQuantity('1')
      setPoNumber('')
      setOrganizationName('')
      setInvoiceImage('')
    } catch (error) {
      console.error(error)
      if (showNotification) {
        showNotification('Error saving asset. Please try again.', 'error')
      } else {
        alert('Error saving asset')
      }
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm animate-fade-in">
      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
        Add New Asset
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Asset Name *
          </label>
          <input
            type="text"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="Enter asset name"
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Asset Type *
          </label>
          <select
            value={assetType}
            onChange={(e) => handleAssetTypeChange(e.target.value)}
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          >
            <option value="">Select Asset Type</option>
            <option>Laptop</option>
            <option>Monitor</option>
            <option>Printer</option>
            <option>CPU</option>
            <option>Keyboard</option>
            <option>Mouse</option>
            <option>Headphone</option>
            <option>RAM</option>
            <option>Laptop Stand</option>
            <option>Laptop Battery</option>
            <option>Laptop Charger</option>
            <option>External HD</option>
            <option>Hardisk</option>
            <option>HDMI Cable</option>
            <option>Power Cable</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Asset Code
          </label>
          <input
            type="text"
            value={assetCode}
            readOnly
            placeholder="Auto-generated"
            className="w-full bg-slate-50 border border-slate-200 text-slate-500 rounded-xl px-3 py-2 text-xs outline-none cursor-not-allowed font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Brand *
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Dell / HP / Lenovo / Apple"
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Serial Number *
          </label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Enter serial number"
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Vendor Name
          </label>
          <input
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Enter vendor name"
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Invoice Number
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Enter invoice number"
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Purchase Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Invoice Date
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Amount (INR)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Quantity
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            PO Number
          </label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="Enter PO number"
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Organization Name
          </label>
          <select
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          >
            <option value="">Select Organization</option>
            <option>On2Cook India Pvt. Ltd.</option>
            <option>InventIndia Innovations Pvt. Ltd.</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
            Attach Invoice Image (Max 50KB)
          </label>
          <div className="flex items-center gap-3">
            <label className="bg-white border border-slate-250/70 hover:border-slate-350 rounded-xl px-3 py-2 text-slate-500 cursor-pointer hover:bg-slate-50 flex items-center gap-2 text-xs font-semibold shrink-0 transition">
              <FileImage size={14} />
              Choose File
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {isCompressing && (
              <span className="text-[9px] text-red-500 font-bold animate-pulse">
                Compressing to 50KB...
              </span>
            )}
            {invoiceImage && (
              <div className="flex items-center gap-2">
                <img
                  src={invoiceImage}
                  alt="Invoice thumbnail"
                  className="h-8 w-8 object-cover rounded-lg border border-slate-250"
                />
                <button
                  type="button"
                  onClick={() => setInvoiceImage('')}
                  className="text-[9px] text-red-500 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="mt-6 bg-red-655 hover:bg-red-700 hover:shadow-md hover:shadow-red-500/10 text-white px-5 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
      >
        Save Asset
      </button>

      {/* Bulk Upload panel - Admin Only */}
      {isAdmin && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
            <FileSpreadsheet className="text-red-500" size={16} />
            Bulk Import Assets via Spreadsheet
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Upload multiple hardware assets at once using our spreadsheet template. Duplicate asset codes will be skipped automatically.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start bg-slate-50/50 border border-slate-150 rounded-2xl p-4">
            {/* Step 1: Download template */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="h-4.5 w-4.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center">1</span>
                Download Standard Template
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Start by downloading our pre-formatted spreadsheet template. It contains the exact column structure and formatting needed for bulk sync.
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="bg-white border border-slate-200 hover:border-slate-350 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download size={12} />
                Download Excel Template
              </button>
            </div>

            {/* Step 2: Upload File */}
            <form onSubmit={handleUploadExcel} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="h-4.5 w-4.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center">2</span>
                Upload Populated Spreadsheet
              </h4>
              <div className="flex flex-col gap-1.5">
                <input
                  type="file"
                  id="bulk-excel-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black file:cursor-pointer"
                />
                <p className="text-[9px] text-slate-400">Accepted formats: .xlsx, .xls, .csv</p>
              </div>

              <button
                type="submit"
                disabled={isUploading || !excelFile}
                className={`w-full md:w-auto px-4 py-2 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 ${
                  isUploading || !excelFile
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                    : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-sm'
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="h-3 w-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    Importing Records...
                  </>
                ) : (
                  <>
                    <Upload size={12} />
                    Upload & Sync Assets
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