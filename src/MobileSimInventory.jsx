import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { dbService } from './dbService'

export default function MobileSimInventory({
  mobileAssets = [],
  setMobileAssets,
  setAssignedAssets,
  setAssetHistory,
  showNotification,
  isUserAdmin,
  currentUser,
  employees = []
}) {
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtering logic
  const filtered = mobileAssets.filter((item) => {
    const emp = employees.find(e => e.name.toLowerCase().trim() === item.employee?.toLowerCase().trim());
    const empPhone = emp?.phone || '';

    const query = searchTerm.toLowerCase();

    const matchesSearch = 
      (item.employee?.toLowerCase().includes(query)) ||
      (item.brand?.toLowerCase().includes(query)) ||
      (item.model?.toLowerCase().includes(query)) ||
      (item.simNumber?.includes(searchTerm)) ||
      (item.simImei?.includes(searchTerm)) ||
      (item.imei?.includes(searchTerm)) ||
      (empPhone.includes(searchTerm));
      
    const matchesType = filterType === 'all' || 
      (filterType === 'mobile' && item.assetType?.toLowerCase() === 'mobile') ||
      (filterType === 'sim' && item.assetType?.toLowerCase() === 'sim card');

    const matchesStatus = filterStatus === 'all' || 
      (item.status?.toLowerCase() === filterStatus.toLowerCase());

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = async (assetCode) => {
    if (!isUserAdmin) return;
    if (window.confirm(`Are you sure you want to delete mobile/SIM asset ${assetCode}? This will also delete any active assignments and lifecycle history logs associated with it.`)) {
      try {
        const result = await dbService.deleteMobileAsset(assetCode);
        if (setMobileAssets) setMobileAssets(result.mobileAssets);
        if (setAssignedAssets) setAssignedAssets(result.assignedAssets);
        if (setAssetHistory) setAssetHistory(result.assetHistory);
        if (showNotification) {
          showNotification(`Asset ${assetCode} and its logs deleted successfully.`, "success");
        }
        
        await dbService.saveActivityLog({
          member: `${currentUser.name} (${currentUser.role})`,
          action: 'Deleted Mobile/SIM (Cascaded)',
          details: `Deleted Mobile/SIM asset ${assetCode} along with active assignments and history.`
        });
      } catch (err) {
        console.error(err);
        if (showNotification) {
          showNotification("Failed to delete mobile/SIM asset.", "error");
        }
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mt-8 shadow-sm animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            Mobile & SIM Inventory
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Showing {filtered.length} of {mobileAssets.length} total mobile & SIM assets
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee, brand, or number"
            className="bg-white border border-slate-250/70 rounded-lg px-3 py-1.5 text-xs outline-none w-full md:w-56 focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white border border-slate-250/70 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-red-500 transition"
          >
            <option value="all">All Types</option>
            <option value="mobile">Mobiles Only</option>
            <option value="sim">SIM Cards Only</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-250/70 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-red-500 transition"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Allocated">Allocated</option>
            <option value="Under Repair">Under Repair</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-150">
        <table className="min-w-full divide-y divide-slate-150 text-[11px]">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Sr</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Asset Type</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Employee</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Department</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Brand / Model</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">IMEI / SIM Num</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Carrier / Sim IMEI</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Organization</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Vendor</th>
              {isUserAdmin && <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isUserAdmin ? 11 : 10} className="px-3 py-8 text-center text-slate-400 font-medium bg-slate-50/50">
                  No matching mobile or SIM assets found.
                </td>
              </tr>
            ) : (
              filtered.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-slate-50/50 transition">
                  <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400">{index + 1}</td>
                  <td className="px-3 py-1.5 font-bold text-slate-800">
                    {item.assetType}
                  </td>
                  <td className="px-3 py-1.5 text-slate-700 font-medium">
                    {item.employee || '-'}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">
                    {item.department || '-'}
                  </td>
                  <td className="px-3 py-1.5 text-slate-700">
                    {item.assetType === 'Mobile' ? `${item.brand} ${item.model}` : '-'}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-slate-600">
                    {item.assetType === 'Mobile' ? item.imei : item.simNumber}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">
                    {item.assetType === 'SIM Card' ? `${item.simCompany} (${item.imei})` : '-'}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'Available' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : item.status === 'Allocated' || item.status === 'Assigned'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : item.status === 'Lost' || item.status === 'Stolen'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-500 font-medium">
                    {item.organizationName || '-'}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600">
                    {item.vendor || '-'}
                  </td>
                  {isUserAdmin && (
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => handleDelete(item.assetCode)}
                        className="text-red-500 hover:text-red-700 hover:scale-110 active:scale-95 transition duration-150 cursor-pointer"
                        title="Delete Asset"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}