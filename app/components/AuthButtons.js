import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';

// Color palette
const colors = {
    bgPrimary: '#000000',
    bgSecondary: '#1E1E1E',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    accentPositive: '#4ECCA3',
    accentData: '#30A5FF',
    divider: '#333333',
    inputBg: '#2A2A2A',
    googleRed: '#EA4335',
    shinyGreen: '#10b981',
    shinyGray: '#6b7280',
};

const AuthOptionsComponent = ({ 
    onGooglePress, 
    onEmailPress, 
    onSkip, 
    isLoading = false,
    showSkip = true 
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.authButtonsContainer}>
                <TouchableOpacity 
                    style={[styles.authButton, styles.googleButton]}
                    onPress={onGooglePress}
                    disabled={isLoading}
                >
                    FontAwesome name="google" size={24} color={colors.googleRed} /u001e",
                    <Text style={styles.authButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.authButton, styles.emailButton]}
                    onPress={onEmailPress}
                    disabled={isLoading}
                >
                    MaterialCommunityIcons name="email-outline" size={24} color={colors.accentData} /u001e",
                    <Text style={styles.authButtonText}>Continue with Email</Text>
                </TouchableOpacity>
            </View>

            {showSkip && (
                <TouchableOpacity 
                    style={styles.skipButton}
                    onPress={onSkip}
                    disabled={isLoading}
                >
                    <Text style={styles.skipButtonText}>Skip for now</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 24,
    },
    authButtonsContainer: {
        marginBottom: 24,
    },
    authButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    googleButton: {
        backgroundColor: colors.bgSecondary,
        borderColor: colors.divider,
    },
    emailButton: {
        backgroundColor: colors.bgSecondary,
        borderColor: colors.divider,
    },
    authButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    skipButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});

export default AuthOptionsComponent;
