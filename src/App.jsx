export default function App() {
  const stats = [
    {
      title: 'Total Assets',
      value: '248',
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
  ];

  const recentAssets = [
    {
      asset: 'Dell Latitude 5440',
      employee: 'Rahul Sharma',
      department: 'Accounts',
      status: 'Assigned',
    },
    {
      asset: 'HP LaserJet Pro',
      employee: 'Admin Department',
      department: 'Administration',
      status: 'Active',
    },
    {
      asset: 'Lenovo ThinkPad',
      employee: 'Priya Mehta',
      department: 'HR',
      status: 'Assigned',
    },
    {
      asset: 'Samsung Monitor',
      employee: 'Available',
      department: 'Store',
      status: 'Available',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-72 bg-black text-white p-6">
        <h1 className="text-2xl font-bold text-red-500 mb-10">
          IT Asset Inventory
        </h1>

        <nav className="space-y-3">
          <div className="bg-red-600 rounded-xl px-4 py-3 cursor-pointer">
            Dashboard
          </div>

          <div className="hover:bg-gray-800 rounded-xl px-4 py-3 cursor-pointer transition">
            Asset Management
          </div>

          <div className="hover:bg-gray-800 rounded-xl px-4 py-3 cursor-pointer transition">
            Employee Allocation
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

          <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-medium transition">
            + Add Asset
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {stats.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
            >
              <p className="text-gray-500 text-sm">{item.title}</p>
              <h3 className="text-4xl font-bold text-gray-900 mt-3">
                {item.value}
              </h3>
            </div>
          ))}
        </div>

        {/* Recent Assets Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-800">
              Recent Assets
            </h3>

            <input
              type="text"
              placeholder="Search Assets"
              className="border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-red-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-gray-600 font-semibold">
                    Asset
                  </th>
                  <th className="text-left px-6 py-4 text-gray-600 font-semibold">
                    Employee
                  </th>
                  <th className="text-left px-6 py-4 text-gray-600 font-semibold">
                    Department
                  </th>
                  <th className="text-left px-6 py-4 text-gray-600 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentAssets.map((item, index) => (
                  <tr
                    key={index}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {item.asset}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {item.employee}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {item.department}
                    </td>

                    <td className="px-6 py-4">
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
