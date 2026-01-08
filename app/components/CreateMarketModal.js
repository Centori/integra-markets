import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createMarket, CentralBanks, GeopoliticalRegions, OPECMembers } from '../services/polymarketApi';

// Color palette
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
  inputBg: '#2A2A2A',
};

// Market type categories
const marketTypeCategories = [
  { key: 'commodities', label: 'Commodities', icon: 'show-chart' },
  { key: 'central_banks', label: 'Central Banks', icon: 'account-balance' },
  { key: 'inflation', label: 'Inflation', icon: 'trending-up' },
  { key: 'forex', label: 'Foreign Exchange', icon: 'currency-exchange' },
  { key: 'geopolitics', label: 'Geopolitics', icon: 'public' },
  { key: 'opec', label: 'OPEC', icon: 'local-gas-station' },
];

// Commodity options with expanded categories
const commodityOptions = [
  // Oil & Energy
  { key: 'BRENT', label: 'Brent Crude', category: 'Oil & Energy', unit: '$/barrel' },
  { key: 'WTI', label: 'WTI Crude', category: 'Oil & Energy', unit: '$/barrel' },
  { key: 'NATGAS', label: 'Natural Gas', category: 'Oil & Energy', unit: '$/MMBtu' },
  // Metals
  { key: 'GOLD', label: 'Gold', category: 'Metals', unit: '$/oz' },
  { key: 'SILVER', label: 'Silver', category: 'Metals', unit: '$/oz' },
  { key: 'COPPER', label: 'Copper', category: 'Metals', unit: '$/lb' },
  { key: 'PLATINUM', label: 'Platinum', category: 'Metals', unit: '$/oz' },
  { key: 'PALLADIUM', label: 'Palladium', category: 'Metals', unit: '$/oz' },
  { key: 'LITHIUM', label: 'Lithium', category: 'Metals', unit: '$/ton' },
  { key: 'COBALT', label: 'Cobalt', category: 'Metals', unit: '$/ton' },
  { key: 'NICKEL', label: 'Nickel', category: 'Metals', unit: '$/ton' },
  // Agriculture
  { key: 'WHEAT', label: 'Wheat', category: 'Agriculture', unit: '$/bushel' },
  { key: 'CORN', label: 'Corn', category: 'Agriculture', unit: '$/bushel' },
  { key: 'SOYBEANS', label: 'Soybeans', category: 'Agriculture', unit: '$/bushel' },
  { key: 'COFFEE', label: 'Coffee', category: 'Agriculture', unit: '$/lb' },
  { key: 'COCOA', label: 'Cocoa', category: 'Agriculture', unit: '$/ton' },
  { key: 'SUGAR', label: 'Sugar', category: 'Agriculture', unit: '$/lb' },
  { key: 'COTTON', label: 'Cotton', category: 'Agriculture', unit: '$/lb' },
];

// Central bank options
const centralBankOptions = [
  { key: 'FED', label: 'Federal Reserve (US)', currency: 'USD' },
  { key: 'ECB', label: 'European Central Bank', currency: 'EUR' },
  { key: 'BOE', label: 'Bank of England', currency: 'GBP' },
  { key: 'BOJ', label: 'Bank of Japan', currency: 'JPY' },
  { key: 'PBOC', label: "People's Bank of China", currency: 'CNY' },
  { key: 'RBA', label: 'Reserve Bank of Australia', currency: 'AUD' },
  { key: 'SNB', label: 'Swiss National Bank', currency: 'CHF' },
  { key: 'BOC', label: 'Bank of Canada', currency: 'CAD' },
];

// Rate action options
const rateActionOptions = [
  { key: 'cut_25', label: 'Cut 25bps', value: -25 },
  { key: 'cut_50', label: 'Cut 50bps', value: -50 },
  { key: 'hold', label: 'Hold rates', value: 0 },
  { key: 'hike_25', label: 'Hike 25bps', value: 25 },
  { key: 'hike_50', label: 'Hike 50bps', value: 50 },
];

