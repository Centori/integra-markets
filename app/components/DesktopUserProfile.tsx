import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  authMethod: string;
  avatar?: string;
  role?: string;
  experience?: string;
  marketFocus?: string[];
}

interface DesktopUserProfileProps {
  user: User | null;
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onUpdateProfile: (userData: Partial<User>) => void;
}

const DesktopUserProfile: React.FC<DesktopUserProfileProps> = ({
  user,
  visible,
  onClose,
  onSignOut,
  onUpdateProfile
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'account'>('profile');
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<User>>({});

  const handleEdit = () => {
    setEditedProfile({
      fullName: user?.fullName || '',
      username: user?.username || '',
      role: user?.role || '',
      experience: user?.experience || '',
      marketFocus: user?.marketFocus || []
    });
    setEditMode(true);
  };

  const handleSaveProfile = () => {
    onUpdateProfile(editedProfile);
    setEditMode(false);
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      onSignOut();
      onClose();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Text>Avatar</Text> // Replace with actual image component
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={40} color="#666" />
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          {editMode ? (
            <>
              <TextInput
                style={styles.editInput}
                value={editedProfile.fullName}
                onChangeText={(text) => setEditedProfile({...editedProfile, fullName: text})}
                placeholder="Full Name"
                placeholderTextColor="#666"
              />
              <TextInput
                style={styles.editInput}
                value={editedProfile.username}
                onChangeText={(text) => setEditedProfile({...editedProfile, username: text})}
                placeholder="Username"
                placeholderTextColor="#666"
              />
            </>
          ) : (
            <>
              <Text style={styles.userName}>{user?.fullName || 'Anonymous User'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
              <Text style={styles.userMeta}>@{user?.username || 'user'}</Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={editMode ? handleSaveProfile : handleEdit}
        >
          <MaterialIcons 
            name={editMode ? 'check' : 'edit'} 
            size={20} 
            color="#4ECCA3" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Authentication</Text>
          <Text style={styles.statLabel}>{user?.authMethod || 'Unknown'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Role</Text>
          <Text style={styles.statLabel}>{user?.role || 'Not set'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Experience</Text>
          <Text style={styles.statLabel}>{user?.experience || 'Not set'}</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="notifications" size={20} color="#30A5FF" />
          <Text style={styles.actionText}>Notifications</Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="bookmark" size={20} color="#30A5FF" />
          <Text style={styles.actionText}>Saved Articles</Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="visibility" size={20} color="#30A5FF" />
          <Text style={styles.actionText}>Watchlist</Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPreferencesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Market Preferences</Text>
      <View style={styles.preferenceGroup}>
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Default Market View</Text>
          <TouchableOpacity style={styles.preferenceValue}>
            <Text style={styles.preferenceValueText}>Grid View</Text>
            <MaterialIcons name="chevron-right" size={16} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>News Density</Text>
          <TouchableOpacity style={styles.preferenceValue}>
            <Text style={styles.preferenceValueText}>Comfortable</Text>
            <MaterialIcons name="chevron-right" size={16} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>AI Analysis</Text>
          <TouchableOpacity style={styles.preferenceValue}>
            <Text style={styles.preferenceValueText}>Auto-generate</Text>
            <MaterialIcons name="chevron-right" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.preferenceGroup}>
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Breaking News</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Enabled</Text>
          </View>
        </View>
        
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Price Alerts</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Enabled</Text>
          </View>
        </View>
        
        <View style={styles.preferenceItem}>
          <Text style={styles.preferenceLabel}>Daily Summary</Text>
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Disabled</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderAccountTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.accountSection}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        
        <TouchableOpacity style={styles.accountButton}>
          <MaterialIcons name="security" size={20} color="#30A5FF" />
          <Text style={styles.accountButtonText}>Privacy & Security</Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.accountButton}>
          <MaterialIcons name="data-usage" size={20} color="#30A5FF" />
          <Text style={styles.accountButtonText}>Data & Storage</Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.accountButton}>
          <MaterialIcons name="help" size={20} color="#30A5FF" />
          <Text style={styles.accountButtonText}>Help & Support</Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Account Actions</Text>
        
        <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={20} color="#ef4444" />
          <Text style={styles.dangerButtonText}>Sign Out</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.dangerButton}>
          <MaterialIcons name="delete-forever" size={20} color="#ef4444" />
          <Text style={styles.dangerButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!visible || !user) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User Profile</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabNavigation}>
            {(['profile', 'preferences', 'account'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'preferences' && renderPreferencesTab()}
            {activeTab === 'account' && renderAccountTab()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 600,
    height: '80%',
    backgroundColor: '#1a1a1a',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#252525',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4ECCA3',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4ECCA3',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  
  // Profile Tab Styles
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#252525',
    padding: 20,
    borderRadius: 12,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    color: '#888',
    fontSize: 14,
    marginBottom: 2,
  },
  userMeta: {
    color: '#4ECCA3',
    fontSize: 12,
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
  },
  editInput: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#252525',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statLabel: {
    color: '#4ECCA3',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Preferences Tab Styles
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  preferenceGroup: {
    backgroundColor: '#252525',
    borderRadius: 12,
    marginBottom: 24,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  preferenceLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  preferenceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferenceValueText: {
    color: '#4ECCA3',
    fontSize: 14,
    fontWeight: '500',
  },
  switchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4ECCA3',
    borderRadius: 16,
  },
  switchLabel: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Account Tab Styles
  accountSection: {
    marginBottom: 32,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  accountButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  dangerZone: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 24,
  },
  dangerTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerButtonText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DesktopUserProfile;
