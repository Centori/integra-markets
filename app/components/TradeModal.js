import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import kalshiService from '../services/kalshiService';

// Color palette consistent with the app
const colors = {
  bgPrimary: '#121212',
  bgSecondary: '#1E1E1E',
  bgTertiary: '#252525',
  textPrimary: '#ECECEC',
  textSecondary: '#A0A0A0',
  accentPositive: '#4ECCA3',
  accentNegative: '#F05454',
  accentNeutral: '#EAB308',
  accentData: '#30A5FF',
  divider: '#333333',
  cardBorder: '#2A2A2A',
};

const { width, height } = Dimensions.get('window');

const TradeModal = ({ visible, market, onClose, onTradeComplete }) => {
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [position, setPosition] = useState('yes'); // 'yes' or 'no'
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState('market'); // 'market' or 'limit'
  const [loading, setLoading] = useState(false);
  const [orderBook, setOrderBook] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [estimatedPayout, setEstimatedPayout] = useState(0);

  // Load order book when modal opens
  useEffect(() => {
    if (visible && market) {
      loadOrderBook();
      // Set initial price based on market prices
      setPrice(position === 'yes' ? market.yesPrice?.toString() || '' : market.noPrice?.toString() || '');
    }
  }, [visible, market, position]);

  // Calculate estimated cost and payout when inputs change
  useEffect(() => {
    calculateEstimates();
  }, [quantity, price, position, tradeType, orderType]);

  const loadOrderBook = async () => {
    if (!market?.id) return;
    
    try {
      const bookData = await kalshiService.getOrderBook(market.id);
      setOrderBook(bookData);
    } catch (error) {
      console.error('Error loading order book:', error);
    }
  };

  const calculateEstimates = () => {
    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || 0;

    if (qty <= 0) {
      setEstimatedCost(0);
      setEstimatedPayout(0);
      return;
    }

    if (tradeType === 'buy') {
      const cost = qty * prc;
      const payout = qty * 100; // Max payout is $1 per share
      setEstimatedCost(cost);
      setEstimatedPayout(payout);
    } else {
      // Selling - reverse calculation
      const proceeds = qty * prc;
      const maxLoss = qty * (100 - prc);
      setEstimatedCost(maxLoss);
      setEstimatedPayout(proceeds);
    }
  };

  const handleTrade = async () => {
    if (!market || !quantity || !price) {
      Alert.alert('Invalid Input', 'Please enter both quantity and price.');
      return;
    }

    const qty = parseFloat(quantity);
    const prc = parseFloat(price);

    if (qty <= 0 || prc <= 0 || prc > 100) {
      Alert.alert('Invalid Input', 'Please enter valid quantity and price (0-100¢).');
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        market_id: market.id,
        side: tradeType === 'buy' ? 'buy' : 'sell',
        outcome: position,
        quantity: Math.floor(qty),
        price: Math.floor(prc),
        type: orderType,
      };

      // For demo purposes, we'll simulate the trade
      // In a real app, this would call the actual Kalshi API
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Trade Submitted',
        `Your ${tradeType} order for ${qty} ${position.toUpperCase()} shares at ${prc}¢ has been submitted.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onTradeComplete && onTradeComplete(orderData);
              onClose();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting trade:', error);
      Alert.alert('Trade Error', error.message || 'Failed to submit trade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuantity('');
    setPrice('');
    setEstimatedCost(0);
    setEstimatedPayout(0);
  };

  if (!market) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trade Market</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Market Info */}
          <View style={styles.marketInfo}>
            <Text style={styles.marketTitle} numberOfLines={2}>
              {market.title}
            </Text>
            <View style={styles.marketPrices}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>YES</Text>
                <Text style={[styles.priceValue, { color: colors.accentPositive }]}>
                  {market.yesPrice || '--'}¢
                </Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>NO</Text>
                <Text style={[styles.priceValue, { color: colors.accentNegative }]}>
                  {market.noPrice || '--'}¢
                </Text>
              </View>
            </View>
          </View>

          {/* Trade Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trade Type</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, tradeType === 'buy' && styles.toggleButtonActive]}
                onPress={() => setTradeType('buy')}
              >
                <MaterialIcons 
                  name="trending-up" 
                  size={18} 
                  color={tradeType === 'buy' ? colors.textPrimary : colors.textSecondary} 
                />
                <Text style={[styles.toggleText, tradeType === 'buy' && styles.toggleTextActive]}>
                  Buy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, tradeType === 'sell' && styles.toggleButtonActive]}
                onPress={() => setTradeType('sell')}
              >
                <MaterialIcons 
                  name="trending-down" 
                  size={18} 
                  color={tradeType === 'sell' ? colors.textPrimary : colors.textSecondary} 
                />
                <Text style={[styles.toggleText, tradeType === 'sell' && styles.toggleTextActive]}>
                  Sell
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Position Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Position</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, position === 'yes' && styles.toggleButtonActive]}
                onPress={() => setPosition('yes')}
              >
                <Text style={[styles.toggleText, position === 'yes' && styles.toggleTextActive]}>
                  YES
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, position === 'no' && styles.toggleButtonActive]}
                onPress={() => setPosition('no')}
              >
                <Text style={[styles.toggleText, position === 'no' && styles.toggleTextActive]}>
                  NO
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Order Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Type</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, orderType === 'market' && styles.toggleButtonActive]}
                onPress={() => setOrderType('market')}
              >
                <Text style={[styles.toggleText, orderType === 'market' && styles.toggleTextActive]}>
                  Market
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, orderType === 'limit' && styles.toggleButtonActive]}
                onPress={() => setOrderType('limit')}
              >
                <Text style={[styles.toggleText, orderType === 'limit' && styles.toggleTextActive]}>
                  Limit
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quantity Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity (Shares)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="Enter quantity"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Price Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price (¢ per share)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="Enter price (0-100¢)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                editable={orderType === 'limit'}
              />
              {orderType === 'market' && (
                <Text style={styles.inputNote}>
                  Market orders execute at current market price
                </Text>
              )}
            </View>
          </View>

          {/* Trade Summary */}
          {(estimatedCost > 0 || estimatedPayout > 0) && (
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Trade Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {tradeType === 'buy' ? 'Estimated Cost:' : 'Max Risk:'}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.accentNegative }]}>
                  ${(estimatedCost / 100).toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {tradeType === 'buy' ? 'Max Payout:' : 'Estimated Proceeds:'}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.accentPositive }]}>
                  ${(estimatedPayout / 100).toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Potential Profit:</Text>
                <Text style={[styles.summaryValue, { color: colors.accentData }]}>
                  ${((estimatedPayout - estimatedCost) / 100).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

          {/* Powered by Polymarket */}
          <View style={styles.poweredByContainer}>
            <Text style={styles.poweredByText}>Powered by</Text>
            <Text style={styles.poweredByBrand}>Polymarket</Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tradeButton, loading && styles.tradeButtonDisabled]} 
            onPress={handleTrade}
            disabled={loading || !quantity || !price}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <MaterialIcons name="swap-horiz" size={18} color={colors.textPrimary} />
                <Text style={styles.tradeButtonText}>
                  {tradeType === 'buy' ? 'Buy' : 'Sell'} {position.toUpperCase()}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  marketInfo: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
  },
  marketTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    lineHeight: 22,
  },
  marketPrices: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.accentData,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  inputContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  input: {
    fontSize: 16,
    color: colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputNote: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  summary: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  resetButton: {
    flex: 1,
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    paddingVertical: 14,
    marginRight: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tradeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentData,
    borderRadius: 12,
    paddingVertical: 14,
  },
  tradeButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  tradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  poweredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    gap: 6,
  },
  poweredByText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  poweredByBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentData,
  },
});

export default TradeModal;
