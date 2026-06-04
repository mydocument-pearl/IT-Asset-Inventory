import { useState } from 'react'
import { dbService } from './dbService'
import { compressImage } from './utils'
import { FileImage } from 'lucide-react'

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
    </div>
  )
}