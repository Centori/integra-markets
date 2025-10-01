"use client"

import { useState } from "react"
import { X, Sparkles, TrendingDown, ExternalLink, Share2 } from "lucide-react"

// Mock news data
const newsData = {
  title: "US Natural Gas Storage Exceeds Expectations",
  summary:
    "Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets.",
  source: "Bloomberg",
  timeAgo: "2 hours ago",
  sentiment: "BEARISH",
  sentimentScore: 0.77,
  sentimentColor: "text-red-400",
  sentimentBg: "bg-red-500",
}

// AI Analysis data
const aiAnalysis = {
  summary:
    "Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets. This could signal bearish pressure on natural gas prices in the near term.",
  finbertSentiment: {
    bullish: 20.0,
    bearish: 20.0,
    neutral: 70.0,
  },
  keyDrivers: [
    { term: "market", score: 0.5 },
    { term: "supply", score: 0.7 },
    { term: "inventory", score: 0.6 },
    { term: "storage", score: 0.8 },
    { term: "oversupply", score: 0.9 },
  ],
  marketImpact: {
    level: "MEDIUM",
    confidence: 0.5,
  },
  tradeIdeas: [
    "Consider shorting natural gas futures if prices fall below $2.50",
    "Monitor inventory levels for continued oversupply signals",
    "Watch for seasonal demand patterns in upcoming weeks",
  ],
}

