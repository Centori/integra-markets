"use client"

import { TrendingUp, BarChart3, Zap, Globe, Instagram, Twitter, Linkedin, Youtube } from "lucide-react"
import { useState } from "react"
import SupabaseAuthModal from "./components/supabase-auth-modal"
import { signInWithGoogle } from "./lib/supabase"

// Integra Icon Component
function IntegraIcon({ size = 40 }: { size?: number }) {
  const dotSize = size * 0.1
  const lineWidth = size * 0.1
  const lineHeight = size * 0.35
  const containerSize = size * 0.8
  const borderWidth = Math.max(1, size * 0.05)

  return (
    <div
      className="bg-black border-emerald-500 flex flex-col items-center justify-center"
      style={{
        width: containerSize,
        height: containerSize,
        borderWidth: borderWidth,
        borderRadius: size * 0.1,
      }}
    >
      <div
        className="bg-emerald-500"
        style={{
          width: dotSize,
          height: dotSize,
          marginBottom: size * 0.06,
          borderRadius: size * 0.02,
        }}
      />
      <div
        className="bg-emerald-500"
        style={{
          width: lineWidth,
          height: lineHeight,
          borderRadius: size * 0.02,
        }}
      />
    </div>
  )
}

// iOS App Store Logo Component
function AppStoreLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.81.87.78 0 2.26-1.07 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

// Google Play Logo Component
function GooglePlayLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
    </svg>
  )
}

