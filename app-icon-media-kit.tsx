"use client"

import IntegraAppIcon from "./integra-app-icon"

export default function AppIconMediaKit() {
  const appStoreIcons = [
    { size: 1024, label: "App Store Icon", description: "Required for iOS App Store submission" },
    { size: 512, label: "Google Play Icon", description: "Required for Android Play Store" },
    { size: 256, label: "macOS App Icon", description: "For macOS applications" },
    { size: 180, label: "iPhone App Icon", description: "iOS home screen (60pt @3x)" },
    { size: 167, label: "iPad Pro Icon", description: "iPad Pro home screen" },
    { size: 152, label: "iPad Icon", description: "iPad home screen (76pt @2x)" },
  ]

  const systemIcons = [
    { size: 128, label: "Notification Large", description: "Large notification badge" },
    { size: 87, label: "iPhone Notification", description: "iOS notification (29pt @3x)" },
    { size: 80, label: "iPad Spotlight", description: "iPad spotlight search" },
    { size: 76, label: "iPad Home", description: "iPad home screen (76pt @1x)" },
    { size: 58, label: "iPhone Spotlight", description: "iPhone spotlight (29pt @2x)" },
    { size: 40, label: "Apple Watch", description: "watchOS companion app" },
  ]

  const webIcons = [
    { size: 192, label: "Android Chrome", description: "Android Chrome home screen" },
    { size: 144, label: "Windows Tile", description: "Windows 10 medium tile" },
    { size: 96, label: "Android Launcher", description: "Android launcher icon" },
    { size: 72, label: "Android HDPI", description: "High density Android" },
    { size: 48, label: "Android MDPI", description: "Medium density Android" },
    { size: 32, label: "Favicon", description: "Website favicon" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <IntegraAppIcon size={200} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Integra Markets</h1>
          <h2 className="text-2xl font-light text-gray-600 mb-2">Complete App Icon System</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Professional app icon kit with emerald green branding. All required sizes for iOS, Android, web, and media
            applications. Designed for modern app stores and cross-platform deployment.
          </p>
        </div>

        {/* App Store Icons */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
            <div className="w-1 h-8 bg-emerald-500 mr-4 rounded"></div>
            App Store Icons
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {appStoreIcons.map(({ size, label, description }) => (
              <div
                key={size}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-center mb-4">
                  <IntegraAppIcon size={Math.min(size, 120)} />
                </div>
                <h4 className="font-semibold text-gray-800 text-center mb-1">{label}</h4>
                <p className="text-sm text-gray-500 text-center mb-2">{description}</p>
                <p className="text-xs text-gray-400 text-center font-mono">
                  {size}×{size}px
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* System Icons */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
            <div className="w-1 h-8 bg-emerald-500 mr-4 rounded"></div>
            System & Notification Icons
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {systemIcons.map(({ size, label, description }) => (
              <div key={size} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
                <div className="flex justify-center mb-3">
                  <IntegraAppIcon size={Math.min(size, 64)} />
                </div>
                <h4 className="font-medium text-gray-800 text-sm mb-1">{label}</h4>
                <p className="text-xs text-gray-500 mb-1">{description}</p>
                <p className="text-xs text-gray-400 font-mono">{size}px</p>
              </div>
            ))}
          </div>
        </section>

        {/* Web Icons */}
        <section className="mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
            <div className="w-1 h-8 bg-emerald-500 mr-4 rounded"></div>
            Web & Platform Icons
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {webIcons.map(({ size, label, description }) => (
              <div key={size} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
                <div className="flex justify-center mb-3">
                  <IntegraAppIcon size={Math.min(size, 64)} />
                </div>
                <h4 className="font-medium text-gray-800 text-sm mb-1">{label}</h4>
                <p className="text-xs text-gray-500 mb-1">{description}</p>
                <p className="text-xs text-gray-400 font-mono">{size}px</p>
              </div>
            ))}
          </div>
        </section>

        {/* Specifications */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
            <div className="w-1 h-8 bg-emerald-500 mr-4 rounded"></div>
            Technical Specifications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">iOS App Store</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  1024×1024px required
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  RGB color space
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  No transparency
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  PNG or JPEG format
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Google Play Store</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  512×512px required
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  32-bit PNG format
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  No transparency
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  Maximum 1MB file size
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Design Guidelines</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  Minimalist geometric design
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  High contrast emerald branding
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  Scalable square elements
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                  Consistent brand identity
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Brand Colors */}
        <section className="mt-16 bg-gradient-to-r from-gray-900 to-black rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <div className="w-1 h-8 bg-emerald-500 mr-4 rounded"></div>
            Brand Colors
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-black border-2 border-emerald-500 rounded-lg mx-auto mb-3"></div>
              <p className="font-mono text-sm">#000000</p>
              <p className="text-xs text-gray-300">Primary Black</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-lg mx-auto mb-3"></div>
              <p className="font-mono text-sm">#10B981</p>
              <p className="text-xs text-gray-300">Primary Emerald</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-500 rounded-lg mx-auto mb-3"></div>
              <p className="font-mono text-sm">#6B7280</p>
              <p className="text-xs text-gray-300">Secondary Grey</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-lg mx-auto mb-3"></div>
              <p className="font-mono text-sm">#FFFFFF</p>
              <p className="text-xs text-gray-300">Accent White</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
