/**
 * Yahoo Finance API Service
 * Handles real-time commodity price data, charts, and market information
 * No API key required - uses Yahoo's public endpoints
 */

class YahooFinanceService {
  static BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
  static QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
  
  // CORS proxy for client-side requests (use your Vercel/Netlify function in production)
  static CORS_PROXY = process.env.NODE_ENV === 'production' 
    ? '/api/yahoo-proxy' 
    : 'https://api.allorigins.win/get?url=';

  // Major commodity symbols with user-friendly names
  static COMMODITY_SYMBOLS = {
    'CL=F': { name: 'Crude Oil', category: 'energy', unit: 'USD/barrel' },
    'GC=F': { name: 'Gold', category: 'metals', unit: 'USD/oz' },
    'SI=F': { name: 'Silver', category: 'metals', unit: 'USD/oz' },
    'NG=F': { name: 'Natural Gas', category: 'energy', unit: 'USD/MMBtu' },
    'HG=F': { name: 'Copper', category: 'metals', unit: 'USD/lb' },
    'PA=F': { name: 'Palladium', category: 'metals', unit: 'USD/oz' },
    'PL=F': { name: 'Platinum', category: 'metals', unit: 'USD/oz' },
    'KC=F': { name: 'Coffee', category: 'agriculture', unit: 'USD/lb' },
    'CT=F': { name: 'Cotton', category: 'agriculture', unit: 'USD/lb' },
    'ZW=F': { name: 'Wheat', category: 'agriculture', unit: 'USD/bushel' }
  };

  /**
   * Fetch real-time quote data for a single symbol
   */
  static async getQuote(symbol) {
    try {
      const url = `${this.QUOTE_URL}?symbols=${symbol}`;
      const proxyUrl = process.env.NODE_ENV === 'production' 
        ? `/api/yahoo-proxy?url=${encodeURIComponent(url)}`
        : `${this.CORS_PROXY}${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      // Handle CORS proxy response format
      const jsonData = process.env.NODE_ENV === 'production' 
        ? data 
        : JSON.parse(data.contents);
      
      if (jsonData.quoteResponse?.result?.length > 0) {
        return this.parseQuoteData(jsonData.quoteResponse.result[0]);
      }
      
      throw new Error('No data received');
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple quotes at once (more efficient)
   */
  static async getMultipleQuotes(symbols) {
    try {
      const symbolsString = symbols.join(',');
      const url = `${this.QUOTE_URL}?symbols=${symbolsString}`;
      const proxyUrl = process.env.NODE_ENV === 'production' 
        ? `/api/yahoo-proxy?url=${encodeURIComponent(url)}`
        : `${this.CORS_PROXY}${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      const jsonData = process.env.NODE_ENV === 'production' 
        ? data 
        : JSON.parse(data.contents);
      
      if (jsonData.quoteResponse?.result) {
        return jsonData.quoteResponse.result.map(quote => this.parseQuoteData(quote));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching multiple quotes:', error);
      return [];
    }
  }

  /**
   * Fetch chart data for technical analysis and mini-charts
   */
  static async getChartData(symbol, interval = '1d', range = '1mo') {
    try {
      const url = `${this.BASE_URL}${symbol}?interval=${interval}&range=${range}&includePrePost=true`;
      const proxyUrl = process.env.NODE_ENV === 'production' 
        ? `/api/yahoo-proxy?url=${encodeURIComponent(url)}`
        : `${this.CORS_PROXY}${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      const jsonData = process.env.NODE_ENV === 'production' 
        ? data 
        : JSON.parse(data.contents);
      
      if (jsonData.chart?.result?.length > 0) {
        return this.parseChartData(jsonData.chart.result[0]);
      }
      
      throw new Error('No chart data received');
    } catch (error) {
      console.error(`Error fetching chart data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Parse quote data into standardized format
   */
  static parseQuoteData(quote) {
    const symbolInfo = this.COMMODITY_SYMBOLS[quote.symbol] || { 
      name: quote.shortName || quote.symbol, 
      category: 'unknown',
      unit: 'USD'
    };

    return {
      symbol: quote.symbol,
      name: symbolInfo.name,
      category: symbolInfo.category,
      unit: symbolInfo.unit,
      price: quote.regularMarketPrice || 0,
      previousClose: quote.regularMarketPreviousClose || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      dayHigh: quote.regularMarketDayHigh || 0,
      dayLow: quote.regularMarketDayLow || 0,
      volume: quote.regularMarketVolume || 0,
      marketCap: quote.marketCap || null,
      averageVolume: quote.averageVolume || 0,
      currency: quote.currency || 'USD',
      isMarketOpen: quote.marketState === 'REGULAR',
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Parse chart data for visualization
   */
  static parseChartData(chartResult) {
    const meta = chartResult.meta;
    const timestamps = chartResult.timestamp || [];
    const quotes = chartResult.indicators?.quote?.[0];

    if (!quotes) {
      throw new Error('No quote data in chart response');
    }

    const chartData = timestamps.map((timestamp, index) => ({
      timestamp: new Date(timestamp * 1000),
      open: quotes.open?.[index],
      high: quotes.high?.[index],
      low: quotes.low?.[index],
      close: quotes.close?.[index],
      volume: quotes.volume?.[index]
    })).filter(point => point.close !== null && point.close !== undefined);

    return {
      symbol: meta.symbol,
      currency: meta.currency,
      currentPrice: meta.regularMarketPrice,
      previousClose: meta.previousClose,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      chartData: chartData,
      meta: {
        interval: meta.dataGranularity,
        range: meta.range,
        timezone: meta.exchangeTimezoneName,
        tradingPeriods: meta.tradingPeriods
      }
    };
  }

  /**
   * Get top gainers and losers from commodity list
   */
  static async getTopMovers() {
    try {
      const symbols = Object.keys(this.COMMODITY_SYMBOLS);
      const quotes = await this.getMultipleQuotes(symbols);
      
      if (!quotes || quotes.length === 0) {
        return { gainers: [], losers: [] };
      }

      const validQuotes = quotes.filter(quote => quote && quote.changePercent !== 0);
      
      const gainers = validQuotes
        .filter(quote => quote.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 5);

      const losers = validQuotes
        .filter(quote => quote.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 5);

      return { gainers, losers };
    } catch (error) {
      console.error('Error fetching top movers:', error);
      return { gainers: [], losers: [] };
    }
  }

  /**
   * Check if market is currently open (simplified)
   */
  static isMarketOpen() {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = nyTime.getHours();
    const day = nyTime.getDay();
    
    // Basic market hours: Mon-Fri, 9:30 AM - 4:00 PM EST
    return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
  }

  /**
   * Get symbol info by symbol
   */
  static getSymbolInfo(symbol) {
    return this.COMMODITY_SYMBOLS[symbol] || { 
      name: symbol, 
      category: 'unknown',
      unit: 'USD'
    };
  }

  /**
   * Format price for display
   */
  static formatPrice(price, currency = 'USD') {
    if (price === null || price === undefined) return 'N/A';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  /**
   * Format percentage change for display
   */
  static formatPercentage(percent) {
    if (percent === null || percent === undefined) return 'N/A';
    
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  }
}

export default YahooFinanceService;
