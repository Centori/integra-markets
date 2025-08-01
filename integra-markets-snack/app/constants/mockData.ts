export const aiAnalysis = {
  summary: "Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets. This could signal bearish pressure on natural gas prices in the near term.",
  finbertSentiment: {
    bullish: 20.0,
    bearish: 70.0,
    neutral: 10.0,
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
  whatThisMeansForTraders: [
    "The bearish sentiment combined with oversupply indicators suggests potential downward pressure on natural gas prices.",
    "Traders should monitor inventory levels closely and consider risk management strategies for existing long positions.",
    "Seasonal demand patterns in upcoming weeks will be crucial to watch."
  ],
  tradeIdeas: [
    "Consider shorting natural gas futures if prices fall below $2.50",
    "Monitor inventory levels for continued oversupply signals",
    "Watch for seasonal demand patterns in upcoming weeks",
  ],
};