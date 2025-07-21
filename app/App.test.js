// App.test.js - Step-by-step dependency testing
// Phase 4: Add Toast Message (likely culprit for original Hermes errors)
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// Check if Hermes is enabled
const isHermes = () => !!global.HermesInternal;

// Basic colors
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
};

// Test App Component - Phase 1: Basic React Native imports only
export default function TestApp() {
  console.log('Using Hermes:', isHermes());
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>Phase 4: + Toast Message</Text>
      <Text style={styles.subtitle}>Hermes: {isHermes() ? 'Enabled' : 'Disabled'}</Text>
      
      <ScrollView style={styles.scrollView}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => Alert.alert('Test', 'Basic functionality working!')}
          >
            <Text style={styles.buttonText}>Test Alert</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={async () => {
              try {
                await AsyncStorage.setItem('test', 'AsyncStorage working!');
                const value = await AsyncStorage.getItem('test');
                Alert.alert('AsyncStorage Test', value || 'Failed');
              } catch (error) {
                Alert.alert('AsyncStorage Error', error.message);
              }
            }}
          >
            <Text style={styles.buttonText}>Test AsyncStorage</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => Alert.alert('Vector Icons', 'Icons loaded successfully!')}
          >
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
              <MaterialIcons name="star" size={20} color={colors.accentPositive} />
              <Text style={[styles.buttonText, {marginLeft: 8}]}>Test Vector Icons</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              Toast.show({
                type: 'success',
                text1: 'Toast Test',
                text2: 'React Native Toast Message working with Hermes!'
              });
            }}
          >
            <Text style={styles.buttonText}>Test Toast Message</Text>
          </TouchableOpacity>
      </ScrollView>
      
      {/* Toast Component */}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.bgPrimary,
    paddingTop: 60, // Manual safe area
  },
  title: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.accentPositive,
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  button: {
    backgroundColor: colors.bgSecondary,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 16,
  },
});
