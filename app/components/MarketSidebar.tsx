import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color: () => string;
    strokeWidth: number;
  }[];
}

interface MarketSidebarProps {
  marketOverview: MarketData[];
  watchlist: MarketData[];
  gainers: MarketData[];
  losers: MarketData[];
  majorIndices: MarketData[];
  onSymbolPress: (symbol: string) => void;
}

const MiniChart: React.FC<{ data: ChartData; isPositive: boolean }> = ({ data, isPositive }) => {
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    color: () => isPositive ? '#4ade80' : '#ef4444',
    strokeWidth: 1.5,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: '0',
    },
    propsForBackgroundLines: {
      strokeWidth: 0,
    },
    propsForLabels: {
      fontSize: 0,
    },
  };

  return (
    <View style={styles.miniChartContainer}>
      <LineChart
        data={data}
        width={80}
        height={30}
        chartConfig={chartConfig}
        bezier
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLabels={false}
        withHorizontalLabels={false}
        style={styles.miniChart}
      />
    </View>
  );
};

const MarketItem: React.FC<{ 
  item: MarketData; 
  showChart?: boolean; 
  onPress: () => void;
}> = ({ item, showChart = false, onPress }) => {
  const isPositive = item.change >= 0;
  const changeColor = isPositive ? '#4ade80' : '#ef4444';

  // Generate mock chart data
  const generateChartData = (): ChartData => {
    const labels = Array.from({ length: 7 }, (_, i) => `${i}`);
    const basePrice = item.price;
    const data = labels.map(() => basePrice + (Math.random() - 0.5) * basePrice * 0.05);
    
    return {
      labels,
      datasets: [{
        data,
        color: () => changeColor,
        strokeWidth: 1.5,
      }],
    };
  };

  return (
    <TouchableOpacity style={styles.marketItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.marketItemContent}>
        <View style={styles.marketItemLeft}>
          <Text style={styles.symbolText}>{item.symbol}</Text>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
        </View>
        
        <View style={styles.marketItemCenter}>
          <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
          <View style={styles.changeContainer}>
            <MaterialIcons 
              name={isPositive ? 'arrow-upward' : 'arrow-downward'} 
              size={10} 
              color={changeColor} 
            />
            <Text style={[styles.changeText, { color: changeColor }]}>
              {isPositive ? '+' : ''}{item.changePercent.toFixed(1)}%
            </Text>
          </View>
        </View>

        {showChart && (
          <View style={styles.marketItemRight}>
            <MiniChart data={generateChartData()} isPositive={isPositive} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const SidebarSection: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
  onToggle?: () => void;
}> = ({ title, icon, children, isCollapsed = false, onToggle }) => {
  return (
    <View style={styles.sidebarSection}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.sectionHeaderLeft}>
          <MaterialIcons name={icon as any} size={18} color="#4ECCA3" />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {onToggle && (
          <MaterialIcons 
            name={isCollapsed ? 'expand-more' : 'expand-less'} 
            size={20} 
            color="#888" 
          />
        )}
      </TouchableOpacity>
      
      {!isCollapsed && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

const MarketSidebar: React.FC<MarketSidebarProps> = ({
  marketOverview,
  watchlist,
  gainers,
  losers,
  majorIndices,
  onSymbolPress,
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
      {/* Major Indices */}
      <SidebarSection
        title="Major Indices"
        icon="trending-up"
        isCollapsed={collapsedSections.indices}
        onToggle={() => toggleSection('indices')}
      >
        {majorIndices.map((item) => (
          <MarketItem
            key={item.symbol}
            item={item}
            onPress={() => onSymbolPress(item.symbol)}
          />
        ))}
      </SidebarSection>

      {/* Market Overview */}
      <SidebarSection
        title="Commodity Prices"
        icon="bar-chart"
        isCollapsed={collapsedSections.overview}
        onToggle={() => toggleSection('overview')}
      >
        {marketOverview.map((item) => (
          <MarketItem
            key={item.symbol}
            item={item}
            showChart={true}
            onPress={() => onSymbolPress(item.symbol)}
          />
        ))}
      </SidebarSection>

      {/* Watchlist */}
      <SidebarSection
        title="My Watchlist"
        icon="visibility"
        isCollapsed={collapsedSections.watchlist}
        onToggle={() => toggleSection('watchlist')}
      >
        {watchlist.length > 0 ? (
          watchlist.map((item) => (
            <MarketItem
              key={item.symbol}
              item={item}
              showChart={true}
              onPress={() => onSymbolPress(item.symbol)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="visibility-off" size={32} color="#666" />
            <Text style={styles.emptyText}>No items in watchlist</Text>
            <Text style={styles.emptySubtext}>Add symbols to track them here</Text>
          </View>
        )}
      </SidebarSection>

      {/* Top Gainers */}
      <SidebarSection
        title="Top Gainers"
        icon="trending-up"
        isCollapsed={collapsedSections.gainers}
        onToggle={() => toggleSection('gainers')}
      >
        {gainers.slice(0, 5).map((item) => (
          <MarketItem
            key={item.symbol}
            item={item}
            onPress={() => onSymbolPress(item.symbol)}
          />
        ))}
      </SidebarSection>

      {/* Top Losers */}
      <SidebarSection
        title="Top Losers"
        icon="trending-down"
        isCollapsed={collapsedSections.losers}
        onToggle={() => toggleSection('losers')}
      >
        {losers.slice(0, 5).map((item) => (
          <MarketItem
            key={item.symbol}
            item={item}
            onPress={() => onSymbolPress(item.symbol)}
          />
        ))}
      </SidebarSection>

      {/* Market Stats */}
      <SidebarSection
        title="Market Statistics"
        icon="analytics"
        isCollapsed={collapsedSections.stats}
        onToggle={() => toggleSection('stats')}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Fear & Greed Index</Text>
            <View style={styles.statValue}>
              <Text style={[styles.statNumber, { color: '#fbbf24' }]}>52</Text>
              <Text style={styles.statStatus}>Neutral</Text>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>VIX</Text>
            <View style={styles.statValue}>
              <Text style={[styles.statNumber, { color: '#ef4444' }]}>18.42</Text>
              <Text style={[styles.statStatus, { color: '#ef4444' }]}>+2.1%</Text>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>DXY</Text>
            <View style={styles.statValue}>
              <Text style={[styles.statNumber, { color: '#4ade80' }]}>104.25</Text>
              <Text style={[styles.statStatus, { color: '#4ade80' }]}>+0.3%</Text>
            </View>
          </View>
        </View>
      </SidebarSection>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  
  // Section Styles
  sidebarSection: {
    marginBottom: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#252525',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContent: {
    padding: 8,
  },

  // Market Item Styles
  marketItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  marketItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketItemLeft: {
    flex: 2,
  },
  marketItemCenter: {
    flex: 1,
    alignItems: 'flex-end',
  },
  marketItemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  symbolText: {
    color: '#4ECCA3',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  nameText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '400',
  },
  priceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Chart Styles
  miniChartContainer: {
    width: 80,
    height: 30,
    overflow: 'hidden',
  },
  miniChart: {
    marginLeft: -16,
    marginTop: -8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },

  // Stats Styles
  statsContainer: {
    gap: 12,
    padding: 8,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#252525',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  statLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  statValue: {
    alignItems: 'flex-end',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  statStatus: {
    fontSize: 11,
    fontWeight: '500',
    color: '#888',
  },
});

export default MarketSidebar;
