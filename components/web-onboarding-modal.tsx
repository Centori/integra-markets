"use client"

import type React from "react"
import { useState } from "react"
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Camera,
  Trash2,
  User,
  Building,
  Github,
  Linkedin,
  FileText,
} from "lucide-react"

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: any) => void
  userData?: any
}

const roleOptions = [
  { value: "Trader", icon: "📈", description: "Active market trading" },
  { value: "Analyst", icon: "📊", description: "Research & analysis" },
  { value: "Hedge Fund", icon: "🏦", description: "Fund management" },
  { value: "Bank", icon: "🏢", description: "Banking institution" },
  { value: "Refiner", icon: "⛽", description: "Oil refining operations" },
  { value: "Blender", icon: "🔄", description: "Fuel blending" },
  { value: "Producer", icon: "🏭", description: "Commodity production" },
  { value: "Shipping and Freight", icon: "🚢", description: "Transportation & logistics" },
]

const experienceOptions = [
  { value: "0-2", label: "0-2 years", description: "New to the industry" },
  { value: "3-5", label: "3-5 years", description: "Growing expertise" },
  { value: "6-10", label: "6-10 years", description: "Experienced professional" },
  { value: "10+", label: "10+ years", description: "Industry veteran" },
]

const marketFocusOptions = [
  { value: "Oil & Oil Products", icon: "⛽", color: "#30A5FF" },
  { value: "Metals & Minerals", icon: "⭐", color: "#FFD700" },
  { value: "Agricultural Products", icon: "🌱", color: "#4ECCA3" },
  { value: "Other", icon: "➕", color: "#A0A0A0" },
]

