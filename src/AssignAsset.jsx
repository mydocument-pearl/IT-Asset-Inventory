import { useState } from 'react'
import { dbService } from './dbService'
import { generateOtp } from './utils'
import { KeyRound, Smartphone, AlertCircle } from 'lucide-react'

export default function AssignAsset({
  addAssignedAsset,
  assets,
  setAssets,
  mobileAssets = [],
  setMobileAssets,
  showNotification
}) {
  const [organization, setOrganization] = useState('')
  const [employeePrefix, setEmployeePrefix] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [employeePhone, setEmployeePhone] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [department, setDepartment] = useState('')
  const [assetType, setAssetType] = useState('')
  const [brand, setBrand] = useState('')
  const [assetCode, setAssetCode] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [allocationDate, setAllocationDate] = useState('')
  const [status, setStatus] = useState('Assigned')
  const [remarks, setRemarks] = useState('')

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [inputOtp, setInputOtp] = useState('')
  const [otpError, setOtpError] = useState('')

  // Unify hardware and mobile assets for assignment
  const combinedAssets = [
    ...assets.map((item) => ({ ...item, source: 'hardware' })),
    ...mobileAssets.map((item) => ({
      ...item,
      assetName: item.assetType === 'Mobile' ? `${item.brand} ${item.model}` : `${item.simCompany} SIM (${item.simNumber})`,
      source: 'mobile'
    }))
  ]

  // Filter available combined assets based on selected asset type
  const filteredAvailableAssets = combinedAssets.filter((item) => {
    const isAvailable = item.status === 'Available';
    if (!isAvailable) return false;
    
    if (!assetType) return true;
    
    const queryType = assetType.toLowerCase();
    const itemType = (item.assetType || '').toLowerCase();
    
    return itemType === queryType || 
      (queryType === 'mobile' && itemType === 'mobile') ||
      (queryType === 'sim card' && itemType === 'sim card');
  });

  const handleStartAssign = () => {
    if (!employeeName || !employeeId || !employeePhone || !assetCode || !allocationDate) {
      if (showNotification) {
        showNotification('Please fill in Employee Name, ID, Phone, Asset, and Allocation Date.', 'error')
      } else {
        alert('Please fill in Employee Name, ID, Phone, Asset, and Allocation Date.')
      }
      return
    }

    // Phone number simple format check (e.g. 10 digits)
    if (!/^\+?[0-9]{10,14}$/.test(employeePhone.replace(/\s+/g, ''))) {
      showNotification('Please enter a valid mobile number (10-12 digits).', 'error')
      return
    }

    // Trigger OTP Flow
    const otp = generateOtp()
    setGeneratedOtp(otp)
    setInputOtp('')
    setOtpError('')
    setShowOtpModal(true)

    // Simulate SMS dispatch to employee phone
    if (showNotification) {
      showNotification(`[SMS Sim] Sent OTP code: ${otp} to +91 ${employeePhone}`, 'success')
    }
    console.log(`%c[SMS API Simulator] OTP code for ${employeeName} (+91 ${employeePhone}) is: ${otp}`, 'background: #222; color: #bada55; font-size: 14px; padding: 4px;');
  }

  const handleVerifyOtp = async () => {
    if (inputOtp !== generatedOtp) {
      setOtpError('Incorrect OTP. Please enter the correct code sent to the employee.')
      return
    }

    setShowOtpModal(false)
    const selectedItem = combinedAssets.find((item) => item.assetCode === assetCode)
    if (!selectedItem) {
      showNotification('Selected asset not found.', 'error')
      return
    }

    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { name: 'Unknown Member' }

    const newAssignedAsset = {
      employeeName,
      employeeId: `${employeePrefix}${employeeId}`,
      employeePhone,
      department,
      assetType: selectedItem.assetType,
      assetName: selectedItem.assetName,
      assetCode: selectedItem.assetCode,
      brand: selectedItem.brand || '-',
      serialNumber: selectedItem.serialNumber || selectedItem.imei || selectedItem.simNumber || '-',
      allocationDate,
      returnDate: returnDate || '',
      status: status === 'Assigned' && selectedItem.source === 'mobile' ? 'Allocated' : status,
      remarks,
      createdBy: currentUser.name,
      assignedAt: new Date().toISOString()
    }

    try {
      // Save assignment
      await dbService.saveAssignedAsset(newAssignedAsset)
      addAssignedAsset(newAssignedAsset)

      // Update source status
      if (selectedItem.source === 'hardware') {
        const updatedAssets = await dbService.updateAssetStatus(assetCode, status)
        setAssets(updatedAssets)
      } else if (selectedItem.source === 'mobile') {
        const nextStatus = status === 'Assigned' ? 'Allocated' : status;
        const updatedMobile = await dbService.updateMobileAssetStatus(
          assetCode,
          nextStatus,
          employeeName,
          department
        )
        setMobileAssets(updatedMobile)
      }

      // Log activity
      await dbService.saveActivityLog({
        member: `${currentUser.name} (${currentUser.role || 'Member'})`,
        action: 'Assigned Asset (OTP Verified)',
        details: `Deployed ${selectedItem.assetType} [${assetCode}] to ${employeeName} (Phone: ${employeePhone}).`
      })

      if (showNotification) {
        showNotification(`Asset ${assetCode} assigned to ${employeeName} (OTP Verified & shared).`, 'success')
      } else {
        alert('Asset Assigned Successfully')
      }

      // Reset form fields
      setOrganization('')
      setEmployeePrefix('')
      setEmployeeId('')
      setEmployeeName('')
      setEmployeePhone('')
      setReturnDate('')
      setDepartment('')
      setAssetType('')
      setBrand('')
      setAssetCode('')
      setSerialNumber('')
      setAllocationDate('')
      setStatus('Assigned')
      setRemarks('')

    } catch (error) {
      console.error(error)
      if (showNotification) {
        showNotification('Failed to assign asset. Please try again.', 'error')
      } else {
        alert('Failed to assign asset.')
      }
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-red-500"></span>
        Assign Asset
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Employee Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee Name *
          </label>
          <input
            type="text"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="Enter employee name"
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        {/* Employee Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee Phone Number *
          </label>
          <div className="relative">
            <Smartphone className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            <input
              type="text"
              value={employeePhone}
              onChange={(e) => setEmployeePhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full glass-input rounded-xl pl-10 pr-4 py-3 outline-none font-mono"
            />
          </div>
        </div>

        {/* Allocation Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allocation Date *
          </label>
          <input
            type="date"
            value={allocationDate}
            onChange={(e) => setAllocationDate(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Organization Name
          </label>
          <select
            value={organization}
            onChange={(e) => {
              const value = e.target.value
              setOrganization(value)

              if (value === 'On2Cook India Pvt. Ltd.') {
                setEmployeePrefix('O2C-')
              } else if (value === 'InventIndia Innovations Pvt. Ltd.') {
                setEmployeePrefix('II-')
              } else {
                setEmployeePrefix('')
              }
            }}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          >
            <option value="">Select</option>
            <option>On2Cook India Pvt. Ltd.</option>
            <option>InventIndia Innovations Pvt. Ltd.</option>
          </select>
        </div>

        {/* Employee ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee ID *
          </label>
          <div className="flex">
            <div className="bg-gray-100/80 border border-gray-300 border-r-0 rounded-l-xl px-4 py-3 text-gray-500 font-semibold text-sm flex items-center justify-center min-w-[70px]">
              {employeePrefix || 'ID'}
            </div>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Enter ID Number"
              className="w-full border border-gray-300 rounded-r-xl px-4 py-3 outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none text-black"
          >
            <option value="">Select Department</option>
            <option>Administration</option>
            <option>Accounts</option>
            <option>HR</option>
            <option>IT</option>
            <option>Production</option>
            <option>Design</option>
            <option>R&D</option>
            <option>Purchase</option>
            <option>Sales</option>
            <option>Marketing</option>
            <option>Operations</option>
            <option>Management</option>
          </select>
        </div>

        {/* Asset Type filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Type
          </label>
          <select
            value={assetType}
            onChange={(e) => {
              setAssetType(e.target.value);
              setAssetCode('');
              setBrand('');
              setSerialNumber('');
            }}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none text-black"
          >
            <option value="">All Types</option>
            <option>Laptop</option>
            <option>Monitor</option>
            <option>Printer</option>
            <option>Keyboard</option>
            <option>Mouse</option>
            <option>Mobile</option>
            <option>SIM Card</option>
          </select>
        </div>

        {/* Specific Asset Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Selection *
          </label>
          <select
            value={assetCode}
            onChange={(e) => {
              const selectedItem = combinedAssets.find(
                (item) => item.assetCode === e.target.value
              )
              if (selectedItem) {
                setAssetCode(selectedItem.assetCode)
                setAssetType(selectedItem.assetType)
                setSerialNumber(selectedItem.serialNumber || selectedItem.imei || selectedItem.simNumber || '')
                setBrand(selectedItem.brand || '')
              }
            }}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          >
            <option value="">Select Asset</option>
            {filteredAvailableAssets.map((item, index) => (
              <option key={index} value={item.assetCode}>
                [{item.assetCode}] {item.assetName}
              </option>
            ))}
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
            className="w-full bg-gray-100/50 text-gray-500 border border-gray-200 rounded-xl px-4 py-3 outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand
          </label>
          <input
            type="text"
            value={brand}
            readOnly
            className="w-full bg-gray-100/50 text-gray-500 border border-gray-200 rounded-xl px-4 py-3 outline-none"
          />
        </div>

        {/* Serial Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Serial Number / IMEI
          </label>
          <input
            type="text"
            value={serialNumber}
            readOnly
            placeholder="Auto-filled from asset"
            className="w-full bg-gray-100/50 text-gray-500 border border-gray-200 rounded-xl px-4 py-3 outline-none"
          />
        </div>

        {/* Return Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected Return Date
          </label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allocation Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 outline-none"
          >
            <option>Assigned</option>
            <option>Returned</option>
            <option>Under Repair</option>
          </select>
        </div>
      </div>

      {/* Remarks */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Remarks
        </label>
        <textarea
          rows="4"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter allocation remarks or policy notes..."
          className="w-full glass-input rounded-xl px-4 py-3 outline-none"
        ></textarea>
      </div>

      {/* Button */}
      <button
        onClick={handleStartAssign}
        className="mt-8 bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20 text-white px-8 py-3 rounded-xl font-semibold transition duration-200 cursor-pointer"
      >
        Assign Asset
      </button>

      {/* OTP AUTH MODAL WINDOW */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
              <KeyRound className="text-red-500" size={20} />
              Verify Allocation OTP
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Enter the 6-digit verification code sent to <strong>{employeeName}</strong> (+91 {employeePhone}).
            </p>

            {otpError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} className="text-red-600 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            <div>
              <input
                type="text"
                maxLength={6}
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0 0 0 0 0 0"
                className="w-full text-center glass-input rounded-xl py-3 text-lg font-bold tracking-widest outline-none font-mono"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowOtpModal(false)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Verify & Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}