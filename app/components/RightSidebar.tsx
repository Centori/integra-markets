import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import YahooFinanceService from '../services/yahooFinanceService';
import MiniChart from './MiniChart';

interface RightSidebarProps {
  userPreferences: any;
  watchlistSymbols: string[];
}

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  chartData: number[];
  isPositive: boolean;
}

interface TopMover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  isPositive: boolean;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  userPreferences,
  watchlistSymbols
}) => {
  const [watchlistData, setWatchlistData] = useState<WatchlistItem[]>([]);
  const [topMovers, setTopMovers] = useState({ gainers: [], losers: [] });
  const [activeMoversTab, setActiveMoversTab] = useState<'gainers' | 'losers'>('gainers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWatchlistData();
    fetchTopMovers();
    
    // Update every 2 minutes for sidebar data (less frequent than ticker)
    const interval = setInterval(() => {
      fetchWatchlistData();
      fetchTopMovers();
    }, 120000);
    
    return () => clearInterval(interval);
  }, [watchlistSymbols]);

  const fetchWatchlistData = async () => {
    try {
      const quotes = await YahooFinanceService.getMultipleQuotes(watchlistSymbols);
      
      if (quotes && quotes.length > 0) {
        const watchlistItems = await Promise.all(
          quotes.map(async (quote) => {
            // Fetch mini chart data for each symbol
            const chartData = await YahooFinanceService.getChartData(quote.symbol, '5m', '1d');
            
            return {
              symbol: quote.symbol,
              name: quote.name,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              chartData: chartData ? chartData.chartData.slice(-12).map(point => point.close) : [],
              isPositive: quote.change >= 0
            };
          })
        );
        
        setWatchlistData(watchlistItems);
      }
    } catch (error) {
      console.error('Error fetching watchlist data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopMovers = async () => {
    try {
      const movers = await YahooFinanceService.getTopMovers();
      setTopMovers(movers);
    } catch (error) {
      console.error('Error fetching top movers:', error);
    }
  };

  const renderWatchlistItem = (item: WatchlistItem) => (
    <View key={item.symbol} style={styles.watchlistItem}>
      <View style={styles.watchlistHeader}>
        <View style={styles.symbolInfo}>
          <Text style={styles.watchlistSymbol}>{item.symbol}</Text>
          <Text style={styles.watchlistName} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.priceInfo}>
          <Text style={styles.watchlistPrice}>
            {YahooFinanceService.formatPrice(item.price)}
          </Text>
          <Text style={[
            styles.watchlistChange,
            { color: item.isPositive ? '#4ade80' : '#ff6b6b' }
          ]}>
            {item.isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
          </Text>
        </View>
      </View>
      
      {/* Mini Chart */}
      <View style={styles.chartContainer}>
        <MiniChart
          data={item.chartData}
          width={280}
          height={60}
          color={item.isPositive ? '#4ade80' : '#ff6b6b'}
          showGrid={false}
        />
      </View>
      
      {/* Alert indicator if user has alerts set */}
      {userPreferences?.notifications && (
        <View style={styles.alertIndicator}>
          <MaterialIcons name="notifications-active" size={12} color="#fbbf24" />
          <Text style={styles.alertText}>Alerts Active</Text>
        </View>
      )}
    </View>
  );

  const renderTopMoverItem = (item: TopMover, index: number) => (
    <View key={`${item.symbol}-${index}`} style={styles.moverItem}>
      <View style={styles.moverInfo}>
        <Text style={styles.moverSymbol}>{item.symbol}</Text>
        <Text style={styles.moverName} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={styles.moverMetrics}>
        <Text style={styles.moverPrice}>
          {YahooFinanceService.formatPrice(item.price)}
        </Text>
        <Text style={[
          styles.moverChange,
          { color: item.isPositive ? '#4ade80' : '#ff6b6b' }
        ]}>
          {item.isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
      {/* Market Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="trending-up" color="#4ECCA3" size={20} />
          <Text style={styles.sectionTitle}>Market Overview</Text>
        </View>
        <View style={styles.marketOverview}>
          <View style={styles.marketStatusRow}>
            <Text style={styles.marketLabel}>Status</Text>
            <View style={styles.marketStatus}>
              <View style={[
                styles.statusDot,
                { backgroundColor: YahooFinanceService.isMarketOpen() ? '#4ade80' : '#ef4444' }
              ]} />
              <Text style={styles.marketStatusText}>
                {YahooFinanceService.isMarketOpen() ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
          <View style={styles.marketStatusRow}>
            <Text style={styles.marketLabel}>Session</Text>
            <Text style={styles.marketValue}>US Regular</Text>
          </View>
          <View style={styles.marketStatusRow}>
            <Text style={styles.marketLabel}>Next Close</Text>
            <Text style={styles.marketValue}>4:00 PM EST</Text>
          </View>
        </View>
      </View>

      {/* User Watchlist */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="visibility" color="#4ECCA3" size={20} />
          <Text style={styles.sectionTitle}>Your Watchlist</Text>
          <TouchableOpacity style={styles.addButton}>
            <MaterialIcons name="add" color="#4ECCA3" size={16} />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading watchlist...</Text>
          </View>
        ) : (
          <View style={styles.watchlistContainer}>
            {watchlistData.map(renderWatchlistItem)}
          </View>
        )}
      </View>

      {/* Top Gainers/Losers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="leaderboard" color="#4ECCA3" size={20} />
          <Text style={styles.sectionTitle}>Top Movers</Text>
        </View>
        
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeMoversTab === 'gainers' && styles.activeTab
            ]}
            onPress={() => setActiveMoversTab('gainers')}
          >
            <MaterialIcons name="trending-up" size={16} color="#4ade80" />
            <Text style={[
              styles.tabText,
              activeMoversTab === 'gainers' && styles.activeTabText
            ]}>Gainers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeMoversTab === 'losers' && styles.activeTab
            ]}
            onPress={() => setActiveMoversTab('losers')}
          >
            <MaterialIcons name="trending-down" size={16} color="#ff6b6b" />
            <Text style={[
              styles.tabText,
              activeMoversTab === 'losers' && styles.activeTabText
            ]}>Losers</Text>
          </TouchableOpacity>
        </View>

        {/* Movers List */}
        <View style={styles.moversContainer}>
          {(activeMoversTab === 'gainers' ? topMovers.gainers : topMovers.losers)
            .slice(0, 5)
            .map(renderTopMoverItem)}
        </View>
      </View>

      {/* Economic Calendar Placeholder */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="event" color="#4ECCA3" size={20} />
          <Text style={styles.sectionTitle}>Economic Events</Text>
        </View>
        <View style={styles.comingSoon}>
          <MaterialIcons name="schedule" size={32} color="#666" />
          <Text style={styles.comingSoonText}>Economic calendar coming soon</Text>
          <Text style={styles.comingSoonSubtext}>Track key market-moving events</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#121212',
    flex: 1,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  marketOverview: {
    gap: 12,
  },
  marketStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketLabel: {
    color: '#888',
    fontSize: 14,
  },
  marketValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  marketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  marketStatusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  watchlistContainer: {
    gap: 16,
  },
  watchlistItem: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  symbolInfo: {
    flex: 1,
  },
  watchlistSymbol: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  watchlistName: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  watchlistPrice: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  watchlistChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  chartContainer: {
    marginVertical: 8,
    height: 60,
  },
  alertIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  alertText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#444',
  },
  tabText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
  },
  moversContainer: {
    gap: 8,
  },
  moverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  moverInfo: {
    flex: 1,
  },
  moverSymbol: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  moverName: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  moverMetrics: {
    alignItems: 'flex-end',
  },
  moverPrice: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  moverChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  comingSoonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  comingSoonSubtext: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default RightSidebar;
