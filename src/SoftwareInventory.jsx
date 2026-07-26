import { useState, useEffect } from 'react'
import { dbService } from './dbService'
import { Trash2, History, Calendar, Plus, Search, DollarSign, Users, Award, ShieldAlert, ArrowRight } from 'lucide-react'

export default function SoftwareInventory({ employees = [], showNotification, isAdmin }) {
  const [licenses, setLicenses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState(null)

  // Add Form states
  const [softwareName, setSoftwareName] = useState('')
  const [renewalDate, setRenewalDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [usersPerLicense, setUsersPerLicense] = useState('1')
  const [amtOfRenewal, setAmtOfRenewal] = useState('')
  
  // Multiple users for new license
  const [assignedUsers, setAssignedUsers] = useState([])
  const [userInput, setUserInput] = useState('')

  const handleAddUser = (userToAdd) => {
    const clean = userToAdd.trim()
    if (clean && !assignedUsers.includes(clean)) {
      setAssignedUsers([...assignedUsers, clean])
    }
    setUserInput('')
  }

  const handleRemoveUser = (userToRemove) => {
    setAssignedUsers(assignedUsers.filter(u => u !== userToRemove))
  }

  // Renewal Action states
  const [newRenewalDate, setNewRenewalDate] = useState('')
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [newAmtOfRenewal, setNewAmtOfRenewal] = useState('')
  const [renewalRemarks, setRenewalRemarks] = useState('License Renewed')
  
  // Multiple users for renewal/edit
  const [renewAssignedUsers, setRenewAssignedUsers] = useState([])
  const [renewUserInput, setRenewUserInput] = useState('')

  const handleAddRenewUser = (userToAdd) => {
    const clean = userToAdd.trim()
    if (clean && !renewAssignedUsers.includes(clean)) {
      setRenewAssignedUsers([...renewAssignedUsers, clean])
    }
    setRenewUserInput('')
  }

  const handleRemoveRenewUser = (userToRemove) => {
    setRenewAssignedUsers(renewAssignedUsers.filter(u => u !== userToRemove))
  }

  // Fetch licenses
  const fetchLicenses = async () => {
    try {
      const data = await dbService.getSoftwareLicenses()
      setLicenses(data)
    } catch (err) {
      console.error(err)
      showNotification('Failed to load software licenses.', 'error')
    }
  }

  useEffect(() => {
    fetchLicenses()
  }, [])

  // Create
  const handleSave = async (e) => {
    e.preventDefault()
    if (!softwareName || !renewalDate || !expiryDate || !usersPerLicense || !amtOfRenewal) {
      showNotification('Please fill in all required fields.', 'error')
      return
    }

    const newLicense = {
      softwareName,
      renewalDate,
      expiryDate,
      usersPerLicense: Number(usersPerLicense),
      amtOfRenewal: Number(amtOfRenewal),
      whoIsUsing: assignedUsers,
      historyOfRenewal: [
        {
          date: renewalDate,
          amount: Number(amtOfRenewal),
          remarks: 'Initial Activation'
        }
      ],
      createdAt: new Date().toISOString()
    }

    try {
      await dbService.saveSoftwareLicense(newLicense)
      showNotification('Software license added successfully!', 'success')
      
      // Log activity
      const logMsg = `Added software license for ${softwareName} (INR ${amtOfRenewal})`;
      const logs = JSON.parse(localStorage.getItem('activityLogs')) || [];
      logs.unshift({
        id: `log_${Date.now()}`,
        action: 'SOFTWARE_ADD',
        timestamp: new Date().toISOString(),
        details: logMsg
      });
      localStorage.setItem('activityLogs', JSON.stringify(logs));

      // Reset
      setSoftwareName('')
      setRenewalDate('')
      setExpiryDate('')
      setUsersPerLicense('1')
      setAmtOfRenewal('')
      setAssignedUsers([])
      setUserInput('')
      setShowAddModal(false)
      fetchLicenses()
    } catch (err) {
      console.error(err)
      showNotification('Failed to save software license.', 'error')
    }
  }

  // Renew/Edit License Action
  const handleRenew = async (e) => {
    e.preventDefault()
    if (!newRenewalDate || !newExpiryDate || !newAmtOfRenewal) {
      showNotification('Please fill in all fields for renewal.', 'error')
      return
    }

    const updatedHistory = [
      ...(selectedLicense.historyOfRenewal || []),
      {
        date: newRenewalDate,
        amount: Number(newAmtOfRenewal),
        remarks: renewalRemarks || 'License Renewed'
      }
    ]

    const updatedLicense = {
      ...selectedLicense,
      renewalDate: newRenewalDate,
      expiryDate: newExpiryDate,
      amtOfRenewal: Number(newAmtOfRenewal),
      whoIsUsing: renewAssignedUsers,
      historyOfRenewal: updatedHistory
    }

    try {
      await dbService.updateSoftwareLicense(selectedLicense.softwareName, updatedLicense)
      showNotification(`${selectedLicense.softwareName} has been renewed/updated successfully!`, 'success')

      // Log activity
      const logMsg = `Renewed software license for ${selectedLicense.softwareName} (New Expiry: ${newExpiryDate}, Amt: INR ${newAmtOfRenewal})`;
      const logs = JSON.parse(localStorage.getItem('activityLogs')) || [];
      logs.unshift({
        id: `log_${Date.now()}`,
        action: 'SOFTWARE_RENEW',
        timestamp: new Date().toISOString(),
        details: logMsg
      });
      localStorage.setItem('activityLogs', JSON.stringify(logs));

      setNewRenewalDate('')
      setNewExpiryDate('')
      setNewAmtOfRenewal('')
      setRenewalRemarks('License Renewed')
      setRenewAssignedUsers([])
      setRenewUserInput('')
      setShowRenewModal(false)
      fetchLicenses()
    } catch (err) {
      console.error(err)
      showNotification('Failed to renew license.', 'error')
    }
  }

  // Delete
  const handleDelete = async (licenseName) => {
    if (!window.confirm(`Are you sure you want to delete license for ${licenseName}?`)) return
    try {
      await dbService.deleteSoftwareLicense(licenseName)
      showNotification('Software license deleted.', 'success')
      
      const logMsg = `Deleted software license for ${licenseName}`;
      const logs = JSON.parse(localStorage.getItem('activityLogs')) || [];
      logs.unshift({
        id: `log_${Date.now()}`,
        action: 'SOFTWARE_DELETE',
        timestamp: new Date().toISOString(),
        details: logMsg
      });
      localStorage.setItem('activityLogs', JSON.stringify(logs));

      fetchLicenses()
    } catch (err) {
      console.error(err)
      showNotification('Failed to delete software license.', 'error')
    }
  }

  // Helpers for Status Check
  const getLicenseStatus = (expiryDateStr) => {
    if (!expiryDateStr) return { label: 'Unknown', className: 'bg-slate-100 text-slate-800 border-slate-200' }
    const expiry = new Date(expiryDateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { label: 'Expired', className: 'bg-red-50 text-red-700 border-red-200' }
    } else if (diffDays <= 30) {
      return { label: `Expires in ${diffDays}d`, className: 'bg-amber-50 text-amber-700 border-amber-200' }
    } else {
      return { label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' }
    }
  }

  // Search filter
  const filtered = licenses.filter(item => {
    const term = searchTerm.toLowerCase().trim()
    return (
      (item.softwareName || '').toLowerCase().includes(term) ||
      (item.whoIsUsing || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mt-8 shadow-sm animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            Software & License Suite
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Showing {filtered.length} of {licenses.length} registered software programs
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative w-full md:w-56">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search software or user..."
              className="w-full bg-white border border-slate-250/70 rounded-lg pl-3 pr-8 py-1.5 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-red-500/10 shrink-0"
          >
            <Plus size={13} />
            Register License
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-150">
        <table className="min-w-full divide-y divide-slate-150 text-[11px]">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Software Name</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider">Seats Limit</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Who is Using</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Renewal Date</th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Expiry Date</th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Renewal Amt (INR)</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-center font-bold uppercase tracking-wider">History</th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-400 font-medium bg-slate-50/50">
                  No registered software license found.
                </td>
              </tr>
            ) : (
              filtered.map((item, index) => {
                const status = getLicenseStatus(item.expiryDate)
                return (
                  <tr key={index} className="hover:bg-slate-50/50 transition">
                    <td className="px-3 py-2 font-bold text-slate-800">{item.softwareName}</td>
                    <td className="px-3 py-2 text-center font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users size={10} className="text-slate-400" />
                        {item.usersPerLicense} users
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {Array.isArray(item.whoIsUsing) ? (
                          item.whoIsUsing.map((user, uIdx) => (
                            <span key={uIdx} className="bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                              {user}
                            </span>
                          ))
                        ) : (
                          item.whoIsUsing && item.whoIsUsing !== '-' ? (
                            item.whoIsUsing.split(',').map((user, uIdx) => (
                              <span key={uIdx} className="bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                {user.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600 font-mono text-[10px]">{item.renewalDate}</td>
                    <td className="px-3 py-2 text-slate-600 font-mono text-[10px]">{item.expiryDate}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">₹{Number(item.amtOfRenewal).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => {
                          setSelectedLicense(item)
                          setShowHistoryModal(true)
                        }}
                        className="text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-350 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                        title="View Renewal logs"
                      >
                        <History size={11} />
                        Logs
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedLicense(item)
                          setNewRenewalDate(item.renewalDate || '')
                          setNewExpiryDate(item.expiryDate || '')
                          setNewAmtOfRenewal(item.amtOfRenewal || '')
                          const currentUsers = Array.isArray(item.whoIsUsing)
                            ? item.whoIsUsing
                            : (typeof item.whoIsUsing === 'string' && item.whoIsUsing !== '-' ? item.whoIsUsing.split(',').map(u => u.trim()).filter(Boolean) : [])
                          setRenewAssignedUsers(currentUsers)
                          setShowRenewModal(true)
                        }}
                        className="bg-slate-900 hover:bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                      >
                        Renew
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(item.softwareName)}
                          className="text-red-500 hover:text-red-700 hover:scale-110 active:scale-95 transition duration-150 cursor-pointer"
                          title="Delete Software"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: REGISTER SOFTWARE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-5 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200/80">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
              Register Software License
            </h3>
            
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Software Name *
                </label>
                <input
                  type="text"
                  required
                  value={softwareName}
                  onChange={(e) => setSoftwareName(e.target.value)}
                  placeholder="e.g. Adobe Creative Cloud, Microsoft 365"
                  className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Renewal Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={renewalDate}
                    onChange={(e) => setRenewalDate(e.target.value)}
                    className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Users Per License *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={usersPerLicense}
                    onChange={(e) => setUsersPerLicense(e.target.value)}
                    className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Renewal Amount (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={amtOfRenewal}
                    onChange={(e) => setAmtOfRenewal(e.target.value)}
                    placeholder="INR amount"
                    className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Assign Users (Select Multiple)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => {
                      const val = e.target.value
                      setUserInput(val)
                      const matchingEmp = employees.find(emp => emp.name.toLowerCase() === val.toLowerCase())
                      if (matchingEmp) {
                        handleAddUser(matchingEmp.name)
                      }
                    }}
                    placeholder="Search or enter user name"
                    list="software-employees-list"
                    className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddUser(userInput)}
                    className="bg-slate-900 hover:bg-black text-white px-3 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <datalist id="software-employees-list">
                  {employees.map((emp, idx) => (
                    <option key={idx} value={emp.name} />
                  ))}
                </datalist>

                {assignedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 p-1.5 bg-slate-50 border border-slate-100 rounded-xl max-h-24 overflow-y-auto">
                    {assignedUsers.map((user, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        {user}
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user)}
                          className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RENEWAL HISTORY LOG */}
      {showHistoryModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-5 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200/80">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <History size={16} className="text-slate-500" />
              Renewal History logs
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Software Name: <strong className="text-slate-700">{selectedLicense.softwareName}</strong>
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2.5 border-y border-slate-100 py-3 pr-1">
              {(selectedLicense.historyOfRenewal || []).map((log, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block font-mono">{log.date}</span>
                    <span className="text-xs font-semibold text-slate-700 block">{log.remarks || 'License Renewed'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 block">₹{Number(log.amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
              {(!selectedLicense.historyOfRenewal || selectedLicense.historyOfRenewal.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">No renewal log records found.</p>
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              className="w-full mt-4 bg-slate-900 hover:bg-black text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close Logs
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: EXECUTE RENEWAL ACTION */}
      {showRenewModal && selectedLicense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200/80">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
              Renew Software License
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Extend subscription for <strong className="text-slate-700">{selectedLicense.softwareName}</strong>
            </p>

            <form onSubmit={handleRenew} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  New Renewal Date *
                </label>
                <input
                  type="date"
                  required
                  value={newRenewalDate}
                  onChange={(e) => setNewRenewalDate(e.target.value)}
                  className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  New Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Renewal Amount (INR) *
                </label>
                <input
                  type="number"
                  required
                  value={newAmtOfRenewal}
                  onChange={(e) => setNewAmtOfRenewal(e.target.value)}
                  className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  value={renewalRemarks}
                  onChange={(e) => setRenewalRemarks(e.target.value)}
                  placeholder="e.g. Annual renewal, upgrade seats"
                  className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Assign Users (Select Multiple)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={renewUserInput}
                    onChange={(e) => {
                      const val = e.target.value
                      setRenewUserInput(val)
                      const matchingEmp = employees.find(emp => emp.name.toLowerCase() === val.toLowerCase())
                      if (matchingEmp) {
                        handleAddRenewUser(matchingEmp.name)
                      }
                    }}
                    placeholder="Search or enter user name"
                    list="software-employees-list"
                    className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddRenewUser(renewUserInput)}
                    className="bg-slate-900 hover:bg-black text-white px-3 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {renewAssignedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 p-1.5 bg-slate-50 border border-slate-100 rounded-xl max-h-24 overflow-y-auto">
                    {renewAssignedUsers.map((user, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        {user}
                        <button
                          type="button"
                          onClick={() => handleRemoveRenewUser(user)}
                          className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>


              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Complete Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
