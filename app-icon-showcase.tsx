"use client"

import IntegraAppIcon from "./app-icon"

export default function AppIconShowcase() {
  const iconSizes = [
    { size: 1024, label: "App Store (1024x1024)" },
    { size: 512, label: "Large (512x512)" },
    { size: 256, label: "Medium (256x256)" },
    { size: 128, label: "Small (128x128)" },
    { size: 64, label: "Notification (64x64)" },
    { size: 32, label: "Tiny (32x32)" },
  ]

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Integra Markets App Icon Kit</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {iconSizes.map(({ size, label }) => (
            <div key={size} className="bg-white rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-center text-gray-700">{label}</h3>
              <div className="flex justify-center">
                <IntegraAppIcon size={size} />
              </div>
              <p className="text-sm text-gray-500 text-center mt-2">
                {size}×{size}px
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Media Kit Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">iOS App Store</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 1024×1024px (Required)</li>
                <li>• No transparency</li>
                <li>• RGB color space</li>
                <li>• High resolution</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Android Play Store</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 512×512px (Required)</li>
                <li>• PNG format</li>
                <li>• No transparency</li>
                <li>• 32-bit PNG</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
