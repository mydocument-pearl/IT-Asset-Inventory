import { useState } from 'react'
import { db } from './firebase'
import { collection, addDoc } from 'firebase/firestore'
export default function AddAsset({ assets, setAssets }) {

  const [assetType, setAssetType] = useState('')
  const [assetCode, setAssetCode] = useState('')
  const [assetName, setAssetName] = useState('')
const [brand, setBrand] = useState('')
const [serialNumber, setSerialNumber] = useState('')
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
  value={assetName}
  onChange={(e) => setAssetName(e.target.value)}
  placeholder="Enter asset name"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>
        <div>

  <label className="block text-sm font-medium text-gray-700 mb-2">
    Asset Code
  </label>

  <input
    type="text"
    value={assetCode}
    readOnly
    className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 outline-none"
  />

</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset Type
          </label>

          <select
  value={assetType}
  onChange={(e) => {

    const value = e.target.value

    setAssetType(value)

    const prefixMap = {
  Laptop: 'LP',
  Monitor: 'MN',
  CPU: 'CPU',
  Printer: 'PR',
  Keyboard: 'KB',
  Mouse: 'MS',
  Headphone: 'HP',
}

const prefix = prefixMap[value] || 'AS'

const filteredAssets = assets.filter((item) =>
  item.assetCode?.startsWith(prefix)
)

const nextNumber = filteredAssets.length + 1

const generatedCode =
  prefix + String(nextNumber).padStart(3, '0')

setAssetCode(generatedCode)

  }}

  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500">
            <option>Select</option>
            <option>Laptop</option>
            <option>Monitor</option>
            <option>Printer</option>
            <option>CPU</option>
            <option>Keyboard</option>
            <option>Mouse</option>
            <option>Headphone</option>
            <option>RAM</option>
            <option>Laptop Stand</option>
            <option>Laptop Battery</option>
            <option>Laptop Charger</option>
            <option>External HD</option>
            <option>Hardisk</option>
            <option>HDMI Cable</option>
            <option>Power Cable</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand
          </label>

          <input
  type="text"
  value={brand}
  onChange={(e) => setBrand(e.target.value)}
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
  value={serialNumber}
  onChange={(e) => setSerialNumber(e.target.value)}
  placeholder="Enter serial number"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
          />
        </div>

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
  <label className="block text-sm font-medium text-gray-700 mb-2">
    PO Number
  </label>

  <input
    type="text"
    placeholder="Enter PO number"
    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-red-500"
  />
</div>

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
      <button
  type="button"
  onClick={async () => {

    const newAsset = {
  assetCode,
  assetType,
  assetName,
  brand,
  serialNumber,
  status: 'Available',
}

try {

  await addDoc(collection(db, 'assets'), newAsset)

  const updatedAssets = [...assets, newAsset]

  setAssets(updatedAssets)

  localStorage.setItem(
    'assets',
    JSON.stringify(updatedAssets)
  )

  alert('Asset Saved Successfully')

} catch (error) {

  console.log(error)

  alert('Error saving asset')

}

  }}

  className="mt-8 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition"
>
  Save Asset
</button>

    </div>
  )
}