// Forex pairs
const forexOptions = [
  { key: 'EUR/USD', label: 'EUR/USD', description: 'Euro vs US Dollar' },
  { key: 'GBP/USD', label: 'GBP/USD', description: 'British Pound vs US Dollar' },
  { key: 'USD/JPY', label: 'USD/JPY', description: 'US Dollar vs Japanese Yen' },
  { key: 'USD/CHF', label: 'USD/CHF', description: 'US Dollar vs Swiss Franc' },
  { key: 'AUD/USD', label: 'AUD/USD', description: 'Australian Dollar vs US Dollar' },
  { key: 'USD/CAD', label: 'USD/CAD', description: 'US Dollar vs Canadian Dollar' },
  { key: 'USD/CNY', label: 'USD/CNY', description: 'US Dollar vs Chinese Yuan' },
  { key: 'DXY', label: 'Dollar Index (DXY)', description: 'US Dollar Index' },
];

// Geopolitical regions
const geopoliticalOptions = [
  { key: 'strait_of_hormuz', label: 'Strait of Hormuz', impact: 'Oil shipping' },
  { key: 'red_sea', label: 'Red Sea / Suez', impact: 'Global shipping' },
  { key: 'venezuela', label: 'Venezuela', impact: 'Oil sanctions' },
  { key: 'iran', label: 'Iran', impact: 'Oil, nuclear' },
  { key: 'russia', label: 'Russia', impact: 'Oil, gas, wheat' },
  { key: 'ukraine', label: 'Ukraine', impact: 'Grain corridor' },
  { key: 'congo_drc', label: 'Congo DRC', impact: 'Cobalt, copper' },
  { key: 'nigeria', label: 'Nigeria', impact: 'Oil production' },
  { key: 'libya', label: 'Libya', impact: 'Oil supply' },
  { key: 'saudi_arabia', label: 'Saudi Arabia', impact: 'OPEC leadership' },
];

// Inflation metrics
const inflationOptions = [
  { key: 'US_CPI', label: 'US CPI', description: 'Consumer Price Index' },
  { key: 'US_CORE_CPI', label: 'US Core CPI', description: 'Excluding food & energy' },
  { key: 'US_PCE', label: 'US PCE', description: 'Personal Consumption Expenditures' },
  { key: 'EU_HICP', label: 'Eurozone HICP', description: 'Harmonized Index' },
  { key: 'UK_CPI', label: 'UK CPI', description: 'UK Consumer Prices' },
  { key: 'JP_CPI', label: 'Japan CPI', description: 'Japan Consumer Prices' },
];

