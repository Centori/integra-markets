"use client"

import { useEffect, useState } from "react"
import ShinyText from "./ShinyText"

export default function IntegraLoadingPage() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }
        return prev + 1
      })
    }, 50)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative">
      {/* Large 'i' Icon with Square Container */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="w-48 h-48 border-4 border-emerald-500 rounded-lg flex flex-col items-center justify-center">
          <div className="w-4 h-4 bg-emerald-500 rounded-sm mb-6"></div>
          <div className="w-4 h-24 bg-emerald-500 rounded-sm"></div>
        </div>
      </div>

      {/* Shiny Text Below */}
      <div className="text-sm font-light tracking-wider flex items-center">
        <ShinyText text="integra" speed={3} className="font-medium mr-1" />
        <span className="font-extralight text-xs text-white ml-1">Markets</span>
      </div>
    </div>
  )
}
