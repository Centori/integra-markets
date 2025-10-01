import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { DevSettings } from 'react-native';

export default function DevMenuTrigger() {
  const openDevMenu = () => {
    if (__DEV__) {
      // This will reload the app
      DevSettings.reload();
      
      // Alternative: Show dev menu (may not work on all setups)
      // DevSettings.show();
    }
  };

  const toggleFastRefresh = () => {
    if (__DEV__) {
      // Toggle Fast Refresh
      const currentValue = DevSettings._settings?.isHotLoadingEnabled ?? true;
      DevSettings._settings = {
        ...DevSettings._settings,
        isHotLoadingEnabled: !currentValue
      };
      alert(`Fast Refresh: ${!currentValue ? 'Enabled' : 'Disabled'}`);
    }
  };

  if (!__DEV__) return null; // Only show in development

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={openDevMenu}>
        <Text style={styles.text}>🔄 Reload App</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.fastRefreshButton]} onPress={toggleFastRefresh}>
        <Text style={styles.text}>⚡ Toggle Fast Refresh</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: '#4ECCA3',
    padding: 10,
    borderRadius: 5,
    zIndex: 9999,
  },
  fastRefreshButton: {
    top: 100,
    backgroundColor: '#FF6B6B',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
