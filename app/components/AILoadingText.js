import React, { useState, useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';

const DEFAULT_TEXTS = [
  'Thinking...',
  'Processing...',
  'Analyzing...',
  'Computing...',
  'Almost...'
];

const AILoadingText = ({ 
  texts = DEFAULT_TEXTS,
  interval = 1500,
  style,
  textStyle 
}) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTextIndex(prev => (prev + 1) % texts.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, texts.length]);

  useEffect(() => {
    fadeAnim.setValue(0);
    translateY.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentTextIndex]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
        style
      ]}
    >
      <Text style={textStyle}>
        {texts[currentTextIndex]}
      </Text>
    </Animated.View>
  );
};

export default AILoadingText;