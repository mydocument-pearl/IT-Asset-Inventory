import { useState } from 'react'

export default function AssignAsset({ addAssignedAsset }) {

  const [organization, setOrganization] = useState('')
  const [employeePrefix, setEmployeePrefix] = useState('')
const [employeeId, setEmployeeId] = useState('')
const [employeeName, setEmployeeName] = useState('')
const [department, setDepartment] = useState('')
const [assetType, setAssetType] = useState('')
const [assetName, setAssetName] = useState('')
const [serialNumber, setSerialNumber] = useState('')
const [allocationDate, setAllocationDate] = useState('')
const [status, setStatus] = useState('Assigned')

  return (

    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

      <h2 className="text-2xl font-bold text-gray-800 mb-8">
        Assign Asset
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Employee Name */}

        <div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee Name
          </label>

          <input
  type="text"
  value={employeeName}
  onChange={(e) => setEmployeeName(e.target.value)}
  placeholder="Enter employee name"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />

        </div>

{/* Allocation Date */}

        <div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allocation Date
          </label>

          <input
  type="date"
  value={allocationDate}
  onChange={(e) => setAllocationDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
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
        setEmployeePrefix('O2C')
      } else if (value === 'InventIndia Innovations Pvt. Ltd.') {
        setEmployeePrefix('II')
      } else {
        setEmployeePrefix('')
      }
    }}
    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
  >

    <option>Select</option>

    <option>On2Cook India Pvt. Ltd.</option>

    <option>InventIndia Innovations Pvt. Ltd.</option>

  </select>
</div>

        {/* Employee ID */}

        <div>

  <label className="block text-sm font-medium text-gray-700 mb-2">
    Employee ID
  </label>

  <div className="flex">

    <div className="bg-gray-100 border border-gray-300 border-r-0 rounded-l-xl px-4 py-3 text-gray-700 font-semibold">
      {employeePrefix || 'PREFIX'}
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
  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500 text-black"
>

  <option value="" disabled className="text-gray-400">
    Select Department
  </option>

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

        {/* Asset Type */}

        <div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Type
          </label>

          <select
  value={assetType}
  onChange={(e) => setAssetType(e.target.value)}
  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500 text-black"
>

            <option value="" disabled className="text-gray-400">
  Select Asset Type
</option>

            <option>Laptop</option>
            <option>Monitor</option>
            <option>Printer</option>
            <option>Keyboard</option>
            <option>Mouse</option>
            <option>Mobile</option>
            <option>SIM Card</option>

          </select>

        </div>

        {/* Asset Name */}

        <div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Name
          </label>

          <input
  type="text"
  value={assetName}
  onChange={(e) => setAssetName(e.target.value)}
  placeholder="Dell Latitude 5440"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
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
  onChange={(e) => setSerialNumber(e.target.value)}
  placeholder="Enter serial number"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />

        </div>

                {/* Return Date */}

        <div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Return Date
          </label>

          <input
            type="date"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />

        </div>

        {/* Status */}

        <div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>

          <select className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500">

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
          placeholder="Enter remarks"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
        ></textarea>

      </div>

      {/* Button */}

      <button
  onClick={() => {

    addAssignedAsset({
      employeeName,
      employeeId: `${employeePrefix}${employeeId}`,
      department,
      assetType,
      assetName,
      serialNumber,
      allocationDate,
      status,
    })

    alert('Asset Assigned Successfully')

  }}

  className="mt-8 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-semibold transition"
>
  Assign Asset
</button>

    </div>

  )
}