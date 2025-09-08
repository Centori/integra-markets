import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FastRefreshTest() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Fast Refresh Test - Change this text!
      </Text>
      <Text style={styles.subtext}>
        Save the file to see instant updates
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#4ECCA3',
    borderRadius: 10,
    margin: 10,
  },
  text: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtext: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
});
