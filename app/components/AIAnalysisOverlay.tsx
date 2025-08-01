import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import Colors from '../constants/colors';
import { MaterialIcons } from '@expo/vector-icons';

interface NewsData {
    title: string;
    summary: string;
    source: string;
    timeAgo: string;
    sentiment: string;
    sentimentScore: number;
}

interface AIAnalysisOverlayProps {
    newsData: NewsData | null;
    isVisible: boolean;
    onClose: () => void;
}

const AIAnalysisOverlay: React.FC<AIAnalysisOverlayProps> = ({ newsData, isVisible, onClose }) => {
    if (!newsData) return null;

    // Mock data for the comprehensive analysis
    const analysisData = {
        summary: "Weekly natural gas storage report shows higher than expected inventory build, indicating potential oversupply conditions in key markets. This could signal bearish pressure on natural gas prices in the near term.",
        finBertSentiment: {
            bullish: 20,
            bearish: 20,
            neutral: 70
        },
        keyDrivers: [
            { text: "market", score: 0.5 },
            { text: "supply", score: 0.7 },
            { text: "inventory", score: 0.6 },
            { text: "storage", score: 0.8 },
            { text: "oversupply", score: 0.9 }
        ],
        marketImpact: {
            level: "MEDIUM",
            confidence: 0.5
        },
        traderInsights: [
            "Higher inventory levels typically lead to downward pressure on natural gas prices",
            "Watch for storage injection rates vs. seasonal norms",
            "Monitor weather forecasts for heating/cooling demand shifts",
            "Consider supply-side factors from key production regions"
        ]
    };

    const renderProgressBar = (percentage: number, color: string) => (
        <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { backgroundColor: '#404040' }]}>
                <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
        </View>
    );

    const renderDriverPill = (driver: { text: string; score: number }) => (
        <View key={driver.text} style={styles.driverPill}>
            <Text style={styles.driverText}>{driver.text} ({driver.score})</Text>
        </View>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.overlayContainer}>
                <View style={styles.webWrapper}>
                    <View style={styles.contentContainer}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>Integra Analysis</Text>
                            <View style={styles.headerActions}>
                                <TouchableOpacity style={styles.bookmarkButton}>
                                    <MaterialIcons name="bookmark-border" size={24} color={Colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <MaterialIcons name="close" size={24} color={Colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {/* Article Title and Source */}
                        <Text style={styles.articleTitle}>{newsData.title}</Text>
                        <TouchableOpacity>
                            <Text style={styles.source}>{newsData.source}</Text>
                        </TouchableOpacity>
                        
                        {/* Summary Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIndicator} />
                                <Text style={styles.sectionTitle}>Summary</Text>
                            </View>
                            <Text style={styles.summaryText}>{analysisData.summary}</Text>
                        </View>

                        {/* FinBERT Sentiment Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIndicator} />
                                <Text style={styles.sectionTitle}>FinBERT Sentiment</Text>
                            </View>
                            
                            <View style={styles.sentimentItem}>
                                <View style={styles.sentimentRow}>
                                    <Text style={styles.sentimentLabel}>Bullish</Text>
                                    <Text style={[styles.sentimentPercentage, { color: '#4ECCA3' }]}>
                                        {analysisData.finBertSentiment.bullish}%
                                    </Text>
                                </View>
                                {renderProgressBar(analysisData.finBertSentiment.bullish, '#4ECCA3')}
                            </View>

                            <View style={styles.sentimentItem}>
                                <View style={styles.sentimentRow}>
                                    <Text style={styles.sentimentLabel}>Bearish</Text>
                                    <Text style={[styles.sentimentPercentage, { color: '#F05454' }]}>
                                        {analysisData.finBertSentiment.bearish}%
                                    </Text>
                                </View>
                                {renderProgressBar(analysisData.finBertSentiment.bearish, '#F05454')}
                            </View>

                            <View style={styles.sentimentItem}>
                                <View style={styles.sentimentRow}>
                                    <Text style={styles.sentimentLabel}>Neutral</Text>
                                    <Text style={[styles.sentimentPercentage, { color: '#EAB308' }]}>
                                        {analysisData.finBertSentiment.neutral}%
                                    </Text>
                                </View>
                                {renderProgressBar(analysisData.finBertSentiment.neutral, '#EAB308')}
                            </View>
                        </View>

                        {/* Key Sentiment Drivers */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIndicator} />
                                <Text style={styles.sectionTitle}>Key Sentiment Drivers</Text>
                            </View>
                            <View style={styles.driversContainer}>
                                {analysisData.keyDrivers.map(renderDriverPill)}
                            </View>
                        </View>

                        {/* Market Impact */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIndicator} />
                                <Text style={styles.sectionTitle}>Market Impact</Text>
                            </View>
                            <View style={styles.marketImpactContainer}>
                                <View style={styles.impactBadge}>
                                    <Text style={styles.impactLevel}>{analysisData.marketImpact.level}</Text>
                                </View>
                                <Text style={styles.confidenceText}>
                                    Confidence: {analysisData.marketImpact.confidence}
                                </Text>
                            </View>
                        </View>

                        {/* What this means for Traders */}
                        <View style={[styles.section, { marginBottom: 20 }]}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIndicator} />
                                <Text style={styles.sectionTitle}>What this means for Traders</Text>
                            </View>
                            {analysisData.traderInsights.map((insight, index) => (
                                <View key={index} style={styles.insightRow}>
                                    <Text style={styles.bulletPoint}>•</Text>
                                    <Text style={styles.insightText}>{insight}</Text>
                                </View>
                            ))}
                        </View>
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingTop: 50,
        ...(typeof window !== 'undefined' && {
            justifyContent: 'center',
            alignItems: 'center',
        }),
    },
    webWrapper: {
        ...(typeof window !== 'undefined' ? {
            width: 414, // iPhone Pro Max width
            height: '85vh', // Slightly shorter than full height
            maxHeight: 750,
            alignSelf: 'center',
        } : {
            flex: 1,
        }),
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#121212',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 20,
        ...(typeof window !== 'undefined' && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 30,
            elevation: 30,
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        color: '#ECECEC',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 15,
    },
    bookmarkButton: {
        padding: 2,
    },
    closeButton: {
        padding: 2,
    },
    articleTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#ECECEC',
        lineHeight: 28,
        marginBottom: 8,
    },
    source: {
        fontSize: 16,
        color: '#4A9EFF',
        marginBottom: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionIndicator: {
        width: 3,
        height: 20,
        backgroundColor: '#4A9EFF',
        marginRight: 10,
        borderRadius: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ECECEC',
    },
    summaryText: {
        fontSize: 15,
        color: '#A0A0A0',
        lineHeight: 22,
    },
    sentimentItem: {
        marginBottom: 16,
    },
    sentimentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    sentimentLabel: {
        fontSize: 16,
        color: '#A0A0A0',
    },
    sentimentPercentage: {
        fontSize: 16,
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 6,
        marginBottom: 4,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    driversContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    driverPill: {
        backgroundColor: '#EAB308',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 8,
    },
    driverText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '500',
    },
    marketImpactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    impactBadge: {
        backgroundColor: '#EAB308',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    impactLevel: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '600',
    },
    confidenceText: {
        fontSize: 16,
        color: '#A0A0A0',
    },
    insightRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingRight: 10,
    },
    bulletPoint: {
        fontSize: 16,
        color: '#A0A0A0',
        marginRight: 8,
        marginTop: 2,
    },
    insightText: {
        flex: 1,
        fontSize: 15,
        color: '#A0A0A0',
        lineHeight: 22,
    },
});

export default AIAnalysisOverlay;

