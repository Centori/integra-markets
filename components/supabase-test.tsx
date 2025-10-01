"use client"

import { useState, useEffect } from "react"
import { supabase, getCurrentUser } from "@/lib/supabase"
import { Check, X, AlertCircle, Loader2 } from "lucide-react"

interface TestResult {
  name: string
  status: "loading" | "success" | "error"
  message: string
}

export default function SupabaseTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Environment Variables", status: "loading", message: "Checking..." },
    { name: "Supabase Connection", status: "loading", message: "Connecting..." },
    { name: "Database Access", status: "loading", message: "Testing..." },
    { name: "Auth Service", status: "loading", message: "Verifying..." },
  ])

  useEffect(() => {
    runTests()
  }, [])

  const updateTest = (index: number, status: TestResult["status"], message: string) => {
    setTests((prev) => prev.map((test, i) => (i === index ? { ...test, status, message } : test)))
  }

  const runTests = async () => {
    // Test 1: Environment Variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
      updateTest(0, "error", "Missing or placeholder environment variables")
      updateTest(1, "error", "Cannot test without valid credentials")
      updateTest(2, "error", "Cannot test without valid credentials")
      updateTest(3, "error", "Cannot test without valid credentials")
      return
    } else {
      updateTest(0, "success", `URL: ${supabaseUrl.substring(0, 30)}...`)
    }

    // Test 2: Supabase Connection
    if (!supabase) {
      updateTest(1, "error", "Supabase client not initialized")
      updateTest(2, "error", "Cannot test without client")
      updateTest(3, "error", "Cannot test without client")
      return
    } else {
      updateTest(1, "success", "Client initialized successfully")
    }

    // Test 3: Database Access
    try {
      const { data, error } = await supabase.from("_realtime_schema_migrations").select("version").limit(1)

      if (error) {
        updateTest(2, "error", `Database error: ${error.message}`)
      } else {
        updateTest(2, "success", "Database connection successful")
      }
    } catch (err) {
      updateTest(2, "error", "Database connection failed")
    }

    // Test 4: Auth Service
    try {
      const { user, error } = await getCurrentUser()

      if (error && !error.message.includes("not authenticated")) {
        updateTest(3, "error", `Auth error: ${error.message}`)
      } else {
        updateTest(3, "success", user ? `Authenticated as: ${user.email}` : "Auth service working (not logged in)")
      }
    } catch (err) {
      updateTest(3, "error", "Auth service failed")
    }
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
      case "success":
        return <Check className="w-5 h-5 text-emerald-500" />
      case "error":
        return <X className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "loading":
        return "border-yellow-500/20 bg-yellow-500/5"
      case "success":
        return "border-emerald-500/20 bg-emerald-500/5"
      case "error":
        return "border-red-500/20 bg-red-500/5"
    }
  }

  const allTestsComplete = tests.every((test) => test.status !== "loading")
  const allTestsPassed = tests.every((test) => test.status === "success")

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 border-2 border-emerald-500 rounded-lg flex flex-col items-center justify-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-sm mb-2"></div>
              <div className="w-2 h-6 bg-emerald-500 rounded-sm"></div>
            </div>
          </div>
          <h1 className="text-3xl font-thin text-white mb-2">Supabase Connection Test</h1>
          <p className="text-gray-400 font-thin">Verifying your Supabase integration</p>
        </div>

        {/* Test Results */}
        <div className="space-y-4 mb-8">
          {tests.map((test, index) => (
            <div
              key={test.name}
              className={`p-4 rounded-lg border ${getStatusColor(test.status)} transition-all duration-300`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <span className="text-white font-medium">{test.name}</span>
                </div>
                <span className="text-sm text-gray-400 font-mono">{test.message}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Status */}
        {allTestsComplete && (
          <div
            className={`p-6 rounded-lg border text-center ${
              allTestsPassed ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
            }`}
          >
            <div className="flex items-center justify-center space-x-3 mb-4">
              {allTestsPassed ? (
                <Check className="w-8 h-8 text-emerald-500" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-500" />
              )}
              <h2 className="text-xl font-thin text-white">
                {allTestsPassed ? "All Tests Passed!" : "Some Tests Failed"}
              </h2>
            </div>
            <p className="text-gray-400 font-thin">
              {allTestsPassed
                ? "Your Supabase integration is working correctly. Authentication should work on your live site."
                : "Please check your environment variables and Supabase project settings."}
            </p>
          </div>
        )}

        {/* Environment Info */}
        <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
          <h3 className="text-white font-medium mb-3">Environment Information</h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className="text-emerald-400">{process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <span className="text-emerald-400">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Supabase Client:</span>
              <span className="text-emerald-400">{supabase ? "✓ Initialized" : "✗ Not initialized"}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={runTests}
            className="bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Run Tests Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="border border-gray-700 hover:border-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Landing Page
          </button>
        </div>
      </div>
    </div>
  )
}
