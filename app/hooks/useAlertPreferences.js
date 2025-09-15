import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ALERT_FREQUENCIES = {
  REALTIME: 'realtime',
  DAILY: 'daily',
  WEEKLY: 'weekly',
};

export const ALERT_INTERVALS = {
  [ALERT_FREQUENCIES.REALTIME]: 5 * 60 * 1000, // 5 minutes
  [ALERT_FREQUENCIES.DAILY]: 24 * 60 * 60 * 1000, // 24 hours
  [ALERT_FREQUENCIES.WEEKLY]: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const PREFERENCES_KEY = '@alert_preferences';

const useAlertPreferences = () => {
  const [preferences, setPreferences] = useState({
    frequency: ALERT_FREQUENCIES.REALTIME,
    lastAlertTime: null,
    commodityFilters: [],
    minImpact: 'LOW',
    showExactTime: false, // Toggle between relative and exact UTC time
  });
  
  const [loading, setLoading] = useState(true);
  
  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);
  
  // Load saved preferences
  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Save preferences
  const savePreferences = async (newPrefs) => {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };
  
  // Update alert frequency
  const setAlertFrequency = async (frequency) => {
    const newPrefs = {
      ...preferences,
      frequency,
      lastAlertTime: new Date().toISOString(),
    };
    await savePreferences(newPrefs);
  };
  
  // Check if we should show an alert based on frequency
  const shouldShowAlert = (newsItem) => {
    const now = new Date();
    const lastAlert = preferences.lastAlertTime 
      ? new Date(preferences.lastAlertTime)
      : new Date(0);
      
    const interval = ALERT_INTERVALS[preferences.frequency];
    const timeSinceLastAlert = now - lastAlert;
    
    // Always show high impact items in realtime
    if (newsItem.market_impact === 'HIGH' && 
        preferences.frequency === ALERT_FREQUENCIES.REALTIME) {
      return true;
    }
    
    // Check if enough time has passed based on frequency
    if (timeSinceLastAlert >= interval) {
      // Check commodity filters
      if (preferences.commodityFilters.length > 0) {
        const hasMatchingCommodity = newsItem.commodities?.some(
          commodity => preferences.commodityFilters.includes(commodity)
        );
        if (!hasMatchingCommodity) return false;
      }
      
      // Check minimum impact level
      const impactLevels = ['LOW', 'MEDIUM', 'HIGH'];
      const minImpactIndex = impactLevels.indexOf(preferences.minImpact);
      const itemImpactIndex = impactLevels.indexOf(newsItem.market_impact);
      
      return itemImpactIndex >= minImpactIndex;
    }
    
    return false;
  };
  
  // Update commodity filters
  const setCommodityFilters = async (commodities) => {
    const newPrefs = {
      ...preferences,
      commodityFilters: commodities,
    };
    await savePreferences(newPrefs);
  };
  
  // Update minimum impact level
  const setMinimumImpact = async (impact) => {
    const newPrefs = {
      ...preferences,
      minImpact: impact,
    };
    await savePreferences(newPrefs);
  };

  // Toggle timestamp format
  const toggleTimestampFormat = async () => {
    const newPrefs = {
      ...preferences,
      showExactTime: !preferences.showExactTime,
    };
    await savePreferences(newPrefs);
  };
  
  return {
    preferences,
    loading,
    setAlertFrequency,
    shouldShowAlert,
    setCommodityFilters,
    setMinimumImpact,
    toggleTimestampFormat,
  };
};

export default useAlertPreferences;
