"use client"

import IntegraAppIcon from "./integra-app-icon"
import { Twitter, Instagram, Linkedin, Download } from "lucide-react"

// Social Media Profile Picture Component
function SocialProfilePicture({ size = 400, platform }: { size?: number; platform: string }) {
  return (
    <div className="relative">
      <IntegraAppIcon size={size} />
      <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1">
        <div className="text-xs font-mono text-gray-600">{platform}</div>
      </div>
    </div>
  )
}

// Twitter Header Component
function TwitterHeader() {
  return (
    <div className="w-full h-48 bg-gradient-to-r from-black via-gray-900 to-black relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-12 gap-4 h-full">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="bg-emerald-500 rounded-sm opacity-20"></div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <IntegraAppIcon size={80} />
            <div>
              <h1 className="text-3xl font-thin text-white">integra</h1>
              <p className="text-sm text-emerald-400 font-light">Markets</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm font-thin max-w-md">
            AI-powered sentiment analysis for commodity traders. Get the edge—before the markets move.
          </p>
        </div>
      </div>
    </div>
  )
}

// Instagram Story Template
function InstagramStoryTemplate() {
  return (
    <div className="w-64 h-96 bg-black relative overflow-hidden rounded-lg">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black"></div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        <IntegraAppIcon size={120} />
        <h2 className="text-white text-xl font-thin mt-6 mb-2">Market Intelligence</h2>
        <p className="text-emerald-400 text-sm font-light mb-4">Built for Traders</p>
        <p className="text-gray-300 text-xs font-thin leading-relaxed">
          Real-time sentiment analysis across oil, gas, agriculture, and metals markets
        </p>
        <div className="mt-6 bg-emerald-500 text-black px-4 py-2 text-xs font-medium rounded">Download Now</div>
      </div>
    </div>
  )
}

// LinkedIn Company Banner
function LinkedInBanner() {
  return (
    <div className="w-full h-56 bg-gradient-to-r from-black to-gray-800 relative overflow-hidden">
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10B981" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-between px-12">
        <div className="flex items-center space-x-6">
          <IntegraAppIcon size={100} />
          <div>
            <h1 className="text-4xl font-thin text-white mb-2">integra Markets</h1>
            <p className="text-emerald-400 text-lg font-light mb-2">Market Intelligence Platform</p>
            <p className="text-gray-300 text-sm font-thin max-w-lg">
              Transforming commodity trading with AI-powered sentiment analysis and predictive insights
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-emerald-400 text-2xl font-thin mb-1">24/7</div>
          <div className="text-gray-400 text-xs font-thin uppercase tracking-wider">Market Coverage</div>
        </div>
      </div>
    </div>
  )
}

