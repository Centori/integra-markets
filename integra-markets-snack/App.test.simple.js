import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello Integra - Web Test</Text>
      <Text style={styles.subtext}>If you can see this, the basic setup is working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  text: {
    color: '#ECECEC',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtext: {
    color: '#A0A0A0',
    fontSize: 16,
    marginTop: 10,
  },
});
