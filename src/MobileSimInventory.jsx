export default function MobileSimInventory() {
  const mobileData = [
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
    {
      sr: 2,
      assetType: 'SIM Card',
      employee: 'Priya Mehta',
      department: 'HR',
      brand: 'Apple',
      model: 'iPhone 14',
      imei: '874512369874563',
      simCompany: 'Jio',
      simNumber: '9123456780',
      status: 'Available',
      vendor: 'Reliance Digital',
    },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-10">

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Mobile & SIM Allotted
        </h2>

        <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-medium transition">
          + Add Mobile Asset
        </button>
      </div>

      <div className="overflow-x-auto">

        <table className="min-w-full border border-gray-200">

          <thead className="bg-black text-white">

            <tr>
              <th className="px-4 py-3 text-left">Sr</th>
              <th className="px-4 py-3 text-left">Asset Type</th>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Mobile Brand</th>
              <th className="px-4 py-3 text-left">Mobile Model</th>
              <th className="px-4 py-3 text-left">Mobile IMEI</th>
              <th className="px-4 py-3 text-left">SIM Company</th>
              <th className="px-4 py-3 text-left">SIM Number</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Vendor</th>
            </tr>

          </thead>

          <tbody>

            {mobileData.map((item, index) => (

              <tr
                key={index}
                className="border-t border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-3">{item.sr}</td>

                <td className="px-4 py-3">
                  {item.assetType}
                </td>

                <td className="px-4 py-3">
                  {item.employee}
                </td>

                <td className="px-4 py-3">
                  {item.department}
                </td>

                <td className="px-4 py-3">
                  {item.brand}
                </td>

                <td className="px-4 py-3">
                  {item.model}
                </td>

                <td className="px-4 py-3">
                  {item.imei}
                </td>

                <td className="px-4 py-3">
                  {item.simCompany}
                </td>

                <td className="px-4 py-3">
                  {item.simNumber}
                </td>

                <td className="px-4 py-3">

                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                    {item.status}
                  </span>

                </td>

                <td className="px-4 py-3">
                  {item.vendor}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}