import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../utils/toast';

// Keys for storing API keys securely
const API_KEYS_STORAGE_KEY = '@api_keys';
const SELECTED_PROVIDER_KEY = '@selected_provider';

// Supported AI providers
export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GROQ: 'groq',
};

// Provider configurations
const PROVIDER_CONFIGS = {
  [AI_PROVIDERS.OPENAI]: {
    name: 'OpenAI',
    displayName: 'OpenAI ChatGPT',
    keyPrefix: 'sk-',
    keyLength: [51], // OpenAI keys are typically 51 characters
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo-preview'],
    testEndpoint: '/models',
  },
  [AI_PROVIDERS.ANTHROPIC]: {
    name: 'Anthropic',
    displayName: 'Anthropic Claude',
    keyPrefix: 'sk-ant-',
    keyLength: [108], // Anthropic keys are typically longer
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    testEndpoint: '/messages',
  },
  [AI_PROVIDERS.GROQ]: {
    name: 'Groq',
    displayName: 'Groq',
    keyPrefix: 'gsk_',
    keyLength: [56], // Groq keys
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama2-70b-4096', 'mixtral-8x7b-32768'],
    testEndpoint: '/models',
  },
};

/**
 * Validate API key format for a given provider
 */
export function validateApiKey(provider, apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required' };
  }

  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    return { valid: false, error: 'Invalid provider' };
  }

  // Check prefix
  if (!apiKey.startsWith(config.keyPrefix)) {
    return { 
      valid: false, 
      error: `API key should start with "${config.keyPrefix}"` 
    };
  }

  // Check length
  if (!config.keyLength.includes(apiKey.length)) {
    return { 
      valid: false, 
      error: `API key should be ${config.keyLength.join(' or ')} characters long` 
    };
  }

  return { valid: true };
}

/**
 * Test API key by making a simple request to the provider
 */
export async function testApiKey(provider, apiKey) {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error('Invalid provider');
  }

  const validation = validateApiKey(provider, apiKey);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    let headers = {
      'Content-Type': 'application/json',
    };

    // Set provider-specific headers
    if (provider === AI_PROVIDERS.OPENAI || provider === AI_PROVIDERS.GROQ) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === AI_PROVIDERS.ANTHROPIC) {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }

    const response = await fetch(`${config.baseUrl}${config.testEndpoint}`, {
      method: 'GET',
      headers,
      timeout: 10000,
    });

    if (response.ok) {
      return { success: true, message: 'API key is valid' };
    } else {
      const errorData = await response.text();
      throw new Error(`API test failed: ${response.status} - ${errorData}`);
    }
  } catch (error) {
    console.error('API key test failed:', error);
    throw new Error(`Failed to validate API key: ${error.message}`);
  }
}

/**
 * Store API key securely
 */
export async function storeApiKey(provider, apiKey, name = null) {
  try {
    // Validate the key first
    const validation = validateApiKey(provider, apiKey);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Test the key
    await testApiKey(provider, apiKey);

    // Get existing keys
    const existingKeys = await getStoredApiKeys();
    
    // Create new key entry
    const keyEntry = {
      id: `${provider}_${Date.now()}`,
      provider,
      name: name || `${PROVIDER_CONFIGS[provider].displayName} Key`,
      keyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      isActive: true,
    };

    // Store the actual key separately (more secure)
    await AsyncStorage.setItem(`@api_key_${keyEntry.id}`, apiKey);

    // Add to keys list
    existingKeys.push(keyEntry);
    await AsyncStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(existingKeys));

    showToast('success', 'API Key Added', `${keyEntry.name} has been added successfully`);
    return keyEntry;
  } catch (error) {
    console.error('Error storing API key:', error);
    showToast('error', 'Failed to Add Key', error.message);
    throw error;
  }
}

/**
 * Get all stored API keys (without the actual key values)
 */
