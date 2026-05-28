import { db } from './firebase'

import {
  collection,
  getDocs
} from 'firebase/firestore'
import AssignAsset from './AssignAsset'
import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import {
  LayoutDashboard,
  Laptop,
  Smartphone,
  Users,
  Building2,
  FileText,
  Settings,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts'
import AddAsset from './AddAsset'
import MobileSimInventory from './MobileSimInventory'
import AddMobileAsset from './AddMobileAsset'

function App() {
  const [assignedAssets, setAssignedAssets] = useState([])
  useEffect(() => {

  const savedAssignedAssets =
    localStorage.getItem('assignedAssets')

  if (savedAssignedAssets) {

    setAssignedAssets(
      JSON.parse(savedAssignedAssets)
    )

  }

}, [])
const [activeTab, setActiveTab] = useState('dashboard')

const [assets, setAssets] = useState(() => {

  const savedAssets = localStorage.getItem('assets')

  return savedAssets ? JSON.parse(savedAssets) : []

})
console.log(assets)
  const stats = [
    
  {
    title: 'Total Assets',
    value: '248',
  },
  {
    title: 'Laptops',
    value: '84',
  },
  {
    title: 'Monitors',
    value: '36',
  },
  {
    title: 'Printers',
    value: '12',
  },
  {
    title: 'Mobile Devices',
    value: '32',
  },
  {
    title: 'SIM Cards',
    value: '45',
  },
  {
    title: 'Assigned Assets',
    value: '186',
  },
  {
    title: 'Available Assets',
    value: '42',
  },
  {
    title: 'Under Repair',
    value: '20',
  },
]
const pieData = [
  { name: 'Laptops', value: 84 },
  { name: 'Monitors', value: 36 },
  { name: 'Mobiles', value: 32 },
  { name: 'SIM Cards', value: 45 },
]

const barData = [
  { name: 'Assigned', value: 186 },
  { name: 'Available', value: 42 },
  { name: 'Repair', value: 20 },
]

const COLORS = ['#dc2626', '#000000', '#6b7280', '#f59e0b']
  
  const [mobileAssets] = useState([
    
    {
      sr: 1,
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
    },
  ])
const exportToExcel = () => {

  const worksheet = XLSX.utils.json_to_sheet(assignedAssets)

  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Assigned Assets'
  )

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  const data = new Blob(
    [excelBuffer],
    {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    }
  )

  saveAs(data, 'AssignedAssets.xlsx')

}
  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}

      <div className="w-72 bg-black text-white p-6">

        <h1 className="text-2xl font-bold text-red-500 mb-10">
          IT Asset Inventory
        </h1>

        <nav className="space-y-3">

          <div
  onClick={() => setActiveTab('dashboard')}
  className={`rounded-xl px-4 py-3 cursor-pointer transition ${
    activeTab === 'dashboard'
      ? 'bg-red-600'
      : 'hover:bg-gray-800'
  }`}
>
  Dashboard
</div>

          <div
  onClick={() => setActiveTab('itassets')}
  className={`rounded-xl px-4 py-3 cursor-pointer transition ${
    activeTab === 'itassets'
      ? 'bg-red-600'
      : 'hover:bg-gray-800'
  }`}
>
  IT Assets
</div>

          <div
  onClick={() => setActiveTab('mobile')}
  className={`rounded-xl px-4 py-3 cursor-pointer transition ${
    activeTab === 'mobile'
      ? 'bg-red-600'
      : 'hover:bg-gray-800'
  }`}
>
  Mobile & SIM
</div>

          <div
  onClick={() => setActiveTab('allocation')}
  className={`rounded-xl px-4 py-3 cursor-pointer transition ${
    activeTab === 'allocation'
      ? 'bg-red-600'
      : 'hover:bg-gray-800'
  }`}
>

  <div className="flex items-center gap-3">
    <Users size={20} />
    Employee Allocation
  </div>

