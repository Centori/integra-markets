import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import TermsOfService from './TermsOfService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TermsOfServiceModal = ({ visible, onClose }) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start both animations when modal becomes visible
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal is hidden
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = () => {
    // Animate out before closing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        {/* Semi-transparent background */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            },
          ]}
        />
        
        {/* Terms of Service Content */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TermsOfService onBack={handleClose} />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#121212',
    // Add slight border radius for iOS
    ...(Platform.OS === 'ios' && {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      overflow: 'hidden',
      // Add subtle shadow
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    }),
  },
});

export default TermsOfServiceModal;
