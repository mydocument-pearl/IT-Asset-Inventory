import { useState } from 'react'
import { dbService } from './dbService'
import { compressImage } from './utils'
import { FileImage } from 'lucide-react'

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
    <div className="glass-panel p-8 rounded-2xl animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500"></span>
        Add New Asset
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Name *
          </label>
          <input
            type="text"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            placeholder="Enter asset name"
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Type *
          </label>
          <select
            value={assetType}
            onChange={(e) => handleAssetTypeChange(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
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
            Brand *
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Dell / HP / Lenovo / Apple"
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Serial Number *
          </label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Enter serial number"
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
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
            PO Number
          </label>
          <input
            type="text"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="Enter PO number"
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
        type="button"
        onClick={handleSave}
        className="mt-8 bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20 text-white px-8 py-3 rounded-xl font-medium transition duration-200 cursor-pointer"
      >
        Save Asset
      </button>
    </div>
  )
}