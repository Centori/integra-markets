'use client';

import Image from 'next/image';

export default function BrandingPage() {
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Integra Markets Branding</h1>
        <p className="text-gray-400 mb-12">Complete branding system with icons, logos, and assets adapted from premium fintech design</p>

        {/* App Icon Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">App Icon - Letter "i"</h2>
          <div className="bg-gray-900 p-8 rounded-lg flex items-center justify-center">
            <Image
              src="/integra-icon-i.png"
              alt="Integra Markets App Icon"
              width={256}
              height={256}
              className="rounded-lg"
            />
          </div>
          <p className="text-gray-400 mt-4">Emerald green app icon with white "i" letter. Perfect for iOS and Android app stores.</p>
        </section>

        {/* Branding Assets Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Text Branding Variants</h2>
          <div className="space-y-8">
            {/* Emerald Green Variant */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Emerald Green Variant</h3>
              <Image
                src="/integra-branding-emerald.png"
                alt="Integra branding in emerald green"
                width={800}
                height={200}
                className="w-full rounded"
              />
            </div>

            {/* White Variant */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">White Variant</h3>
              <Image
                src="/integra-branding-white.png"
                alt="Integra branding in white"
                width={800}
                height={200}
                className="w-full rounded"
              />
            </div>

            {/* Modern Variant */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Modern Variant with Pixelated Accents</h3>
              <Image
                src="/integra-branding-modern.png"
                alt="Integra branding modern design"
                width={800}
                height={200}
                className="w-full rounded"
              />
            </div>

            {/* Minimal Variant */}
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Minimal Variant</h3>
              <Image
                src="/integra-branding-minimal.png"
                alt="Integra branding minimal"
                width={800}
                height={200}
                className="w-full rounded"
              />
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Color Palette</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg">
              <div className="w-full h-24 bg-[#4ECCA3] rounded mb-4"></div>
              <p className="font-semibold text-black">Emerald Green</p>
              <p className="text-gray-600 text-sm">#4ECCA3</p>
            </div>
            <div className="bg-white p-6 rounded-lg">
              <div className="w-full h-24 bg-black rounded mb-4"></div>
              <p className="font-semibold text-black">Black</p>
              <p className="text-gray-600 text-sm">#000000</p>
            </div>
            <div className="bg-white p-6 rounded-lg">
              <div className="w-full h-24 bg-gray-900 rounded mb-4"></div>
              <p className="font-semibold text-black">Dark Gray</p>
              <p className="text-gray-600 text-sm">#121212</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-lg">
              <div className="w-full h-24 bg-white rounded mb-4"></div>
              <p className="font-semibold text-white">White</p>
              <p className="text-gray-400 text-sm">#FFFFFF</p>
            </div>
          </div>
        </section>

        {/* JSON Data */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Brand Data (JSON)</h2>
          <div className="bg-gray-900 p-6 rounded-lg overflow-auto max-h-96">
            <pre className="text-gray-300 text-sm font-mono">
{JSON.stringify(
  {
    brand: "Integra Markets",
    icon: "Letter i",
    colors: {
      primary: "#4ECCA3",
      black: "#000000",
      darkGray: "#121212",
      white: "#FFFFFF"
    },
    typography: {
      family: "Inter, system-ui",
      weights: ["400", "600", "700"]
    },
    assets: [
      "App Icon (i)",
      "Logo - Emerald Green",
      "Logo - White",
      "Logo - Modern with Accents",
      "Logo - Minimal"
    ]
  },
  null,
  2
)}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