const CreateMarketModal = ({ visible, onClose, onMarketCreated }) => {
  // State
  const [marketTypeCategory, setMarketTypeCategory] = useState('commodities');
  const [selectedItem, setSelectedItem] = useState(null);
  const [targetValue, setTargetValue] = useState('');
  const [resolveDate, setResolveDate] = useState('');
  const [selectedAction, setSelectedAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Get options based on market type
  const getOptionsForType = () => {
    switch (marketTypeCategory) {
      case 'commodities': return commodityOptions;
      case 'central_banks': return centralBankOptions;
      case 'inflation': return inflationOptions;
      case 'forex': return forexOptions;
      case 'geopolitics': return geopoliticalOptions;
      case 'opec': return [
        { key: 'production_cut', label: 'Production Cut', description: 'OPEC+ output reduction' },
        { key: 'production_increase', label: 'Production Increase', description: 'OPEC+ output increase' },
        { key: 'price_war', label: 'Price War', description: 'Competitive pricing' },
        { key: 'quota_compliance', label: 'Quota Compliance', description: 'Member adherence' },
      ];
      default: return commodityOptions;
    }
  };

  // Generate preview title
  const getPreviewTitle = () => {
    if (!selectedItem || !resolveDate) {
      return 'Select options to preview market title';
    }

    const dateFormatted = formatDateForDisplay(resolveDate);
    
    switch (marketTypeCategory) {
      case 'commodities':
        if (!targetValue) return 'Enter a target price';
        return `Will ${selectedItem.label} ${selectedAction?.key === 'below' ? 'fall below' : 'exceed'} $${targetValue}${selectedItem.unit ? '/' + selectedItem.unit.split('/')[1] : ''} by ${dateFormatted}?`;
      
      case 'central_banks':
        if (!selectedAction) return 'Select a rate action';
        return `Will the ${selectedItem.label} ${selectedAction.label.toLowerCase()} at the ${dateFormatted} meeting?`;
      
      case 'inflation':
        if (!targetValue) return 'Enter a target percentage';
        return `Will ${selectedItem.label} ${selectedAction?.key === 'below' ? 'fall below' : 'exceed'} ${targetValue}% by ${dateFormatted}?`;
      
      case 'forex':
        if (!targetValue) return 'Enter a target level';
        return `Will ${selectedItem.key} ${selectedAction?.key === 'below' ? 'fall below' : 'break above'} ${targetValue} by ${dateFormatted}?`;
      
      case 'geopolitics':
        return `Will ${selectedItem.label} ${targetValue || 'event'} occur by ${dateFormatted}?`;
      
      case 'opec':
        return `Will OPEC+ announce ${selectedItem.label.toLowerCase()} by ${dateFormatted}?`;
      
      default:
        return 'Configure your market';
    }
  };

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  // Handle create market
  const handleCreateMarket = async () => {
    if (!selectedItem) {
      Alert.alert('Error', 'Please select an item');
      return;
    }
    if (!resolveDate) {
      Alert.alert('Error', 'Please enter a resolution date');
      return;
    }

    setLoading(true);

    try {
      const result = await createMarket({
        commodity: selectedItem.key,
        targetPrice: parseFloat(targetValue) || 0,
        resolveDate: new Date(resolveDate).toISOString(),
        marketType: marketTypeCategory,
      });

      if (result.status === 'success') {
        Alert.alert('Success', 'Market created successfully!', [
          { text: 'OK', onPress: onMarketCreated }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to create market');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create market. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setSelectedItem(null);
    setTargetValue('');
    setResolveDate('');
    setSelectedAction(null);
    setStep(1);
    onClose();
  };

  // Render step 1: Select market type category
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Market Category</Text>
      <Text style={styles.stepSubtitle}>What type of prediction market do you want to create?</Text>
      
      <View style={styles.categoryGrid}>
        {marketTypeCategories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryCard,
              marketTypeCategory === cat.key && styles.categoryCardSelected,
            ]}
            onPress={() => {
              setMarketTypeCategory(cat.key);
              setSelectedItem(null);
            }}
          >
            <MaterialIcons 
              name={cat.icon} 
              size={28} 
              color={marketTypeCategory === cat.key ? colors.accentPositive : colors.textSecondary} 
            />
            <Text style={[
              styles.categoryCardLabel,
              marketTypeCategory === cat.key && styles.categoryCardLabelSelected
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render step 2: Select specific item
  const renderStep2 = () => {
    const options = getOptionsForType();
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Select {marketTypeCategories.find(c => c.key === marketTypeCategory)?.label}</Text>
        <Text style={styles.stepSubtitle}>Choose the specific item for your market</Text>
        
        <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionCard,
                selectedItem?.key === option.key && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedItem(option)}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionCategory}>
                  {option.category || option.description || option.impact || option.currency}
                </Text>
              </View>
              {selectedItem?.key === option.key && (
                <MaterialIcons name="check-circle" size={24} color={colors.accentPositive} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render step 3: Market details
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Market Details</Text>
      <Text style={styles.stepSubtitle}>Set the target and resolution date</Text>

      {/* Action selection for certain types */}
      {(marketTypeCategory === 'commodities' || marketTypeCategory === 'inflation' || marketTypeCategory === 'forex') && (
        <>
          <Text style={styles.inputLabel}>Direction</Text>
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                selectedAction?.key === 'above' && styles.actionButtonSelected,
              ]}
              onPress={() => setSelectedAction({ key: 'above', label: 'Above' })}
            >
              <MaterialIcons name="trending-up" size={20} color={selectedAction?.key === 'above' ? colors.accentPositive : colors.textSecondary} />
              <Text style={[styles.actionButtonText, selectedAction?.key === 'above' && styles.actionButtonTextSelected]}>Above</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                selectedAction?.key === 'below' && styles.actionButtonSelected,
              ]}
              onPress={() => setSelectedAction({ key: 'below', label: 'Below' })}
            >
              <MaterialIcons name="trending-down" size={20} color={selectedAction?.key === 'below' ? colors.accentNegative : colors.textSecondary} />
              <Text style={[styles.actionButtonText, selectedAction?.key === 'below' && styles.actionButtonTextSelected]}>Below</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Rate action for central banks */}
      {marketTypeCategory === 'central_banks' && (
        <>
          <Text style={styles.inputLabel}>Rate Action</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rateActionsScroll}>
            {rateActionOptions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={[
                  styles.rateActionChip,
                  selectedAction?.key === action.key && styles.rateActionChipSelected,
                ]}
                onPress={() => setSelectedAction(action)}
              >
                <Text style={[
                  styles.rateActionText,
                  selectedAction?.key === action.key && styles.rateActionTextSelected
                ]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Target value input */}
      {marketTypeCategory !== 'central_banks' && marketTypeCategory !== 'opec' && (
        <>
          <Text style={styles.inputLabel}>
            {marketTypeCategory === 'inflation' ? 'Target Percentage' : 
             marketTypeCategory === 'geopolitics' ? 'Event Description' : 'Target Price'}
          </Text>
          <View style={styles.inputContainer}>
            {marketTypeCategory === 'commodities' && <Text style={styles.inputPrefix}>$</Text>}
            {marketTypeCategory === 'inflation' && <Text style={styles.inputPrefix}>%</Text>}
            <TextInput
              style={styles.input}
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder={marketTypeCategory === 'geopolitics' ? 'Describe the event' : 'Enter value'}
              placeholderTextColor={colors.textSecondary}
              keyboardType={marketTypeCategory === 'geopolitics' ? 'default' : 'decimal-pad'}
            />
          </View>
        </>
      )}

      {/* Resolution Date */}
      <Text style={styles.inputLabel}>Resolution Date</Text>
      <View style={styles.inputContainer}>
        <MaterialIcons name="event" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={resolveDate}
          onChangeText={setResolveDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* Preview */}
      <View style={styles.previewContainer}>
        <Text style={styles.previewLabel}>MARKET PREVIEW</Text>
        <Text style={styles.previewTitle}>{getPreviewTitle()}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Market</Text>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>Step {step} of 3</Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep(step - 1)}
              >
                <MaterialIcons name="arrow-back" size={20} color={colors.textPrimary} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.nextButton,
                (step === 2 && !selectedItem) && styles.nextButtonDisabled,
              ]}
              onPress={() => {
                if (step < 3) {
                  setStep(step + 1);
                } else {
                  handleCreateMarket();
                }
              }}
              disabled={loading || (step === 2 && !selectedItem)}
            >
              {loading ? (
                <ActivityIndicator color={colors.bgPrimary} />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>
                    {step === 3 ? 'Create Market' : 'Next'}
                  </Text>
                  {step < 3 && (
                    <MaterialIcons name="arrow-forward" size={20} color={colors.bgPrimary} />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  content: {
    padding: 16,
    maxHeight: 500,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryCardSelected: {
    borderColor: colors.accentPositive,
    backgroundColor: colors.accentPositive + '15',
  },
  categoryCardLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  categoryCardLabelSelected: {
    color: colors.accentPositive,
    fontWeight: '600',
  },
  optionsContainer: {
    maxHeight: 350,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  optionCardSelected: {
    borderColor: colors.accentPositive,
    backgroundColor: colors.accentPositive + '15',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonSelected: {
    borderColor: colors.accentData,
    backgroundColor: colors.accentData + '15',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  actionButtonTextSelected: {
    color: colors.accentData,
  },
  rateActionsScroll: {
    marginBottom: 8,
  },
  rateActionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rateActionChipSelected: {
    borderColor: colors.accentData,
    backgroundColor: colors.accentData + '15',
  },
  rateActionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rateActionTextSelected: {
    color: colors.accentData,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  previewContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentPositive,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  nextButtonDisabled: {
    backgroundColor: colors.bgTertiary,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.bgPrimary,
    marginRight: 8,
  },
});

export default CreateMarketModal;