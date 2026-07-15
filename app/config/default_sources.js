// Default website sources for news and market data
export const DEFAULT_WEBSITE_SOURCES = [
  {
    name: 'Bloomberg',
    url: 'https://www.bloomberg.com',
    category: 'Financial News',
    description: 'Global financial news and market data'
  },
  {
    name: 'Reuters',
    url: 'https://www.reuters.com',
    category: 'News',
    description: 'International news and business information'
  },
  {
    name: 'MarketWatch',
    url: 'https://www.marketwatch.com',
    category: 'Financial News',
    description: 'Stock market news and financial information'
  },
  {
    name: 'Financial Times',
    url: 'https://www.ft.com',
    category: 'Financial News',
    description: 'Global business and financial news'
  },
  {
    name: 'CNBC',
    url: 'https://www.cnbc.com',
    category: 'Business News',
    description: 'Business news and market updates'
  },
  {
    name: 'Wall Street Journal',
    url: 'https://www.wsj.com',
    category: 'Financial News',
    description: 'Business and financial news'
  },
  {
    name: 'Yahoo Finance',
    url: 'https://finance.yahoo.com',
    category: 'Financial Data',
    description: 'Stock quotes and financial news'
  },
  {
    name: 'Investing.com',
    url: 'https://www.investing.com',
    category: 'Financial Data',
    description: 'Financial markets and investment tools'
  },
  {
    name: 'Commodity.com',
    url: 'https://commodity.com',
    category: 'Commodities',
    description: 'Commodity market news and analysis'
  },
  {
    name: 'Mining Weekly',
    url: 'https://www.miningweekly.com',
    category: 'Mining',
    description: 'Mining industry news and updates'
  }
];

// Function to get suggested website URLs based on user preferences
export const getSuggestedWebsiteURLs = (preferences = {}) => {
  const { commodities = [], regions = [], interests = [] } = preferences;
  
  // Base suggestions
  let suggestions = [...DEFAULT_WEBSITE_SOURCES];
  
  // Add commodity-specific sources
  if (commodities.includes('Gold') || commodities.includes('Silver')) {
    suggestions.push({
      name: 'Kitco',
      url: 'https://www.kitco.com',
      category: 'Precious Metals',
      description: 'Precious metals news and prices'
    });
  }
  
  if (commodities.includes('Crude Oil') || commodities.includes('Natural Gas')) {
    suggestions.push({
      name: 'Oil & Gas Journal',
      url: 'https://www.ogj.com',
      category: 'Energy',
      description: 'Oil and gas industry news'
    });
  }
  
  if (commodities.some(c => ['Corn', 'Wheat', 'Soybeans'].includes(c))) {
    suggestions.push({
      name: 'AgWeb',
      url: 'https://www.agweb.com',
      category: 'Agriculture',
      description: 'Agricultural news and market information'
    });
  }
  
  // Add region-specific sources
  if (regions.includes('Asia Pacific')) {
    suggestions.push({
      name: 'Nikkei Asia',
      url: 'https://asia.nikkei.com',
      category: 'Regional News',
      description: 'Asian business and economic news'
    });
  }
  
  if (regions.includes('Europe')) {
    suggestions.push({
      name: 'EuroNews',
      url: 'https://www.euronews.com',
      category: 'Regional News',
      description: 'European news and business updates'
    });
  }
  
  return suggestions;
};

// Export default for backward compatibility
export default {
  DEFAULT_WEBSITE_SOURCES,
  getSuggestedWebsiteURLs
};