export default function SocialMediaKit() {
  const platforms = [
    {
      name: "Twitter",
      icon: Twitter,
      profileSize: "400x400px",
      headerSize: "1500x500px",
      color: "#1DA1F2",
      specs: [
        { type: "Profile Picture", size: "400x400px", note: "Displays as 128x128px" },
        { type: "Header Image", size: "1500x500px", note: "Safe area: 1500x350px" },
        { type: "Tweet Image", size: "1200x675px", note: "16:9 aspect ratio" },
      ],
    },
    {
      name: "Instagram",
      icon: Instagram,
      profileSize: "320x320px",
      headerSize: "1080x1920px",
      color: "#E4405F",
      specs: [
        { type: "Profile Picture", size: "320x320px", note: "Displays as 150x150px" },
        { type: "Story", size: "1080x1920px", note: "9:16 aspect ratio" },
        { type: "Post (Square)", size: "1080x1080px", note: "1:1 aspect ratio" },
        { type: "Post (Portrait)", size: "1080x1350px", note: "4:5 aspect ratio" },
      ],
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      profileSize: "400x400px",
      headerSize: "1584x396px",
      color: "#0077B5",
      specs: [
        { type: "Profile Picture", size: "400x400px", note: "Displays as 200x200px" },
        { type: "Company Banner", size: "1584x396px", note: "4:1 aspect ratio" },
        { type: "Post Image", size: "1200x627px", note: "1.91:1 aspect ratio" },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <IntegraAppIcon size={120} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Integra Markets</h1>
          <h2 className="text-2xl font-light text-gray-600 mb-2">Social Media Brand Kit</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Complete social media assets and brand guidelines for Twitter, Instagram, and LinkedIn. All assets optimized
            for maximum impact and brand consistency.
          </p>
        </div>

        {/* Platform Assets */}
        <div className="space-y-16">
          {/* Twitter Section */}
          <section>
            <div className="flex items-center mb-8">
              <div className="w-1 h-8 bg-blue-500 mr-4 rounded"></div>
              <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                <Twitter className="mr-3 text-blue-500" size={28} />
                Twitter Assets
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Profile Picture */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h4 className="font-semibold text-gray-800 mb-4">Profile Picture (400x400px)</h4>
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200">
                    <IntegraAppIcon size={128} />
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center">Displays as 128x128px on Twitter</p>
              </div>

              {/* Header Image */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h4 className="font-semibold text-gray-800 mb-4">Header Image (1500x500px)</h4>
                <div className="rounded-lg overflow-hidden border">
                  <TwitterHeader />
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">Safe area: 1500x350px</p>
              </div>
            </div>
          </section>

          {/* Instagram Section */}
          <section>
            <div className="flex items-center mb-8">
              <div className="w-1 h-8 bg-pink-500 mr-4 rounded"></div>
              <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                <Instagram className="mr-3 text-pink-500" size={28} />
                Instagram Assets
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {/* Profile Picture */}
              <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
                <h4 className="font-semibold text-gray-800 mb-4">Profile Picture</h4>
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-pink-200">
                    <IntegraAppIcon size={96} />
                  </div>
                </div>
                <p className="text-sm text-gray-500">320x320px</p>
              </div>

              {/* Story Template */}
              <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
                <h4 className="font-semibold text-gray-800 mb-4">Story Template</h4>
                <div className="flex justify-center mb-4">
                  <InstagramStoryTemplate />
                </div>
                <p className="text-sm text-gray-500">1080x1920px (9:16)</p>
              </div>

              {/* Post Template */}
              <div className="bg-white rounded-xl p-6 shadow-sm border text-center">
                <h4 className="font-semibold text-gray-800 mb-4">Square Post</h4>
                <div className="flex justify-center mb-4">
                  <div className="w-48 h-48 bg-black rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <IntegraAppIcon size={80} />
                      <p className="text-white text-sm mt-2 font-thin">Market Intelligence</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">1080x1080px (1:1)</p>
              </div>
            </div>
          </section>

          {/* LinkedIn Section */}
          <section>
            <div className="flex items-center mb-8">
              <div className="w-1 h-8 bg-blue-600 mr-4 rounded"></div>
              <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                <Linkedin className="mr-3 text-blue-600" size={28} />
                LinkedIn Assets
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Profile Picture */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h4 className="font-semibold text-gray-800 mb-4">Company Logo (400x400px)</h4>
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-lg overflow-hidden border-4 border-blue-200">
                    <IntegraAppIcon size={128} />
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center">Displays as 200x200px on LinkedIn</p>
              </div>

              {/* Company Banner */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h4 className="font-semibold text-gray-800 mb-4">Company Banner (1584x396px)</h4>
                <div className="rounded-lg overflow-hidden border">
                  <LinkedInBanner />
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">4:1 aspect ratio</p>
              </div>
            </div>
          </section>
        </div>

        {/* Specifications Table */}
        <section className="mt-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
            <div className="w-1 h-8 bg-emerald-500 mr-4 rounded"></div>
            Technical Specifications
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {platforms.map((platform) => (
              <div key={platform.name} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center mb-6">
                  <platform.icon className="mr-3" size={24} style={{ color: platform.color }} />
                  <h4 className="text-lg font-semibold text-gray-800">{platform.name}</h4>
                </div>

                <div className="space-y-4">
                  {platform.specs.map((spec, index) => (
                    <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-700 text-sm">{spec.type}</span>
                        <span className="font-mono text-xs text-gray-500">{spec.size}</span>
                      </div>
                      <p className="text-xs text-gray-500">{spec.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Brand Guidelines */}
        <section className="mt-16 bg-gradient-to-r from-gray-900 to-black rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <div className="w-1 h-8 bg-emerald-500 mr-4 rounded"></div>
            Brand Guidelines
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-emerald-400">Logo Usage</h4>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Always use on dark backgrounds</li>
                <li>• Maintain minimum 20px clear space</li>
                <li>• Never distort or rotate</li>
                <li>• Use emerald green accent color</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-emerald-400">Typography</h4>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Primary: System fonts</li>
                <li>• Weight: Thin to Normal</li>
                <li>• "integra" lowercase</li>
                <li>• "Markets" title case</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-emerald-400">Color Palette</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-black border border-emerald-500 rounded mr-2"></div>
                  <span className="text-xs font-mono">#000000</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-emerald-500 rounded mr-2"></div>
                  <span className="text-xs font-mono">#10B981</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                  <span className="text-xs font-mono">#6B7280</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-emerald-400">Voice & Tone</h4>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Professional yet approachable</li>
                <li>• Data-driven insights</li>
                <li>• Trader-focused language</li>
                <li>• Confident and precise</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Download Section */}
        <section className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-sm border">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Download Brand Assets</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Get the complete brand kit including all logo variations, social media templates, and brand guidelines in
              various formats.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg font-medium flex items-center transition-colors">
                <Download className="mr-2" size={20} />
                Download PNG Assets
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium flex items-center transition-colors">
                <Download className="mr-2" size={20} />
                Download SVG Assets
              </button>
              <button className="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium flex items-center transition-colors">
                <Download className="mr-2" size={20} />
                Brand Guidelines PDF
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
