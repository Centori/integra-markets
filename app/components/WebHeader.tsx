import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  authMethod: string;
  avatar?: string;
}

interface WebHeaderProps {
  user: User | null;
  onLoginPress: () => void;
  onSignUpPress: () => void;
  onUserProfilePress: () => void;
  onSearch?: (query: string) => void;
}

const WebHeader: React.FC<WebHeaderProps> = ({
  user,
  onLoginPress,
  onSignUpPress,
  onUserProfilePress,
  onSearch
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const renderAuthButtons = () => {
    if (user) {
      return (
        <View style={styles.userSection}>
          <TouchableOpacity
            style={styles.userButton}
            onPress={onUserProfilePress}
            activeOpacity={0.8}
          >
            <View style={styles.userAvatar}>
              {user.avatar ? (
                // Replace with actual image component when ready
                <Text style={styles.avatarText}>
                  {user.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </Text>
              ) : (
                <MaterialIcons name="person" size={20} color="#4ECCA3" />
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.fullName || user.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user.email || ''}
              </Text>
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.authButtons}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={onLoginPress}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.signUpButton}
          onPress={onSignUpPress}
          activeOpacity={0.8}
        >
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.header}>
      {/* Left Section - Logo and Brand */}
      <View style={styles.leftSection}>
        <View style={styles.logoContainer}>
          <MaterialIcons name="analytics" size={32} color="#4ECCA3" />
          <View style={styles.brandInfo}>
            <Text style={styles.brandName}>Integra Markets</Text>
            <Text style={styles.brandTagline}>AI-Powered Trading Insights</Text>
          </View>
        </View>
      </View>

      {/* Center Section - Search (Optional) */}
      {onSearch && (
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search markets, news, or ask AI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchQuery && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <MaterialIcons name="close" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Right Section - Auth Buttons */}
      <View style={styles.rightSection}>
        {renderAuthButtons()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    minHeight: 70,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      },
    }),
  },
  
  // Left Section
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandInfo: {
    justifyContent: 'center',
  },
  brandName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  brandTagline: {
    color: '#4ECCA3',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Center Section - Search
  searchSection: {
    flex: 2,
    maxWidth: 500,
    paddingHorizontal: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    fontFamily: 'inherit',
    '::placeholder': {
      color: '#666',
    },
  },
  clearButton: {
    padding: 4,
  },

  // Right Section - Auth
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  // Auth Buttons
  authButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4ECCA3',
    backgroundColor: 'transparent',
  },
  loginButtonText: {
    color: '#4ECCA3',
    fontSize: 14,
    fontWeight: '600',
  },
  signUpButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4ECCA3',
  },
  signUpButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },

  // User Section
  userSection: {
    alignItems: 'flex-end',
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
    minWidth: 180,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#4ECCA3',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  userInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  userName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    color: '#888',
    fontSize: 11,
    fontWeight: '400',
  },
});

export default WebHeader;
