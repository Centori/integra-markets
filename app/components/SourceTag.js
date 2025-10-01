import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * SourceTag Component
 * Displays inline source citations in a compact, styled badge
 * @param {string} source - The source name/reference to display
 * @param {boolean} isDarkMode - Whether to use dark theme styling
 */
const SourceTag = ({ source, isDarkMode = false }) => {
  if (!source) return null;
  
  return (
    <View style={[
      styles.container,
      isDarkMode ? styles.darkContainer : styles.lightContainer
    ]}>
      <Text style={[
        styles.text,
        isDarkMode ? styles.darkText : styles.lightText
      ]}>
        {source}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    marginRight: 4,
    marginVertical: 2,
    alignSelf: 'flex-start',
  },
  lightContainer: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  darkContainer: {
    backgroundColor: '#3A3A3C',
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
  lightText: {
    color: '#666',
  },
  darkText: {
    color: '#8E8E93',
  },
});

export default SourceTag;
