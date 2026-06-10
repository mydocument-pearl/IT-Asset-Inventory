import { useState } from 'react'
import { dbService } from './dbService'
import { FileSpreadsheet, Download, Upload, Users, Trash2, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { db } from './firebase'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'

export default function EmployeeDirectory({ employees = [], setEmployees, showNotification, currentUser }) {
  const [empName, setEmpName] = useState('')
  const [org, setOrg] = useState('')
  const [empPrefix, setEmpPrefix] = useState('')
  const [empIdCode, setEmpIdCode] = useState('')
  const [gender, setGender] = useState('')
  const [mobileNum, setMobileNum] = useState('')
  const [department, setDepartment] = useState('')

  const [excelFile, setExcelFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

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
      gender: gender || '-',
      department: department || '-',
      organization: org
    }

    try {
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
      setDepartment('')
    } catch (err) {
      console.error(err)
      showNotification('Failed to save employee. Please try again.', 'error')
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
        'Gender': 'Male',
        'Phone Number': '9876543210',
        'Department': 'Accounts',
        'Organization Name': 'On2Cook India Pvt. Ltd.'
      },
      {
        'Employee Name': 'Priya Mehta',
        'Employee ID': 'II-205',
        'Gender': 'Female',
        'Phone Number': '9123456780',
        'Department': 'HR',
        'Organization Name': 'InventIndia Innovations Pvt. Ltd.'
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
          const empGender = getVal(['Gender', 'Sex'])
          const phone = getVal(['Phone Number', 'Phone', 'Mobile'])
          const dept = getVal(['Department', 'Dept'])
          const orgName = getVal(['Organization Name', 'Organization', 'Company', 'Org'])

          if (!name) continue

          newEmployees.push({
            name,
            id: id || '-',
            gender: empGender || '-',
            phone: phone || '-',
            department: dept || '-',
            organization: orgName || '-'
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
    <div className="space-y-8 animate-fade-in print:hidden">
      {/* 1. Manual Add Employee Panel */}
      <div className="glass-panel p-8 rounded-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          Register New Employee
        </h2>

        <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee Name *
            </label>
            <input
              type="text"
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              placeholder="Enter employee name"
              className="w-full glass-input rounded-xl px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name *
            </label>
            <select
              value={org}
              onChange={(e) => handleOrgChange(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 outline-none"
            >
              <option value="">Select Organization</option>
              <option>On2Cook India Pvt. Ltd.</option>
              <option>InventIndia Innovations Pvt. Ltd.</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee ID Code *
            </label>
            <div className="flex">
              <div className="bg-gray-155 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl px-4 py-3 text-slate-500 font-semibold text-sm flex items-center justify-center min-w-[70px]">
                {empPrefix || 'ID'}
              </div>
              <input
                type="text"
                value={empIdCode}
                onChange={(e) => setEmpIdCode(e.target.value)}
                placeholder="e.g. 101"
                className="w-full border border-slate-200 rounded-r-xl px-4 py-3 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 outline-none"
            >
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number
            </label>
            <input
              type="text"
              value={mobileNum}
              onChange={(e) => setMobileNum(e.target.value.replace(/[^0-9+]/g, ''))}
              placeholder="e.g. 9876543210"
              className="w-full glass-input rounded-xl px-4 py-3 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-3 outline-none"
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

          <div className="lg:col-span-3 mt-2">
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20 text-white px-8 py-3 rounded-xl font-medium transition duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={16} />
              Save Employee
            </button>
          </div>
        </form>
      </div>

      {/* 2. Bulk Excel Upload (Admin Only) */}
      {isUserAdmin && (
        <div className="glass-panel p-8 rounded-2xl">
          <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileSpreadsheet className="text-red-500" size={20} />
            Bulk Import Employee Directory
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Upload employee names, codes, departments, and organization details from an Excel sheet to populate the autocomplete database.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start bg-slate-50/60 border border-slate-100 rounded-2xl p-6">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-red-100 text-red-600 text-[11px] font-bold flex items-center justify-center">1</span>
                Download Template
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Download the spreadsheet template containing the directory columns (Name, Employee ID, Gender, Phone, Dept, Organization).
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Download size={14} />
                Download Excel Template
              </button>
            </div>

            <form onSubmit={handleUploadExcel} className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-red-100 text-red-600 text-[11px] font-bold flex items-center justify-center">2</span>
                Upload Spreadsheet
              </h4>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  id="bulk-employee-dir-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black file:cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Formats: .xlsx, .xls, .csv</p>
              </div>

              <button
                type="submit"
                disabled={isUploading || !excelFile}
                className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  isUploading || !excelFile
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                    : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md'
                }`}
              >
                {isUploading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    Importing Records...
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Upload & Sync Directory
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. Employee Directory List Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-red-500" size={20} />
            Employee Directory Register
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Showing {employees.length} employees currently registered in the database.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="p-4 font-bold">Employee Name</th>
                <th className="p-4 font-bold">Employee ID / Code</th>
                <th className="p-4 font-bold">Gender</th>
                <th className="p-4 font-bold">Mobile Number</th>
                <th className="p-4 font-bold">Department</th>
                <th className="p-4 font-bold">Organization</th>
                {isUserAdmin && <th className="p-4 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={isUserAdmin ? 7 : 6} className="p-8 text-center text-slate-400 font-medium">
                    No employees registered in the directory. Add manually or upload Excel.
                  </td>
                </tr>
              ) : (
                employees.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-bold text-slate-800">{item.name}</td>
                    <td className="p-4 font-mono font-semibold text-slate-600">{item.id}</td>
                    <td className="p-4 text-slate-600">{item.gender || '-'}</td>
                    <td className="p-4 font-mono text-slate-650">{item.phone || '-'}</td>
                    <td className="p-4 text-slate-700 font-medium">{item.department || '-'}</td>
                    <td className="p-4 text-xs text-slate-500">{item.organization || '-'}</td>
                    {isUserAdmin && (
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteEmployee(item.id, item.name)}
                          className="p-1.5 text-red-600 hover:text-red-800 transition duration-150 cursor-pointer hover:scale-110 active:scale-95"
                          title="Delete Employee"
                        >
                          <Trash2 size={15} />
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
    </div>
  )
}
