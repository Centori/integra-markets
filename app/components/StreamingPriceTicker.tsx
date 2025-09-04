import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import YahooFinanceService from '../services/yahooFinanceService';

interface StreamingPriceTickerProps {
  symbols: string[];
  updateInterval?: number;
  scrollSpeed?: number;
}

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
  isLoading: boolean;
}

const StreamingPriceTicker: React.FC<StreamingPriceTickerProps> = ({
  symbols,
  updateInterval = 30000, // 30 seconds
  scrollSpeed = 1000, // Pixels per second
}) => {
  const [tickerData, setTickerData] = useState<TickerItem[]>([]);
  const [isMarketOpen, setIsMarketOpen] = useState(YahooFinanceService.isMarketOpen());
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // Initial data fetch
    fetchTickerData();
    
    // Set up regular updates
    const interval = setInterval(fetchTickerData, updateInterval);
    
    // Check market status every minute
    const marketCheckInterval = setInterval(() => {
      setIsMarketOpen(YahooFinanceService.isMarketOpen());
    }, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(marketCheckInterval);
    };
  }, [symbols, updateInterval]);

  useEffect(() => {
    // Start auto-scroll animation when data is loaded
    if (tickerData.length > 0) {
      startScrollAnimation();
    }
  }, [tickerData]);

  const fetchTickerData = async () => {
    try {
      // Set loading state for initial load
      if (tickerData.length === 0) {
        const loadingData = symbols.map(symbol => ({
          symbol,
          name: YahooFinanceService.getSymbolInfo(symbol).name,
          price: 0,
          change: 0,
          changePercent: 0,
          isPositive: true,
          isLoading: true
        }));
        setTickerData(loadingData);
      }

      const quotes = await YahooFinanceService.getMultipleQuotes(symbols);
      
      if (quotes && quotes.length > 0) {
        const newTickerData = quotes.map(quote => ({
          symbol: quote.symbol,
          name: quote.name,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          isPositive: quote.change >= 0,
          isLoading: false
        }));
        
        setTickerData(newTickerData);
      }
    } catch (error) {
      console.error('Error fetching ticker data:', error);
    }
  };

  const startScrollAnimation = () => {
    const animation = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -1000, // Adjust based on content width
        duration: scrollSpeed,
        useNativeDriver: true,
      })
    );
    
    animation.start();
  };

  const renderTickerItem = (item: TickerItem, index: number) => {
    const changeColor = item.isPositive ? '#4ade80' : '#ff6b6b';
    const changeIcon = item.isPositive ? 'trending-up' : 'trending-down';

    return (
      <View key={`${item.symbol}-${index}`} style={styles.tickerItem}>
        <View style={styles.symbolContainer}>
          <Text style={styles.symbolText}>{item.symbol}</Text>
          <Text style={styles.nameText}>{item.name}</Text>
        </View>
        
        <View style={styles.priceContainer}>
          {item.isLoading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBar} />
            </View>
          ) : (
            <>
              <Text style={styles.priceText}>
                {YahooFinanceService.formatPrice(item.price)}
              </Text>
              <View style={[styles.changeContainer, { backgroundColor: `${changeColor}20` }]}>
                <MaterialIcons 
                  name={changeIcon} 
                  size={12} 
                  color={changeColor} 
                />
                <Text style={[styles.changeText, { color: changeColor }]}>
                  {YahooFinanceService.formatPercentage(item.changePercent)}
                </Text>
              </View>
            </>
          )}
        </View>
        
        <View style={styles.separator} />
      </View>
    );
  };

  return (
    <View style={styles.tickerContainer}>
      {/* Market Status Indicator */}
      <View style={styles.marketStatusContainer}>
        <View style={[
          styles.marketStatusDot, 
          { backgroundColor: isMarketOpen ? '#4ade80' : '#ef4444' }
        ]} />
        <Text style={styles.marketStatusText}>
          {isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
        </Text>
      </View>

      {/* Scrolling Ticker */}
      <View style={styles.scrollContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* Render ticker items multiple times for continuous scroll */}
          {[...Array(3)].map((_, setIndex) => 
            tickerData.map((item, itemIndex) => 
              renderTickerItem(item, setIndex * tickerData.length + itemIndex)
            )
          )}
        </ScrollView>
        
        {/* Fade effects for smooth edges */}
        <View style={styles.leftFade} />
        <View style={styles.rightFade} />
      </View>

      {/* Last Update Time */}
      <View style={styles.updateTimeContainer}>
        <Text style={styles.updateTimeText}>
          Updated {new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tickerContainer: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
  },
  marketStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#333',
    minWidth: 130,
  },
  marketStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  marketStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scrollContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
    minWidth: 200,
  },
  symbolContainer: {
    marginRight: 12,
  },
  symbolText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nameText: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#333',
    marginLeft: 16,
  },
  loadingContainer: {
    width: 80,
    height: 20,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  loadingBar: {
    width: '30%',
    height: '100%',
    backgroundColor: '#4ade80',
    opacity: 0.5,
  },
  leftFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    background: 'linear-gradient(to right, rgba(26,26,26,1), rgba(26,26,26,0))',
    pointerEvents: 'none',
    zIndex: 1,
  },
  rightFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    background: 'linear-gradient(to left, rgba(26,26,26,1), rgba(26,26,26,0))',
    pointerEvents: 'none',
    zIndex: 1,
  },
  updateTimeContainer: {
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#333',
    minWidth: 100,
  },
  updateTimeText: {
    color: '#666',
    fontSize: 10,
    textAlign: 'right',
  },
});

export default StreamingPriceTicker;
