import { useState } from 'react'
import { dbService } from './dbService'
import { FileSpreadsheet, Download, Upload, Users, Trash2, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { db } from './firebase'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'

export default function EmployeeDirectory({ employees = [], setEmployees, showNotification, currentUser }) {
  // Add Form States
  const [empName, setEmpName] = useState('')
  const [org, setOrg] = useState('')
  const [empPrefix, setEmpPrefix] = useState('')
  const [empIdCode, setEmpIdCode] = useState('')
  const [gender, setGender] = useState('')
  const [mobileNum, setMobileNum] = useState('')
  const [department, setDepartment] = useState('')
  const [email, setEmail] = useState('')

  // Edit Form States & Modal Controller
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editEmpName, setEditEmpName] = useState('')
  const [editOrg, setEditOrg] = useState('')
  const [editEmpPrefix, setEditEmpPrefix] = useState('')
  const [editEmpIdCode, setEditEmpIdCode] = useState('')
  const [editGender, setEditGender] = useState('')
  const [editMobileNum, setEditMobileNum] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDepartment, setEditDepartment] = useState('')
  const [editStatus, setEditStatus] = useState('Active')

  const [excelFile, setExcelFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredEmployees = employees.filter(emp => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (emp.name || '').toLowerCase().includes(query) ||
           (emp.id || '').toLowerCase().includes(query) ||
           (emp.phone || '').toLowerCase().includes(query) ||
           (emp.email || '').toLowerCase().includes(query) ||
           (emp.department || '').toLowerCase().includes(query) ||
           (emp.status || '').toLowerCase().includes(query) ||
           (emp.organization || '').toLowerCase().includes(query);
  });

  const isUserAdmin = currentUser?.role === 'admin'

  const handleOrgChange = (value) => {
    setOrg(value)
    if (value === 'On2Cook India Pvt. Ltd.') {
      setEmpPrefix('O2C-')
    } else if (value === 'InventIndia Innovations Pvt. Ltd.') {
      setEmpPrefix('II-')
    } else {
      setEmpPrefix('')
    }
  }

  const handleEditOrgChange = (value) => {
    setEditOrg(value)
    if (value === 'On2Cook India Pvt. Ltd.') {
      setEditEmpPrefix('O2C-')
    } else if (value === 'InventIndia Innovations Pvt. Ltd.') {
      setEditEmpPrefix('II-')
    } else {
      setEditEmpPrefix('')
    }
  }

  const handleSaveEmployee = async (e) => {
    e.preventDefault()
    if (!empName || !empIdCode || !org) {
      showNotification('Please fill in Employee Name, Organization, and Employee ID Code.', 'error')
      return
    }

    const fullId = `${empPrefix}${empIdCode}`
    const employeePayload = {
      name: empName.trim(),
      id: fullId.trim(),
      phone: mobileNum.trim() || '-',
      email: email.trim() || '-',
      gender: gender || '-',
      department: department || '-',
      organization: org,
      status: 'Active'
    }

    try {
      const idExists = employees.some(emp => emp.id.toLowerCase() === fullId.toLowerCase())
      if (idExists) {
        showNotification(`Employee ID Code ${fullId} already exists!`, 'error')
        return
      }

      const updated = await dbService.saveBulkEmployees([employeePayload])
      setEmployees(updated)
      showNotification(`Employee ${empName} saved successfully!`, 'success')

      await dbService.saveActivityLog({
        member: `${currentUser.name} (${currentUser.role})`,
        action: 'Added Employee Manually',
        details: `Added worker ${empName} (ID: ${fullId}, Org: ${org}) to directory.`
      })

      // Reset
      setEmpName('')
      setOrg('')
      setEmpPrefix('')
      setEmpIdCode('')
      setGender('')
      setMobileNum('')
      setEmail('')
      setDepartment('')
    } catch (err) {
      console.error(err)
      showNotification('Failed to save employee. Please try again.', 'error')
    }
  }

  const handleStartEdit = (emp) => {
    setEditingEmployee(emp)
    setEditEmpName(emp.name || '')
    setEditOrg(emp.organization || '')
    
    // Parse prefix and id code
    let prefix = ''
    let code = emp.id || ''
    if (code.startsWith('O2C-')) {
      prefix = 'O2C-'
      code = code.substring(4)
    } else if (code.startsWith('II-')) {
      prefix = 'II-'
      code = code.substring(3)
    }
    
    setEditEmpPrefix(prefix)
    setEditEmpIdCode(code)
    setEditGender(emp.gender || '')
    setEditMobileNum(emp.phone && emp.phone !== '-' ? emp.phone : '')
    setEditEmail(emp.email && emp.email !== '-' ? emp.email : '')
    setEditDepartment(emp.department || '')
    setEditStatus(emp.status || 'Active')
    setShowEditModal(true)
  }

  const handleUpdateEmployee = async (e) => {
    e.preventDefault()
    if (!editEmpName || !editEmpIdCode || !editOrg) {
      showNotification('Please fill in Employee Name, Organization, and Employee ID Code.', 'error')
      return
    }

    const fullId = `${editEmpPrefix}${editEmpIdCode}`
    const employeePayload = {
      name: editEmpName.trim(),
      id: fullId.trim(),
      phone: editMobileNum.trim() || '-',
      email: editEmail.trim() || '-',
      gender: editGender || '-',
      department: editDepartment || '-',
      organization: editOrg,
      status: editStatus
    }

    try {
      const updated = await dbService.updateEmployee(editingEmployee.id, employeePayload)
      setEmployees(updated)
      showNotification(`Employee ${editEmpName} updated successfully!`, 'success')

      await dbService.saveActivityLog({
        member: `${currentUser.name} (${currentUser.role})`,
        action: 'Updated Employee Details',
        details: `Updated details for employee ${editEmpName} (ID: ${fullId}).`
      })

      // Close modal
      setEditingEmployee(null)
      setShowEditModal(false)
    } catch (err) {
      console.error(err)
      showNotification('Failed to update employee. Please try again.', 'error')
    }
  }

  const handleDeleteEmployee = async (empId, empName) => {
    if (!isUserAdmin) return
    if (window.confirm(`Are you sure you want to delete employee ${empName} (${empId}) from directory?`)) {
      try {
        const local = JSON.parse(localStorage.getItem('employees')) || []
        const updated = local.filter(emp => emp.id !== empId)
        localStorage.setItem('employees', JSON.stringify(updated))

        const connection = await dbService.checkConnection()
        if (connection) {
          try {
            // Delete from Firestore
            const q = query(collection(db, 'employees'), where('id', '==', empId))
            const querySnapshot = await getDocs(q)
            querySnapshot.forEach(async (document) => {
              await deleteDoc(doc(db, 'employees', document.id))
            })
          } catch (fbErr) {
            console.error("Firestore employee delete failed:", fbErr)
          }
        }
        setEmployees(updated)
        showNotification(`Employee ${empName} removed from directory.`, 'success')

        await dbService.saveActivityLog({
          member: `${currentUser.name} (${currentUser.role})`,
          action: 'Deleted Employee Record',
          details: `Deleted employee record for ${empName} (ID: ${empId}).`
        })
      } catch (err) {
        console.error(err)
        showNotification('Failed to remove employee.', 'error')
      }
    }
  }

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Employee Name': 'Rahul Sharma',
        'Employee ID': 'O2C-101',
        'Email ID': 'rahul.sharma@company.com',
        'Gender': 'Male',
        'Phone Number': '9876543210',
        'Department': 'Accounts',
        'Organization Name': 'On2Cook India Pvt. Ltd.',
        'Status': 'Active'
      },
      {
        'Employee Name': 'Priya Mehta',
        'Employee ID': 'II-205',
        'Email ID': 'priya.mehta@company.com',
        'Gender': 'Female',
        'Phone Number': '9123456780',
        'Department': 'HR',
        'Organization Name': 'InventIndia Innovations Pvt. Ltd.',
        'Status': 'Active'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees Template')

    const maxLens = sampleData.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        const valLen = String(row[key] || '').length
        const keyLen = key.length
        acc[key] = Math.max(acc[key] || 0, valLen, keyLen)
      })
      return acc
    }, {})
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }))

    XLSX.writeFile(workbook, 'Employee_Directory_Template.xlsx')
    showNotification('Employee template spreadsheet downloaded!', 'success')
  }

  const handleUploadExcel = async (e) => {
    e.preventDefault()
    if (!excelFile) {
      showNotification('Please choose an Excel file.', 'error')
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
          showNotification('The spreadsheet is empty.', 'error')
          setIsUploading(false)
          return
        }

        const newEmployees = []
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

          const name = getVal(['Employee Name', 'Name', 'EmployeeName'])
          const id = getVal(['Employee ID', 'EmployeeCode', 'ID', 'Code'])
          const empEmail = getVal(['Email ID', 'Email', 'EmailAddress', 'Mail'])
          const empGender = getVal(['Gender', 'Sex'])
          const phone = getVal(['Phone Number', 'Phone', 'Mobile'])
          const dept = getVal(['Department', 'Dept'])
          const orgName = getVal(['Organization Name', 'Organization', 'Company', 'Org'])
          const empStatus = getVal(['Status', 'EmployeeStatus', 'State'])

          if (!name) continue

          newEmployees.push({
            name,
            id: id || '-',
            email: empEmail || '-',
            gender: empGender || '-',
            phone: phone || '-',
            department: dept || '-',
            organization: orgName || '-',
            status: empStatus || 'Active'
          })
        }

        if (newEmployees.length === 0) {
          showNotification('No valid employee names found.', 'error')
          setIsUploading(false)
          return
        }

        const updatedEmployees = await dbService.saveBulkEmployees(newEmployees)
        setEmployees(updatedEmployees)

        await dbService.saveActivityLog({
          member: `${currentUser.name} (${currentUser.role})`,
          action: 'Bulk Employee Import',
          details: `Imported ${newEmployees.length} employees into directory.`
        })

        showNotification(`Successfully imported ${newEmployees.length} employees!`, 'success')
        setExcelFile(null)
        const fileInput = document.getElementById('bulk-employee-dir-input')
        if (fileInput) fileInput.value = ''
      } catch (err) {
        console.error(err)
        showNotification('Failed to parse spreadsheet file.', 'error')
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsBinaryString(excelFile)
  }

  return (
    <div className="space-y-6 animate-fade-in print:hidden">
      {/* 1. Manual Add Employee Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
          Register New Employee
        </h2>

        <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Employee Name *
            </label>
            <input
              type="text"
              required
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              placeholder="Enter employee name"
              className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Organization Name *
            </label>
            <select
              value={org}
              required
              onChange={(e) => handleOrgChange(e.target.value)}
              className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
            >
              <option value="">Select Organization</option>
              <option>On2Cook India Pvt. Ltd.</option>
              <option>InventIndia Innovations Pvt. Ltd.</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Employee ID Code *
            </label>
            <div className="flex">
              <div className="bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl px-3 py-2 text-slate-500 font-bold text-xs flex items-center justify-center min-w-[60px]">
                {empPrefix || 'ID'}
              </div>
              <input
                type="text"
                required
                value={empIdCode}
                onChange={(e) => setEmpIdCode(e.target.value)}
                placeholder="e.g. 101"
                className="w-full border border-slate-200 rounded-r-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
            >
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Mobile Number
            </label>
            <input
              type="text"
              value={mobileNum}
              onChange={(e) => setMobileNum(e.target.value.replace(/[^0-9+]/g, ''))}
              placeholder="e.g. 9876543210"
              className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none font-mono focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul.sharma@company.com"
              className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] transition"
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

          <div className="lg:col-span-3 mt-1">
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 hover:shadow-md hover:shadow-red-500/10 text-white px-5 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} />
              Save Employee
            </button>
          </div>
        </form>
      </div>

      {/* 2. Bulk Excel Upload (Admin Only) */}
      {isUserAdmin && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
            <FileSpreadsheet className="text-red-500" size={16} />
            Bulk Import Employee Directory
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Upload employee names, codes, departments, and organization details from an Excel sheet to populate the autocomplete database.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start bg-slate-50/50 border border-slate-150 rounded-2xl p-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="h-4.5 w-4.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center">1</span>
                Download Template
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Download the spreadsheet template containing the directory columns (Name, Employee ID, Gender, Phone, Dept, Organization).
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

            <form onSubmit={handleUploadExcel} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="h-4.5 w-4.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center">2</span>
                Upload Spreadsheet
              </h4>

              <div className="flex flex-col gap-1.5">
                <input
                  type="file"
                  id="bulk-employee-dir-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black file:cursor-pointer"
                />
                <p className="text-[9px] text-slate-400">Formats: .xlsx, .xls, .csv</p>
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
                    Upload & Sync Directory
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Employee Directory List Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="text-red-500" size={16} />
              Employee Directory Register
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Showing {filteredEmployees.length} of {employees.length} employees currently registered in the database.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, or phone number"
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none w-full md:w-64 focus:border-red-500 transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 font-extrabold">Employee Name</th>
                <th className="p-3 font-extrabold">Employee ID / Code</th>
                <th className="p-3 font-extrabold">Email Address</th>
                <th className="p-3 font-extrabold">Gender</th>
                <th className="p-3 font-extrabold">Mobile Number</th>
                <th className="p-3 font-extrabold">Department</th>
                <th className="p-3 font-extrabold">Organization</th>
                <th className="p-3 font-extrabold text-center">Status</th>
                {isUserAdmin && <th className="p-3 font-extrabold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={isUserAdmin ? 9 : 8} className="p-6 text-center text-slate-450 font-medium">
                    No matching employees found in the directory.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition animate-fade-in">
                    <td className="p-3 font-bold text-slate-800">{item.name}</td>
                    <td className="p-3 font-mono font-semibold text-slate-500">{item.id}</td>
                    <td className="p-3 font-mono text-slate-650">{item.email || '-'}</td>
                    <td className="p-3 text-slate-650">{item.gender || '-'}</td>
                    <td className="p-3 font-mono text-slate-650">{item.phone || '-'}</td>
                    <td className="p-3 text-slate-600 font-medium">{item.department || '-'}</td>
                    <td className="p-3 text-[11px] text-slate-400">{item.organization || '-'}</td>
                    <td className="p-3 text-center">
                      <span className={item.status === 'Left Company' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-200/50 rounded-full px-2 py-0.5 text-[9px] font-extrabold inline-block' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full px-2 py-0.5 text-[9px] font-extrabold inline-block'
                      }>
                        {item.status || 'Active'}
                      </span>
                    </td>
                    {isUserAdmin && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition duration-150 cursor-pointer hover:scale-110 active:scale-95"
                            title="Edit Employee Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(item.id, item.name)}
                            className="p-1 text-red-650 hover:text-red-800 hover:bg-red-50 rounded transition duration-150 cursor-pointer hover:scale-110 active:scale-95"
                            title="Delete Employee"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Edit Employee Pop-up Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                Edit Employee Details
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingEmployee(null)
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer transition"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Employee Name *
                </label>
                <input
                  type="text"
                  required
                  value={editEmpName}
                  onChange={(e) => setEditEmpName(e.target.value)}
                  placeholder="Enter employee name"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Organization Name *
                </label>
                <select
                  value={editOrg}
                  required
                  onChange={(e) => handleEditOrgChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                >
                  <option value="">Select Organization</option>
                  <option>On2Cook India Pvt. Ltd.</option>
                  <option>InventIndia Innovations Pvt. Ltd.</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Employee ID Code *
                </label>
                <div className="flex">
                  <div className="bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl px-3 py-2 text-slate-500 font-bold text-xs flex items-center justify-center min-w-[60px]">
                    {editEmpPrefix || 'ID'}
                  </div>
                  <input
                    type="text"
                    required
                    value={editEmpIdCode}
                    disabled
                    placeholder="e.g. 101"
                    className="w-full border border-slate-200 rounded-r-xl px-3 py-2 text-xs bg-slate-50 text-slate-400 cursor-not-allowed outline-none"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">Employee ID Code cannot be modified after registration.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                  >
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Department
                  </label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
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

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                  >
                    <option value="Active">Active</option>
                    <option value="Left Company">Left Company</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={editMobileNum}
                    onChange={(e) => setEditMobileNum(e.target.value.replace(/[^0-9+]/g, ''))}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-mono focus:border-red-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. user@company.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingEmployee(null)
                  }}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm hover:shadow-md"
                >
                  Update Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
