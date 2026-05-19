'use client';

import IntegraBrandingAssets from '@/components/integra-branding-assets';
import IntegraIconI from '@/components/integra-icon-i';

export default function BrandingPage() {
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Integra Markets Branding</h1>
        <p className="text-gray-400 mb-12">Complete branding system with icons, logos, and assets</p>

        {/* App Icon Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">App Icon - Letter "i"</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <IntegraIconI size={128} />
            <IntegraIconI size={96} />
            <IntegraIconI size={64} />
            <IntegraIconI size={48} />
          </div>
          <p className="text-gray-400 mt-4">Emerald green icon with white "i" letter. Scalable from 16px to 1024px.</p>
        </section>

        {/* Branding Assets Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Text Branding Variants</h2>
          <IntegraBrandingAssets />
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
