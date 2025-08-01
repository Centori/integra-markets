import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export type FilterType = 'All' | 'Bullish' | 'Bearish' | 'Neutral';

interface FilterTabsProps {
  tabs: FilterType[];
  activeTab: FilterType;
  onTabChange: (tab: FilterType) => void;
  style?: ViewStyle;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({ 
  tabs, 
  activeTab, 
  onTabChange,
  style 
}) => {
  const getTabStyles = (tab: FilterType, isActive: boolean) => {
    if (!isActive) {
      return {
        container: styles.inactiveTab,
        text: styles.inactiveTabText
      };
    }

    switch (tab) {
      case 'All':
        return {
          container: [styles.activeTab, { backgroundColor: Colors.filterActive.all }],
          text: [styles.activeTabText, { color: Colors.text }]
        };
      case 'Bullish':
        return {
          container: [styles.activeTab, { backgroundColor: Colors.filterActive.bullish }],
          text: [styles.activeTabText, { color: '#000000' }]
        };
      case 'Bearish':
        return {
          container: [styles.activeTab, { backgroundColor: Colors.filterActive.bearish }],
          text: [styles.activeTabText, { color: '#000000' }]
        };
      case 'Neutral':
        return {
          container: [styles.activeTab, { backgroundColor: Colors.filterActive.neutral }],
          text: [styles.activeTabText, { color: '#000000' }]
        };
      default:
        return {
          container: [styles.activeTab, { backgroundColor: Colors.filterActive.all }],
          text: [styles.activeTabText, { color: Colors.text }]
        };
    }
  };

  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const tabStyles = getTabStyles(tab, isActive);
        
        return (
          <TouchableOpacity
            key={tab}
            style={tabStyles.container}
            onPress={() => onTabChange(tab)}
            activeOpacity={0.7}
          >
            <Text style={tabStyles.text}>
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  activeTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  inactiveTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.border,
  },
  activeTabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  inactiveTabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
});

export default FilterTabs;
