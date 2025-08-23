import AsyncStorage from '@react-native-async-storage/async-storage';

const debugStorage = async () => {
  try {
    console.log('=== AsyncStorage Debug ===');
    
    const keys = [
      'onboarding_completed',
      'alerts_completed', 
      'user_data',
      'userData',
      'userPreferences',
      'alert_preferences'
    ];
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`${key}: ${value}`);
    }
    
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('All AsyncStorage keys:', allKeys);
    
  } catch (error) {
    console.error('Error reading AsyncStorage:', error);
  }
};

// Clear specific onboarding data for testing
const clearOnboardingData = async () => {
  try {
    await AsyncStorage.removeItem('onboarding_completed');
    await AsyncStorage.removeItem('alerts_completed');
    await AsyncStorage.removeItem('user_data');
    console.log('Cleared onboarding data');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};

// Set onboarding as completed for testing
const setOnboardingCompleted = async () => {
  try {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    await AsyncStorage.setItem('alerts_completed', 'true');
    console.log('Set onboarding as completed');
  } catch (error) {
    console.error('Error setting data:', error);
  }
};

export { debugStorage, clearOnboardingData, setOnboardingCompleted };