export default function IntegraLandingPage() {
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: "login" | "signup" }>({
    isOpen: false,
    mode: "login",
  })

  const openAuthModal = (mode: "login" | "signup") => {
    setAuthModal({ isOpen: true, mode })
  }

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, mode: "login" })
  }

  const switchAuthMode = (mode: "login" | "signup") => {
    setAuthModal((prev) => ({ ...prev, mode }))
  }

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error("Google auth error:", error)
      // Optionally show an error message to the user
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-light tracking-wide">
      {/* Header */}
      <header className="px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <IntegraIcon size={36} />
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-normal text-white">integra</span>
              <span className="text-sm font-thin text-gray-500">Markets</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-12">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors font-light">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors font-light">
              How It Works
            </a>
            <a href="#about" className="text-sm text-gray-400 hover:text-white transition-colors font-light">
              About
            </a>
            <button
              onClick={() => openAuthModal("login")}
              className="login-btn text-sm text-gray-400 hover:text-white transition-colors font-light"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuthModal("signup")}
              className="signup-btn bg-emerald-500 hover:bg-emerald-400 text-black font-normal px-3 py-1.5 text-xs transition-colors"
            >
              Sign Up
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-8 py-20 lg:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-12">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-7xl font-thin leading-[0.9] tracking-tight">
                  <span className="text-white">Smarter</span>{" "}
                  <span className="text-emerald-400 font-extralight">Sentiment</span>
                  <br />
                  <span className="text-white">for Commodity</span>
                  <br />
                  <span className="text-white">Traders</span>
                </h1>
                <p className="text-lg text-gray-400 leading-relaxed max-w-lg font-thin">
                  AI-powered sentiment analysis and predictive insights across oil, gas, agriculture, and metals.
                  <br />
                  <span className="text-emerald-400">Get the edge—before the markets move.</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => openAuthModal("signup")}
                    className="signup-btn bg-emerald-500 hover:bg-emerald-400 text-black font-normal px-6 py-3 text-sm transition-colors rounded-lg"
                  >
                    Get Started
                  </button>
                  <button
                    onClick={handleGoogleAuth}
                    className="bg-white hover:bg-gray-100 text-black font-normal px-6 py-3 text-sm transition-colors rounded-lg flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>
                <div className="flex gap-4">
                  <a
                    href="#"
                    className="w-6 h-6 border border-gray-700 hover:border-emerald-400 transition-colors flex items-center justify-center"
                  >
                    <AppStoreLogo size={9} />
                  </a>
                  <a
                    href="#"
                    className="w-6 h-6 border border-gray-700 hover:border-emerald-400 transition-colors flex items-center justify-center"
                  >
                    <GooglePlayLogo size={9} />
                  </a>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-8 pt-12 border-t border-gray-800">
                <div>
                  <div className="text-2xl font-thin text-emerald-400 mb-1">24/7</div>
                  <div className="text-xs text-gray-500 font-thin uppercase tracking-widest">Coverage</div>
                </div>
                <div>
                  <div className="text-2xl font-thin text-emerald-400 mb-1">Real-time</div>
                  <div className="text-xs text-gray-500 font-thin uppercase tracking-widest">Analysis</div>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <img
                  src="/app-screenshot.png"
                  alt="Integra Markets News App - Real-time sentiment analysis showing neutral and bearish market indicators for natural gas, corn, and oil markets with precise sentiment scores"
                  className="w-full max-w-md lg:max-w-lg xl:max-w-xl mx-auto drop-shadow-2xl"
                />
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-emerald-400/5 rounded-3xl blur-3xl -z-10 scale-110"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-8 py-20 bg-gray-950/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-thin mb-4 tracking-tight">
              <span className="text-white">Not Just AI.</span>{" "}
              <span className="text-emerald-400 font-extralight">Market Intelligence</span>
              <br />
              <span className="text-gray-400 text-2xl lg:text-3xl font-thin">— built for traders, by traders.</span>
            </h2>
            <p className="text-base text-gray-400 max-w-2xl mx-auto font-thin leading-relaxed">
              Real market expertise combined with cutting-edge AI for commodity trading insights that actually work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-8 border border-gray-800 hover:border-emerald-500/30 transition-colors">
              <div className="w-8 h-8 mb-8">
                <TrendingUp className="text-emerald-400 w-full h-full" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-thin mb-4 text-white">Sentiment Analysis</h3>
              <p className="text-sm text-gray-400 font-thin leading-relaxed">
                VADER and FinBERT models analyze headlines with confidence scores.
              </p>
            </div>

            <div className="p-8 border border-gray-800 hover:border-emerald-500/30 transition-colors">
              <div className="w-8 h-8 mb-8">
                <BarChart3 className="text-emerald-400 w-full h-full" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-thin mb-4 text-white">Predictive Analytics</h3>
              <p className="text-sm text-gray-400 font-thin leading-relaxed">
                Advanced algorithms predict price movements and trading opportunities.
              </p>
            </div>

            <div className="p-8 border border-gray-800 hover:border-emerald-500/30 transition-colors">
              <div className="w-8 h-8 mb-8">
                <Zap className="text-emerald-400 w-full h-full" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-thin mb-4 text-white">Real-time Insights</h3>
              <p className="text-sm text-gray-400 font-thin leading-relaxed">
                Instant notifications as market-moving news breaks.
              </p>
            </div>

            <div className="p-8 border border-gray-800 hover:border-emerald-500/30 transition-colors">
              <div className="w-8 h-8 mb-8">
                <Globe className="text-emerald-400 w-full h-full" strokeWidth={1} />
              </div>
              <h3 className="text-lg font-thin mb-4 text-white">Global Coverage</h3>
              <p className="text-sm text-gray-400 font-thin leading-relaxed">
                Worldwide monitoring of oil, gas, agriculture, and metals markets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-8 py-20 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-thin mb-8 tracking-tight">
              <span className="text-white">How It</span> <span className="text-emerald-400 font-extralight">Works</span>
            </h2>
          </div>

          <div className="space-y-8 text-base leading-loose">
            <p className="text-gray-300 font-thin">
              <span className="text-emerald-400 font-normal">VADER</span> is a fast, lightweight model that understands
              the emotion in short texts like headlines and tweets. It scores sentiment from -1 (very negative) to +1
              (very positive).
            </p>

            <p className="text-gray-300 font-thin">
              <span className="text-emerald-400 font-normal">FinBERT</span> is a financial-domain AI model that reads
              longer articles and understands how sentiment impacts markets and trading.
            </p>

            <p className="text-gray-300 font-thin">
              Integra also uses{" "}
              <span className="text-emerald-400 font-normal">proprietary machine learning models</span> that learn from
              market signals and user sentiment over time — meaning the more it's used, the smarter it gets.
            </p>

            <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 mt-12">
              <p className="text-gray-200 font-thin">
                As it evolves, Integra delivers better trade ideas, sharper insights, and an edge you can rely on.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-thin mb-8 tracking-tight">
              <span className="text-white">What is</span>{" "}
              <span className="text-emerald-400 font-extralight">Integra?</span>
            </h2>
          </div>

          <div className="space-y-8 text-base leading-loose">
            <p className="text-gray-300 font-thin">
              Integra was born from the real-world pain points of physical and proprietary oil traders—designed to cut
              through complex, fast-moving market data and turn it into clear, actionable insight.
            </p>

            <p className="text-gray-300 font-thin">
              Built for speed, scale, and precision, Integra helps traders uncover inefficiencies and arbitrage
              opportunities in the energy markets—physically, quantitatively, and algorithmically.
            </p>

            <p className="text-gray-300 font-thin">It's time to get integrated.</p>

            <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 mt-16">
              <h3 className="text-lg font-thin text-emerald-400 mb-4">Why now?</h3>
              <p className="text-gray-200 font-thin">
                Volatility is everywhere. Data is fragmented. Integra brings structure to chaos—so you can trade with
                confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 border-t border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            <div className="flex items-center space-x-4">
              <IntegraIcon size={24} />
              <div className="flex items-baseline space-x-1">
                <span className="text-sm font-normal text-white">integra</span>
                <span className="text-xs font-thin text-gray-500">Markets</span>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center space-x-6">
              <a
                href="#"
                className="text-gray-500 hover:text-emerald-400 transition-colors"
                aria-label="Follow us on Twitter"
              >
                <Twitter size={20} strokeWidth={1.5} />
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-emerald-400 transition-colors"
                aria-label="Follow us on Instagram"
              >
                <Instagram size={20} strokeWidth={1.5} />
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-emerald-400 transition-colors"
                aria-label="Connect with us on LinkedIn"
              >
                <Linkedin size={20} strokeWidth={1.5} />
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-emerald-400 transition-colors"
                aria-label="Subscribe to our YouTube channel"
              >
                <Youtube size={20} strokeWidth={1.5} />
              </a>
            </div>

            <div className="text-gray-500 text-xs font-thin">© 2025 Integra Markets. All rights reserved.</div>
          </div>
        </div>
      </footer>

      {/* Supabase Auth Modal */}
      <SupabaseAuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        mode={authModal.mode}
        onSwitchMode={switchAuthMode}
      />
    </div>
  )
}
