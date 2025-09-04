// Optional features that may not be available in all environments
import { Platform } from 'react-native';

// Safe imports with fallbacks
let DocumentPicker: any = null;
let ImagePicker: any = null;
let Speech: any = null;
let Audio: any = null;

// Try to import optional modules
try {
  DocumentPicker = require('expo-document-picker');
} catch (e) {
  console.warn('expo-document-picker not available');
}

try {
  ImagePicker = require('expo-image-picker');
} catch (e) {
  console.warn('expo-image-picker not available');
}

try {
  Speech = require('expo-speech');
} catch (e) {
  console.warn('expo-speech not available');
}

try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.warn('expo-av not available');
}

// Feature availability checks
export const isDocumentPickerAvailable = () => {
  return DocumentPicker !== null && Platform.OS !== 'web';
};

export const isImagePickerAvailable = () => {
  return ImagePicker !== null;
};

export const isSpeechAvailable = () => {
  return Speech !== null && Platform.OS !== 'web';
};

export const isAudioRecordingAvailable = () => {
  return Audio !== null && Platform.OS !== 'web';
};

// Safe feature wrappers
export const pickDocument = async () => {
  if (!isDocumentPickerAvailable()) {
    throw new Error('Document picker is not available on this platform');
  }
  
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'text/*'],
  });
  
  if (result.type === 'success') {
    return {
      uri: result.uri,
      name: result.name,
      type: 'document',
    };
  }
  
  return null;
};

export const pickImage = async () => {
  if (!isImagePickerAvailable()) {
    throw new Error('Image picker is not available');
  }
  
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
  });
  
  if (!result.canceled && result.assets?.[0]) {
    return {
      uri: result.assets[0].uri,
      type: 'image',
    };
  }
  
  return null;
};

export const speakText = async (text: string) => {
  if (!isSpeechAvailable()) {
    console.warn('Text-to-speech is not available on this platform');
    return;
  }
  
  return Speech.speak(text, {
    language: 'en',
    pitch: 1,
    rate: 0.9,
  });
};

export const startAudioRecording = async () => {
  if (!isAudioRecordingAvailable()) {
    throw new Error('Audio recording is not available on this platform');
  }
  
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  
  return recording;
};

export const stopAudioRecording = async (recording: any) => {
  if (!recording) return null;
  
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  return uri;
};
