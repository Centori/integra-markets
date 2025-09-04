// App.desktop-integration.js - Updated main app with desktop integration
import React, { useState, useEffect } from 'react';
import { Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import existing components
import IntegraLoadingPage from './components/IntegraLoadingPage';
import AuthLoadingScreen from './components/AuthLoadingScreen';
import OnboardingForm from './components/OnboardingForm';
import AlertPreferencesForm from './components/AlertPreferencesForm';

// Import new desktop components
import DesktopLayout from './components/DesktopLayout';

// Import mobile layout (your existing App.js content)
import MobileApp from './MobileApp'; // Extract your current mobile layout to this file

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAlertPreferences, setShowAlertPreferences] = useState(false);
  const [userData, setUserData] = useState(null);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [newsData, setNewsData] = useState([]);

  // Determine if we should show desktop layout
  const isDesktop = Platform.OS === 'web' && screenData.width >= 1024;

  useEffect(() => {
    const onChange = (result) => {
      setScreenData(result.window);
    };
    
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check for existing user data
      const existingUserData = await AsyncStorage.getItem('userData');
      const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
      
      if (existingUserData) {
        setUserData(JSON.parse(existingUserData));
      }
      
      // Simulate loading time
      setTimeout(() => {
        setIsLoading(false);
        
        if (!hasCompletedOnboarding) {
          setShowOnboarding(true);
        }
      }, 2000);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsLoading(false);
    }
  };

  const handleSearch = (query) => {
    // Handle search functionality
    // Filter news data or trigger AI analysis
    console.log('Search query:', query);
    
    // You could filter newsData here or trigger an API call
    const filteredNews = newsData.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.summary?.toLowerCase().includes(query.toLowerCase())
    );
    
    // Update state with filtered results or generate AI response
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const handleAuthComplete = (authData) => {
    setUserData(authData);
    setShowAuth(false);
    setShowOnboarding(true);
  };

  const handleAuthSkip = () => {
    setShowAuth(false);
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = (formData) => {
    const newUserData = { ...userData, ...formData };
    setUserData(newUserData);
    setShowOnboarding(false);
    setShowAlertPreferences(true);
    
    AsyncStorage.setItem('userData', JSON.stringify(newUserData));
    AsyncStorage.setItem('hasCompletedOnboarding', 'true');
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    AsyncStorage.setItem('hasCompletedOnboarding', 'true');
  };

  const handleAlertPreferencesComplete = (alertData) => {
    const updatedUserData = { ...userData, alertPreferences: alertData };
    setUserData(updatedUserData);
    setShowAlertPreferences(false);
    
    AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
  };

  const handleAlertPreferencesSkip = () => {
    setShowAlertPreferences(false);
  };

  // Render loading screen
  if (isLoading) {
    return <IntegraLoadingPage onLoadingComplete={handleLoadingComplete} />;
  }

  // Render auth screen
  if (showAuth) {
    return (
      <AuthLoadingScreen
        onAuthComplete={handleAuthComplete}
        onSkip={handleAuthSkip}
      />
    );
  }

  // Render onboarding
  if (showOnboarding) {
    return (
      <OnboardingForm
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        showSkipOption={true}
        userData={userData}
      />
    );
  }

  // Render alert preferences
  if (showAlertPreferences) {
    return (
      <AlertPreferencesForm
        onComplete={handleAlertPreferencesComplete}
        onSkip={handleAlertPreferencesSkip}
        showSkipOption={true}
      />
    );
  }

  // Main app content - choose layout based on screen size
  if (isDesktop) {
    return (
      <DesktopLayout
        newsData={newsData}
        onSearch={handleSearch}
        userPreferences={userData?.alertPreferences || {}}
      />
    );
  } else {
    // Render your existing mobile layout
    return (
      <MobileApp
        userData={userData}
        newsData={newsData}
        onShowAlertPreferences={() => setShowAlertPreferences(true)}
      />
    );
  }
}
