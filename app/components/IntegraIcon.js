// IntegraIcon.js - Reusable branded icon component
import React, { useEffect } from 'react';
import { View, Animated } from 'react-native';

const IntegraIcon = ({ 
    size = 192, 
    animated = false, 
    variant = 'default', // 'default', 'loading', 'app-icon'
    style = {} 
}) => {
    const animatedValue = new Animated.Value(0);
    
    useEffect(() => {
        if (animated) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: false,
                    }),
                    Animated.timing(animatedValue, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        }
    }, [animated]);

    // Color configurations for different variants
    const getColors = () => {
        switch (variant) {
            case 'loading':
                return {
                    border: animated 
                        ? animatedValue.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: ['#4ECCA3', '#6B7280', '#4ECCA3']
                        })
                        : '#FFFFFF',
                    dot: '#FFFFFF',
                    line: '#6B7280',
                    background: '#000000'
                };
            case 'app-icon':
                return {
                    border: '#FFFFFF',
                    dot: '#FFFFFF',
                    line: '#FFFFFF',
                    background: '#000000'
                };
            default:
                return {
                    border: '#4ECCA3',
                    dot: '#4ECCA3',
                    line: '#4ECCA3',
                    background: 'transparent'
                };
        }
    };

    const colors = getColors();
    const iconSize = size;
    const borderWidth = Math.max(2, size * 0.015);
    const dotSize = size * 0.06;
    const lineWidth = size * 0.06;
    const lineHeight = size * 0.2;
    const cornerRadius = size * 0.18;
    const gapSize = size * 0.04;

    return (
        <View style={[
            {
                width: iconSize,
                height: iconSize,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.background,
                borderRadius: variant === 'app-icon' ? cornerRadius : 0,
            },
            style
        ]}>
            <Animated.View
                style={{
                    width: iconSize * 0.7,
                    height: iconSize * 0.7,
                    borderWidth: borderWidth,
                    borderRadius: cornerRadius * 0.75,
                    borderColor: colors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <View
                    style={{
                        width: dotSize,
                        height: dotSize,
                        backgroundColor: colors.dot,
                        borderRadius: dotSize / 2,
                        marginBottom: gapSize,
                    }}
                />
                <View
                    style={{
                        width: lineWidth,
                        height: lineHeight,
                        backgroundColor: colors.line,
                        borderRadius: lineWidth / 2,
                    }}
                />
            </Animated.View>
        </View>
    );
};

export default IntegraIcon;