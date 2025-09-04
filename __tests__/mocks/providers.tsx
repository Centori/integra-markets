import React from 'react';

// Mock AuthProvider
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Mock ProfileProvider
export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Mock SocialProvider
export const SocialProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Mock useProfile hook
export const useProfile = () => {
  const [profile, setProfile] = React.useState<any>(null);
  const [isOffline, setIsOffline] = React.useState(false);
  
  return {
    profile,
    setProfile,
    isOffline,
    createProfile: jest.fn(),
    fetchProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
    uploadAvatar: jest.fn(),
    subscribeToProfileChanges: jest.fn(),
    syncProfile: jest.fn(),
    trackActivity: jest.fn(),
    followUser: jest.fn(),
  };
};

// Mock useSocialFeatures hook
export const useSocialFeatures = () => {
  const [userVotes, setUserVotes] = React.useState<any>({});
  const [voteCounts, setVoteCounts] = React.useState<any>({});
  const [following, setFollowing] = React.useState<string[]>([]);
  const [followers, setFollowers] = React.useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = React.useState<any[]>([]);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [userReputation, setUserReputation] = React.useState<any>({});
  const [leaderboard, setLeaderboard] = React.useState<any[]>([]);
  const [userRank, setUserRank] = React.useState(0);
  const [recentShares, setRecentShares] = React.useState<any[]>([]);
  const [shareAnalytics, setShareAnalytics] = React.useState<any>({});
  const [lastSharePlatform, setLastSharePlatform] = React.useState('');
  
  return {
    userVotes,
    voteCounts,
    following,
    setFollowing,
    followers,
    followingUsers,
    notifications,
    unreadCount,
    userReputation,
    leaderboard,
    userRank,
    recentShares,
    shareAnalytics,
    lastSharePlatform,
    voteContent: jest.fn(),
    fetchVoteCounts: jest.fn(),
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
    fetchFollowers: jest.fn(),
    fetchFollowing: jest.fn(),
    calculateReputation: jest.fn(),
    updateReputation: jest.fn(),
    fetchLeaderboard: jest.fn(),
    shareContent: jest.fn(),
    fetchShareAnalytics: jest.fn(),
    fetchNotifications: jest.fn(),
    markNotificationsRead: jest.fn(),
    subscribeToNotifications: jest.fn(),
    requestNotificationPermission: jest.fn(),
    shareViaIntent: jest.fn(),
    shareViaWebAPI: jest.fn(),
  };
};

// Mock screens
export const LoginScreen = () => null;
export const ProfileSetupScreen = () => null;
