import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, SafeAreaView, StatusBar } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

// Color constants adapted for the current app
const Colors = {
  background: '#121212',
  card: '#1E1E1E',
  text: '#ECECEC',
  textSecondary: '#A0A0A0',
  tint: '#4ECCA3',
  tintLight: 'rgba(78, 204, 163, 0.1)',
  border: '#333333',
  bearish: '#F05454',
};

const getProviderLabel = (provider) => {
  switch (provider) {
    case 'openai': return 'OpenAI ChatGPT';
    case 'claude': return 'Anthropic Claude';
    case 'groq': return 'Groq';
    default: return provider;
  }
};

const getRoleLabel = (role) => {
  const roleMap = {
    'trader': 'Trader',
    'analyst': 'Analyst',
    'hedge-fund': 'Hedge Fund',
    'bank': 'Bank',
    'refiner': 'Refiner',
    'blender': 'Blender',
    'producer': 'Producer',
    'shipping': 'Shipping & Freight'
  };
  return roleMap[role] || role;
};

export default function ComprehensiveProfileScreen({ 
  userProfile = null,
  alertPreferences = { commodities: [], frequency: 'daily', notifications: true },
  apiKeys = [],
  bookmarks = [],
  onBack,
  removeAPIKey = () => {},
  selectedProvider = null,
  selectProvider = () => {}
}) {
  const [showAPIKeySetup, setShowAPIKeySetup] = useState(false);
  const [showAlertPreferences, setShowAlertPreferences] = useState(false);

  const { deleteAccount } = useAuth();

  const handleAccountDeletion = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert('Error', 'There was a problem deleting your account.');
            } else {
              Alert.alert('Account Deleted', 'Your account has been deleted.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteKey = (keyId, keyName) => {
    Alert.alert(
      'Delete API Key',
      `Are you sure you want to delete "${keyName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeAPIKey(keyId)
        }
      ]
    );
  };

  const handleProviderSelect = (provider) => {
    selectProvider(provider);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.tint} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* User Profile Section */}
        {userProfile && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <MaterialIcons name="person" color={Colors.tint} size={20} />
                <Text style={styles.sectionTitle}>Profile</Text>
              </View>
            </View>

            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {userProfile.username?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {userProfile.username || 'User'}
                  </Text>
                  <Text style={styles.profileRole}>
                    {getRoleLabel(userProfile.role)}
                  </Text>
                  {userProfile.institution && (
                    <Text style={styles.profileInstitution}>
                      {userProfile.institution}
                    </Text>
                  )}
                </View>
              </View>
              
              {userProfile.bio && (
                <Text style={styles.profileBio}>{userProfile.bio}</Text>
              )}
              
              <View style={styles.profileStats}>
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>
                    {userProfile.marketFocus?.length || 0}
                  </Text>
                  <Text style={styles.profileStatLabel}>Market Focus</Text>
                </View>
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>
                    {userProfile.experience || 'N/A'}
                  </Text>
                  <Text style={styles.profileStatLabel}>Experience</Text>
                </View>
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>
                    {alertPreferences.commodities.length}
                  </Text>
                  <Text style={styles.profileStatLabel}>Alerts</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Alert Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialIcons name="notifications" color={Colors.tint} size={20} />
              <Text style={styles.sectionTitle}>Alert Preferences</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowAlertPreferences(true)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.alertsCard}>
            <View style={styles.alertRow}>
              <Text style={styles.alertLabel}>Commodities</Text>
              <Text style={styles.alertValue}>
                {alertPreferences.commodities.length} selected
              </Text>
            </View>
            <View style={styles.alertRow}>
              <Text style={styles.alertLabel}>Frequency</Text>
              <Text style={styles.alertValue}>
                {alertPreferences.frequency.charAt(0).toUpperCase() + alertPreferences.frequency.slice(1)}
              </Text>
            </View>
            <View style={styles.alertRow}>
              <Text style={styles.alertLabel}>Notifications</Text>
              <Text style={styles.alertValue}>
                {alertPreferences.notifications ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {/* API Keys Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialIcons name="vpn-key" color={Colors.tint} size={20} />
              <Text style={styles.sectionTitle}>API Keys</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAPIKeySetup(true)}
            >
              <MaterialIcons name="add" color={Colors.tint} size={20} />
            </TouchableOpacity>
          </View>

          {apiKeys.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No API keys configured</Text>
              <Text style={styles.emptyStateSubtext}>
                Add an API key to start chatting with AI
              </Text>
            </View>
          ) : (
            <View style={styles.keysList}>
              {apiKeys.map((key) => (
                <View key={key.id} style={styles.keyItem}>
                  <TouchableOpacity
                    style={[
                      styles.keyContent,
                      selectedProvider === key.provider && styles.selectedKey
                    ]}
                    onPress={() => handleProviderSelect(key.provider)}
                  >
                    <View style={styles.keyInfo}>
                      <Text style={styles.keyName}>{key.name}</Text>
                      <Text style={styles.keyProvider}>{getProviderLabel(key.provider)}</Text>
                      <Text style={styles.keyDate}>
                        Added {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : 'Recently'}
                      </Text>
                    </View>
                    {selectedProvider === key.provider && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>Active</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteKey(key.id, key.name)}
                  >
                    <MaterialIcons name="delete" color={Colors.bearish} size={18} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bookmarks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialIcons name="bookmark" color={Colors.tint} size={20} />
              <Text style={styles.sectionTitle}>Bookmarks</Text>
            </View>
            <Text style={styles.bookmarkCount}>{bookmarks.length}</Text>
          </View>

          {bookmarks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No bookmarks yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Bookmark news articles to save them for later
              </Text>
            </View>
          ) : (
            <View style={styles.bookmarksList}>
              {bookmarks.slice(0, 3).map((bookmark) => (
                <View key={bookmark.id} style={styles.bookmarkItem}>
                  <View style={styles.bookmarkContent}>
                    <Text style={styles.bookmarkTitle} numberOfLines={2}>
                      {bookmark.title}
                    </Text>
                    <Text style={styles.bookmarkSource}>{bookmark.source}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" color={Colors.textSecondary} size={16} />
                </View>
              ))}
              {bookmarks.length > 3 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View all {bookmarks.length} bookmarks</Text>
                  <MaterialIcons name="chevron-right" color={Colors.tint} size={16} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialIcons name="settings" color={Colors.tint} size={20} />
              <Text style={styles.sectionTitle}>Settings</Text>
            </View>
          </View>

          <View style={styles.settingsList}>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Notifications</Text>
              <MaterialIcons name="chevron-right" color={Colors.textSecondary} size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={() => {
              Alert.alert(
                'Privacy Settings',
                'Privacy settings will be available in the next update.',
                [{ text: 'OK' }]
              );
            }}>
              <Text style={styles.settingText}>Privacy</Text>
              <MaterialIcons name="chevron-right" color={Colors.textSecondary} size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={() => {
              Alert.alert(
                'About Integra Markets',
                'Integra Markets v1.0.0\n\nA comprehensive financial markets analysis platform.',
                [{ text: 'OK' }]
              );
            }}>
              <Text style={styles.settingText}>About</Text>
              <MaterialIcons name="chevron-right" color={Colors.textSecondary} size={16} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Delete Account Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleAccountDeletion}>
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
          <Text style={styles.deleteAccountDescription}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </Text>
        </View>
      </ScrollView>

      {/* Modal Placeholders - Replace with actual modals when available */}
      {showAPIKeySetup && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>API Key Setup</Text>
            <Text style={styles.modalText}>API Key setup modal would appear here</Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowAPIKeySetup(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showAlertPreferences && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alert Preferences</Text>
            <Text style={styles.modalText}>Alert preferences modal would appear here</Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowAlertPreferences(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 34,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: Colors.tintLight,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: Colors.tint,
    fontSize: 14,
    fontWeight: "500",
  },
  addButton: {
    backgroundColor: Colors.tintLight,
    borderRadius: 20,
    padding: 8,
  },
  bookmarkCount: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.tint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileAvatarText: {
    color: "#000",
    fontSize: 24,
    fontWeight: "600",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileRole: {
    color: Colors.tint,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  profileInstitution: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  profileBio: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  profileStat: {
    alignItems: "center",
  },
  profileStatValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileStatLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  alertsCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  alertLabel: {
    color: Colors.text,
    fontSize: 16,
  },
  alertValue: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyStateText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  keysList: {
    gap: 12,
  },
  keyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  keyContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  selectedKey: {
    backgroundColor: Colors.tintLight,
  },
  keyInfo: {
    flex: 1,
  },
  keyName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  keyProvider: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 2,
  },
  keyDate: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  selectedBadge: {
    backgroundColor: Colors.tint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "500",
  },
  deleteButton: {
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  bookmarksList: {
    gap: 12,
  },
  bookmarkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookmarkContent: {
    flex: 1,
  },
  bookmarkTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  bookmarkSource: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.tintLight,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  viewAllText: {
    color: Colors.tint,
    fontSize: 16,
    fontWeight: "500",
  },
  settingsList: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingText: {
    color: Colors.text,
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 24,
    margin: 20,
    alignItems: 'center',
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: Colors.tint,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  modalButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  // Delete Account Section
  deleteAccountButton: {
    backgroundColor: Colors.bearish,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteAccountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
