import { useState } from 'react'

export default function MobileSimInventory({ mobileAssets = [] }) {
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtering logic
  const filtered = mobileAssets.filter((item) => {
    const matchesSearch = 
      (item.employee?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.brand?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.model?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.simNumber?.includes(searchTerm));
      
    const matchesType = filterType === 'all' || 
      (filterType === 'mobile' && item.assetType?.toLowerCase() === 'mobile') ||
      (filterType === 'sim' && item.assetType?.toLowerCase() === 'sim card');

    const matchesStatus = filterStatus === 'all' || 
      (item.status?.toLowerCase() === filterStatus.toLowerCase());

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="glass-panel rounded-2xl p-6 mt-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            Mobile & SIM Inventory
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Showing {filtered.length} of {mobileAssets.length} total mobile & SIM assets
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee, brand, or number"
            className="glass-input rounded-xl px-4 py-2 text-sm outline-none w-full md:w-60"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Types</option>
            <option value="mobile">Mobiles Only</option>
            <option value="sim">SIM Cards Only</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Allocated">Allocated</option>
            <option value="Under Repair">Under Repair</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-black text-white">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Sr</th>
              <th className="px-4 py-3 text-left font-semibold">Asset Type</th>
              <th className="px-4 py-3 text-left font-semibold">Employee</th>
              <th className="px-4 py-3 text-left font-semibold">Department</th>
              <th className="px-4 py-3 text-left font-semibold">Brand / Model</th>
              <th className="px-4 py-3 text-left font-semibold">IMEI / SIM Num</th>
              <th className="px-4 py-3 text-left font-semibold">Carrier / Sim IMEI</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Organization</th>
              <th className="px-4 py-3 text-left font-semibold">Vendor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-500 font-medium bg-gray-50/50">
                  No matching mobile or SIM assets found.
                </td>
              </tr>
            ) : (
              filtered.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-4 font-mono text-xs text-gray-400">{index + 1}</td>
                  <td className="px-4 py-4 font-semibold text-gray-800">
                    {item.assetType}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {item.employee || '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {item.department || '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-700">
                    {item.assetType === 'Mobile' ? `${item.brand} ${item.model}` : '-'}
                  </td>
                  <td className="px-4 py-4 font-mono text-gray-600">
                    {item.assetType === 'Mobile' ? item.imei : item.simNumber}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {item.assetType === 'SIM Card' ? `${item.simCompany} (${item.imei})` : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      item.status === 'Available' 
                        ? 'bg-green-100 text-green-800' 
                        : item.status === 'Allocated' || item.status === 'Assigned'
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">
                    {item.organizationName || '-'}
                  </td>
                  <td className="px-4 py-4 text-gray-600 text-xs">
                    {item.vendor || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}