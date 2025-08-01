import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AIProvider = 'openai' | 'claude' | 'groq';

export interface APIKey {
  id: string;
  provider: AIProvider;
  key: string;
  name: string;
  createdAt: Date;
}

interface APIKeyContextType {
  apiKeys: APIKey[];
  selectedProvider: AIProvider | null;
  selectedKey: APIKey | null;
  addAPIKey: (provider: AIProvider, key: string, name: string) => Promise<void>;
  removeAPIKey: (id: string) => Promise<void>;
  selectProvider: (provider: AIProvider) => void;
  hasAnyKeys: boolean;
  isLoading: boolean;
}

const APIKeyContext = createContext<APIKeyContextType | undefined>(undefined);

const STORAGE_KEY = 'integra_api_keys';
const SELECTED_PROVIDER_KEY = 'integra_selected_provider';

export const APIKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const [keysData, providerData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(SELECTED_PROVIDER_KEY)
      ]);
      
      if (keysData) {
        const keys = JSON.parse(keysData).map((key: any) => ({
          ...key,
          createdAt: new Date(key.createdAt)
        }));
        setApiKeys(keys);
      }
      
      if (providerData) {
        setSelectedProvider(providerData as AIProvider);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAPIKeys = async (keys: APIKey[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } catch (error) {
      console.error('Failed to save API keys:', error);
    }
  };

  const addAPIKey = async (provider: AIProvider, key: string, name: string) => {
    const newKey: APIKey = {
      id: Date.now().toString(),
      provider,
      key,
      name,
      createdAt: new Date()
    };
    
    const updatedKeys = [...apiKeys, newKey];
    setApiKeys(updatedKeys);
    await saveAPIKeys(updatedKeys);
    
    // Auto-select this provider if it's the first key
    if (apiKeys.length === 0) {
      setSelectedProvider(provider);
      await AsyncStorage.setItem(SELECTED_PROVIDER_KEY, provider);
    }
  };

  const removeAPIKey = async (id: string) => {
    const updatedKeys = apiKeys.filter(key => key.id !== id);
    setApiKeys(updatedKeys);
    await saveAPIKeys(updatedKeys);
    
    // If we removed the selected provider's key, reset selection
    const removedKey = apiKeys.find(key => key.id === id);
    if (removedKey && removedKey.provider === selectedProvider) {
      const remainingKeys = updatedKeys.filter(key => key.provider === selectedProvider);
      if (remainingKeys.length === 0) {
        setSelectedProvider(null);
        await AsyncStorage.removeItem(SELECTED_PROVIDER_KEY);
      }
    }
  };

  const selectProvider = async (provider: AIProvider) => {
    setSelectedProvider(provider);
    await AsyncStorage.setItem(SELECTED_PROVIDER_KEY, provider);
  };

  const selectedKey = selectedProvider 
    ? apiKeys.find(key => key.provider === selectedProvider) || null
    : null;

  const value: APIKeyContextType = {
    apiKeys,
    selectedProvider,
    selectedKey,
    addAPIKey,
    removeAPIKey,
    selectProvider,
    hasAnyKeys: apiKeys.length > 0,
    isLoading
  };

  return (
    <APIKeyContext.Provider value={value}>
      {children}
    </APIKeyContext.Provider>
  );
};

export const useAPIKeys = () => {
  const context = useContext(APIKeyContext);
  if (!context) {
    throw new Error('useAPIKeys must be used within APIKeyProvider');
  }
  return context;
};