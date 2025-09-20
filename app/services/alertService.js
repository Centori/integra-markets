import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMarketAlert, scheduleLocalNotification } from './notificationService';

// Keys for storing alert data
const ALERTS_KEY = '@alerts_data';
const ALERT_HISTORY_KEY = '@alert_history';
const LAST_ALERT_CHECK_KEY = '@last_alert_check';

/**
 * Generate a unique alert ID
 */
function generateAlertId() {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current alerts from storage
 */
export async function getCurrentAlerts() {
  try {
    const alertsData = await AsyncStorage.getItem(ALERTS_KEY);
    return alertsData ? JSON.parse(alertsData) : [];
  } catch (error) {
    console.error('Error getting current alerts:', error);
    return [];
  }
}

/**
 * Save alerts to storage
 */
export async function saveAlerts(alerts) {
  try {
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    return true;
  } catch (error) {
    console.error('Error saving alerts:', error);
    return false;
  }
}

/**
 * Add a new alert
 */
export async function addAlert(alertData) {
  try {
    const currentAlerts = await getCurrentAlerts();
    const newAlert = {
      id: generateAlertId(),
      timestamp: new Date().toISOString(),
      read: false,
      ...alertData
    };
    
    const updatedAlerts = [newAlert, ...currentAlerts];
    await saveAlerts(updatedAlerts);
    
    // Send notification if enabled
    if (alertData.sendNotification !== false) {
      await scheduleLocalNotification(
        alertData.title,
        alertData.message,
        {
          type: 'alert',
          alertId: newAlert.id,
          severity: alertData.severity || 'medium'
        }
      );
    }
    
    return newAlert;
  } catch (error) {
    console.error('Error adding alert:', error);
    return null;
  }
}

/**
 * Mark alert as read
 */
export async function markAlertAsRead(alertId) {
  try {
    const currentAlerts = await getCurrentAlerts();
    const updatedAlerts = currentAlerts.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    );
    await saveAlerts(updatedAlerts);
    return true;
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return false;
  }
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId) {
  try {
    const currentAlerts = await getCurrentAlerts();
    const updatedAlerts = currentAlerts.filter(alert => alert.id !== alertId);
    await saveAlerts(updatedAlerts);
    return true;
  } catch (error) {
    console.error('Error deleting alert:', error);
    return false;
  }
}

/**
 * Clear all alerts
 */
export async function clearAllAlerts() {
  try {
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Error clearing alerts:', error);
    return false;
  }
}

/**
 * Get alert history
 */
export async function getAlertHistory() {
  try {
    const historyData = await AsyncStorage.getItem(ALERT_HISTORY_KEY);
    return historyData ? JSON.parse(historyData) : [];
  } catch (error) {
    console.error('Error getting alert history:', error);
    return [];
  }
}

/**
 * Add alert to history
 */
export async function addToAlertHistory(alert) {
  try {
    const history = await getAlertHistory();
    const historyEntry = {
      ...alert,
      archivedAt: new Date().toISOString()
    };
    
    const updatedHistory = [historyEntry, ...history].slice(0, 100); // Keep last 100
    await AsyncStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(updatedHistory));
    return true;
  } catch (error) {
    console.error('Error adding to alert history:', error);
    return false;
  }
}

/**
 * Generate market alert based on price change
 */
export async function generateMarketAlert(commodity, currentPrice, previousPrice, preferences) {
  try {
    if (!preferences || !preferences.commodities.includes(commodity)) {
      return null; // User not interested in this commodity
    }
    
    const change = currentPrice - previousPrice;
    const changePercent = ((change / previousPrice) * 100).toFixed(2);
    const threshold = getThresholdValue(preferences.alertThreshold);
    
    if (Math.abs(changePercent) < threshold) {
      return null; // Change not significant enough
    }
    
    const severity = Math.abs(changePercent) > 5 ? 'high' : 
                    Math.abs(changePercent) > 2 ? 'medium' : 'low';
    
    const alertData = {
      title: `${commodity} Price Alert`,
      message: `${commodity} has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent)}% to $${currentPrice.toFixed(2)}`,
      type: 'price',
      severity,
      commodity,
      currentPrice,
      previousPrice,
      changePercent: parseFloat(changePercent)
    };
    
    return await addAlert(alertData);
  } catch (error) {
    console.error('Error generating market alert:', error);
    return null;
  }
}

/**
 * Generate news alert
 */
