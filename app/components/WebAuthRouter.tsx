import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Modal, Platform } from 'react-native';
import AuthLoadingScreen from './AuthLoadingScreen';
import OnboardingForm from './OnboardingForm';
import DesktopLayout from './DesktopLayout';
import WebHeader from './WebHeader';
import DesktopUserProfile from './DesktopUserProfile';
import { authService } from '../services/authService';
import { webAuthHandler, AuthUrlParams } from '../services/webAuthHandler';

interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  authMethod: string;
  isNewUser: boolean;
}

interface WebAuthRouterProps {
  newsData?: any[];
  userPreferences?: any;
  onUserUpdate?: (user: User) => void;
}

const WebAuthRouter: React.FC<WebAuthRouterProps> = ({
  newsData = [],
  userPreferences = {},
  onUserUpdate
}) => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStep, setAuthStep] = useState<'loading' | 'auth' | 'onboarding' | 'complete'>('loading');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [urlAuthAction, setUrlAuthAction] = useState<'login' | 'signup' | null>(null);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // Handle web platform auth URL parsing and OAuth callbacks
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      handleWebAuth();
    } else {
      initializeAuth();
    }
  }, []);

  const handleWebAuth = async () => {
    try {
      const urlParams = webAuthHandler.parseAuthUrl();
      
      // Set auth action from URL
      if (urlParams.mode) {
        setUrlAuthAction(urlParams.mode);
      }
      
      // Handle OAuth errors
      if (urlParams.error) {
        setAuthError(urlParams.error_description || urlParams.error);
        setAuthStep('auth');
        return;
      }
      
      // Check if this is an OAuth callback
      const isCallback = window.location.hash.includes('access_token') || 
                        window.location.search.includes('code=');
      
      if (isCallback) {
        setIsOAuthCallback(true);
        const result = await webAuthHandler.handleOAuthCallback();
        
        if (result.success && result.session) {
          const userData = {
            id: result.session.user.id,
            email: result.session.user.email,
            fullName: result.session.user.user_metadata?.full_name || 
                     result.session.user.user_metadata?.name || 
                     result.session.user.email?.split('@')[0],
            username: result.session.user.user_metadata?.username || '',
            authMethod: 'oauth',
            isNewUser: result.session.user.created_at === result.session.user.last_sign_in_at
          };
          
          setCurrentUser(userData);
          setAuthStep('complete');
          return;
        } else {
          setAuthError(result.error || 'OAuth callback failed');
        }
      }
      
      // Continue with normal initialization
      initializeAuth();
    } catch (error) {
      console.error('Web auth handling error:', error);
      setAuthError('Authentication failed');
      setAuthStep('auth');
    }
  };

  const isDesktop = screenData.width >= 1024;
  const isWeb = Platform.OS === 'web';

  const initializeAuth = async () => {
    try {
      const existingUser = await authService.initialize();
      if (existingUser) {
        setCurrentUser(existingUser);
        setAuthStep('complete');
      } else {
        if (isDesktop && isWeb) {
          // Desktop: Show auth modal immediately if coming from landing page
          const delay = urlAuthAction ? 500 : 2000;
          setTimeout(() => {
            setAuthStep('auth');
            setShowAuthModal(true);
          }, delay);
        } else {
          // Mobile: Show full screen auth
          setTimeout(() => setAuthStep('auth'), 2000);
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setAuthStep('auth');
    }
  };

  const handleAuthComplete = async (userData: User) => {
    setCurrentUser(userData);
    onUserUpdate?.(userData);

    if (isDesktop && isWeb) {
      setShowAuthModal(false);
      if (userData.isNewUser) {
        setTimeout(() => setShowOnboardingModal(true), 500);
      } else {
        setAuthStep('complete');
      }
    } else {
      if (userData.isNewUser) {
        setAuthStep('onboarding');
      } else {
        setAuthStep('complete');
      }
    }
  };

  const handleOnboardingComplete = (onboardingData: any) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...onboardingData };
      setCurrentUser(updatedUser);
      onUserUpdate?.(updatedUser);
    }

    if (isDesktop && isWeb) {
      setShowOnboardingModal(false);
    }
    setAuthStep('complete');
  };

  const handleSkipAuth = () => {
    if (isDesktop && isWeb) {
      setShowAuthModal(false);
    }
    setAuthStep('complete');
  };

  const handleSkipOnboarding = () => {
    if (isDesktop && isWeb) {
      setShowOnboardingModal(false);
    }
    setAuthStep('complete');
  };

  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // Implement search logic here
  };

  // Desktop Modal Rendering
  const renderDesktopAuthModal = () => (
    <Modal
      visible={showAuthModal}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <AuthLoadingScreen
            onAuthComplete={handleAuthComplete}
            onSkip={handleSkipAuth}
            initialMode={urlAuthAction || 'login'}
          />
        </View>
      </View>
    </Modal>
  );

  const renderDesktopOnboardingModal = () => (
    <Modal
      visible={showOnboardingModal}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <OnboardingForm
            onComplete={handleOnboardingComplete}
            onSkip={handleSkipOnboarding}
            user={currentUser}
          />
        </View>
      </View>
    </Modal>
  );

  // Main App Content (Desktop Layout or Mobile fallback)
  const renderMainContent = () => {
    if (isDesktop) {
      return (
        <DesktopLayout
          newsData={newsData}
          onSearch={handleSearch}
          userPreferences={userPreferences}
        />
      );
    }

    // Mobile fallback - return null to let parent handle mobile layout
    return null;
  };

  // Render based on current step and platform
  if (authStep === 'loading') {
    return (
      <View style={styles.container}>
        <AuthLoadingScreen
          onAuthComplete={handleAuthComplete}
          onSkip={handleSkipAuth}
          initialMode={urlAuthAction || 'login'}
        />
      </View>
    );
  }

  if (authStep === 'auth' && !isDesktop) {
    return (
      <View style={styles.container}>
        <AuthLoadingScreen
          onAuthComplete={handleAuthComplete}
          onSkip={handleSkipAuth}
        />
      </View>
    );
  }

  if (authStep === 'onboarding' && !isDesktop) {
    return (
      <View style={styles.container}>
        <OnboardingForm
          onComplete={handleOnboardingComplete}
          onSkip={handleSkipOnboarding}
          user={currentUser}
        />
      </View>
    );
  }

  const handleSignOut = async () => {
    setCurrentUser(null);
    setShowProfileModal(false);
    setAuthStep('loading');
    // Re-initialize to show auth modal
    setTimeout(() => {
      setAuthStep('auth');
      if (isDesktop && isWeb) {
        setShowAuthModal(true);
      }
    }, 1000);
  };

  const handleUpdateProfile = (profileData: any) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...profileData };
      setCurrentUser(updatedUser);
      onUserUpdate?.(updatedUser);
    }
  };

  // Main app view
  return (
    <View style={styles.container}>
      {/* Web Header - only show when complete and on desktop */}
      {authStep === 'complete' && isDesktop && isWeb && (
        <WebHeader
          user={currentUser}
          onLoginPress={() => setShowAuthModal(true)}
          onSignUpPress={() => setShowAuthModal(true)}
          onUserProfilePress={() => setShowProfileModal(true)}
          onSearch={handleSearch}
        />
      )}
      
      {renderMainContent()}
      
      {/* Desktop Modals */}
      {isDesktop && isWeb && renderDesktopAuthModal()}
      {isDesktop && isWeb && renderDesktopOnboardingModal()}
      
      {/* User Profile Modal */}
      {isDesktop && isWeb && (
        <DesktopUserProfile
          user={currentUser}
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onSignOut={handleSignOut}
          onUpdateProfile={handleUpdateProfile}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#121212',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
      },
    }),
  },
});

export default WebAuthRouter;
