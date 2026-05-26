export default function AddAsset() {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Add New Asset
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Name
          </label>

          <input
            type="text"
            placeholder="Enter asset name"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Type
          </label>

          <select className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500">
            <option>Laptop</option>
            <option>Monitor</option>
            <option>Printer</option>
            <option>Keyboard</option>
            <option>Mouse</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand
          </label>

          <input
            type="text"
            placeholder="Dell / HP / Lenovo"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Serial Number
          </label>

          <input
            type="text"
            placeholder="Enter serial number"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Date
          </label>

          <input
            type="date"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>

          <select className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500">
            <option>Available</option>
            <option>Assigned</option>
            <option>Under Repair</option>
          </select>
        </div>
      </div>

      <button className="mt-8 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition">
        Save Asset
      </button>
    </div>
  )
}