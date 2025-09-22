"use client"

import { useEffect, useState } from "react"

export default function Component() {
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
      {/* Large 'i' Icon with Rounded Square */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="w-48 h-48 border-4 border-white rounded-3xl flex flex-col items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-full mb-6"></div>
          <div className="w-4 h-24 bg-white rounded-full"></div>
        </div>
      </div>

      {/* Smaller Text Below */}
      <div className="text-white text-sm font-light tracking-wider flex items-center">
        <span className="font-medium">integra</span>
        <span className="font-extralight ml-1 text-xs">Markets</span>
      </div>
    </div>
  )
}