export async function generateNewsAlert(title, content, keywords, preferences) {
  try {
    if (!preferences || !hasMatchingKeywords(content, preferences.keywords)) {
      return null; // No matching keywords
    }
    
    const alertData = {
      title: 'Breaking News Alert',
      message: title,
      type: 'news',
      severity: 'medium',
      content,
      keywords: getMatchingKeywords(content, preferences.keywords)
    };
    
    return await addAlert(alertData);
  } catch (error) {
    console.error('Error generating news alert:', error);
    return null;
  }
}

/**
 * Get threshold value based on user preference
 */
function getThresholdValue(threshold) {
  switch (threshold) {
    case 'Low':
      return 0.5; // 0.5% change
    case 'Medium':
      return 1.0; // 1% change
    case 'High':
      return 2.0; // 2% change
    default:
      return 1.0;
  }
}

/**
 * Check if content has matching keywords
 */
function hasMatchingKeywords(content, userKeywords) {
  if (!userKeywords || userKeywords.length === 0) {
    return true; // If no keywords specified, match all
  }
  
  const contentLower = content.toLowerCase();
  return userKeywords.some(keyword => 
    contentLower.includes(keyword.toLowerCase())
  );
}

/**
 * Get matching keywords from content
 */
function getMatchingKeywords(content, userKeywords) {
  if (!userKeywords || userKeywords.length === 0) {
    return [];
  }
  
  const contentLower = content.toLowerCase();
  return userKeywords.filter(keyword => 
    contentLower.includes(keyword.toLowerCase())
  );
}

/**
 * Get formatted time string for alerts
 */
export function getTimeAgo(timestamp) {
  const now = new Date();
  const alertTime = new Date(timestamp);
  const diffMs = now - alertTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}

/**
 * Initialize alerts with some sample data for demonstration
 */
export async function initializeSampleAlerts() {
  try {
    const currentAlerts = await getCurrentAlerts();
    if (currentAlerts.length > 0) {
      return; // Already have alerts
    }
    
    // Add some sample alerts to demonstrate the system
    const sampleAlerts = [
      {
        title: 'Gold Price Alert',
        message: 'Gold has increased by 2.5% in the last hour',
        type: 'price',
        severity: 'high',
        commodity: 'Gold',
        currentPrice: 2050.25,
        previousPrice: 2000.00,
        changePercent: 2.5
      },
      {
        title: 'Oil Market Update',
        message: 'Crude oil futures showing volatility due to geopolitical tensions',
        type: 'news',
        severity: 'medium',
        keywords: ['oil', 'geopolitical']
      },
      {
        title: 'Copper Supply Chain',
        message: 'Major copper mine disruption reported in Chile',
        type: 'news',
        severity: 'high',
        keywords: ['copper', 'supply chain']
      }
    ];
    
    for (const alertData of sampleAlerts) {
      await addAlert({ ...alertData, sendNotification: false });
    }
    
    console.log('Sample alerts initialized');
  } catch (error) {
    console.error('Error initializing sample alerts:', error);
  }
}

/**
 * Monitor for new alerts based on user preferences
 */
export async function monitorAlerts(preferences) {
  try {
    const lastCheck = await AsyncStorage.getItem(LAST_ALERT_CHECK_KEY);
    const now = new Date().toISOString();
    
    // Update last check time
    await AsyncStorage.setItem(LAST_ALERT_CHECK_KEY, now);
    
    // Here you would typically:
    // 1. Fetch latest market data
    // 2. Compare with previous data
    // 3. Generate alerts based on changes and user preferences
    // 4. Check news feeds for relevant updates
    
    // For now, we'll simulate this with periodic sample alerts
    if (Math.random() < 0.1) { // 10% chance of generating a sample alert
      await generateSampleAlert(preferences);
    }
    
    return true;
  } catch (error) {
    console.error('Error monitoring alerts:', error);
    return false;
  }
}

/**
 * Generate a sample alert for demonstration
 */
async function generateSampleAlert(preferences) {
  const sampleAlerts = [
    {
      title: 'Silver Price Movement',
      message: 'Silver has decreased by 1.8% in the last 30 minutes',
      type: 'price',
      severity: 'medium',
      commodity: 'Silver'
    },
    {
      title: 'Market News',
      message: 'Federal Reserve announces new monetary policy changes',
      type: 'news',
      severity: 'high',
      keywords: ['federal reserve', 'monetary policy']
    }
  ];
  
  const randomAlert = sampleAlerts[Math.floor(Math.random() * sampleAlerts.length)];
  await addAlert(randomAlert);
}