</div>

          <div className="hover:bg-gray-800 rounded-xl px-4 py-3 cursor-pointer transition">
            Vendors
          </div>

          <div className="hover:bg-gray-800 rounded-xl px-4 py-3 cursor-pointer transition">
            Reports
          </div>

          <div className="hover:bg-gray-800 rounded-xl px-4 py-3 cursor-pointer transition">
            Settings
          </div>

        </nav>

      </div>

      {/* Main Content */}

      <div className="flex-1 p-8">

        {/* Top Bar */}

        <div className="flex justify-between items-center mb-8">

          <div>

            <h2 className="text-3xl font-bold text-gray-800">
              Dashboard
            </h2>

            <p className="text-gray-500 mt-1">
              Welcome to IT Asset Inventory System
            </p>

          </div>

                  </div>
{activeTab === 'dashboard' && (
  <>

    {/* KPI CARDS */}

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">

      {stats.map((item, index) => (

        <div
          key={index}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition duration-300 hover:-translate-y-1"
        >

          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            {item.title}
          </p>

          <h3 className="text-5xl font-bold text-red-600 mt-4">
            {item.value}
          </h3>

        </div>

      ))}

    </div>

    {/* ANALYTICS SECTION */}

    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

      {/* Asset Status */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">

        <h3 className="text-xl font-bold text-gray-800 mb-6">
          Asset Status
        </h3>

        <div className="space-y-4">

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Assigned</span>

            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
              186
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Available</span>

            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              42
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Under Repair</span>

            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
              20
            </span>
          </div>

        </div>

      </div>

      {/* Asset Categories */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">

        <h3 className="text-xl font-bold text-gray-800 mb-6">
          Asset Categories
        </h3>

        <div className="space-y-4">

          <div className="flex justify-between items-center border-b pb-2">

            <span className="font-semibold text-gray-700">
              Category
            </span>

            <div className="grid grid-cols-2 w-60 text-right">

              <span className="font-semibold text-gray-700">
                Total
              </span>

              <span className="font-semibold text-gray-700">
                Assigned
              </span>

            </div>

          </div>

          <div className="flex justify-between items-center">

            <span>Laptops</span>

            <div className="grid grid-cols-2 w-60 text-right">

              <span>84</span>

              <span className="text-red-600 font-medium">
                72
              </span>

            </div>

          </div>

          <div className="flex justify-between items-center">

            <span>Monitors</span>

            <div className="grid grid-cols-2 w-60 text-right">

              <span>36</span>

              <span className="text-red-600 font-medium">
                28
              </span>

            </div>

          </div>

          <div className="flex justify-between items-center">

            <span>Mobiles</span>

            <div className="grid grid-cols-2 w-60 text-right">

              <span>32</span>

              <span className="text-red-600 font-medium">
                24
              </span>

            </div>

          </div>

          <div className="flex justify-between items-center">

            <span>SIM Cards</span>

            <div className="grid grid-cols-2 w-60 text-right">

              <span>45</span>

              <span className="text-red-600 font-medium">
                39
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* Recent Activity */}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">

        <h3 className="text-xl font-bold text-gray-800 mb-6">
          Recent Activity
        </h3>

        <div className="space-y-4">

          <div className="border-l-4 border-red-500 pl-4">

            <p className="font-medium text-gray-800">
              Laptop Assigned
            </p>

            <p className="text-sm text-gray-500">
              Dell Latitude assigned to Rahul
            </p>

          </div>

          <div className="border-l-4 border-green-500 pl-4">

            <p className="font-medium text-gray-800">
              SIM Added
            </p>

            <p className="text-sm text-gray-500">
              Airtel SIM inventory updated
            </p>

          </div>

          <div className="border-l-4 border-yellow-500 pl-4">

            <p className="font-medium text-gray-800">
              Asset Under Repair
            </p>

            <p className="text-sm text-gray-500">
              HP Printer marked for repair
            </p>

          </div>

        </div>

      </div>

    </div>
    {/* CHARTS SECTION */}

<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-10">

  {/* PIE CHART */}

  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">

    <h3 className="text-2xl font-bold text-gray-800 mb-6">
      Asset Distribution
    </h3>

    <div className="h-80">

      <ResponsiveContainer width="100%" height="100%">

        <PieChart>

          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            label
          >

            {pieData.map((entry, index) => (

              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />

            ))}

          </Pie>

          <Tooltip />

        </PieChart>

      </ResponsiveContainer>

    </div>

  </div>

  {/* BAR CHART */}

  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">

    <h3 className="text-2xl font-bold text-gray-800 mb-6">
      Asset Status Overview
    </h3>

    <div className="h-80">

      <ResponsiveContainer width="100%" height="100%">

        <BarChart data={barData}>

          <XAxis dataKey="name" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="value"
            fill="#dc2626"
            radius={[10, 10, 0, 0]}
          />

        </BarChart>

      </ResponsiveContainer>

    </div>

  </div>

</div>
{/* QUICK ACTIONS */}

<div className="mt-10 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">

  <h3 className="text-2xl font-bold text-gray-800 mb-6">
    Quick Actions
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

    <button
  onClick={() => setActiveTab('itassets')}
  className="bg-red-600 hover:bg-red-700 text-white rounded-xl p-4 font-semibold transition"
>
  + Add IT Asset
</button>

    <button
  onClick={() => setActiveTab('mobile')}
  className="bg-black hover:bg-gray-900 text-white rounded-xl p-4 font-semibold transition"
>
  + Add Mobile Asset
</button>

    <button
  onClick={() => setActiveTab('allocation')}
  className="bg-gray-800 hover:bg-black text-white rounded-xl p-4 font-semibold transition"
>
  Assign Asset
</button>

    <button
  onClick={exportToExcel}
  className="bg-white border border-gray-300 hover:border-red-500 hover:text-red-600 rounded-xl p-4 font-semibold transition"
>
  Generate Excel Report
</button>

  </div>

</div>
  </>
)}
    
        {activeTab === 'itassets' && (
  <>

    <div className="mt-10">
      <AddAsset
  assets={assets}
  setAssets={setAssets}
/>
    </div>
        {/* Assets Allotted */}

<div className="mt-10 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

  <div className="p-6 border-b border-gray-200 flex justify-between items-center">

    <h2 className="text-xl font-bold text-gray-800">
      Saved Assets
    </h2>

    <input
      type="text"
      placeholder="Search Assets"
      className="border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-red-500"
    />

  </div>

  <div className="overflow-x-auto">

    <table className="w-full text-sm text-left">

      <thead className="bg-gray-50 border-b border-gray-200">

        <tr>

          <th className="p-4 font-semibold text-gray-700">
            Asset Code
          </th>

          <th className="p-4 font-semibold text-gray-700">
            Asset Name
          </th>

          <th className="p-4 font-semibold text-gray-700">
            Brand
          </th>

          <th className="p-4 font-semibold text-gray-700">
            Serial Number
          </th>

          <th className="p-4 font-semibold text-gray-700">
            Status
          </th>

        </tr>

      </thead>

      <tbody>

        {assets.map((item, index) => (

          <tr
            key={index}
            className="border-b border-gray-100 hover:bg-gray-50 transition"
          >

            <td className="p-4 font-medium text-gray-800">
              {item.assetCode}
            </td>

            <td className="p-4 text-gray-700">
              {item.assetName}
            </td>

            <td className="p-4 text-gray-700">
              {item.brand}
            </td>

            <td className="p-4 text-gray-700">
              {item.serialNumber}
            </td>

            <td className="p-4">

              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                {item.status}
              </span>

            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>

</div>
  </>
)}
{activeTab === 'mobile' && (

  <>
    <AddMobileAsset />

    <MobileSimInventory mobileAssets={mobileAssets} />
  </>

)}

{activeTab === 'allocation' && (
<>
  <AssignAsset
  assets={assets}
  setAssets={setAssets}
  addAssignedAsset={(data) => {

    const updatedAssets = [...assignedAssets, data]

    setAssignedAssets(updatedAssets)

    localStorage.setItem(
      'assignedAssets',
      JSON.stringify(updatedAssets)
    )

  }}
/>
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-10">

  <h2 className="text-2xl font-bold text-gray-800 mb-6">
    Assigned Assets
  </h2>

  <div className="overflow-x-auto">

    <table className="w-full">

      <thead className="bg-gray-50">

        <tr>

          <th className="text-left px-4 py-3">Employee</th>
          <th className="text-left px-4 py-3">Department</th>
          <th className="text-left px-4 py-3">Asset</th>
          <th className="text-left px-4 py-3">Serial</th>
          <th className="text-left px-4 py-3">Date</th>
          <th className="text-left px-4 py-3">Status</th>

        </tr>

      </thead>

      <tbody>

        {assignedAssets.map((item, index) => (

          <tr key={index} className="border-t">

            <td className="px-4 py-3">
              {item.employeeName}
            </td>

            <td className="px-4 py-3">
              {item.department}
            </td>

            <td className="px-4 py-3">
              {item.assetName || item.asset || 'Laptop'}
            </td>

            <td className="px-4 py-3">
              {item.serialNumber}
            </td>

            <td className="px-4 py-3">
              {item.allocationDate}
            </td>

            <td className="px-4 py-3">
              {item.status}
            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>

</div>

</>

)}
      </div>

    </div>
  )
}

export default App