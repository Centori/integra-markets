// IntegraIcon.js - Official Integra branded icon component (matches media kit)
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

    // Color configurations for different variants (updated to match media kit)
    const getColors = () => {
        switch (variant) {
            case 'loading':
                return {
                    border: '#4ECCA3', // Always green for the border
                    dot: '#4ECCA3',    // Green for the dot
                    line: '#4ECCA3',   // Green for the line (no more grey)
                    background: '#000000'
                };
            case 'app-icon':
                return {
                    border: '#4ECCA3', // Green border
                    dot: '#4ECCA3',    // Green dot
                    line: '#4ECCA3',   // Green line
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
    // Updated dimensions to match media kit specifications
    const borderWidth = Math.max(2, size * 0.015);
    const dotSize = size * 0.06;        // 6% of total size for slim design
    const lineWidth = size * 0.06;      // 6% of total size for slim design  
    const lineHeight = size * 0.2;      // 20% of total size
    const cornerRadius = size * 0.1;    // 10% for more square appearance (updated from 0.18)
    const gapSize = size * 0.04;        // Gap between dot and line

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
                        borderRadius: cornerRadius * 0.1, // Square-ish dot like in media kit
                        marginBottom: gapSize,
                    }}
                />
                <View
                    style={{
                        width: lineWidth,
                        height: lineHeight,
                        backgroundColor: colors.line,
                        borderRadius: cornerRadius * 0.1, // Square-ish line like in media kit
                    }}
                />
            </Animated.View>
        </View>
    );
};

export default IntegraIcon;