export default function WebOnboardingModal({ isOpen, onClose, onComplete, userData }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    role: "",
    experience: "",
    marketFocus: [] as string[],
    institution: "",
    linkedin: "",
    github: "",
    bio: "",
    profilePhoto: null as string | null,
    username: userData?.username || userData?.email?.split("@")[0] || "",
    fullName: userData?.fullName || "",
    email: userData?.email || "",
  })

  const totalSteps = 5

  if (!isOpen) return null

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    console.log("Onboarding completed:", formData)
    onComplete(formData)
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleMarketFocus = (market: string) => {
    setFormData((prev) => ({
      ...prev,
      marketFocus: prev.marketFocus.includes(market)
        ? prev.marketFocus.filter((m) => m !== market)
        : [...prev.marketFocus, market],
    }))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        updateFormData("profilePhoto", e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const WelcomeStep = () => (
    <div className="text-center">
      <div className="w-24 h-24 mx-auto mb-6 bg-emerald-500/10 rounded-full flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-emerald-500 rounded-lg flex flex-col items-center justify-center">
          <div className="w-2 h-2 bg-emerald-500 rounded-sm mb-1"></div>
          <div className="w-2 h-6 bg-emerald-500 rounded-sm"></div>
        </div>
      </div>
      <h2 className="text-3xl font-thin text-white mb-4">Welcome to Integra Markets</h2>
      <p className="text-gray-400 text-lg mb-8 leading-relaxed font-thin">
        The AI-powered platform for commodity trading insights and prediction markets
      </p>
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-center space-x-3 p-4 bg-emerald-500/10 rounded-lg">
          <span className="text-2xl">🤖</span>
          <span className="text-white font-thin">AI-powered market analysis</span>
        </div>
        <div className="flex items-center justify-center space-x-3 p-4 bg-blue-500/10 rounded-lg">
          <span className="text-2xl">📈</span>
          <span className="text-white font-thin">Real-time news and sentiment</span>
        </div>
      </div>
    </div>
  )

  const RoleStep = () => (
    <div>
      <h2 className="text-2xl font-thin text-white mb-2">What's your role?</h2>
      <p className="text-gray-400 mb-6 font-thin">
        Help us customize your experience - you can skip this if you prefer
      </p>
      <div className="grid grid-cols-2 gap-4">
        {roleOptions.map((role) => (
          <button
            key={role.value}
            onClick={() => updateFormData("role", role.value)}
            className={`p-4 rounded-lg border text-left transition-all relative ${
              formData.role === role.value
                ? "bg-emerald-500 border-emerald-500 text-black"
                : "bg-gray-900 border-gray-700 text-white hover:border-emerald-500"
            }`}
          >
            <div className="text-2xl mb-2">{role.icon}</div>
            <div className="font-thin mb-1">{role.value}</div>
            <div className={`text-sm font-thin ${formData.role === role.value ? "text-black/80" : "text-gray-400"}`}>
              {role.description}
            </div>
            {formData.role === role.value && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                <Check size={12} className="text-emerald-500" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )

  const ExperienceStep = () => (
    <div>
      <h2 className="text-2xl font-thin text-white mb-2">Years of experience?</h2>
      <p className="text-gray-400 mb-6 font-thin">
        This helps us tailor content complexity - you can skip this if you prefer
      </p>
      <div className="space-y-3">
        {experienceOptions.map((exp) => (
          <button
            key={exp.value}
            onClick={() => updateFormData("experience", exp.value)}
            className={`w-full p-4 rounded-lg border text-left flex items-center justify-between transition-all ${
              formData.experience === exp.value
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                : "bg-gray-900 border-gray-700 text-white hover:border-emerald-500"
            }`}
          >
            <div>
              <div className="font-thin mb-1">{exp.label}</div>
              <div className="text-sm text-gray-400 font-thin">{exp.description}</div>
            </div>
            {formData.experience === exp.value && <Check size={20} className="text-emerald-500" />}
          </button>
        ))}
      </div>
    </div>
  )

  const MarketFocusStep = () => (
    <div>
      <h2 className="text-2xl font-thin text-white mb-2">Market focus areas</h2>
      <p className="text-gray-400 mb-6 font-thin">
        Select your primary interests (multiple allowed) - you can skip this if you prefer
      </p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {marketFocusOptions.map((market) => (
          <button
            key={market.value}
            onClick={() => toggleMarketFocus(market.value)}
            className={`p-4 rounded-lg border text-center transition-all relative ${
              formData.marketFocus.includes(market.value)
                ? "bg-emerald-500 border-emerald-500 text-black"
                : "bg-gray-900 border-gray-700 text-white hover:border-emerald-500"
            }`}
          >
            <div className="text-3xl mb-2">{market.icon}</div>
            <div className="font-thin text-sm">{market.value}</div>
            {formData.marketFocus.includes(market.value) && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                <Check size={14} className="text-emerald-500" />
              </div>
            )}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          updateFormData("marketFocus", [])
          handleNext()
        }}
        className="w-full p-3 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors font-thin"
      >
        Skip for now
      </button>
    </div>
  )

  const DetailsStep = () => (
    <div>
      <h2 className="text-2xl font-thin text-white mb-2">Additional details</h2>
      <p className="text-gray-400 mb-6 font-thin">Help us personalize your experience - all fields are optional</p>

      <div className="space-y-6">
        {/* Profile Photo */}
        <div>
          <label className="block text-white font-thin mb-3">Profile Photo (Optional)</label>
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
              {formData.profilePhoto ? (
                <img
                  src={formData.profilePhoto || "/placeholder.svg"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500 text-emerald-500 px-4 py-2 rounded-lg cursor-pointer hover:bg-emerald-500/20 transition-colors">
                <Camera size={16} />
                <span className="text-sm font-thin">{formData.profilePhoto ? "Change Photo" : "Add Photo"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {formData.profilePhoto && (
                <button
                  onClick={() => updateFormData("profilePhoto", null)}
                  className="flex items-center space-x-2 bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={16} />
                  <span className="text-sm font-thin">Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Institution */}
        <div>
          <label className="block text-white font-thin mb-2">Institution/Company (Optional)</label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={formData.institution}
              onChange={(e) => updateFormData("institution", e.target.value)}
              placeholder="e.g., Goldman Sachs, Shell, etc."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none font-thin"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-white font-thin mb-2">Username or Display Name (Optional)</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={formData.username}
              onChange={(e) => updateFormData("username", e.target.value)}
              placeholder="e.g., GodModeTrader301"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none font-thin"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-white font-thin mb-2">Bio/Description (Optional)</label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 text-gray-400" size={20} />
            <textarea
              value={formData.bio}
              onChange={(e) => updateFormData("bio", e.target.value)}
              placeholder="e.g., Oil Trader at Hedge Fund with 10+ years experience"
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none resize-none font-thin"
            />
          </div>
        </div>

        {/* LinkedIn */}
        <div>
          <label className="block text-white font-thin mb-2">LinkedIn Profile (Optional)</label>
          <div className="relative">
            <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => updateFormData("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none font-thin"
            />
          </div>
        </div>

        {/* GitHub */}
        <div>
          <label className="block text-white font-thin mb-2">GitHub Profile (Optional)</label>
          <div className="relative">
            <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="url"
              value={formData.github}
              onChange={(e) => updateFormData("github", e.target.value)}
              placeholder="https://github.com/yourusername"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none font-thin"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />
      case 1:
        return <RoleStep />
      case 2:
        return <ExperienceStep />
      case 3:
        return <MarketFocusStep />
      case 4:
        return <DetailsStep />
      default:
        return <WelcomeStep />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          {currentStep > 0 ? (
            <button onClick={handlePrevious} className="p-2 text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}

          {currentStep > 0 && (
            <div className="flex-1 mx-6">
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div
                  className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
              <p className="text-center text-gray-400 text-sm mt-2 font-thin">
                {currentStep} of {totalSteps}
              </p>
            </div>
          )}

          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderStep()}</div>

        {/* Footer */}
        {currentStep > 0 && (
          <div className="p-6 border-t border-gray-700">
            {currentStep < totalSteps - 1 ? (
              <div className="space-y-3">
                <button
                  onClick={handleNext}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-3 rounded-lg font-thin flex items-center justify-center space-x-2 transition-colors"
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={handleNext}
                  className="w-full text-gray-400 hover:text-white py-2 text-sm transition-colors font-thin"
                >
                  Skip this step
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-3 rounded-lg font-thin flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Complete Setup</span>
                <Check size={16} />
              </button>
            )}
          </div>
        )}

        {/* Welcome Step Footer */}
        {currentStep === 0 && (
          <div className="p-6 border-t border-gray-700">
            <button
              onClick={handleNext}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-3 rounded-lg font-thin flex items-center justify-center space-x-2 transition-colors"
            >
              <span>Get Started</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