export async function getStoredApiKeys() {
  try {
    const keys = await AsyncStorage.getItem(API_KEYS_STORAGE_KEY);
    return keys ? JSON.parse(keys) : [];
  } catch (error) {
    console.error('Error getting stored API keys:', error);
    return [];
  }
}

/**
 * Get the actual API key value by ID
 */
export async function getApiKeyById(keyId) {
  try {
    return await AsyncStorage.getItem(`@api_key_${keyId}`);
  } catch (error) {
    console.error('Error getting API key by ID:', error);
    return null;
  }
}

/**
 * Remove an API key
 */
export async function removeApiKey(keyId) {
  try {
    const existingKeys = await getStoredApiKeys();
    const updatedKeys = existingKeys.filter(key => key.id !== keyId);
    
    // Remove the actual key
    await AsyncStorage.removeItem(`@api_key_${keyId}`);
    
    // Update the keys list
    await AsyncStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(updatedKeys));
    
    // If this was the selected provider, clear the selection
    const selectedProvider = await getSelectedProvider();
    if (selectedProvider?.keyId === keyId) {
      await clearSelectedProvider();
    }
    
    showToast('success', 'API Key Removed', 'The API key has been removed successfully');
    return true;
  } catch (error) {
    console.error('Error removing API key:', error);
    showToast('error', 'Failed to Remove Key', 'Could not remove the API key');
    return false;
  }
}

/**
 * Set the selected provider and key
 */
export async function setSelectedProvider(keyId, provider) {
  try {
    const providerData = {
      keyId,
      provider,
      selectedAt: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(SELECTED_PROVIDER_KEY, JSON.stringify(providerData));
    
    // Update the lastUsed timestamp for the key
    const keys = await getStoredApiKeys();
    const updatedKeys = keys.map(key => 
      key.id === keyId 
        ? { ...key, lastUsed: new Date().toISOString() }
        : key
    );
    await AsyncStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(updatedKeys));
    
    return providerData;
  } catch (error) {
    console.error('Error setting selected provider:', error);
    return null;
  }
}

/**
 * Get the selected provider and key
 */
export async function getSelectedProvider() {
  try {
    const data = await AsyncStorage.getItem(SELECTED_PROVIDER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting selected provider:', error);
    return null;
  }
}

/**
 * Clear the selected provider
 */
export async function clearSelectedProvider() {
  try {
    await AsyncStorage.removeItem(SELECTED_PROVIDER_KEY);
  } catch (error) {
    console.error('Error clearing selected provider:', error);
  }
}

/**
 * Get the active API configuration (provider + key)
 */
export async function getActiveApiConfig() {
  try {
    const selectedProvider = await getSelectedProvider();
    if (!selectedProvider) {
      return null;
    }

    const apiKey = await getApiKeyById(selectedProvider.keyId);
    if (!apiKey) {
      return null;
    }

    const config = PROVIDER_CONFIGS[selectedProvider.provider];
    return {
      provider: selectedProvider.provider,
      apiKey,
      config,
      keyId: selectedProvider.keyId,
    };
  } catch (error) {
    console.error('Error getting active API config:', error);
    return null;
  }
}

/**
 * Make an API request using the active configuration
 */
export async function makeApiRequest(endpoint, options = {}) {
  const activeConfig = await getActiveApiConfig();
  if (!activeConfig) {
    throw new Error('No active API key configured. Please add and select an API key.');
  }

  const { provider, apiKey, config } = activeConfig;
  
  let headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Set provider-specific headers
  if (provider === AI_PROVIDERS.OPENAI || provider === AI_PROVIDERS.GROQ) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider === AI_PROVIDERS.ANTHROPIC) {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      timeout: options.timeout || 30000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export default {
  AI_PROVIDERS,
  PROVIDER_CONFIGS,
  validateApiKey,
  testApiKey,
  storeApiKey,
  getStoredApiKeys,
  getApiKeyById,
  removeApiKey,
  setSelectedProvider,
  getSelectedProvider,
  clearSelectedProvider,
  getActiveApiConfig,
  makeApiRequest,
};