function NewsCard({ onAIClick }: { onAIClick: () => void }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 max-w-md mx-auto">
      {/* Sentiment Badge and AI Icon */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TrendingDown className="text-red-400 w-4 h-4" />
          <span className="text-red-400 text-sm font-medium">BEARISH</span>
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">77%</span>
        </div>
        <button
          onClick={onAIClick}
          className="text-emerald-400 hover:text-emerald-300 transition-colors p-1 animate-pulse"
          aria-label="View AI Analysis"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* News Content */}
      <h3 className="text-white text-lg font-medium mb-2 leading-tight">{newsData.title}</h3>
      <p className="text-gray-400 text-sm mb-4 leading-relaxed">{newsData.summary}</p>

      {/* Source and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-blue-400 text-sm font-medium">Bloomberg</span>
          <ExternalLink className="w-3 h-3 text-blue-400" />
        </div>
        <div className="flex items-center space-x-4">
          <Share2 className="w-4 h-4 text-gray-500" />
          <span className="text-gray-500 text-sm">2 hours ago</span>
        </div>
      </div>
    </div>
  )
}

function AIAnalysisOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-white text-xl font-medium">AI Sentiment Analysis</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Article Title */}
          <div>
            <h3 className="text-white text-lg font-medium mb-2">{newsData.title}</h3>
            <span className="text-blue-400 text-sm">Bloomberg</span>
          </div>

          {/* Summary Section */}
          <div>
            <div className="flex items-center mb-3">
              <div className="w-1 h-5 bg-blue-500 rounded mr-3"></div>
              <h4 className="text-white font-medium">Summary</h4>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{aiAnalysis.summary}</p>
          </div>

          {/* FinBERT Sentiment */}
          <div>
            <div className="flex items-center mb-4">
              <div className="w-1 h-5 bg-blue-500 rounded mr-3"></div>
              <h4 className="text-white font-medium">FinBERT Sentiment</h4>
            </div>

            <div className="space-y-3">
              {/* Bullish */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Bullish</span>
                <span className="text-emerald-400 text-sm font-medium">{aiAnalysis.finbertSentiment.bullish}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${aiAnalysis.finbertSentiment.bullish}%` }}
                ></div>
              </div>

              {/* Bearish */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Bearish</span>
                <span className="text-red-400 text-sm font-medium">{aiAnalysis.finbertSentiment.bearish}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${aiAnalysis.finbertSentiment.bearish}%` }}
                ></div>
              </div>

              {/* Neutral */}
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Neutral</span>
                <span className="text-yellow-400 text-sm font-medium">{aiAnalysis.finbertSentiment.neutral}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${aiAnalysis.finbertSentiment.neutral}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Key Sentiment Drivers */}
          <div>
            <div className="flex items-center mb-3">
              <div className="w-1 h-5 bg-blue-500 rounded mr-3"></div>
              <h4 className="text-white font-medium">Key Sentiment Drivers</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiAnalysis.keyDrivers.map((driver, index) => (
                <span key={index} className="bg-yellow-500 text-black text-xs px-3 py-1 rounded-full font-medium">
                  {driver.term} ({driver.score})
                </span>
              ))}
            </div>
          </div>

          {/* Market Impact */}
          <div>
            <div className="flex items-center mb-3">
              <div className="w-1 h-5 bg-blue-500 rounded mr-3"></div>
              <h4 className="text-white font-medium">Market Impact</h4>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-yellow-500 text-black text-sm px-3 py-1 rounded-full font-medium">
                {aiAnalysis.marketImpact.level}
              </span>
              <span className="text-gray-400 text-sm">Confidence: {aiAnalysis.marketImpact.confidence}</span>
            </div>
          </div>

          {/* Trade Ideas */}
          <div>
            <div className="flex items-center mb-3">
              <div className="w-1 h-5 bg-blue-500 rounded mr-3"></div>
              <h4 className="text-white font-medium">Trade Ideas</h4>
            </div>
            <div className="space-y-2">
              {aiAnalysis.tradeIdeas.map((idea, index) => (
                <p key={index} className="text-gray-300 text-sm leading-relaxed">
                  • {idea}
                </p>
              ))}
            </div>
          </div>

          {/* AI Attribution */}
          <div className="flex items-center justify-center pt-4 border-t border-gray-800">
            <div className="flex items-center space-x-2 text-gray-500">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs italic">AI-powered market analysis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AIAnalysisPreview() {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="space-y-8 w-full max-w-2xl">
        {/* Demo Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-black border-2 border-emerald-500 rounded-lg flex items-center justify-center mr-4">
              <div className="w-2 h-2 bg-emerald-500 rounded-sm mb-2"></div>
              <div className="w-2 h-6 bg-emerald-500 rounded-sm absolute"></div>
            </div>
            <div>
              <h1 className="text-white text-2xl font-thin">integra</h1>
              <p className="text-emerald-400 text-sm font-light">Markets</p>
            </div>
          </div>
          <h2 className="text-white text-3xl font-thin mb-4">AI Analysis Overlay</h2>
          <p className="text-gray-400 text-lg font-thin mb-6">
            Click the sparkle icon to view comprehensive AI-powered market analysis
          </p>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-emerald-400 text-sm font-thin">
              ✨ Interactive Demo - Experience the full AI analysis interface
            </p>
          </div>
        </div>

        {/* News Feed Simulation */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-emerald-500 text-black px-4 py-2 rounded-full text-sm font-medium">All</div>
            <div className="bg-gray-800 text-gray-400 px-4 py-2 rounded-full text-sm">Bullish</div>
            <div className="bg-gray-800 text-gray-400 px-4 py-2 rounded-full text-sm">Neutral</div>
            <div className="bg-gray-800 text-gray-400 px-4 py-2 rounded-full text-sm">Bearish</div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
              <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 h-2 rounded-full w-3/4"></div>
            </div>
            <p className="text-gray-400 text-sm text-center">114 trader forecasts</p>
          </div>

          {/* News Card */}
          <NewsCard onAIClick={() => setIsOverlayOpen(true)} />

          {/* Additional Demo Cards */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 opacity-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="text-emerald-400 text-sm font-medium">BULLISH</span>
                <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded font-medium">82%</span>
              </div>
              <Sparkles className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-gray-500 text-lg font-medium mb-2">OPEC+ Production Cuts Signal Tighter Supply</h3>
            <p className="text-gray-600 text-sm mb-4">Unexpected production cuts announced...</p>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Reuters</span>
              <span className="text-gray-600 text-sm">4 hours ago</span>
            </div>
          </div>
        </div>

        {/* AI Analysis Overlay */}
        <AIAnalysisOverlay isOpen={isOverlayOpen} onClose={() => setIsOverlayOpen(false)} />

        {/* Instructions */}
        <div className="text-center pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-sm font-thin">
            This demo showcases the AI analysis overlay that appears when users click the sparkle icon on news cards.
            <br />
            The interface provides comprehensive sentiment analysis, trade ideas, and market insights.
          </p>
        </div>
      </div>
    </div>
  )
}
