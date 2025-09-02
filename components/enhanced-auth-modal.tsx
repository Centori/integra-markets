"use client"

import type React from "react"
import { useState } from "react"
import { X, Mail, Lock, User, Eye, EyeOff } from "lucide-react"
import WebOnboardingModal from "./web-onboarding-modal"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: "login" | "signup"
  onSwitchMode: (mode: "login" | "signup") => void
}

export default function EnhancedAuthModal({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: "",
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Auth form submitted:", formData)

    // If signup, show onboarding
    if (mode === "signup") {
      setShowOnboarding(true)
    } else {
      // Handle login - redirect to web app
      window.location.href = "https://app.integramarkets.app"
    }
  }

  const handleOnboardingComplete = (onboardingData: any) => {
    console.log("Complete user data:", { ...formData, ...onboardingData })
    setShowOnboarding(false)
    onClose()
    // Redirect to web app after onboarding
    window.location.href = "https://app.integramarkets.app"
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (showOnboarding) {
    return (
      <WebOnboardingModal
        isOpen={true}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
        userData={{
          email: formData.email,
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          username: formData.email.split("@")[0],
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-emerald-500/20 rounded-2xl w-full max-w-md relative">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>

        {/* Header */}
        <div className="p-8 pb-6">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 border-2 border-emerald-500 rounded-lg flex flex-col items-center justify-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-sm mb-2"></div>
              <div className="w-2 h-6 bg-emerald-500 rounded-sm"></div>
            </div>
          </div>
          <h2 className="text-2xl font-thin text-white text-center mb-2">
            {mode === "login" ? "Welcome Back" : "Join Integra"}
          </h2>
          <p className="text-gray-400 text-center text-sm font-thin">
            {mode === "login"
              ? "Sign in to access your trading dashboard"
              : "Create your account to start trading with AI insights"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8">
          <div className="space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none transition-colors font-thin"
                    required
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none transition-colors font-thin"
                    required
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none transition-colors font-thin"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none transition-colors font-thin"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {mode === "signup" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none transition-colors font-thin"
                  required
                />
              </div>
            )}
          </div>

          {mode === "login" && (
            <div className="flex justify-end mt-4">
              <button
                type="button"
                className="text-emerald-500 text-sm hover:text-emerald-400 transition-colors font-thin"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-3 rounded-lg mt-6 transition-colors font-normal"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <div className="text-center mt-6">
            <span className="text-gray-400 text-sm font-thin">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => onSwitchMode(mode === "login" ? "signup" : "login")}
              className="text-emerald-500 text-sm hover:text-emerald-400 transition-colors font-normal"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
