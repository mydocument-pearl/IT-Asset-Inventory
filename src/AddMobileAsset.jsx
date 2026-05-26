import { useState } from 'react'

export default function AddMobileAsset() {
    const [assetType, setAssetType] = useState('')
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-10">

      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Add Mobile & SIM Asset
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Vendor Name
  </label>

  <input
    type="text"
    placeholder="Enter vendor name"
    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
  />
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Invoice Number
  </label>

  <input
    type="text"
    placeholder="Enter invoice number"
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
    Invoice Date
  </label>

  <input
    type="date"
    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Amount
  </label>

  <input
    type="number"
    placeholder="Enter amount"
    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
  />
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Quantity
  </label>

  <input
    type="number"
    placeholder="Enter quantity"
    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
  />
</div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Asset Type
          </label>

          <select
  value={assetType}
  onChange={(e) => setAssetType(e.target.value)}
  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
>
  <option value="">Select</option>
  <option value="mobile">Mobile</option>
  <option value="sim">SIM Card</option>
</select>
        </div>

               {assetType === 'mobile' && (
  <>
  <div>
          <label className="block text-sm font-medium mb-2">
            Mobile Brand
          </label>

          <input
            type="text"
            placeholder="Samsung / Apple"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Mobile Model
          </label>

          <input
            type="text"
            placeholder="Galaxy S23"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Mobile IMEI-1
          </label>

          <input
            type="text"
            placeholder="Enter IMEI Number-1"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Mobile IMEI-2
          </label>

          <input
            type="text"
            placeholder="Enter IMEI Number-2"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>
  </>
)}
{assetType === 'sim' && (
  <>

    <div>
      <label className="block text-sm font-medium mb-2">
        SIM Company
      </label>

      <select className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500">
        <option>Select</option>
        <option>Airtel</option>
        <option>Jio</option>
        <option>Vodafone</option>
      </select>
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">
        SIM Number
      </label>

      <input
        type="text"
        placeholder="Enter SIM Number"
        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
      />
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">
        SIM IMEI
      </label>

      <input
        type="text"
        placeholder="Enter SIM IMEI"
        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
      />
    </div>

  </>
)}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Organization Name
  </label>

  <select className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500">
<option>Select</option>

    <option>On2Cook India Pvt. Ltd.</option>

    <option>InventIndia Innovations Pvt. Ltd.</option>

  </select>
</div>

        </div>

      <button className="mt-8 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition">
        Save Mobile Asset
      </button>

    </div>
  )
}