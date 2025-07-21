import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAPIKeys, AIProvider } from '@/providers/APIKeyProvider';

interface APIKeySetupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const APIKeySetupModal: React.FC<APIKeySetupModalProps> = ({
  isVisible,
  onClose,
  onComplete,
}) => {
  const { addAPIKey } = useAPIKeys();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const providers = [
    { id: 'openai' as AIProvider, name: 'OpenAI', description: 'GPT-4 and ChatGPT' },
    { id: 'claude' as AIProvider, name: 'Anthropic Claude', description: 'Claude 3 models' },
    { id: 'groq' as AIProvider, name: 'Groq', description: 'Fast inference' },
  ];

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    if (!keyName.trim()) {
      Alert.alert('Error', 'Please enter a name for this key');
      return;
    }

    setIsLoading(true);
    try {
      await addAPIKey(selectedProvider, apiKey.trim(), keyName.trim());
      setApiKey('');
      setKeyName('');
      onComplete();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Add API Key</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.sectionTitle}>Provider</Text>
            <View style={styles.providerGrid}>
              {providers.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerCard,
                    selectedProvider === provider.id && styles.selectedProvider,
                  ]}
                  onPress={() => setSelectedProvider(provider.id)}
                >
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerDescription}>{provider.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>API Key</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter your API key"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
            />

            <Text style={styles.sectionTitle}>Key Name</Text>
            <TextInput
              style={styles.input}
              value={keyName}
              onChangeText={setKeyName}
              placeholder="e.g., My OpenAI Key"
              placeholderTextColor={Colors.textSecondary}
            />

            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save API Key'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    marginTop: 16,
  },
  providerGrid: {
    gap: 12,
  },
  providerCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedProvider: {
    borderColor: Colors.tint,
    backgroundColor: Colors.tintLight,
  },
  providerName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  providerDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: Colors.tint,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default APIKeySetupModal;